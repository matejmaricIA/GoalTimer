package com.goaltimer.foreground

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ForegroundTrackerModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ForegroundTracker")

    Function("startForegroundTracking") { activityName: String, startTs: Double ->
      val context = appContext.reactContext?.applicationContext ?: return@Function null
      ForegroundTrackingService.start(context, activityName, startTs.toLong())
      null
    }

    Function("pauseForegroundTracking") {
      val context = appContext.reactContext?.applicationContext ?: return@Function null
      ForegroundTrackingService.pause(context)
      null
    }

    Function("stopForegroundTracking") {
      val context = appContext.reactContext?.applicationContext ?: return@Function null
      ForegroundTrackingService.stop(context)
      null
    }

    Function("isForegroundTrackingRunning") {
      ForegroundTrackingService.isRunning
    }
  }
}
