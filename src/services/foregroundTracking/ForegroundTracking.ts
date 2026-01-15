import { foregroundTracking as android } from './ForegroundTracking.android';
import { foregroundTracking as ios } from './ForegroundTracking.ios';
import { foregroundTracking as web } from './ForegroundTracking.web';
import { Platform } from 'react-native';

export type ForegroundTrackingPayload = {
  activityId: string;
  activityName: string;
  startTs: number;
};

export type TrackingAction = 'pause' | 'stop';
export type TrackingActionListener = (action: TrackingAction) => void;

export type ForegroundTrackingAdapter = {
  init(): Promise<void>;
  startTracking(payload: ForegroundTrackingPayload): Promise<void>;
  pauseTracking(payload?: ForegroundTrackingPayload): Promise<void>;
  stopTracking(): Promise<void>;
  isRunning(): Promise<boolean>;
  addListener?: (listener: TrackingActionListener) => () => void;
};

export const foregroundTracking: ForegroundTrackingAdapter =
  Platform.select({
    android,
    ios,
    web,
    default: ios,
  }) ?? ios;
