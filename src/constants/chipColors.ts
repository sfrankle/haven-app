import { colors } from '@/constants/theme';

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
