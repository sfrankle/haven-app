/**
 * Generates a local SQLite file with migrations + seeds applied.
 * Open the output file in TablePlus, DB Browser, or any SQLite viewer.
 *
 * Usage: npx tsx scripts/preview-seed.ts
 * Output: /tmp/haven-seed-preview.db
 */
import Database from 'better-sqlite3';
import { unlinkSync, existsSync } from 'fs';
import { MIGRATION_V1_SQL } from '../lib/db/migrations';
import {
  SEED_V1_MEASUREMENT_TYPES,
  SEED_V1_CATEGORIES,
  SEED_V1_ENTRY_TYPES,
  SEED_V1_TAGS,
  SEED_V1_LABELS_FOOD,
  SEED_V1_LABELS_EMOTION_PARENTS,
  SEED_V1_LABELS_EMOTION_CHILDREN,
  SEED_V1_LABELS_PHYSICAL_PARENTS,
  SEED_V1_LABELS_PHYSICAL_UNIVERSALS,
  SEED_V1_LABELS_PHYSICAL_CHILDREN,
  SEED_V1_LABELS_ACTIVITY,
  SEED_V1_LABEL_TAGS,
} from '../lib/db/seed-sql';

const OUT = `${process.env.HOME}/Desktop/haven-seed-preview.db`;

if (existsSync(OUT)) unlinkSync(OUT);

const db = new Database(OUT);

db.exec(MIGRATION_V1_SQL);
db.exec(SEED_V1_MEASUREMENT_TYPES);
db.exec(SEED_V1_CATEGORIES);
db.exec(SEED_V1_ENTRY_TYPES);
db.exec(SEED_V1_TAGS);
db.exec(SEED_V1_LABELS_FOOD);
db.exec(SEED_V1_LABELS_EMOTION_PARENTS);
db.exec(SEED_V1_LABELS_EMOTION_CHILDREN);
db.exec(SEED_V1_LABELS_PHYSICAL_PARENTS);
db.exec(SEED_V1_LABELS_PHYSICAL_UNIVERSALS);
db.exec(SEED_V1_LABELS_PHYSICAL_CHILDREN);
db.exec(SEED_V1_LABELS_ACTIVITY);
db.exec(SEED_V1_LABEL_TAGS);

db.close();

console.log(`✓ Seed preview written to ${OUT}`);
