import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { runMigrations } from '../db/migrations';
import { seedIfNeeded } from '../db/seed';
import {
  Activity,
  DailyGoal,
  DailySummary,
  Note,
  Session,
} from '../types/models';
import {
  ActivityRepoSqlite,
  GoalRepoSqlite,
  NoteRepoSqlite,
  SessionRepoSqlite,
} from '../repos';
import {
  addDays,
  getDateKeysInRange,
  getDatesBetween,
  toDateKey,
} from '../utils/date';
import { buildDailySummary, getSessionMsForDate } from '../utils/aggregation';
import { foregroundTracking } from '../services/foregroundTracking/ForegroundTracking';
import { NoopSyncService } from '../services/SyncService';
import { LocalUserIdentity } from '../services/UserIdentity';

export type OverallStats = {
  currentStreak: number;
  bestStreak: number;
  last7Total: number;
  last30Total: number;
};

export type ActivityStats = {
  activity: Activity;
  totals: {
    last7: number;
    last30: number;
    allTime: number;
  };
  averagePerTrackedDay: number;
  completionRate: number;
  bestDay?: { date: string; minutes: number };
  dailyMinutes: { date: string; minutes: number }[];
};

type TrackingAction = 'pause' | 'stop';

type AppContextValue = {
  isReady: boolean;
  activities: Activity[];
  goals: DailyGoal[];
  sessions: Session[];
  notes: Note[];
  runningSession: Session | null;
  breakEndsAt: number | null;
  now: number;
  createActivity: (input: { name: string; color?: string | null; defaultGoalMinutes?: number | null }) => Promise<void>;
  updateActivity: (
    id: string,
    updates: { name?: string; color?: string | null; defaultGoalMinutes?: number | null },
  ) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;
  setGoal: (activityId: string, date: string, goalMinutes: number) => Promise<void>;
  deleteGoal: (activityId: string, date: string) => Promise<void>;
  ensureDailyGoalsForDate: (date: string) => Promise<void>;
  upsertNote: (activityId: string, date: string, text: string) => Promise<void>;
  deleteNote: (activityId: string, date: string) => Promise<void>;
  startTracking: (activityId: string) => Promise<void>;
  pauseTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
  startBreak: (minutes: number) => Promise<void>;
  endBreak: () => Promise<void>;
  switchTracking: (activityId: string) => Promise<void>;
  toggleActivityTracking: (activityId: string) => Promise<void>;
  getDailySummary: (date: string) => DailySummary;
  getOverallStats: () => OverallStats;
  getActivityStats: (activityId: string) => ActivityStats;
  exportData: () => Promise<string>;
};

