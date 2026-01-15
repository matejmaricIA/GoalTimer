import { execAsync, getFirstAsync, runTransactionAsync } from './sqlite';

export const runMigrations = async (): Promise<void> => {
  await execAsync('PRAGMA foreign_keys = ON;');
  const versionRow = await getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = versionRow?.user_version ?? 0;
  if (currentVersion < 1) {
    await migrateToV1();
  }
};

const migrateToV1 = async (): Promise<void> => {
  await runTransactionAsync([
    {
      sql: `CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        color TEXT,
        createdAt INTEGER NOT NULL,
        defaultGoalMinutes INTEGER
      );`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS daily_goals (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        activityId TEXT NOT NULL,
        goalMinutes INTEGER NOT NULL,
        FOREIGN KEY (activityId) REFERENCES activities(id) ON DELETE CASCADE
      );`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY NOT NULL,
        activityId TEXT NOT NULL,
        startTs INTEGER NOT NULL,
        endTs INTEGER,
        date TEXT NOT NULL,
        FOREIGN KEY (activityId) REFERENCES activities(id) ON DELETE CASCADE
      );`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY NOT NULL,
        date TEXT NOT NULL,
        activityId TEXT NOT NULL,
        text TEXT NOT NULL,
        updatedAt INTEGER NOT NULL,
        FOREIGN KEY (activityId) REFERENCES activities(id) ON DELETE CASCADE
      );`,
    },
    {
      sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_goals_date_activity ON daily_goals(date, activityId);',
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_activity ON sessions(activityId);',
    },
    {
      sql: 'CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(date);',
    },
    {
      sql: 'CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_date_activity ON notes(date, activityId);',
    },
    { sql: 'PRAGMA user_version = 1;' },
  ]);
};
