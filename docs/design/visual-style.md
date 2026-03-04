# Haven Visual Style

Version: 1.1
Scope: Color tokens, typography, component patterns, and motion.

## Color System

Palette derived directly from the app icon. The cool tones (indigo, teal, plum) are dominant; warm tones (peach, yellow) are accents. Cohesion comes from usage discipline — let the cool family carry the UI, warm tones appear rarely and intentionally.

### Core Palette

| Token | Value | Name | Role |
|-------|-------|------|------|
| `ink` | <div style="width:40px;height:20px;background:#361B45;border-radius:4px;"></div> #361B45 | Deep Plum | Primary ink for all text (body + headings), core icons, nav labels |
| `interactive` | <div style="width:40px;height:20px;background:#3B4E77;border-radius:4px;"></div> #3B4E77 | Night Sky | Primary buttons, links, selected states, active tab/icon, key interactive UI |
| `chrome` |<div style="width:40px;height:20px;background:#7393A1;border-radius:4px;"></div> #7393A1 | Air Force Blue | Quiet supporting UI (inactive icons, subtle illustrations, large low-contrast fills); **not** for body text |
| `background` |<div style="width:40px;height:20px;background:#FFF3E6;border-radius:4px;"></div> #FFF3E6 | Base Warm | Default screen background (light mode), reduces glare and adds grounded warmth |
| `surface` |<div style="width:40px;height:20px;background:#FFFFFF;border-radius:4px;"></div> #FFFFFF | Paper White | Cards, sheets, modals sitting on `background` |
| `surfaceVariant` |<div style="width:40px;height:20px;background:rgba(59,78,119,0.06);border-radius:4px;"></div> rgba(59,78,119,0.06) | Sky Wash | Grouped sections, secondary panels, subtle containers (very light tint) |
| `glow` |<div style="width:40px;height:20px;background:#F6C7B9;border-radius:4px;"></div> #F6C7B9 | Glow Peach | Warm emotional accent: focus rings, insight highlights, “saved” warmth moments (sparingly) |
| `candlelight` |<div style="width:40px;height:20px;background:#FEEFBA;border-radius:4px;"></div> #FEEFBA | Vanilla Custard | Ultra-sparing sparkle/candlelight: constellation dots, micro-badges, tiny highlights (never for buttons/text) |

### Semantic Colors

Always pair with an icon and label — never rely on color alone.

| Token | Value | Use |
|-------|-------|-----|
| `success` | #2F6F62 | Confirmation states |
| `warning` | #A6712A | Caution states |
| `error` | #9B3A4A | Error states only |

Use semantic colors at low opacity for backgrounds (tinted wash + ink text), not as solid fills.

### Dark Mode

| Role | Value |
|------|-------|
| Background | `#1B0F22` |
| Surface | `#24142D` |
| Text | `#FFF3E6` (base warm) |
| Secondary text | `#FFF3E6` at 78% opacity |

### Brand Gradient

For icon and hero use only: `#EFC5BB` → `#4F557D` → `#7393A1`

### Usage Guidance

- Haven is light mode by default
- 60% neutral surfaces (`background`, `surface`)
- 30% cool brand tones (`interactive`, `secondary`)
- 10% warm accents (`glow`, `accent`) — keep meaningful and rare
- Semantic colors appear only for their intended states, never decoratively

## Typography

Two font families:

| Family | Role | Source |
|--------|------|--------|
| **Philosopher** | Display, headlines, titles | Bundled locally — the brand voice, use for magic moments |
| **Lexend** | Body, labels, UI text | Bundled locally — optimised for readability at small sizes |

| Text role | Family | Weight |
|-----------|--------|--------|
| Display / H1 / H2 | Philosopher | Bold |
| H3 / prominent labels | Philosopher | Regular |
| Body / caption / meta | Lexend | Regular |
| UI labels / buttons | Lexend | Medium |

- Follow Material 3 type scale sizing
- Body text: minimum 16sp, line-height 1.5–1.65
- Max line length for notes/body: 60–75 characters
- Avoid ultra-light weights
- Philosopher carries the brand's reflective quality — reserve it for moments that earn it

## Data Visualisation

For pattern charts and correlation displays (Weave):

- Grid/axis lines: `ink` at 10% opacity
- Primary data series: `interactive` (`#3B4E77`)
- Highlight / insight points: `glow` (`#F6C7B9`)
- "Today" marker: ink text + glow halo
- Never use more than one warm highlight per chart — it keeps the moment special

## Components

**Buttons (primary):** `interactive` fill, `background` text, pill-shaped or large-rounded corners.

**Buttons (secondary):** transparent fill, `ink` border at 22% opacity, `ink` text.

**Cards:** rounded corners, subtle elevation only, spacious internal padding, `surface` background.

**Entry type grid:** rounded tiles, clear icon + label, consistent height and touch targets.

**Focus rings:** `glow` (`#F6C7B9`) — feels warm and safe rather than alarming.

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
- Semantic colors used decoratively
- Ultra-light font weights
