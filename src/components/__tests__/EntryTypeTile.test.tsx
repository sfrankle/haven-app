import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { EntryTypeTile } from '../EntryTypeTile';
import type { EntryType } from '@/lib/db/query-types';

const mockEntryType: EntryType = {
  id: 1,
  name: 'Food',
  title: 'Nourish',
  icon: 'apple-alt',
  prompt: 'What did you eat?',
  measurementType: 'label_select',
};

describe('EntryTypeTile', () => {
  it('renders the entry type title', () => {
    const { getByText } = render(
      <EntryTypeTile entryType={mockEntryType} onPress={() => {}} />
    );
    expect(getByText('Nourish')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByRole } = render(
      <EntryTypeTile entryType={mockEntryType} onPress={onPress} />
    );
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('has accessibilityRole="button"', () => {
    const { getByRole } = render(
      <EntryTypeTile entryType={mockEntryType} onPress={() => {}} />
    );
    expect(getByRole('button')).toBeTruthy();
  });

  it('has correct accessibilityLabel matching the entry type title', () => {
    const { getByLabelText } = render(
      <EntryTypeTile entryType={mockEntryType} onPress={() => {}} />
    );
    expect(getByLabelText('Nourish')).toBeTruthy();
  });

  it('forwards testID to the pressable', () => {
    const { getByTestId } = render(
      <EntryTypeTile entryType={mockEntryType} onPress={() => {}} testID="tile-food" />
    );
    expect(getByTestId('tile-food')).toBeTruthy();
  });
});
