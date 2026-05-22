-- Routine: a named, reusable checklist of log items
CREATE TABLE IF NOT EXISTS routine (
  id                  INTEGER PRIMARY KEY,
  name                TEXT NOT NULL,
  associated_focus_id INTEGER REFERENCES focus(id) ON DELETE SET NULL,
  frequency_note      TEXT,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  archived            INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

-- One item in a routine (maps to an entry_type with optional pre-fill)
CREATE TABLE IF NOT EXISTS routine_entry_type (
  id                INTEGER PRIMARY KEY,
  routine_id        INTEGER NOT NULL REFERENCES routine(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  entry_type_id     INTEGER NOT NULL REFERENCES entry_type(id) ON DELETE RESTRICT,
  prescribed_detail TEXT,
  instruction_note  TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

-- Labels pre-selected for a routine item (join table, no timestamps)
CREATE TABLE IF NOT EXISTS routine_entry_type_label (
  routine_entry_type_id INTEGER NOT NULL REFERENCES routine_entry_type(id) ON DELETE CASCADE,
  label_id              INTEGER NOT NULL REFERENCES label(id) ON DELETE RESTRICT,
  PRIMARY KEY (routine_entry_type_id, label_id)
);

-- Time blocks when a routine should appear (join table, no timestamps)
CREATE TABLE IF NOT EXISTS routine_time_block (
  routine_id INTEGER NOT NULL REFERENCES routine(id) ON DELETE CASCADE,
  time_block TEXT NOT NULL CHECK (time_block IN ('Morning','Midday','Afternoon','Evening')),
  PRIMARY KEY (routine_id, time_block)
);

-- One immutable event row per routine completion; entries link back to this
CREATE TABLE IF NOT EXISTS routine_completion (
  id         INTEGER PRIMARY KEY,
  routine_id INTEGER NOT NULL REFERENCES routine(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL
);

-- Index on routine_completion.routine_id for join performance at completion-state-derivation time
CREATE INDEX IF NOT EXISTS idx_routine_completion_routine_id ON routine_completion(routine_id);

-- Add routine linkage to existing entry rows (both nullable; existing rows unaffected)
ALTER TABLE entry ADD COLUMN routine_id            INTEGER REFERENCES routine(id) ON DELETE SET NULL;
ALTER TABLE entry ADD COLUMN routine_completion_id INTEGER REFERENCES routine_completion(id) ON DELETE SET NULL;

-- Index on entry.routine_completion_id for join performance at completion-state-derivation time
CREATE INDEX IF NOT EXISTS idx_entry_routine_completion_id ON entry(routine_completion_id);
