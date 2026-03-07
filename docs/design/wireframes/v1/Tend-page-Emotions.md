# Emotions Logging Flow — Wireframe Walkthrough

> These wireframes show **interaction structure only**. Do not derive color, typography, spacing, or visual style from them. Follow `docs/design/brand.md` and `docs/design/visual-style.md` for all visual decisions.

---

## Overview

The Emotions logging flow has three screens. Each screen is a split-pane (or single-column on Screen 1) that lets the user navigate a three-tier label hierarchy. The user can save at any tier, and can select across multiple branches before submitting.

**Bottom tray** — selected chips; submit button appears once at least one chip is present.

---

## Screen structure

| Screen | Left column | Right column | Back navigates to |
|--------|-------------|--------------|-------------------|
| 1 | Tier-1 clusters | — | Tend home |
| 2 | Tier-1 clusters | Tier-2 emotions (children of selected T1) | Tend home |
| 3 | Tier-2 emotions | Tier-3 refinements (children of selected T2) | Screen 2 |

### Interaction rules per screen

**Screen 2**
- Tapping a Tier-1 item (left) — swaps the right column to show that cluster's Tier-2 emotions. Stays on Screen 2. Previously greyed-out clusters become tappable; the newly selected one is highlighted.
- Tapping a Tier-2 item (right) — advances to Screen 3.

**Screen 3**
- Tapping a Tier-2 item (left) — swaps the right column to show that emotion's Tier-3 refinements. Stays on Screen 3.
- Tapping a Tier-3 item (right) — selects it; adds or replaces a chip in the bottom tray for this branch.

---

## Frame-by-frame

### Emotions-1 — Entry point
User is on the Tend home screen. They tap the **Emotions** tile.

---

### Emotions-2 — Screen 1: Tier-1 cluster selection
The Emotions screen opens (Screen 1). The left column shows the five top-level clusters:

- Bright
- Warm
- Still
- Heavy
- Charged

No selection yet. No chips. No submit button. Back returns to Tend home.

User taps **Warm**.

---

### Emotions-3 — Screen 2: Tier-1 + Tier-2
Advances to Screen 2. **Warm** is selected (highlighted) in the left column. Its Tier-2 emotions populate the right column. The other four clusters are de-emphasized but still tappable.

User taps **Connected** in the right column — advances to Screen 3.

---

### Emotions-4 — Screen 3: Tier-2 + Tier-3
Screen 3. Left column shows Tier-2 emotions under Warm, with **Connected** selected and its siblings de-emphasized. Right column shows Tier-3 emotions under Connected.

A chip — **Connected** — appears in the bottom tray. Submit button appears.

User taps **Loved** in the right column.

---

### Emotions-5 — Deeper selection replaces chip
**Loved** is now selected in the right column. In the bottom tray, **Connected** is replaced by **Loved** — the deeper selection wins within this branch.

Submit button remains available.

User taps **Back** — returns to Screen 2.

---

### Emotions-6 — Back to Screen 2: Tier-1 + Tier-2
Screen 2. **Warm** is still selected (highlighted) in the left column; its Tier-2 emotions are shown in the right column. The **Loved** chip remains in the bottom tray. Submit button remains available.

From here the user could tap a different Tier-1 cluster (e.g. Heavy) to start a new branch there. Instead, they tap **Helpful** in the right column — another Tier-2 emotion under Warm — advancing to Screen 3.

---

### Emotions-7 — Screen 3: second branch
Screen 3. Left column shows Warm's Tier-2 emotions with **Helpful** selected; right column shows Tier-3 emotions under Helpful.

Bottom tray now shows two chips: **Loved** + **Helpful**. Each chip represents a separate branch.

User taps **Encouraged** in the right column.

---

### Emotions-8 — Second branch chip replaced; submit
**Encouraged** replaces **Helpful** in the bottom tray.

Bottom tray: **Loved** + **Encouraged**. Submit button available.

User taps **Submit**. Entry is saved.

---

## Chip rules

| Action | Result |
|--------|--------|
| Tapping a Tier-2 or Tier-3 item | Adds a chip for this branch, or replaces the existing chip if one exists for this branch |
| Going deeper in a branch | Replaces this branch's chip with the more specific selection |
| Tapping a chip | Deselects it and removes it from the tray |
| Selecting a new branch (different T2 or different T1 path) | Adds a new chip alongside existing ones |
| Minimum to submit | 1 chip |
