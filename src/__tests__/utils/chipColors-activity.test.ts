import {
  colorForActivityLabel,
  CATEGORY_CHIP_COLORS,
  CATEGORY_CHIP_COLOR_FALLBACK,
} from '@/constants/chipColors';
import { colors } from '@/constants/theme';

describe('colorForActivityLabel', () => {
  it('returns the correct color for each known category', () => {
    expect(colorForActivityLabel({ categoryName: 'Move' })).toBe(colors.chipMint);
    expect(colorForActivityLabel({ categoryName: 'Connect' })).toBe(colors.chipRose);
    expect(colorForActivityLabel({ categoryName: 'Create' })).toBe(colors.chipButter);
    expect(colorForActivityLabel({ categoryName: 'Reflect' })).toBe(colors.chipLavender);
    expect(colorForActivityLabel({ categoryName: 'Breathe' })).toBe(colors.chipAqua);
    expect(colorForActivityLabel({ categoryName: 'Contribute' })).toBe(colors.chipSage);
    expect(colorForActivityLabel({ categoryName: 'Restore' })).toBe(colors.chipPeriwinkle);
    expect(colorForActivityLabel({ categoryName: 'Nourish' })).toBe(colors.chipPeach);
    expect(colorForActivityLabel({ categoryName: 'Structure' })).toBe(colors.chipSage);
  });

  it('returns the fallback for null categoryName', () => {
    expect(colorForActivityLabel({ categoryName: null })).toBe(CATEGORY_CHIP_COLOR_FALLBACK);
  });

  it('returns the fallback for an unknown category string', () => {
    expect(colorForActivityLabel({ categoryName: 'Unknown' })).toBe(CATEGORY_CHIP_COLOR_FALLBACK);
  });

  it('CATEGORY_CHIP_COLORS contains all 9 expected categories', () => {
    const expected = [
      'Move', 'Connect', 'Create', 'Reflect', 'Breathe',
      'Contribute', 'Restore', 'Nourish', 'Structure',
    ];
    expected.forEach((cat) => {
      expect(cat in CATEGORY_CHIP_COLORS).toBe(true);
    });
    expect(Object.keys(CATEGORY_CHIP_COLORS)).toHaveLength(9);
  });

  it('Contribute and Structure both map to chipSage', () => {
    expect(colorForActivityLabel({ categoryName: 'Contribute' })).toBe(colors.chipSage);
    expect(colorForActivityLabel({ categoryName: 'Structure' })).toBe(colors.chipSage);
  });
});
