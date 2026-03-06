/**
 * Schema integrity test — validates that the migration SQL creates all expected
 * tables with the correct columns.
 *
 * Uses better-sqlite3 (Node-native, synchronous) so the test runs in Jest
 * without a device or expo-sqlite native module.
 */
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, '../../lib/db/migrations');

const SCHEMA_SQL = readFileSync(
  path.join(MIGRATIONS_DIR, 'v1__schema.sql'),
  'utf8'
);

const EXPECTED_SCHEMA: Record<string, string[]> = {
  measurement_type: ['id', 'name', 'display_name'],
  category: ['id', 'name'],
  entry_type: [
    'id',
    'name',
    'measurement_type_id',
    'prompt',
    'icon',
    'is_enabled',
    'is_default',
    'sort_order',
  ],
  label: [
    'id',
    'entry_type_id',
    'name',
    'parent_id',
    'category_id',
    'is_default',
    'is_enabled',
    'sort_order',
    'seed_version',
  ],
  tag: ['id', 'name', 'tag_group', 'seed_version'],
  label_tag: ['label_id', 'tag_id', 'seed_version'],
  entry: [
    'id',
    'entry_type_id',
    'source_type',
    'timestamp',
    'created_at',
    'numeric_value',
    'notes',
  ],
  entry_label: ['entry_id', 'label_id'],
};

describe('schema integrity', () => {
  let db: Database.Database;

  beforeAll(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(SCHEMA_SQL);
  });

  afterAll(() => {
    db.close();
  });

  test('schema SQL loads without error', () => {
    // If beforeAll didn't throw, the SQL is valid. Query sqlite_master as a
    // lightweight confirmation that the DB is usable.
    const tables = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`)
      .all() as { name: string }[];
    expect(tables.length).toBeGreaterThan(0);
  });

  test.each(Object.entries(EXPECTED_SCHEMA))(
    'table %s has correct columns',
    (tableName, expectedCols) => {
      const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as {
        name: string;
      }[];
      const actualColumns = rows.map((r) => r.name);
      expect(actualColumns).toEqual(expectedCols);
    }
  );
});
