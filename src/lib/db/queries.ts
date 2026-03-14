/**
 * DB Query Layer — the single module all screens and hooks use for SQLite access.
 *
 * Each function accepts a `db` parameter that matches the expo-sqlite
 * SQLiteDatabase interface (or the BetterSqliteAdapter in tests). Callers
 * obtain the DB handle via getDb() at the hook/component boundary and pass it
 * down — this keeps these functions pure and testable without a device.
 *
 * No screen should call db.getAllAsync / db.runAsync / db.getFirstAsync directly.
 */

import type { EntryType, Label, EntryWithLabels, SaveEntryInput } from './query-types';

// ─── minimal interface ────────────────────────────────────────────────────────
// We type `db` against the subset of expo-sqlite's SQLiteDatabase that we
// actually call. This is satisfied by both expo-sqlite at runtime and by
// BetterSqliteAdapter in Jest tests.

export interface Db {
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
  runAsync(sql: string, params?: unknown[]): Promise<{ lastInsertRowId: number; changes: number }>;
  withTransactionAsync(fn: () => Promise<void>): Promise<void>;
}

// ─── raw row shapes (internal only) ──────────────────────────────────────────

interface EntryTypeRaw {
  id: number;
  name: string;
  title: string;
  icon: string | null;
  prompt: string | null;
  measurement_type: string;
}

interface LabelRaw {
  id: number;
  entry_type_id: number;
  name: string;
  parent_id: number | null;
  category_id: number | null;
  category_name: string | null;
  sort_order: number;
}

interface EntryTraceRaw {
  id: number;
  entry_type_id: number;
  source_type: 'log' | 'reflect';
  timestamp: string;
  // local_date is derived in JS, not SQL — see getEntriesForTrace
  numeric_value: number | null;
  notes: string | null;
  entry_type_name: string;
  entry_type_title: string;
  entry_type_icon: string | null;
  label_id: number | null;
  label_name: string | null;
  label_parent_id: number | null;
  label_category_id: number | null;
  label_sort_order: number | null;
}

interface HydrationTotalRaw {
  total: number;
}

// ─── mappers ──────────────────────────────────────────────────────────────────

function mapLabel(raw: LabelRaw): Label {
  return {
    id: raw.id,
    entryTypeId: raw.entry_type_id,
    name: raw.name,
    parentId: raw.parent_id,
    categoryId: raw.category_id,
    categoryName: raw.category_name ?? null,
    sortOrder: raw.sort_order,
  };
}

// ─── public query functions ───────────────────────────────────────────────────

/**
 * Returns all enabled entry types ordered by sort_order.
 */
export async function getEntryTypes(db: Db): Promise<EntryType[]> {
  const rows = await db.getAllAsync<EntryTypeRaw>(`
    SELECT
      et.id, et.name, et.title, et.icon, et.prompt,
      mt.name AS measurement_type
    FROM entry_type et
    JOIN measurement_type mt ON mt.id = et.measurement_type_id
    WHERE et.is_enabled = 1
    ORDER BY et.sort_order ASC
  `);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    title: r.title,
    icon: r.icon,
    prompt: r.prompt,
    measurementType: r.measurement_type as EntryType['measurementType'],
  }));
}

/**
 * Returns labels for an entry type.
 *
 * - With `search`: prefix-match on name (case-insensitive for ASCII only — SQLite LIKE is
 *   case-sensitive for non-ASCII characters), ordered by sort_order.
 * - Without `search`: recents first (labels used most recently via entry_label → entry),
 *   then labels with no history ordered by sort_order, all capped by `limit`.
 *
 * Default limit: 50.
 */
