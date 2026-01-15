package com.goaltimer.foreground

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class StopActionReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    ForegroundTrackingService.stop(context)
    ForegroundTrackingService.launchApp(context, "stop")
  }
}
