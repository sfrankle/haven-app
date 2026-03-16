# Haven Design Guidance for Claude

Scope: Frontend design principles to follow when building Haven UI.

## Follow the Established Design System

Haven has a defined visual identity. Read `docs/design/` before making any UI, copy, or interaction decisions — the `CLAUDE.md` there maps what each file owns. Do not invent new colours, fonts, or copy patterns.

The caution below about purple applies to generic, saturated purple-on-white — not Haven's palette. Haven's muted mauve on soft fog surfaces is intentional and correct.

## Avoid Generic AI Aesthetics

You tend to converge toward predictable, "on distribution" outputs. In frontend design this produces what users call the AI-slop aesthetic. Avoid it.

Specific failure modes:
- Overused fonts (Inter, Roboto, Arial, system fonts) — Haven uses Philosopher, use that
- Clichéd color schemes — e.g. saturated purple gradients on stark white backgrounds (note: Haven's muted mauve on soft fog surfaces is intentional and correct)
- Predictable layouts and component patterns that lack context-specific character
- Cookie-cutter designs that could belong to any app

## Typography

See `docs/design/visual-style.md` → Typography.

## Motion (React Native)

Use React Native Reanimated or the built-in Animated API. Motion/Framer Motion is web-only and does not work in React Native.

See `docs/design/visual-style.md` → Motion for Haven's motion principles.

## Navigation

See `docs/design/interaction.md` → Navigation Behaviour for navigation decisions, file structure, and expected scenarios.

## Backgrounds and Surfaces

See `docs/design/visual-style.md` → Colour System for surface tokens and usage guidance.
