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
  getRoutineDayProgress,
  createRoutineItems,
  replaceRoutineItems,
  completeRoutine,
  saveEntryBatch,
} from '../../lib/db/queries';
import { deriveRoutineCompletionState } from '../../lib/utils/routine-dashboard';
import type { RoutineItemInput, SaveEntryInput } from '../../lib/db/query-types';
import type { ScheduleableBlock } from '../../lib/utils/timestamp';

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

    test('inserts items atomically — routine and items created in one transaction', async () => {
      const foodId = entryTypeId(raw, 'Food');
      const items: RoutineItemInput[] = [
        { name: 'Breakfast', entryTypeId: foodId },
      ];

      const routine = await createRoutine(db, { name: 'Atomic Routine', items });

      const rows = raw
        .prepare(`SELECT name FROM routine_entry_type WHERE routine_id = ?`)
        .all(routine.id) as { name: string }[];

      expect(rows).toHaveLength(1);
      expect(rows[0].name).toBe('Breakfast');

      raw.prepare(`DELETE FROM routine WHERE id = ?`).run(routine.id);
    });

    test('rolls back routine row when items fail — no orphan left in DB', async () => {
      const invalidEntryTypeId = 999999; // does not exist → FK violation
      const items: RoutineItemInput[] = [
        { name: 'Bad Item', entryTypeId: invalidEntryTypeId },
      ];
      const countBefore = (
        raw.prepare(`SELECT COUNT(*) as c FROM routine`).get() as { c: number }
      ).c;

      await expect(
        createRoutine(db, { name: 'Orphan Routine', items })
      ).rejects.toThrow();

      const countAfter = (
        raw.prepare(`SELECT COUNT(*) as c FROM routine`).get() as { c: number }
      ).c;
      expect(countAfter).toBe(countBefore); // routine row was rolled back
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

  // ── completion state, end to end from the database ──────────────────────────
  //
  // The dashboard derives completion state from getRoutineDayProgress plus the
  // Routine's configured blocks (deriveRoutineCompletionState). These tests run
  // that whole pipeline against real routine_completion rows, so the pure
  // function stays verified against the database and not only against fixtures.
  //
  // Time-block windows (owned by getTimeBlock in timestamp.ts):
  //   Morning:   05:00–11:59  → [5, 12)
  //   Midday:    12:00–13:59  → [12, 14)
  //   Afternoon: 14:00–17:59  → [14, 18)
  //   Evening:   18:00–21:59  → [18, 22)

  describe('completion state, end to end from the database', () => {
    type TestRoutine = { id: number; blocks: ScheduleableBlock[] };

    // Helper: insert a routine with given time blocks. Returns the blocks
    // alongside the id so a caller states them once — restating the literal at
    // the completionState call site would let the two drift silently.
    function insertRoutineWithBlocks(blocks: ScheduleableBlock[]): TestRoutine {
      const now = `${TEST_TODAY}T09:00:00-07:00`;
      const result = raw
        .prepare(
          `INSERT INTO routine (name, sort_order, archived, created_at, updated_at) VALUES (?, 0, 0, ?, ?)`
        )
        .run(`CompletionTest-${Date.now()}-${Math.random()}`, now, now);
      const id = Number(result.lastInsertRowid);
      for (const b of blocks) {
        raw
          .prepare(`INSERT INTO routine_time_block (routine_id, time_block) VALUES (?, ?)`)
          .run(id, b);
      }
      return { id, blocks };
    }

    // Runs the real dashboard pipeline: one batched read, then derive.
    async function completionState(
      { id, blocks }: TestRoutine,
      currentBlock: ScheduleableBlock
    ) {
      const progress = await getRoutineDayProgress(db, [id], TEST_TODAY);
      return deriveRoutineCompletionState(progress[id], blocks, currentBlock);
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
      const routine = insertRoutineWithBlocks(['Morning', 'Afternoon']);
      const state = await completionState(routine, 'Morning');
      expect(state).toBe('due');
    });

    test('completed at 08:55, checked at 11:55 (still morning) — completed_this_block', async () => {
      const routine = insertRoutineWithBlocks(['Morning', 'Afternoon']);
      insertCompletion(routine.id, `${TEST_TODAY}T08:55:00-07:00`);
      const state = await completionState(routine, 'Morning');
      expect(state).toBe('completed_this_block');
    });

    test('the configured block count comes from getRoutines, matching routine_time_block', async () => {
      // The derivation replaced a SELECT COUNT(*) FROM routine_time_block with
      // Routine.timeBlocks.length. This is the test that keeps those two the
      // same thing: blocks are read back through getRoutines rather than
      // restated in the test body, so a divergence in how getRoutines collapses
      // routine_time_block rows would fail here.
      const { id } = insertRoutineWithBlocks(['Morning', 'Afternoon']);
      insertCompletion(id, `${TEST_TODAY}T08:55:00-07:00`);
      insertCompletion(id, `${TEST_TODAY}T15:10:00-07:00`);

      const routine = (await getRoutines(db)).find((r) => r.id === id)!;
      const { cnt } = raw
        .prepare(`SELECT COUNT(*) AS cnt FROM routine_time_block WHERE routine_id = ?`)
        .get(id) as { cnt: number };
      expect(routine.timeBlocks).toHaveLength(cnt);

      const state = await completionState({ id, blocks: routine.timeBlocks }, 'Evening');
      expect(state).toBe('fully_done');
    });

    test('at 12:05 after one morning completion — Midday not yet done (due)', async () => {
      // Example 2 from issue #125 AC:
      // Completion at 08:55, now checking at 12:05 (Midday block).
      // The morning completion doesn't count for Midday → 'due'.
      const routine = insertRoutineWithBlocks(['Morning', 'Afternoon']);
      insertCompletion(routine.id, `${TEST_TODAY}T08:55:00-07:00`);
      const state = await completionState(routine, 'Midday');
      expect(state).toBe('due');
    });

    test('two completions >= two configured blocks — fully_done', async () => {
      // Example 3 from issue #125 AC:
      // Routine has Morning + Afternoon. Two completions exist today.
      // Any check returns 'fully_done' because completionCount >= blockCount.
      const routine = insertRoutineWithBlocks(['Morning', 'Afternoon']);
      insertCompletion(routine.id, `${TEST_TODAY}T08:55:00-07:00`);
      // Second completion at 12:30 — falls in Midday window (not Afternoon)
      insertCompletion(routine.id, `${TEST_TODAY}T12:30:00-07:00`);
      const state = await completionState(routine, 'Midday');
      expect(state).toBe('fully_done');
    });

    test('three completions against two blocks — still fully_done, never due', async () => {
      // Pins the invariant that keeps an over-count off a due-now card: once
      // completions exceed the configured blocks the Routine is fully_done, so
      // an unclamped "3 of 2" can only ever appear inside the collapsed
      // disclosure, never on a card presented as something to do now.
      // Relaxing the >= in deriveRoutineCompletionState to > would break this
      // silently.
      const routine = insertRoutineWithBlocks(['Morning', 'Afternoon']);
      insertCompletion(routine.id, `${TEST_TODAY}T08:55:00-07:00`);
      insertCompletion(routine.id, `${TEST_TODAY}T12:30:00-07:00`);
      insertCompletion(routine.id, `${TEST_TODAY}T15:10:00-07:00`);
      const state = await completionState(routine, 'Evening');
      expect(state).toBe('fully_done');
    });

    test('one completion at 08:55, checked at 20:00 (Evening) — due', async () => {
      // Example 4 from issue #125 AC:
      // Routine has Morning + Afternoon. One completion at 08:55.
      // Evening block — only 1 of 2 blocks done, not in Evening window → 'due'.
      const routine = insertRoutineWithBlocks(['Morning', 'Afternoon']);
      insertCompletion(routine.id, `${TEST_TODAY}T08:55:00-07:00`);
      const state = await completionState(routine, 'Evening');
      expect(state).toBe('due');
    });

    test('returns due when routine has no configured time blocks', async () => {
      const routine = insertRoutineWithBlocks([]);
      const state = await completionState(routine, 'Morning');
      // No configured blocks → the fully_done check is skipped entirely → 'due'
      expect(state).toBe('due');
    });

    test('completion exactly at block boundary 12:00:00 counts as Midday not Morning', async () => {
      // Pins that getTimeBlock-derived completedBlocks put a 12:00 completion in
      // Midday, not Morning. Three blocks configured so the fully_done check
      // (1 >= 3) cannot mask the block comparison.
      const routine = insertRoutineWithBlocks(['Morning', 'Midday', 'Afternoon']);
      insertCompletion(routine.id, `${TEST_TODAY}T12:00:00-07:00`);
      // 'completed_this_block' for Midday (hour 12 → Midday window [12,14))
      expect(await completionState(routine, 'Midday')).toBe('completed_this_block');
      // 'due' for Morning (hour 12 is NOT in Morning window [5,12))
      expect(await completionState(routine, 'Morning')).toBe('due');
    });
  });

  // ── getRoutineDayProgress ───────────────────────────────────────────────────

  describe('getRoutineDayProgress', () => {
    function insertRoutine(): number {
      const now = `${TEST_TODAY}T09:00:00-07:00`;
      const result = raw
        .prepare(
          `INSERT INTO routine (name, sort_order, archived, created_at, updated_at) VALUES (?, 0, 0, ?, ?)`
        )
        .run(`ProgressTest-${Math.random()}`, now, now);
      return Number(result.lastInsertRowid);
    }

    function insertCompletion(routineId: number, createdAt: string): void {
      raw
        .prepare(`INSERT INTO routine_completion (routine_id, created_at) VALUES (?, ?)`)
        .run(routineId, createdAt);
    }

    afterEach(() => {
      raw.prepare(`DELETE FROM routine WHERE name LIKE 'ProgressTest-%'`).run();
    });

    test('returns an entry with zero progress for a routine with no completions', async () => {
      const id = insertRoutine();
      const progress = await getRoutineDayProgress(db, [id], TEST_TODAY);
      expect(progress[id]).toEqual({ completionCount: 0, completedBlocks: [] });
    });

    test('counts completions and reports the blocks they landed in', async () => {
      const id = insertRoutine();
      insertCompletion(id, `${TEST_TODAY}T07:00:00-07:00`);
      insertCompletion(id, `${TEST_TODAY}T15:00:00-07:00`);
      const progress = await getRoutineDayProgress(db, [id], TEST_TODAY);
      expect(progress[id]).toEqual({
        completionCount: 2,
        completedBlocks: ['Morning', 'Afternoon'],
      });
    });

    test('deduplicates blocks when two completions land in the same block', async () => {
      const id = insertRoutine();
      insertCompletion(id, `${TEST_TODAY}T06:00:00-07:00`);
      insertCompletion(id, `${TEST_TODAY}T09:30:00-07:00`);
      const progress = await getRoutineDayProgress(db, [id], TEST_TODAY);
      expect(progress[id]).toEqual({
        completionCount: 2,
        completedBlocks: ['Morning'],
      });
    });

    test('counts a Night completion but excludes Night from completedBlocks', async () => {
      const id = insertRoutine();
      insertCompletion(id, `${TEST_TODAY}T23:00:00-07:00`);
      const progress = await getRoutineDayProgress(db, [id], TEST_TODAY);
      expect(progress[id]).toEqual({ completionCount: 1, completedBlocks: [] });
    });

    test("excludes completions dated other than the requested day", async () => {
      const id = insertRoutine();
      insertCompletion(id, `2026-05-21T09:00:00-07:00`);
      const progress = await getRoutineDayProgress(db, [id], TEST_TODAY);
      expect(progress[id]).toEqual({ completionCount: 0, completedBlocks: [] });
    });

    test('reports each routine separately when several ids are requested', async () => {
      const a = insertRoutine();
      const b = insertRoutine();
      const c = insertRoutine();
      insertCompletion(a, `${TEST_TODAY}T07:00:00-07:00`);
      insertCompletion(b, `${TEST_TODAY}T13:00:00-07:00`);
      insertCompletion(b, `${TEST_TODAY}T19:00:00-07:00`);

      const progress = await getRoutineDayProgress(db, [a, b, c], TEST_TODAY);
      expect(progress[a]).toEqual({ completionCount: 1, completedBlocks: ['Morning'] });
      expect(progress[b]).toEqual({
        completionCount: 2,
        completedBlocks: ['Midday', 'Evening'],
      });
      expect(progress[c]).toEqual({ completionCount: 0, completedBlocks: [] });
    });

    test('returns an empty map for an empty id list', async () => {
      const progress = await getRoutineDayProgress(db, [], TEST_TODAY);
      expect(progress).toEqual({});
    });

    test('returns completedBlocks in canonical day order regardless of insertion order', async () => {
      const id = insertRoutine();
      insertCompletion(id, `${TEST_TODAY}T19:00:00-07:00`); // Evening
      insertCompletion(id, `${TEST_TODAY}T07:00:00-07:00`); // Morning
      insertCompletion(id, `${TEST_TODAY}T15:00:00-07:00`); // Afternoon
      insertCompletion(id, `${TEST_TODAY}T13:00:00-07:00`); // Midday
      const progress = await getRoutineDayProgress(db, [id], TEST_TODAY);
      expect(progress[id].completedBlocks).toEqual([
        'Morning',
        'Midday',
        'Afternoon',
        'Evening',
      ]);
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

  // ── saveEntryBatch (routine_id + routine_completion_id columns) ─────────────

  describe('saveEntryBatch — routine FK fields', () => {
    test('persists routine_id and routine_completion_id when provided', async () => {
      const now = `${TEST_TODAY}T09:00:00-07:00`;
      const foodId = entryTypeId(raw, 'Food');

      // Insert a routine + completion so FKs are valid
      const routineResult = raw
        .prepare(
          `INSERT INTO routine (name, sort_order, archived, created_at, updated_at) VALUES (?, 0, 0, ?, ?)`
        )
        .run('FK Test Routine', now, now);
      const rId = Number(routineResult.lastInsertRowid);

      const completionResult = raw
        .prepare(`INSERT INTO routine_completion (routine_id, created_at) VALUES (?, ?)`)
        .run(rId, now);
      const cId = Number(completionResult.lastInsertRowid);

      const inputs: SaveEntryInput[] = [
        {
          entryTypeId: foodId,
          timestamp: now,
          routineId: rId,
          routineCompletionId: cId,
        },
      ];

      const [entryId] = await saveEntryBatch(db, inputs);

      const row = raw
        .prepare(`SELECT routine_id, routine_completion_id FROM entry WHERE id = ?`)
        .get(entryId) as { routine_id: number; routine_completion_id: number };

      expect(row.routine_id).toBe(rId);
      expect(row.routine_completion_id).toBe(cId);

      raw.prepare(`DELETE FROM routine WHERE id = ?`).run(rId);
    });

    test('stores NULL for routine_id and routine_completion_id when not provided', async () => {
      const now = `${TEST_TODAY}T09:00:00-07:00`;
      const foodId = entryTypeId(raw, 'Food');

      const inputs: SaveEntryInput[] = [
        { entryTypeId: foodId, timestamp: now },
      ];

      const [entryId] = await saveEntryBatch(db, inputs);

      const row = raw
        .prepare(`SELECT routine_id, routine_completion_id FROM entry WHERE id = ?`)
        .get(entryId) as { routine_id: number | null; routine_completion_id: number | null };

      expect(row.routine_id).toBeNull();
      expect(row.routine_completion_id).toBeNull();
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

  // ── completeRoutine ──────────────────────────────────────────────────────────

  describe('completeRoutine', () => {
    let routineId: number;
    let foodTypeId: number;
    let activityTypeId: number;
    let focusId: number;

    const NOW = `${TEST_TODAY}T09:00:00-07:00`;

    beforeEach(() => {
      const result = raw
        .prepare(
          `INSERT INTO routine (name, sort_order, archived, created_at, updated_at) VALUES (?, 0, 0, ?, ?)`
        )
        .run('Complete Test Routine', NOW, NOW);
      routineId = Number(result.lastInsertRowid);

      foodTypeId = entryTypeId(raw, 'Food');
      activityTypeId = entryTypeId(raw, 'Activity');

      const focusResult = raw
        .prepare(`INSERT INTO focus (name, archived, sort_order, created_at) VALUES (?, 0, 0, ?)`)
        .run('Test Focus', NOW);
      focusId = Number(focusResult.lastInsertRowid);
    });

    afterEach(() => {
      raw.prepare(`DELETE FROM routine WHERE name = 'Complete Test Routine'`).run();
      raw.prepare(`DELETE FROM focus WHERE name = 'Test Focus'`).run();
    });

    test('creates a routine_completion row with correct routine_id and created_at', async () => {
      const completionId = await completeRoutine(db, {
        routineId,
        associatedFocusId: null,
        checkedItems: [],
        notes: null,
        timestamp: NOW,
      });

      const row = raw
        .prepare(`SELECT routine_id, created_at FROM routine_completion WHERE id = ?`)
        .get(completionId) as { routine_id: number; created_at: string };

      expect(row).toBeDefined();
      expect(row.routine_id).toBe(routineId);
      expect(row.created_at).toBe(NOW);
    });

    test('returns the new routine_completion id as a positive integer', async () => {
      const completionId = await completeRoutine(db, {
        routineId,
        associatedFocusId: null,
        checkedItems: [],
        notes: null,
        timestamp: NOW,
      });

      expect(typeof completionId).toBe('number');
      expect(completionId).toBeGreaterThan(0);
    });

    test('creates one entry per checked item', async () => {
      const completionId = await completeRoutine(db, {
        routineId,
        associatedFocusId: null,
        checkedItems: [
          { entryTypeId: foodTypeId, labelIds: [] },
          { entryTypeId: activityTypeId, labelIds: [] },
          { entryTypeId: foodTypeId, labelIds: [] },
        ],
        notes: null,
        timestamp: NOW,
      });

      const rows = raw
        .prepare(`SELECT id FROM entry WHERE routine_completion_id = ?`)
        .all(completionId) as { id: number }[];

      expect(rows).toHaveLength(3);
    });

    test('sets routine_id and routine_completion_id on every entry row', async () => {
      const completionId = await completeRoutine(db, {
        routineId,
        associatedFocusId: null,
        checkedItems: [
          { entryTypeId: foodTypeId, labelIds: [] },
          { entryTypeId: activityTypeId, labelIds: [] },
        ],
        notes: null,
        timestamp: NOW,
      });

      const rows = raw
        .prepare(`SELECT routine_id, routine_completion_id FROM entry WHERE routine_completion_id = ?`)
        .all(completionId) as { routine_id: number; routine_completion_id: number }[];

      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row.routine_id).toBe(routineId);
        expect(row.routine_completion_id).toBe(completionId);
      }
    });

    test('empty checkedItems creates only the routine_completion row, zero entry rows', async () => {
      const completionId = await completeRoutine(db, {
        routineId,
        associatedFocusId: null,
        checkedItems: [],
        notes: null,
        timestamp: NOW,
      });

      const completionRows = raw
        .prepare(`SELECT id FROM routine_completion WHERE id = ?`)
        .all(completionId);
      expect(completionRows).toHaveLength(1);

      const entryRows = raw
        .prepare(`SELECT id FROM entry WHERE routine_completion_id = ?`)
        .all(completionId);
      expect(entryRows).toHaveLength(0);
    });

    test('notes propagated to all entries', async () => {
      const sharedNotes = 'Felt good today';

      const completionId = await completeRoutine(db, {
        routineId,
        associatedFocusId: null,
        checkedItems: [
          { entryTypeId: foodTypeId, labelIds: [] },
          { entryTypeId: activityTypeId, labelIds: [] },
        ],
        notes: sharedNotes,
        timestamp: NOW,
      });

      const rows = raw
        .prepare(`SELECT notes FROM entry WHERE routine_completion_id = ?`)
        .all(completionId) as { notes: string }[];

      expect(rows).toHaveLength(2);
      for (const row of rows) {
        expect(row.notes).toBe(sharedNotes);
      }
    });

    test('entry_focus rows created for each entry when associatedFocusId is set', async () => {
      const completionId = await completeRoutine(db, {
        routineId,
        associatedFocusId: focusId,
        checkedItems: [
          { entryTypeId: foodTypeId, labelIds: [] },
          { entryTypeId: activityTypeId, labelIds: [] },
        ],
        notes: null,
        timestamp: NOW,
      });

      const entryRows = raw
        .prepare(`SELECT id FROM entry WHERE routine_completion_id = ?`)
        .all(completionId) as { id: number }[];

      expect(entryRows).toHaveLength(2);

      for (const entryRow of entryRows) {
        const focusRow = raw
          .prepare(`SELECT focus_id FROM entry_focus WHERE entry_id = ? AND focus_id = ?`)
          .get(entryRow.id, focusId) as { focus_id: number } | undefined;
        expect(focusRow).toBeDefined();
        expect(focusRow!.focus_id).toBe(focusId);
      }
    });

    test('no entry_focus rows when associatedFocusId is null', async () => {
      const completionId = await completeRoutine(db, {
        routineId,
        associatedFocusId: null,
        checkedItems: [
          { entryTypeId: foodTypeId, labelIds: [] },
        ],
        notes: null,
        timestamp: NOW,
      });

      const entryRows = raw
        .prepare(`SELECT id FROM entry WHERE routine_completion_id = ?`)
        .all(completionId) as { id: number }[];
      expect(entryRows).toHaveLength(1);

      const focusRows = raw
        .prepare(`SELECT focus_id FROM entry_focus WHERE entry_id = ?`)
        .all(entryRows[0].id);
      expect(focusRows).toHaveLength(0);
    });

    test('entry_label rows inserted per item', async () => {
      const labelRows = raw
        .prepare(
          `SELECT l.id FROM label l
           JOIN entry_type et ON l.entry_type_id = et.id
           WHERE et.name = 'Food' AND l.is_enabled = 1
           LIMIT 2`
        )
        .all() as { id: number }[];
      expect(labelRows.length).toBeGreaterThanOrEqual(2);

      const labelId1 = labelRows[0].id;
      const labelId2 = labelRows[1].id;

      const completionId = await completeRoutine(db, {
        routineId,
        associatedFocusId: null,
        checkedItems: [
          { entryTypeId: foodTypeId, labelIds: [labelId1, labelId2] },
        ],
        notes: null,
        timestamp: NOW,
      });

      const entryRow = raw
        .prepare(`SELECT id FROM entry WHERE routine_completion_id = ?`)
        .get(completionId) as { id: number };

      const labels = raw
        .prepare(`SELECT label_id FROM entry_label WHERE entry_id = ?`)
        .all(entryRow.id) as { label_id: number }[];

      expect(labels).toHaveLength(2);
      expect(labels.map((l) => l.label_id)).toContain(labelId1);
      expect(labels.map((l) => l.label_id)).toContain(labelId2);
    });

    test('transaction rolls back when an entry INSERT fails (invalid entry_type_id)', async () => {
      const BAD_ENTRY_TYPE_ID = 99999;
      const completionCountBefore = (
        raw.prepare(`SELECT COUNT(*) as c FROM routine_completion`).get() as { c: number }
      ).c;
      const entryCountBefore = (
        raw.prepare(`SELECT COUNT(*) as c FROM entry`).get() as { c: number }
      ).c;

      await expect(
        completeRoutine(db, {
          routineId,
          associatedFocusId: null,
          checkedItems: [
            { entryTypeId: foodTypeId, labelIds: [] },
            { entryTypeId: BAD_ENTRY_TYPE_ID, labelIds: [] },
          ],
          notes: null,
          timestamp: NOW,
        })
      ).rejects.toThrow();

      const completionCountAfter = (
        raw.prepare(`SELECT COUNT(*) as c FROM routine_completion`).get() as { c: number }
      ).c;
      const entryCountAfter = (
        raw.prepare(`SELECT COUNT(*) as c FROM entry`).get() as { c: number }
      ).c;

      expect(completionCountAfter).toBe(completionCountBefore);
      expect(entryCountAfter).toBe(entryCountBefore);
    });
  });
});
