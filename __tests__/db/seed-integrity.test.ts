/**
 * Seed integrity test — validates that the seed SQL inserts the expected default
 * vocabulary into the database with correct data and parent-child relationships.
 *
 * Uses better-sqlite3 (Node-native, synchronous) so the test runs in Jest
 * without a device or expo-sqlite native module — same pattern as schema-integrity.test.ts.
 *
 * No test asserts on specific integer IDs — all lookups use name-based queries.
 */
import Database from 'better-sqlite3';
import { MIGRATION_V1_SQL } from '../../lib/db/migrations';
import {
  SEED_V1_MEASUREMENT_TYPES,
  SEED_V1_CATEGORIES,
  SEED_V1_ENTRY_TYPES,
  SEED_V1_TAGS,
  SEED_V1_LABELS_FOOD,
  SEED_V1_LABELS_EMOTION_L1,
  SEED_V1_LABELS_EMOTION_L2,
  SEED_V1_LABELS_EMOTION_L3,
  SEED_V1_LABELS_PHYSICAL_PARENTS,
  SEED_V1_LABELS_PHYSICAL_CHILDREN,
  SEED_V1_LABELS_ACTIVITY,
  SEED_V1_LABEL_TAGS,
} from '../../lib/db/seed-sql';

function applySeeds(db: Database.Database): void {
  db.exec(SEED_V1_MEASUREMENT_TYPES);
  db.exec(SEED_V1_CATEGORIES);
  db.exec(SEED_V1_ENTRY_TYPES);
  db.exec(SEED_V1_TAGS);
  db.exec(SEED_V1_LABELS_FOOD);
  db.exec(SEED_V1_LABELS_EMOTION_L1);
  db.exec(SEED_V1_LABELS_EMOTION_L2);
  db.exec(SEED_V1_LABELS_EMOTION_L3);
  db.exec(SEED_V1_LABELS_PHYSICAL_PARENTS);
  db.exec(SEED_V1_LABELS_PHYSICAL_CHILDREN);
  db.exec(SEED_V1_LABELS_ACTIVITY);
  db.exec(SEED_V1_LABEL_TAGS);
}

describe('seed integrity', () => {
  let db: Database.Database;

  beforeAll(() => {
    db = new Database(':memory:');
    db.exec(MIGRATION_V1_SQL);
    applySeeds(db);
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

  test('entry_type: Physical State uses measurement_type label_select_severity', () => {
    const row = db
      .prepare(
        `SELECT mt.name as mt_name FROM entry_type et
         JOIN measurement_type mt ON et.measurement_type_id = mt.id
         WHERE et.name = 'Physical State'`
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
      'Physical State',
      'Activity',
    ]);
  });

  // ---- category ----

  test('category: count = 8', () => {
    const { count } = db
      .prepare('SELECT COUNT(*) as count FROM category')
      .get() as { count: number };
    expect(count).toBe(8);
  });

  test('category: expected names present', () => {
    const rows = db
      .prepare('SELECT name FROM category ORDER BY name')
      .all() as { name: string }[];
    expect(rows.map((r) => r.name).sort()).toEqual([
      'Breathe',
      'Connect',
      'Create',
      'Ground',
      'Move',
      'Nourish',
      'Reflect',
      'Structure',
    ]);
  });

  // ---- tag ----

  test('tag: count = 18', () => {
    const { count } = db
      .prepare('SELECT COUNT(*) as count FROM tag')
      .get() as { count: number };
    expect(count).toBe(18);
  });

  test('tag: food_sensitivity group has 8 tags', () => {
    const { count } = db
      .prepare(
        "SELECT COUNT(*) as count FROM tag WHERE tag_group = 'food_sensitivity'"
      )
      .get() as { count: number };
    expect(count).toBe(8);
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

  test('tag: allergy group has 2 tags', () => {
    const { count } = db
      .prepare(
        "SELECT COUNT(*) as count FROM tag WHERE tag_group = 'allergy'"
      )
      .get() as { count: number };
    expect(count).toBe(2);
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

  test('label: Food has 59 labels', () => {
    const { count } = db
      .prepare(
        `SELECT COUNT(*) as count FROM label l
         JOIN entry_type et ON l.entry_type_id = et.id
         WHERE et.name = 'Food'`
      )
      .get() as { count: number };
    expect(count).toBe(59);
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

  test('label: Sourdough not present', () => {
    const row = db
      .prepare(
        `SELECT 1 FROM label l JOIN entry_type et ON l.entry_type_id = et.id
         WHERE et.name = 'Food' AND l.name = 'Sourdough'`
      )
      .get();
    expect(row).toBeUndefined();
  });

  // ---- label: Physical State ----

  test('label: Physical State parent Head exists with no parent', () => {
    const row = db
      .prepare(
        `SELECT l.parent_id FROM label l
         JOIN entry_type et ON l.entry_type_id = et.id
         WHERE et.name = 'Physical State' AND l.name = 'Head'`
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
         WHERE et.name = 'Physical State' AND l.name = 'Headache'`
      )
      .get() as { parent_name: string } | undefined;
    expect(row?.parent_name).toBe('Head');
  });

  test('label: Physical State has 8 parent labels', () => {
    const { count } = db
      .prepare(
        `SELECT COUNT(*) as count FROM label l
         JOIN entry_type et ON l.entry_type_id = et.id
         WHERE et.name = 'Physical State' AND l.parent_id IS NULL`
      )
      .get() as { count: number };
    expect(count).toBe(8);
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

  test('idempotency: running seeds twice produces no duplicates', () => {
    const countBefore = {
      measurement_type: (
        db.prepare('SELECT COUNT(*) as c FROM measurement_type').get() as { c: number }
      ).c,
      entry_type: (
        db.prepare('SELECT COUNT(*) as c FROM entry_type').get() as { c: number }
      ).c,
      category: (
        db.prepare('SELECT COUNT(*) as c FROM category').get() as { c: number }
      ).c,
      tag: (db.prepare('SELECT COUNT(*) as c FROM tag').get() as { c: number }).c,
      label: (db.prepare('SELECT COUNT(*) as c FROM label').get() as { c: number }).c,
      label_tag: (
        db.prepare('SELECT COUNT(*) as c FROM label_tag').get() as { c: number }
      ).c,
    };

    applySeeds(db);

    expect(
      (db.prepare('SELECT COUNT(*) as c FROM measurement_type').get() as { c: number }).c
    ).toBe(countBefore.measurement_type);
    expect(
      (db.prepare('SELECT COUNT(*) as c FROM entry_type').get() as { c: number }).c
    ).toBe(countBefore.entry_type);
    expect(
      (db.prepare('SELECT COUNT(*) as c FROM category').get() as { c: number }).c
    ).toBe(countBefore.category);
    expect(
      (db.prepare('SELECT COUNT(*) as c FROM tag').get() as { c: number }).c
    ).toBe(countBefore.tag);
    expect(
      (db.prepare('SELECT COUNT(*) as c FROM label').get() as { c: number }).c
    ).toBe(countBefore.label);
    expect(
      (db.prepare('SELECT COUNT(*) as c FROM label_tag').get() as { c: number }).c
    ).toBe(countBefore.label_tag);
  });
});
