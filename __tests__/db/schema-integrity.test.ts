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

const SCHEMA_SQL = readFileSync(
  path.join(__dirname, '../../lib/db/migrations/v1__schema.sql'),
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
  anchor_activity: [
    'id',
    'label_id',
    'title',
    'icon',
    'default_effort',
    'user_effort',
    'is_enabled',
    'is_default',
    'seed_version',
  ],
  anchor_tag: ['anchor_activity_id', 'tag_id'],
  issue: ['id', 'name', 'description', 'is_archived', 'created_at'],
  entry_issue: ['entry_id', 'issue_id'],
};

describe('schema integrity', () => {
  let db: Database.Database;

  beforeAll(() => {
    db = new Database(':memory:');
    db.exec(SCHEMA_SQL);
  });

  afterAll(() => {
    db.close();
  });

  test('migration creates all 12 tables', () => {
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
      )
      .all() as { name: string }[];
    expect(tables).toHaveLength(Object.keys(EXPECTED_SCHEMA).length);
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
