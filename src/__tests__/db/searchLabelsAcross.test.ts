/**
 * Unit tests for searchLabelsAcross query function.
 *
 * Uses better-sqlite3 + BetterSqliteAdapter to run in Jest/Node.
 */
import type Database from 'better-sqlite3';
import { applyAllMigrations, openTestDb } from '../../lib/db/test-helpers';
import { createAdapter, type AdaptedDb } from './adapter';
import { searchLabelsAcross } from '../../lib/db/queries';

describe('searchLabelsAcross', () => {
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

  test('returns labels matching a search string across multiple entry types', async () => {
    // Seed has food labels like "Oats" and physical labels; search for something broad
    // "a" should match labels from multiple entry types
    const results = await searchLabelsAcross(db, 'a');
    expect(results.length).toBeGreaterThan(0);

    // Should span more than one entry type
    const entryTypeIds = new Set(results.map((l) => l.entryTypeId));
    expect(entryTypeIds.size).toBeGreaterThan(1);
  });

  test('returns empty array when no labels match the search string', async () => {
    const results = await searchLabelsAcross(db, 'zzzzzzzzzzz_no_match');
    expect(results).toEqual([]);
  });

  test('respects the limit param', async () => {
    const results = await searchLabelsAcross(db, 'a', 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  test('returns results ordered by sort_order ASC', async () => {
    const results = await searchLabelsAcross(db, 'e', 20);
    if (results.length >= 2) {
      for (let i = 1; i < results.length; i++) {
        expect(results[i].sortOrder).toBeGreaterThanOrEqual(results[i - 1].sortOrder);
      }
    }
  });

  test('returns Label objects with correct shape', async () => {
    const results = await searchLabelsAcross(db, 'o', 1);
    expect(results.length).toBeGreaterThan(0);
    const label = results[0];
    expect(typeof label.id).toBe('number');
    expect(typeof label.entryTypeId).toBe('number');
    expect(typeof label.name).toBe('string');
    expect(label.name.toLowerCase()).toContain('o');
  });
});
