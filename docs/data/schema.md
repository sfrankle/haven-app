# Haven Database Schema

```mermaid
erDiagram
    measurement_type {
        INTEGER id PK
        TEXT name
        TEXT display_name
    }

    category {
        INTEGER id PK
        TEXT name
    }

    entry_type {
        INTEGER id PK
        TEXT name
        INTEGER measurement_type_id FK
        TEXT prompt
        TEXT icon
        INTEGER is_enabled
        INTEGER is_default
        INTEGER sort_order
    }

    label {
        INTEGER id PK
        INTEGER entry_type_id FK
        TEXT name
        INTEGER parent_id FK
        INTEGER category_id FK
        INTEGER is_default
        INTEGER is_enabled
        INTEGER sort_order
        INTEGER seed_version
    }

    tag {
        INTEGER id PK
        TEXT name
        TEXT tag_group
        INTEGER seed_version
    }

    label_tag {
        INTEGER label_id FK
        INTEGER tag_id FK
        INTEGER seed_version
    }

    entry {
        INTEGER id PK
        INTEGER entry_type_id FK
        TEXT source_type
        TEXT timestamp
        TEXT created_at
        REAL numeric_value
        TEXT notes
    }

    entry_label {
        INTEGER entry_id FK
        INTEGER label_id FK
    }

    anchor_activity {
        INTEGER id PK
        INTEGER label_id FK
        TEXT title
        TEXT icon
        INTEGER default_effort
        INTEGER user_effort
        INTEGER is_enabled
        INTEGER is_default
        INTEGER seed_version
    }

    anchor_tag {
        INTEGER anchor_activity_id FK
        INTEGER tag_id FK
    }

    issue {
        INTEGER id PK
        TEXT name
        TEXT description
        INTEGER is_archived
        TEXT created_at
    }

    entry_issue {
        INTEGER entry_id FK
        INTEGER issue_id FK
    }

    measurement_type ||--o{ entry_type : "used by"
    entry_type ||--o{ label : "has"
    entry_type ||--o{ entry : "has"
    category ||--o{ label : "groups"
    label ||--o{ label : "parent of"
    label ||--o{ label_tag : "tagged via"
    tag ||--o{ label_tag : "applied via"
    entry ||--o{ entry_label : "has"
    label ||--o{ entry_label : "selected in"
    label ||--o{ anchor_activity : "referenced by"
    anchor_activity ||--o{ anchor_tag : "tagged via"
    tag ||--o{ anchor_tag : "applied via"
    entry ||--o{ entry_issue : "linked via"
    issue ||--o{ entry_issue : "linked via"
```

## Additional Tables

### issue
User-defined named health concern for grouping physical state entries over time (e.g. "Carpal tunnel", "Gut / celiac").

| Column | Type | Notes |
|---|---|---|
| id | INTEGER PK | |
| name | TEXT NOT NULL | e.g. "Carpal tunnel" |
| description | TEXT | optional |
| is_archived | INTEGER (bool) | hidden when no longer being tracked |
| created_at | TEXT NOT NULL | ISO 8601 |

### entry_issue
Join table linking entries to tracked issues.

| Column | Type | Notes |
|---|---|---|
| entry_id | INTEGER FK | → entry |
| issue_id | INTEGER FK | → issue |
| PRIMARY KEY | (entry_id, issue_id) | composite |

## Notes on Specific Columns

**entry.source_type** — `"log"` (timestamped, in-the-moment) or `"reflect"` (end-of-day, date-associated). Reflect mode UI is deferred; the field is captured now to avoid a future migration.

**entry.numeric_value** — used for: hours (sleep), oz/ml (hydration), energy 0–5 (Physical entries with Energy label), severity 1–5 (Physical entries with body area/whole body labels).

**label.parent_id** — self-referencing FK enabling two-level hierarchies: valence → specific emotions (Emotion), body area → symptoms/states (Physical).

**label.seed_version** — incremented when new seed rows are introduced in an app update. On app open, only rows where `seed_version > last_applied_version` are inserted (via `INSERT OR IGNORE`), so user-deleted associations are never re-applied.

**entry_type.measurement_type_id** — drives which logging form is shown. Types: `numeric` (sleep, hydration), `label_select` (food, emotion, activity), `label_select_severity` (physical).
