import { Activity, DailyGoal, Note, Session } from '../types/models';

export type ActivityInput = {
  name: string;
  color?: string | null;
  defaultGoalMinutes?: number | null;
};

export type ActivityUpdate = Partial<ActivityInput>;

export interface ActivityRepo {
  list(): Promise<Activity[]>;
  create(input: ActivityInput): Promise<Activity>;
  update(id: string, updates: ActivityUpdate): Promise<Activity>;
  delete(id: string): Promise<void>;
}

export interface GoalRepo {
  list(): Promise<DailyGoal[]>;
  getByDate(date: string): Promise<DailyGoal[]>;
  setGoal(activityId: string, date: string, goalMinutes: number): Promise<DailyGoal>;
  deleteGoal(activityId: string, date: string): Promise<void>;
}

export interface SessionRepo {
  list(): Promise<Session[]>;
  getRunningSession(): Promise<Session | null>;
  createSession(activityId: string, startTs: number, date: string): Promise<Session>;
  endSession(sessionId: string, endTs: number): Promise<void>;
  deleteByActivity(activityId: string): Promise<void>;
}

export interface NoteRepo {
  list(): Promise<Note[]>;
  getByDate(date: string): Promise<Note[]>;
  upsertNote(activityId: string, date: string, text: string, updatedAt: number): Promise<Note>;
  deleteNote(activityId: string, date: string): Promise<void>;
}
