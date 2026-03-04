# Haven Interaction Principles

Version: 1.0
Scope: Cross-screen interaction rules and spacing rhythm.

## Core Rules

**Logging is faster than thinking.**
Default to taps over typing. Surface recent and frequent options first. Keep primary logging actions reachable with one hand.

**One primary action per screen.**
Each screen has a single dominant purpose. Secondary actions are visually quiet and optional.

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

## Error Handling

- Use neutral, actionable language.
- Explain what failed and how to recover.
- Avoid blame language.

## Accessibility

- Touch targets meet Material minimum size guidance.
- Color is never the only signal.
- Respect system font scaling and dynamic type.
