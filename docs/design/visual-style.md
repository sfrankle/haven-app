# Haven Visual Style

Version: 1.0
Scope: Color tokens, typography, component patterns, and motion.

## Color System

Palette derived directly from the app icon. The cool tones (indigo, teal, plum) are dominant; warm tones (rose, yellow) are accents. Cohesion comes from usage discipline — let the cool family carry the UI, warm tones appear rarely and intentionally.

### Core Palette

| Token | Value | Name | Role |
|-------|-------|------|------|
| `primary` | `#4F557D` | dusty grape | Main buttons, active states, key UI elements |
| `secondary` | `#7393A1` | air force blue | Supporting elements, quieter chrome |
| `tertiary` | `#EFC5BB` | almond silk | Warm highlights, gentle accents |
| `accent` | `#FEEFBA` | vanilla custard | Sparse warmth — use like a candle, not a floodlight |
| `error` | `#AE4C56` | dusty mauve | Error and alert states only |
| `background` | `#F4F2F8` | ghost white | Screen backgrounds (light mode default) |
| `surfaceVariant` | `#EAE7F0` | — | Card and container surfaces |
| `onBackground` | `#462048` | blackberry cream | Primary text color |
| Dark surface | `#462048` | blackberry cream | Dark mode backgrounds — not pure black |

### Brand Gradient

For icon and hero use only: `#EFC5BB` → `#4F557D` → `#7393A1`

### Usage guidance

- Haven is light mode by default; dark mode uses `#462048`-family surfaces
- 60% neutral surfaces (`background`, `surfaceVariant`)
- 30% cool brand tones (`primary`, `secondary`)
- 10% warm accents (`tertiary`, `accent`) — keep them meaningful and rare
- `error` (`#AE4C56`) appears only for genuine errors, never for style

## Typography

Primary font family: **Philosopher** — bundled locally in `app/src/main/res/font/`.

Decision: V1 is locked to Philosopher for brand voice consistency. Inter and Plus Jakarta Sans are noted alternatives but are not current defaults.

| Role | Weight |
|------|--------|
| Display / Headline / Title | Philosopher Bold |
| Body / Label | Philosopher Regular |

- Follow Material 3 type scale sizing
- Slightly increase letter spacing on large headers where readability benefits
- Favor readability over stylization

## Components

**Buttons:** pill-shaped or large-rounded corners; calm contrast, no aggressive saturated fills.

**Cards:** rounded corners, subtle elevation only, spacious internal padding.

**Entry type grid:** rounded tiles, clear icon + label, consistent height and touch targets.

## Motion

- Prefer fade and gentle easing transitions
- Keep transitions short and low-amplitude
- Avoid bounce, spring-heavy, or celebratory motion
- Decorative effects should be rare and non-blocking

## Anti-Patterns

Do not introduce:
- Gamified visuals (trophies, streak flames, confetti)
- Character mascots
- Dense dashboards on primary logging screens
- Red or warning tones for non-error states
