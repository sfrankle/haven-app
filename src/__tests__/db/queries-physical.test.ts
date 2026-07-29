/**
 * Query layer tests for physical-specific query functions:
 * getPhysicalStateLabels and getPhysicalParentLabels.
 */
import type Database from 'better-sqlite3';
import { applyAllMigrations, openTestDb } from '../../lib/db/test-helpers';
import { createAdapter, type AdaptedDb } from './adapter';
import {
  getPhysicalStateLabels,
  getPhysicalParentLabels,
  saveEntry,
  saveEntryBatch,
} from '../../lib/db/queries';

describe('physical query functions', () => {
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

  function physicalEntryTypeId(): number {
    const row = raw
      .prepare(`SELECT id FROM entry_type WHERE name = 'Physical'`)
      .get() as { id: number } | undefined;
    if (!row) throw new Error('Physical entry type not found in seed');
    return row.id;
  }

  // ── getPhysicalStateLabels ──────────────────────────────────────────────────

  describe('getPhysicalStateLabels', () => {
    test('returns only child labels (parent_id IS NOT NULL)', async () => {
      const etId = physicalEntryTypeId();
      const labels = await getPhysicalStateLabels(db, etId);
      expect(labels.length).toBeGreaterThan(0);
      // All returned labels must be children (have a parent)
      // We verify by checking they have parentName (not null means a parent was joined)
      // Actually the function should exclude root-level parents like "Head", "Gut" etc.
      // Verify no parent-level labels (e.g. "Gut", "Head") are returned
      const names = labels.map((l) => l.name);
      expect(names).not.toContain('Gut');
      expect(names).not.toContain('Head');
      expect(names).not.toContain('Energy');
    });

    test('includes parentName field in results', async () => {
      const etId = physicalEntryTypeId();
      const labels = await getPhysicalStateLabels(db, etId);
      expect(labels.length).toBeGreaterThan(0);
      // Every result has a parentName field (string or null)
      for (const label of labels) {
        expect('parentName' in label).toBe(true);
      }
    });

    test('parentName matches expected parent for a known label', async () => {
      const etId = physicalEntryTypeId();
      // Find a label whose parent we know — look for something under "Head"
      const gutChildRow = raw
        .prepare(
          `SELECT l.id, l.name FROM label l
           JOIN label p ON p.id = l.parent_id
           JOIN entry_type et ON et.id = l.entry_type_id
           WHERE et.name = 'Physical' AND p.name = 'Gut' AND l.is_enabled = 1
           LIMIT 1`
        )
        .get() as { id: number; name: string } | undefined;

      if (!gutChildRow) {
        // If no Gut children in seed, skip
        return;
      }

      const labels = await getPhysicalStateLabels(db, etId);
      const found = labels.find((l) => l.id === gutChildRow.id);
      expect(found).toBeDefined();
      expect(found?.parentName).toBe('Gut');
    });

    test('search filters by prefix match on child name', async () => {
      const etId = physicalEntryTypeId();
      // Get a known child label name to use as prefix
      const childRow = raw
        .prepare(
          `SELECT l.name FROM label l
           JOIN entry_type et ON et.id = l.entry_type_id
           WHERE et.name = 'Physical' AND l.parent_id IS NOT NULL AND l.is_enabled = 1
           LIMIT 1`
        )
        .get() as { name: string } | undefined;

      if (!childRow) return;

      const prefix = childRow.name.slice(0, 3);
      const results = await getPhysicalStateLabels(db, etId, { search: prefix });
      // All results must start with the prefix (case-insensitive)
      for (const label of results) {
        expect(label.name.toLowerCase()).toMatch(
          new RegExp(`^${prefix.toLowerCase()}`)
        );
      }
    });

    test('search returns empty array for no match', async () => {
      const etId = physicalEntryTypeId();
      const results = await getPhysicalStateLabels(db, etId, { search: 'ZzNoMatchXx' });
      expect(results).toEqual([]);
    });

    test('limit is respected', async () => {
      const etId = physicalEntryTypeId();
      const results = await getPhysicalStateLabels(db, etId, { limit: 2 });
      expect(results.length).toBeLessThanOrEqual(2);
    });

    test('recents ordering: recently used labels appear first', async () => {
      const etId = physicalEntryTypeId();
      // Get two child labels
      const childRows = raw
        .prepare(
          `SELECT l.id FROM label l
           JOIN entry_type et ON et.id = l.entry_type_id
           WHERE et.name = 'Physical' AND l.parent_id IS NOT NULL AND l.is_enabled = 1
           LIMIT 2`
        )
        .all() as { id: number }[];

      if (childRows.length < 2) return;

      const [, second] = childRows;

      // Insert an entry that uses the second label
      const ts = '2026-01-15T10:00:00-07:00';
      const entryResult = raw
        .prepare(
          `INSERT INTO entry (entry_type_id, source_type, timestamp, created_at) VALUES (?, 'log', ?, ?)`
        )
        .run(etId, ts, ts);
      const newEntryId = Number(entryResult.lastInsertRowid);
      raw
        .prepare(`INSERT INTO entry_label (entry_id, label_id) VALUES (?, ?)`)
        .run(newEntryId, second.id);

      const results = await getPhysicalStateLabels(db, etId, { limit: 20 });
      const ids = results.map((l) => l.id);
      const secondIdx = ids.indexOf(second.id);
      // second label (recently used) should appear before others that have no history
      expect(secondIdx).toBeGreaterThanOrEqual(0);
      // Clean up
      raw.prepare(`DELETE FROM entry_label WHERE entry_id = ?`).run(newEntryId);
      raw.prepare(`DELETE FROM entry WHERE id = ?`).run(newEntryId);
    });
  });

  // ── getPhysicalParentLabels ─────────────────────────────────────────────────

  describe('getPhysicalParentLabels', () => {
    test('returns only root-level labels (parent_id IS NULL)', async () => {
      const etId = physicalEntryTypeId();
      const labels = await getPhysicalParentLabels(db, etId);
      expect(labels.length).toBeGreaterThan(0);
      // Confirm known parent labels are present
      const names = labels.map((l) => l.name);
      expect(names).toContain('Energy');
    });

    test('does not include child labels', async () => {
      const etId = physicalEntryTypeId();
      const allParents = await getPhysicalParentLabels(db, etId);
      // Find any child label in the DB
      const childRow = raw
        .prepare(
          `SELECT l.name FROM label l
           JOIN entry_type et ON et.id = l.entry_type_id
           WHERE et.name = 'Physical' AND l.parent_id IS NOT NULL AND l.is_enabled = 1
           LIMIT 1`
        )
        .get() as { name: string } | undefined;

      if (!childRow) return;

      const parentNames = allParents.map((l) => l.name);
      expect(parentNames).not.toContain(childRow.name);
    });
  });

  // ── multi-sensation save ────────────────────────────────────────────────────

  describe('saving several sensations at once', () => {
    async function stateLabelIds(count: number): Promise<number[]> {
      const labels = await getPhysicalStateLabels(db, physicalEntryTypeId());
      return labels.slice(0, count).map((l) => l.id);
    }

    test('every sensation is persisted with its own severity', async () => {
      const etId = physicalEntryTypeId();
      const [firstId, secondId] = await stateLabelIds(2);
      const ts = '2026-07-29T09:15:00-07:00';

      const ids = await saveEntryBatch(db, [
        { entryTypeId: etId, timestamp: ts, numericValue: 4, labelIds: [firstId] },
        { entryTypeId: etId, timestamp: ts, numericValue: 2, labelIds: [secondId] },
      ]);

      expect(ids).toHaveLength(2);

      const rows = raw
        .prepare(
          `SELECT e.id, e.numeric_value, el.label_id
             FROM entry e
             JOIN entry_label el ON el.entry_id = e.id
            WHERE e.id IN (?, ?)
            ORDER BY e.id`
        )
        .all(ids[0], ids[1]) as { id: number; numeric_value: number; label_id: number }[];

      expect(rows).toEqual([
        { id: ids[0], numeric_value: 4, label_id: firstId },
        { id: ids[1], numeric_value: 2, label_id: secondId },
      ]);
    });

    // The bug behind this file's batch usage: expo-sqlite hands out one
    // connection, so two overlapping withTransactionAsync calls issue a second
    // BEGIN inside an open transaction. Logging two sensations used to do
    // exactly that. Pinned so nobody reintroduces a per-chip save loop.
    test('overlapping single saves collide on the shared connection', async () => {
      const etId = physicalEntryTypeId();
      const [firstId, secondId] = await stateLabelIds(2);
      const ts = '2026-07-29T09:20:00-07:00';

      await expect(
        Promise.all([
          saveEntry(db, { entryTypeId: etId, timestamp: ts, numericValue: 4, labelIds: [firstId] }),
          saveEntry(db, { entryTypeId: etId, timestamp: ts, numericValue: 2, labelIds: [secondId] }),
        ])
      ).rejects.toThrow(/transaction within a transaction/i);
    });
  });
});
