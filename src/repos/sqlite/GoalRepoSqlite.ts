import { getAllAsync, getFirstAsync, runAsync } from '../../db/sqlite';
import { DailyGoal } from '../../types/models';
import { createId } from '../../utils/id';
import { GoalRepo } from '../types';

export class GoalRepoSqlite implements GoalRepo {
  async list(): Promise<DailyGoal[]> {
    return getAllAsync<DailyGoal>('SELECT * FROM daily_goals ORDER BY date ASC;');
  }

  async getByDate(date: string): Promise<DailyGoal[]> {
    return getAllAsync<DailyGoal>('SELECT * FROM daily_goals WHERE date = ?;', [date]);
  }

  async setGoal(activityId: string, date: string, goalMinutes: number): Promise<DailyGoal> {
    const existing = await getFirstAsync<{ id: string }>(
      'SELECT id FROM daily_goals WHERE date = ? AND activityId = ?;',
      [date, activityId],
    );
    const id = existing?.id ?? createId();
    await runAsync(
      `INSERT INTO daily_goals (id, date, activityId, goalMinutes)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(date, activityId) DO UPDATE SET goalMinutes = excluded.goalMinutes;`,
      [id, date, activityId, goalMinutes],
    );
    return { id, date, activityId, goalMinutes };
  }

  async deleteGoal(activityId: string, date: string): Promise<void> {
    await runAsync('DELETE FROM daily_goals WHERE date = ? AND activityId = ?;', [date, activityId]);
  }
}
