/**
 * BetterSqliteAdapter
 *
 * Wraps better-sqlite3's synchronous API to match the subset of the
 * expo-sqlite SQLiteDatabase async interface that queries.ts uses.
 * This lets query functions run unmodified in Jest (Node) without
 * a device or the expo-sqlite native module.
 *
 * Only the methods called by queries.ts are implemented. Unimplemented
 * methods throw to surface accidental usage early.
 *
 * ─── Error normalisation (#179) — do not remove ───────────────────────────
 *
 * Every method funnels thrown values through `toRealmError`. This is not
 * defensive padding; without it the suite goes intermittently red.
 *
 * better-sqlite3's `SqliteError` calls `Error.call(this)` instead of
 * `super()`, so the `[[ErrorData]]` internal slot is never installed and
 * `Object.prototype.toString.call(err)` returns '[object Object]'. Worse, the
 * native addon binds one error constructor process-wide, while Jest gives
 * every test file its own vm context (its own `Error.prototype`). The first
 * db test file in a worker to open a Database hands the addon *its*
 * `SqliteError`; every later file then receives errors whose prototype chain
 * reaches a foreign realm, making `err instanceof Error` false.
 *
 * Jest's `rejects.toThrow()` gates on that check and, when it fails, reports
 * "Received function did not throw" for a promise that did in fact reject —
 * so a realm mismatch was indistinguishable from a genuine rollback
 * regression. The sync `expect(fn).toThrow()` path was never affected.
 *
 * expo-sqlite — the thing this double stands in for — rejects with genuine
 * realm-local `Error`s. Normalising here closes a fidelity gap in the double
 * rather than weakening a test. `src/__tests__/db/adapter-errors.test.ts`
 * locks the contract in place.
 */
import type Database from 'better-sqlite3';
import type { Db } from '../../lib/db/queries';

/** AdaptedDb satisfies the Db interface from queries.ts. */
export type AdaptedDb = Db;

/**
 * Converts a thrown value into a real, realm-local `Error`, preserving
 * `message`, `name`, and `code`.
 *
 * The guard tests the object's *shape* rather than `instanceof Error`.
 * `instanceof` is precisely the value that varies with test-file load order,
 * so using it here would let the first-loaded file skip wrapping while later
 * files wrap — reintroducing the same asymmetry the fix exists to remove.
 * `Object.prototype.toString` is stable across realms.
 */
function toRealmError(err: unknown): Error {
  if (Object.prototype.toString.call(err) === '[object Error]') return err as Error;

  const source = err as { message?: unknown; name?: unknown; code?: unknown } | null;
  const message = typeof source?.message === 'string' ? source.message : String(err);
  const realm = new Error(message, { cause: err }) as Error & { code?: unknown };
  if (typeof source?.name === 'string') realm.name = source.name;
  if (source?.code !== undefined) realm.code = source.code;
  return realm;
}

/** Runs `fn`, converting anything it throws into a realm-local `Error`. */
function rethrow<T>(fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    throw toRealmError(err);
  }
}

/**
 * Wraps a better-sqlite3 Database instance to look like an async
 * expo-sqlite SQLiteDatabase for use in Jest tests.
 */
export function createAdapter(db: Database.Database): AdaptedDb {
  return {
    async getAllAsync<T>(sql: string, params: unknown[] = []): Promise<T[]> {
      return rethrow(() => db.prepare(sql).all(...params)) as T[];
    },

    async getFirstAsync<T>(sql: string, params: unknown[] = []): Promise<T | null> {
      const row = rethrow(() => db.prepare(sql).get(...params));
      return (row as T | undefined) ?? null;
    },

    async runAsync(
      sql: string,
      params: unknown[] = []
    ): Promise<{ lastInsertRowId: number; changes: number }> {
      const result = rethrow(() => db.prepare(sql).run(...params));
      return {
        lastInsertRowId: Number(result.lastInsertRowid),
        changes: result.changes,
      };
    },

    // Note: concurrent calls will throw "cannot start a transaction within a
    // transaction" from better-sqlite3. Tests are synchronous so this is safe.
    async withTransactionAsync(fn: () => Promise<void>): Promise<void> {
      rethrow(() => db.prepare('BEGIN').run());
      try {
        await fn();
        // No rethrow needed: the catch below normalises whatever COMMIT throws.
        db.prepare('COMMIT').run();
      } catch (err) {
        try {
          db.prepare('ROLLBACK').run();
        } catch (rollbackErr) {
          // A failing ROLLBACK displaces the error that caused the rollback,
          // so keep that one reachable as `cause` — it is the root cause, and
          // it is the one worth reading. Normalised like everything else: an
          // unwrapped throw here would report as "did not throw", in the
          // hardest condition in this file to debug.
          const failure = toRealmError(rollbackErr);
          failure.cause = toRealmError(err);
          throw failure;
        }
        throw toRealmError(err);
      }
    },
  };
}
