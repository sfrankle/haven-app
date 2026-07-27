import { getDb } from './database';
import type { Db } from './queries';

/**
 * Returns the singleton DB handle typed as the narrow `Db` query interface.
 * expo-sqlite's SQLiteDatabase is structurally wider than `Db` (bind-param
 * types differ), so the cast is required — it lives here, once, instead of at
 * every call site. Runtime behaviour is identical to getDb(); the cast is
 * erased at compile time.
 */
export async function getTypedDb(): Promise<Db> {
  return (await getDb()) as unknown as Db;
}
