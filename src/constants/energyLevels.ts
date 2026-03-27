export const ENERGY_LEVELS: { value: number; label: string }[] = [
  { value: 1, label: 'Exhausted' },
  { value: 2, label: 'Weary' },
  { value: 3, label: 'Steady' },
  { value: 4, label: 'Rested' },
  { value: 5, label: 'Energised' },
];

/** Returns the label for a numeric energy value (1–5), or null if not found. */
export function energyLabel(value: number): string | null {
  return ENERGY_LEVELS.find((l) => l.value === value)?.label ?? null;
}
