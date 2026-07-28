/**
 * Error-normalisation contract for BetterSqliteAdapter — regression guard for #179.
 *
 * better-sqlite3 throws `SqliteError`, which is not a real Error exotic object
 * (its constructor calls `Error.call(this)` rather than `super()`, so the
 * `[[ErrorData]]` internal slot is never installed). On top of that, the native
 * addon binds a single error constructor process-wide, while Jest gives each
 * test file its own vm context — so in the second and later db test files in a
 * worker, a thrown SqliteError is neither `[object Error]` nor `instanceof
 * Error`. Jest's `rejects.toThrow()` gates on exactly that check and reports
 * "Received function did not throw" for a promise that did in fact reject.
 *
 * The adapter normalises thrown values into realm-local Errors. These tests
 * lock that contract in place — if the normalisation is stripped, they fail
 * legibly instead of the suite going intermittently red somewhere else.
 */
import type Database from 'better-sqlite3';
import { applyAllMigrations, openTestDb, anyLabelId, entryTypeId } from '../../lib/db/test-helpers';
import { createAdapter, type AdaptedDb } from './adapter';

const TEST_TS = '2026-07-28T09:00:00-07:00';

/** Captures the value thrown by an async call without asserting on its shape. */
async function capture(fn: () => Promise<unknown>): Promise<unknown> {
  try {
    await fn();
  } catch (err) {
    return err;
  }
  throw new Error('expected the call to reject, but it resolved');
}

describe('adapter error normalisation', () => {
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

  // ── the mechanism this guard exists for ──────────────────────────────────

  test('a raw better-sqlite3 error is not a real Error exotic object', () => {
    // Documents the #179 mechanism. `Object.prototype.toString` returns
    // '[object Object]' for SqliteError unconditionally — unlike `instanceof
    // Error`, it does not depend on which test file loaded the addon first.
    // If better-sqlite3 ever makes SqliteError a real Error exotic object,
    // this assertion flips and the adapter normalisation can go.
    let rawError: unknown;
    try {
      raw.prepare('SELECT * FROM no_such_table').all();
    } catch (err) {
      rawError = err;
    }
    expect(rawError).toBeDefined();
    expect(Object.prototype.toString.call(rawError)).toBe('[object Object]');
  });

  // ── read methods ─────────────────────────────────────────────────────────

  test('getAllAsync rejects with a realm-local Error on invalid SQL', async () => {
    const err = await capture(() => db.getAllAsync('SELECT * FROM no_such_table'));
    expect(err).toBeInstanceOf(Error);
    expect(Object.prototype.toString.call(err)).toBe('[object Error]');
    expect((err as Error).message).toMatch(/no_such_table/);
  });

  test('getFirstAsync rejects with a realm-local Error on invalid SQL', async () => {
    const err = await capture(() => db.getFirstAsync('SELECT * FROM no_such_table'));
    expect(err).toBeInstanceOf(Error);
    expect(Object.prototype.toString.call(err)).toBe('[object Error]');
  });

  // ── write methods ────────────────────────────────────────────────────────

  test('runAsync rejects with a realm-local Error on invalid SQL', async () => {
    const err = await capture(() => db.runAsync('INSERT INTO no_such_table (a) VALUES (1)'));
    expect(err).toBeInstanceOf(Error);
    expect(Object.prototype.toString.call(err)).toBe('[object Error]');
  });

  test('runAsync preserves message and code for a FOREIGN KEY violation', async () => {
    const err = (await capture(() =>
      db.runAsync(`INSERT INTO entry_label (entry_id, label_id) VALUES (?, ?)`, [999999, 999999])
    )) as Error & { code?: string };

    expect(err).toBeInstanceOf(Error);
    expect(err.message).toMatch(/FOREIGN KEY/);
    expect(err.code).toBe('SQLITE_CONSTRAINT_FOREIGNKEY');
  });

  test('runAsync preserves the SqliteError name', async () => {
    const err = (await capture(() =>
      db.runAsync('INSERT INTO no_such_table (a) VALUES (1)')
    )) as Error;
    expect(err.name).toBe('SqliteError');
  });

  // ── transactions ─────────────────────────────────────────────────────────

  test('withTransactionAsync rejects with a realm-local Error and rolls back', async () => {
    const typeId = entryTypeId(raw, 'Food');
    const labelId = anyLabelId(raw, 'Food');
    const countBefore = (raw.prepare(`SELECT COUNT(*) AS n FROM entry`).get() as { n: number }).n;

    const err = await capture(() =>
      db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO entry (entry_type_id, timestamp, created_at, source_type)
           VALUES (?, ?, ?, 'log')`,
          [typeId, TEST_TS, TEST_TS]
        );
        // Violates the FK on label_id — 999999 does not exist.
        await db.runAsync(`INSERT INTO entry_label (entry_id, label_id) VALUES (?, ?)`, [
          999999,
          labelId,
        ]);
      })
    );

    expect(err).toBeInstanceOf(Error);
    expect(Object.prototype.toString.call(err)).toBe('[object Error]');
    expect(raw.inTransaction).toBe(false);

    const countAfter = (raw.prepare(`SELECT COUNT(*) AS n FROM entry`).get() as { n: number }).n;
    expect(countAfter).toBe(countBefore);
  });

  test('an Error thrown by the transaction body passes through by identity', async () => {
    const original = new Error('deliberate failure from the body');

    const caught = await capture(() =>
      db.withTransactionAsync(async () => {
        throw original;
      })
    );

    expect(caught).toBe(original);
    expect(raw.inTransaction).toBe(false);
  });
});