const BREAK_END_TYPE = 'break-end';
const WORK_REMINDER_TYPE = 'work-break-reminder';
const ONE_HOUR_MS = 60 * 60 * 1000;

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [goals, setGoals] = useState<DailyGoal[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [runningSession, setRunningSession] = useState<Session | null>(null);
  const [breakEndsAt, setBreakEndsAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [pendingTrackingAction, setPendingTrackingAction] = useState<TrackingAction | null>(null);

  const activityRepo = useMemo(() => new ActivityRepoSqlite(), []);
  const goalRepo = useMemo(() => new GoalRepoSqlite(), []);
  const sessionRepo = useMemo(() => new SessionRepoSqlite(), []);
  const noteRepo = useMemo(() => new NoteRepoSqlite(), []);
  const trackingService = useMemo(() => foregroundTracking, []);
  const syncService = useMemo(() => new NoopSyncService(), []);
  const userIdentity = useMemo(() => new LocalUserIdentity(), []);

  const summaryCache = useRef<Map<string, DailySummary>>(new Map());
  const breakNotificationId = useRef<string | null>(null);
  const workReminderId = useRef<string | null>(null);

  const clearSummaryCache = useCallback(() => {
    summaryCache.current.clear();
  }, []);

  const cancelNotificationsByType = useCallback(async (type: string) => {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const matches = scheduled.filter((item) => item.content?.data?.type === type);
      await Promise.all(
        matches.map((item) =>
          Notifications.cancelScheduledNotificationAsync(item.identifier).catch(() => undefined),
        ),
      );
    } catch {
      // ignore notification cleanup failures
    }
  }, []);

  const cancelBreakNotification = useCallback(async () => {
    if (breakNotificationId.current) {
      await Notifications.cancelScheduledNotificationAsync(breakNotificationId.current).catch(
        () => undefined,
      );
      breakNotificationId.current = null;
      return;
    }
    await cancelNotificationsByType(BREAK_END_TYPE);
  }, [cancelNotificationsByType]);

  const cancelWorkReminder = useCallback(async () => {
    if (workReminderId.current) {
      await Notifications.cancelScheduledNotificationAsync(workReminderId.current).catch(
        () => undefined,
      );
      workReminderId.current = null;
      return;
    }
    await cancelNotificationsByType(WORK_REMINDER_TYPE);
  }, [cancelNotificationsByType]);

  const scheduleBreakNotification = useCallback(
    async (minutes: number) => {
      if (!minutes || minutes <= 0) {
        return;
      }
      await cancelBreakNotification();
      const seconds = Math.max(1, Math.round(minutes * 60));
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Break over',
            body: 'Time to get back to it.',
            data: { type: BREAK_END_TYPE },
            channelId: 'reminders',
          },
          trigger: { seconds },
        });
        breakNotificationId.current = id;
      } catch {
        // ignore notification scheduling failures
      }
    },
    [cancelBreakNotification],
  );

  const scheduleWorkReminder = useCallback(
    async (session: Session) => {
      await cancelWorkReminder();
      const remainingMs = ONE_HOUR_MS - (Date.now() - session.startTs);
      if (remainingMs <= 0) {
        return;
      }
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: 'Time for a short break?',
            body: 'You have been focused for an hour. Consider taking a quick breather.',
            data: { type: WORK_REMINDER_TYPE, sessionId: session.id },
            channelId: 'reminders',
          },
          trigger: { seconds: Math.ceil(remainingMs / 1000) },
        });
        workReminderId.current = id;
      } catch {
        // ignore notification scheduling failures
      }
    },
    [cancelWorkReminder],
  );

  const invalidateDates = useCallback((dates: string[]) => {
    dates.forEach((date) => summaryCache.current.delete(date));
  }, []);

  const ensureDailyGoalsWithData = useCallback(
    async (date: string, activityList: Activity[], goalList: DailyGoal[]) => {
      const goalsForDate = goalList.filter((goal) => goal.date === date);
      const existingGoals = new Set(goalsForDate.map((goal) => goal.activityId));
      const toCreate = activityList.filter(
        (activity) =>
          activity.defaultGoalMinutes &&
          activity.defaultGoalMinutes > 0 &&
          !existingGoals.has(activity.id),
      );

      if (toCreate.length === 0) {
        return goalList;
      }

      const updatedGoals = [...goalList];
      for (const activity of toCreate) {
        const goalMinutes = activity.defaultGoalMinutes ?? 0;
        const goal = await goalRepo.setGoal(activity.id, date, goalMinutes);
        updatedGoals.push(goal);
      }
      invalidateDates([date]);
      return updatedGoals;
    },
    [goalRepo, invalidateDates],
  );

  useEffect(() => {
    const init = async () => {
      await runMigrations();
      await trackingService.init();
      await seedIfNeeded(activityRepo);
      await userIdentity.getIdentity();
      const [activityList, goalList, sessionList, noteList] = await Promise.all([
        activityRepo.list(),
        goalRepo.list(),
        sessionRepo.list(),
        noteRepo.list(),
      ]);
      const todayKey = toDateKey(Date.now());
      const ensuredGoals = await ensureDailyGoalsWithData(todayKey, activityList, goalList);
      setActivities(activityList);
      setGoals(ensuredGoals);
      setSessions(sessionList);
      setNotes(noteList);
      const running = await sessionRepo.getRunningSession();
      setRunningSession(running);
      setIsReady(true);
      await syncService.sync();
      if (running) {
        const activity = activityList.find((item) => item.id === running.activityId);
        if (activity) {
          await trackingService.startTracking({
            activityId: activity.id,
            activityName: activity.name,
            startTs: running.startTs,
          });
        } else {
          await trackingService.stopTracking();
        }
      }
    };
    init();
  }, [
    activityRepo,
    ensureDailyGoalsWithData,
    goalRepo,
    noteRepo,
    trackingService,
    sessionRepo,
    syncService,
    userIdentity,
  ]);

  useEffect(() => {
    setNow(Date.now());
    const intervalMs = runningSession || breakEndsAt ? 1000 : 60000;
    const interval = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(interval);
  }, [breakEndsAt, runningSession]);

  useEffect(() => {
    if (!breakEndsAt) {
      return;
    }
    if (now >= breakEndsAt) {
      setBreakEndsAt(null);
    }
  }, [breakEndsAt, now]);

  useEffect(() => {
    if (!runningSession) {
      return;
    }
    invalidateDates(getDatesBetween(runningSession.startTs, now));
  }, [invalidateDates, now, runningSession]);

  useEffect(() => {
    if (runningSession) {
      if (!workReminderId.current) {
        scheduleWorkReminder(runningSession);
      }
      return;
    }
    if (workReminderId.current) {
      cancelWorkReminder();
    }
  }, [cancelWorkReminder, runningSession, scheduleWorkReminder]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (state) => {
      if (state !== 'active') {
        return;
      }
      setNow(Date.now());
      if (runningSession) {
        const activity = activities.find((item) => item.id === runningSession.activityId);
        if (activity) {
          await trackingService.startTracking({
            activityId: activity.id,
            activityName: activity.name,
            startTs: runningSession.startTs,
          });
        } else {
          await trackingService.stopTracking();
        }
      }
    });
    return () => subscription.remove();
  }, [activities, runningSession, trackingService]);

  const createActivity = useCallback(
    async (input: { name: string; color?: string | null; defaultGoalMinutes?: number | null }) => {
      const activity = await activityRepo.create(input);
      setActivities((prev) => [...prev, activity]);
      clearSummaryCache();
    },
    [activityRepo, clearSummaryCache],
  );

  const updateActivity = useCallback(
    async (
      id: string,
      updates: { name?: string; color?: string | null; defaultGoalMinutes?: number | null },
    ) => {
      const updated = await activityRepo.update(id, updates);
      setActivities((prev) => prev.map((item) => (item.id === id ? updated : item)));
      clearSummaryCache();
    },
    [activityRepo, clearSummaryCache],
  );

  const deleteActivity = useCallback(
    async (id: string) => {
      await activityRepo.delete(id);
      setActivities((prev) => prev.filter((item) => item.id !== id));
      setGoals((prev) => prev.filter((goal) => goal.activityId !== id));
      setSessions((prev) => prev.filter((session) => session.activityId !== id));
      setNotes((prev) => prev.filter((note) => note.activityId !== id));
      if (runningSession?.activityId === id) {
        setRunningSession(null);
        await trackingService.stopTracking();
      }
      clearSummaryCache();
    },
    [activityRepo, clearSummaryCache, runningSession, trackingService],
  );

  const setGoal = useCallback(
    async (activityId: string, date: string, goalMinutes: number) => {
      if (goalMinutes <= 0) {
        await goalRepo.deleteGoal(activityId, date);
        setGoals((prev) =>
          prev.filter((goal) => !(goal.activityId === activityId && goal.date === date)),
        );
        invalidateDates([date]);
        return;
      }
      const goal = await goalRepo.setGoal(activityId, date, goalMinutes);
      setGoals((prev) => {
        const existing = prev.find((item) => item.activityId === activityId && item.date === date);
        if (existing) {
          return prev.map((item) =>
            item.activityId === activityId && item.date === date ? goal : item,
          );
        }
        return [...prev, goal];
      });
      invalidateDates([date]);
    },
    [goalRepo, invalidateDates],
  );

  const deleteGoal = useCallback(
    async (activityId: string, date: string) => {
      await goalRepo.deleteGoal(activityId, date);
      setGoals((prev) =>
        prev.filter((goal) => !(goal.activityId === activityId && goal.date === date)),
      );
      invalidateDates([date]);
    },
    [goalRepo, invalidateDates],
  );

  const ensureDailyGoalsForDate = useCallback(
    async (date: string) => {
      const goalsForDate = goals.filter((goal) => goal.date === date);
      const existingGoals = new Set(goalsForDate.map((goal) => goal.activityId));
      const toCreate = activities.filter(
        (activity) =>
          activity.defaultGoalMinutes &&
          activity.defaultGoalMinutes > 0 &&
          !existingGoals.has(activity.id),
      );

      if (toCreate.length === 0) {
        return;
      }

      for (const activity of toCreate) {
        const goalMinutes = activity.defaultGoalMinutes ?? 0;
        const goal = await goalRepo.setGoal(activity.id, date, goalMinutes);
        setGoals((prev) => [...prev, goal]);
      }
      invalidateDates([date]);
    },
    [activities, goalRepo, goals, invalidateDates],
  );

  const upsertNote = useCallback(
    async (activityId: string, date: string, text: string) => {
      const updatedAt = Date.now();
      const note = await noteRepo.upsertNote(activityId, date, text, updatedAt);
      setNotes((prev) => {
        const existing = prev.find((item) => item.activityId === activityId && item.date === date);
        if (existing) {
          return prev.map((item) =>
            item.activityId === activityId && item.date === date ? note : item,
          );
        }
        return [...prev, note];
      });
      invalidateDates([date]);
    },
    [invalidateDates, noteRepo],
  );

  const deleteNote = useCallback(
    async (activityId: string, date: string) => {
      await noteRepo.deleteNote(activityId, date);
      setNotes((prev) =>
        prev.filter((note) => !(note.activityId === activityId && note.date === date)),
      );
      invalidateDates([date]);
    },
    [invalidateDates, noteRepo],
  );

  const startTracking = useCallback(
    async (activityId: string) => {
      await cancelBreakNotification();
      setBreakEndsAt(null);
      await cancelWorkReminder();
      const nowTs = Date.now();
      if (runningSession) {
        await sessionRepo.endSession(runningSession.id, nowTs);
        setSessions((prev) =>
          prev.map((session) =>
            session.id === runningSession.id ? { ...session, endTs: nowTs } : session,
          ),
        );
        invalidateDates(getDatesBetween(runningSession.startTs, nowTs));
      }
      const session = await sessionRepo.createSession(activityId, nowTs, toDateKey(nowTs));
      setSessions((prev) => [...prev, session]);
      setRunningSession(session);
      setNow(nowTs);
      invalidateDates([toDateKey(nowTs)]);
      const activity = activities.find((item) => item.id === activityId);
      if (activity) {
        await trackingService.startTracking({
          activityId: activity.id,
          activityName: activity.name,
          startTs: session.startTs,
        });
      }
      await scheduleWorkReminder(session);
      Haptics.selectionAsync().catch(() => undefined);
    },
    [
      activities,
      cancelBreakNotification,
      cancelWorkReminder,
      invalidateDates,
      runningSession,
      scheduleWorkReminder,
      sessionRepo,
      trackingService,
    ],
  );

  const pauseTracking = useCallback(async () => {
    if (!runningSession) {
      return;
    }
    await cancelWorkReminder();
    const nowTs = Date.now();
    await sessionRepo.endSession(runningSession.id, nowTs);
    setSessions((prev) =>
      prev.map((session) =>
        session.id === runningSession.id ? { ...session, endTs: nowTs } : session,
      ),
    );
    setRunningSession(null);
    setNow(nowTs);
    invalidateDates(getDatesBetween(runningSession.startTs, nowTs));
    const activity = activities.find((item) => item.id === runningSession.activityId);
    if (activity) {
      await trackingService.pauseTracking({
        activityId: activity.id,
        activityName: activity.name,
        startTs: runningSession.startTs,
      });
    } else {
      await trackingService.pauseTracking();
    }
    Haptics.selectionAsync().catch(() => undefined);
  }, [activities, cancelWorkReminder, invalidateDates, runningSession, sessionRepo, trackingService]);

  const stopTracking = useCallback(async () => {
    if (!runningSession) {
      return;
    }
    await cancelWorkReminder();
    const nowTs = Date.now();
    await sessionRepo.endSession(runningSession.id, nowTs);
    setSessions((prev) =>
      prev.map((session) =>
        session.id === runningSession.id ? { ...session, endTs: nowTs } : session,
      ),
    );
    setRunningSession(null);
    setNow(nowTs);
    invalidateDates(getDatesBetween(runningSession.startTs, nowTs));
    await trackingService.stopTracking();
    Haptics.selectionAsync().catch(() => undefined);
  }, [cancelWorkReminder, invalidateDates, runningSession, sessionRepo, trackingService]);

  const startBreak = useCallback(
    async (minutes: number) => {
      if (!minutes || minutes <= 0) {
        return;
      }
      const endTs = Date.now() + minutes * 60 * 1000;
      if (runningSession) {
        await pauseTracking();
      }
      setBreakEndsAt(endTs);
      await scheduleBreakNotification(minutes);
    },
    [pauseTracking, runningSession, scheduleBreakNotification],
  );

  const endBreak = useCallback(async () => {
    setBreakEndsAt(null);
    await cancelBreakNotification();
  }, [cancelBreakNotification]);

  const parseTrackingAction = useCallback((url: string): TrackingAction | null => {
    if (!url.includes('://tracking')) {
      return null;
    }
    const match = url.match(/action=(pause|stop)/);
    return match ? (match[1] as TrackingAction) : null;
  }, []);

  const handleTrackingAction = useCallback(
    async (action: TrackingAction) => {
      if (!isReady) {
        setPendingTrackingAction(action);
        return;
      }
      if (!runningSession) {
        await trackingService.stopTracking();
        setPendingTrackingAction(null);
        return;
      }
      if (action === 'pause') {
        await pauseTracking();
      } else {
        await stopTracking();
      }
      setPendingTrackingAction(null);
    },
    [isReady, pauseTracking, runningSession, stopTracking, trackingService],
  );

  useEffect(() => {
    if (pendingTrackingAction && isReady && runningSession) {
      handleTrackingAction(pendingTrackingAction);
    }
  }, [handleTrackingAction, isReady, pendingTrackingAction, runningSession]);

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) {
        return;
      }
      const action = parseTrackingAction(url);
      if (!action) {
        return;
      }
      handleTrackingAction(action);
    };

    Linking.getInitialURL().then(handleUrl).catch(() => undefined);
    const subscription = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => subscription.remove();
  }, [handleTrackingAction, parseTrackingAction]);

  const switchTracking = useCallback(
    async (activityId: string) => {
      await startTracking(activityId);
    },
    [startTracking],
  );

  const toggleActivityTracking = useCallback(
    async (activityId: string) => {
      if (runningSession?.activityId === activityId) {
        await pauseTracking();
        return;
      }
      await startTracking(activityId);
    },
    [pauseTracking, runningSession, startTracking],
  );

  const getDailySummary = useCallback(
    (date: string): DailySummary => {
      const nowTs = now;
      const runningOverlapsDate =
        runningSession && getSessionMsForDate(runningSession, date, nowTs) > 0;
      if (!runningOverlapsDate) {
        const cached = summaryCache.current.get(date);
        if (cached) {
          return cached;
        }
      }
      const summary = buildDailySummary(date, activities, goals, sessions, notes, nowTs);
      if (!runningOverlapsDate) {
        summaryCache.current.set(date, summary);
      }
      return summary;
    },
    [activities, goals, notes, now, runningSession, sessions],
  );

  const getOverallStats = useCallback((): OverallStats => {
    const today = toDateKey(now);
    const last7Start = addDays(today, -6);
    const last30Start = addDays(today, -29);

    const last7Dates = getDateKeysInRange(last7Start, today);
    const last30Dates = getDateKeysInRange(last30Start, today);

    const last7Total = last7Dates.reduce(
      (sum, date) => sum + getDailySummary(date).totalWorkedMinutes,
      0,
    );
    const last30Total = last30Dates.reduce(
      (sum, date) => sum + getDailySummary(date).totalWorkedMinutes,
      0,
    );

    const goalDates = Array.from(new Set(goals.map((goal) => goal.date))).sort();
    if (goalDates.length === 0) {
      return { currentStreak: 0, bestStreak: 0, last7Total, last30Total };
    }

    const earliest = goalDates[0];
    const allDates = getDateKeysInRange(earliest, today);

    let currentStreak = 0;
    let bestStreak = 0;
    let rolling = 0;

    allDates.forEach((date) => {
      const goalsForDate = goals.filter((goal) => goal.date === date);
      const hasGoals = goalsForDate.length > 0;
      const isComplete = hasGoals && getDailySummary(date).isComplete;
      if (hasGoals && isComplete) {
        rolling += 1;
        bestStreak = Math.max(bestStreak, rolling);
      } else {
        rolling = 0;
      }
    });

    for (let i = allDates.length - 1; i >= 0; i -= 1) {
      const date = allDates[i];
      const goalsForDate = goals.filter((goal) => goal.date === date);
      const hasGoals = goalsForDate.length > 0;
      const isComplete = hasGoals && getDailySummary(date).isComplete;
      if (hasGoals && isComplete) {
        currentStreak += 1;
      } else {
        break;
      }
    }

    return { currentStreak, bestStreak, last7Total, last30Total };
  }, [getDailySummary, goals, now]);

  const getActivityStats = useCallback(
    (activityId: string): ActivityStats => {
      const activity = activities.find((item) => item.id === activityId);
      if (!activity) {
        throw new Error('Activity not found');
      }

      const today = toDateKey(now);
      const last7Start = addDays(today, -6);
      const last30Start = addDays(today, -29);
      const last7Dates = getDateKeysInRange(last7Start, today);
      const last30Dates = getDateKeysInRange(last30Start, today);

      const getMinutesForDate = (date: string) => {
        const summary = getDailySummary(date);
        const activitySummary = summary.activities.find((item) => item.activityId === activityId);
        return activitySummary?.workedMinutes ?? 0;
      };

      const last7 = last7Dates.reduce((sum, date) => sum + getMinutesForDate(date), 0);
      const last30 = last30Dates.reduce((sum, date) => sum + getMinutesForDate(date), 0);

      const activityGoalDates = goals
        .filter((goal) => goal.activityId === activityId)
        .map((goal) => goal.date);
      const activitySessionDates = sessions
        .filter((session) => session.activityId === activityId)
        .map((session) => toDateKey(session.startTs));
      const allDatesForActivity = [...activityGoalDates, ...activitySessionDates].sort();
      const earliest = allDatesForActivity.length > 0 ? allDatesForActivity[0] : today;
      const allTimeMinutes = getDateKeysInRange(earliest, today).reduce(
        (sum, date) => sum + getMinutesForDate(date),
        0,
      );

      const dailyMinutes = last30Dates.map((date) => ({ date, minutes: getMinutesForDate(date) }));
      const trackedDays = dailyMinutes.filter((entry) => entry.minutes > 0);
      const averagePerTrackedDay =
        trackedDays.length > 0
          ? Math.round(trackedDays.reduce((sum, entry) => sum + entry.minutes, 0) / trackedDays.length)
          : 0;

      const goalsForActivity = goals.filter((goal) => goal.activityId === activityId);
      const completionDays = goalsForActivity.filter((goal) => {
        const summary = getDailySummary(goal.date);
        const activitySummary = summary.activities.find((item) => item.activityId === activityId);
        if (!activitySummary) {
          return false;
        }
        return activitySummary.workedMinutes >= goal.goalMinutes;
      });

      const completionRate =
        goalsForActivity.length > 0 ? completionDays.length / goalsForActivity.length : 0;

      let bestDay: { date: string; minutes: number } | undefined;
      dailyMinutes.forEach((entry) => {
        if (!bestDay || entry.minutes > bestDay.minutes) {
          bestDay = entry;
        }
      });

      return {
        activity,
        totals: { last7, last30, allTime: allTimeMinutes },
        averagePerTrackedDay,
        completionRate,
        bestDay,
        dailyMinutes,
      };
    },
    [activities, getDailySummary, goals, now, sessions],
  );

  const exportData = useCallback(async (): Promise<string> => {
    const payload = {
      activities,
      goals,
      sessions,
      notes,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(payload, null, 2);
  }, [activities, goals, notes, sessions]);

  const value: AppContextValue = {
    isReady,
    activities,
    goals,
    sessions,
    notes,
    runningSession,
    breakEndsAt,
    now,
    createActivity,
    updateActivity,
    deleteActivity,
    setGoal,
    deleteGoal,
    ensureDailyGoalsForDate,
    upsertNote,
    deleteNote,
    startTracking,
    pauseTracking,
    stopTracking,
    startBreak,
    endBreak,
    switchTracking,
    toggleActivityTracking,
    getDailySummary,
    getOverallStats,
    getActivityStats,
    exportData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppStore = (): AppContextValue => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within AppProvider');
  }
  return context;
};