export async function getLabels(
  db: Db,
  entryTypeId: number,
  options?: { search?: string; limit?: number }
): Promise<Label[]> {
  const limit = options?.limit ?? 50;

  if (options?.search !== undefined) {
    const rows = await db.getAllAsync<LabelRaw>(
      `SELECT l.id, l.entry_type_id, l.name, l.parent_id, l.category_id,
              c.name AS category_name, l.sort_order
       FROM label l
       LEFT JOIN category c ON c.id = l.category_id
       WHERE l.entry_type_id = ?
         AND l.is_enabled = 1
         AND l.name LIKE ? || '%'
       ORDER BY l.sort_order ASC
       LIMIT ?`,
      [entryTypeId, options.search, limit]
    );
    return rows.map(mapLabel);
  }

  // Recents: labels that have been used, ordered by most-recently used.
  const recentRows = await db.getAllAsync<LabelRaw>(
    `SELECT
       l.id, l.entry_type_id, l.name, l.parent_id, l.category_id,
       c.name AS category_name, l.sort_order,
       MAX(e.timestamp) AS last_used
     FROM label l
     LEFT JOIN category c ON c.id = l.category_id
     JOIN entry_label el ON el.label_id = l.id
     JOIN entry e ON e.id = el.entry_id
     WHERE l.entry_type_id = ?
       AND l.is_enabled = 1
     GROUP BY l.id
     ORDER BY last_used DESC
     LIMIT ?`,
    [entryTypeId, limit]
  );

  const remaining = limit - recentRows.length;
  const recentIds = recentRows.map((r) => r.id);

  let fallbackRows: LabelRaw[] = [];
  if (remaining > 0) {
    // Fill with unused labels, ordered by sort_order.
    // We can't use a parameterised IN clause with a variable-length list in
    // most drivers, so we build it from the already-fetched IDs.
    const exclusionClause =
      recentIds.length > 0
        ? `AND l.id NOT IN (${recentIds.map(() => '?').join(',')})`
        : '';

    fallbackRows = await db.getAllAsync<LabelRaw>(
      `SELECT l.id, l.entry_type_id, l.name, l.parent_id, l.category_id,
              c.name AS category_name, l.sort_order
       FROM label l
       LEFT JOIN category c ON c.id = l.category_id
       WHERE l.entry_type_id = ?
         AND l.is_enabled = 1
         ${exclusionClause}
       ORDER BY l.sort_order ASC
       LIMIT ?`,
      [entryTypeId, ...recentIds, remaining]
    );
  }

  return [...recentRows, ...fallbackRows].map(mapLabel);
}

/**
 * Saves a new entry (source_type = 'log') inside a transaction.
 * Returns the new entry's auto-incremented ID.
 *
 * The `created_at` field is set to the same value as `timestamp` — the
 * wall-clock time at the moment of logging as captured by the UI.
 */
