/**
 * Application-facing shapes returned by query functions in queries.ts.
 *
 * These are the types that screens and hooks consume — kept separate from the
 * low-level SQLite row types in schema-types.ts so callers never need to know
 * about column naming conventions.
 */

import type { ScheduleableBlock } from '@/lib/utils/timestamp';

export interface EntryType {
  id: number;
  name: string;
  title: string;
  icon: string | null;
  prompt: string | null;
  measurementType: 'numeric' | 'label_select' | 'label_select_severity';
}

export interface Label {
  id: number;
  entryTypeId: number;
  name: string;
  parentId: number | null;
  /** Populated only when the query JOINs the parent label row (e.g. physical state queries). Absent on most label queries. */
  parentName?: string | null;
  categoryId: number | null;
  categoryName: string | null;
  sortOrder: number;
}

export interface EntryWithLabels {
  id: number;
  entryTypeId: number;
  entryTypeName: string;
  entryTypeTitle: string;
  entryTypeIcon: string | null;
  sourceType: 'log' | 'reflect';
  timestamp: string; // ISO-8601
  localDate: string; // YYYY-MM-DD, sliced from the stored timestamp wall-clock date component
  numericValue: number | null;
  notes: string | null;
  labels: Label[];
}

/**
 * A physical state label (child label) that includes the parent label's name
 * for chip display formatting (e.g. "Gut: Cramping").
 */
export interface PhysicalStateLabel extends Label {
  parentName: string | null;
}

export interface SaveEntryInput {
  entryTypeId: number;
  timestamp: string; // ISO-8601
  numericValue?: number;
  notes?: string;
  labelIds?: number[];
  focusId?: number;
  /** Optional FK to a routine that triggered this entry. Nullable in schema (ON DELETE SET NULL). */
  routineId?: number;
  /** Optional FK to the specific routine_completion row. Nullable in schema (ON DELETE SET NULL). */
  routineCompletionId?: number;
}

export interface Focus {
  id: number;
  name: string;
  description: string | null;
  archived: boolean; // stored as INTEGER 0/1 — mapped in query
  sortOrder: number;
  createdAt: string; // ISO-8601
}

export interface FocusLabel {
  focusId: number;
  labelId: number;
  labelName: string;
  entryTypeId: number;
  entryTypeName: string;
  sortOrder: number;
}

/**
 * A single "item" associated with a focus — either a pinned label
 * (from focus_label) or a historically-associated label (from entry_focus
 * + entry_label). Both surface entry type info for display.
 */
export interface FocusItem {
  labelId: number;
  labelName: string;
  entryTypeId: number;
  entryTypeName: string;
  entryTypeTitle: string;
  /** "pinned" = explicitly added to focus_label; "historical" = appeared in an associated entry */
  source: 'pinned' | 'historical';
}

// Re-export ScheduleableBlock so callers can import it from query-types if needed.
export type { ScheduleableBlock };

export interface Routine {
  id: number;
  name: string;
  associatedFocusId: number | null;
  frequencyNote: string | null;
  sortOrder: number;
  archived: boolean; // stored as INTEGER 0/1 — mapped in query
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
  timeBlocks: ScheduleableBlock[]; // loaded via JOIN on routine_time_block
}

/**
 * A single item within a routine.
 *
 * Note on naming: the public type is called RoutineItem for a clean API, but
 * the underlying SQL table is routine_entry_type (not routine_item). The
 * getRoutineItems query handles this mapping transparently.
 */
export interface RoutineItem {
  id: number;
  routineId: number;
  name: string;
  entryTypeId: number;
  entryTypeName: string;
  entryTypeTitle: string;
  prescribedDetail: string | null;
  instructionNote: string | null;
  sortOrder: number;
  labelIds: number[]; // from routine_entry_type_label
}

export type RoutineCompletionState = 'due' | 'completed_this_block' | 'fully_done';

/**
 * Display-only view of a Routine's completions for a single day.
 *
 * Deliberately separate from RoutineCompletionState: that enum answers "which
 * dashboard bucket does this Routine go in", this answers "what do we print on
 * the card". Keeping them apart leaves getRoutineCompletionState's tested API
 * untouched. A future refactor could derive one from the other.
 */
export interface RoutineDayProgress {
  /** Total routine_completion rows for this routine today. Never clamped. */
  completionCount: number;
  /** Scheduleable blocks in which at least one completion landed today, in block order. */
  completedBlocks: ScheduleableBlock[];
}


/**
 * Input shape for creating or replacing routine items (routine_entry_type rows).
 * Used by createRoutineItems and replaceRoutineItems.
 */
export interface RoutineItemInput {
  name: string;
  entryTypeId: number;
  labelIds?: number[];
  prescribedDetail?: string | null;
  instructionNote?: string | null;
}
