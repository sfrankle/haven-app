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
];

export function readMigration(filename: string): string {
  return readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
}

export function applyAllMigrations(db: Database.Database): void {
  for (const file of MIGRATION_FILES) {
    db.exec(readMigration(file));
  }
}

/** Opens an in-memory DB with FK enforcement on and returns it. */
export function openTestDb(): Database.Database {
  const db = new Database(':memory:');
  db.pragma('foreign_keys = ON');
  return db;
}
