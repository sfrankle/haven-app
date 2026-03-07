# Emotions Logging Flow — Wireframe Walkthrough

> These wireframes show **interaction structure only**. Do not derive color, typography, spacing, or visual style from them. Follow `docs/design/brand.md` and `docs/design/visual-style.md` for all visual decisions.

---

## Overview

The Emotions logging flow uses a split-pane layout with three tiers of selection. Each tier narrows specificity. The user can save at any tier, and can select across multiple branches before submitting.

**Left column** — current tier's options
**Right column** — children of the selected item
**Bottom tray** — selected chips; submit button appears once at least one chip is present

---

## Frame-by-frame

### Emotions-1 — Entry point
User is on the Tend home screen. They tap the **Emotions** tile.

---

### Emotions-2 — Tier 1: Cluster selection
The Emotions screen opens. The left column shows the five top-level clusters:

- Bright
- Warm
- Still
- Heavy
- Charged

No selection yet. Right column is empty. No chips. No submit button.

User taps **Warm**.

---

### Emotions-3 — Tier 2: Named emotions
**Warm** is selected in the left column. Its Tier-2 emotions populate the right column. The other four clusters are greyed out.

User taps **Connected** in the right column.

---

### Emotions-4 — Tier 3: Granular refinement
The layout shifts: **Tier-2 emotions** (under Warm) are now in the left column, with **Connected** selected and its siblings greyed out. The right column shows Tier-3 emotions under Connected.

A chip — **Connected** — appears in the bottom tray. The submit button appears.

User taps **Loved** in the right column.

---

### Emotions-5 — Deeper selection replaces chip
**Loved** is now selected in the right column. In the bottom tray, **Connected** is replaced by **Loved** — the more specific selection wins within this branch.

Submit button remains available.

User taps **Back**.

---

### Emotions-6 — Back navigation preserves state
The view returns to the Tier-1 cluster list. **Warm** is still selected (highlighted). The **Loved** chip remains in the bottom tray. Submit button remains available.

User taps **Helpful** — a different Tier-2 emotion also under Warm.

---

### Emotions-7 — Second branch adds a chip
The left column shows Warm's Tier-2 emotions, with **Helpful** now selected and its siblings greyed out. The right column shows Tier-3 emotions under Helpful.

The bottom tray now shows two chips: **Loved** + **Helpful**. Each chip represents a separate branch.

User taps **Encouraged** in the right column.

---

### Emotions-8 — Second branch chip replaced
**Encouraged** replaces **Helpful** in the bottom tray — same rule: deepest selection wins within a branch.

Bottom tray: **Loved** + **Encouraged**. Submit button available.

User taps **Submit**. Entry is saved.

---

## Interaction rules

| Rule | Behavior |
|------|----------|
| Selecting a Tier-N item | Greys out siblings; populates right column with children |
| Going deeper in a branch | Replaces the current branch's chip with the more specific selection |
| Back navigation | Preserves all chips and selections |
| Selecting a sibling branch | Adds a new chip; does not affect other branches |
| Tapping a chip | Deselects it and removes it from the tray |
| Submit availability | Appears once at least 1 chip is present |
| Minimum to submit | 1 chip |
