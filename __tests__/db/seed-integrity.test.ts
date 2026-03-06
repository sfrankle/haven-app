/**
 * Seed integrity test — validates that the seed SQL inserts the expected default
 * vocabulary into the database with correct data and parent-child relationships.
 *
 * Uses better-sqlite3 (Node-native, synchronous) so the test runs in Jest
 * without a device or expo-sqlite native module.
 *
 * Philosophy:
 * - No naked count assertions — counts break silently when vocabulary grows.
 * - Prefer name-based spot-checks and relationship assertions over totals.
 * - Structural invariants (FK integrity, seed_version) guard data correctness.
 * - CRUD tests belong alongside the repository/service layer, not here.
 */
import Database from 'better-sqlite3';
import { readdirSync, readFileSync } from 'fs';
import path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, '../../lib/db/migrations');

function readMigration(filename: string): string {
  return readFileSync(path.join(MIGRATIONS_DIR, filename), 'utf8');
}

function applyAllMigrations(db: Database.Database): void {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    db.exec(readMigration(file));
  }
}

describe('seed integrity', () => {
  let db: Database.Database;

  beforeAll(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
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

  // ---- measurement_type ----

  test('measurement_type: all expected names present', () => {
    const rows = db
      .prepare('SELECT name FROM measurement_type ORDER BY name')
      .all() as { name: string }[];
    expect(rows.map((r) => r.name)).toEqual([
      'label_select',
      'label_select_severity',
      'numeric',
    ]);
  });

  // ---- entry_type ----

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

  // ---- label hierarchy: Emotion ----

  test('label: Emotion L1 buckets are correct', () => {
    const rows = db
      .prepare(
        `SELECT name FROM label
         WHERE entry_type_id = (SELECT id FROM entry_type WHERE name = 'Emotion')
           AND parent_id IS NULL
         ORDER BY name`
      )
      .all() as { name: string }[];
    expect(rows.map((r) => r.name)).toEqual([
      'Bright', 'Charged', 'Heavy', 'Still', 'Warm',
    ]);
  });

  test('label: Joyful has expected L3 emotions', () => {
    const rows = db
      .prepare(
        `SELECT l.name FROM label l
         JOIN label pl ON l.parent_id = pl.id
         JOIN entry_type et ON l.entry_type_id = et.id
         WHERE et.name = 'Emotion' AND pl.name = 'Joyful'`
      )
      .all() as { name: string }[];
    expect(rows.map((r) => r.name)).toContain('Happy');
    expect(rows.map((r) => r.name)).toContain('Playful');
  });

  // ---- label: Food ----

  test('label: Food Cheese exists with no parent', () => {
    const row = db
      .prepare(
        `SELECT l.parent_id FROM label l
         JOIN entry_type et ON l.entry_type_id = et.id
         WHERE et.name = 'Food' AND l.name = 'Cheese'`
      )
      .get() as { parent_id: number | null } | undefined;
    expect(row).toBeDefined();
    expect(row!.parent_id).toBeNull();
  });

  test('label: Sourdough exists with category Grains', () => {
    const row = db
      .prepare(
        `SELECT c.name as cat FROM label l
         JOIN entry_type et ON l.entry_type_id = et.id
         JOIN category c ON l.category_id = c.id
         WHERE et.name = 'Food' AND l.name = 'Sourdough'`
      )
      .get() as { cat: string } | undefined;
    expect(row?.cat).toBe('Grains');
  });

  test('label: individual nut labels exist', () => {
    const nuts = ['Almonds', 'Cashews', 'Hazelnuts', 'Macadamia', 'Peanuts', 'Pecans', 'Pistachios', 'Walnuts'];
    for (const nut of nuts) {
      const row = db
        .prepare(
          `SELECT 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id
           WHERE et.name = 'Food' AND l.name = ?`
        )
        .get(nut);
      expect(row).toBeDefined();
    }
  });

  // ---- label: Physical ----

  test('label: Energy exists as a top-level Physical label', () => {
    const row = db
      .prepare(
        `SELECT l.parent_id FROM label l
         JOIN entry_type et ON l.entry_type_id = et.id
         WHERE et.name = 'Physical' AND l.name = 'Energy'`
      )
      .get() as { parent_id: number | null } | undefined;
    expect(row).toBeDefined();
    expect(row!.parent_id).toBeNull();
  });

  test('label: Headache is a child of Head', () => {
    const row = db
      .prepare(
        `SELECT pl.name as parent_name FROM label l
         JOIN entry_type et ON l.entry_type_id = et.id
         JOIN label pl ON l.parent_id = pl.id
         WHERE et.name = 'Physical' AND l.name = 'Headache'`
      )
      .get() as { parent_name: string } | undefined;
    expect(row?.parent_name).toBe('Head');
  });

  test('label: universal symptoms are children of Body', () => {
    const universals = ['Pain', 'Stiff', 'Numb', 'Tingling', 'Itchy', 'Rash', 'Swollen', 'Warm', 'Sore', 'Weak', 'Strong', 'Fine'];
    for (const name of universals) {
      const row = db
        .prepare(
          `SELECT pl.name as parent_name FROM label l
           JOIN entry_type et ON l.entry_type_id = et.id
           JOIN label pl ON l.parent_id = pl.id
           WHERE et.name = 'Physical' AND l.name = ?`
        )
        .get(name) as { parent_name: string } | undefined;
      expect(row?.parent_name).toBe('Body');
    }
  });

  test('label: Head has expected area-specific symptoms', () => {
    const specific = ['Headache', 'Migraine', 'Brain fog', 'Sore throat', 'Clear-headed'];
    for (const name of specific) {
      const row = db
        .prepare(
          `SELECT 1 FROM label l
           JOIN entry_type et ON l.entry_type_id = et.id
           JOIN label pl ON l.parent_id = pl.id
           WHERE et.name = 'Physical' AND pl.name = 'Head' AND l.name = ?`
        )
        .get(name);
      expect(row).toBeDefined();
    }
  });

  test('label: Gut has expected area-specific symptoms', () => {
    const gutLabels = ['Bloating', 'Nausea', 'Comfortable', 'Full', 'Empty'];
    for (const name of gutLabels) {
      const row = db
        .prepare(
          `SELECT 1 FROM label l
           JOIN entry_type et ON l.entry_type_id = et.id
           JOIN label pl ON l.parent_id = pl.id
           WHERE et.name = 'Physical' AND pl.name = 'Gut' AND l.name = ?`
        )
        .get(name);
      expect(row).toBeDefined();
    }
  });

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

  // ---- label: Activity ----

  test('label: Activity Walk exists with category Move', () => {
    const row = db
      .prepare(
        `SELECT c.name as cat_name FROM label l
         JOIN entry_type et ON l.entry_type_id = et.id
         JOIN category c ON l.category_id = c.id
         WHERE et.name = 'Activity' AND l.name = 'Walk'`
      )
      .get() as { cat_name: string } | undefined;
    expect(row?.cat_name).toBe('Move');
  });

  test('label: Activity Meditation exists with category Breathe', () => {
    const row = db
      .prepare(
        `SELECT c.name as cat_name FROM label l
         JOIN entry_type et ON l.entry_type_id = et.id
         JOIN category c ON l.category_id = c.id
         WHERE et.name = 'Activity' AND l.name = 'Meditation'`
      )
      .get() as { cat_name: string } | undefined;
    expect(row?.cat_name).toBe('Breathe');
  });

  test('label: Morning routine and Evening routine not present', () => {
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

  // ---- label_tag spot-checks ----

  test('label_tag: Cheese → dairy', () => {
    const assoc = db
      .prepare(
        `SELECT 1 FROM label_tag lt
         JOIN label l ON lt.label_id = l.id
         JOIN entry_type et ON l.entry_type_id = et.id
         JOIN tag t ON lt.tag_id = t.id
         WHERE et.name = 'Food' AND l.name = 'Cheese' AND t.name = 'dairy'`
      )
      .get();
    expect(assoc).toBeDefined();
  });

  test('label_tag: Coffee → caffeine', () => {
    const assoc = db
      .prepare(
        `SELECT 1 FROM label_tag lt
         JOIN label l ON lt.label_id = l.id
         JOIN entry_type et ON l.entry_type_id = et.id
         JOIN tag t ON lt.tag_id = t.id
         WHERE et.name = 'Food' AND l.name = 'Coffee' AND t.name = 'caffeine'`
      )
      .get();
    expect(assoc).toBeDefined();
  });

  test('label_tag: Hazelnuts → tree_nuts', () => {
    const assoc = db
      .prepare(
        `SELECT 1 FROM label_tag lt
         JOIN label l ON lt.label_id = l.id
         JOIN entry_type et ON l.entry_type_id = et.id
         JOIN tag t ON lt.tag_id = t.id
         WHERE et.name = 'Food' AND l.name = 'Hazelnuts' AND t.name = 'tree_nuts'`
      )
      .get();
    expect(assoc).toBeDefined();
  });

  test('label_tag: Peanuts → peanuts (not tree_nuts)', () => {
    const isPeanut = db
      .prepare(
        `SELECT 1 FROM label_tag lt
         JOIN label l ON lt.label_id = l.id
         JOIN entry_type et ON l.entry_type_id = et.id
         JOIN tag t ON lt.tag_id = t.id
         WHERE et.name = 'Food' AND l.name = 'Peanuts' AND t.name = 'peanuts'`
      )
      .get();
    expect(isPeanut).toBeDefined();

    const isTreeNut = db
      .prepare(
        `SELECT 1 FROM label_tag lt
         JOIN label l ON lt.label_id = l.id
         JOIN entry_type et ON l.entry_type_id = et.id
         JOIN tag t ON lt.tag_id = t.id
         WHERE et.name = 'Food' AND l.name = 'Peanuts' AND t.name = 'tree_nuts'`
      )
      .get();
    expect(isTreeNut).toBeUndefined();
  });

  test('label_tag: Onion → fodmap', () => {
    const assoc = db
      .prepare(
        `SELECT 1 FROM label_tag lt
         JOIN label l ON lt.label_id = l.id
         JOIN entry_type et ON l.entry_type_id = et.id
         JOIN tag t ON lt.tag_id = t.id
         WHERE et.name = 'Food' AND l.name = 'Onion' AND t.name = 'fodmap'`
      )
      .get();
    expect(assoc).toBeDefined();
  });

  test('label_tag: Grapes not tagged fodmap', () => {
    const assoc = db
      .prepare(
        `SELECT 1 FROM label_tag lt
         JOIN label l ON lt.label_id = l.id
         JOIN entry_type et ON l.entry_type_id = et.id
         JOIN tag t ON lt.tag_id = t.id
         WHERE et.name = 'Food' AND l.name = 'Grapes' AND t.name = 'fodmap'`
      )
      .get();
    expect(assoc).toBeUndefined();
  });

  test('label_tag: Walk → cardiovascular', () => {
    const assoc = db
      .prepare(
        `SELECT 1 FROM label_tag lt
         JOIN label l ON lt.label_id = l.id
         JOIN entry_type et ON l.entry_type_id = et.id
         JOIN tag t ON lt.tag_id = t.id
         WHERE et.name = 'Activity' AND l.name = 'Walk' AND t.name = 'cardiovascular'`
      )
      .get();
    expect(assoc).toBeDefined();
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
