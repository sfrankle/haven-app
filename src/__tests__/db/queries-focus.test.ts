/**
 * Query layer tests — Focus query functions in src/lib/db/queries.ts.
 *
 * Uses better-sqlite3 + BetterSqliteAdapter to run query functions in
 * Jest/Node without an Expo device or the expo-sqlite native module.
 */
import type Database from 'better-sqlite3';
import { applyAllMigrations, openTestDb, anyLabelId, entryTypeId } from '../../lib/db/test-helpers';
import { createAdapter, type AdaptedDb } from './adapter';
import {
  getFocuses,
  createFocus,
  updateFocus,
  setFocusArchived,
  getFocusItems,
  saveEntry,
  saveEntryBatch,
} from '../../lib/db/queries';

const TEST_TS = '2026-04-10T09:00:00-07:00';

// ─── suite setup ─────────────────────────────────────────────────────────────

describe('focus query layer', () => {
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

  // ── getFocuses ──────────────────────────────────────────────────────────────

  describe('getFocuses', () => {
    test('returns empty array when no focus rows exist', async () => {
      const focuses = await getFocuses(db);
      expect(focuses).toEqual([]);
    });

    test('returns active focuses ordered by sort_order', async () => {
      // Insert three focuses with non-sequential sort_orders
      raw
        .prepare(`INSERT INTO focus (name, archived, sort_order, created_at) VALUES (?, 0, ?, ?)`)
        .run('Focus C', 30, TEST_TS);
      raw
        .prepare(`INSERT INTO focus (name, archived, sort_order, created_at) VALUES (?, 0, ?, ?)`)
        .run('Focus A', 10, TEST_TS);
      raw
        .prepare(`INSERT INTO focus (name, archived, sort_order, created_at) VALUES (?, 0, ?, ?)`)
        .run('Focus B', 20, TEST_TS);

      const focuses = await getFocuses(db);
      expect(focuses.map((f) => f.name)).toEqual(['Focus A', 'Focus B', 'Focus C']);

      // Cleanup
      raw.prepare(`DELETE FROM focus WHERE name IN ('Focus A', 'Focus B', 'Focus C')`).run();
    });

    test('excludes archived focuses by default', async () => {
      raw
        .prepare(`INSERT INTO focus (name, archived, sort_order, created_at) VALUES (?, 1, 0, ?)`)
        .run('Archived Focus', TEST_TS);

      const focuses = await getFocuses(db);
      expect(focuses.find((f) => f.name === 'Archived Focus')).toBeUndefined();

      raw.prepare(`DELETE FROM focus WHERE name = 'Archived Focus'`).run();
    });

    test('includes archived focuses when includeArchived: true', async () => {
      raw
        .prepare(`INSERT INTO focus (name, archived, sort_order, created_at) VALUES (?, 1, 0, ?)`)
        .run('Archived Focus 2', TEST_TS);

      const focuses = await getFocuses(db, { includeArchived: true });
      expect(focuses.find((f) => f.name === 'Archived Focus 2')).toBeDefined();

      raw.prepare(`DELETE FROM focus WHERE name = 'Archived Focus 2'`).run();
    });
  });

  // ── createFocus ─────────────────────────────────────────────────────────────

  describe('createFocus', () => {
    test('inserts a focus with no labels — focus_label is empty', async () => {
      const focus = await createFocus(db, { name: 'Solo Focus' });
      expect(focus.name).toBe('Solo Focus');
      expect(focus.archived).toBe(false);

      const rows = raw
        .prepare(`SELECT * FROM focus_label WHERE focus_id = ?`)
        .all(focus.id) as unknown[];
      expect(rows).toHaveLength(0);

      raw.prepare(`DELETE FROM focus WHERE id = ?`).run(focus.id);
    });

    test('inserts a focus with two labelIds — focus_label has correct sort_order', async () => {
      const labelA = anyLabelId(raw, 'Food');
      const labelB = anyLabelId(raw, 'Activity');

      const focus = await createFocus(db, { name: 'Labeled Focus', labelIds: [labelA, labelB] });

      const rows = raw
        .prepare(`SELECT label_id, sort_order FROM focus_label WHERE focus_id = ? ORDER BY sort_order`)
        .all(focus.id) as { label_id: number; sort_order: number }[];

      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({ label_id: labelA, sort_order: 0 });
      expect(rows[1]).toEqual({ label_id: labelB, sort_order: 1 });

      raw.prepare(`DELETE FROM focus WHERE id = ?`).run(focus.id);
    });

    test('returns newly created Focus with archived: false', async () => {
      const focus = await createFocus(db, { name: 'Return Focus' });
      expect(focus.id).toBeGreaterThan(0);
      expect(focus.archived).toBe(false);
      expect(focus.createdAt).toBeDefined();
      expect(focus.sortOrder).toBe(0);

      raw.prepare(`DELETE FROM focus WHERE id = ?`).run(focus.id);
    });

    test('throws on duplicate name (UNIQUE constraint)', async () => {
      await createFocus(db, { name: 'Duplicate Name' });
      await expect(createFocus(db, { name: 'Duplicate Name' })).rejects.toThrow();

      raw.prepare(`DELETE FROM focus WHERE name = 'Duplicate Name'`).run();
    });
  });

  // ── updateFocus ─────────────────────────────────────────────────────────────

  describe('updateFocus', () => {
    test('renames a focus — name changes, other fields preserved', async () => {
      const focus = await createFocus(db, { name: 'Old Name' });
      await updateFocus(db, focus.id, { name: 'New Name' });

      const updated = await getFocuses(db, { includeArchived: true });
      const found = updated.find((f) => f.id === focus.id);
      expect(found?.name).toBe('New Name');
      expect(found?.archived).toBe(false);

      raw.prepare(`DELETE FROM focus WHERE id = ?`).run(focus.id);
    });

    test('replaces labels — old focus_label rows removed, new ones inserted', async () => {
      const labelA = anyLabelId(raw, 'Food');
      const labelB = anyLabelId(raw, 'Activity');
      const focus = await createFocus(db, { name: 'Replace Labels', labelIds: [labelA] });

      await updateFocus(db, focus.id, { labelIds: [labelB] });

      const rows = raw
        .prepare(`SELECT label_id FROM focus_label WHERE focus_id = ?`)
        .all(focus.id) as { label_id: number }[];

      expect(rows).toHaveLength(1);
      expect(rows[0].label_id).toBe(labelB);

      raw.prepare(`DELETE FROM focus WHERE id = ?`).run(focus.id);
    });

    test('empty labelIds removes all pinned labels (not a no-op)', async () => {
      const labelA = anyLabelId(raw, 'Food');
      const focus = await createFocus(db, { name: 'Remove All Labels', labelIds: [labelA] });

      await updateFocus(db, focus.id, { labelIds: [] });

      const rows = raw
        .prepare(`SELECT label_id FROM focus_label WHERE focus_id = ?`)
        .all(focus.id) as unknown[];

      expect(rows).toHaveLength(0);

      raw.prepare(`DELETE FROM focus WHERE id = ?`).run(focus.id);
    });

    test('no-op when patch is empty — no error thrown', async () => {
      const focus = await createFocus(db, { name: 'No Op Focus' });
      await expect(updateFocus(db, focus.id, {})).resolves.not.toThrow();

      raw.prepare(`DELETE FROM focus WHERE id = ?`).run(focus.id);
    });
  });

  // ── setFocusArchived ─────────────────────────────────────────────────────────

  describe('setFocusArchived', () => {
    test('archives a focus (archived: true)', async () => {
      const focus = await createFocus(db, { name: 'To Archive' });
      await setFocusArchived(db, focus.id, true);

      const all = await getFocuses(db, { includeArchived: true });
      const found = all.find((f) => f.id === focus.id);
      expect(found?.archived).toBe(true);

      raw.prepare(`DELETE FROM focus WHERE id = ?`).run(focus.id);
    });

    test('unarchives a focus (archived: false)', async () => {
      const focus = await createFocus(db, { name: 'To Unarchive' });
      await setFocusArchived(db, focus.id, true);
      await setFocusArchived(db, focus.id, false);

      const all = await getFocuses(db, { includeArchived: true });
      const found = all.find((f) => f.id === focus.id);
      expect(found?.archived).toBe(false);

      raw.prepare(`DELETE FROM focus WHERE id = ?`).run(focus.id);
    });
  });

  // ── getFocusItems ────────────────────────────────────────────────────────────

  describe('getFocusItems', () => {
    test('returns empty array for a focus with no labels and no associated entries', async () => {
      const focus = await createFocus(db, { name: 'Empty Focus Items' });
      const items = await getFocusItems(db, focus.id);
      expect(items).toEqual([]);
      raw.prepare(`DELETE FROM focus WHERE id = ?`).run(focus.id);
    });

    test('pinned labels appear with source: pinned', async () => {
      const labelId = anyLabelId(raw, 'Food');
      const focus = await createFocus(db, { name: 'Pinned Items', labelIds: [labelId] });
      const items = await getFocusItems(db, focus.id);

      expect(items).toHaveLength(1);
      expect(items[0].source).toBe('pinned');
      expect(items[0].labelId).toBe(labelId);

      raw.prepare(`DELETE FROM focus WHERE id = ?`).run(focus.id);
    });

    test('historical labels appear with source: historical', async () => {
      const foodTypeId = entryTypeId(raw, 'Food');
      const labelId = anyLabelId(raw, 'Food');
      const focus = await createFocus(db, { name: 'Historical Items' });

      // Save an entry associated with this focus
      const entryId = await saveEntry(db, {
        entryTypeId: foodTypeId,
        timestamp: TEST_TS,
        labelIds: [labelId],
        focusId: focus.id,
      });

      const items = await getFocusItems(db, focus.id);

      expect(items.length).toBeGreaterThan(0);
      expect(items.find((i) => i.labelId === labelId)?.source).toBe('historical');

      raw.prepare(`DELETE FROM entry_focus WHERE entry_id = ?`).run(entryId);
      raw.prepare(`DELETE FROM entry_label WHERE entry_id = ?`).run(entryId);
      raw.prepare(`DELETE FROM entry WHERE id = ?`).run(entryId);
      raw.prepare(`DELETE FROM focus WHERE id = ?`).run(focus.id);
    });

    test('a label in both focus_label and entry_label appears once as pinned', async () => {
      const foodTypeId = entryTypeId(raw, 'Food');
      const labelId = anyLabelId(raw, 'Food');

      // Focus with the label pinned
      const focus = await createFocus(db, { name: 'Pinned+Historical', labelIds: [labelId] });

      // Save an entry with the same label associated with this focus
      const entryId = await saveEntry(db, {
        entryTypeId: foodTypeId,
        timestamp: TEST_TS,
        labelIds: [labelId],
        focusId: focus.id,
      });

      const items = await getFocusItems(db, focus.id);
      const matching = items.filter((i) => i.labelId === labelId);

      // Should appear exactly once, as pinned
      expect(matching).toHaveLength(1);
      expect(matching[0].source).toBe('pinned');

      raw.prepare(`DELETE FROM entry_focus WHERE entry_id = ?`).run(entryId);
      raw.prepare(`DELETE FROM entry_label WHERE entry_id = ?`).run(entryId);
      raw.prepare(`DELETE FROM entry WHERE id = ?`).run(entryId);
      raw.prepare(`DELETE FROM focus WHERE id = ?`).run(focus.id);
    });
  });

  // ── saveEntry with focusId ───────────────────────────────────────────────────

  describe('saveEntry with focusId', () => {
    test('saving with focusId inserts an entry_focus row', async () => {
      const focus = await createFocus(db, { name: 'SaveEntry Focus' });
      const foodTypeId = entryTypeId(raw, 'Food');

      const entryId = await saveEntry(db, {
        entryTypeId: foodTypeId,
        timestamp: TEST_TS,
        focusId: focus.id,
      });

      const row = raw
        .prepare(`SELECT * FROM entry_focus WHERE entry_id = ? AND focus_id = ?`)
        .get(entryId, focus.id);
      expect(row).toBeDefined();

      raw.prepare(`DELETE FROM entry_focus WHERE entry_id = ?`).run(entryId);
      raw.prepare(`DELETE FROM entry WHERE id = ?`).run(entryId);
      raw.prepare(`DELETE FROM focus WHERE id = ?`).run(focus.id);
    });

    test('saving without focusId does not insert an entry_focus row', async () => {
      const foodTypeId = entryTypeId(raw, 'Food');
      const entryId = await saveEntry(db, {
        entryTypeId: foodTypeId,
        timestamp: TEST_TS,
      });

      const rows = raw
        .prepare(`SELECT * FROM entry_focus WHERE entry_id = ?`)
        .all(entryId) as unknown[];
      expect(rows).toHaveLength(0);

      raw.prepare(`DELETE FROM entry WHERE id = ?`).run(entryId);
    });

    test('saving with an invalid focusId rolls back the entire transaction', async () => {
      const foodTypeId = entryTypeId(raw, 'Food');
      const invalidFocusId = 999999;

      const countBefore = (
        raw.prepare(`SELECT COUNT(*) AS n FROM entry`).get() as { n: number }
      ).n;

      await expect(
        saveEntry(db, {
          entryTypeId: foodTypeId,
          timestamp: TEST_TS,
          focusId: invalidFocusId,
        })
      ).rejects.toThrow();

      const countAfter = (
        raw.prepare(`SELECT COUNT(*) AS n FROM entry`).get() as { n: number }
      ).n;
      expect(countAfter).toBe(countBefore);
    });
  });

  // ── saveEntryBatch ───────────────────────────────────────────────────────────

  describe('saveEntryBatch', () => {
    test('inserts all entries in one call — returns correct IDs', async () => {
      const foodTypeId = entryTypeId(raw, 'Food');
      const labelId = anyLabelId(raw, 'Food');
      const focus = await createFocus(db, { name: 'Batch Focus 1' });

      const ids = await saveEntryBatch(db, [
        { entryTypeId: foodTypeId, timestamp: TEST_TS, labelIds: [labelId], focusId: focus.id },
        { entryTypeId: foodTypeId, timestamp: TEST_TS, labelIds: [labelId], focusId: focus.id },
        { entryTypeId: foodTypeId, timestamp: TEST_TS, labelIds: [labelId], focusId: focus.id },
      ]);

      expect(ids).toHaveLength(3);
      for (const id of ids) {
        const row = raw.prepare(`SELECT id FROM entry WHERE id = ?`).get(id);
        expect(row).toBeDefined();
      }

      // Cleanup
      for (const id of ids) {
        raw.prepare(`DELETE FROM entry_focus WHERE entry_id = ?`).run(id);
        raw.prepare(`DELETE FROM entry_label WHERE entry_id = ?`).run(id);
        raw.prepare(`DELETE FROM entry WHERE id = ?`).run(id);
      }
      raw.prepare(`DELETE FROM focus WHERE id = ?`).run(focus.id);
    });

    test('inserts entry_focus rows for all entries in the batch', async () => {
      const foodTypeId = entryTypeId(raw, 'Food');
      const focus = await createFocus(db, { name: 'Batch Focus 2' });

      const ids = await saveEntryBatch(db, [
        { entryTypeId: foodTypeId, timestamp: TEST_TS, focusId: focus.id },
        { entryTypeId: foodTypeId, timestamp: TEST_TS, focusId: focus.id },
      ]);

      for (const id of ids) {
        const row = raw
          .prepare(`SELECT * FROM entry_focus WHERE entry_id = ? AND focus_id = ?`)
          .get(id, focus.id);
        expect(row).toBeDefined();
      }

      // Cleanup
      for (const id of ids) {
        raw.prepare(`DELETE FROM entry_focus WHERE entry_id = ?`).run(id);
        raw.prepare(`DELETE FROM entry WHERE id = ?`).run(id);
      }
      raw.prepare(`DELETE FROM focus WHERE id = ?`).run(focus.id);
    });

    test('is atomic — rolls back all entries when one insert fails', async () => {
      const foodTypeId = entryTypeId(raw, 'Food');
      const focus = await createFocus(db, { name: 'Batch Focus Rollback' });
      const invalidLabelId = 999999; // does not exist — FK violation

      const countBefore = (
        raw.prepare(`SELECT COUNT(*) AS n FROM entry`).get() as { n: number }
      ).n;

      await expect(
        saveEntryBatch(db, [
          { entryTypeId: foodTypeId, timestamp: TEST_TS, focusId: focus.id },
          // This entry has a label ID that violates FK — causes rollback
          { entryTypeId: foodTypeId, timestamp: TEST_TS, labelIds: [invalidLabelId], focusId: focus.id },
        ])
      ).rejects.toThrow();

      const countAfter = (
        raw.prepare(`SELECT COUNT(*) AS n FROM entry`).get() as { n: number }
      ).n;
      expect(countAfter).toBe(countBefore);

      raw.prepare(`DELETE FROM focus WHERE id = ?`).run(focus.id);
    });

    test('with empty array returns empty array and inserts nothing', async () => {
      const countBefore = (
        raw.prepare(`SELECT COUNT(*) AS n FROM entry`).get() as { n: number }
      ).n;

      const ids = await saveEntryBatch(db, []);
      expect(ids).toEqual([]);

      const countAfter = (
        raw.prepare(`SELECT COUNT(*) AS n FROM entry`).get() as { n: number }
      ).n;
      expect(countAfter).toBe(countBefore);
    });
  });
});
