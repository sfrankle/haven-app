/**
 * Routine schema integrity tests — validates that the v9 migration creates the
 * routine, routine_entry_type, routine_entry_type_label, routine_time_block,
 * and routine_completion tables with correct columns and FK behaviour, and
 * that the two new nullable columns on entry are present.
 */
import Database from 'better-sqlite3';
import { openTestDb, applyAllMigrations } from '../../lib/db/test-helpers';

const TEST_TS = '2026-05-22T10:00:00.000Z';

const EXPECTED_ROUTINE_SCHEMA: Record<string, string[]> = {
  routine: ['id', 'name', 'associated_focus_id', 'frequency_note', 'sort_order', 'archived', 'created_at', 'updated_at'],
  routine_entry_type: ['id', 'routine_id', 'name', 'entry_type_id', 'prescribed_detail', 'instruction_note', 'sort_order', 'created_at', 'updated_at'],
  routine_entry_type_label: ['routine_entry_type_id', 'label_id'],
  routine_time_block: ['routine_id', 'time_block'],
  routine_completion: ['id', 'routine_id', 'created_at'],
};

let db: Database.Database;
let seedEntryTypeId: number;
let seedLabelId: number;

beforeAll(() => {
  db = openTestDb();
  applyAllMigrations(db);
  seedEntryTypeId = (db.prepare(`SELECT id FROM entry_type ORDER BY id LIMIT 1`).get() as { id: number }).id;
  seedLabelId = (db.prepare(`SELECT id FROM label ORDER BY id LIMIT 1`).get() as { id: number }).id;
});

afterAll(() => {
  db.close();
});

function insertTestEntry(overrides: { routineId?: number | null; routineCompletionId?: number | null } = {}): number {
  const result = db
    .prepare(
      `INSERT INTO entry (entry_type_id, source_type, timestamp, created_at, routine_id, routine_completion_id)
       VALUES (?, 'log', ?, ?, ?, ?)`
    )
    .run(
      seedEntryTypeId,
      TEST_TS,
      TEST_TS,
      overrides.routineId ?? null,
      overrides.routineCompletionId ?? null,
    );
  return result.lastInsertRowid as number;
}

function insertTestRoutine(name: string, associatedFocusId: number | null = null): number {
  const result = db
    .prepare(
      `INSERT INTO routine (name, associated_focus_id, sort_order, archived, created_at, updated_at)
       VALUES (?, ?, 0, 0, ?, ?)`
    )
    .run(name, associatedFocusId, TEST_TS, TEST_TS);
  return result.lastInsertRowid as number;
}

function insertTestRoutineEntryType(routineId: number, entryTypeId: number): number {
  const result = db
    .prepare(
      `INSERT INTO routine_entry_type (routine_id, name, entry_type_id, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?)`
    )
    .run(routineId, 'Test item', entryTypeId, TEST_TS, TEST_TS);
  return result.lastInsertRowid as number;
}

function insertTestFocus(name: string): number {
  const result = db
    .prepare(
      `INSERT INTO focus (name, archived, sort_order, created_at) VALUES (?, 0, 0, ?)`
    )
    .run(name, TEST_TS);
  return result.lastInsertRowid as number;
}

