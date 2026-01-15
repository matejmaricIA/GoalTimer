package com.goaltimer.foreground

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import java.util.Locale

class ForegroundTrackingService : Service() {
  private val handler = Handler(Looper.getMainLooper())
  private val ticker = object : Runnable {
    override fun run() {
      updateNotification()
      handler.postDelayed(this, UPDATE_INTERVAL_MS)
    }
  }

  private var activityName: String = "Activity"
  private var startTs: Long = 0L

  override fun onCreate() {
    super.onCreate()
    ensureChannel()
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    val action = intent?.action
    if (action == null) {
      if (!restoreState()) {
        stopSelf()
        return START_NOT_STICKY
      }
      beginForeground()
      return START_STICKY
    }

    when (action) {
      ACTION_START -> {
        activityName = intent.getStringExtra(EXTRA_ACTIVITY_NAME) ?: "Activity"
        startTs = intent.getLongExtra(EXTRA_START_TS, System.currentTimeMillis())
        persistState()
        beginForeground()
      }
      ACTION_PAUSE, ACTION_STOP -> {
        clearState()
        stopSelf()
      }
    }

    return START_STICKY
  }

  override fun onDestroy() {
    handler.removeCallbacks(ticker)
    stopForeground(true)
    isRunning = false
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  private fun beginForeground() {
    isRunning = true
    startForeground(NOTIFICATION_ID, buildNotification())
    handler.removeCallbacks(ticker)
    handler.post(ticker)
  }

  private fun updateNotification() {
    val notification = buildNotification()
    NotificationManagerCompat.from(this).notify(NOTIFICATION_ID, notification)
  }

  private fun buildNotification() = NotificationCompat.Builder(this, CHANNEL_ID)
    .setContentTitle("Tracking: $activityName")
    .setContentText(formatElapsed(System.currentTimeMillis() - startTs))
    .setSmallIcon(android.R.drawable.ic_media_play)
    .setOngoing(true)
    .setOnlyAlertOnce(true)
    .setCategory(NotificationCompat.CATEGORY_SERVICE)
    .setContentIntent(createContentIntent())
    .addAction(
      android.R.drawable.ic_media_pause,
      "Pause",
      PendingIntent.getBroadcast(
        this,
        REQUEST_CODE_PAUSE,
        Intent(this, PauseActionReceiver::class.java),
        pendingIntentFlags(),
      ),
    )
    .addAction(
      android.R.drawable.ic_menu_close_clear_cancel,
      "Stop",
      PendingIntent.getBroadcast(
        this,
        REQUEST_CODE_STOP,
        Intent(this, StopActionReceiver::class.java),
        pendingIntentFlags(),
      ),
    )
    .build()

  private fun createContentIntent() = PendingIntent.getActivity(
    this,
    REQUEST_CODE_CONTENT,
    Intent(Intent.ACTION_VIEW, Uri.parse("$DEEP_LINK_SCHEME://$DEEP_LINK_HOST")).apply {
      addCategory(Intent.CATEGORY_BROWSABLE)
      setPackage(packageName)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
    },
    pendingIntentFlags(),
  )

  private fun pendingIntentFlags(): Int {
    return PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }
    val manager = getSystemService(NotificationManager::class.java)
    val channel = NotificationChannel(CHANNEL_ID, "Tracking", NotificationManager.IMPORTANCE_LOW)
    channel.setSound(null, null)
    channel.enableVibration(false)
    manager.createNotificationChannel(channel)
  }

  private fun formatElapsed(elapsedMs: Long): String {
    val totalSeconds = elapsedMs.coerceAtLeast(0L) / 1000
    val hours = totalSeconds / 3600
    val minutes = (totalSeconds % 3600) / 60
    val seconds = totalSeconds % 60
    return if (hours > 0) {
      String.format(Locale.US, "%d:%02d:%02d", hours, minutes, seconds)
    } else {
      String.format(Locale.US, "%02d:%02d", minutes, seconds)
    }
  }

  private fun persistState() {
    val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    prefs.edit()
      .putString(PREF_ACTIVITY_NAME, activityName)
      .putLong(PREF_START_TS, startTs)
      .apply()
  }

  private fun restoreState(): Boolean {
    val prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val restoredName = prefs.getString(PREF_ACTIVITY_NAME, null) ?: return false
    val restoredStart = prefs.getLong(PREF_START_TS, 0L)
    if (restoredStart <= 0L) {
      return false
    }
    activityName = restoredName
    startTs = restoredStart
    return true
  }

  private fun clearState() {
    clearState(this)
  }

  companion object {
    const val CHANNEL_ID = "tracking"
    const val NOTIFICATION_ID = 4201
    const val ACTION_START = "com.goaltimer.foreground.START"
    const val ACTION_PAUSE = "com.goaltimer.foreground.PAUSE"
    const val ACTION_STOP = "com.goaltimer.foreground.STOP"
    const val EXTRA_ACTIVITY_NAME = "extra_activity_name"
    const val EXTRA_START_TS = "extra_start_ts"
    const val DEEP_LINK_SCHEME = "goaltimer"
    const val DEEP_LINK_HOST = "tracking"
    const val REQUEST_CODE_CONTENT = 2000
    const val REQUEST_CODE_PAUSE = 2001
    const val REQUEST_CODE_STOP = 2002
    const val UPDATE_INTERVAL_MS = 1000L
    const val PREFS_NAME = "goaltimer_tracking"
    const val PREF_ACTIVITY_NAME = "activity_name"
    const val PREF_START_TS = "start_ts"

    @Volatile
    var isRunning: Boolean = false

    fun start(context: Context, activityName: String, startTs: Long) {
      val intent = Intent(context, ForegroundTrackingService::class.java).apply {
        action = ACTION_START
        putExtra(EXTRA_ACTIVITY_NAME, activityName)
        putExtra(EXTRA_START_TS, startTs)
      }
      ContextCompat.startForegroundService(context, intent)
    }

    fun pause(context: Context) {
      isRunning = false
      clearState(context)
      context.stopService(Intent(context, ForegroundTrackingService::class.java))
    }

    fun stop(context: Context) {
      isRunning = false
      clearState(context)
      context.stopService(Intent(context, ForegroundTrackingService::class.java))
    }

    fun launchApp(context: Context, action: String) {
      val uri = Uri.parse("$DEEP_LINK_SCHEME://$DEEP_LINK_HOST?action=$action")
      val intent = Intent(Intent.ACTION_VIEW, uri).apply {
        addCategory(Intent.CATEGORY_BROWSABLE)
        setPackage(context.packageName)
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
      }
      context.startActivity(intent)
    }

    private fun clearState(context: Context) {
      val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
      prefs.edit().remove(PREF_ACTIVITY_NAME).remove(PREF_START_TS).apply()
    }
  }
}
