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

Haven uses two fonts — both bundled locally:
- **Philosopher** for display, headlines, and titles — the brand voice, reserved for moments that earn it
- **Lexend** for body text, UI labels, and captions — optimised for readability

Do not substitute either. Philosopher is magical but should not carry every text element — that's what Lexend is for.

## Motion (React Native)

Use React Native Reanimated or the built-in Animated API for transitions and micro-interactions. Motion/Framer Motion is web-only and does not apply here.

Focus animation effort on high-impact moments — a well-orchestrated screen entry with staggered reveals creates more delight than scattered micro-interactions. Follow Haven's motion guidelines: subtle, low-frequency, no bounce or celebratory motion.

## Logging Screen Navigation

All logging screens (sleep, hydration, food, emotions, physical, activity) must be placed inside `app/(tabs)/log/` — **not** in a top-level `app/log/` directory. The `(tabs)` group name is invisible in URLs, so `router.push('/log/sleep')` resolves correctly either way, but only screens inside `(tabs)/` inherit the tab bar. The tab bar must remain visible on all logging screens.

Required files for the log group:
- `app/(tabs)/log/_layout.tsx` — minimal Stack wrapper (created once, shared by all log screens)
- `app/(tabs)/log/<type>.tsx` — one file per entry type

## Backgrounds and Surfaces

Use the Haven surface tokens to create depth and atmosphere. Avoid defaulting to flat white or stark black. Layer surfaces using `background` and `surfaceVariant` tokens with appropriate elevation.
