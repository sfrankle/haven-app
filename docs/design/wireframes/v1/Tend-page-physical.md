# Physical Logging Flow — Wireframe Walkthrough

> These wireframes show **interaction structure only**. Do not derive color, typography, spacing, or visual style from them. Follow `docs/design/brand.md` and `docs/design/visual-style.md` for all visual decisions.

---

## Overview

The Physical logging screen has three sections: **Energy**, **Body**, and **General**. A single submission can log any combination of these. All entries produced share the same timestamp.

Submit is enabled when the Energy slider is set OR at least 1 chip is present. See `docs/design/interaction.md` — *Navigation + flat chips* pattern.

Body areas and Whole Body are navigation only — selecting an area is never a chip. Only states (Tier-2) become chips. Body area chips accumulate freely across areas.

**MVP note:** body area selection uses a text list. A tappable body silhouette image is a future enhancement.

---

## Screen structure

One screen with three sections. No sub-navigation — selecting a body area expands its state list inline.

---

## Flows

### Flow 1 — Energy only
1. Tend home → tap **Physical**
2. Use slider to set Energy level (1–5)
3. Tap **Submit**
4. Success indicator → return to Tend home

### Flow 2 — Body area → state(s)
1. Tend home → tap **Physical**
2. Select a body area from the list (e.g. **Head**)
3. State list appears — select one or more states (e.g. Headache)
4. Optionally set severity (1–5) for the selected state(s)
5. A chip is added to the tray for each selected state
6. Repeat steps 2–5 for additional areas if needed
7. Tap **Submit**
8. Success indicator → return to Tend home

### Flow 3 — Whole Body → state(s)
1. Tend home → tap **Physical**
2. Select **Whole Body**
3. State list appears — select one or more states (e.g. Achy, Tense)
4. Optionally set severity (1–5)
5. Chips added to tray
6. Repeat if needed
7. Tap **Submit**
8. Success indicator → return to Tend home

### Flow 4 — Any combination
1. Tend home → tap **Physical**
2. Add any combination of: Energy slider, Body area → state(s), Whole Body → state(s)
3. Tap **Submit**
4. Success indicator → return to Tend home

---

## Chip behaviour

- Selecting a body area or Whole Body opens its state list — the area itself is never a chip
- Selecting a state adds a chip to the tray
- Tapping a chip deselects it and removes it from the tray
- Chips from multiple areas accumulate (e.g. Head → Headache and Whole Body → Achy are both valid chips in the same submission)
- Submit disappears when Energy is unset AND the tray is empty

---

## Terminology

Use **states** throughout — not symptoms. States covers both negative (Headache, Achy) and positive (Clear-headed, Relaxed) without implying something is wrong.
