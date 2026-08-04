# Focus, Routines & Notes — Product Spec
**Date:** 2026-04-08
**Status:** Approved for milestone planning
**Session type:** PM / product design

---

## Overview

This spec covers three related but independently deliverable features:

1. **Focus** — a named health concern or life context the user is actively monitoring. A grouping and filtering lens.
2. **Routines** — named, time-aware checklists where completing an item creates a real log entry. Includes PT-style exercise protocols and personal daily rituals.
3. **Notes on entries** — a free-text annotation field on every log entry.

These features are connected: a Routine can belong to a Focus, completing a Routine auto-associates the resulting entries with that Focus, and the Focus filter in Trace surfaces all of it together.

---

## Feature 1: Focus

### What it is

A Focus is a named thing the user is paying attention to — a health condition they're managing, a recovery they're tracking, a symptom pattern they're watching. It is not an entry type. It is a lens.

**Examples:** Knee recovery · Lower back · Headaches · Energy patterns · Gut health

A Focus:
- Has a name (required) and optional description
- Has a set of tracked labels — physical states or other entry labels the user wants quick access to when logging for this Focus
- Can have one or more Routines associated with it
- Can be archived when no longer actively monitored

### Creating a Focus

From two places:
- **Tend dashboard** — "+ Add Focus" at the end of the Focus pills row
- **Inline from any entry form** — the Focus field has an "+ New Focus" option in its dropdown

Both flows land on the same simple screen: name field + optional tracked labels picker (select from existing labels or create new ones). Fast — designed to take under 30 seconds.

### The Focus quick-log

Each active Focus appears as a pill on the Tend dashboard. Tapping a Focus pill opens a quick-log screen (or bottom sheet).

The screen is a unified checklist of all tracked labels for this Focus, regardless of entry type. Each row shows:

`[Entry type display name]: [Label name]`

Examples: "Nourish: Kombucha", "Journey: Walk", "Attune: Gassy"

The entry type determines the inline control on the row:
- **Food / Activity** — checkbox only. Checked = logged on submit.
- **Physical** — checkbox + inline severity selector (1–5) on the same row.

All items open unchecked. The user checks whatever applies right now, sets severity on Physical items, and submits. Until something is checked there is no Save button — that empty state is intended. This diverges deliberately from Routine completion, which opens checked; see the 2026-08-04 row in `docs/decisions.md` for why the two screens differ.

Labels appear in two layers, unified and ordered by frequency:
1. **Explicitly tracked** — labels the user pinned when creating or editing the Focus
2. **Historically associated** — labels previously logged under this Focus, surfaced automatically. No setup required — associating a label with a Focus once is enough for it to appear here.

On submit, one entry is created per checked item, each timestamped now and auto-associated with this Focus.

### Focus on every entry form

Every entry submission screen gets an optional Focus field. By default it is **collapsed** — a subtle "+ Focus" link at the bottom of the form. It does not add visual weight to users who aren't using Focuses.

When an entry is created from a Focus quick-log or from completing a Focus-linked Routine, the Focus field **auto-expands and pre-selects** the correct Focus. The user can tap to clear it.

### Editing a Focus

