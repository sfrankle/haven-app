import { colors } from '@/constants/theme';
import type { Label } from '@/lib/db/query-types';

export const CHIP_COLORS: string[] = [
  colors.chipRose,
  colors.chipPeach,
  colors.chipButter,
  colors.chipSage,
  colors.chipMint,
  colors.chipAqua,
  colors.chipPeriwinkle,
  colors.chipLavender,
];

/**
 * Maps Activity category names → chip background colour.
 *
 * 9 categories, 8 tokens: Structure and Contribute share chipSage.
 * Custom activities (no category) use CATEGORY_CHIP_COLOR_FALLBACK.
 */
export const CATEGORY_CHIP_COLORS: Record<string, string> = {
  Move:       colors.chipMint,
  Connect:    colors.chipRose,
  Create:     colors.chipButter,
  Reflect:    colors.chipLavender,
  Breathe:    colors.chipAqua,
  Contribute: colors.chipSage,
  Restore:    colors.chipPeriwinkle,
  Nourish:    colors.chipPeach,
  Structure:  colors.chipSage, // shares with Contribute — only 8 tokens for 9 categories
};

export const CATEGORY_CHIP_COLOR_FALLBACK = colors.chipPeriwinkle;

/**
 * Maps Food category names → chip background colour.
 *
 * 8 categories, 8 tokens — one-to-one mapping.
 * Custom foods (no category) use CATEGORY_CHIP_COLOR_FALLBACK.
 */
export const FOOD_CATEGORY_CHIP_COLORS: Record<string, string> = {
  Grains:         colors.chipButter,
  Dairy:          colors.chipPeriwinkle,
  Protein:        colors.chipRose,
  Vegetables:     colors.chipSage,
  Fruit:          colors.chipPeach,
  'Nuts & Seeds': colors.chipMint,
  Drinks:         colors.chipAqua,
  Snacks:         colors.chipLavender,
};

/** Returns the chip background colour for a food label based on its category. */
export function colorForFoodLabel(label: Pick<Label, 'categoryName'>): string {
  if (label.categoryName && label.categoryName in FOOD_CATEGORY_CHIP_COLORS) {
    return FOOD_CATEGORY_CHIP_COLORS[label.categoryName];
  }
  return CATEGORY_CHIP_COLOR_FALLBACK;
}

/**
 * Returns the chip background colour for an emotion label.
 *
 * Emotion labels have no category seed data, so lavender is used for all
 * tiers — it is tonally appropriate for the reflective nature of this flow.
 */
export function colorForEmotionLabel(_label: Pick<Label, 'categoryName'>): string {
  return colors.chipLavender;
}

/** Returns the chip background colour for an activity label based on its category. */
export function colorForActivityLabel(label: Pick<Label, 'categoryName'>): string {
  if (label.categoryName && label.categoryName in CATEGORY_CHIP_COLORS) {
    return CATEGORY_CHIP_COLORS[label.categoryName];
  }
  return CATEGORY_CHIP_COLOR_FALLBACK;
}
