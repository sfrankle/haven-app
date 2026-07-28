/**
 * Query layer tests — validates all functions in src/lib/db/queries.ts.
 *
 * Uses better-sqlite3 + BetterSqliteAdapter to run query functions in
 * Jest/Node without an Expo device or the expo-sqlite native module.
 *
 * Setup:
 *   openTestDb()        → in-memory SQLite DB with FK enforcement on
 *   applyAllMigrations  → schema + seed (gives us real entry types and labels)
 *   createAdapter()     → wraps better-sqlite3 to look like expo-sqlite
 */
import type Database from 'better-sqlite3';
import { applyAllMigrations, openTestDb, anyLabelId, entryTypeId } from '../../lib/db/test-helpers';
import { createAdapter, type AdaptedDb } from './adapter';
import {
  getEntryTypes,
  getLabels,
  saveEntry,
  getEntriesForTrace,
  getDailyHydrationTotal,
  getRoutineCompletions,
  createLabel,
} from '../../lib/db/queries';

// ─── suite setup ─────────────────────────────────────────────────────────────

describe('query layer', () => {
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

  // ── getEntryTypes ───────────────────────────────────────────────────────────

  describe('getEntryTypes', () => {
    test('returns all 6 seeded entry types when all enabled', async () => {
      const types = await getEntryTypes(db);
      expect(types).toHaveLength(6);
    });

    test('ordered by sort_order ASC', async () => {
      const types = await getEntryTypes(db);
      const names = types.map((t) => t.name);
      expect(names).toEqual(['Food', 'Hydration', 'Emotion', 'Physical', 'Sleep', 'Activity']);
    });

    test('result includes title field', async () => {
      const types = await getEntryTypes(db);
      for (const t of types) {
        expect(typeof t.title).toBe('string');
        expect(t.title.length).toBeGreaterThan(0);
      }
    });

    test('excludes disabled entry types', async () => {
      // Disable one type, re-query, re-enable.
      const foodId = entryTypeId(raw, 'Food');
      raw.prepare('UPDATE entry_type SET is_enabled = 0 WHERE id = ?').run(foodId);
      const types = await getEntryTypes(db);
      expect(types.find((t) => t.name === 'Food')).toBeUndefined();
      raw.prepare('UPDATE entry_type SET is_enabled = 1 WHERE id = ?').run(foodId);
    });
  });

  // ── getLabels — recents ordering ────────────────────────────────────────────

  describe('getLabels — recents ordering', () => {
    let foodTypeId: number;
    let labelXId: number;
    let labelYId: number;

    beforeAll(() => {
      foodTypeId = entryTypeId(raw, 'Food');

      // Pick two distinct food labels.
      const rows = raw
        .prepare(
          `SELECT id FROM label WHERE entry_type_id = ? AND is_enabled = 1 ORDER BY sort_order LIMIT 2`
        )
        .all(foodTypeId) as { id: number }[];
      [labelXId, labelYId] = rows.map((r) => r.id);

      // Entry A (earlier) uses label X.
      raw
        .prepare(
          `INSERT INTO entry (entry_type_id, source_type, timestamp, created_at)
           VALUES (?, 'log', '2026-01-01T08:00:00+00:00', '2026-01-01T08:00:00+00:00')`
        )
        .run(foodTypeId);
      const entryAId = (raw.prepare('SELECT last_insert_rowid() AS id').get() as { id: bigint | number }).id;
      raw.prepare('INSERT INTO entry_label (entry_id, label_id) VALUES (?, ?)').run(Number(entryAId), labelXId);

      // Entry B (later) uses label Y.
      raw
        .prepare(
          `INSERT INTO entry (entry_type_id, source_type, timestamp, created_at)
           VALUES (?, 'log', '2026-01-02T08:00:00+00:00', '2026-01-02T08:00:00+00:00')`
        )
        .run(foodTypeId);
      const entryBId = (raw.prepare('SELECT last_insert_rowid() AS id').get() as { id: bigint | number }).id;
      raw.prepare('INSERT INTO entry_label (entry_id, label_id) VALUES (?, ?)').run(Number(entryBId), labelYId);

    });

    test('label used in later entry surfaces before label used in earlier entry', async () => {
      const labels = await getLabels(db, foodTypeId);
      const ids = labels.map((l) => l.id);
      const posY = ids.indexOf(labelYId);
      const posX = ids.indexOf(labelXId);
      expect(posY).toBeGreaterThanOrEqual(0);
      expect(posX).toBeGreaterThanOrEqual(0);
      expect(posY).toBeLessThan(posX);
    });

    test('label never used appears after all recents, ordered by sort_order', async () => {
      const labels = await getLabels(db, foodTypeId);
      const recentIds = new Set([labelXId, labelYId]);
      // Find first non-recent label
      const firstNonRecentIdx = labels.findIndex((l) => !recentIds.has(l.id));
      // Both recents should appear before it
      const posX = labels.findIndex((l) => l.id === labelXId);
      const posY = labels.findIndex((l) => l.id === labelYId);
      if (firstNonRecentIdx !== -1) {
        expect(posX).toBeLessThan(firstNonRecentIdx);
        expect(posY).toBeLessThan(firstNonRecentIdx);
      }
    });
  });

  // ── getLabels — prefix search ───────────────────────────────────────────────

  describe('getLabels — prefix search', () => {
    let foodTypeId: number;

    beforeAll(() => {
      foodTypeId = entryTypeId(raw, 'Food');
    });

    test('returns only labels starting with search prefix', async () => {
      // Use 'app' — 'Apple', 'Applesauce', etc. are in the food seed.
      const labels = await getLabels(db, foodTypeId, { search: 'app' });
      expect(labels.length).toBeGreaterThan(0);
      for (const l of labels) {
        expect(l.name.toLowerCase()).toMatch(/^app/);
      }
    });

    test('returns empty array for no matches', async () => {
      const labels = await getLabels(db, foodTypeId, { search: 'zzzzznoMatch' });
      expect(labels).toEqual([]);
    });
  });

  // ── getLabels — limit option ─────────────────────────────────────────────────

  describe('getLabels — limit option', () => {
    let foodTypeId: number;

    beforeAll(() => {
      foodTypeId = entryTypeId(raw, 'Food');
    });

    test('limit caps result set on recents path', async () => {
      const labels = await getLabels(db, foodTypeId, { limit: 3 });
      expect(labels.length).toBeLessThanOrEqual(3);
    });
  });

  // ── getLabels — disabled labels excluded ────────────────────────────────────

  describe('getLabels — disabled labels excluded', () => {
    let foodTypeId: number;
    let disabledLabelId: number;

    beforeAll(() => {
      foodTypeId = entryTypeId(raw, 'Food');
      disabledLabelId = anyLabelId(raw, 'Food');
      raw.prepare('UPDATE label SET is_enabled = 0 WHERE id = ?').run(disabledLabelId);
    });

    afterAll(() => {
      raw.prepare('UPDATE label SET is_enabled = 1 WHERE id = ?').run(disabledLabelId);
    });

    test('disabled label absent from recents results', async () => {
      const labels = await getLabels(db, foodTypeId);
      expect(labels.find((l) => l.id === disabledLabelId)).toBeUndefined();
    });

    test('disabled label absent from search results', async () => {
      const labelName = (
        raw.prepare('SELECT name FROM label WHERE id = ?').get(disabledLabelId) as { name: string }
      ).name;
      const prefix = labelName.slice(0, 3);
      const labels = await getLabels(db, foodTypeId, { search: prefix });
      expect(labels.find((l) => l.id === disabledLabelId)).toBeUndefined();
    });
  });

  // ── saveEntry ───────────────────────────────────────────────────────────────

  describe('saveEntry', () => {
    let foodTypeId: number;
    let label1Id: number;
    let label2Id: number;

    beforeAll(() => {
      foodTypeId = entryTypeId(raw, 'Food');
      const rows = raw
        .prepare(
          `SELECT id FROM label WHERE entry_type_id = ? AND is_enabled = 1 ORDER BY sort_order LIMIT 2`
        )
        .all(foodTypeId) as { id: number }[];
      [label1Id, label2Id] = rows.map((r) => r.id);
    });

    test('returns auto-incremented entry ID', async () => {
      const id = await saveEntry(db, {
        entryTypeId: foodTypeId,
        timestamp: '2026-02-01T12:00:00+00:00',
        labelIds: [label1Id],
      });
      expect(typeof id).toBe('number');
      expect(id).toBeGreaterThan(0);
    });

    test('2 labelIds → 1 entry row + 2 entry_label rows', async () => {
      const id = await saveEntry(db, {
        entryTypeId: foodTypeId,
        timestamp: '2026-02-02T12:00:00+00:00',
        labelIds: [label1Id, label2Id],
      });
      const entry = raw.prepare('SELECT * FROM entry WHERE id = ?').get(id) as
        | { id: number }
        | undefined;
      expect(entry).toBeDefined();
      const elRows = raw
        .prepare('SELECT * FROM entry_label WHERE entry_id = ?')
        .all(id) as { entry_id: number; label_id: number }[];
      expect(elRows).toHaveLength(2);
    });

    test('source_type is "log" and created_at is non-null', async () => {
      const id = await saveEntry(db, {
        entryTypeId: foodTypeId,
        timestamp: '2026-02-03T12:00:00+00:00',
      });
      const row = raw.prepare('SELECT source_type, created_at FROM entry WHERE id = ?').get(id) as
        | { source_type: string; created_at: string }
        | undefined;
      expect(row?.source_type).toBe('log');
      expect(row?.created_at).toBeTruthy();
    });

    test('transaction rollback on failure — non-existent labelId commits no entry row', async () => {
      // Note: this test exercises the BetterSqliteAdapter's manual BEGIN/ROLLBACK path.
      // It proves FK enforcement and atomicity are correct in Jest. The production
      // path (expo-sqlite's withTransactionAsync) is covered by Maestro E2E tests.
      const NONEXISTENT_LABEL_ID = 999_999;
      const countBefore = (
        raw.prepare('SELECT COUNT(*) as c FROM entry').get() as { c: number }
      ).c;

      await expect(
        saveEntry(db, {
          entryTypeId: foodTypeId,
          timestamp: '2026-02-04T12:00:00+00:00',
          labelIds: [NONEXISTENT_LABEL_ID],
        })
      ).rejects.toThrow();

      const countAfter = (
        raw.prepare('SELECT COUNT(*) as c FROM entry').get() as { c: number }
      ).c;
      expect(countAfter).toBe(countBefore);
    });
  });

  // ── getEntriesForTrace ──────────────────────────────────────────────────────

  describe('getEntriesForTrace', () => {
    let sleepTypeId: number;
    let foodTypeId: number;
    let label1Id: number;
    let label2Id: number;

    beforeAll(async () => {
      sleepTypeId = entryTypeId(raw, 'Sleep');
      foodTypeId = entryTypeId(raw, 'Food');
      const rows = raw
        .prepare(
          `SELECT id FROM label WHERE entry_type_id = ? AND is_enabled = 1 ORDER BY sort_order LIMIT 2`
        )
        .all(foodTypeId) as { id: number }[];
      [label1Id, label2Id] = rows.map((r) => r.id);

      // Clear entries table for a clean slate in this sub-suite.
      // (Other suites above have already added rows — we re-query after seeding.)
    });

    test('newest-first ordering', async () => {
      // Insert two entries with different timestamps.
      const olderTs = '2026-03-01T08:00:00+00:00';
      const newerTs = '2026-03-02T08:00:00+00:00';
      const idOlder = await saveEntry(db, { entryTypeId: sleepTypeId, timestamp: olderTs, numericValue: 7 });
      const idNewer = await saveEntry(db, { entryTypeId: sleepTypeId, timestamp: newerTs, numericValue: 8 });
      const entries = await getEntriesForTrace(db);
      const ids = entries.map((e) => e.id);
      expect(ids.indexOf(idNewer)).toBeLessThan(ids.indexOf(idOlder));
    });

    test('entry with 2 labels → single result with labels.length === 2', async () => {
      const id = await saveEntry(db, {
        entryTypeId: foodTypeId,
        timestamp: '2026-03-03T12:00:00+00:00',
        labelIds: [label1Id, label2Id],
      });
      const entries = await getEntriesForTrace(db);
      const entry = entries.find((e) => e.id === id);
      expect(entry).toBeDefined();
      expect(entry!.labels).toHaveLength(2);
    });

    test('entry with no labels → labels: []', async () => {
      const id = await saveEntry(db, {
        entryTypeId: sleepTypeId,
        timestamp: '2026-03-04T07:00:00+00:00',
        numericValue: 6,
      });
      const entries = await getEntriesForTrace(db);
      const entry = entries.find((e) => e.id === id);
      expect(entry).toBeDefined();
      expect(entry!.labels).toEqual([]);
    });

    test('localDate correctly derived from timestamp', async () => {
      const id = await saveEntry(db, {
        entryTypeId: sleepTypeId,
        timestamp: '2026-03-05T22:30:00+05:30',
        numericValue: 7.5,
      });
      const entries = await getEntriesForTrace(db);
      const entry = entries.find((e) => e.id === id);
      expect(entry).toBeDefined();
      // strftime('%Y-%m-%d', '2026-03-05T22:30:00+05:30') → '2026-03-05'
      expect(entry!.localDate).toBe('2026-03-05');
    });
  });

  // ── getEntriesForTrace — multi-focus filtering ──────────────────────────────

  describe('getEntriesForTrace — multi-focus filtering', () => {
    let foodTypeId: number;
    let focusAId: number;
    let focusBId: number;
    let labelIds: number[];
    let entryXId: number; // focus A only
    let entryYId: number; // focus B only
    let entryZId: number; // no focus
    let entryBothId: number; // focus A *and* focus B, three labels

    beforeAll(async () => {
      foodTypeId = entryTypeId(raw, 'Food');
      labelIds = (
        raw
          .prepare(
            `SELECT id FROM label WHERE entry_type_id = ? AND is_enabled = 1 ORDER BY sort_order LIMIT 3`
          )
          .all(foodTypeId) as { id: number }[]
      ).map((r) => r.id);

      const insertFocus = raw.prepare(
        `INSERT INTO focus (name, archived, sort_order, created_at) VALUES (?, 0, 0, '2026-05-01T08:00:00+00:00')`
      );
      focusAId = Number(insertFocus.run('Multi Focus A').lastInsertRowid);
      focusBId = Number(insertFocus.run('Multi Focus B').lastInsertRowid);

      entryXId = await saveEntry(db, {
        entryTypeId: foodTypeId,
        timestamp: '2026-05-01T08:00:00+00:00',
        focusId: focusAId,
      });
      entryYId = await saveEntry(db, {
        entryTypeId: foodTypeId,
        timestamp: '2026-05-01T09:00:00+00:00',
        focusId: focusBId,
      });
      entryZId = await saveEntry(db, {
        entryTypeId: foodTypeId,
        timestamp: '2026-05-01T10:00:00+00:00',
      });

      entryBothId = await saveEntry(db, {
        entryTypeId: foodTypeId,
        timestamp: '2026-05-01T11:00:00+00:00',
        labelIds,
        focusId: focusAId,
      });
      raw
        .prepare(`INSERT INTO entry_focus (entry_id, focus_id) VALUES (?, ?)`)
        .run(entryBothId, focusBId);
    });

    // Guards the WHERE EXISTS semi-join decision (docs/decisions.md).
    // A widening `JOIN entry_focus ... IN (?,?)` returns one row per
    // entry×focus×label — 2 focuses × 3 labels = 6 rows — and collapseTraceRows
    // appends labels unconditionally, so the entry comes back with 6 duplicated
    // labels. Only a real SQL engine can catch this; the mocked test cannot.
    test('an entry matching two active focuses is returned once, with its labels unduplicated', async () => {
      const entries = await getEntriesForTrace(db, { focusIds: [focusAId, focusBId] });

      const matches = entries.filter((e) => e.id === entryBothId);
      expect(matches).toHaveLength(1);
      expect(matches[0].labels).toHaveLength(3);
      expect(matches[0].labels.map((l) => l.id).sort()).toEqual([...labelIds].sort());
    });

    test('multiple focus ids combine with OR semantics', async () => {
      const ids = (await getEntriesForTrace(db, { focusIds: [focusAId, focusBId] })).map((e) => e.id);

      expect(ids).toContain(entryXId);
      expect(ids).toContain(entryYId);
      expect(ids).not.toContain(entryZId);
    });

    test('a single focus id returns only that focus\'s entries', async () => {
      const ids = (await getEntriesForTrace(db, { focusIds: [focusAId] })).map((e) => e.id);

      expect(ids).toContain(entryXId);
      expect(ids).not.toContain(entryYId);
      expect(ids).not.toContain(entryZId);
    });

    test('focusIds: [] behaves identically to omitting the option', async () => {
      // Guards against `IN ()`, which is a syntax error in SQLite.
      const withEmpty = (await getEntriesForTrace(db, { focusIds: [] })).map((e) => e.id);
      const withoutOption = (await getEntriesForTrace(db)).map((e) => e.id);

      expect(withEmpty).toEqual(withoutOption);
      expect(withEmpty).toContain(entryZId);
    });
  });

  // ── routine_completion_id round-trip + getRoutineCompletions ────────────────

  describe('routine grouping reads', () => {
    let foodTypeId: number;
    let sleepTypeId: number;
    let routineId: number;
    let completion1Id: number;
    let completion2Id: number;
    let member1Id: number;
    let member2Id: number;
    let member3Id: number;
    let standaloneId: number;
    let labelAId: number;
    let labelBId: number;

    beforeAll(() => {
      foodTypeId = entryTypeId(raw, 'Food');
      sleepTypeId = entryTypeId(raw, 'Sleep');
      const labels = raw
        .prepare(
          `SELECT id FROM label WHERE entry_type_id = ? AND is_enabled = 1 ORDER BY sort_order LIMIT 2`
        )
        .all(foodTypeId) as { id: number }[];
      [labelAId, labelBId] = labels.map((l) => l.id);

      routineId = Number(
        raw
          .prepare(
            `INSERT INTO routine (name, sort_order, archived, created_at, updated_at)
             VALUES ('Evening Wind Down', 0, 0, '2026-06-01T08:00:00+00:00', '2026-06-01T08:00:00+00:00')`
          )
          .run().lastInsertRowid
      );

      const insertCompletion = raw.prepare(
        `INSERT INTO routine_completion (routine_id, created_at) VALUES (?, ?)`
      );
      completion1Id = Number(insertCompletion.run(routineId, '2026-06-01T20:15:00-07:00').lastInsertRowid);
      completion2Id = Number(insertCompletion.run(routineId, '2026-06-02T20:40:00-07:00').lastInsertRowid);

      const insertEntry = raw.prepare(
        `INSERT INTO entry (entry_type_id, source_type, timestamp, created_at, numeric_value, notes, routine_id, routine_completion_id)
         VALUES (?, 'log', ?, ?, NULL, NULL, ?, ?)`
      );
      // Deliberately give the member entries timestamps that differ from the
      // completion's created_at so `completedAt` cannot silently come from an entry.
      member1Id = Number(
        insertEntry.run(foodTypeId, '2026-06-01T20:16:00-07:00', '2026-06-01T20:16:00-07:00', routineId, completion1Id)
          .lastInsertRowid
      );
      member2Id = Number(
        insertEntry.run(sleepTypeId, '2026-06-01T20:17:00-07:00', '2026-06-01T20:17:00-07:00', routineId, completion1Id)
          .lastInsertRowid
      );
      member3Id = Number(
        insertEntry.run(foodTypeId, '2026-06-02T20:41:00-07:00', '2026-06-02T20:41:00-07:00', routineId, completion2Id)
          .lastInsertRowid
      );

      const insertEntryLabel = raw.prepare(
        `INSERT INTO entry_label (entry_id, label_id) VALUES (?, ?)`
      );
      insertEntryLabel.run(member1Id, labelAId);
      insertEntryLabel.run(member1Id, labelBId);

      standaloneId = Number(
        raw
          .prepare(
            `INSERT INTO entry (entry_type_id, source_type, timestamp, created_at)
             VALUES (?, 'log', '2026-06-01T21:00:00-07:00', '2026-06-01T21:00:00-07:00')`
          )
          .run(foodTypeId).lastInsertRowid
      );
    });

    test('getEntriesForTrace round-trips routine_completion_id', async () => {
      const entries = await getEntriesForTrace(db);

      expect(entries.find((e) => e.id === member1Id)!.routineCompletionId).toBe(completion1Id);
      expect(entries.find((e) => e.id === standaloneId)!.routineCompletionId).toBeNull();
    });

    test('returns one group per completion with the routine name and canonical timestamp', async () => {
      const groups = await getRoutineCompletions(db, [completion1Id]);

      expect(groups).toHaveLength(1);
      expect(groups[0].completionId).toBe(completion1Id);
      expect(groups[0].routineId).toBe(routineId);
      expect(groups[0].routineName).toBe('Evening Wind Down');
      expect(groups[0].completedAt).toBe('2026-06-01T20:15:00-07:00');
      expect(groups[0].localDate).toBe('2026-06-01');
    });

    test('group carries all member entries oldest-first, with labels intact', async () => {
      const [group] = await getRoutineCompletions(db, [completion1Id]);

      expect(group.entries.map((e) => e.id)).toEqual([member1Id, member2Id]);
      expect(group.entries[0].labels).toHaveLength(2);
      expect(group.entries.map((e) => e.id)).not.toContain(standaloneId);
    });

    test('two completions of the same routine come back as distinct groups', async () => {
      const groups = await getRoutineCompletions(db, [completion1Id, completion2Id]);

      expect(groups).toHaveLength(2);
      const byId = new Map(groups.map((g) => [g.completionId, g]));
      expect(byId.get(completion1Id)!.entries.map((e) => e.id)).toEqual([member1Id, member2Id]);
      expect(byId.get(completion2Id)!.entries.map((e) => e.id)).toEqual([member3Id]);
    });

    test('returns [] for an empty id list', async () => {
      expect(await getRoutineCompletions(db, [])).toEqual([]);
    });
  });

  // ── getDailyHydrationTotal ──────────────────────────────────────────────────

  describe('getDailyHydrationTotal', () => {
    let hydrationTypeId: number;

    beforeAll(() => {
      hydrationTypeId = entryTypeId(raw, 'Hydration');
    });

    test('3 entries on date A, 1 on date B — totals are isolated per date', async () => {
      const dateA = '2026-04-01';
      const dateB = '2026-04-02';

      await saveEntry(db, { entryTypeId: hydrationTypeId, timestamp: `${dateA}T08:00:00+00:00`, numericValue: 12 });
      await saveEntry(db, { entryTypeId: hydrationTypeId, timestamp: `${dateA}T12:00:00+00:00`, numericValue: 16 });
      await saveEntry(db, { entryTypeId: hydrationTypeId, timestamp: `${dateA}T18:00:00+00:00`, numericValue: 8 });
      await saveEntry(db, { entryTypeId: hydrationTypeId, timestamp: `${dateB}T09:00:00+00:00`, numericValue: 20 });

      const totalA = await getDailyHydrationTotal(db, dateA);
      const totalB = await getDailyHydrationTotal(db, dateB);

      expect(totalA).toBe(36);
      expect(totalB).toBe(20);
    });

    test('returns 0 for a date with no entries', async () => {
      const total = await getDailyHydrationTotal(db, '2000-01-01');
      expect(total).toBe(0);
    });
  });

  // ── getLabels — categoryName join ───────────────────────────────────────────

  describe('getLabels — categoryName join', () => {
    let activityTypeId: number;

    beforeAll(() => {
      activityTypeId = entryTypeId(raw, 'Activity');
    });

    test('activity labels include categoryName from joined category row', async () => {
      const labels = await getLabels(db, activityTypeId, { search: 'Walk' });
      expect(labels.length).toBeGreaterThan(0);
      const walk = labels.find((l) => l.name === 'Walk');
      expect(walk).toBeDefined();
      expect(walk!.categoryName).toBe('Move');
    });

    test('labels with no category have categoryName: null', async () => {
      // Insert a label with no category_id to verify null mapping.
      raw
        .prepare(
          `INSERT INTO label (entry_type_id, name, category_id, is_default, is_enabled, sort_order)
           VALUES (?, 'NoCategoryTestLabel', NULL, 0, 1, 999)`
        )
        .run(activityTypeId);

      const labels = await getLabels(db, activityTypeId, { search: 'NoCategoryTestLabel' });
      expect(labels.length).toBe(1);
      expect(labels[0].categoryName).toBeNull();

      // Clean up.
      raw.prepare(`DELETE FROM label WHERE name = 'NoCategoryTestLabel'`).run();
    });
  });

  // ── createLabel ─────────────────────────────────────────────────────────────

  describe('createLabel', () => {
    let activityTypeId: number;

    beforeAll(() => {
      activityTypeId = entryTypeId(raw, 'Activity');
    });

    test('inserts a new label and returns it with correct fields', async () => {
      const label = await createLabel(db, activityTypeId, 'Custom Midnight Swim');
      expect(label.id).toBeGreaterThan(0);
      expect(label.name).toBe('Custom Midnight Swim');
      expect(label.entryTypeId).toBe(activityTypeId);
      expect(label.categoryId).toBeNull();
      expect(label.categoryName).toBeNull();

      // seed_version = 0 marks user-created labels; seed rows always use >= 1.
      // This ensures user labels are never affected by seed update logic.
      const row = await db.getFirstAsync<{ seed_version: number | null }>(
        'SELECT seed_version FROM label WHERE id = ?',
        [label.id]
      );
      expect(row?.seed_version).toBe(0);
    });

    test('created label appears in subsequent getLabels search', async () => {
      await createLabel(db, activityTypeId, 'UniqueTestActivityZzz');
      const labels = await getLabels(db, activityTypeId, { search: 'UniqueTestActivityZzz' });
      expect(labels.length).toBe(1);
      expect(labels[0].name).toBe('UniqueTestActivityZzz');
    });
  });
});
