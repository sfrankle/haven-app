/**
 * Seed runner — populates default vocabulary on first launch.
 *
 * Called from database.ts after migrations complete. All inserts use
 * INSERT OR IGNORE with explicit IDs so re-running on each app open
 * is fully idempotent.
 */
import type * as SQLite from 'expo-sqlite';
import {
  SEED_V1_MEASUREMENT_TYPES,
  SEED_V1_ENTRY_TYPES,
  SEED_V1_CATEGORIES,
  SEED_V1_TAGS,
  SEED_V1_LABELS,
  SEED_V1_LABEL_TAGS,
} from './seed-sql';

export async function runSeeds(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.execAsync(SEED_V1_MEASUREMENT_TYPES);
    await db.execAsync(SEED_V1_CATEGORIES);
    await db.execAsync(SEED_V1_ENTRY_TYPES);
    await db.execAsync(SEED_V1_TAGS);
    await db.execAsync(SEED_V1_LABELS);
    await db.execAsync(SEED_V1_LABEL_TAGS);
  });
}
