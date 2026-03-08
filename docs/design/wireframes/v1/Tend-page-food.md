# Food Logging Flow — Wireframe Walkthrough

> These wireframes show **interaction structure only**. Do not derive colour, typography, spacing, or visual style from them. Follow `docs/design/brand.md` and `docs/design/visual-style.md` for all visual decisions.

---

## Overview

Food logging is a search-and-select flow. The user builds up a set of food chips by searching and selecting labels. Submit appears once at least one chip is present. See `docs/design/interaction.md` — *Flat chips* pattern.

---

## Frame-by-frame

### Food-1 — Entry point
User is on the Tend home screen. They tap the **Food** tile.

---

### Food-2 — Default suggestions
Food logging screen opens. Search bar is present but empty. Below it, suggestions are time-of-day-aware — foods the user commonly logs in this time block surface first (e.g. morning, midday, afternoon, evening). Blocks are approximate; suggestions are ranked by proximity to the current time, not exact time match. No chips yet. No submit button.

---

### Food-3 — Search in progress
User taps the search bar — keyboard opens. User types **"Ch"**. Suggestions filter to prefix matches: Chicken, Cheese, Cheese Goat. Already-selected items are excluded from suggestions.

**Search matching priority (MVP):**
- Prefix matches on the first word rank highest (Ch → Chicken, Cheese)
- Mid-word matches (e.g. "Ch" in "Cinnamon Toast Crunch") are low priority and may not be returned at all in MVP
- Robust fuzzy / mid-word search is post-MVP

---

### Food-4 — Item selected
User taps **Chicken**. Chicken chip is added to the tray. Submit button appears. Search bar clears. Keyboard focus remains in the search bar, ready for the next item. Suggestions reset to defaults (minus already-selected items — Chicken does not appear again).

---

### Food-5 — Continued selection / submit
User continues adding items, or taps **Submit**. Entry is saved with all selected labels. Success indicator → return to Tend home.

---

## Chip behaviour

- Selecting a suggestion adds it as a chip
- Tapping a chip removes it and makes that item available in suggestions again
- Submit disappears when all chips are removed
- Minimum 1 chip to submit
- See `docs/design/interaction.md` — *Flat chips* pattern

---

## Open question
Screen header copy reads "What did you eat / drink?" — confirm whether this is intended microcopy or a placeholder before implementation.
