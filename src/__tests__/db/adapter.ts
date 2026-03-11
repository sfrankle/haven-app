/**
 * BetterSqliteAdapter
 *
 * Wraps better-sqlite3's synchronous API to match the subset of the
 * expo-sqlite SQLiteDatabase async interface that queries.ts uses.
 * This lets query functions run unmodified in Jest (Node) without
 * a device or the expo-sqlite native module.
 *
 * Only the methods called by queries.ts are implemented. Unimplemented
 * methods throw to surface accidental usage early.
 */
import type Database from 'better-sqlite3';

/**
 * Minimal async interface subset that queries.ts depends on.
 * Mirrors the relevant parts of expo-sqlite's SQLiteDatabase.
 */
export interface AdaptedDb {
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
  runAsync(sql: string, params?: unknown[]): Promise<{ lastInsertRowId: number; changes: number }>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
}

/**
 * Wraps a better-sqlite3 Database instance to look like an async
 * expo-sqlite SQLiteDatabase for use in Jest tests.
 */
export function createAdapter(db: Database.Database): AdaptedDb {
  return {
    async getAllAsync<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      return db.prepare(sql).all(...params) as T[];
    },

    async getFirstAsync<T>(sql: string, params: unknown[] = []): Promise<T | null> {
      const row = db.prepare(sql).get(...params);
      return (row as T | undefined) ?? null;
    },

    async runAsync(
      sql: string,
      params: unknown[] = []
    ): Promise<{ lastInsertRowId: number; changes: number }> {
      const result = db.prepare(sql).run(...params);
      return {
        lastInsertRowId: Number(result.lastInsertRowid),
        changes: result.changes,
      };
    },

    async withTransactionAsync(fn: () => Promise<void>): Promise<void> {
      db.prepare('BEGIN').run();
      try {
        await fn();
        db.prepare('COMMIT').run();
      } catch (err) {
        db.prepare('ROLLBACK').run();
        throw err;
      }
    },
  };
}
