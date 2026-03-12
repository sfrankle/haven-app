/**
 * Haven design tokens.
 * Values derived from docs/design/visual-style.md and docs/design/.
 * These are build-time constants — no React, no hooks.
 */

// ---------------------------------------------------------------------------
// Colors — light mode
// ---------------------------------------------------------------------------

export const colors = {
  // Core palette
  ink:            '#361B45',               // Deep Plum — all text, core icons
  interactive:    '#3B4E77',               // Night Sky — buttons, links, active states
  chrome:         '#7393A1',               // Air Force Blue — quiet supporting UI
  background:     '#FFF3E6',              // Base Warm — default screen background
  surface:        '#FFFFFF',              // Paper White — cards, sheets, modals
  surfaceVariant: 'rgba(59,78,119,0.06)', // Sky Wash — grouped sections, subtle containers
  glow:           '#F6C7B9',              // Glow Peach — focus rings, insight highlights
  candlelight:    '#FEEFBA',              // Vanilla Custard — constellation dots, micro-badges

  // Chip palette — assigned sequentially by useChipColors; see docs/design/visual-style.md
  chipRose:       '#F3D5E6', // Rosewash — soft emotional warmth
  chipPeach:      '#F9DCC4', // Apricot Mist — friendly, nourishing
  chipButter:     '#FEEFBA', // Butterlight — brightest pastel
  chipSage:       '#D9E7D2', // Sage Veil — grounded wellness
  chipMint:       '#DDEFE3', // Mint Fog — fresh/clean
  chipAqua:       '#D7F0F2', // Tidelight — water/clarity
  chipPeriwinkle: '#DDE7F2', // Periwinkle Haze — quiet intelligence
  chipLavender:   '#E8DFF5', // Lavender Cloud — reflective tone

  // Semantic colors (pair with icon + label; never decorative)
  success:        '#2F6F62',
  warning:        '#A6712A',
  error:          '#9B3A4A',
} as const;

// ---------------------------------------------------------------------------
// Colors — dark mode (defined now; consumed when dark mode UI is built)
// ---------------------------------------------------------------------------

export const colorsDark = {
  background:     '#1B0F22',               // Deep Plum Night
  surface:        '#24142D',               // Plum Surface
  text:           '#FFF3E6',               // Warm Ivory
  textSecondary:  'rgba(255,243,230,0.78)', // Soft Ivory
} as const;

// ---------------------------------------------------------------------------
// Brand gradient (icon and hero use only)
// ---------------------------------------------------------------------------

export const brandGradient = ['#EFC5BB', '#4F557D', '#7393A1'] as const;

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

export const fontFamilies = {
  philosopher:     'Philosopher',
  philosopherBold: 'Philosopher-Bold',
  lexend:          'Lexend',
  lexendMedium:    'Lexend-Medium',
} as const;

export const fontWeights = {
  regular: '400' as const,
  medium:  '500' as const,
  bold:    '700' as const,
} as const;

/**
 * Typography scale.
 * Roles follow Material 3 naming. Sizes in sp (React Native scales with system font size).
 * Line height expressed as a multiplier; multiply by size when applying.
 *
 * family: fontFamilies key
 * weight: fontWeights key
 * size:   sp
 * lineHeightMultiplier: recommended range midpoint
 */
export const typeScale = {
  // Display — Philosopher Bold — hero moments only
  displayLarge: {
    family:               fontFamilies.philosopherBold,
    weight:               fontWeights.bold,
    size:                 57,
    lineHeightMultiplier: 1.12,
  },
  displayMedium: {
    family:               fontFamilies.philosopherBold,
    weight:               fontWeights.bold,
    size:                 45,
    lineHeightMultiplier: 1.15,
  },

  // Headlines — Philosopher Bold
  headlineLarge: {
    family:               fontFamilies.philosopherBold,
    weight:               fontWeights.bold,
    size:                 32,
    lineHeightMultiplier: 1.25,
  },
  headlineMedium: {
    family:               fontFamilies.philosopherBold,
    weight:               fontWeights.bold,
    size:                 28,
    lineHeightMultiplier: 1.28,
  },

  // Titles — Philosopher Regular (prominent labels, H3)
  titleLarge: {
    family:               fontFamilies.philosopher,
    weight:               fontWeights.regular,
    size:                 22,
    lineHeightMultiplier: 1.3,
  },
  titleMedium: {
    family:               fontFamilies.philosopher,
    weight:               fontWeights.regular,
    size:                 16,
    lineHeightMultiplier: 1.5,
  },

  // Body — Lexend Regular — notes, captions, meta (minimum 16sp per spec)
  bodyLarge: {
    family:               fontFamilies.lexend,
    weight:               fontWeights.regular,
    size:                 16,
    lineHeightMultiplier: 1.57,
  },
  bodyMedium: {
    family:               fontFamilies.lexend,
    weight:               fontWeights.regular,
    size:                 14,
    lineHeightMultiplier: 1.42,
  },
  bodySmall: {
    family:               fontFamilies.lexend,
    weight:               fontWeights.regular,
    size:                 12,
    lineHeightMultiplier: 1.33,
  },

  // Labels / UI — Lexend Medium — buttons, nav labels, form fields
  labelLarge: {
    family:               fontFamilies.lexendMedium,
    weight:               fontWeights.medium,
    size:                 14,
    lineHeightMultiplier: 1.42,
  },
  labelMedium: {
    family:               fontFamilies.lexendMedium,
    weight:               fontWeights.medium,
    size:                 12,
    lineHeightMultiplier: 1.33,
  },
  labelSmall: {
    family:               fontFamilies.lexendMedium,
    weight:               fontWeights.medium,
    size:                 11,
    lineHeightMultiplier: 1.45,
  },
} as const;

// ---------------------------------------------------------------------------
// Spacing
// Values from docs/design/interaction.md — Spacing Rhythm.
// All values in dp.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Typography helpers
// ---------------------------------------------------------------------------

/** Compute a React Native lineHeight from a typeScale entry. */
export function lineHeight(scale: { size: number; lineHeightMultiplier: number }): number {
  return scale.size * scale.lineHeightMultiplier;
}

// ---------------------------------------------------------------------------
// Spacing
export const spacing = {
  pagePadding:      16, // Horizontal page padding
  sectionGap:       24, // Major section gap
  elementGap:       12, // Minor element gap
  navBottomPadding: 16, // Bottom content padding above nav (minimum)
} as const;
