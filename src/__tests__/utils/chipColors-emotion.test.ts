import { colorForEmotionLabel } from '@/constants/chipColors';
import { colors } from '@/constants/theme';

describe('colorForEmotionLabel', () => {
  it('always returns chipLavender regardless of categoryName', () => {
    expect(colorForEmotionLabel({ categoryName: null })).toBe(colors.chipLavender);
    expect(colorForEmotionLabel({ categoryName: 'Bright' })).toBe(colors.chipLavender);
    expect(colorForEmotionLabel({ categoryName: 'SomeOtherCategory' })).toBe(colors.chipLavender);
  });
});
