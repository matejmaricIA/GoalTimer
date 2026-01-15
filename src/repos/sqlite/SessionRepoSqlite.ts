import { getAllAsync, getFirstAsync, runAsync } from '../../db/sqlite';
import { Session } from '../../types/models';
import { createId } from '../../utils/id';
import { SessionRepo } from '../types';

export class SessionRepoSqlite implements SessionRepo {
  async list(): Promise<Session[]> {
    return getAllAsync<Session>('SELECT * FROM sessions ORDER BY startTs ASC;');
  }

  async getRunningSession(): Promise<Session | null> {
    const result = await getFirstAsync<Session>('SELECT * FROM sessions WHERE endTs IS NULL LIMIT 1;');
    return result ?? null;
  }

  async createSession(activityId: string, startTs: number, date: string): Promise<Session> {
    const session: Session = {
      id: createId(),
      activityId,
      startTs,
      endTs: null,
      date,
    };
    await runAsync(
      'INSERT INTO sessions (id, activityId, startTs, endTs, date) VALUES (?, ?, ?, ?, ?);',
      [session.id, session.activityId, session.startTs, session.endTs ?? null, session.date],
    );
    return session;
  }

  async endSession(sessionId: string, endTs: number): Promise<void> {
    await runAsync('UPDATE sessions SET endTs = ? WHERE id = ?;', [endTs, sessionId]);
  }

  async deleteByActivity(activityId: string): Promise<void> {
    await runAsync('DELETE FROM sessions WHERE activityId = ?;', [activityId]);
  }
}
