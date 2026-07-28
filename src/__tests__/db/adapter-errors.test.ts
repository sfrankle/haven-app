/**
 * Error-normalisation contract for BetterSqliteAdapter — regression guard for #179.
 *
 * Locks in one rule: everything the adapter throws is a realm-local `Error`.
 * Strip the normalisation and these fail legibly, instead of the suite going
 * intermittently red somewhere else. The mechanism behind the rule — why a
 * `SqliteError` is neither `[object Error]` nor `instanceof Error` in the
 * second and later db test files — is documented once, in `./adapter.ts`.
 */
import type Database from 'better-sqlite3';
import { applyAllMigrations, openTestDb, anyLabelId, entryTypeId } from '../../lib/db/test-helpers';
import { createAdapter, type AdaptedDb } from './adapter';

const TEST_TS = '2026-07-28T09:00:00-07:00';

/** Captures the value thrown by a sync or async call, without asserting on its shape. */
async function capture(fn: () => unknown): Promise<unknown> {
  try {
    await fn();
  } catch (err) {
    return err;
  }
  throw new Error('expected the call to reject, but it resolved');
}

/** Asserts a caught value is a real, realm-local Error — the contract under guard. */
function expectRealmLocalError(err: unknown): void {
  expect(err).toBeInstanceOf(Error);
  expect(Object.prototype.toString.call(err)).toBe('[object Error]');
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

  test('a raw better-sqlite3 error is not a real Error exotic object', async () => {
    // Documents the #179 mechanism. `Object.prototype.toString` returns
    // '[object Object]' for SqliteError unconditionally — unlike `instanceof
    // Error`, it does not depend on which test file loaded the addon first.
    // If better-sqlite3 ever makes SqliteError a real Error exotic object,
    // this assertion flips and the adapter normalisation can go.
    const rawError = await capture(() => raw.prepare('SELECT * FROM no_such_table').all());
    expect(Object.prototype.toString.call(rawError)).toBe('[object Object]');
  });

  // ── every method normalises ──────────────────────────────────────────────

  test.each([
    ['getAllAsync', () => db.getAllAsync('SELECT * FROM no_such_table')],
    ['getFirstAsync', () => db.getFirstAsync('SELECT * FROM no_such_table')],
    ['runAsync', () => db.runAsync('INSERT INTO no_such_table (a) VALUES (1)')],
  ])('%s rejects with a realm-local Error on invalid SQL', async (_name, call) => {
    const err = await capture(call);
    expectRealmLocalError(err);
    expect((err as Error).message).toMatch(/no_such_table/);
  });

  test('runAsync preserves message and code for a FOREIGN KEY violation', async () => {
    const err = (await capture(() =>
      db.runAsync(`INSERT INTO entry_label (entry_id, label_id) VALUES (?, ?)`, [999999, 999999])
    )) as Error & { code?: string };

    expectRealmLocalError(err);
    expect(err.message).toMatch(/FOREIGN KEY/);
    expect(err.code).toBe('SQLITE_CONSTRAINT_FOREIGNKEY');
  });

  test('runAsync preserves the SqliteError name', async () => {
    const err = (await capture(() =>
      db.runAsync('INSERT INTO no_such_table (a) VALUES (1)')
    )) as Error;
    expect(err.name).toBe('SqliteError');
  });

  test('the original SqliteError survives as `cause`', async () => {
    const err = (await capture(() =>
      db.runAsync('INSERT INTO no_such_table (a) VALUES (1)')
    )) as Error;
    // Normalisation replaces the thrown object, so the untouched original is
    // kept on `cause` — without it, wrapping would discard debugging context.
    expect(Object.prototype.toString.call(err.cause)).toBe('[object Object]');
  });

  // ── transactions ─────────────────────────────────────────────────────────

  test('withTransactionAsync rejects with a realm-local Error and rolls back', async () => {
    const typeId = entryTypeId(raw, 'Food');
    const labelId = anyLabelId(raw, 'Food');
    const countEntries = () =>
      (raw.prepare(`SELECT COUNT(*) AS n FROM entry`).get() as { n: number }).n;
    const countBefore = countEntries();
    let countInside = -1;

    const err = await capture(() =>
      db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO entry (entry_type_id, timestamp, created_at, source_type)
           VALUES (?, ?, ?, 'log')`,
          [typeId, TEST_TS, TEST_TS]
        );
        // Read on the same connection, so uncommitted rows are visible.
        countInside = countEntries();
        // Violates the FK on entry_id — 999999 is not a real entry.
        await db.runAsync(`INSERT INTO entry_label (entry_id, label_id) VALUES (?, ?)`, [
          999999,
          labelId,
        ]);
      })
    );

    expectRealmLocalError(err);
    expect(raw.inTransaction).toBe(false);

    // Asserted outside the transaction body: an expect() thrown inside would be
    // caught by capture() and silently satisfy the assertions below. If a new
    // NOT NULL column ever makes the first INSERT fail, this catches it —
    // otherwise the rollback assertion would pass for the wrong reason.
    expect(countInside).toBe(countBefore + 1);
    expect(countEntries()).toBe(countBefore);
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
