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

import type { EntryType, Label, EntryWithLabels, SaveEntryInput, PhysicalStateLabel, Focus, FocusItem, Routine, RoutineItem, RoutineItemInput, RoutineCompletionGroup, RoutineCompletionState, RoutineDayProgress } from './query-types';
import { nowLocalIso, getTimeBlock, getScheduleableBlocks } from '@/lib/utils/timestamp';
import type { ScheduleableBlock } from '@/lib/utils/timestamp';

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
  routine_completion_id: number | null;
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
 * The entry+label projection shared by every query that returns EntryTraceRaw
 * rows (getEntriesForTrace, getContextEntries, getRoutineCompletions).
 *
 * IMPORTANT: EntryTraceRaw and collapseTraceRows are shared by all three. If
 * you add a column here, every consumer picks it up — but if you instead add it
 * to one query's inline SELECT, the others compile cleanly and produce
 * `undefined` at runtime with no type error. Same shared-shape hazard called out
 * for saveEntry / saveEntryBatch. Pinned by getContextEntries.test.ts.
 */
const TRACE_ENTRY_SELECT = `
    SELECT
      e.id, e.entry_type_id, e.source_type, e.timestamp, e.numeric_value, e.notes,
      e.routine_completion_id,
      et.name AS entry_type_name, et.title AS entry_type_title, et.icon AS entry_type_icon,
      l.id AS label_id, l.name AS label_name, l.parent_id AS label_parent_id,
      lp.name AS label_parent_name,
      l.category_id AS label_category_id, c.name AS label_category_name, l.sort_order AS label_sort_order`;

/** The label LEFT JOINs that turn one entry into one row per associated label. */
const TRACE_LABEL_JOINS = `
    LEFT JOIN entry_label el ON el.entry_id = e.id
    LEFT JOIN label l ON l.id = el.label_id
    LEFT JOIN label lp ON lp.id = l.parent_id
    LEFT JOIN category c ON c.id = l.category_id`;

/**
 * Returns a comma-separated run of `n` bound-parameter placeholders.
 *
 * The only thing ever interpolated into a SQL string from a variable-length
 * list — derived solely from the list's *length*, never from any value. All IDs
 * stay bound parameters. See docs/decisions.md.
 */
function placeholders(n: number): string {
  return Array.from({ length: n }, () => '?').join(', ');
}

/**
 * Builds the focus-filtered Trace SQL for `count` focus IDs.
 *
 * Uses a `WHERE EXISTS` semi-join rather than widening the entry_focus JOIN to
 * `focus_id IN (...)`. A widening JOIN emits one row per entry×focus×label, and
 * collapseTraceRows appends labels unconditionally — so an entry matching two
 * active focuses would come back with every label duplicated. A semi-join
 * cannot multiply rows no matter how many focuses match, and still uses
 * idx_entry_focus_focus_id. See docs/decisions.md.
 */
function buildFilteredTraceSql(count: number): string {
  return `${TRACE_ENTRY_SELECT}
    FROM entry e
    JOIN entry_type et ON et.id = e.entry_type_id${TRACE_LABEL_JOINS}
    WHERE EXISTS (
      SELECT 1 FROM entry_focus ef
      WHERE ef.entry_id = e.id AND ef.focus_id IN (${placeholders(count)})
    )
    ORDER BY e.timestamp DESC`;
}

/**
 * Returns all entries in newest-first order, with their associated labels.
 *
 * `focusIds` filters with OR semantics: an entry is returned when it belongs to
 * *any* of the given focuses. An empty array (or an omitted option) means no
 * filter at all — this is the state right after the user deselects their last
 * pill, and it must not build an `IN ()`, which is a SQLite syntax error.
 *
 * Labels are accumulated in JS (group by entry ID) to avoid multiple round-trips.
 * Callers (e.g. Trace screen) should group by `localDate` for day sections.
 *
 * Routine grouping is deliberately *not* done here — no GROUP BY. The fan-out
 * this query produces is the very thing collapseTraceRows exists to undo, and
 * grouping needs set arithmetic against a separate query. See buildTraceItems
 * in traceUtils and docs/decisions.md.
 *
 * NOTE: No pagination for MVP. Add cursor-based pagination when entry count
 * exceeds ~1000 rows.
 */
