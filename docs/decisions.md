# Architecture Decisions

Significant technical decisions made during development.

| Date | Decision | Context | Rationale | Consequences |
|------|----------|---------|-----------|--------------|
| 2026-03-04 | Tags live on Labels, not Entries | Needed correlations to work retroactively without re-tagging history | Tag a label "dairy" once; all past and future entries using it are included in correlation queries automatically | Correlation queries join through labels; entries themselves carry no tags |
| 2026-03-04 | Nested labels via self-referencing `parent_id` | Two-level hierarchies needed (body area → symptom, valence → emotion) | Avoids a separate category table; keeps queries simple; two levels is sufficient for all current entry types | Labels table is self-referencing; queries must handle parent/child relationships |
| 2026-03-04 | `seed_version` on all seed rows | App updates introduce new default labels and tags without overwriting user data | `INSERT OR IGNORE` + version gating allows safe incremental vocabulary updates across releases | All seed rows carry an integer version; migration logic must respect `is_default = false` rows |
| 2026-03-04 | `source_type` on Entry (log vs reflect) | End-of-day "reflect" logging is a future feature but needs a schema field now | Avoids a future breaking migration; reflect UI is deferred but the data model is ready | `source_type` is always `"log"` until reflect UI is built |
| 2026-03-04 | Local SQLite only — no backend | Privacy is a core product value, not just a technical default | All data on device; no accounts, no sync, no network layer | Export/import is the only device migration path; no real-time sync is possible |
| 2026-03-04 | One device, one person | Multi-user and multi-device sync would require a backend and account system | Keeps the product simple and fully private; no shared state to reason about | Users who switch devices must export then import manually |
| 2026-03-04 | `lib/` directory for non-UI infrastructure | Needed a home for DB layer, utilities, and other non-route code | `app/` is for Expo Router routes; `constants/` is for static values; `lib/` holds runtime infrastructure (DB, helpers) that has no UI component | All future non-UI infrastructure lives in `lib/` |
| 2026-03-04 | Custom migration runner using `user_version` pragma | expo-sqlite 55 does not expose `migrateDbIfNeededAsync`; third-party migration libraries add unnecessary complexity | Thin custom runner: read `PRAGMA user_version`, execute pending migration strings in transactions, increment version. Each migration is a plain SQL string in `lib/db/migrations.ts`. | Zero extra dependencies; migrations are plain SQL diff-able strings; version tracked natively by SQLite |
| 2026-03-04 | `better-sqlite3` for schema integrity tests | `expo-sqlite` requires a native module unavailable in Jest/Node | Schema integrity tests validate SQL correctness with `better-sqlite3` (synchronous, Node-native); they do not test the Expo module itself. This is a dev-only dependency. | Tests run in CI without a simulator; expo-sqlite behavior tested only in E2E (Maestro) |
| 2026-03-04 | Manual label merging is intentionally destructive | Users may create custom labels that duplicate a future default (e.g. "hot yoga" vs default "Yoga") — automatic fuzzy merging is too risky | Provide an explicit "Merge into…" flow in Settings: all entries using the custom label are repointed to the default label (gaining its tags retroactively), custom label is archived. Requires confirmation. Cannot be undone without re-creating the custom label. | Fuzzy/partial matches are never merged automatically; only exact case-insensitive matches merge at seed time |

<!--
Add a row per decision. If the context/rationale is too long for a table cell,
create a dedicated file at docs/decisions/<slug>.md and link to it from this table.
-->
