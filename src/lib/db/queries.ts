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

import type { EntryType, Label, EntryWithLabels, SaveEntryInput, PhysicalStateLabel, Focus, FocusItem } from './query-types';
import { nowLocalIso } from '@/lib/utils/timestamp';

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
  label_parent_name: string | null;
  label_category_id: number | null;
  label_category_name: string | null;
  label_sort_order: number | null;
}

interface HydrationTotalRaw {
  total: number;
}

interface FocusRaw {
  id: number;
  name: string;
  description: string | null;
  archived: number; // INTEGER 0/1
  sort_order: number;
  created_at: string;
}

interface FocusItemRaw {
  label_id: number;
  label_name: string;
  entry_type_id: number;
  entry_type_name: string;
  entry_type_title: string;
  source: 'pinned' | 'historical';
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

function mapFocus(raw: FocusRaw): Focus {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    archived: raw.archived === 1,
    sortOrder: raw.sort_order,
    createdAt: raw.created_at,
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

  // Recents first (labels with history, newest-used first), then unused labels
  // by sort_order — all in one query via CASE on MAX(e.timestamp).
  const rows = await db.getAllAsync<LabelRaw>(
    `SELECT
       l.id, l.entry_type_id, l.name, l.parent_id, l.category_id,
       c.name AS category_name, l.sort_order
     FROM label l
     LEFT JOIN category c ON c.id = l.category_id
     LEFT JOIN entry_label el ON el.label_id = l.id
     LEFT JOIN entry e ON e.id = el.entry_id
     WHERE l.entry_type_id = ?
       AND l.is_enabled = 1
     GROUP BY l.id
     ORDER BY
       CASE WHEN MAX(e.timestamp) IS NOT NULL THEN 0 ELSE 1 END ASC,
       MAX(e.timestamp) DESC,
       l.sort_order ASC
     LIMIT ?`,
    [entryTypeId, limit]
  );

  return rows.map(mapLabel);
}

/**
 * Searches for labels by name prefix across all entry types simultaneously.
 *
 * Unlike `getLabels`, this function is not scoped to a single entry type —
 * it is intended for cross-entry-type pickers such as the Focus label picker.
 *
 * Results are ordered by sort_order ASC. Default limit: 50.
 */
export async function searchLabelsAcross(
  db: Db,
  search: string,
  limit: number = 50
): Promise<Label[]> {
  const rows = await db.getAllAsync<LabelRaw>(
    `SELECT l.id, l.entry_type_id, l.name, l.parent_id, l.category_id,
            c.name AS category_name, l.sort_order
     FROM label l
     LEFT JOIN category c ON c.id = l.category_id
     WHERE l.is_enabled = 1
       AND l.name LIKE ? || '%'
     ORDER BY l.sort_order ASC
     LIMIT ?`,
    [search, limit]
  );
  return rows.map(mapLabel);
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

    // Associate with a focus if provided. If focusId references a non-existent
    // focus, the FK constraint will throw here and roll back the entire transaction
    // (including the entry insert). Callers must ensure the focus exists first.
    if (input.focusId != null) {
      await db.runAsync(
        `INSERT INTO entry_focus (entry_id, focus_id) VALUES (?, ?)`,
        [newEntryId, input.focusId]
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
export async function getEntriesForTrace(
  db: Db,
  options?: { focusId?: number }
): Promise<EntryWithLabels[]> {
  const SELECT = `
    SELECT
      e.id, e.entry_type_id, e.source_type, e.timestamp, e.numeric_value, e.notes,
      et.name AS entry_type_name, et.title AS entry_type_title, et.icon AS entry_type_icon,
      l.id AS label_id, l.name AS label_name, l.parent_id AS label_parent_id,
      lp.name AS label_parent_name,
      l.category_id AS label_category_id, c.name AS label_category_name, l.sort_order AS label_sort_order
    FROM entry e
    JOIN entry_type et ON et.id = e.entry_type_id`;

  // Build two query strings to avoid any risk of conditional SQL injection.
  // The JOIN variant restricts results to entries linked to the given focus.
  const TAIL = `
    LEFT JOIN entry_label el ON el.entry_id = e.id
    LEFT JOIN label l ON l.id = el.label_id
    LEFT JOIN label lp ON lp.id = l.parent_id
    LEFT JOIN category c ON c.id = l.category_id
    -- TODO(Milestone 9): add GROUP BY routine_completion_id layer here for Routines grouping
    ORDER BY e.timestamp DESC`;

  const FILTERED_SQL = `${SELECT}
    JOIN entry_focus ef ON ef.entry_id = e.id AND ef.focus_id = ?${TAIL}`;

  const UNFILTERED_SQL = `${SELECT}${TAIL}`;

  const rows = await (options?.focusId != null
    ? db.getAllAsync<EntryTraceRaw>(FILTERED_SQL, [options.focusId])
    : db.getAllAsync<EntryTraceRaw>(UNFILTERED_SQL));

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
        parentName: row.label_parent_name,
        categoryName: row.label_category_name,
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
    // seed_version = 0 marks this as user-created; seed rows always use >= 1.
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
 * Returns all enabled labels whose parent_id matches the given parentId,
 * ordered by sort_order. Used by the emotion flow to fetch Tier-2 and
 * Tier-3 labels.
 */
export async function getLabelsByParent(db: Db, parentId: number): Promise<Label[]> {
  const rows = await db.getAllAsync<LabelRaw>(
    `SELECT l.id, l.entry_type_id, l.name, l.parent_id, l.category_id,
            c.name AS category_name, l.sort_order
     FROM label l
     LEFT JOIN category c ON c.id = l.category_id
     WHERE l.parent_id = ?
       AND l.is_enabled = 1
     ORDER BY l.sort_order ASC`,
    [parentId]
  );
  return rows.map(mapLabel);
}

/**
 * Returns all enabled Tier-1 (root-level) labels for the given emotion entry
 * type, ordered by sort_order. Tier-1 labels have parent_id IS NULL.
 */
export async function getTier1EmotionLabels(db: Db, entryTypeId: number): Promise<Label[]> {
  const rows = await db.getAllAsync<LabelRaw>(
    `SELECT l.id, l.entry_type_id, l.name, l.parent_id, l.category_id,
            c.name AS category_name, l.sort_order
     FROM label l
     LEFT JOIN category c ON c.id = l.category_id
     WHERE l.entry_type_id = ?
       AND l.parent_id IS NULL
       AND l.is_enabled = 1
     ORDER BY l.sort_order ASC`,
    [entryTypeId]
  );
  return rows.map(mapLabel);
}

/**
 * Returns only child labels (parent_id IS NOT NULL) for the Physical entry type.
 *
 * Joins to the parent label to include parentName for chip display formatting
 * (e.g. "Gut: Cramping"). The Energy parent label and all other root-level labels
 * are excluded.
 *
 * - With `search`: prefix-match on child name, ordered by sort_order.
 * - Without `search`: recents first, then unused by sort_order.
 *
 * Default limit: 50.
 */
export async function getPhysicalStateLabels(
  db: Db,
  entryTypeId: number,
  options?: { search?: string; limit?: number }
): Promise<PhysicalStateLabel[]> {
  const limit = options?.limit ?? 50;

  interface PhysicalStateRaw extends LabelRaw {
    parent_name: string | null;
  }

  const mapPhysicalStateLabel = (raw: PhysicalStateRaw): PhysicalStateLabel => ({
    ...mapLabel(raw),
    parentName: raw.parent_name ?? null,
  });

  if (options?.search !== undefined) {
    const rows = await db.getAllAsync<PhysicalStateRaw>(
      `SELECT l.id, l.entry_type_id, l.name, l.parent_id, l.category_id,
              c.name AS category_name, l.sort_order,
              p.name AS parent_name
       FROM label l
       LEFT JOIN category c ON c.id = l.category_id
       LEFT JOIN label p ON p.id = l.parent_id
       WHERE l.entry_type_id = ?
         AND (l.parent_id IS NOT NULL OR l.seed_version = 0)
         AND l.is_enabled = 1
         AND l.name LIKE ? || '%'
       ORDER BY l.sort_order ASC
       LIMIT ?`,
      [entryTypeId, options.search, limit]
    );
    return rows.map(mapPhysicalStateLabel);
  }

  const rows = await db.getAllAsync<PhysicalStateRaw>(
    `SELECT
       l.id, l.entry_type_id, l.name, l.parent_id, l.category_id,
       c.name AS category_name, l.sort_order,
       p.name AS parent_name
     FROM label l
     LEFT JOIN category c ON c.id = l.category_id
     LEFT JOIN label p ON p.id = l.parent_id
     LEFT JOIN entry_label el ON el.label_id = l.id
     LEFT JOIN entry e ON e.id = el.entry_id
     WHERE l.entry_type_id = ?
       AND (l.parent_id IS NOT NULL OR l.seed_version = 0)
       AND l.is_enabled = 1
     GROUP BY l.id
     ORDER BY
       CASE WHEN MAX(e.timestamp) IS NOT NULL THEN 0 ELSE 1 END ASC,
       MAX(e.timestamp) DESC,
       l.sort_order ASC
     LIMIT ?`,
    [entryTypeId, limit]
  );

  return rows.map(mapPhysicalStateLabel);
}

/**
 * Returns parent-level labels (parent_id IS NULL) for the Physical entry type.
 * Includes the Energy label and area labels (Head, Gut, etc.).
 * Needed to resolve the Energy label ID for save operations.
 */
export async function getPhysicalParentLabels(
  db: Db,
  entryTypeId: number
): Promise<Label[]> {
  const rows = await db.getAllAsync<LabelRaw>(
    `SELECT l.id, l.entry_type_id, l.name, l.parent_id, l.category_id,
            c.name AS category_name, l.sort_order
     FROM label l
     LEFT JOIN category c ON c.id = l.category_id
     WHERE l.entry_type_id = ?
       AND l.parent_id IS NULL
       AND l.is_enabled = 1
     ORDER BY l.sort_order ASC`,
    [entryTypeId]
  );
  return rows.map(mapLabel);
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

// ─── Focus query functions ────────────────────────────────────────────────────

/**
 * Returns all focuses ordered by sort_order ASC.
 * Archived focuses are excluded by default; pass `includeArchived: true` to include them.
 */
export async function getFocuses(
  db: Db,
  options?: { includeArchived?: boolean }
): Promise<Focus[]> {
  const sql = options?.includeArchived
    ? `SELECT id, name, description, archived, sort_order, created_at FROM focus ORDER BY archived ASC, sort_order ASC`
    : `SELECT id, name, description, archived, sort_order, created_at FROM focus WHERE archived = 0 ORDER BY sort_order ASC`;

  const rows = await db.getAllAsync<FocusRaw>(sql);
  return rows.map(mapFocus);
}

/**
 * Creates a new focus with an optional set of pinned label IDs.
 *
 * If `labelIds` is provided, corresponding `focus_label` rows are inserted
 * with `sort_order` equal to the array index.
 *
 * Returns the newly created Focus.
 */
export async function createFocus(
  db: Db,
  input: { name: string; labelIds?: number[] }
): Promise<Focus> {
  let focusId: number | undefined;

  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO focus (name, archived, sort_order, created_at) VALUES (?, 0, 0, ?)`,
      [input.name, nowLocalIso()]
    );
    focusId = result.lastInsertRowId;

    if (input.labelIds?.length) {
      for (let i = 0; i < input.labelIds.length; i++) {
        await db.runAsync(
          `INSERT INTO focus_label (focus_id, label_id, sort_order) VALUES (?, ?, ?)`,
          [focusId, input.labelIds[i], i]
        );
      }
    }
  });

  if (focusId === undefined) {
    throw new Error('createFocus: transaction completed without setting focusId');
  }

  const raw = await db.getFirstAsync<FocusRaw>(
    `SELECT id, name, description, archived, sort_order, created_at FROM focus WHERE id = ?`,
    [focusId]
  );
  if (!raw) throw new Error('createFocus: could not fetch newly inserted focus');
  return mapFocus(raw);
}

/**
 * Updates a focus's name and/or pinned labels.
 *
 * If `labelIds` is provided, existing `focus_label` rows are deleted and
 * replaced with the new set. Passing `labelIds: []` removes all pinned labels —
 * this is a valid operation, not a no-op.
 */
export async function updateFocus(
  db: Db,
  id: number,
  patch: { name?: string; labelIds?: number[] }
): Promise<void> {
  await db.withTransactionAsync(async () => {
    if (patch.name !== undefined) {
      await db.runAsync(`UPDATE focus SET name = ? WHERE id = ?`, [patch.name, id]);
    }

    if (patch.labelIds !== undefined) {
      await db.runAsync(`DELETE FROM focus_label WHERE focus_id = ?`, [id]);
      for (let i = 0; i < patch.labelIds.length; i++) {
        await db.runAsync(
          `INSERT INTO focus_label (focus_id, label_id, sort_order) VALUES (?, ?, ?)`,
          [id, patch.labelIds[i], i]
        );
      }
    }
  });
}

/**
 * Archives or unarchives a focus. Archived focuses are hidden from the
 * default getFocuses result but not deleted.
 */
export async function setFocusArchived(db: Db, id: number, archived: boolean): Promise<void> {
  await db.runAsync(`UPDATE focus SET archived = ? WHERE id = ?`, [archived ? 1 : 0, id]);
}

/**
 * Saves multiple entries in a single transaction. Returns the new entry IDs
 * in the same order as the inputs.
 *
 * This function intentionally inlines the insert logic from saveEntry rather
 * than calling saveEntry for each input. saveEntry wraps each call in its own
 * withTransactionAsync; nesting withTransactionAsync calls would throw
 * "cannot start a transaction within a transaction" in both expo-sqlite and
 * the BetterSqliteAdapter used in tests. If you add a new column to the entry
 * INSERT in saveEntry, make sure to mirror that change here.
 *
 * Each input follows the same logic as saveEntry:
 *   entry row → entry_label rows → entry_focus row (if focusId provided).
 */
export async function saveEntryBatch(db: Db, inputs: SaveEntryInput[]): Promise<number[]> {
  const ids: number[] = [];
  await db.withTransactionAsync(async () => {
    for (const input of inputs) {
      const result = await db.runAsync(
        `INSERT INTO entry (entry_type_id, source_type, timestamp, created_at, numeric_value, notes)
         VALUES (?, 'log', ?, ?, ?, ?)`,
        [input.entryTypeId, input.timestamp, input.timestamp, input.numericValue ?? null, input.notes ?? null]
      );
      const newId = result.lastInsertRowId;
      ids.push(newId);

      if (input.labelIds?.length) {
        const placeholders = input.labelIds.map(() => '(?, ?)').join(', ');
        await db.runAsync(
          `INSERT INTO entry_label (entry_id, label_id) VALUES ${placeholders}`,
          input.labelIds.flatMap((lid) => [newId, lid])
        );
      }

      // Associate with a focus if provided. If focusId references a non-existent
      // focus, the FK constraint will throw here and roll back the entire transaction.
      if (input.focusId != null) {
        await db.runAsync(
          `INSERT INTO entry_focus (entry_id, focus_id) VALUES (?, ?)`,
          [newId, input.focusId]
        );
      }
    }
  });
  return ids;
}

/**
 * Returns the items (labels) associated with a focus.
 *
 * Each item has a `source` of:
 * - `"pinned"` — explicitly added via focus_label
 * - `"historical"` — appeared in an entry associated with this focus (via entry_focus + entry_label)
 *   and NOT already in focus_label for this focus
 *
 * A label that is both pinned and historical appears once as `"pinned"`.
 */
export async function getFocusItems(db: Db, focusId: number): Promise<FocusItem[]> {
  const rows = await db.getAllAsync<FocusItemRaw>(
    `SELECT
       l.id            AS label_id,
       l.name          AS label_name,
       et.id           AS entry_type_id,
       et.name         AS entry_type_name,
       et.title        AS entry_type_title,
       'pinned'        AS source
     FROM focus_label fl
     JOIN label l      ON l.id = fl.label_id
     JOIN entry_type et ON et.id = l.entry_type_id
     WHERE fl.focus_id = ?
     UNION ALL
     SELECT DISTINCT
       l.id, l.name, et.id, et.name, et.title,
       'historical' AS source
     FROM entry_focus ef
     JOIN entry_label el ON el.entry_id = ef.entry_id
     JOIN label l        ON l.id = el.label_id
     JOIN entry_type et  ON et.id = l.entry_type_id
     WHERE ef.focus_id = ?
       AND NOT EXISTS (SELECT 1 FROM focus_label WHERE focus_id = ? AND label_id = l.id)`,
    [focusId, focusId, focusId]
  );

  return rows.map((r) => ({
    labelId: r.label_id,
    labelName: r.label_name,
    entryTypeId: r.entry_type_id,
    entryTypeName: r.entry_type_name,
    entryTypeTitle: r.entry_type_title,
    source: r.source,
  }));
}