export async function getEntriesForTrace(
  db: Db,
  options?: { focusIds?: number[] }
): Promise<EntryWithLabels[]> {
  const UNFILTERED_SQL = `${TRACE_ENTRY_SELECT}
    FROM entry e
    JOIN entry_type et ON et.id = e.entry_type_id${TRACE_LABEL_JOINS}
    ORDER BY e.timestamp DESC`;

  const focusIds = options?.focusIds ?? [];

  const rows = await (focusIds.length > 0
    ? db.getAllAsync<EntryTraceRaw>(buildFilteredTraceSql(focusIds.length), focusIds)
    : db.getAllAsync<EntryTraceRaw>(UNFILTERED_SQL));

  return collapseTraceRows(rows);
}

/**
 * Maps one EntryTraceRaw row to a label-less EntryWithLabels.
 *
 * Shared by every collapser over EntryTraceRaw so the field list exists once.
 */
function mapTraceRowToEntry(row: EntryTraceRaw): EntryWithLabels {
  return {
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
    routineCompletionId: row.routine_completion_id,
    labels: [],
  };
}

/** Maps the label columns of an EntryTraceRaw row. Call only when label_id is non-null. */
function mapTraceRowToLabel(row: EntryTraceRaw): Label {
  return {
    id: row.label_id!,
    entryTypeId: row.entry_type_id,
    name: row.label_name!,
    parentId: row.label_parent_id,
    categoryId: row.label_category_id,
    parentName: row.label_parent_name,
    categoryName: row.label_category_name,
    sortOrder: row.label_sort_order!,
  };
}

/**
 * Collapses an array of flat EntryTraceRaw rows (one row per entry+label join)
 * into an array of EntryWithLabels, preserving the original row order for the
 * first occurrence of each entry ID.
 *
 * This helper is shared by getEntriesForTrace and getContextEntries.
 *
 * Labels are appended unconditionally, so the caller's SQL must never emit an
 * entry×label pair more than once — see buildFilteredTraceSql for why the focus
 * filter is a semi-join rather than a widened JOIN.
 */
function collapseTraceRows(rows: EntryTraceRaw[]): EntryWithLabels[] {
  const entryMap = new Map<number, EntryWithLabels>();
  const orderedIds: number[] = [];

  for (const row of rows) {
    if (!entryMap.has(row.id)) {
      orderedIds.push(row.id);
      entryMap.set(row.id, mapTraceRowToEntry(row));
    }

    if (row.label_id !== null) {
      entryMap.get(row.id)!.labels.push(mapTraceRowToLabel(row));
    }
  }

  return orderedIds.map((id) => entryMap.get(id)!);
}

/**
 * Returns entries within a time window around a focal entry, ordered ASC by
 * timestamp. The focal entry itself is excluded.
 *
 * The caller is responsible for computing afterIso and beforeIso (e.g. using
 * dayjs) so that this function stays free of time arithmetic and is easy to test.
 *
 * No focus filter is applied — context entries are all entries in the window
 * regardless of focus association.
 */
export async function getContextEntries(
  db: Db,
  params: { excludeEntryId: number; afterIso: string; beforeIso: string }
): Promise<EntryWithLabels[]> {
  const { excludeEntryId, afterIso, beforeIso } = params;

  const rows = await db.getAllAsync<EntryTraceRaw>(
    `${TRACE_ENTRY_SELECT}
     FROM entry e
     JOIN entry_type et ON et.id = e.entry_type_id${TRACE_LABEL_JOINS}
     WHERE e.timestamp >= ? AND e.timestamp <= ? AND e.id != ?
     ORDER BY e.timestamp ASC`,
    [afterIso, beforeIso, excludeEntryId]
  );

  return collapseTraceRows(rows);
}

interface RoutineCompletionRaw extends EntryTraceRaw {
  completion_id: number;
  completion_created_at: string;
  routine_id: number;
  routine_name: string;
}

/**
 * Returns the Routine completions identified by `completionIds`, each with
 * **all** of its member entries — including entries that an active Trace filter
 * excluded, so the expanded group can render non-matching members muted.
 *
 * This is presentation-only enrichment: every entry described here is already
 * present in the getEntriesForTrace result. Callers must treat a failure as
 * "render ungrouped", never as a load error — see useTraceEntries.
 *
 * `routine` is joined via `routine_completion.routine_id`, not `entry.routine_id`:
 * the latter is ON DELETE SET NULL and could be null while the completion survives.
 */
