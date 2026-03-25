# Haven Context

Haven is a private-first personal health notebook. Users log what they eat, how they feel, what they do, and how they slept. Haven surfaces patterns — it does not prescribe behaviour.

**Litmus phrase:** a spellbook you could show your doctor.

## Core Principles

- **Private-first:** all data stays on device. No network calls. No external APIs. No analytics. No telemetry. Ever.
- **No pressure:** no scores, no streaks, no "good"/"bad", no ranking, no missed-day indicators
- **Pattern surfacing, not prescription:** Haven shows the data; the user draws conclusions
- **Neutral tone:** no judgmental language in any user-facing string

## Stack

- React Native (Expo) + TypeScript
- Expo Router (file-based navigation)
- expo-sqlite — local SQLite, no backend, no sync
- Jest + React Native Testing Library (unit/integration)
- Maestro (E2E flow tests in YAML)

## Repo

`sfrankle/haven-app`

## Key Docs

| Doc | What it owns |
|---|---|
| `docs/vision.md` | Product principles, tab map |
| `docs/design/brand.md` | Voice, tone, microcopy, accessibility |
| `docs/design/visual-style.md` | Color tokens, typography, components, motion |
| `docs/design/interaction.md` | Interaction principles, spacing rhythm |
| `docs/design/screens.md` | Screen archetypes for all 5 tabs |
| `docs/data/entry-types.md` | Entry type + label vocabulary |
| `docs/data/schema.md` | Full DB schema |
| `docs/decisions.md` | Architecture decisions log — check before introducing new patterns |
| `docs/changelog.md` | One row per code-changing PR |
| `.claude/SDLC_Workflow.md` | Full dev workflow |
| `app/CLAUDE.md` | Testing philosophy |

## Tabs

| Tab | Purpose |
|---|---|
| Tend | Primary logging (home) |
| Trace | Chronological history |
| Weave | Correlation patterns/insights |
| Anchor | Grounding suggestions (later milestone) |
| Settings | Preferences, data controls |

## Entry Types

- **Sleep** — numeric (hours), once-daily
- **Hydration** — numeric (oz/ml), multiple/day
- **Food** — flat chip multi-select; time-block-aware suggestions; `+ Add` for custom labels
- **Emotion** — 3-tier split-pane flow; hierarchical chip replacement (child replaces parent chip)
- **Physical** — Energy slider + flat state search; two-stage severity; area context on chip
- **Activity** — flat chip multi-select; time-block-aware suggestions; categories are visual metadata only

## Schema (key tables)

`entry`, `entry_type`, `label` (self-referencing), `tag`, `label_tag`, `entry_label`, `measurement_type`, `category`, `issue`, `entry_issue`, `anchor_activity`, `anchor_tag`

## Architecture Decisions (key)

- Tags live on Labels, not Entries
- Labels use self-referencing `parent_id` for two-level hierarchy
- `seed_version` on all seed rows — `INSERT OR IGNORE` + version gating for safe vocabulary updates
- `source_type` on Entry (`"log"` / `"reflect"`)
- Local SQLite only — no backend ever
