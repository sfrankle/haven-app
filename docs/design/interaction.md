# Haven Interaction Principles

Version: 1.0
Scope: Cross-screen interaction rules and spacing rhythm.

## Core Rules

**Logging is faster than thinking.**
Default to taps over typing. Surface recent and frequent options first. Keep primary logging actions reachable with one hand.

**One primary action per screen.**
Each screen has a single dominant purpose. Secondary actions are visually quiet and optional.

**No setup before first use.**
First launch goes straight to Tend with sensible defaults. No onboarding wizard, no required configuration. Users can adjust preferences in Settings whenever they choose.

**Insights are pull, not push.**
Users opt into insights in Weave. Do not inject analytics into the Tend logging flow.

**No guilt mechanics.**
No streak pressure. No negative empty-state language. No warning colour usage unless a real error occurs.

**Calm by default.**
Stable layouts without abrupt movement. Minimal interruptions (dialogs, toasts, banners). Motion supports orientation, not attention-seeking.

## Data Entry Rules

- Never require free text to save a basic log.
- Prefill with likely values when confidence is high.
- Support quick cancel without losing prior state unexpectedly.
- Confirmation should be concise: "Saved." is sufficient.

## Layout Hierarchy

- Top of screen: orientation context only (date/state) — no dense controls.
- Middle: primary task controls.
- Bottom: optional supporting context.
- Bottom navigation remains visible on all screens.

## Spacing Rhythm

These are canonical values. Screen-level decisions may override with justification.

| Role | Value |
|------|-------|
| Horizontal page padding | 16dp |
| Major section gap | 24dp |
| Minor element gap | 12dp |
| Bottom content padding above nav | 16dp minimum |

## Shared Patterns

### Multi-select with chips

Used in: Food, Physical, Emotions, Activity.

Selected items appear as chips in a tray at the bottom of the screen. Tapping a chip deselects it and removes it from the tray. The submit button is only visible when at least one chip is present — it disappears entirely when the tray is empty (not disabled/greyed out).

Three variants:

**Flat chips** (Food, Activity)
Each label selection adds a chip. Chips accumulate independently. Tapping a chip removes it. No replacement logic.

**Flat chips + optional severity** (Physical)
Same flat chip mechanic as Food, with two extensions:

(1) The Energy slider is a separate input on the same screen — setting it creates an Energy chip in the tray.

(2) State chips support optional severity via a two-stage affordance:
- When a state is selected, a compact severity row (1–5) appears just above the chip tray for ~2 seconds
- If the user sets severity during that window, the chip updates to include it (e.g. "Gut: cramps (4/5)") and the row dismisses
- If the user ignores it, the row auto-dismisses and the chip shows a small secondary icon (··· or ↕) indicating severity is available
- Tapping that icon reopens the severity row for that chip at any time
- Tapping the chip itself still removes it

Submit is enabled when Energy is set OR at least 1 state chip is present.

**Full hierarchical chips** (Emotions)
Both tiers produce chips, with a replacement rule: selecting a child of an existing chip replaces that chip (more specific subsumes the parent). Selecting a sibling of an existing chip adds a new chip alongside it. A user can hold multiple chips from different branches simultaneously, but each branch path holds only its deepest selection.

## Navigation Behaviour

### File structure

```
app/(tabs)/
  _layout.tsx          ← Tabs navigator
  (tend)/
    _layout.tsx        ← Stack for Tend + blur listener (resets stack when tab loses focus)
    index.tsx          ← Tend home
    log/
      hydration.tsx    ← one file per entry type
      sleep.tsx
      activity.tsx
  trace.tsx
  weave.tsx
  ...
```

The `(tend)` group is transparent (no URL change). Log screens are inside the Tend Stack, so the tab bar remains visible. The blur listener discards log state when the user switches to another tab.

To add a new log screen: create `app/(tabs)/(tend)/log/<type>.tsx`. No other files need changing.

### Entry type logging screens

Entry type logging screens (Replenish, Sleep, Activity, etc.) are accessed only from Tend home by tapping an entry type tile. They cannot be reached directly from another logging screen.

| Scenario | Result |
|----------|----------------|
| `Tend` → tap entry type A -> `log screen A` → swipe back | `Tend` |
| `Tend` → tap entry type A -> `log screen A` → tap Tend tab | `Tend` |
| `Tend` → tap entry type A -> `log screen A` → complete save | `Tend` |
| `Tend` → tap entry type A -> `log screen A` → swipe back → `Tend` → tap entry type B → `log screen B` → swipe back | `Tend` |
| `Tend` → tap entry type A → `log screen A` → enter data (don't save) → swipe back → `Tend` → tap entry type A again | `log screen A` — empty, no cached state |
| Multi-screen log flow → back mid-flow | Previous step in the log flow |
| Multi-screen log flow → back on first screen -> swipe back | `Tend` |
| `Tend` → tap entry type A -> `log screen A` → tap bottom `Trace` tab  → swipe back | `Tend` |
| `Tend` → tap entry type A -> `log screen A` → tap bottom `Trace` tab → `Trace` → tap `Tend` | `Tend` |

> Tab bar remains visible on all log screens. Tapping any tab navigates normally. Tapping Tend tab while on a log screen always returns to Tend home.

## Error Handling

- Use neutral, actionable language.
- Explain what failed and how to recover.
- Avoid blame language.

## Accessibility

- Touch targets meet Material minimum size guidance.
- Colour is never the only signal.
- Respect system font scaling and dynamic type.
