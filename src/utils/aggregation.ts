import { Activity, DailyGoal, DailySummary, Note, Session } from '../types/models';
import { endOfDayTs, minutesFromMs, startOfDayTs, toDateKey } from './date';

export const getSessionMsForDate = (
  session: Session,
  dateKey: string,
  nowTs: number,
): number => {
  const start = session.startTs;
  const end = session.endTs ?? nowTs;
  if (end <= start) {
    return 0;
  }
  const dayStart = startOfDayTs(dateKey);
  const dayEnd = endOfDayTs(dateKey);
  const overlapStart = Math.max(start, dayStart);
  const overlapEnd = Math.min(end, dayEnd);
  if (overlapEnd <= overlapStart) {
    return 0;
  }
  return overlapEnd - overlapStart;
};

export const getWorkedMinutesForDate = (
  sessions: Session[],
  dateKey: string,
  nowTs: number,
  activityId?: string,
): number => {
  let totalMs = 0;
  sessions.forEach((session) => {
    if (activityId && session.activityId !== activityId) {
      return;
    }
    totalMs += getSessionMsForDate(session, dateKey, nowTs);
  });
  return minutesFromMs(totalMs);
};

export const buildDailySummary = (
  dateKey: string,
  activities: Activity[],
  goals: DailyGoal[],
  sessions: Session[],
  notes: Note[],
  nowTs: number,
): DailySummary => {
  const goalsForDate = goals.filter((goal) => goal.date === dateKey);
  const notesForDate = notes.filter((note) => note.date === dateKey);

  const workedByActivity = new Map<string, number>();
  sessions.forEach((session) => {
    const workedMs = getSessionMsForDate(session, dateKey, nowTs);
    if (workedMs <= 0) {
      return;
    }
    const current = workedByActivity.get(session.activityId) ?? 0;
    workedByActivity.set(session.activityId, current + workedMs);
  });

  const goalsByActivity = new Map<string, DailyGoal>();
  goalsForDate.forEach((goal) => {
    goalsByActivity.set(goal.activityId, goal);
  });

  const notesByActivity = new Map<string, Note>();
  notesForDate.forEach((note) => {
    notesByActivity.set(note.activityId, note);
  });

  const relevantActivityIds = new Set<string>();
  goalsForDate.forEach((goal) => relevantActivityIds.add(goal.activityId));
  notesForDate.forEach((note) => relevantActivityIds.add(note.activityId));
  sessions.forEach((session) => {
    const hasWork = getSessionMsForDate(session, dateKey, nowTs) > 0;
    if (hasWork) {
      relevantActivityIds.add(session.activityId);
    }
  });

  const activitySummaries = activities
    .filter((activity) => relevantActivityIds.has(activity.id))
    .map((activity) => {
      const goal = goalsByActivity.get(activity.id);
      const workedMs = workedByActivity.get(activity.id) ?? 0;
      return {
        activityId: activity.id,
        activityName: activity.name,
        color: activity.color ?? undefined,
        goalMinutes: goal?.goalMinutes ?? 0,
        workedMinutes: minutesFromMs(workedMs),
        note: notesByActivity.get(activity.id)?.text ?? undefined,
      };
    })
    .sort((a, b) => a.activityName.localeCompare(b.activityName));

  const totalGoalMinutes = goalsForDate.reduce((sum, goal) => sum + goal.goalMinutes, 0);
  const totalWorkedMinutes = minutesFromMs(
    Array.from(workedByActivity.values()).reduce((sum, ms) => sum + ms, 0),
  );

  const hasGoals = goalsForDate.length > 0;
  const isComplete =
    hasGoals &&
    goalsForDate.every((goal) => {
      const worked = minutesFromMs(workedByActivity.get(goal.activityId) ?? 0);
      return worked >= goal.goalMinutes;
    });

  return {
    date: dateKey,
    totalGoalMinutes,
    totalWorkedMinutes,
    isComplete,
    activities: activitySummaries,
  };
};

export const getActivityWorkedMinutesByDate = (
  activityId: string,
  sessions: Session[],
  dateKey: string,
  nowTs: number,
): number => getWorkedMinutesForDate(sessions, dateKey, nowTs, activityId);

export const getDateKeyForSession = (session: Session): string => toDateKey(session.startTs);
