import { formatChipLabel } from '@/lib/utils/physicalChipLabel';

describe('formatChipLabel', () => {
  it('energy chip returns "Energy: N/5"', () => {
    expect(formatChipLabel({ kind: 'energy', id: 'energy', value: 3 })).toBe('Energy: 3/5');
  });

  it('state chip with no severity returns label name only', () => {
    expect(
      formatChipLabel({ kind: 'state', id: 1, labelName: 'Fatigue', parentName: null, severity: null })
    ).toBe('Fatigue');
  });

  it('state chip with severity 1 returns "(1/5)" suffix', () => {
    expect(
      formatChipLabel({ kind: 'state', id: 1, labelName: 'Fatigue', parentName: null, severity: 1 })
    ).toBe('Fatigue (1/5)');
  });

  it('state chip with severity 5 returns "(5/5)" suffix', () => {
    expect(
      formatChipLabel({ kind: 'state', id: 1, labelName: 'Fatigue', parentName: null, severity: 5 })
    ).toBe('Fatigue (5/5)');
  });

  it('state chip with severity 0 returns "(absent)" suffix', () => {
    expect(
      formatChipLabel({ kind: 'state', id: 1, labelName: 'Fatigue', parentName: null, severity: 0 })
    ).toBe('Fatigue (absent)');
  });

  it('state chip with parent area prefix when parent is not whole-body', () => {
    expect(
      formatChipLabel({ kind: 'state', id: 1, labelName: 'Cramps', parentName: 'Gut', severity: null })
    ).toBe('Gut: Cramps');
  });

  it('state chip with parent "body" skips prefix', () => {
    expect(
      formatChipLabel({ kind: 'state', id: 1, labelName: 'Fatigue', parentName: 'body', severity: null })
    ).toBe('Fatigue');
  });

  it('state chip with severity 0 and area prefix shows "(absent)"', () => {
    expect(
      formatChipLabel({ kind: 'state', id: 1, labelName: 'Cramps', parentName: 'Gut', severity: 0 })
    ).toBe('Gut: Cramps (absent)');
  });
});
