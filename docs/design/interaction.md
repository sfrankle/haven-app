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
No streak pressure. No negative empty-state language. No warning color usage unless a real error occurs.

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

**Navigation + flat chips** (Physical)
Tier-1 items (body areas: Head, Whole Body, etc.) are navigation only — they are never chips and cannot be submitted alone. Tier-2 items (symptoms/states: Headache, Achy, etc.) become chips. Chips accumulate freely across any Tier-1 area. No replacement logic — a user can hold Headache (from Head) and Achy (from Whole Body) simultaneously. Physical also has an Energy slider (numeric, not a chip); submit is enabled when the Energy slider is set OR at least 1 chip is present.

**Full hierarchical chips** (Emotions)
Both tiers produce chips, with a replacement rule: selecting a child of an existing chip replaces that chip (more specific subsumes the parent). Selecting a sibling of an existing chip adds a new chip alongside it. A user can hold multiple chips from different branches simultaneously, but each branch path holds only its deepest selection.

## Error Handling

- Use neutral, actionable language.
- Explain what failed and how to recover.
- Avoid blame language.

## Accessibility

- Touch targets meet Material minimum size guidance.
- Color is never the only signal.
- Respect system font scaling and dynamic type.
