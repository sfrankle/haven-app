import { useRef } from 'react';
import { CHIP_COLORS } from '@/constants/chipColors';

interface UseChipColorsResult {
  getNextColor: () => string;
  reset: () => void;
}

/**
 * Counter-based chip color assignment.
 * Assign colors sequentially at add-time; consecutive chips never share a color.
 * Colors are stable — removing chips does not trigger reassignment.
 */
export function useChipColors(): UseChipColorsResult {
  const counter = useRef(0);

  function getNextColor(): string {
    const color = CHIP_COLORS[counter.current % CHIP_COLORS.length];
    counter.current += 1;
    return color;
  }

  function reset(): void {
    counter.current = 0;
  }

  return { getNextColor, reset };
}
