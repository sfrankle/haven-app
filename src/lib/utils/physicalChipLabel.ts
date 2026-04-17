// ─── Types ──────────────────────────────────────────────────────────────────

export type EnergyChip = {
  kind: 'energy';
  id: 'energy';
  value: number;
};

export type StateChip = {
  kind: 'state';
  id: number;
  labelName: string;
  parentName: string | null;
  severity: number | null;
};

export type PhysicalChip = EnergyChip | StateChip;

// ─── Constants ───────────────────────────────────────────────────────────────

const WHOLE_BODY_NAMES = ['whole body', 'body'];

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Returns a formatted display label for a physical chip.
 *
 * - Energy chip: "Energy: N/5"
 * - State chip with no severity: label name (with optional area prefix)
 * - State chip with severity 1-5: "name (N/5)"
 * - State chip with severity 0: "name (absent)" — confirmed symptom-absent today
 */
export function formatChipLabel(chip: PhysicalChip): string {
  if (chip.kind === 'energy') {
    return `Energy: ${chip.value}/5`;
  }
  const parentName = chip.parentName;
  const showPrefix =
    parentName !== null &&
    !WHOLE_BODY_NAMES.includes(parentName.toLowerCase());
  const base = showPrefix ? `${parentName}: ${chip.labelName}` : chip.labelName;
  if (chip.severity === 0) {
    return `${base} (absent)`;
  }
  if (chip.severity !== null) {
    return `${base} (${chip.severity}/5)`;
  }
  return base;
}
