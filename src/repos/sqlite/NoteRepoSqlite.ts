import { getAllAsync, getFirstAsync, runAsync } from '../../db/sqlite';
import { Note } from '../../types/models';
import { createId } from '../../utils/id';
import { NoteRepo } from '../types';

export class NoteRepoSqlite implements NoteRepo {
  async list(): Promise<Note[]> {
    return getAllAsync<Note>('SELECT * FROM notes ORDER BY updatedAt DESC;');
  }

  async getByDate(date: string): Promise<Note[]> {
    return getAllAsync<Note>('SELECT * FROM notes WHERE date = ?;', [date]);
  }

  async upsertNote(activityId: string, date: string, text: string, updatedAt: number): Promise<Note> {
    const existing = await getFirstAsync<{ id: string }>(
      'SELECT id FROM notes WHERE date = ? AND activityId = ?;',
      [date, activityId],
    );
    const id = existing?.id ?? createId();
    await runAsync(
      `INSERT INTO notes (id, date, activityId, text, updatedAt)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(date, activityId) DO UPDATE SET text = excluded.text, updatedAt = excluded.updatedAt;`,
      [id, date, activityId, text, updatedAt],
    );
    return { id, date, activityId, text, updatedAt };
  }

  async deleteNote(activityId: string, date: string): Promise<void> {
    await runAsync('DELETE FROM notes WHERE date = ? AND activityId = ?;', [date, activityId]);
  }
}
