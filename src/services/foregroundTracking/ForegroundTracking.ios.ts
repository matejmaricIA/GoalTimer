import { ExpoNotificationAdapter, TrackingNotificationPayload } from '../NotificationService';
import { ForegroundTrackingAdapter, ForegroundTrackingPayload } from './ForegroundTracking';

const notificationAdapter = new ExpoNotificationAdapter();
let lastPayload: TrackingNotificationPayload | null = null;
let isRunning = false;

export const foregroundTracking: ForegroundTrackingAdapter = {
  init: async () => {
    await notificationAdapter.init();
  },
  startTracking: async (payload: ForegroundTrackingPayload) => {
    lastPayload = {
      activityName: payload.activityName,
      startedAt: payload.startTs,
      status: 'running',
    };
    isRunning = true;
    await notificationAdapter.updateTracking(lastPayload);
  },
  pauseTracking: async () => {
    if (!lastPayload) {
      return;
    }
    const pausedPayload = { ...lastPayload, status: 'paused' as const };
    isRunning = false;
    await notificationAdapter.updateTracking(pausedPayload);
  },
  stopTracking: async () => {
    isRunning = false;
    lastPayload = null;
    await notificationAdapter.clearTracking();
  },
  isRunning: async () => isRunning,
};
