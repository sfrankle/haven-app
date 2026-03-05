/** SQLite stores booleans as integers. 0 = false, 1 = true. */
export type SQLiteBoolean = 0 | 1;

export interface MeasurementTypeRow {
  id: number;
  name: string;
  display_name: string;
}

export interface CategoryRow {
  id: number;
  name: string;
}

export interface EntryTypeRow {
  id: number;
  name: string;
  measurement_type_id: number | null;
  prompt: string | null;
  icon: string | null;
  is_enabled: SQLiteBoolean;
  is_default: SQLiteBoolean;
  sort_order: number;
}

export interface LabelRow {
  id: number;
  entry_type_id: number;
  name: string;
  parent_id: number | null;
  category_id: number | null;
  is_default: SQLiteBoolean;
  is_enabled: SQLiteBoolean;
  sort_order: number;
  seed_version: number;
}

export interface TagRow {
  id: number;
  name: string;
  tag_group: string | null;
  seed_version: number;
}

export interface LabelTagRow {
  label_id: number;
  tag_id: number;
  seed_version: number;
}

export interface EntryRow {
  id: number;
  entry_type_id: number;
  source_type: 'log' | 'reflect';
  timestamp: string;
  created_at: string;
  numeric_value: number | null;
  notes: string | null;
}

export interface EntryLabelRow {
  entry_id: number;
  label_id: number;
}

export interface AnchorActivityRow {
  id: number;
  label_id: number | null;
  title: string;
  icon: string | null;
  default_effort: number | null;
  user_effort: number | null;
  is_enabled: SQLiteBoolean;
  is_default: SQLiteBoolean;
  seed_version: number;
}

export interface AnchorTagRow {
  anchor_activity_id: number;
  tag_id: number;
}

export interface IssueRow {
  id: number;
  name: string;
  description: string | null;
  is_archived: SQLiteBoolean;
  created_at: string;
}

export interface EntryIssueRow {
  entry_id: number;
  issue_id: number;
}
