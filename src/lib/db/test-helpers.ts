/**
 * Shared helpers for better-sqlite3 database tests.
 * Centralises the migrations directory path, DB setup, and migration runner
 * so schema-integrity and seed-integrity tests stay DRY.
 */
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import path from 'path';

export const MIGRATIONS_DIR = path.join(__dirname, '../../lib/db/migrations');

/**
 * The ordered list of migration files — mirrors lib/db/migrations/index.ts.
 *
 * We can't import the production manifest directly because it uses require()
 * on .sql files via the Metro sql-loader transformer, which is not available
 * in Jest/Node. So we maintain this explicit list here.
 *
 * IMPORTANT: when you add a migration to lib/db/migrations/index.ts, add the
 * filename here too — in the same position.
 */
export const MIGRATION_FILES = [
  'v1__schema.sql',
  'v2__seed-base.sql',
  'v3__seed-food.sql',
  'v4__seed-fodmap.sql',
  'v5__seed-emotions.sql',
  'v6__seed-activity.sql',
  'v7__seed-physical.sql',
  'v8__focus-tables.sql',
  'v9__routine-tables.sql',
];

export function readMigration(filename: string): string {
  return readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
}

export function applyAllMigrations(db: Database.Database): void {
  for (const file of MIGRATION_FILES) {
    const sql = readMigration(file);
    // Split on statement boundaries so we can handle ALTER TABLE ADD COLUMN
    // idempotently. SQLite does not support `ALTER TABLE ADD COLUMN IF NOT
    // EXISTS`, but the production runner (user_version-gated) never re-applies
    // a migration. In tests that call applyAllMigrations twice (idempotency
    // checks), "duplicate column name" errors on ALTER TABLE are expected and
    // safe to ignore.
    const statements = sql
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      try {
        db.exec(stmt.endsWith(';') ? stmt : stmt + ';');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('duplicate column name')) {
          // ALTER TABLE ADD COLUMN re-applied — safe to ignore in test context
          continue;
        }
        throw err;
      }
    }
  }
}

/** Opens an in-memory DB with FK enforcement on and returns it. */
export function openTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  return db;
}

/** Returns the entry_type id for a given name (guaranteed by seed). */
export function entryTypeId(raw: Database.Database, name: string): number {
  const row = raw.prepare('SELECT id FROM entry_type WHERE name = ?').get(name) as
    | { id: number }
    | undefined;
  if (!row) throw new Error(`entry_type '${name}' not found in seed`);
  return row.id;
}

/** Returns any enabled label id for a given entry_type name. */
export function anyLabelId(raw: Database.Database, entryTypeName: string): number {
  const row = raw
    .prepare(
      `SELECT l.id FROM label l
       JOIN entry_type et ON l.entry_type_id = et.id
       WHERE et.name = ? AND l.is_enabled = 1
       LIMIT 1`
    )
    .get(entryTypeName) as { id: number } | undefined;
  if (!row) throw new Error(`No enabled label for entry_type '${entryTypeName}'`);
  return row.id;
}
