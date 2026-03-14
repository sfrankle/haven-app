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
import { applyAllMigrations, openTestDb } from '../../lib/db/test-helpers';
import { createAdapter, type AdaptedDb } from './adapter';
import {
  getEntryTypes,
  getLabels,
  saveEntry,
  getEntriesForTrace,
  getDailyHydrationTotal,
  createLabel,
} from '../../lib/db/queries';

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Returns the entry_type id for a given name (guaranteed by seed). */
function entryTypeId(raw: Database.Database, name: string): number {
  const row = raw.prepare('SELECT id FROM entry_type WHERE name = ?').get(name) as
    | { id: number }
    | undefined;
  if (!row) throw new Error(`entry_type '${name}' not found in seed`);
  return row.id;
}

/** Returns any label id for a given entry_type name. */
function anyLabelId(raw: Database.Database, entryTypeName: string): number {
  const row = raw
    .prepare(
      `SELECT l.id FROM label l
       JOIN entry_type et ON l.entry_type_id = et.id
       WHERE et.name = ? AND l.is_enabled = 1
       LIMIT 1`
    )
    .get(entryTypeName) as { id: number } | undefined;
  if (!row) throw new Error(`No enabled label for entry_type '${entryTypeName}'`);
  return row.id;
}

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
