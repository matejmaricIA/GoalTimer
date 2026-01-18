import { NativeModules } from 'react-native';
import * as Notifications from 'expo-notifications';
import { ExpoNotificationAdapter, TrackingNotificationPayload } from '../NotificationService';
import { ForegroundTrackingAdapter, ForegroundTrackingPayload } from './ForegroundTracking';

type ForegroundTrackerNative = {
  startForegroundTracking(activityName: string, startTs: number): Promise<void>;
  pauseForegroundTracking(): Promise<void>;
  stopForegroundTracking(): Promise<void>;
  isForegroundTrackingRunning(): Promise<boolean>;
};

const nativeModule = NativeModules.ForegroundTracker as ForegroundTrackerNative | undefined;
const fallbackAdapter = new ExpoNotificationAdapter();
let fallbackPayload: TrackingNotificationPayload | null = null;
let fallbackRunning = false;

export const foregroundTracking: ForegroundTrackingAdapter = {
  init: async () => {
    await Notifications.requestPermissionsAsync();
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
    });
    if (!nativeModule) {
      await fallbackAdapter.init();
    }
  },
  startTracking: async (payload: ForegroundTrackingPayload) => {
    if (!nativeModule) {
      fallbackPayload = {
        activityName: payload.activityName,
        startedAt: payload.startTs,
        status: 'running',
      };
      fallbackRunning = true;
      await fallbackAdapter.updateTracking(fallbackPayload);
      return;
    }
    await nativeModule.startForegroundTracking(payload.activityName, payload.startTs);
  },
  pauseTracking: async () => {
    if (!nativeModule) {
      if (fallbackPayload) {
        await fallbackAdapter.updateTracking({ ...fallbackPayload, status: 'paused' });
      }
      fallbackRunning = false;
      return;
    }
    await nativeModule.pauseForegroundTracking();
  },
  stopTracking: async () => {
    if (!nativeModule) {
      fallbackRunning = false;
      fallbackPayload = null;
      await fallbackAdapter.clearTracking();
      return;
    }
    await nativeModule.stopForegroundTracking();
  },
  isRunning: async () => {
    if (!nativeModule) {
      return fallbackRunning;
    }
    return nativeModule.isForegroundTrackingRunning();
  },
};
