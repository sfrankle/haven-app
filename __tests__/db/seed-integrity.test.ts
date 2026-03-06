/**
 * Seed integrity test — validates that the seed SQL inserts the expected default
 * vocabulary into the database with correct data and parent-child relationships.
 *
 * Uses better-sqlite3 (Node-native, synchronous) so the test runs in Jest
 * without a device or expo-sqlite native module.
 *
 * No test asserts on specific integer IDs — all lookups use name-based queries.
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
    applyAllMigrations(db);
  });

  afterAll(() => {
    db.close();
  });

  // ---- measurement_type ----

  test('measurement_type: count = 3', () => {
    const { count } = db
      .prepare('SELECT COUNT(*) as count FROM measurement_type')
      .get() as { count: number };
    expect(count).toBe(3);
  });

  test('measurement_type: expected names present', () => {
    const rows = db
      .prepare('SELECT name FROM measurement_type ORDER BY name')
      .all() as { name: string }[];
    expect(rows.map((r) => r.name).sort()).toEqual([
      'label_select',
      'label_select_severity',
      'numeric',
    ]);
  });

  // ---- entry_type ----

  test('entry_type: count = 6', () => {
    const { count } = db
      .prepare('SELECT COUNT(*) as count FROM entry_type')
      .get() as { count: number };
    expect(count).toBe(6);
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

  test('entry_type: all 6 names correct', () => {
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

  // ---- category ----

  test('category: count = 16', () => {
    const { count } = db
      .prepare('SELECT COUNT(*) as count FROM category')
      .get() as { count: number };
    expect(count).toBe(16);
  });

  test('category: activity categories present', () => {
    const names = ['Move', 'Create', 'Connect', 'Ground', 'Breathe', 'Reflect', 'Nourish', 'Structure'];
    for (const name of names) {
      const row = db.prepare('SELECT 1 FROM category WHERE name = ?').get(name);
      expect(row).toBeDefined();
    }
  });

  test('category: food categories present', () => {
    const names = ['Grains', 'Dairy', 'Protein', 'Vegetables', 'Fruit', 'Nuts & Seeds', 'Drinks', 'Snacks'];
    for (const name of names) {
      const row = db.prepare('SELECT 1 FROM category WHERE name = ?').get(name);
      expect(row).toBeDefined();
    }
  });

  // ---- tag ----

  test('tag: count = 26', () => {
    const { count } = db
      .prepare('SELECT COUNT(*) as count FROM tag')
      .get() as { count: number };
    expect(count).toBe(26);
  });

  test('tag: food_sensitivity group has 14 tags', () => {
    const { count } = db
      .prepare(
        "SELECT COUNT(*) as count FROM tag WHERE tag_group = 'food_sensitivity'"
      )
      .get() as { count: number };
    expect(count).toBe(14);
  });

  test('tag: allergy group has 4 tags', () => {
    const { count } = db
      .prepare(
        "SELECT COUNT(*) as count FROM tag WHERE tag_group = 'allergy'"
      )
      .get() as { count: number };
    expect(count).toBe(4);
  });

  test('tag: emotion_system group has 2 tags', () => {
    const { count } = db
      .prepare(
        "SELECT COUNT(*) as count FROM tag WHERE tag_group = 'emotion_system'"
      )
      .get() as { count: number };
    expect(count).toBe(2);
  });

  test('tag: activity_type group has 6 tags', () => {
    const { count } = db
      .prepare(
        "SELECT COUNT(*) as count FROM tag WHERE tag_group = 'activity_type'"
      )
      .get() as { count: number };
    expect(count).toBe(6);
  });

  // ---- label hierarchy: Emotion ----

  test('label: emotion L1 has 5 buckets with no parent', () => {
    const rows = db
      .prepare(
        `SELECT name FROM label
         WHERE entry_type_id = (SELECT id FROM entry_type WHERE name = 'Emotion')
           AND parent_id IS NULL
         ORDER BY name`
      )
      .all() as { name: string }[];
    expect(rows.map((r) => r.name).sort()).toEqual([
      'Bright', 'Charged', 'Heavy', 'Still', 'Warm',
    ]);
  });

  test('label: emotion L2 has 25 clusters', () => {
    const { count } = db
      .prepare(
        `SELECT COUNT(*) as count FROM label l
         JOIN label pl ON l.parent_id = pl.id
         JOIN entry_type et ON l.entry_type_id = et.id
         WHERE et.name = 'Emotion' AND pl.parent_id IS NULL`
      )
      .get() as { count: number };
    expect(count).toBe(25);
  });

  test('label: Bright has 4 L2 clusters', () => {
    const { count } = db
      .prepare(
        `SELECT COUNT(*) as count FROM label l
         JOIN label pl ON l.parent_id = pl.id
         JOIN entry_type et ON l.entry_type_id = et.id
         WHERE et.name = 'Emotion' AND pl.name = 'Bright'`
      )
      .get() as { count: number };
    expect(count).toBe(4);
  });

  test('label: Heavy has 7 L2 clusters', () => {
    const { count } = db
      .prepare(
        `SELECT COUNT(*) as count FROM label l
         JOIN label pl ON l.parent_id = pl.id
         JOIN entry_type et ON l.entry_type_id = et.id
         WHERE et.name = 'Emotion' AND pl.name = 'Heavy'`
      )
      .get() as { count: number };
    expect(count).toBe(7);
  });

  test('label: Joyful has 4 L3 emotions', () => {
    const rows = db
      .prepare(
        `SELECT l.name FROM label l
         JOIN label pl ON l.parent_id = pl.id
         JOIN entry_type et ON l.entry_type_id = et.id
         WHERE et.name = 'Emotion' AND pl.name = 'Joyful'`
      )
      .all() as { name: string }[];
    expect(rows.length).toBe(4);
    expect(rows.map((r) => r.name)).toContain('Happy');
    expect(rows.map((r) => r.name)).toContain('Playful');
  });

  test('label: Anxious has 5 L3 emotions', () => {
    const { count } = db
      .prepare(
        `SELECT COUNT(*) as count FROM label l
         JOIN label pl ON l.parent_id = pl.id
         JOIN entry_type et ON l.entry_type_id = et.id
         WHERE et.name = 'Emotion' AND pl.name = 'Anxious'`
      )
      .get() as { count: number };
    expect(count).toBe(5);
  });

  // ---- label: Food ----

  test('label: Food label Cheese exists with no parent', () => {
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

  test('label: Food has 97 labels', () => {
    const { count } = db
      .prepare(
        `SELECT COUNT(*) as count FROM label l
         JOIN entry_type et ON l.entry_type_id = et.id
         WHERE et.name = 'Food'`
      )
      .get() as { count: number };
    expect(count).toBe(97);
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

  // ---- label: Physical ----

  test('label: Physical parent Head exists with no parent', () => {
    const row = db
      .prepare(
        `SELECT l.parent_id FROM label l
         JOIN entry_type et ON l.entry_type_id = et.id
         WHERE et.name = 'Physical' AND l.name = 'Head'`
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

  test('label: Physical has 8 parentless labels (Energy, Head, Arms, Chest, Gut, Legs, Whole body, Body)', () => {
    const { count } = db
      .prepare(
        `SELECT COUNT(*) as count FROM label l
         JOIN entry_type et ON l.entry_type_id = et.id
         WHERE et.name = 'Physical' AND l.parent_id IS NULL`
      )
      .get() as { count: number };
    expect(count).toBe(8);
  });

  test('label: Energy exists as a top-level Physical label with no parent', () => {
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

  test('label: Body has 12 universal symptom children', () => {
    const { count } = db
      .prepare(
        `SELECT COUNT(*) as count FROM label l
         JOIN entry_type et ON l.entry_type_id = et.id
         JOIN label pl ON l.parent_id = pl.id
         WHERE et.name = 'Physical' AND pl.name = 'Body'`
      )
      .get() as { count: number };
    expect(count).toBe(12);
  });

  test('label: Head has area-specific symptoms', () => {
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

  test('label: Gut has area-specific symptoms including positive states', () => {
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

  test('label: Whole body has 5 area-specific states', () => {
    const { count } = db
      .prepare(
        `SELECT COUNT(*) as count FROM label l
         JOIN entry_type et ON l.entry_type_id = et.id
         JOIN label pl ON l.parent_id = pl.id
         WHERE et.name = 'Physical' AND pl.name = 'Whole body'`
      )
      .get() as { count: number };
    expect(count).toBe(5);
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

  test('label_tag: Cheese → dairy association exists', () => {
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

  test('label_tag: Coffee → caffeine association exists', () => {
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

  test('label_tag: Peanuts → peanuts association exists', () => {
    const assoc = db
      .prepare(
        `SELECT 1 FROM label_tag lt
         JOIN label l ON lt.label_id = l.id
         JOIN entry_type et ON l.entry_type_id = et.id
         JOIN tag t ON lt.tag_id = t.id
         WHERE et.name = 'Food' AND l.name = 'Peanuts' AND t.name = 'peanuts'`
      )
      .get();
    expect(assoc).toBeDefined();
  });

  test('label_tag: Hazelnuts → tree_nuts association exists', () => {
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

  test('label_tag: Peanuts not tagged tree_nuts', () => {
    const assoc = db
      .prepare(
        `SELECT 1 FROM label_tag lt
         JOIN label l ON lt.label_id = l.id
         JOIN entry_type et ON l.entry_type_id = et.id
         JOIN tag t ON lt.tag_id = t.id
         WHERE et.name = 'Food' AND l.name = 'Peanuts' AND t.name = 'tree_nuts'`
      )
      .get();
    expect(assoc).toBeUndefined();
  });

  test('label_tag: 7 tree nut labels tagged tree_nuts', () => {
    const { count } = db
      .prepare(
        `SELECT COUNT(*) as count FROM label_tag lt
         JOIN label l ON lt.label_id = l.id
         JOIN entry_type et ON l.entry_type_id = et.id
         JOIN tag t ON lt.tag_id = t.id
         WHERE et.name = 'Food' AND t.name = 'tree_nuts'`
      )
      .get() as { count: number };
    expect(count).toBe(7);
  });

  test('label_tag: Onion → fodmap association exists', () => {
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

  test('label_tag: Walk → cardiovascular association exists', () => {
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

  test('label_tag: Breathe category labels all tagged mindfulness', () => {
    const { count } = db
      .prepare(
        `SELECT COUNT(*) as count FROM label_tag lt
         JOIN label l ON lt.label_id = l.id
         JOIN entry_type et ON l.entry_type_id = et.id
         JOIN category c ON l.category_id = c.id
         JOIN tag t ON lt.tag_id = t.id
         WHERE et.name = 'Activity' AND c.name = 'Breathe' AND t.name = 'mindfulness'`
      )
      .get() as { count: number };
    expect(count).toBe(5);
  });

  // ---- idempotency ----

  test('idempotency: running all migrations twice produces no duplicates', () => {
    const countBefore = {
      measurement_type: (db.prepare('SELECT COUNT(*) as c FROM measurement_type').get() as { c: number }).c,
      entry_type: (db.prepare('SELECT COUNT(*) as c FROM entry_type').get() as { c: number }).c,
      category: (db.prepare('SELECT COUNT(*) as c FROM category').get() as { c: number }).c,
      tag: (db.prepare('SELECT COUNT(*) as c FROM tag').get() as { c: number }).c,
      label: (db.prepare('SELECT COUNT(*) as c FROM label').get() as { c: number }).c,
      label_tag: (db.prepare('SELECT COUNT(*) as c FROM label_tag').get() as { c: number }).c,
    };

    applyAllMigrations(db);

    expect((db.prepare('SELECT COUNT(*) as c FROM measurement_type').get() as { c: number }).c).toBe(countBefore.measurement_type);
    expect((db.prepare('SELECT COUNT(*) as c FROM entry_type').get() as { c: number }).c).toBe(countBefore.entry_type);
    expect((db.prepare('SELECT COUNT(*) as c FROM category').get() as { c: number }).c).toBe(countBefore.category);
    expect((db.prepare('SELECT COUNT(*) as c FROM tag').get() as { c: number }).c).toBe(countBefore.tag);
    expect((db.prepare('SELECT COUNT(*) as c FROM label').get() as { c: number }).c).toBe(countBefore.label);
    expect((db.prepare('SELECT COUNT(*) as c FROM label_tag').get() as { c: number }).c).toBe(countBefore.label_tag);
  });
});
