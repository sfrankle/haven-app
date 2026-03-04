# Haven Visual Style

Version: 1.0
Scope: Color tokens, typography, component patterns, and motion.

## Color System

### Core Palette

| Token | Value | Name |
|-------|-------|------|
| `primary` | `#2E2A3A` | deep night |
| `secondary` | `#7FA38A` | dusty sage |
| `tertiary` | `#A77CA4` | muted mauve |
| `accent` | `#F6C177` | warm glow |
| `background` | `#F4F1F3` | soft fog |
| `surfaceVariant` | `#EAE6EB` | — |

### Brand Gradient

For icon and hero use only: `#D8A7B1` → `#A77CA4` → `#5E8B8C`

### Usage guidance

- 60% neutral surfaces
- 30% muted brand tones
- 10% accent — keep warm accent meaningful and rare
- Dark mode: deep charcoal/navy surfaces, no pure black primaries

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
