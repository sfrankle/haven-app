# Entry Types

Reference for Haven's entry types — what they capture, how they behave, and how the label vocabulary works.

For the database schema, see `schema.md`.

---

## Notes field

Every entry type supports an optional free-text notes field. Notes are not a standalone entry type — they are a field on the entry itself. They are excluded from correlation logic.

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
- Three-step selection, each level saveable: arousal/valence zone first (Bright / Warm / Still / Heavy / Charged), then named emotion (multi-select), then granular specifics (multi-select, optional)
- Top level encodes valence × arousal: Bright (positive, activated), Warm (positive, settled), Still (neutral), Heavy (negative, low energy), Charged (negative, activated)
- Labels carry tags (nervous system, hormone, etc.) enabling correlations
- Optional notes

### Physical

Covers energy, body area states, and whole-body states in a single unified flow. One submission produces one entry per thing logged; all entries from the same submission share the same timestamp.

The logging screen has three sections:

**Energy**
- Horizontal slider, 0–5: Exhausted · Bit Tired · Average · Well Rested · Pumped
- Optional — user can skip and log only body/general items
- Stored as: `entry_labels = [Energy]`, `numeric_value = 0–5`

**Body** (pick an area, then symptoms)
- Body areas: Head, Arms, Chest, Gut, Legs
- Each area shows two symptom lists:
  - *Universal symptoms* (children of the `Body` label): Pain, Stiff, Numb, Tingling, Itchy, Rash, Swollen, Warm, Sore, Weak, Strong, Fine — shown for every area
  - *Area-specific symptoms*: e.g. Head → Headache, Migraine, Brain fog, Clear-headed; Gut → Bloating, Nausea, Comfortable
- Positive and negative states appear together — both are equally valid logs
- Multi-select; user can log multiple areas in one submission
- Optional severity 1–5 per area selection
- Stored as: `entry_labels = [area, symptom(s)]`, `numeric_value = severity or null`

**General** (whole-body, no specific area)
- For systemic states — flu-like, full-body tension, etc.
- States: Achy, Tense, Relaxed, Inflamed, Shaky (+ universal symptoms available)
- Optional severity 1–5
- Stored as: `entry_labels = [Whole body, state(s)]`, `numeric_value = severity or null`

Entries can be linked to a tracked Issue (see below).

### Activity
- Suggested chips (personalized: recently used + time-of-day context) + full search bar; multi-select
- Categories (Move, Create, Connect, Ground, Breathe, Reflect, Nourish, Structure) are visual metadata only — shown as chip colour-coding, not navigation steps
- Custom activities can be created on the fly ("+ Add [name]" from search with no results)
- Labels carry tags (nervous system state, effort type, etc.)

---

## Tracked Issues

A named health concern the user defines to monitor over time (e.g. "Carpal tunnel", "Gut / celiac").

- Not an entry type — a lens for reviewing Physical entries
- Created in Settings; stored locally; can be archived when no longer active
- When logging Physical, user can optionally link the entry to one or more tracked Issues
- In Trace, entries can be filtered by Issue — useful for summarizing for a doctor appointment

---

## Label vocabulary

Labels are the reusable vocabulary of the app. Rather than typing "cheese" every time, the user selects a "Cheese" label. Labels belong to an entry type and can form a two-level hierarchy via `parent_id` (e.g. body area → specific symptoms, valence → specific emotions).

**Tags live on Labels, not on Entries.** Tag the "Cheese" label as `dairy` once and every past and future entry using that label is automatically included in dairy-related correlation queries — no re-tagging of history required.

### Seed data and vocabulary updates

The app ships with a curated default vocabulary pre-loaded into the database. Seed rows carry a `seed_version` integer. When the app updates and introduces new default labels or tags, only rows with a `seed_version` higher than the last applied version are inserted via `INSERT OR IGNORE` — user-created labels and removed associations are never touched.

**Automatic label merging** applies on case-insensitive name matches at seed time (e.g. user's "yoga" merges with default "Yoga"). Partial or fuzzy matches (e.g. "Hot Yoga" vs "Yoga") are never merged automatically.
