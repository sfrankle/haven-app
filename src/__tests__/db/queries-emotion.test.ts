/**
 * Query layer tests for emotion-specific query functions:
 * getLabelsByParent and getTier1EmotionLabels.
 */
import type Database from 'better-sqlite3';
import { applyAllMigrations, openTestDb } from '../../lib/db/test-helpers';
import { createAdapter, type AdaptedDb } from './adapter';
import { getLabelsByParent, getTier1EmotionLabels } from '../../lib/db/queries';

describe('emotion query functions', () => {
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

  // ── getLabelsByParent ───────────────────────────────────────────────────────

  describe('getLabelsByParent', () => {
    test('returns labels matching parentId ordered by sort_order', async () => {
      // Get a known Tier-1 emotion label id (e.g. "Bright")
      const tier1Row = raw
        .prepare(
          `SELECT l.id FROM label l
           JOIN entry_type et ON l.entry_type_id = et.id
           WHERE et.name = 'Emotion' AND l.parent_id IS NULL
           LIMIT 1`
        )
        .get() as { id: number } | undefined;
      if (!tier1Row) throw new Error('No Tier-1 emotion label found in seed');

      const labels = await getLabelsByParent(db, tier1Row.id);
      // All returned labels must have parent_id equal to the queried id
      expect(labels.every((l) => l.parentId === tier1Row.id)).toBe(true);
      // Must be ordered by sort_order ascending
      const sortOrders = labels.map((l) => l.sortOrder);
      expect(sortOrders).toEqual([...sortOrders].sort((a, b) => a - b));
    });

    test('excludes disabled labels', async () => {
      const tier1Row = raw
        .prepare(
          `SELECT l.id FROM label l
           JOIN entry_type et ON l.entry_type_id = et.id
           WHERE et.name = 'Emotion' AND l.parent_id IS NULL
           LIMIT 1`
        )
        .get() as { id: number } | undefined;
      if (!tier1Row) throw new Error('No Tier-1 emotion label found in seed');

      // Disable the first child
      const child = raw
        .prepare(`SELECT id FROM label WHERE parent_id = ? LIMIT 1`)
        .get(tier1Row.id) as { id: number } | undefined;
      if (!child) return; // no children to test with — skip

      raw.prepare(`UPDATE label SET is_enabled = 0 WHERE id = ?`).run(child.id);
      const labels = await getLabelsByParent(db, tier1Row.id);
      expect(labels.every((l) => l.id !== child.id)).toBe(true);
      // Restore
      raw.prepare(`UPDATE label SET is_enabled = 1 WHERE id = ?`).run(child.id);
    });

    test('returns empty array for unknown parentId', async () => {
      const labels = await getLabelsByParent(db, 999999);
      expect(labels).toEqual([]);
    });
  });

  // ── getTier1EmotionLabels ───────────────────────────────────────────────────

  describe('getTier1EmotionLabels', () => {
    function emotionEntryTypeId(): number {
      const row = raw
        .prepare(`SELECT id FROM entry_type WHERE name = 'Emotion'`)
        .get() as { id: number } | undefined;
      if (!row) throw new Error(`entry_type 'Emotion' not found in seed`);
      return row.id;
    }

    test('returns only root-level emotion labels (parent_id IS NULL)', async () => {
      const etId = emotionEntryTypeId();
      const labels = await getTier1EmotionLabels(db, etId);
      expect(labels.length).toBeGreaterThan(0);
      expect(labels.every((l) => l.parentId === null)).toBe(true);
    });

    test('returns labels for the correct entry type only', async () => {
      const etId = emotionEntryTypeId();
      const labels = await getTier1EmotionLabels(db, etId);
      expect(labels.every((l) => l.entryTypeId === etId)).toBe(true);
    });

    test('returns labels ordered by sort_order', async () => {
      const etId = emotionEntryTypeId();
      const labels = await getTier1EmotionLabels(db, etId);
      const sortOrders = labels.map((l) => l.sortOrder);
      expect(sortOrders).toEqual([...sortOrders].sort((a, b) => a - b));
    });

    test('excludes disabled labels', async () => {
      const etId = emotionEntryTypeId();
      const firstTier1 = raw
        .prepare(`SELECT id FROM label WHERE entry_type_id = ? AND parent_id IS NULL LIMIT 1`)
        .get(etId) as { id: number } | undefined;
      if (!firstTier1) throw new Error('No Tier-1 emotion label found');

      raw.prepare(`UPDATE label SET is_enabled = 0 WHERE id = ?`).run(firstTier1.id);
      const labels = await getTier1EmotionLabels(db, etId);
      expect(labels.every((l) => l.id !== firstTier1.id)).toBe(true);
      // Restore
      raw.prepare(`UPDATE label SET is_enabled = 1 WHERE id = ?`).run(firstTier1.id);
    });

    test('returns 5 Tier-1 emotion labels as seeded (Bright, Warm, Still, Heavy, Charged)', async () => {
      const etId = emotionEntryTypeId();
      const labels = await getTier1EmotionLabels(db, etId);
      expect(labels).toHaveLength(5);
      const names = labels.map((l) => l.name);
      expect(names).toEqual(expect.arrayContaining(['Bright', 'Warm', 'Still', 'Heavy', 'Charged']));
    });
  });
});
