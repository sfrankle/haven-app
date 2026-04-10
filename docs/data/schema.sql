CREATE TABLE category (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE entry (
  id            INTEGER PRIMARY KEY,
  entry_type_id INTEGER NOT NULL REFERENCES entry_type(id),
  source_type   TEXT NOT NULL DEFAULT 'log',
  timestamp     TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  numeric_value REAL,
  notes         TEXT
);

CREATE TABLE entry_focus (
  entry_id INTEGER NOT NULL REFERENCES entry(id) ON DELETE CASCADE,
  focus_id INTEGER NOT NULL REFERENCES focus(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, focus_id)
);

CREATE INDEX IF NOT EXISTS idx_entry_focus_focus_id ON entry_focus(focus_id);

CREATE TABLE entry_label (
  entry_id INTEGER NOT NULL REFERENCES entry(id),
  label_id INTEGER NOT NULL REFERENCES label(id),
  PRIMARY KEY (entry_id, label_id)
);

CREATE TABLE entry_type (
  id                  INTEGER PRIMARY KEY,
  name                TEXT NOT NULL UNIQUE,
  title               TEXT NOT NULL UNIQUE,
  measurement_type_id INTEGER REFERENCES measurement_type(id),
  prompt              TEXT,
  icon                TEXT,
  is_enabled          INTEGER NOT NULL DEFAULT 1,
  is_default          INTEGER NOT NULL DEFAULT 0,
  sort_order          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE focus (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  archived    INTEGER NOT NULL DEFAULT 0,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);

CREATE TABLE focus_label (
  focus_id   INTEGER NOT NULL REFERENCES focus(id) ON DELETE CASCADE,
  label_id   INTEGER NOT NULL REFERENCES label(id) ON DELETE RESTRICT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (focus_id, label_id)
);

CREATE TABLE label (
  id            INTEGER PRIMARY KEY,
  entry_type_id INTEGER NOT NULL REFERENCES entry_type(id),
  name          TEXT NOT NULL,
  parent_id     INTEGER REFERENCES label(id),
  category_id   INTEGER REFERENCES category(id),
  is_default    INTEGER NOT NULL DEFAULT 1,
  is_enabled    INTEGER NOT NULL DEFAULT 1,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  seed_version  INTEGER NOT NULL DEFAULT 1,
  UNIQUE(entry_type_id, name)
);

CREATE TABLE label_tag (
  label_id     INTEGER NOT NULL REFERENCES label(id),
  tag_id       INTEGER NOT NULL REFERENCES tag(id),
  seed_version INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (label_id, tag_id)
);

CREATE TABLE measurement_type (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL
);

CREATE TABLE tag (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL UNIQUE,
  tag_group    TEXT,
  seed_version INTEGER NOT NULL DEFAULT 0
);
