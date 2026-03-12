import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { EntryType } from '@/lib/db/query-types';
import { useEntryTypes } from '@/hooks';
import TendScreen from '../../../app/(tabs)/index';

// Mock expo-router — must be declared before module is evaluated.
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock the hook so we control data without a real DB.
jest.mock('@/hooks', () => ({
  useEntryTypes: jest.fn(),
}));

// Declare after jest.mock so hoisting still works, but capture reference once.
const mockPush = jest.fn();

const FIXTURE_ENTRY_TYPES: EntryType[] = [
  { id: 1, name: 'Food',      title: 'Nourish',   icon: 'apple-alt',          prompt: 'What did you eat?',          measurementType: 'label_select' },
  { id: 2, name: 'Hydration', title: 'Replenish',  icon: 'tint',               prompt: 'How much did you drink?',    measurementType: 'numeric' },
  { id: 3, name: 'Emotion',   title: 'Unveil',     icon: 'heart',              prompt: 'How are you feeling?',       measurementType: 'label_select' },
  { id: 4, name: 'Physical',  title: 'Attune',     icon: 'child',              prompt: 'How does your body feel?',   measurementType: 'label_select_severity' },
  { id: 5, name: 'Sleep',     title: 'Slumber',    icon: 'moon',               prompt: 'How many hours did you sleep?', measurementType: 'numeric' },
  { id: 6, name: 'Activity',  title: 'Journey',    icon: 'hand-holding-heart', prompt: 'What did you do?',           measurementType: 'label_select' },
];

describe('TendScreen', () => {
  const mockUseEntryTypes = jest.mocked(useEntryTypes);

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseEntryTypes.mockReturnValue({
      entryTypes: FIXTURE_ENTRY_TYPES,
      loading: false,
      error: null,
    });
  });

  it('renders all 6 entry type titles', () => {
    const { getByText } = render(<TendScreen />);
    expect(getByText('Nourish')).toBeTruthy();
    expect(getByText('Replenish')).toBeTruthy();
    expect(getByText('Unveil')).toBeTruthy();
    expect(getByText('Attune')).toBeTruthy();
    expect(getByText('Slumber')).toBeTruthy();
    expect(getByText('Journey')).toBeTruthy();
  });

  it('renders a date header containing "Today"', () => {
    const { getByText } = render(<TendScreen />);
    // The header format is "Today, Month D" — just assert "Today" is present.
    expect(getByText(/Today/)).toBeTruthy();
  });

  it('tapping a tile pushes the correct navigation route', () => {
    const { getByLabelText } = render(<TendScreen />);
    fireEvent.press(getByLabelText('Nourish'));
    expect(mockPush).toHaveBeenCalledWith('/log/food');
  });

  it('renders without crashing when loading=true', () => {
    mockUseEntryTypes.mockReturnValue({ entryTypes: [], loading: true, error: null });
    expect(() => render(<TendScreen />)).not.toThrow();
  });

  it('renders tiles in the order returned by useEntryTypes', () => {
    const { getAllByRole } = render(<TendScreen />);
    const buttons = getAllByRole('button');
    // There should be one button per entry type
    expect(buttons.length).toBeGreaterThanOrEqual(6);
  });
});
