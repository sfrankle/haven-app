import { renderHook, act } from '@testing-library/react-native';
import { useChipColors } from '../useChipColors';
import { CHIP_COLORS } from '../../constants/chipColors';

describe('useChipColors', () => {
  it('returns the first color on first call', () => {
    const { result } = renderHook(() => useChipColors());
    expect(result.current.getNextColor()).toBe(CHIP_COLORS[0]);
  });

  it('consecutive calls return different colors', () => {
    const { result } = renderHook(() => useChipColors());
    const first = result.current.getNextColor();
    const second = result.current.getNextColor();
    expect(first).not.toBe(second);
  });

  it('wraps around after exhausting the palette', () => {
    const { result } = renderHook(() => useChipColors());
    for (let i = 0; i < CHIP_COLORS.length; i++) {
      result.current.getNextColor();
    }
    expect(result.current.getNextColor()).toBe(CHIP_COLORS[0]);
  });

  it('reset() resets the counter to the beginning', () => {
    const { result } = renderHook(() => useChipColors());
    result.current.getNextColor();
    result.current.getNextColor();
    act(() => {
      result.current.reset();
    });
    expect(result.current.getNextColor()).toBe(CHIP_COLORS[0]);
  });
});
