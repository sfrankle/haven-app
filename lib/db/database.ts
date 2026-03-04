import * as SQLite from 'expo-sqlite';
import { migrations } from './migrations';

let _db: SQLite.SQLiteDatabase | null = null;

/**
 * Runs pending migrations against the database.
 * Uses the SQLite `user_version` pragma to track the current schema version.
 * Each entry in `migrations` is a SQL string executed as a single transaction.
 * Index 0 = version 1, index 1 = version 2, etc.
 */
async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const result = await db.getAllAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const currentVersion = result[0]?.user_version ?? 0;

  for (let i = currentVersion; i < migrations.length; i++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(migrations[i]);
      await db.execAsync(`PRAGMA user_version = ${i + 1}`);
    });
  }
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  const db = await SQLite.openDatabaseAsync('haven.db');
  await runMigrations(db);
  _db = db;
  return db;
}
