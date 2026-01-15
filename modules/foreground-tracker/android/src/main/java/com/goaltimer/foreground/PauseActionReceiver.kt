package com.goaltimer.foreground

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class PauseActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    ForegroundTrackingService.pause(context)
    ForegroundTrackingService.launchApp(context, "pause")
  }
}