A Focus has an edit mode accessible from the Tend dashboard (long press or settings icon on the pill) or from Settings. In edit mode the user can:
- Rename the Focus
- Add or remove explicitly pinned labels
- Change the associated Routines (via the Routine's own settings)
- Archive the Focus

Historically-associated labels (the learned ones) are not editable — they reflect actual usage history.

### Archiving

A Focus can be archived. Archived Focuses:
- No longer appear on the Tend dashboard
- Are accessible from Settings for review
- Can be unarchived
- Their historical entries remain associated and filterable in Trace

---

## Feature 2: Routines

### What they are

Routines are named groups of loggable items with a time-of-day schedule. Completing a Routine item creates a real log entry in Haven — not a task checkbox. This means completions feed into Trace history and Weave correlations.

**Examples of Routines:**
- *Morning Routine* (morning) — breakfast (Food + blueberry label), supplements (Activity), wash face (Activity), drink water (Hydration)
- *Knee PT* (morning + afternoon) — 4 exercises prescribed by a physiotherapist → Activity entries with prescribed detail
- *Daily check-in* (evening) — energy rating, mood → Physical and Emotion entries

Routines are **not exercise-specific** and are not a fitness tracker. They are a logging shortcut for anything a user does repeatedly.

### Routine definition

Each Routine has:
- **Name** (e.g. "Morning Routine", "Knee PT", "Daily check-in")
- **Associated Focus** (optional) — links the Routine to a Focus; completions auto-associate entries
- **Time blocks** — multi-select from Morning / Midday / Afternoon / Evening / Night. A Routine can appear in multiple blocks (e.g. PT done 3x daily = Morning + Midday + Afternoon)
- **Frequency** — informational reference only (e.g. "3x daily" as prescribed). Time blocks are the source of truth for when the Routine surfaces on the dashboard. Haven does not cross-check frequency against time blocks or produce any warnings if they differ.
- **Items** — an ordered list of routine_entry_type records (see below)
- **Sort order** — the user controls the order Routines appear on the dashboard

### Routine items (routine_entry_type)

Each item in a Routine is a configured log entry. All fields except name are optional.

| Field | Description |
|-------|-------------|
| **Name** | Short label shown on the completion screen — "Wrist circles", "Blueberries", "Wash face" |
| **Entry type** | What kind of Haven entry this creates (Food, Activity, Physical, Emotion, Sleep, Hydration) |
| **Labels** | The specific label(s) that get logged. Required for most entry types. E.g. Activity → "Wash face" label; Food → "Blueberry" label. Hydration and Sleep are numeric-only (no label needed). Stored as a join: `routine_entry_type_label`. |
| **Prescribed detail** | Free text. The PT-prescribed or self-defined target — "10 reps · 3 sec hold · 0.5kg". Pre-populates `entry.notes` on the completion screen. User can edit before saving (e.g. change to "8 reps" if they did fewer). |
| **Instruction note** | Optional longer description — how to perform the exercise, what to notice, etc. Hidden by default on completion screen; tap to expand. |
| **Sort order** | User-controlled item order within the Routine |

Simple items ("wash face" = Activity + "wash face" label) and complex items (PT exercises with prescribed detail and instruction notes) use the same model. Hydration and Sleep items are label-free — they log a numeric value only.

### Completing a Routine

Opening a Routine from the dashboard shows all items as cards. Each card displays:
- Item name
- Prescribed detail pre-populated (editable before saving)
- Expand icon for instruction note (if present)
- Checkbox (checked by default; uncheck to skip)

The user reviews, adjusts any values if needed (e.g. actually did 8 reps instead of 10), unchecks anything they skipped, and taps Submit.

On Submit:
- A log entry is created for each checked item, timestamped now
- Each entry carries the `routine_id` so it can be grouped and tracked
- If the Routine has an associated Focus, each entry is auto-associated with that Focus (pre-populated in the entry's Focus field; user could clear it, but shouldn't need to)

**Frequency display:** frequency ("3x daily") is shown on the Routine definition/edit screen, not the completion screen. The completion screen is about doing, not configuring.

### Time-of-day visibility and completion tracking

Routines surface on the Tend dashboard based on their configured time blocks. A Routine moves to the **Completed** section if either condition is true:

1. **Completed in the current time block** — at least one completion today has a timestamp within the current block's window. Stays collapsed until the block turns over.
2. **Fully done for the day** — total completions today ≥ number of configured time blocks. Stays collapsed for the rest of the day regardless of which block opened.

**Examples** (Routine configured Morning + Afternoon):
- Completed at 8:55. At 11:55 (still morning): completed in current block → Completed.
- At 12:05 (afternoon block opens): 1 completion, 1 < 2 blocks, not yet completed in afternoon → Due.
- Completed again at 12:30. At 13:00: 2 completions ≥ 2 blocks → fully done, Completed all day.
- Completed at 8:55 and 11:55 (both morning). At 12:05: 2 ≥ 2 → fully done, does not resurface.
- Completed only at 8:55. At 20:00 (after all configured blocks have passed): 1 < 2, not completed in evening → **Due.** A routine that isn't fully completed stays accessible for the rest of the day with no language implying it's overdue or missed.

**Dashboard display:**
- **Due now** (in current time block, not yet completed this block) — full card, prominent, top of the Routines section
- **Completed / Later** — collapsed into a disclosure row below active cards. Tapping expands to show completed Routines (with a completion count, e.g. "2 of 3") and not-yet-due Routines for later in the day. A user who wants to complete their afternoon Routine early can find it here.

The completion count on the card face (e.g. "1 of 3 · Morning done") gives users a sense of daily progress without surfacing clutter.

### Editing a Routine

Routine definitions are edited in place. Changing prescribed reps from 10 to 12 takes effect immediately for future completions. **Past log entries are never modified** — they captured what the user actually did at that time. The history in Trace naturally shows the progression (week 1: 10 reps, week 2: 12 reps) because the entries reflect reality at time of logging.

### Creating and managing Routines

From two places:
- **Tend dashboard** — "+ Add Routine" in the Routines section
- **Settings** — a Routines management screen listing all Routines with edit/archive options

Creation flow: name → associated Focus (optional) → time blocks → items (add one at a time, each becoming a card in the list) → save.

---

## Feature 3: Notes on entries

### What it is

A nullable free-text field on every log entry. When logging any entry type, the user can add a short note — context, observations, anything they want to capture alongside the structured data.

**Examples:**
- Physical entry for "Neck: stiffness" → note: "worse after long drive"
- Food entry for breakfast → note: "ate late, wasn't hungry"
- Activity entry for yoga → note: "modified today, knee was uncomfortable"

### What it is not

This is not a journaling feature and not a freeform "life event" entry type. That feature (logging events like "started new medication", "significant life change") is deferred to a future milestone. Notes are annotation, not narration.

### Implementation note

The `entry.notes` column already exists in the database schema. This feature is a UI-only change — expose the field on every entry submission form.

The notes field should be visually secondary: small, at the bottom of the form, no label required. Optional and low friction.

---

## Settings

### Toggling Focus and Routines sections

Users can toggle the Focus section and Routines section off entirely from Settings. When toggled off, the corresponding section is absent from the Tend dashboard. This follows the same pattern as issue #12 (toggling and reordering entry types on Tend).

This is a **deferred feature** — implement after Focus and Routines core features are stable.

---

## Navigation changes

### Tend — evolved dashboard

Tend evolves from a flat tile grid into a contextual home screen. Three vertical sections:

**Routines section**
Cards for all Routines, ordered by user preference. Due-now Routines are full cards at the top. A collapsed disclosure row ("Completed · Later") holds everything else. If a user has no Routines, this section is absent.

**Focuses section**
A horizontal scrolling row of Focus pills. Tap a pill → quick-log bottom sheet for that Focus. "+ Add Focus" at the end. If a user has no Focuses, this section is absent.

**Entry types section**
The existing tile grid, unchanged. Always present.

### Persistent + button

A floating action button in the bottom navigation bar, accessible from every tab. Tapping it from any screen opens the logging bottom sheet (same as tapping an entry type tile on Tend). If tapped from Trace while viewing a specific timestamp, the entry form pre-populates with that timestamp.

---

## Trace changes

### Focus filter

A filter control in Trace allows the user to view only entries associated with a specific Focus. When a filter is active:
- Only entries with that Focus association are shown (including Routine-sourced entries auto-associated at completion)
- Grouped Routine rows remain grouped

### "Show context" button

When viewing a filtered Trace, a "Show context" button appears on individual entries. Tapping it temporarily reveals surrounding entries (±2 hours, or similar window) without clearing the filter or losing scroll position. Contextual entries appear in a visually muted style. This allows a user to answer "what else was going on at this moment?" without abandoning their focused review.

### Routine grouping in Trace

Entries created from a single Routine completion are grouped into one collapsed row in Trace. The row shows: Routine name + timestamp. Tap to expand and see individual items with their logged values. This prevents 4–5 exercise entries appearing as separate rows 3 times per day.

Grouping is deterministic: entries share a `routine_id` and a `routine_completion_id` (a UUID generated at submit time, stored on each entry in the group). The `routine_completion_id` does not require a separate table.

---

## Data model decisions

*These are product decisions that constrain implementation. Engineering may refine the physical schema, but the logical model below reflects agreed product behavior.*

**New entities:**

| Entity | Purpose |
|--------|---------|
| `focus` | Named health concern or monitoring context |
| `focus_label` | Join table: labels explicitly pinned to a Focus (with sort_order) |
| `entry_focus` | Join table: links an entry to a Focus (MVP: one Focus per entry) |
| `routine` | Named group of loggable items with schedule |
| `routine_entry_type` | Join table with payload: a configured loggable item within a Routine |
| `routine_entry_type_label` | Join table: label(s) associated with a routine_entry_type (e.g. Food item → "Blueberry" label) |

**Changes to existing entities:**

| Entity | Change |
|--------|--------|
| `entry` | Add `routine_id` (nullable FK → routine) — links entry to the Routine that created it |
| `entry` | Add `routine_completion_id` (nullable UUID) — groups entries from the same completion event for Trace display |

**Key behavioral rules:**
- Completing a Routine creates standard `entry` records — no special completion table
- Completion state per time block is derived from `entry` records (`routine_id` + timestamp within block window)
- `entry.notes` already exists in schema — Notes feature is UI-only
- Routine definitions are mutable; entries are immutable after creation
- Focus association on entries: auto-populated from Routine's Focus, user can clear it
- Historically-used Focus labels are derived at query time from `entry_focus` + `entry_label` — no separate storage

---

## What this is not

- **Not a fitness tracker.** No pace, distance, workout plans, or progress graphs. Routines create log entries; patterns emerge in Weave.
- **Not a task manager.** Completing a Routine item is an act of logging, not task completion. Skipping an item creates no record and generates no negative feedback.
- **Not prescriptive.** No streaks, no missed-day indicators, no "you haven't done your PT today." The data is there for the user to interpret with their care provider — Haven doesn't editorialize.
- **Not a journaling feature.** Notes are annotation on structured entries. The freeform life-event entry type is deferred.

---

## Open questions

| Question | Status |
|----------|--------|
| Time block naming: is "Midday" vs "Afternoon" a naming issue or a real distinction? Worth revisiting before implementation. | Resolved — five blocks: Morning 05:00–11:59, Midday 12:00–13:59, Afternoon 14:00–17:59, Evening 18:00–21:59, Night 22:00–04:59. `getTimeBlock()` utility added to `src/lib/utils/timestamp.ts`. `getMealContext` (food display only) unchanged. See issue #120. |
| Can an entry be associated with more than one Focus? MVP says no (one Focus per entry). Revisit when multi-condition users push the limit. | Deferred |
| Notes during Routine completion: each item's `entry.notes` is pre-populated with the prescribed detail and editable before submit. No whole-Routine note for MVP. | Resolved |
| Notifications / reminders per Routine (e.g. "remind me at 2pm to do afternoon PT") — explicitly deferred to Notifications milestone. | Deferred |
| Weave: Focus-scoped correlation views — out of scope for this design, but data model supports it. | Deferred |
| Freeform life-event entry type ("I got married", "significant diagnosis") — deferred to a future milestone. See `docs/concepts/notes.md`. | Deferred |
| Old GitHub issue #24 ("Create a tracked issue") is superseded by this spec. Should be closed and linked here. | Action item |

---

## Relationship to existing concept docs

| Doc | Status |
|-----|--------|
| `docs/concepts/routines.md` | Largely superseded. Core vision preserved; item model, time-block logic, and navigation approach differ. |
| `docs/concepts/notes.md` | The "notes as field on entry" portion is captured here. The "freeform life-event entry type" portion remains valid as a deferred feature. |
| GitHub issue #24 | Superseded. Close with link to this spec. |