export async function getRoutineCompletions(
  db: Db,
  completionIds: number[]
): Promise<RoutineCompletionGroup[]> {
  if (completionIds.length === 0) return [];

  const rows = await db.getAllAsync<RoutineCompletionRaw>(
    `${TRACE_ENTRY_SELECT},
      rc.id AS completion_id, rc.created_at AS completion_created_at,
      r.id AS routine_id, r.name AS routine_name
     FROM entry e
     JOIN routine_completion rc ON rc.id = e.routine_completion_id
     JOIN routine r ON r.id = rc.routine_id
     JOIN entry_type et ON et.id = e.entry_type_id${TRACE_LABEL_JOINS}
     WHERE e.routine_completion_id IN (${placeholders(completionIds.length)})
     ORDER BY rc.created_at DESC, e.timestamp ASC, e.id ASC`,
    completionIds
  );

  const groups = new Map<number, RoutineCompletionGroup>();
  const orderedCompletionIds: number[] = [];
  // Entry IDs are unique across the whole result, so one map is enough to
  // dedupe the entry×label fan-out before bucketing by completion.
  const entries = new Map<number, EntryWithLabels>();

  for (const row of rows) {
    if (!groups.has(row.completion_id)) {
      orderedCompletionIds.push(row.completion_id);
      groups.set(row.completion_id, {
        completionId: row.completion_id,
        routineId: row.routine_id,
        routineName: row.routine_name,
        completedAt: row.completion_created_at,
        // Same wall-clock-slice rule as entries — never strftime.
        localDate: row.completion_created_at.slice(0, 10),
        entries: [],
      });
    }

    if (!entries.has(row.id)) {
      const entry = mapTraceRowToEntry(row);
      entries.set(row.id, entry);
      groups.get(row.completion_id)!.entries.push(entry);
    }

    if (row.label_id !== null) {
      entries.get(row.id)!.labels.push(mapTraceRowToLabel(row));
    }
  }

  return orderedCompletionIds.map((id) => groups.get(id)!);
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
 * Returns a single focus by ID, or null if not found.
 */
export async function getFocusById(db: Db, id: number): Promise<Focus | null> {
  const raw = await db.getFirstAsync<FocusRaw>(
    `SELECT id, name, description, archived, sort_order, created_at FROM focus WHERE id = ?`,
    [id]
  );
  return raw ? mapFocus(raw) : null;
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
      // NOTE: If you add a new column to the entry INSERT in saveEntry, mirror it here.
      // Also mirror any new columns in completeRoutine's entry INSERT below.
      const result = await db.runAsync(
        `INSERT INTO entry (entry_type_id, source_type, timestamp, created_at, numeric_value, notes, routine_id, routine_completion_id)
         VALUES (?, 'log', ?, ?, ?, ?, ?, ?)`,
        [
          input.entryTypeId,
          input.timestamp,
          input.timestamp,
          input.numericValue ?? null,
          input.notes ?? null,
          input.routineId ?? null,
          input.routineCompletionId ?? null,
        ]
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

// ─── Routine query functions ──────────────────────────────────────────────────

// Raw row shapes (internal only)

interface RoutineRaw {
  id: number;
  name: string;
  associated_focus_id: number | null;
  frequency_note: string | null;
  sort_order: number;
  archived: number; // INTEGER 0/1
  created_at: string;
  updated_at: string;
  time_block: string | null; // null when no routine_time_block rows exist for this routine
}

interface RoutineItemRaw {
  id: number;
  routine_id: number;
  name: string;
  entry_type_id: number;
  entry_type_name: string;
  entry_type_title: string;
  prescribed_detail: string | null;
  instruction_note: string | null;
  sort_order: number;
  // Mapping note: this column comes from routine_entry_type_label; null when no labels on item.
  label_id: number | null;
}

/**
 * Returns the [startHour, endHour) for a given ScheduleableBlock.
 * Mirrors the exact boundaries in getTimeBlock (timestamp.ts):
 *   Morning:   05:00–11:59 → [5, 12)
 *   Midday:    12:00–13:59 → [12, 14)
 *   Afternoon: 14:00–17:59 → [14, 18)
 *   Evening:   18:00–21:59 → [18, 22)
 *
 * This function is the canonical source of block hour boundaries for the query
 * layer. Keep it in sync with getTimeBlock in timestamp.ts.
 */
function timeBlockWindow(block: ScheduleableBlock): [number, number] {
  switch (block) {
    case 'Morning':   return [5, 12];
    case 'Midday':    return [12, 14];
    case 'Afternoon': return [14, 18];
    case 'Evening':   return [18, 22];
  }
}

/**
 * Returns all routines, ordered by archived ASC, sort_order ASC.
 * Archived routines are excluded by default; pass `includeArchived: true` to include them.
 *
 * timeBlocks are loaded via LEFT JOIN on routine_time_block and collapsed in JS.
 */
export async function getRoutines(
  db: Db,
  options?: { includeArchived?: boolean }
): Promise<Routine[]> {
  const sql = options?.includeArchived
    ? `SELECT r.id, r.name, r.associated_focus_id, r.frequency_note, r.sort_order,
              r.archived, r.created_at, r.updated_at, rtb.time_block
       FROM routine r
       LEFT JOIN routine_time_block rtb ON rtb.routine_id = r.id
       ORDER BY r.archived ASC, r.sort_order ASC`
    : `SELECT r.id, r.name, r.associated_focus_id, r.frequency_note, r.sort_order,
              r.archived, r.created_at, r.updated_at, rtb.time_block
       FROM routine r
       LEFT JOIN routine_time_block rtb ON rtb.routine_id = r.id
       WHERE r.archived = 0
       ORDER BY r.sort_order ASC`;

  const rows = await db.getAllAsync<RoutineRaw>(sql);

  // Collapse rows: one row per routine+time_block JOIN; aggregate time_blocks per routine.
  const SCHEDULEABLE: readonly string[] = ['Morning', 'Midday', 'Afternoon', 'Evening'];
  const routineMap = new Map<number, Routine>();
  const orderedIds: number[] = [];

  for (const row of rows) {
    if (!routineMap.has(row.id)) {
      orderedIds.push(row.id);
      routineMap.set(row.id, {
        id: row.id,
        name: row.name,
        associatedFocusId: row.associated_focus_id,
        frequencyNote: row.frequency_note,
        sortOrder: row.sort_order,
        archived: row.archived === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        timeBlocks: [],
      });
    }
    if (row.time_block !== null && SCHEDULEABLE.includes(row.time_block)) {
      routineMap.get(row.id)!.timeBlocks.push(row.time_block as ScheduleableBlock);
    }
  }

  return orderedIds.map((id) => routineMap.get(id)!);
}

/**
 * Creates a new routine with optional time blocks.
 * Returns the newly created Routine.
 */
export async function createRoutine(
  db: Db,
  input: {
    name: string;
    timeBlocks?: ScheduleableBlock[];
    associatedFocusId?: number;
    frequencyNote?: string;
    items?: RoutineItemInput[];
  }
): Promise<Routine> {
  let routineId: number | undefined;
  const now = nowLocalIso();

  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO routine (name, associated_focus_id, frequency_note, sort_order, archived, created_at, updated_at)
       VALUES (?, ?, ?, 0, 0, ?, ?)`,
      [
        input.name,
        input.associatedFocusId ?? null,
        input.frequencyNote ?? null,
        now,
        now,
      ]
    );
    routineId = result.lastInsertRowId;

    for (const block of input.timeBlocks ?? []) {
      await db.runAsync(
        `INSERT INTO routine_time_block (routine_id, time_block) VALUES (?, ?)`,
        [routineId, block]
      );
    }

    if (input.items?.length) {
      await insertRoutineItems(db, routineId, input.items);
    }
  });

  if (routineId === undefined) {
    throw new Error('createRoutine: transaction completed without setting routineId');
  }

  const routines = await getRoutines(db, { includeArchived: true });
  const routine = routines.find((r) => r.id === routineId);
  if (!routine) throw new Error('createRoutine: could not fetch newly inserted routine');
  return routine;
}

/**
 * Updates a routine's name, time blocks, associatedFocusId, or frequencyNote.
 *
 * If timeBlocks is provided (including an empty array), existing routine_time_block
 * rows are deleted and replaced — passing [] removes all time blocks.
 *
 * An empty patch is a no-op.
 */
export async function updateRoutine(
  db: Db,
  id: number,
  patch: {
    name?: string;
    timeBlocks?: ScheduleableBlock[];
    associatedFocusId?: number | null;
    frequencyNote?: string | null;
  }
): Promise<void> {
  await db.withTransactionAsync(async () => {
    const now = nowLocalIso();

    if (patch.name !== undefined) {
      await db.runAsync(
        `UPDATE routine SET name = ?, updated_at = ? WHERE id = ?`,
        [patch.name, now, id]
      );
    }

    if (patch.associatedFocusId !== undefined) {
      await db.runAsync(
        `UPDATE routine SET associated_focus_id = ?, updated_at = ? WHERE id = ?`,
        [patch.associatedFocusId, now, id]
      );
    }

    if (patch.frequencyNote !== undefined) {
      await db.runAsync(
        `UPDATE routine SET frequency_note = ?, updated_at = ? WHERE id = ?`,
        [patch.frequencyNote, now, id]
      );
    }

    if (patch.timeBlocks !== undefined) {
      await db.runAsync(`DELETE FROM routine_time_block WHERE routine_id = ?`, [id]);
      for (const block of patch.timeBlocks) {
        await db.runAsync(
          `INSERT INTO routine_time_block (routine_id, time_block) VALUES (?, ?)`,
          [id, block]
        );
      }
      await db.runAsync(`UPDATE routine SET updated_at = ? WHERE id = ?`, [now, id]);
    }
  });
}

/**
 * Archives or unarchives a routine. Archived routines are hidden from the
 * default getRoutines result but not deleted.
 */
export async function setRoutineArchived(db: Db, id: number, archived: boolean): Promise<void> {
  await db.runAsync(
    `UPDATE routine SET archived = ?, updated_at = ? WHERE id = ?`,
    [archived ? 1 : 0, nowLocalIso(), id]
  );
}

/**
 * Returns the items (routine_entry_type rows) for a given routine, in sort_order order.
 *
 * Note on naming: the public type is RoutineItem for a clean API, but the
 * underlying SQL table is routine_entry_type (not routine_item).
 *
 * labelIds are accumulated in JS from routine_entry_type_label rows via LEFT JOIN.
 */
export async function getRoutineItems(db: Db, routineId: number): Promise<RoutineItem[]> {
  const rows = await db.getAllAsync<RoutineItemRaw>(
    `SELECT
       ret.id, ret.routine_id, ret.name,
       ret.entry_type_id, et.name AS entry_type_name, et.title AS entry_type_title,
       ret.prescribed_detail, ret.instruction_note, ret.sort_order,
       retl.label_id
     FROM routine_entry_type ret
     JOIN entry_type et ON et.id = ret.entry_type_id
     LEFT JOIN routine_entry_type_label retl ON retl.routine_entry_type_id = ret.id
     WHERE ret.routine_id = ?
     ORDER BY ret.sort_order ASC`,
    [routineId]
  );

  // Collapse rows: one row per item+label JOIN; aggregate label_ids per item.
  const itemMap = new Map<number, RoutineItem>();
  const orderedIds: number[] = [];

  for (const row of rows) {
    if (!itemMap.has(row.id)) {
      orderedIds.push(row.id);
      itemMap.set(row.id, {
        id: row.id,
        routineId: row.routine_id,
        name: row.name,
        entryTypeId: row.entry_type_id,
        entryTypeName: row.entry_type_name,
        entryTypeTitle: row.entry_type_title,
        prescribedDetail: row.prescribed_detail,
        instructionNote: row.instruction_note,
        sortOrder: row.sort_order,
        labelIds: [],
      });
    }
    if (row.label_id !== null) {
      itemMap.get(row.id)!.labelIds.push(row.label_id);
    }
  }

  return orderedIds.map((id) => itemMap.get(id)!);
}

/**
 * Derives the completion state for a routine at a given time block and date.
 *
 * @param db        - DB handle
 * @param routineId - Routine to check
 * @param timeBlock - Current ScheduleableBlock
 * @param today     - YYYY-MM-DD string (injectable for tests — same pattern as formatEntryDate)
 *
 * Returns:
 *   'fully_done'          — total completions today >= total configured blocks
 *   'completed_this_block' — a completion row exists today within this block's hour window
 *   'due'                 — none of the above
 *
 * Completions are counted from routine_completion rows directly (not via
 * entry.routine_completion_id join) to avoid N-per-item overcounting.
 * Hour comparison uses substr(created_at, 12, 2) to read wall-clock hour from
 * the stored ISO string — consistent with the wall-clock-preservation invariant
 * throughout Haven (immune to timezone re-interpretation).
 */
export async function getRoutineCompletionState(
  db: Db,
  routineId: number,
  timeBlock: ScheduleableBlock,
  today: string
): Promise<RoutineCompletionState> {
  // 1. Count today's completions
  const todayCompletions = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM routine_completion
     WHERE routine_id = ? AND substr(created_at, 1, 10) = ?`,
    [routineId, today]
  );
  const completionCount = todayCompletions?.cnt ?? 0;

  // 2. Count configured time blocks
  const configuredBlocks = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM routine_time_block WHERE routine_id = ?`,
    [routineId]
  );
  const blockCount = configuredBlocks?.cnt ?? 0;

  // 3. fully_done check: completions today >= configured block count (and blocks exist)
  if (blockCount > 0 && completionCount >= blockCount) return 'fully_done';

  // 4. completed_this_block: did any completion fall within this block's hour window?
  const [startHour, endHour] = timeBlockWindow(timeBlock);
  const blockCompletion = await db.getFirstAsync<{ cnt: number }>(
    `SELECT COUNT(*) AS cnt FROM routine_completion
     WHERE routine_id = ?
       AND substr(created_at, 1, 10) = ?
       AND CAST(substr(created_at, 12, 2) AS INTEGER) >= ?
       AND CAST(substr(created_at, 12, 2) AS INTEGER) < ?`,
    [routineId, today, startHour, endHour]
  );
  if ((blockCompletion?.cnt ?? 0) > 0) return 'completed_this_block';

  return 'due';
}

/**
 * Batched, display-only read of today's completions for a set of routines.
 *
 * Answers "what do we print on the card" — the completion count and which
 * blocks are already done. getRoutineCompletionState answers the separate
 * question of which dashboard bucket a routine belongs in; the two are kept
 * apart so this ticket does not reshape that tested API.
 *
 * Night completions are counted in completionCount but excluded from
 * completedBlocks, because Night is not a scheduleable block.
 *
 * Every requested id appears in the returned map, with a zeroed entry when the
 * routine has no completions today.
 */
export async function getRoutineDayProgress(
  db: Db,
  routineIds: number[],
  today: string
): Promise<Record<number, RoutineDayProgress>> {
  if (routineIds.length === 0) return {};

  const placeholders = routineIds.map(() => '?').join(',');
  const rows = await db.getAllAsync<{ routine_id: number; created_at: string }>(
    `SELECT routine_id, created_at FROM routine_completion
     WHERE routine_id IN (${placeholders}) AND substr(created_at, 1, 10) = ?`,
    [...routineIds, today]
  );

  // Seed every requested id so callers never have to handle a missing key.
  const tally = new Map<number, { count: number; blocks: Set<ScheduleableBlock> }>();
  for (const id of routineIds) {
    tally.set(id, { count: 0, blocks: new Set() });
  }

  for (const row of rows) {
    const entry = tally.get(row.routine_id);
    if (entry === undefined) continue;
    entry.count += 1;
    const block = getTimeBlock(row.created_at);
    if (block !== 'Night') {
      entry.blocks.add(block);
    }
  }

  const scheduleable = getScheduleableBlocks();
  const result: Record<number, RoutineDayProgress> = {};
  for (const [id, { count, blocks }] of tally) {
    result[id] = {
      completionCount: count,
      completedBlocks: scheduleable.filter((b) => blocks.has(b)),
    };
  }

  return result;
}

/**
 * Inserts routine_entry_type rows (and their routine_entry_type_label rows)
 * for a given routine, inside a single transaction.
 *
 * sort_order is set to the array index of each item. Editing the prescribed
 * detail on a future save (via replaceRoutineItems) only affects future
 * completions — past entry rows are never touched.
 *
 * Returns void.
 */
export async function createRoutineItems(
  db: Db,
  routineId: number,
  items: RoutineItemInput[]
): Promise<void> {
  if (items.length === 0) return;

  await db.withTransactionAsync(async () => {
    await insertRoutineItems(db, routineId, items);
  });
}

/**
 * Internal helper: inserts a sequence of routine_entry_type rows and their
 * routine_entry_type_label rows. Must run inside a transaction.
 */
async function insertRoutineItems(
  db: Db,
  routineId: number,
  items: RoutineItemInput[]
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const now = nowLocalIso();
    const result = await db.runAsync(
      `INSERT INTO routine_entry_type
         (routine_id, name, entry_type_id, prescribed_detail, instruction_note, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        routineId,
        item.name,
        item.entryTypeId,
        item.prescribedDetail ?? null,
        item.instructionNote ?? null,
        i,
        now,
        now,
      ]
    );
    const itemId = result.lastInsertRowId;

    if (item.labelIds?.length) {
      for (const labelId of item.labelIds) {
        await db.runAsync(
          `INSERT INTO routine_entry_type_label (routine_entry_type_id, label_id) VALUES (?, ?)`,
          [itemId, labelId]
        );
      }
    }
  }
}

