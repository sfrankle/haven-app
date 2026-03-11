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
  measurementType: string; // 'numeric' | 'label_select' | 'label_select_severity'
}

export interface Label {
  id: number;
  entryTypeId: number;
  name: string;
  parentId: number | null;
  categoryId: number | null;
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
  localDate: string; // YYYY-MM-DD, derived from timestamp in SQLite via strftime
  numericValue: number | null;
  notes: string | null;
  labels: Label[];
}

export interface SaveEntryInput {
  entryTypeId: number;
  timestamp: string; // ISO-8601
  numericValue?: number;
  notes?: string;
  labelIds?: number[];
}
