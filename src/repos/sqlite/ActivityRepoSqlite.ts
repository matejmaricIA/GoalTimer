import { getAllAsync, getFirstAsync, runAsync } from '../../db/sqlite';
import { Activity } from '../../types/models';
import { createId } from '../../utils/id';
import { ActivityInput, ActivityRepo, ActivityUpdate } from '../types';

export class ActivityRepoSqlite implements ActivityRepo {
  async list(): Promise<Activity[]> {
    return getAllAsync<Activity>('SELECT * FROM activities ORDER BY createdAt ASC;');
  }

  async create(input: ActivityInput): Promise<Activity> {
    const now = Date.now();
    const activity: Activity = {
      id: createId(),
      name: input.name.trim(),
      color: input.color ?? null,
      createdAt: now,
      defaultGoalMinutes: input.defaultGoalMinutes ?? null,
    };
    await runAsync(
      'INSERT INTO activities (id, name, color, createdAt, defaultGoalMinutes) VALUES (?, ?, ?, ?, ?);',
      [
        activity.id,
        activity.name,
        activity.color ?? null,
        activity.createdAt,
        activity.defaultGoalMinutes ?? null,
      ],
    );
    return activity;
  }

  async update(id: string, updates: ActivityUpdate): Promise<Activity> {
    const current = await this.getById(id);
    const next: Activity = {
      ...current,
      ...updates,
      name: updates.name?.trim() ?? current.name,
      color: updates.color ?? current.color ?? null,
      defaultGoalMinutes: updates.defaultGoalMinutes ?? current.defaultGoalMinutes ?? null,
    };
    await runAsync('UPDATE activities SET name = ?, color = ?, defaultGoalMinutes = ? WHERE id = ?;', [
      next.name,
      next.color ?? null,
      next.defaultGoalMinutes ?? null,
      id,
    ]);
    return next;
  }

  async delete(id: string): Promise<void> {
    await runAsync('DELETE FROM activities WHERE id = ?;', [id]);
  }

  private async getById(id: string): Promise<Activity> {
    const result = await getFirstAsync<Activity>('SELECT * FROM activities WHERE id = ? LIMIT 1;', [id]);
    if (!result) {
      throw new Error('Activity not found');
    }
    return result;
  }
}