/**
 * Replaces all routine_entry_type rows for a given routine with a new set.
 *
 * Deletes all existing routine_entry_type rows (CASCADE deletes
 * routine_entry_type_label rows automatically), then re-inserts from the
 * input array. Runs inside a transaction.
 *
 * This is a full-replace strategy — item IDs change on every save, which is
 * acceptable because nothing downstream relies on stable item IDs yet. If
 * per-item completion tracking is introduced in a future ticket, this will
 * need to change to a delta approach.
 *
 * Returns void.
 */
export async function replaceRoutineItems(
  db: Db,
  routineId: number,
  items: RoutineItemInput[]
): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `DELETE FROM routine_entry_type WHERE routine_id = ?`,
      [routineId]
    );
    await insertRoutineItems(db, routineId, items);
  });
}

/**
 * Records a single routine completion session in a single atomic transaction.
 *
 * Steps:
 *   1. INSERT a routine_completion row (capturing the completion event itself).
 *   2. For each checked item, INSERT an entry row with routine_id and
 *      routine_completion_id set, entry_label rows for each labelId, and an
 *      entry_focus row if associatedFocusId is non-null.
 *
 * The shared `notes` value is stored on every entry row. The per-item
 * prescribedDetail is display-only on the complete screen and is NOT persisted
 * to entry — the entry's label associations capture what was recorded.
 *
 * Returns the newly created routine_completion.id.
 */
