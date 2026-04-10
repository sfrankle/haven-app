# Haven Database Schema

The source of truth is `lib/db/migrations/`. The ER diagram below reflects what is currently implemented.

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
        TEXT title
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

    measurement_type ||--o{ entry_type : "used by"
    entry_type ||--o{ label : "has"
    entry_type ||--o{ entry : "has"
    category ||--o{ label : "groups"
    label ||--o{ label : "parent of"
    label ||--o{ label_tag : "tagged via"
    tag ||--o{ label_tag : "applied via"
    entry ||--o{ entry_label : "has"
    label ||--o{ entry_label : "selected in"

    focus {
        INTEGER id PK
        TEXT name
        TEXT description
        INTEGER archived
        INTEGER sort_order
        TEXT created_at
    }

    focus_label {
        INTEGER focus_id FK
        INTEGER label_id FK
        INTEGER sort_order
    }

    entry_focus {
        INTEGER entry_id FK
        INTEGER focus_id FK
    }

    focus ||--o{ focus_label : "pins"
    label ||--o{ focus_label : "pinned in"
    entry ||--o{ entry_focus : "linked to"
    focus ||--o{ entry_focus : "linked from"
```

## Planned tables (not yet implemented)

| Table | Purpose |
|-------|---------|
| `anchor_activity` | Grounding activity suggestions with effort tracking |
| `anchor_tag` | Join table linking anchor activities to tags |

## Notes on specific columns

**entry.source_type** — `"log"` (timestamped, in-the-moment) or `"reflect"` (end-of-day, date-associated). Reflect mode UI is deferred; the field is captured now to avoid a future migration.

**entry.numeric_value** — used for: hours (sleep), oz/ml (hydration), energy 0–5 (Physical entries with Energy label), severity 1–5 (Physical entries with body area/whole body labels).

**label.parent_id** — self-referencing FK enabling two-level hierarchies: valence → specific emotions (Emotion), body area → symptoms/states (Physical).

**label.seed_version** — incremented when new seed rows are introduced in an app update. On app open, only rows where `seed_version > last_applied_version` are inserted (via `INSERT OR IGNORE`), so user-deleted associations are never re-applied.

**entry_type.measurement_type_id** — drives which logging form is shown. Types: `numeric` (sleep, hydration), `label_select` (food, emotion, activity), `label_select_severity` (physical).

**focus.archived** — `0` = active, `1` = archived. Archived focuses are hidden from the logging UI but preserved for historical correlation queries.

**entry_focus** — MVP enforces one Focus per entry at the app layer. The schema uses a composite PK `(entry_id, focus_id)` to remain forward-compatible if multi-focus is introduced later. App-layer code should use a delete-then-insert transaction when changing a focus association (not `INSERT OR REPLACE`).
