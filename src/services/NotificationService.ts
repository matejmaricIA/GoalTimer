import * as Notifications from 'expo-notifications';
import { formatTime } from '../utils/date';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type TrackingStatus = 'running' | 'paused';

export type TrackingNotificationPayload = {
  activityName: string;
  startedAt: number;
  status: TrackingStatus;
};

export interface NotificationAdapter {
  init(): Promise<void>;
  updateTracking(payload: TrackingNotificationPayload): Promise<void>;
  clearTracking(): Promise<void>;
}

export class ExpoNotificationAdapter implements NotificationAdapter {
  private trackingNotificationId: string | null = null;

  async init(): Promise<void> {
    await Notifications.requestPermissionsAsync();
    await Notifications.setNotificationChannelAsync('tracking', {
      name: 'Tracking',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
    });
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: null,
    });
  }

  async updateTracking(payload: TrackingNotificationPayload): Promise<void> {
    // Expo Go cannot run a true Android foreground service with per-second updates.
    // We approximate by updating the local notification on key events.
    const body =
      payload.status === 'paused'
        ? `Paused: ${payload.activityName} • Started ${formatTime(payload.startedAt)}`
        : `Tracking: ${payload.activityName} • Started ${formatTime(payload.startedAt)}`;

    if (this.trackingNotificationId) {
      await Notifications.dismissNotificationAsync(this.trackingNotificationId).catch(() => undefined);
    }

    this.trackingNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'GoalTimer',
        body,
        data: { type: 'tracking' },
      },
      trigger: null,
    });
  }

  async clearTracking(): Promise<void> {
    if (this.trackingNotificationId) {
      await Notifications.dismissNotificationAsync(this.trackingNotificationId).catch(() => undefined);
      this.trackingNotificationId = null;
    }
  }
}
