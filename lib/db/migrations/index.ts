/**
 * Migration manifest — lists every .sql file in version order.
 * The runner in database.ts uses the array index + 1 as the user_version.
 *
 * To add a migration: create vN__description.sql, append it here (both the
 * require() call and the migrations array), and add the filename to
 * MIGRATION_FILES in lib/db/test-helpers.ts in the same position.
 * sql-loader.js (registered in metro.config.js) makes Metro serve .sql files
 * as string modules.
 *
 * CONTRACT: every .sql file added here must use `INSERT OR IGNORE` (not bare
 * `INSERT`) and `CREATE TABLE IF NOT EXISTS` so the runner can safely re-apply
 * a migration after a partial failure without producing duplicates.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const v1Schema = require('./v1__schema.sql') as string;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const v2Seed = require('./v2__seed-base.sql') as string;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const v3Seed = require('./v3__seed-food.sql') as string;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const v4Seed = require('./v4__seed-fodmap.sql') as string;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const v5Seed = require('./v5__seed-emotions.sql') as string;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const v6Seed = require('./v6__seed-activity.sql') as string;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const v7Seed = require('./v7__seed-physical.sql') as string;

export const migrations: string[] = [v1Schema, v2Seed, v3Seed, v4Seed, v5Seed, v6Seed, v7Seed];
