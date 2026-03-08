# Physical Logging Flow — Wireframe Walkthrough

> These wireframes show **interaction structure only**. Do not derive color, typography, spacing, or visual style from them. Follow `docs/design/brand.md` and `docs/design/visual-style.md` for all visual decisions.
>
> Screen copy ("How's your body doing today?", "What's do you want to report on?", energy labels) is **placeholder** — do not implement verbatim.

---

## Overview

Physical logging is a single screen with two sections: an **Energy slider** and a **flat state search**. No body area navigation — the user searches directly for states. The area context (e.g. "Gut") is inferred from the label's parent in the DB and shown on the chip, but the user never explicitly selects a body area.

Submit appears when Energy is set OR at least 1 state chip is present. See `docs/design/interaction.md` — *Flat chips* pattern, extended with hold-for-severity.

---

## Frame-by-frame

### Physical-1 — Entry point
User is on the Tend home screen. They tap the **Physical** tile.

---

### Physical-2 — Physical screen
Physical screen opens. Two sections separated by a divider:

**Energy** — horizontal slider with 5 labelled positions (placeholder labels). No value set yet.

**State search** — search bar (empty) with suggestion chips below showing recent states (e.g. Strong, Headache, Bloated). No chips in tray. No submit button.

User drags the Energy slider to position 4/5.

---

### Physical-3 — Energy set; submit appears
Energy slider is at 4/5. An **Energy: 4/5** chip appears in the tray at the bottom. Submit button appears. User taps the search bar — keyboard opens.

---

### Physical-4 — Search: area-contextual results
User types **"gut"**. Suggestions filter to gut-related states the user commonly logs: Bloated, Cramps, Feeling good!

User taps **Cramps**.

---

### Physical-5 — State chip added
**Gut: cramps** chip appears in the tray alongside Energy: 4/5. Submit remains available.

Chip interactions:
- **Tap** — removes the chip
- **Hold** — opens inline severity slider

---

### Physical-6 — Severity: hold to set
User holds the **Gut: cramps** chip. An inline severity slider (1–5) appears anchored to the chip. User drags to 4.

---

### Physical-7 — Severity confirmed
Chip updates to **Gut: cramps (4/5)**. Cramps is removed from suggestions — already-selected states are excluded. Submit remains available.

---

### Physical-8 — Continue logging
User continues typing **"gut d"** — suggestions narrow to Diarrhea. Tray shows Energy: 4/5 + Gut: cramps (4/5). User can keep adding states or submit.

---

## Chip behaviour

| Interaction | Result |
|-------------|--------|
| Tap suggestion | Adds chip; suggestion removed from results |
| Tap chip | Removes chip; state returns to suggestions |
| Hold chip | Opens inline severity slider (1–5) |
| Set severity | Chip label updates, e.g. "Gut: cramps (4/5)" |
| Submit enabled | When Energy is set OR ≥1 state chip present |
| Submit disappears | When Energy is unset AND tray is empty |

---

## Chip label format

- State with area context: `[Area]: [state]` — e.g. **Gut: cramps**
- State with severity: `[Area]: [state] ([severity]/5)` — e.g. **Gut: cramps (4/5)**
- Whole-body states (no specific area): format TBD
- Energy: **Energy: [value]/5**

---

## Search behaviour

- Default (empty search): shows recently used states
- Typing: filters to matching states; area name can be used as context (e.g. "gut" surfaces gut-related states, "gut d" narrows to Diarrhea)
- Already-selected states are excluded from results
- `+ Add [query]` offered when no results match — creates a custom state

> **Open question:** exact search matching logic is TBD. The wireframes show area-contextual search but the full rules — whether area names are searchable keywords, how recency interacts with typed search — still need to be worked out.
