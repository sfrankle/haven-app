-- Haven schema — version 1
-- Generated from lib/db/migrations.ts (MIGRATION_V1_SQL)
-- Do not edit manually; update migrations.ts and regenerate.

CREATE TABLE IF NOT EXISTS measurement_type (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  display_name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS category (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entry_type (
  id                  INTEGER PRIMARY KEY,
  name                TEXT NOT NULL,
  measurement_type_id INTEGER REFERENCES measurement_type(id),
  prompt              TEXT,
  icon                TEXT,
  is_enabled          INTEGER NOT NULL DEFAULT 1,
  is_default          INTEGER NOT NULL DEFAULT 0,
  sort_order          INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS label (
  id            INTEGER PRIMARY KEY,
  entry_type_id INTEGER NOT NULL REFERENCES entry_type(id),
  name          TEXT NOT NULL,
  parent_id     INTEGER REFERENCES label(id),
  category_id   INTEGER REFERENCES category(id),
  is_default    INTEGER NOT NULL DEFAULT 0,
  is_enabled    INTEGER NOT NULL DEFAULT 1,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  seed_version  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tag (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  tag_group    TEXT,
  seed_version INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS label_tag (
  label_id     INTEGER NOT NULL REFERENCES label(id),
  tag_id       INTEGER NOT NULL REFERENCES tag(id),
  seed_version INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (label_id, tag_id)
);

CREATE TABLE IF NOT EXISTS entry (
  id            INTEGER PRIMARY KEY,
  entry_type_id INTEGER NOT NULL REFERENCES entry_type(id),
  source_type   TEXT NOT NULL DEFAULT 'log',
  timestamp     TEXT NOT NULL,
  created_at    TEXT NOT NULL,
  numeric_value REAL,
  notes         TEXT
);

CREATE TABLE IF NOT EXISTS entry_label (
  entry_id INTEGER NOT NULL REFERENCES entry(id),
  label_id INTEGER NOT NULL REFERENCES label(id),
  PRIMARY KEY (entry_id, label_id)
);

CREATE TABLE IF NOT EXISTS anchor_activity (
  id             INTEGER PRIMARY KEY,
  label_id       INTEGER REFERENCES label(id),
  title          TEXT NOT NULL,
  icon           TEXT,
  default_effort INTEGER,
  user_effort    INTEGER,
  is_enabled     INTEGER NOT NULL DEFAULT 1,
  is_default     INTEGER NOT NULL DEFAULT 0,
  seed_version   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS anchor_tag (
  anchor_activity_id INTEGER NOT NULL REFERENCES anchor_activity(id),
  tag_id             INTEGER NOT NULL REFERENCES tag(id),
  PRIMARY KEY (anchor_activity_id, tag_id)
);

CREATE TABLE IF NOT EXISTS issue (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS entry_issue (
  entry_id INTEGER NOT NULL REFERENCES entry(id),
  issue_id INTEGER NOT NULL REFERENCES issue(id),
  PRIMARY KEY (entry_id, issue_id)
);
