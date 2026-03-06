/**
 * Migration manifest — lists every .sql file in version order.
 * The runner in database.ts uses the array index + 1 as the user_version.
 *
 * To add a migration: create vN__description.sql and append it here.
 * sql-loader.js (registered in metro.config.js) makes Metro serve .sql files
 * as string modules.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const v1Schema = require('./v1__schema.sql') as string;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const v2SeedBase = require('./v2__seed_base.sql') as string;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const v3SeedFodmap = require('./v3__seed_fodmap.sql') as string;

export const migrations: string[] = [v1Schema, v2SeedBase, v3SeedFodmap];
