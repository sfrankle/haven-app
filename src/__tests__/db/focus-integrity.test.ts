/**
 * Focus schema integrity tests — validates that the v8 migration creates the
 * focus, focus_label, and entry_focus tables with correct columns and FK
 * cascade behaviour.
 */
import Database from 'better-sqlite3';
import { openTestDb, applyAllMigrations } from '../../lib/db/test-helpers';

const TEST_TS = '2026-04-10T00:00:00.000Z';

const EXPECTED_FOCUS_SCHEMA: Record<string, string[]> = {
  focus: ['id', 'name', 'description', 'archived', 'sort_order', 'created_at'],
  focus_label: ['focus_id', 'label_id', 'sort_order'],
  entry_focus: ['entry_id', 'focus_id'],
};

let db: Database.Database;
let seedLabelId: number;
let seedEntryTypeId: number;

beforeAll(() => {
  db = openTestDb();
  applyAllMigrations(db);
  seedLabelId = (db.prepare(`SELECT id FROM label ORDER BY id LIMIT 1`).get() as { id: number }).id;
  seedEntryTypeId = (db.prepare(`SELECT id FROM entry_type ORDER BY id LIMIT 1`).get() as { id: number }).id;
});

afterAll(() => {
  db.close();
});

function insertTestEntry(): number {
  const result = db
    .prepare(
      `INSERT INTO entry (entry_type_id, source_type, timestamp, created_at)
       VALUES (?, 'log', ?, ?)`
    )
    .run(seedEntryTypeId, TEST_TS, TEST_TS);
  return result.lastInsertRowid as number;
}

function insertTestFocus(name: string, sortOrder = 0): number {
  const result = db
    .prepare(
      `INSERT INTO focus (name, archived, sort_order, created_at) VALUES (?, 0, ?, ?)`
    )
    .run(name, sortOrder, TEST_TS);
  return result.lastInsertRowid as number;
}

describe('focus schema integrity', () => {
  test.each(Object.entries(EXPECTED_FOCUS_SCHEMA))(
    'table %s has correct columns',
    (tableName, expectedCols) => {
      const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
      expect(rows.map((r) => r.name)).toEqual(expectedCols);
    }
  );

  test('can insert a focus row and read it back', () => {
    const id = insertTestFocus('Digestion', 1);
    const row = db
      .prepare(`SELECT name, description, archived FROM focus WHERE id=?`)
      .get(id) as { name: string; description: string | null; archived: number };
    expect(row.name).toBe('Digestion');
    expect(row.description).toBeNull();
    expect(row.archived).toBe(0);
  });

  test('archived flag can be toggled and other data is preserved', () => {
    const id = db
      .prepare(
        `INSERT INTO focus (name, description, archived, sort_order, created_at)
         VALUES ('Energy', 'Track energy patterns', 0, 2, ?)`
      )
      .run(TEST_TS).lastInsertRowid as number;

    db.prepare(`UPDATE focus SET archived=1 WHERE id=?`).run(id);
    const after = db
      .prepare(`SELECT name, description, archived FROM focus WHERE id=?`)
      .get(id) as { name: string; description: string; archived: number };
    expect(after.archived).toBe(1);
    expect(after.name).toBe('Energy');
    expect(after.description).toBe('Track energy patterns');
  });

  test('focus_label insert with valid label_id succeeds', () => {
    const focusId = insertTestFocus('FocusLabelValid', 10);
    expect(() => {
      db.prepare(
        `INSERT INTO focus_label (focus_id, label_id, sort_order) VALUES (?, ?, 0)`
      ).run(focusId, seedLabelId);
    }).not.toThrow();
  });

  test('focus_label insert rejects invalid label_id (FK violation)', () => {
    const focusId = insertTestFocus('FocusLabelInvalid', 11);
    expect(() => {
      db.prepare(
        `INSERT INTO focus_label (focus_id, label_id, sort_order) VALUES (?, 999999, 0)`
      ).run(focusId);
    }).toThrow();
  });

  test('deleting a focus cascades to focus_label', () => {
    const focusId = insertTestFocus('CascadeTest1', 99);
    db.prepare(
      `INSERT INTO focus_label (focus_id, label_id, sort_order) VALUES (?, ?, 0)`
    ).run(focusId, seedLabelId);

    db.prepare(`DELETE FROM focus WHERE id=?`).run(focusId);

    const remaining = db
      .prepare(`SELECT COUNT(*) as cnt FROM focus_label WHERE focus_id=?`)
      .get(focusId) as { cnt: number };
    expect(remaining.cnt).toBe(0);
  });

  test('deleting a focus cascades to entry_focus but entry survives', () => {
    const entryId = insertTestEntry();
    const focusId = insertTestFocus('CascadeTest2', 98);
    db.prepare(`INSERT INTO entry_focus (entry_id, focus_id) VALUES (?, ?)`).run(entryId, focusId);

    db.prepare(`DELETE FROM focus WHERE id=?`).run(focusId);

    const efRows = db
      .prepare(`SELECT COUNT(*) as cnt FROM entry_focus WHERE focus_id=?`)
      .get(focusId) as { cnt: number };
    expect(efRows.cnt).toBe(0);

    const entryStillExists = db
      .prepare(`SELECT id FROM entry WHERE id=?`)
      .get(entryId) as { id: number } | undefined;
    expect(entryStillExists).toBeDefined();
  });

  test('deleting an entry cascades to entry_focus but focus survives', () => {
    const entryId = insertTestEntry();
    const focusId = insertTestFocus('SurvivingFocus', 97);
    db.prepare(`INSERT INTO entry_focus (entry_id, focus_id) VALUES (?, ?)`).run(entryId, focusId);

    db.prepare(`DELETE FROM entry WHERE id=?`).run(entryId);

    const efRows = db
      .prepare(`SELECT COUNT(*) as cnt FROM entry_focus WHERE entry_id=?`)
      .get(entryId) as { cnt: number };
    expect(efRows.cnt).toBe(0);

    const focusStillExists = db
      .prepare(`SELECT id FROM focus WHERE id=?`)
      .get(focusId) as { id: number } | undefined;
    expect(focusStillExists).toBeDefined();
  });

  test('duplicate focus name is rejected (UNIQUE constraint)', () => {
    insertTestFocus('UniqueName', 50);
    expect(() => insertTestFocus('UniqueName', 51)).toThrow();
  });

  test('duplicate entry_focus (entry_id, focus_id) pair is rejected (PK constraint)', () => {
    const entryId = insertTestEntry();
    const focusId = insertTestFocus('DupPKFocus', 60);
    db.prepare(`INSERT INTO entry_focus (entry_id, focus_id) VALUES (?, ?)`).run(entryId, focusId);
    expect(() => {
      db.prepare(`INSERT INTO entry_focus (entry_id, focus_id) VALUES (?, ?)`).run(entryId, focusId);
    }).toThrow();
  });

  test('existing entry_type and label seeded data is intact after migration', () => {
    const entryTypeCount = (
      db.prepare(`SELECT COUNT(*) as cnt FROM entry_type`).get() as { cnt: number }
    ).cnt;
    const labelCount = (
      db.prepare(`SELECT COUNT(*) as cnt FROM label`).get() as { cnt: number }
    ).cnt;
    expect(entryTypeCount).toBeGreaterThan(0);
    expect(labelCount).toBeGreaterThan(0);
  });
});