export async function completeRoutine(
  db: Db,
  input: {
    routineId: number;
    associatedFocusId: number | null;
    checkedItems: {
      entryTypeId: number;
      labelIds: number[];
    }[];
    notes: string | null;
    timestamp: string; // ISO-8601 wall-clock from nowLocalIso()
  }
): Promise<number> {
  let completionId: number | undefined;

  await db.withTransactionAsync(async () => {
    // 1. Insert the routine_completion row for this session.
    const completionResult = await db.runAsync(
      `INSERT INTO routine_completion (routine_id, created_at) VALUES (?, ?)`,
      [input.routineId, input.timestamp]
    );
    completionId = completionResult.lastInsertRowId;

    // 2. Insert one entry per checked item.
    for (const item of input.checkedItems) {
      const entryResult = await db.runAsync(
        `INSERT INTO entry (entry_type_id, source_type, timestamp, created_at, numeric_value, notes, routine_id, routine_completion_id)
         VALUES (?, 'log', ?, ?, NULL, ?, ?, ?)`,
        [
          item.entryTypeId,
          input.timestamp,
          input.timestamp,
          input.notes,
          input.routineId,
          completionId,
        ]
      );
      const entryId = entryResult.lastInsertRowId;

      if (item.labelIds.length > 0) {
        const placeholders = item.labelIds.map(() => '(?, ?)').join(', ');
        await db.runAsync(
          `INSERT INTO entry_label (entry_id, label_id) VALUES ${placeholders}`,
          item.labelIds.flatMap((lid) => [entryId, lid])
        );
      }

      if (input.associatedFocusId != null) {
        await db.runAsync(
          `INSERT INTO entry_focus (entry_id, focus_id) VALUES (?, ?)`,
          [entryId, input.associatedFocusId]
        );
      }
    }
  });

  if (completionId === undefined) {
    throw new Error('completeRoutine: transaction completed without setting completionId');
  }
  return completionId;
}
