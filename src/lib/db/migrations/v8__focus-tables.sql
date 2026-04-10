CREATE TABLE IF NOT EXISTS focus (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  archived    INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS focus_label (
  focus_id   INTEGER NOT NULL REFERENCES focus(id) ON DELETE CASCADE,
  label_id   INTEGER NOT NULL REFERENCES label(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (focus_id, label_id)
);

CREATE TABLE IF NOT EXISTS entry_focus (
  entry_id INTEGER NOT NULL REFERENCES entry(id) ON DELETE CASCADE,
  focus_id INTEGER NOT NULL REFERENCES focus(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, focus_id)
);

CREATE INDEX IF NOT EXISTS idx_entry_focus_focus_id ON entry_focus(focus_id);