export async function saveEntry(db: Db, input: SaveEntryInput): Promise<number> {
  let newEntryId: number | undefined;

  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO entry (entry_type_id, source_type, timestamp, created_at, numeric_value, notes)
       VALUES (?, 'log', ?, ?, ?, ?)`,
      [
        input.entryTypeId,
        input.timestamp,
        input.timestamp, // created_at mirrors timestamp
        input.numericValue ?? null,
        input.notes ?? null,
      ]
    );

    newEntryId = result.lastInsertRowId;

    if (input.labelIds?.length) {
      const placeholders = input.labelIds.map(() => '(?, ?)').join(', ');
      const params = input.labelIds.flatMap((labelId) => [newEntryId, labelId]);
      await db.runAsync(
        `INSERT INTO entry_label (entry_id, label_id) VALUES ${placeholders}`,
        params
      );
    }
  });

  if (newEntryId === undefined) {
    throw new Error('saveEntry: transaction completed without setting newEntryId');
  }
  return newEntryId;
}

/**
 * Returns all entries in newest-first order, with their associated labels.
 *
 * Labels are accumulated in JS (group by entry ID) to avoid multiple round-trips.
 * Callers (e.g. Trace screen) should group by `localDate` for day sections.
 *
 * NOTE: No pagination for MVP. Add cursor-based pagination when entry count
 * exceeds ~1000 rows.
 */
export async function getEntriesForTrace(db: Db): Promise<EntryWithLabels[]> {
  const rows = await db.getAllAsync<EntryTraceRaw>(`
    SELECT
      e.id, e.entry_type_id, e.source_type, e.timestamp, e.numeric_value, e.notes,
      et.name AS entry_type_name, et.title AS entry_type_title, et.icon AS entry_type_icon,
      l.id AS label_id, l.name AS label_name, l.parent_id AS label_parent_id,
      l.category_id AS label_category_id, l.sort_order AS label_sort_order
    FROM entry e
    JOIN entry_type et ON et.id = e.entry_type_id
    LEFT JOIN entry_label el ON el.entry_id = e.id
    LEFT JOIN label l ON l.id = el.label_id
    ORDER BY e.timestamp DESC
  `);

  // Collapse flat rows into structured entries, preserving timestamp DESC order.
  const entryMap = new Map<number, EntryWithLabels>();
  const orderedIds: number[] = [];

  for (const row of rows) {
    if (!entryMap.has(row.id)) {
      orderedIds.push(row.id);
      entryMap.set(row.id, {
        id: row.id,
        entryTypeId: row.entry_type_id,
        entryTypeName: row.entry_type_name,
        entryTypeTitle: row.entry_type_title,
        entryTypeIcon: row.entry_type_icon,
        sourceType: row.source_type,
        timestamp: row.timestamp,
        // Slice the wall-clock date directly from the stored ISO string.
        // strftime('%Y-%m-%d', timestamp) in SQLite normalises to UTC first,
        // which gives the wrong date for users near midnight in non-UTC timezones.
        localDate: row.timestamp.slice(0, 10),
        numericValue: row.numeric_value,
        notes: row.notes,
        labels: [],
      });
    }

    if (row.label_id !== null) {
      entryMap.get(row.id)!.labels.push({
        id: row.label_id,
        entryTypeId: row.entry_type_id,
        name: row.label_name!,
        parentId: row.label_parent_id,
        categoryId: row.label_category_id,
        categoryName: null, // not joined in trace query; callers don't need it
        sortOrder: row.label_sort_order!,
      });
    }
  }

  return orderedIds.map((id) => entryMap.get(id)!);
}

/**
 * Creates a new custom label for the given entry type.
 *
 * Custom labels are user-created on the fly: no category, not a default seed
 * label, no seed_version. The inserted label is returned immediately.
 */
export async function createLabel(
  db: Db,
  entryTypeId: number,
  name: string
): Promise<Label> {
  const result = await db.runAsync(
    `INSERT INTO label (entry_type_id, name, category_id, is_default, is_enabled, sort_order, seed_version)
     VALUES (?, ?, NULL, 0, 1, 0, 0)`,
    [entryTypeId, name]
  );

  const raw = await db.getFirstAsync<LabelRaw>(
    `SELECT l.id, l.entry_type_id, l.name, l.parent_id, l.category_id,
            c.name AS category_name, l.sort_order
     FROM label l
     LEFT JOIN category c ON c.id = l.category_id
     WHERE l.id = ?`,
    [result.lastInsertRowId]
  );

  if (!raw) throw new Error('createLabel: could not fetch newly inserted label');
  return mapLabel(raw);
}

/**
 * Returns the sum of all Hydration numeric_value entries for a given local
 * date string (YYYY-MM-DD). Returns 0 if there are no entries for that date.
 */
export async function getDailyHydrationTotal(db: Db, localDateString: string): Promise<number> {
  const row = await db.getFirstAsync<HydrationTotalRaw>(
    `SELECT COALESCE(SUM(e.numeric_value), 0) AS total
     FROM entry e
     JOIN entry_type et ON et.id = e.entry_type_id
     WHERE et.name = 'Hydration'
       AND substr(e.timestamp, 1, 10) = ?`,
    [localDateString]
  );
  return row?.total ?? 0;
}
