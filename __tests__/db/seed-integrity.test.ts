/**
 * Seed integrity test — validates that migrations run cleanly and the seeded
 * vocabulary has correct structure and relationships.
 *
 * Uses better-sqlite3 (Node-native, synchronous) so the test runs in Jest
 * without a device or expo-sqlite native module.
 *
 * Philosophy:
 * - Structural FK invariants catch corrupt data regardless of vocabulary size.
 * - Entry type list and measurement type relationships are foundational to app logic.
 * - Negative assertions document intentional design decisions.
 * - Spot-checks on specific vocabulary items (food labels, symptom names, etc.)
 *   belong in seed SQL review, not here — they break on legitimate vocabulary changes.
 * - CRUD tests belong alongside the repository/service layer, not here.
 */
import { applyAllMigrations, openTestDb } from '../../lib/db/test-helpers';

describe('seed integrity', () => {
  let db: ReturnType<typeof openTestDb>;

  beforeAll(() => {
    db = openTestDb();
    applyAllMigrations(db);
  });

  afterAll(() => {
    db.close();
  });

  // ---- migrations smoke test ----

  test('all migration files load without error', () => {
    // If beforeAll didn't throw, all SQL files parsed and executed cleanly.
    // Confirm the DB is usable by checking a core table exists.
    const row = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='entry_type'`)
      .get();
    expect(row).toBeDefined();
  });

  // ---- structural FK invariants ----
  // These are the most important tests: they catch corrupt seed data regardless
  // of vocabulary size. SQLite won't enforce FKs unless PRAGMA foreign_keys=ON
  // (set in beforeAll above).

  test('no label has an orphaned parent_id', () => {
    const rows = db.prepare(`
      SELECT l.name FROM label l
      LEFT JOIN label parent ON l.parent_id = parent.id
      WHERE l.parent_id IS NOT NULL AND parent.id IS NULL
    `).all();
    expect(rows).toHaveLength(0);
  });

  test('no label is its own parent', () => {
    const rows = db.prepare(
      'SELECT name FROM label WHERE parent_id = id'
    ).all();
    expect(rows).toHaveLength(0);
  });

  test('no orphaned label_id in label_tag', () => {
    const rows = db.prepare(`
      SELECT lt.label_id FROM label_tag lt
      LEFT JOIN label l ON lt.label_id = l.id
      WHERE l.id IS NULL
    `).all();
    expect(rows).toHaveLength(0);
  });

  test('no orphaned tag_id in label_tag', () => {
    const rows = db.prepare(`
      SELECT lt.tag_id FROM label_tag lt
      LEFT JOIN tag t ON lt.tag_id = t.id
      WHERE t.id IS NULL
    `).all();
    expect(rows).toHaveLength(0);
  });

  test('all entry_type rows reference a valid measurement_type', () => {
    const rows = db.prepare(`
      SELECT et.name FROM entry_type et
      LEFT JOIN measurement_type mt ON et.measurement_type_id = mt.id
      WHERE mt.id IS NULL
    `).all();
    expect(rows).toHaveLength(0);
  });

  test('all seeded labels have non-null seed_version', () => {
    const rows = db.prepare(
      'SELECT name FROM label WHERE seed_version IS NULL'
    ).all() as { name: string }[];
    expect(rows).toHaveLength(0);
  });

  test('all seeded tags have non-null seed_version', () => {
    const rows = db.prepare(
      'SELECT name FROM tag WHERE seed_version IS NULL'
    ).all() as { name: string }[];
    expect(rows).toHaveLength(0);
  });

  // ---- entry types — foundational to app logic ----

  test('entry_type: all types present in sort order', () => {
    const rows = db
      .prepare('SELECT name FROM entry_type ORDER BY sort_order')
      .all() as { name: string }[];
    expect(rows.map((r) => r.name)).toEqual([
      'Sleep',
      'Hydration',
      'Food',
      'Emotion',
      'Physical',
      'Activity',
    ]);
  });

  test('entry_type: Sleep uses measurement_type numeric', () => {
    const row = db
      .prepare(
        `SELECT mt.name as mt_name FROM entry_type et
         JOIN measurement_type mt ON et.measurement_type_id = mt.id
         WHERE et.name = 'Sleep'`
      )
      .get() as { mt_name: string } | undefined;
    expect(row?.mt_name).toBe('numeric');
  });

  test('entry_type: Physical uses measurement_type label_select_severity', () => {
    const row = db
      .prepare(
        `SELECT mt.name as mt_name FROM entry_type et
         JOIN measurement_type mt ON et.measurement_type_id = mt.id
         WHERE et.name = 'Physical'`
      )
      .get() as { mt_name: string } | undefined;
    expect(row?.mt_name).toBe('label_select_severity');
  });

  // ---- negative assertions — intentional design decisions ----
  // These document things that must NOT be in the vocabulary.

  test('label: Joints and Skin do not exist as Physical labels', () => {
    for (const name of ['Joints', 'Skin']) {
      const row = db
        .prepare(
          `SELECT 1 FROM label l
           JOIN entry_type et ON l.entry_type_id = et.id
           WHERE et.name = 'Physical' AND l.name = ?`
        )
        .get(name);
      expect(row).toBeUndefined();
    }
  });

  test('label: Morning routine and Evening routine not present in Activity', () => {
    for (const name of ['Morning routine', 'Evening routine']) {
      const row = db
        .prepare(
          `SELECT 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id
           WHERE et.name = 'Activity' AND l.name = ?`
        )
        .get(name);
      expect(row).toBeUndefined();
    }
  });

  test('label_tag: Peanuts not tagged tree_nuts', () => {
    const row = db
      .prepare(
        `SELECT 1 FROM label_tag lt
         JOIN label l ON lt.label_id = l.id
         JOIN entry_type et ON l.entry_type_id = et.id
         JOIN tag t ON lt.tag_id = t.id
         WHERE et.name = 'Food' AND l.name = 'Peanuts' AND t.name = 'tree_nuts'`
      )
      .get();
    expect(row).toBeUndefined();
  });

  test('label_tag: Grapes not tagged fodmap', () => {
    const row = db
      .prepare(
        `SELECT 1 FROM label_tag lt
         JOIN label l ON lt.label_id = l.id
         JOIN entry_type et ON l.entry_type_id = et.id
         JOIN tag t ON lt.tag_id = t.id
         WHERE et.name = 'Food' AND l.name = 'Grapes' AND t.name = 'fodmap'`
      )
      .get();
    expect(row).toBeUndefined();
  });

  // ---- idempotency ----

  test('idempotency: running all migrations twice produces no duplicates', () => {
    const snapshot = (table: string) =>
      (db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get() as { c: number }).c;

    const before = {
      measurement_type: snapshot('measurement_type'),
      entry_type: snapshot('entry_type'),
      category: snapshot('category'),
      tag: snapshot('tag'),
      label: snapshot('label'),
      label_tag: snapshot('label_tag'),
    };

    applyAllMigrations(db);

    expect(snapshot('measurement_type')).toBe(before.measurement_type);
    expect(snapshot('entry_type')).toBe(before.entry_type);
    expect(snapshot('category')).toBe(before.category);
    expect(snapshot('tag')).toBe(before.tag);
    expect(snapshot('label')).toBe(before.label);
    expect(snapshot('label_tag')).toBe(before.label_tag);
  });
});
