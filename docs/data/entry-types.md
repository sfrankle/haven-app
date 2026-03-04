# Entry Types

Reference for Haven's entry types — what they capture, how they behave, and how the label vocabulary works.

For the database schema, see `schema.md`.

---

## Entry types

### Sleep
- Logs hours of sleep (numeric)
- Once-daily typical use
- Optional notes

### Hydration
- Logs amount per drink (oz or ml)
- Multiple times per day
- Quick-add buttons with pre-configured defaults; running daily total visible
- Unit preference configurable in Settings

### Food
- Logs ingredients via label selection (multi-select)
- Search bar + label chips; recently used surface first
- Meal context (Breakfast / Lunch / Dinner / Snack) inferred from time of day and stored on the entry
- Labels carry ingredient tags (dairy, gluten, FODMAP, etc.) enabling food-symptom correlations

### Emotion
- Two-step selection: valence first (Pleasant / Neutral / Unpleasant), then specific emotions (multi-select)
- Labels carry tags (nervous system, hormone, etc.) enabling correlations
- Optional notes

### Physical State
- Covers both positive ("feeling fine", "no pain") and negative ("bloating", "wrist pain") states — both are equally valuable for correlations
- Two-step flow: pick body area → pick state labels for that area (multi-select)
- Optional severity/intensity slider (1–5) after label selection
- Entries can be linked to a tracked Issue (see below)

### Energy Level
- A fast single-step log: 0–5 scale (0 = exhausted, 5 = high energy)
- Stored as a Physical State entry with `numeric_value`; a sub-type flag distinguishes it from label-based physical state logs
- No labels selected — the numeric value is the full payload
- Designed for high-frequency use (multiple times per day)

### Activity
- Suggested chips (personalized: recently used + time-of-day context) + full search bar; multi-select
- Categories (Move, Create, Connect, Ground, Breathe, Reflect, Nourish, Structure) are visual metadata only — shown as chip color-coding, not navigation steps
- Custom activities can be created on the fly ("+ Add [name]" from search with no results)
- Labels carry tags (nervous system state, effort type, etc.)

---

## Tracked Issues

A named health concern the user defines to monitor over time (e.g. "Carpal tunnel", "Gut / celiac").

- Not an entry type — a lens for reviewing Physical State entries
- Created in Settings; stored locally; can be archived when no longer active
- When logging Physical State, user can optionally link the entry to one or more tracked Issues
- In Trace, entries can be filtered by Issue — useful for summarizing for a doctor appointment

---

## Label vocabulary

Labels are the reusable vocabulary of the app. Rather than typing "cheese" every time, the user selects a "Cheese" label. Labels belong to an entry type and can form a two-level hierarchy via `parent_id` (e.g. body area → specific symptoms, valence → specific emotions).

**Tags live on Labels, not on Entries.** Tag the "Cheese" label as `dairy` once and every past and future entry using that label is automatically included in dairy-related correlation queries — no re-tagging of history required.

### Seed data and vocabulary updates

The app ships with a curated default vocabulary pre-loaded into the database. Seed rows carry a `seed_version` integer. When the app updates and introduces new default labels or tags, only rows with a `seed_version` higher than the last applied version are inserted via `INSERT OR IGNORE` — user-created labels and removed associations are never touched.

**Automatic label merging** applies on case-insensitive name matches at seed time (e.g. user's "yoga" merges with default "Yoga"). Partial or fuzzy matches (e.g. "Hot Yoga" vs "Yoga") are never merged automatically.
