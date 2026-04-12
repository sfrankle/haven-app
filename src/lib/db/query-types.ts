/**
 * Application-facing shapes returned by query functions in queries.ts.
 *
 * These are the types that screens and hooks consume — kept separate from the
 * low-level SQLite row types in schema-types.ts so callers never need to know
 * about column naming conventions.
 */

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
