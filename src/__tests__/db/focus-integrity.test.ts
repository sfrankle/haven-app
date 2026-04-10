/**
 * Focus schema integrity tests — validates that the v8 migration creates the
 * focus, focus_label, and entry_focus tables with correct columns and FK
 * cascade behaviour.
 *
 * Uses better-sqlite3 (Node-native, synchronous) so the test runs in Jest
 * without a device or expo-sqlite native module.
 */
import Database from 'better-sqlite3';
import { openTestDb, applyAllMigrations } from '../../lib/db/test-helpers';

let db: Database.Database;

beforeAll(() => {
  db = openTestDb();
  applyAllMigrations(db);
});

afterAll(() => {
  db.close();
});

describe('focus schema integrity', () => {
  test('focus table has correct columns', () => {
    const rows = db.prepare('PRAGMA table_info(focus)').all() as { name: string }[];
    expect(rows.map((r) => r.name)).toEqual([
      'id',
      'name',
      'description',
      'archived',
      'sort_order',
      'created_at',
    ]);
  });

  test('focus_label table has correct columns', () => {
    const rows = db.prepare('PRAGMA table_info(focus_label)').all() as { name: string }[];
    expect(rows.map((r) => r.name)).toEqual(['focus_id', 'label_id', 'sort_order']);
  });

  test('entry_focus table has correct columns', () => {
    const rows = db.prepare('PRAGMA table_info(entry_focus)').all() as { name: string }[];
    expect(rows.map((r) => r.name)).toEqual(['entry_id', 'focus_id']);
  });

  test('can insert a focus row and read it back', () => {
    db.prepare(
      `INSERT INTO focus (name, description, archived, sort_order, created_at)
       VALUES ('Digestion', NULL, 0, 1, '2026-04-10T00:00:00.000Z')`
    ).run();
    const row = db
      .prepare(`SELECT name, description, archived FROM focus WHERE name='Digestion'`)
      .get() as { name: string; description: string | null; archived: number };
    expect(row.name).toBe('Digestion');
    expect(row.description).toBeNull();
    expect(row.archived).toBe(0);
  });

  test('archived flag can be toggled and other data is preserved', () => {
    db.prepare(
      `INSERT INTO focus (name, description, archived, sort_order, created_at)
       VALUES ('Energy', 'Track energy patterns', 0, 2, '2026-04-10T00:00:00.000Z')`
    ).run();
    const before = db
      .prepare(`SELECT id, name, description, archived FROM focus WHERE name='Energy'`)
      .get() as { id: number; name: string; description: string; archived: number };
    expect(before.archived).toBe(0);

    db.prepare(`UPDATE focus SET archived=1 WHERE id=?`).run(before.id);
    const after = db
      .prepare(`SELECT name, description, archived FROM focus WHERE id=?`)
      .get(before.id) as { name: string; description: string; archived: number };
    expect(after.archived).toBe(1);
    expect(after.name).toBe('Energy');
    expect(after.description).toBe('Track energy patterns');
  });

  test('focus_label insert with valid label_id succeeds', () => {
    const labelRow = db
      .prepare(`SELECT id FROM label LIMIT 1`)
      .get() as { id: number };
    expect(labelRow).toBeDefined();

    const focusRow = db
      .prepare(`SELECT id FROM focus WHERE name='Digestion'`)
      .get() as { id: number };

    expect(() => {
      db.prepare(
        `INSERT INTO focus_label (focus_id, label_id, sort_order) VALUES (?, ?, 0)`
      ).run(focusRow.id, labelRow.id);
    }).not.toThrow();
  });

  test('focus_label insert rejects invalid label_id (FK violation)', () => {
    const focusRow = db
      .prepare(`SELECT id FROM focus WHERE name='Digestion'`)
      .get() as { id: number };

    expect(() => {
      db.prepare(
        `INSERT INTO focus_label (focus_id, label_id, sort_order) VALUES (?, 999999, 0)`
      ).run(focusRow.id);
    }).toThrow();
  });

  test('deleting a focus cascades to focus_label', () => {
    const labelRow = db.prepare(`SELECT id FROM label LIMIT 1`).get() as { id: number };
    db.prepare(
      `INSERT INTO focus (name, archived, sort_order, created_at)
       VALUES ('CascadeTest1', 0, 99, '2026-04-10T00:00:00.000Z')`
    ).run();
    const f = db
      .prepare(`SELECT id FROM focus WHERE name='CascadeTest1'`)
      .get() as { id: number };
    db.prepare(
      `INSERT INTO focus_label (focus_id, label_id, sort_order) VALUES (?, ?, 0)`
    ).run(f.id, labelRow.id);

    db.prepare(`DELETE FROM focus WHERE id=?`).run(f.id);

    const remaining = db
      .prepare(`SELECT COUNT(*) as cnt FROM focus_label WHERE focus_id=?`)
      .get(f.id) as { cnt: number };
    expect(remaining.cnt).toBe(0);
  });

  test('deleting a focus cascades to entry_focus but entry survives', () => {
    const entryTypeRow = db
      .prepare(`SELECT id FROM entry_type LIMIT 1`)
      .get() as { id: number };

    db.prepare(
      `INSERT INTO entry (entry_type_id, source_type, timestamp, created_at)
       VALUES (?, 'log', '2026-04-10T00:00:00.000Z', '2026-04-10T00:00:00.000Z')`
    ).run(entryTypeRow.id);
    const entryRow = db
      .prepare(`SELECT id FROM entry ORDER BY id DESC LIMIT 1`)
      .get() as { id: number };

    db.prepare(
      `INSERT INTO focus (name, archived, sort_order, created_at)
       VALUES ('CascadeTest2', 0, 98, '2026-04-10T00:00:00.000Z')`
    ).run();
    const f = db
      .prepare(`SELECT id FROM focus WHERE name='CascadeTest2'`)
      .get() as { id: number };

    db.prepare(
      `INSERT INTO entry_focus (entry_id, focus_id) VALUES (?, ?)`
    ).run(entryRow.id, f.id);

    db.prepare(`DELETE FROM focus WHERE id=?`).run(f.id);

    const efRows = db
      .prepare(`SELECT COUNT(*) as cnt FROM entry_focus WHERE focus_id=?`)
      .get(f.id) as { cnt: number };
    expect(efRows.cnt).toBe(0);

    const entryStillExists = db
      .prepare(`SELECT id FROM entry WHERE id=?`)
      .get(entryRow.id) as { id: number } | undefined;
    expect(entryStillExists).toBeDefined();
  });

  test('deleting an entry cascades to entry_focus but focus survives', () => {
    const entryTypeRow = db
      .prepare(`SELECT id FROM entry_type LIMIT 1`)
      .get() as { id: number };

    db.prepare(
      `INSERT INTO entry (entry_type_id, source_type, timestamp, created_at)
       VALUES (?, 'log', '2026-04-10T00:00:00.000Z', '2026-04-10T00:00:00.000Z')`
    ).run(entryTypeRow.id);
    const entryRow = db
      .prepare(`SELECT id FROM entry ORDER BY id DESC LIMIT 1`)
      .get() as { id: number };

    db.prepare(
      `INSERT INTO focus (name, archived, sort_order, created_at)
       VALUES ('SurvivingFocus', 0, 97, '2026-04-10T00:00:00.000Z')`
    ).run();
    const f = db
      .prepare(`SELECT id FROM focus WHERE name='SurvivingFocus'`)
      .get() as { id: number };

    db.prepare(
      `INSERT INTO entry_focus (entry_id, focus_id) VALUES (?, ?)`
    ).run(entryRow.id, f.id);

    db.prepare(`DELETE FROM entry WHERE id=?`).run(entryRow.id);

    const efRows = db
      .prepare(`SELECT COUNT(*) as cnt FROM entry_focus WHERE entry_id=?`)
      .get(entryRow.id) as { cnt: number };
    expect(efRows.cnt).toBe(0);

    const focusStillExists = db
      .prepare(`SELECT id FROM focus WHERE id=?`)
      .get(f.id) as { id: number } | undefined;
    expect(focusStillExists).toBeDefined();
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
