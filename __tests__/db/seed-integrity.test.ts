/**
 * Seed integrity test — validates that the seed SQL inserts the expected default
 * vocabulary into the database with correct data and parent-child relationships.
 *
 * Uses better-sqlite3 (Node-native, synchronous) so the test runs in Jest
 * without a device or expo-sqlite native module — same pattern as schema-integrity.test.ts.
 */
import Database from 'better-sqlite3';
import { MIGRATION_V1_SQL } from '../../lib/db/migrations';
import {
  SEED_V1_MEASUREMENT_TYPES,
  SEED_V1_ENTRY_TYPES,
  SEED_V1_CATEGORIES,
  SEED_V1_TAGS,
  SEED_V1_LABELS,
  SEED_V1_LABEL_TAGS,
} from '../../lib/db/seed-sql';

function applySeeds(db: Database.Database): void {
  db.exec(SEED_V1_MEASUREMENT_TYPES);
  db.exec(SEED_V1_ENTRY_TYPES);
  db.exec(SEED_V1_CATEGORIES);
  db.exec(SEED_V1_TAGS);
  db.exec(SEED_V1_LABELS);
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
      .prepare('SELECT name FROM measurement_type ORDER BY id')
      .all() as { name: string }[];
    expect(rows.map((r) => r.name)).toEqual([
      'numeric',
      'label_select',
      'label_select_severity',
    ]);
  });

  // ---- entry_type ----

  test('entry_type: count = 7', () => {
    const { count } = db
      .prepare('SELECT COUNT(*) as count FROM entry_type')
      .get() as { count: number };
    expect(count).toBe(7);
  });

  test('entry_type: Sleep uses measurement_type_id 1', () => {
    const row = db
      .prepare('SELECT measurement_type_id FROM entry_type WHERE name = ?')
      .get('Sleep') as { measurement_type_id: number };
    expect(row.measurement_type_id).toBe(1);
  });

  test('entry_type: Physical State uses measurement_type_id 3', () => {
    const row = db
      .prepare('SELECT measurement_type_id FROM entry_type WHERE name = ?')
      .get('Physical State') as { measurement_type_id: number };
    expect(row.measurement_type_id).toBe(3);
  });

  test('entry_type: all 7 names correct', () => {
    const rows = db
      .prepare('SELECT name FROM entry_type ORDER BY sort_order')
      .all() as { name: string }[];
    expect(rows.map((r) => r.name)).toEqual([
      'Sleep',
      'Hydration',
      'Food',
      'Emotion',
      'Physical State',
      'Energy Level',
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

  // ---- tag ----

  test('tag: count = 16', () => {
    const { count } = db
      .prepare('SELECT COUNT(*) as count FROM tag')
      .get() as { count: number };
    expect(count).toBe(16);
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

  // ---- label spot-checks ----

  test('label: emotion parent Pleasant exists with id 51', () => {
    const row = db
      .prepare('SELECT id, parent_id FROM label WHERE name = ? AND entry_type_id = 4')
      .get('Pleasant') as { id: number; parent_id: number | null } | undefined;
    expect(row).toBeDefined();
    expect(row!.id).toBe(51);
    expect(row!.parent_id).toBeNull();
  });

  test('label: emotion parent Neutral exists with id 52', () => {
    const row = db
      .prepare('SELECT id FROM label WHERE name = ? AND entry_type_id = 4')
      .get('Neutral') as { id: number } | undefined;
    expect(row?.id).toBe(52);
  });

  test('label: emotion parent Unpleasant exists with id 53', () => {
    const row = db
      .prepare('SELECT id FROM label WHERE name = ? AND entry_type_id = 4')
      .get('Unpleasant') as { id: number } | undefined;
    expect(row?.id).toBe(53);
  });

  test('label: Pleasant children have parent_id = 51', () => {
    const rows = db
      .prepare('SELECT name FROM label WHERE parent_id = 51')
      .all() as { name: string }[];
    expect(rows.length).toBe(10);
    const names = rows.map((r) => r.name);
    expect(names).toContain('Happy');
    expect(names).toContain('Calm');
    expect(names).toContain('Playful');
  });

  test('label: Unpleasant children have parent_id = 53', () => {
    const rows = db
      .prepare('SELECT name FROM label WHERE parent_id = 53')
      .all() as { name: string }[];
    expect(rows.length).toBe(12);
    const names = rows.map((r) => r.name);
    expect(names).toContain('Anxious');
    expect(names).toContain('Hopeless');
  });

  test('label: Food label Cheese exists (entry_type_id=3, no parent)', () => {
    const row = db
      .prepare(
        'SELECT entry_type_id, parent_id FROM label WHERE name = ?'
      )
      .get('Cheese') as { entry_type_id: number; parent_id: number | null } | undefined;
    expect(row).toBeDefined();
    expect(row!.entry_type_id).toBe(3);
    expect(row!.parent_id).toBeNull();
  });

  test('label: Activity label Walk exists with category_id = 1', () => {
    const row = db
      .prepare(
        'SELECT category_id FROM label WHERE name = ? AND entry_type_id = 7'
      )
      .get('Walk') as { category_id: number } | undefined;
    expect(row).toBeDefined();
    expect(row!.category_id).toBe(1);
  });

  test('label: Physical State parent Head exists with id 101', () => {
    const row = db
      .prepare('SELECT id, parent_id FROM label WHERE name = ? AND entry_type_id = 5')
      .get('Head') as { id: number; parent_id: number | null } | undefined;
    expect(row?.id).toBe(101);
    expect(row?.parent_id).toBeNull();
  });

  test('label: Physical State Headache has parent_id = 101', () => {
    const row = db
      .prepare('SELECT parent_id FROM label WHERE name = ? AND entry_type_id = 5')
      .get('Headache') as { parent_id: number } | undefined;
    expect(row?.parent_id).toBe(101);
  });

  // ---- label_tag spot-checks ----

  test('label_tag: Cheese → dairy association exists', () => {
    const cheeseRow = db
      .prepare('SELECT id FROM label WHERE name = ?')
      .get('Cheese') as { id: number };
    const dairyTag = db
      .prepare("SELECT id FROM tag WHERE name = 'dairy'")
      .get() as { id: number };
    const assoc = db
      .prepare(
        'SELECT 1 FROM label_tag WHERE label_id = ? AND tag_id = ?'
      )
      .get(cheeseRow.id, dairyTag.id);
    expect(assoc).toBeDefined();
  });

  test('label_tag: Coffee → caffeine association exists', () => {
    const coffeeRow = db
      .prepare('SELECT id FROM label WHERE name = ?')
      .get('Coffee') as { id: number };
    const caffeineTag = db
      .prepare("SELECT id FROM tag WHERE name = 'caffeine'")
      .get() as { id: number };
    const assoc = db
      .prepare(
        'SELECT 1 FROM label_tag WHERE label_id = ? AND tag_id = ?'
      )
      .get(coffeeRow.id, caffeineTag.id);
    expect(assoc).toBeDefined();
  });

  test('label_tag: Anxious → nervous_system association exists', () => {
    const anxiousRow = db
      .prepare('SELECT id FROM label WHERE name = ?')
      .get('Anxious') as { id: number };
    const nsTag = db
      .prepare("SELECT id FROM tag WHERE name = 'nervous_system'")
      .get() as { id: number };
    const assoc = db
      .prepare(
        'SELECT 1 FROM label_tag WHERE label_id = ? AND tag_id = ?'
      )
      .get(anxiousRow.id, nsTag.id);
    expect(assoc).toBeDefined();
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

    // Run seeds a second time
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
