import { shouldShowAreaPrefix } from '@/lib/utils/traceUtils';

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

// severity 0 means "symptom absent today" — rendered as "(absent)" not "(0/5)"
export function formatChipLabel(chip: PhysicalChip): string {
  if (chip.kind === 'energy') {
    return `Energy: ${chip.value}/5`;
  }
  const base = shouldShowAreaPrefix(chip.parentName)
    ? `${chip.parentName}: ${chip.labelName}`
    : chip.labelName;
  if (chip.severity === 0) {
    return `${base} (absent)`;
  }
  if (chip.severity !== null) {
    return `${base} (${chip.severity}/5)`;
  }
  return base;
}
