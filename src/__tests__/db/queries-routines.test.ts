/**
 * Query layer tests — Routine query functions in src/lib/db/queries.ts.
 *
 * Uses better-sqlite3 + BetterSqliteAdapter to run query functions in
 * Jest/Node without an Expo device or the expo-sqlite native module.
 */
import type Database from 'better-sqlite3';
import { applyAllMigrations, openTestDb, entryTypeId } from '../../lib/db/test-helpers';
import { createAdapter, type AdaptedDb } from './adapter';
import {
  getRoutines,
  createRoutine,
  updateRoutine,
  setRoutineArchived,
  getRoutineItems,
  getRoutineCompletionState,
  createRoutineItems,
  replaceRoutineItems,
} from '../../lib/db/queries';
import type { RoutineItemInput } from '../../lib/db/query-types';

const TEST_TODAY = '2026-05-22';

// ─── suite setup ─────────────────────────────────────────────────────────────

describe('routine query layer', () => {
  let raw: Database.Database;
  let db: AdaptedDb;

  beforeAll(() => {
    raw = openTestDb();
    applyAllMigrations(raw);
    db = createAdapter(raw);
  });

  afterAll(() => {
    raw.close();
  });

  // ── getRoutines ─────────────────────────────────────────────────────────────

  describe('getRoutines', () => {
    test('returns empty array when no routines exist', async () => {
      const routines = await getRoutines(db);
      expect(routines).toEqual([]);
    });

    test('returns active routines ordered by sort_order', async () => {
      const now = `${TEST_TODAY}T09:00:00-07:00`;
      raw
        .prepare(
          `INSERT INTO routine (name, sort_order, archived, created_at, updated_at) VALUES (?, ?, 0, ?, ?)`
        )
        .run('Routine C', 30, now, now);
      raw
        .prepare(
          `INSERT INTO routine (name, sort_order, archived, created_at, updated_at) VALUES (?, ?, 0, ?, ?)`
        )
        .run('Routine A', 10, now, now);
      raw
        .prepare(
          `INSERT INTO routine (name, sort_order, archived, created_at, updated_at) VALUES (?, ?, 0, ?, ?)`
        )
        .run('Routine B', 20, now, now);

      const routines = await getRoutines(db);
      expect(routines.map((r) => r.name)).toEqual(['Routine A', 'Routine B', 'Routine C']);

      raw
        .prepare(`DELETE FROM routine WHERE name IN ('Routine A', 'Routine B', 'Routine C')`)
        .run();
    });

    test('each routine.timeBlocks is populated correctly (Morning + Evening)', async () => {
      const now = `${TEST_TODAY}T09:00:00-07:00`;
      const result = raw
        .prepare(
          `INSERT INTO routine (name, sort_order, archived, created_at, updated_at) VALUES (?, 0, 0, ?, ?)`
        )
        .run('Timed Routine', now, now);
      const routineId = Number(result.lastInsertRowid);

      raw
        .prepare(`INSERT INTO routine_time_block (routine_id, time_block) VALUES (?, ?)`)
        .run(routineId, 'Morning');
      raw
        .prepare(`INSERT INTO routine_time_block (routine_id, time_block) VALUES (?, ?)`)
        .run(routineId, 'Evening');

      const routines = await getRoutines(db);
      const found = routines.find((r) => r.id === routineId);
      expect(found).toBeDefined();
      expect(found!.timeBlocks).toHaveLength(2);
      expect(found!.timeBlocks).toContain('Morning');
      expect(found!.timeBlocks).toContain('Evening');

      raw.prepare(`DELETE FROM routine WHERE id = ?`).run(routineId);
    });

    test('excludes archived routines by default', async () => {
      const now = `${TEST_TODAY}T09:00:00-07:00`;
      raw
        .prepare(
          `INSERT INTO routine (name, sort_order, archived, created_at, updated_at) VALUES (?, 0, 1, ?, ?)`
        )
        .run('Archived Routine', now, now);

      const routines = await getRoutines(db);
      expect(routines.find((r) => r.name === 'Archived Routine')).toBeUndefined();

      raw.prepare(`DELETE FROM routine WHERE name = 'Archived Routine'`).run();
    });

    test('includes archived routines when includeArchived: true', async () => {
      const now = `${TEST_TODAY}T09:00:00-07:00`;
      raw
        .prepare(
          `INSERT INTO routine (name, sort_order, archived, created_at, updated_at) VALUES (?, 0, 1, ?, ?)`
        )
        .run('Archived Routine 2', now, now);

      const routines = await getRoutines(db, { includeArchived: true });
      expect(routines.find((r) => r.name === 'Archived Routine 2')).toBeDefined();

      raw.prepare(`DELETE FROM routine WHERE name = 'Archived Routine 2'`).run();
    });
  });

  // ── createRoutine ────────────────────────────────────────────────────────────

  describe('createRoutine', () => {
    test('inserts routine with no time blocks — timeBlocks is []', async () => {
      const routine = await createRoutine(db, { name: 'Solo Routine' });
      expect(routine.name).toBe('Solo Routine');
      expect(routine.timeBlocks).toEqual([]);

      const rows = raw
        .prepare(`SELECT * FROM routine_time_block WHERE routine_id = ?`)
        .all(routine.id) as unknown[];
      expect(rows).toHaveLength(0);

      raw.prepare(`DELETE FROM routine WHERE id = ?`).run(routine.id);
    });

    test('inserts routine with two time blocks — routine_time_block has correct rows', async () => {
      const routine = await createRoutine(db, {
        name: 'Two Block Routine',
        timeBlocks: ['Morning', 'Evening'],
      });

      const rows = raw
        .prepare(`SELECT time_block FROM routine_time_block WHERE routine_id = ? ORDER BY time_block`)
        .all(routine.id) as { time_block: string }[];

      expect(rows).toHaveLength(2);
      expect(rows.map((r) => r.time_block)).toContain('Morning');
      expect(rows.map((r) => r.time_block)).toContain('Evening');

      raw.prepare(`DELETE FROM routine WHERE id = ?`).run(routine.id);
    });

    test('returns Routine with archived: false and correct timestamps', async () => {
      const routine = await createRoutine(db, { name: 'Return Routine' });
      expect(routine.id).toBeGreaterThan(0);
      expect(routine.archived).toBe(false);
      expect(routine.createdAt).toBeDefined();
      expect(routine.updatedAt).toBeDefined();
      expect(routine.sortOrder).toBe(0);

      raw.prepare(`DELETE FROM routine WHERE id = ?`).run(routine.id);
    });
  });

  // ── updateRoutine ─────────────────────────────────────────────────────────────

  describe('updateRoutine', () => {
    test('renames a routine — name changes, updated_at is set', async () => {
      const routine = await createRoutine(db, { name: 'Old Routine Name' });

      await updateRoutine(db, routine.id, { name: 'New Routine Name' });

      const all = await getRoutines(db, { includeArchived: true });
      const found = all.find((r) => r.id === routine.id);
      expect(found?.name).toBe('New Routine Name');
      // updated_at is set to a valid ISO timestamp after the update
      expect(found?.updatedAt).toBeDefined();
      expect(found?.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

      raw.prepare(`DELETE FROM routine WHERE id = ?`).run(routine.id);
    });

    test('replaces timeBlocks — old rows gone, new rows inserted', async () => {
      const routine = await createRoutine(db, {
        name: 'Replace Blocks',
        timeBlocks: ['Morning'],
      });

      await updateRoutine(db, routine.id, { timeBlocks: ['Afternoon', 'Evening'] });

      const rows = raw
        .prepare(`SELECT time_block FROM routine_time_block WHERE routine_id = ? ORDER BY time_block`)
        .all(routine.id) as { time_block: string }[];

      expect(rows.map((r) => r.time_block)).toEqual(['Afternoon', 'Evening']);

      raw.prepare(`DELETE FROM routine WHERE id = ?`).run(routine.id);
    });

    test('empty timeBlocks removes all time blocks (not no-op)', async () => {
      const routine = await createRoutine(db, {
        name: 'Remove All Blocks',
        timeBlocks: ['Morning'],
      });

      await updateRoutine(db, routine.id, { timeBlocks: [] });

      const rows = raw
        .prepare(`SELECT time_block FROM routine_time_block WHERE routine_id = ?`)
        .all(routine.id) as unknown[];

      expect(rows).toHaveLength(0);

      raw.prepare(`DELETE FROM routine WHERE id = ?`).run(routine.id);
    });

    test('no-op when patch is empty — no error', async () => {
      const routine = await createRoutine(db, { name: 'No Op Routine' });
      await expect(updateRoutine(db, routine.id, {})).resolves.not.toThrow();
      raw.prepare(`DELETE FROM routine WHERE id = ?`).run(routine.id);
    });

    test('clears associatedFocusId by passing null', async () => {
      // First create a focus to associate
      const focusResult = raw
        .prepare(`INSERT INTO focus (name, archived, sort_order, created_at) VALUES ('Test Focus', 0, 0, ?)`)
        .run(`${TEST_TODAY}T09:00:00-07:00`);
      const focusId = Number(focusResult.lastInsertRowid);

      const routine = await createRoutine(db, {
        name: 'Focus Routine',
        associatedFocusId: focusId,
      });

      expect(routine.associatedFocusId).toBe(focusId);

      await updateRoutine(db, routine.id, { associatedFocusId: null });

      const all = await getRoutines(db, { includeArchived: true });
      const found = all.find((r) => r.id === routine.id);
      expect(found?.associatedFocusId).toBeNull();

      raw.prepare(`DELETE FROM routine WHERE id = ?`).run(routine.id);
      raw.prepare(`DELETE FROM focus WHERE id = ?`).run(focusId);
    });
  });

  // ── setRoutineArchived ───────────────────────────────────────────────────────

  describe('setRoutineArchived', () => {
    test('archives a routine', async () => {
      const routine = await createRoutine(db, { name: 'To Archive' });
      await setRoutineArchived(db, routine.id, true);

      const all = await getRoutines(db, { includeArchived: true });
      const found = all.find((r) => r.id === routine.id);
      expect(found?.archived).toBe(true);

      raw.prepare(`DELETE FROM routine WHERE id = ?`).run(routine.id);
    });

    test('unarchives a routine', async () => {
      const routine = await createRoutine(db, { name: 'To Unarchive' });
      await setRoutineArchived(db, routine.id, true);
      await setRoutineArchived(db, routine.id, false);

      const all = await getRoutines(db, { includeArchived: true });
      const found = all.find((r) => r.id === routine.id);
      expect(found?.archived).toBe(false);

      raw.prepare(`DELETE FROM routine WHERE id = ?`).run(routine.id);
    });
  });

  // ── getRoutineItems ──────────────────────────────────────────────────────────

  describe('getRoutineItems', () => {
    test('returns empty array for a routine with no items', async () => {
      const routine = await createRoutine(db, { name: 'Empty Items Routine' });
      const items = await getRoutineItems(db, routine.id);
      expect(items).toEqual([]);
      raw.prepare(`DELETE FROM routine WHERE id = ?`).run(routine.id);
    });

    test('returns items in sort_order order', async () => {
      const routine = await createRoutine(db, { name: 'Ordered Items Routine' });
      const now = `${TEST_TODAY}T09:00:00-07:00`;
      const foodId = entryTypeId(raw, 'Food');

      raw
        .prepare(
          `INSERT INTO routine_entry_type (routine_id, name, entry_type_id, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(routine.id, 'Item B', foodId, 20, now, now);
      raw
        .prepare(
          `INSERT INTO routine_entry_type (routine_id, name, entry_type_id, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(routine.id, 'Item A', foodId, 10, now, now);

      const items = await getRoutineItems(db, routine.id);
      expect(items.map((i) => i.name)).toEqual(['Item A', 'Item B']);

      raw.prepare(`DELETE FROM routine WHERE id = ?`).run(routine.id);
    });

    test('labelIds is [] when no routine_entry_type_label rows', async () => {
      const routine = await createRoutine(db, { name: 'No Label Items Routine' });
      const now = `${TEST_TODAY}T09:00:00-07:00`;
      const foodId = entryTypeId(raw, 'Food');

      raw
        .prepare(
          `INSERT INTO routine_entry_type (routine_id, name, entry_type_id, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(routine.id, 'Unlabeled Item', foodId, 0, now, now);

      const items = await getRoutineItems(db, routine.id);
      expect(items).toHaveLength(1);
      expect(items[0].labelIds).toEqual([]);

      raw.prepare(`DELETE FROM routine WHERE id = ?`).run(routine.id);
    });

    test('labelIds contains correct label IDs when rows exist', async () => {
      const routine = await createRoutine(db, { name: 'Labeled Items Routine' });
      const now = `${TEST_TODAY}T09:00:00-07:00`;
      const foodId = entryTypeId(raw, 'Food');

      // Get two food label IDs
      const labelRows = raw
        .prepare(
          `SELECT l.id FROM label l
           JOIN entry_type et ON l.entry_type_id = et.id
           WHERE et.name = 'Food' AND l.is_enabled = 1
           LIMIT 2`
        )
        .all() as { id: number }[];
      expect(labelRows.length).toBeGreaterThanOrEqual(2);

      const itemResult = raw
        .prepare(
          `INSERT INTO routine_entry_type (routine_id, name, entry_type_id, sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
        .run(routine.id, 'Labeled Item', foodId, 0, now, now);
      const itemId = Number(itemResult.lastInsertRowid);

      raw
        .prepare(`INSERT INTO routine_entry_type_label (routine_entry_type_id, label_id) VALUES (?, ?)`)
        .run(itemId, labelRows[0].id);
      raw
        .prepare(`INSERT INTO routine_entry_type_label (routine_entry_type_id, label_id) VALUES (?, ?)`)
        .run(itemId, labelRows[1].id);

      const items = await getRoutineItems(db, routine.id);
      expect(items).toHaveLength(1);
      expect(items[0].labelIds).toHaveLength(2);
      expect(items[0].labelIds).toContain(labelRows[0].id);
      expect(items[0].labelIds).toContain(labelRows[1].id);

      raw.prepare(`DELETE FROM routine WHERE id = ?`).run(routine.id);
    });
  });

  // ── getRoutineCompletionState ────────────────────────────────────────────────
  //
  // Time-block windows (mirrors getTimeBlock in timestamp.ts):
  //   Morning:   05:00–11:59  → timeBlockWindow: [5, 12]
  //   Midday:    12:00–13:59  → timeBlockWindow: [12, 14]
  //   Afternoon: 14:00–17:59  → timeBlockWindow: [14, 18]
  //   Evening:   18:00–21:59  → timeBlockWindow: [18, 22]

  describe('getRoutineCompletionState', () => {
    // Helper: insert a routine with given time blocks and return its ID.
    function insertRoutineWithBlocks(blocks: string[]): number {
      const now = `${TEST_TODAY}T09:00:00-07:00`;
      const result = raw
        .prepare(
          `INSERT INTO routine (name, sort_order, archived, created_at, updated_at) VALUES (?, 0, 0, ?, ?)`
        )
        .run(`CompletionTest-${Date.now()}`, now, now);
      const id = Number(result.lastInsertRowid);
      for (const b of blocks) {
        raw
          .prepare(`INSERT INTO routine_time_block (routine_id, time_block) VALUES (?, ?)`)
          .run(id, b);
      }
      return id;
    }

    // Helper: insert a routine_completion row with a given created_at ISO string.
    function insertCompletion(routineId: number, createdAt: string): void {
      raw
        .prepare(`INSERT INTO routine_completion (routine_id, created_at) VALUES (?, ?)`)
        .run(routineId, createdAt);
    }

    afterEach(() => {
      // Clean up completion test routines
      raw.prepare(`DELETE FROM routine WHERE name LIKE 'CompletionTest-%'`).run();
    });

    test('returns due when no completions today', async () => {
      const id = insertRoutineWithBlocks(['Morning', 'Afternoon']);
      const state = await getRoutineCompletionState(db, id, 'Morning', TEST_TODAY);
      expect(state).toBe('due');
    });

    test('completed at 08:55, checked at 11:55 (still morning) — completed_this_block', async () => {
      const id = insertRoutineWithBlocks(['Morning', 'Afternoon']);
      insertCompletion(id, `${TEST_TODAY}T08:55:00-07:00`);
      const state = await getRoutineCompletionState(db, id, 'Morning', TEST_TODAY);
      expect(state).toBe('completed_this_block');
    });

    test('at 12:05 after one morning completion — Midday not yet done (due)', async () => {
      // Example 2 from issue #125 AC:
      // Completion at 08:55, now checking at 12:05 (Midday block).
      // The morning completion doesn't count for Midday → 'due'.
      const id = insertRoutineWithBlocks(['Morning', 'Afternoon']);
      insertCompletion(id, `${TEST_TODAY}T08:55:00-07:00`);
      const state = await getRoutineCompletionState(db, id, 'Midday', TEST_TODAY);
      expect(state).toBe('due');
    });

    test('two completions >= two configured blocks — fully_done', async () => {
      // Example 3 from issue #125 AC:
      // Routine has Morning + Afternoon. Two completions exist today.
      // Any check returns 'fully_done' because completionCount >= blockCount.
      const id = insertRoutineWithBlocks(['Morning', 'Afternoon']);
      insertCompletion(id, `${TEST_TODAY}T08:55:00-07:00`);
      // Second completion at 12:30 — falls in Midday window (not Afternoon)
      insertCompletion(id, `${TEST_TODAY}T12:30:00-07:00`);
      const state = await getRoutineCompletionState(db, id, 'Midday', TEST_TODAY);
      expect(state).toBe('fully_done');
    });

    test('one completion at 08:55, checked at 20:00 (Evening) — due', async () => {
      // Example 4 from issue #125 AC:
      // Routine has Morning + Afternoon. One completion at 08:55.
      // Evening block — only 1 of 2 blocks done, not in Evening window → 'due'.
      const id = insertRoutineWithBlocks(['Morning', 'Afternoon']);
      insertCompletion(id, `${TEST_TODAY}T08:55:00-07:00`);
      const state = await getRoutineCompletionState(db, id, 'Evening', TEST_TODAY);
      expect(state).toBe('due');
    });

    test('returns due when routine has no configured time blocks', async () => {
      const id = insertRoutineWithBlocks([]);
      const state = await getRoutineCompletionState(db, id, 'Morning', TEST_TODAY);
      // blockCount = 0 → fully_done check fails (0 > 0 is false) → 'due'
      expect(state).toBe('due');
    });

    test('completion exactly at block boundary 12:00:00 counts as Midday not Morning', async () => {
      const id = insertRoutineWithBlocks(['Morning', 'Midday']);
      insertCompletion(id, `${TEST_TODAY}T12:00:00-07:00`);
      // Should be 'completed_this_block' for Midday (hour = 12 → Midday window [12,14])
      const middayState = await getRoutineCompletionState(db, id, 'Midday', TEST_TODAY);
      expect(middayState).toBe('completed_this_block');
      // Should be 'due' for Morning (hour 12 is NOT in Morning window [5,12])
      const morningState = await getRoutineCompletionState(db, id, 'Morning', TEST_TODAY);
      expect(morningState).toBe('due');
    });
  });

  // ── createRoutineItems ──────────────────────────────────────────────────────

  describe('createRoutineItems', () => {
    let routineId: number;
    let foodTypeId: number;
    let activityTypeId: number;

    beforeEach(() => {
      const now = `${TEST_TODAY}T09:00:00-07:00`;
      const result = raw
        .prepare(
          `INSERT INTO routine (name, sort_order, archived, created_at, updated_at) VALUES (?, 0, 0, ?, ?)`
        )
        .run('ItemsTest', now, now);
      routineId = Number(result.lastInsertRowid);
      foodTypeId = entryTypeId(raw, 'Food');
      activityTypeId = entryTypeId(raw, 'Activity');
    });

    afterEach(() => {
      raw.prepare(`DELETE FROM routine WHERE name = 'ItemsTest'`).run();
    });

    test('inserts items with correct sort_order', async () => {
      const items: RoutineItemInput[] = [
        { name: 'Breakfast', entryTypeId: foodTypeId },
        { name: 'Morning walk', entryTypeId: activityTypeId },
      ];
      await createRoutineItems(db, routineId, items);

      const rows = raw
        .prepare(
          `SELECT name, sort_order FROM routine_entry_type WHERE routine_id = ? ORDER BY sort_order`
        )
        .all(routineId) as { name: string; sort_order: number }[];

      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({ name: 'Breakfast', sort_order: 0 });
      expect(rows[1]).toMatchObject({ name: 'Morning walk', sort_order: 1 });
    });

    test('inserts routine_entry_type_label rows for items with labels', async () => {
      const labelId = (
        raw
          .prepare(
            `SELECT l.id FROM label l
             JOIN entry_type et ON l.entry_type_id = et.id
             WHERE et.name = 'Food' AND l.is_enabled = 1
             LIMIT 1`
          )
          .get() as { id: number }
      ).id;

      const items: RoutineItemInput[] = [
        { name: 'Breakfast', entryTypeId: foodTypeId, labelIds: [labelId] },
      ];
      await createRoutineItems(db, routineId, items);

      const itemRow = raw
        .prepare(`SELECT id FROM routine_entry_type WHERE routine_id = ? LIMIT 1`)
        .get(routineId) as { id: number };

      const labelRows = raw
        .prepare(
          `SELECT label_id FROM routine_entry_type_label WHERE routine_entry_type_id = ?`
        )
        .all(itemRow.id) as { label_id: number }[];

      expect(labelRows).toHaveLength(1);
      expect(labelRows[0].label_id).toBe(labelId);
    });

    test('is a no-op when items array is empty', async () => {
      await createRoutineItems(db, routineId, []);
      const rows = raw
        .prepare(`SELECT id FROM routine_entry_type WHERE routine_id = ?`)
        .all(routineId);
      expect(rows).toHaveLength(0);
    });

    test('stores prescribed_detail and instruction_note', async () => {
      const items: RoutineItemInput[] = [
        {
          name: 'Breakfast',
          entryTypeId: foodTypeId,
          prescribedDetail: 'Oatmeal',
          instructionNote: 'No added sugar',
        },
      ];
      await createRoutineItems(db, routineId, items);

      const row = raw
        .prepare(
          `SELECT prescribed_detail, instruction_note FROM routine_entry_type WHERE routine_id = ?`
        )
        .get(routineId) as { prescribed_detail: string; instruction_note: string };

      expect(row.prescribed_detail).toBe('Oatmeal');
      expect(row.instruction_note).toBe('No added sugar');
    });

    test('rolls back transaction when a row insert fails (invalid FK)', async () => {
      const BAD_ENTRY_TYPE_ID = 99999;
      const items: RoutineItemInput[] = [
        { name: 'Valid item', entryTypeId: foodTypeId },
        { name: 'Bad item', entryTypeId: BAD_ENTRY_TYPE_ID }, // will fail FK
      ];

      await expect(createRoutineItems(db, routineId, items)).rejects.toThrow();

      const rows = raw
        .prepare(`SELECT id FROM routine_entry_type WHERE routine_id = ?`)
        .all(routineId);
      // Transaction rolled back — no rows should remain
      expect(rows).toHaveLength(0);
    });
  });

  // ── replaceRoutineItems ─────────────────────────────────────────────────────

  describe('replaceRoutineItems', () => {
    let routineId: number;
    let foodTypeId: number;
    let activityTypeId: number;

    beforeEach(() => {
      const now = `${TEST_TODAY}T09:00:00-07:00`;
      const result = raw
        .prepare(
          `INSERT INTO routine (name, sort_order, archived, created_at, updated_at) VALUES (?, 0, 0, ?, ?)`
        )
        .run('ReplaceTest', now, now);
      routineId = Number(result.lastInsertRowid);
      foodTypeId = entryTypeId(raw, 'Food');
      activityTypeId = entryTypeId(raw, 'Activity');
    });

    afterEach(() => {
      raw.prepare(`DELETE FROM routine WHERE name = 'ReplaceTest'`).run();
    });

    test('clears all prior items and inserts the new set', async () => {
      // Insert initial items
      await createRoutineItems(db, routineId, [
        { name: 'Old item 1', entryTypeId: foodTypeId },
        { name: 'Old item 2', entryTypeId: activityTypeId },
      ]);

      // Replace with a single new item
      await replaceRoutineItems(db, routineId, [
        { name: 'New item', entryTypeId: activityTypeId },
      ]);

      const rows = raw
        .prepare(
          `SELECT name FROM routine_entry_type WHERE routine_id = ? ORDER BY sort_order`
        )
        .all(routineId) as { name: string }[];

      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('New item');
    });

    test('cascade-deletes routine_entry_type_label rows when prior items are cleared', async () => {
      const labelId = (
        raw
          .prepare(
            `SELECT l.id FROM label l
             JOIN entry_type et ON l.entry_type_id = et.id
             WHERE et.name = 'Food' AND l.is_enabled = 1
             LIMIT 1`
          )
          .get() as { id: number }
      ).id;

      await createRoutineItems(db, routineId, [
        { name: 'Breakfast', entryTypeId: foodTypeId, labelIds: [labelId] },
      ]);

      // Verify labels exist
      const beforeRows = raw
        .prepare(
          `SELECT retl.label_id FROM routine_entry_type_label retl
           JOIN routine_entry_type ret ON ret.id = retl.routine_entry_type_id
           WHERE ret.routine_id = ?`
        )
        .all(routineId);
      expect(beforeRows).toHaveLength(1);

      // Replace items — old label rows should be gone
      await replaceRoutineItems(db, routineId, [
        { name: 'Lunch', entryTypeId: foodTypeId },
      ]);

      const afterRows = raw
        .prepare(
          `SELECT retl.label_id FROM routine_entry_type_label retl
           JOIN routine_entry_type ret ON ret.id = retl.routine_entry_type_id
           WHERE ret.routine_id = ?`
        )
        .all(routineId);
      expect(afterRows).toHaveLength(0);
    });

    test('sort_order is correct on the new set', async () => {
      await replaceRoutineItems(db, routineId, [
        { name: 'Alpha', entryTypeId: foodTypeId },
        { name: 'Beta', entryTypeId: activityTypeId },
        { name: 'Gamma', entryTypeId: foodTypeId },
      ]);

      const rows = raw
        .prepare(
          `SELECT name, sort_order FROM routine_entry_type WHERE routine_id = ? ORDER BY sort_order`
        )
        .all(routineId) as { name: string; sort_order: number }[];

      expect(rows).toHaveLength(3);
      expect(rows[0]).toMatchObject({ name: 'Alpha', sort_order: 0 });
      expect(rows[1]).toMatchObject({ name: 'Beta', sort_order: 1 });
      expect(rows[2]).toMatchObject({ name: 'Gamma', sort_order: 2 });
    });

    test('handles empty replacement (clears all items)', async () => {
      await createRoutineItems(db, routineId, [
        { name: 'To remove', entryTypeId: foodTypeId },
      ]);

      await replaceRoutineItems(db, routineId, []);

      const rows = raw
        .prepare(`SELECT id FROM routine_entry_type WHERE routine_id = ?`)
        .all(routineId);
      expect(rows).toHaveLength(0);
    });

    test('rolls back when a new insert fails (invalid FK)', async () => {
      // Pre-populate items
      await createRoutineItems(db, routineId, [
        { name: 'Existing', entryTypeId: foodTypeId },
      ]);

      const BAD_ENTRY_TYPE_ID = 99999;
      await expect(
        replaceRoutineItems(db, routineId, [
          { name: 'Good item', entryTypeId: foodTypeId },
          { name: 'Bad item', entryTypeId: BAD_ENTRY_TYPE_ID },
        ])
      ).rejects.toThrow();

      // After rollback, original items should still be present
      const rows = raw
        .prepare(`SELECT name FROM routine_entry_type WHERE routine_id = ?`)
        .all(routineId) as { name: string }[];
      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('Existing');
    });
  });
});