describe('routine schema integrity', () => {
  // ── Column shape tests ──────────────────────────────────────────────────

  test.each(Object.entries(EXPECTED_ROUTINE_SCHEMA))(
    'table %s has correct columns',
    (tableName, expectedCols) => {
      const rows = db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
      expect(rows.map((r) => r.name)).toEqual(expectedCols);
    }
  );

  test('entry table has routine_id column', () => {
    const rows = db.prepare(`PRAGMA table_info(entry)`).all() as { name: string }[];
    const colNames = rows.map((r) => r.name);
    expect(colNames).toContain('routine_id');
  });

  test('entry table has routine_completion_id column', () => {
    const rows = db.prepare(`PRAGMA table_info(entry)`).all() as { name: string }[];
    const colNames = rows.map((r) => r.name);
    expect(colNames).toContain('routine_completion_id');
  });

  // ── Existing entry data preserved (data safety) ─────────────────────────

  test('entry inserted without routine fields has null for both new columns', () => {
    const id = insertTestEntry();
    const row = db
      .prepare(`SELECT routine_id, routine_completion_id FROM entry WHERE id=?`)
      .get(id) as { routine_id: number | null; routine_completion_id: number | null };
    expect(row.routine_id).toBeNull();
    expect(row.routine_completion_id).toBeNull();
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

  // ── Indexes present ─────────────────────────────────────────────────────

  test('index on entry.routine_completion_id exists', () => {
    const rows = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name='idx_entry_routine_completion_id'`)
      .all() as { name: string }[];
    expect(rows).toHaveLength(1);
  });

  test('index on routine_completion.routine_id exists', () => {
    const rows = db
      .prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name='idx_routine_completion_routine_id'`)
      .all() as { name: string }[];
    expect(rows).toHaveLength(1);
  });

  // ── Routine CRUD ────────────────────────────────────────────────────────

  test('can insert a routine with null associated_focus_id and defaults apply', () => {
    const id = insertTestRoutine('Morning basics');
    const row = db
      .prepare(`SELECT name, associated_focus_id, archived, sort_order FROM routine WHERE id=?`)
      .get(id) as { name: string; associated_focus_id: number | null; archived: number; sort_order: number };
    expect(row.name).toBe('Morning basics');
    expect(row.associated_focus_id).toBeNull();
    expect(row.archived).toBe(0);
    expect(row.sort_order).toBe(0);
  });

  test('can insert a routine with a valid associated_focus_id', () => {
    const focusId = insertTestFocus('RoutineFocusValid');
    expect(() => insertTestRoutine('Focus routine', focusId)).not.toThrow();
  });

  test('inserting a routine with a nonexistent associated_focus_id throws (FK violation)', () => {
    expect(() => insertTestRoutine('Bad routine', 999999)).toThrow();
  });

  // ── routine_entry_type ──────────────────────────────────────────────────

  test('can insert a routine_entry_type with valid routine and entry_type', () => {
    const routineId = insertTestRoutine('REType valid');
    const ret = db
      .prepare(
        `INSERT INTO routine_entry_type (routine_id, name, entry_type_id, prescribed_detail, sort_order, created_at, updated_at)
         VALUES (?, 'My item', ?, NULL, 0, ?, ?)`
      )
      .run(routineId, seedEntryTypeId, TEST_TS, TEST_TS);
    const id = ret.lastInsertRowid as number;
    const row = db
      .prepare(`SELECT prescribed_detail FROM routine_entry_type WHERE id=?`)
      .get(id) as { prescribed_detail: string | null };
    expect(row.prescribed_detail).toBeNull();
  });

  test('inserting a routine_entry_type with invalid entry_type_id throws (FK violation)', () => {
    const routineId = insertTestRoutine('REType invalid et');
    expect(() =>
      db
        .prepare(
          `INSERT INTO routine_entry_type (routine_id, name, entry_type_id, sort_order, created_at, updated_at)
           VALUES (?, 'Bad item', 999999, 0, ?, ?)`
        )
        .run(routineId, TEST_TS, TEST_TS)
    ).toThrow();
  });

  // ── routine_entry_type_label ────────────────────────────────────────────

  test('can insert a routine_entry_type_label with valid ids', () => {
    const routineId = insertTestRoutine('RELabel valid');
    const retId = insertTestRoutineEntryType(routineId, seedEntryTypeId);
    expect(() =>
      db
        .prepare(`INSERT INTO routine_entry_type_label (routine_entry_type_id, label_id) VALUES (?, ?)`)
        .run(retId, seedLabelId)
    ).not.toThrow();
  });

  test('inserting a routine_entry_type_label with invalid label_id throws (FK violation)', () => {
    const routineId = insertTestRoutine('RELabel bad label');
    const retId = insertTestRoutineEntryType(routineId, seedEntryTypeId);
    expect(() =>
      db
        .prepare(`INSERT INTO routine_entry_type_label (routine_entry_type_id, label_id) VALUES (?, ?)`)
        .run(retId, 999999)
    ).toThrow();
  });

  test('duplicate routine_entry_type_label composite PK is rejected', () => {
    const routineId = insertTestRoutine('RELabel dupPK');
    const retId = insertTestRoutineEntryType(routineId, seedEntryTypeId);
    db.prepare(`INSERT INTO routine_entry_type_label (routine_entry_type_id, label_id) VALUES (?, ?)`).run(retId, seedLabelId);
    expect(() =>
      db
        .prepare(`INSERT INTO routine_entry_type_label (routine_entry_type_id, label_id) VALUES (?, ?)`)
        .run(retId, seedLabelId)
    ).toThrow();
  });

  // ── routine_time_block ──────────────────────────────────────────────────

  test('can insert a valid time block', () => {
    const routineId = insertTestRoutine('TB Morning');
    expect(() =>
      db
        .prepare(`INSERT INTO routine_time_block (routine_id, time_block) VALUES (?, ?)`)
        .run(routineId, 'Morning')
    ).not.toThrow();
  });

  test('inserting an invalid time_block value throws (CHECK constraint)', () => {
    const routineId = insertTestRoutine('TB invalid');
    expect(() =>
      db
        .prepare(`INSERT INTO routine_time_block (routine_id, time_block) VALUES (?, ?)`)
        .run(routineId, 'Dawn')
    ).toThrow();
  });

  test('all four valid time_block values can be inserted for one routine', () => {
    const routineId = insertTestRoutine('TB all four');
    const values = ['Morning', 'Midday', 'Afternoon', 'Evening'];
    for (const tb of values) {
      db.prepare(`INSERT INTO routine_time_block (routine_id, time_block) VALUES (?, ?)`).run(routineId, tb);
    }
    const count = (
      db
        .prepare(`SELECT COUNT(*) as cnt FROM routine_time_block WHERE routine_id=?`)
        .get(routineId) as { cnt: number }
    ).cnt;
    expect(count).toBe(4);
  });

  test('duplicate routine_time_block composite PK is rejected', () => {
    const routineId = insertTestRoutine('TB dupPK');
    db.prepare(`INSERT INTO routine_time_block (routine_id, time_block) VALUES (?, 'Evening')`).run(routineId);
    expect(() =>
      db
        .prepare(`INSERT INTO routine_time_block (routine_id, time_block) VALUES (?, 'Evening')`)
        .run(routineId)
    ).toThrow();
  });

  // ── routine_completion ──────────────────────────────────────────────────

  test('can link two entries to a routine_completion row', () => {
    const routineId = insertTestRoutine('Completion link');
    const completionResult = db
      .prepare(`INSERT INTO routine_completion (routine_id, created_at) VALUES (?, ?)`)
      .run(routineId, TEST_TS);
    const completionId = completionResult.lastInsertRowid as number;

    const entryId1 = insertTestEntry({ routineId, routineCompletionId: completionId });
    const entryId2 = insertTestEntry({ routineId, routineCompletionId: completionId });

    for (const eid of [entryId1, entryId2]) {
      const row = db
        .prepare(`SELECT routine_id, routine_completion_id FROM entry WHERE id=?`)
        .get(eid) as { routine_id: number; routine_completion_id: number };
      expect(row.routine_id).toBe(routineId);
      expect(row.routine_completion_id).toBe(completionId);
    }
  });

  // ── FK cascade: routine deleted ─────────────────────────────────────────

  test('deleting a routine cascades to routine_completion and sets entry FK columns to null', () => {
    const routineId = insertTestRoutine('Cascade delete routine');
    const completionResult = db
      .prepare(`INSERT INTO routine_completion (routine_id, created_at) VALUES (?, ?)`)
      .run(routineId, TEST_TS);
    const completionId = completionResult.lastInsertRowid as number;
    const entryId1 = insertTestEntry({ routineId, routineCompletionId: completionId });
    const entryId2 = insertTestEntry({ routineId, routineCompletionId: completionId });

    db.prepare(`DELETE FROM routine WHERE id=?`).run(routineId);

    const completionCount = (
      db
        .prepare(`SELECT COUNT(*) as cnt FROM routine_completion WHERE id=?`)
        .get(completionId) as { cnt: number }
    ).cnt;
    expect(completionCount).toBe(0);

    for (const eid of [entryId1, entryId2]) {
      const row = db
        .prepare(`SELECT routine_id, routine_completion_id FROM entry WHERE id=?`)
        .get(eid) as { routine_id: number | null; routine_completion_id: number | null };
      expect(row).toBeDefined();
      expect(row.routine_id).toBeNull();
      expect(row.routine_completion_id).toBeNull();
    }
  });

  // ── FK cascade: completion deleted without deleting routine ────────────

  test('deleting a routine_completion sets entry.routine_completion_id to null but routine survives', () => {
    const routineId = insertTestRoutine('Completion only delete');
    const completionResult = db
      .prepare(`INSERT INTO routine_completion (routine_id, created_at) VALUES (?, ?)`)
      .run(routineId, TEST_TS);
    const completionId = completionResult.lastInsertRowid as number;
    const entryId = insertTestEntry({ routineId, routineCompletionId: completionId });

    db.prepare(`DELETE FROM routine_completion WHERE id=?`).run(completionId);

    const entryRow = db
      .prepare(`SELECT routine_id, routine_completion_id FROM entry WHERE id=?`)
      .get(entryId) as { routine_id: number | null; routine_completion_id: number | null };
    expect(entryRow.routine_completion_id).toBeNull();

    const routineStillExists = db
      .prepare(`SELECT id FROM routine WHERE id=?`)
      .get(routineId) as { id: number } | undefined;
    expect(routineStillExists).toBeDefined();
  });

  // ── ON DELETE RESTRICT: entry_type deletion blocked ─────────────────────

  test('deleting an entry_type referenced by routine_entry_type throws (RESTRICT)', () => {
    // Insert a fresh entry_type so we can safely try to delete it
    const etResult = db
      .prepare(
        `INSERT INTO entry_type (name, title, is_enabled, is_default, sort_order) VALUES ('TestETRestrict', 'TestETRestrict', 1, 0, 99)`
      )
      .run();
    const freshEtId = etResult.lastInsertRowid as number;
    const routineId = insertTestRoutine('RESTRICT entry_type');
    insertTestRoutineEntryType(routineId, freshEtId);

    expect(() =>
      db.prepare(`DELETE FROM entry_type WHERE id=?`).run(freshEtId)
    ).toThrow();
  });

  // ── ON DELETE RESTRICT: label deletion blocked ──────────────────────────

  test('deleting a label referenced by routine_entry_type_label throws (RESTRICT)', () => {
    // Insert a fresh label so we can safely try to delete it
    const labelResult = db
      .prepare(
        `INSERT INTO label (entry_type_id, name, is_default, is_enabled, sort_order, seed_version) VALUES (?, 'TestLabelRestrict', 0, 1, 99, 1)`
      )
      .run(seedEntryTypeId);
    const freshLabelId = labelResult.lastInsertRowid as number;
    const routineId = insertTestRoutine('RESTRICT label');
    const retId = insertTestRoutineEntryType(routineId, seedEntryTypeId);
    db.prepare(`INSERT INTO routine_entry_type_label (routine_entry_type_id, label_id) VALUES (?, ?)`).run(retId, freshLabelId);

    expect(() =>
      db.prepare(`DELETE FROM label WHERE id=?`).run(freshLabelId)
    ).toThrow();
  });

  // ── Focus association: focus deleted sets routine column to NULL ─────────

  test('deleting a focus sets routine.associated_focus_id to null', () => {
    const focusId = insertTestFocus('FocusForRoutine');
    const routineId = insertTestRoutine('Routine with focus', focusId);

    db.prepare(`DELETE FROM focus WHERE id=?`).run(focusId);

    const row = db
      .prepare(`SELECT associated_focus_id FROM routine WHERE id=?`)
      .get(routineId) as { associated_focus_id: number | null };
    expect(row.associated_focus_id).toBeNull();
  });
});
