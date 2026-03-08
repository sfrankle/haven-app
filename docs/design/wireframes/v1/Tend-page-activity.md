# Activity Logging Flow — Wireframe Walkthrough

> No wireframes for this flow — the interaction is sufficiently similar to Food that frames would be redundant. See `Tend-page-food.md` as the reference. Differences are noted below.

---

## Overview

Activity logging is search-and-select. The user builds a set of activity chips, then submits. The purpose is correlation fuel — logging what you did so Haven can find connections to how you felt, slept, or felt physically. Haven is not an exercise tracker; no duration, reps, pace, or intensity for MVP.

See `docs/design/interaction.md` — *Flat chips* pattern.

---

## Flow

1. Tend home → tap **Activity**
2. Activity screen opens: search bar + time-of-day-aware suggestions
3. User searches or selects from suggestions → chips accumulate
4. Optional notes
5. Submit → success indicator → return to Tend home

---

## Differences from Food

**Time-of-day-aware recents.** Suggestions are ordered by what the user typically logs in this time block (morning, midday, afternoon, evening) — not exact time matching and not just overall recency. A user who runs in the morning and does yoga in the afternoon sees those in the right order contextually. Blocks are approximate; suggestions are ranked by proximity to the current time.

**Category color-coding.** Activity chips are color-coded by category (Move, Create, Connect, Ground, etc.) as visual metadata. Categories are never navigated or selected — they're purely cosmetic context on the chip.

**Custom activities.** `+ Add [query]` creates a custom activity on the fly. Custom activities start with no category. Future seed updates may match them to defaults via the `seed_version` + name-matching pattern.

---

## Future iterations (post-MVP)

- Filters by category (show me only Move activities)
- Anchor tab handles suggesting and surfacing activities based on energy level or context — removing the need for manual search in many cases

---

## Known gap

No wireframes showing custom activity creation flow. The `+ Add [query]` pattern is consistent with Food and Physical but the UX for assigning a category to a new custom activity is unspecified. Defer category assignment to post-MVP — custom activities start uncategorized.
