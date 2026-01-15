export type Activity = {
  id: string;
  name: string;
  color?: string | null;
  createdAt: number;
  defaultGoalMinutes?: number | null;
};

export type DailyGoal = {
  id: string;
  date: string;
  activityId: string;
  goalMinutes: number;
};

export type Session = {
  id: string;
  activityId: string;
  startTs: number;
  endTs?: number | null;
  date: string;
};

export type Note = {
  id: string;
  date: string;
  activityId: string;
  text: string;
  updatedAt: number;
};

export type DailyActivitySummary = {
  activityId: string;
  activityName: string;
  color?: string | null;
  goalMinutes: number;
  workedMinutes: number;
  note?: string | null;
};

export type DailySummary = {
  date: string;
  totalGoalMinutes: number;
  totalWorkedMinutes: number;
  isComplete: boolean;
  activities: DailyActivitySummary[];
};
