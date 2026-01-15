import { openDatabaseAsync, type SQLiteDatabase, type SQLiteRunResult } from 'expo-sqlite';

let dbPromise: Promise<SQLiteDatabase> | null = null;

const getDb = async (): Promise<SQLiteDatabase> => {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync('goaltimer.db');
  }
  return dbPromise;
};

export const runAsync = async (
  sql: string,
  params: (string | number | null)[] = [],
): Promise<SQLiteRunResult> => {
  const db = await getDb();
  return db.runAsync(sql, ...params);
};

export const getAllAsync = async <T>(
  sql: string,
  params: (string | number | null)[] = [],
): Promise<T[]> => {
  const db = await getDb();
  return db.getAllAsync<T>(sql, ...params);
};

export const getFirstAsync = async <T>(
  sql: string,
  params: (string | number | null)[] = [],
): Promise<T | null> => {
  const db = await getDb();
  return db.getFirstAsync<T>(sql, ...params);
};

export const execAsync = async (sql: string): Promise<void> => {
  const db = await getDb();
  await db.execAsync(sql);
};

export const runTransactionAsync = async (
  statements: { sql: string; params?: (string | number | null)[] }[],
): Promise<void> => {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const statement of statements) {
      await db.runAsync(statement.sql, ...(statement.params ?? []));
    }
  });
};
