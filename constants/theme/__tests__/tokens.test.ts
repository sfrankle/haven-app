import {
  colors,
  colorsDark,
  fontFamilies,
  fontWeights,
  typeScale,
  spacing,
} from '../tokens';

describe('colors', () => {
  const requiredKeys: (keyof typeof colors)[] = [
    'ink', 'interactive', 'chrome', 'background', 'surface',
    'surfaceVariant', 'glow', 'candlelight', 'success', 'warning', 'error',
  ];
  it.each(requiredKeys)('exports %s', (key) => {
    expect(colors[key]).toBeDefined();
    expect(typeof colors[key]).toBe('string');
  });
});

describe('colorsDark', () => {
  it('exports background and surface', () => {
    expect(colorsDark.background).toBeDefined();
    expect(colorsDark.surface).toBeDefined();
  });
});

describe('typeScale', () => {
  const requiredRoles: (keyof typeof typeScale)[] = [
    'displayLarge', 'displayMedium',
    'headlineLarge', 'headlineMedium',
    'titleLarge', 'titleMedium',
    'bodyLarge', 'bodyMedium', 'bodySmall',
    'labelLarge', 'labelMedium', 'labelSmall',
  ];
  it.each(requiredRoles)('role %s has family, weight, size', (role) => {
    const entry = typeScale[role];
    expect(entry.family).toBeDefined();
    expect(entry.weight).toBeDefined();
    expect(entry.size).toBeGreaterThan(0);
  });

  it('bodyLarge is at least 16sp per brand spec', () => {
    // visual-style.md: "Body text: minimum 16sp"
    expect(typeScale.bodyLarge.size).toBeGreaterThanOrEqual(16);
  });
});

describe('spacing', () => {
  it('exports all four rhythm values', () => {
    expect(spacing.pagePadding).toBe(16);
    expect(spacing.sectionGap).toBe(24);
    expect(spacing.elementGap).toBe(12);
    expect(spacing.navBottomPadding).toBe(16);
  });
});

describe('fontFamilies', () => {
  it('exports all four font keys matching useFonts aliases', () => {
    expect(fontFamilies.philosopher).toBe('Philosopher');
    expect(fontFamilies.philosopherBold).toBe('Philosopher-Bold');
    expect(fontFamilies.lexend).toBe('Lexend');
    expect(fontFamilies.lexendMedium).toBe('Lexend-Medium');
  });
});

describe('fontWeights', () => {
  it('exports regular, medium, and bold weights', () => {
    expect(fontWeights.regular).toBe('400');
    expect(fontWeights.medium).toBe('500');
    expect(fontWeights.bold).toBe('700');
  });
});
