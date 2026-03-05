import * as SQLite from 'expo-sqlite';
import { migrations } from './migrations';

let _db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Runs pending migrations against the database.
 * Uses the SQLite `user_version` pragma to track the current schema version.
 * Each entry in `migrations` is a SQL string executed as a single transaction.
 * Index 0 = version 1, index 1 = version 2, etc.
 *
 * IMPORTANT: `PRAGMA user_version = N` is set AFTER the transaction commits,
 * not inside it. The pragma is not rolled back by SQLite if a transaction fails,
 * so setting it inside would permanently skip a migration that fails mid-way.
 * Setting it after is safe because all tables use CREATE TABLE IF NOT EXISTS —
 * a re-run on the next launch is idempotent.
 */
async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const result = await db.getFirstAsync<{ user_version: number }>(
    'PRAGMA user_version'
  );
  const currentVersion = result?.user_version ?? 0;

  for (let i = currentVersion; i < migrations.length; i++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(migrations[i]);
    });
    await db.execAsync(`PRAGMA user_version = ${i + 1}`);
  }
}

/**
 * Returns the singleton database instance, opening and migrating it on first call.
 * Concurrent callers during app startup share the same initialization promise,
 * preventing multiple open handles.
 */
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return Promise.resolve(_db);
  if (_initPromise) return _initPromise;
  _initPromise = SQLite.openDatabaseAsync('haven.db').then(async (db) => {
    await runMigrations(db);
    _db = db;
    return db;
  });
  return _initPromise;
}
