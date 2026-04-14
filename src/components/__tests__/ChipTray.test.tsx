import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ChipTray } from '../ChipTray';

describe('ChipTray', () => {
  const chips = [
    { id: 1 as number | 'energy', label: 'Oats', color: '#ccc' },
    { id: 2 as number | 'energy', label: 'Eggs', color: '#ddd' },
  ];

  it('renders chip labels', () => {
    const { getByText } = render(
      <ChipTray chips={chips} onRemove={jest.fn()} />
    );
    expect(getByText('Oats')).toBeTruthy();
    expect(getByText('Eggs')).toBeTruthy();
  });

  it('calls onRemove with correct id when chip is pressed', () => {
    const onRemove = jest.fn();
    const { getByTestId } = render(
      <ChipTray chips={chips} onRemove={onRemove} testID="tray" />
    );
    fireEvent.press(getByTestId('tray-chip-1'));
    expect(onRemove).toHaveBeenCalledWith(1);
    fireEvent.press(getByTestId('tray-chip-2'));
    expect(onRemove).toHaveBeenCalledWith(2);
  });

  it('renders nothing when chips array is empty', () => {
    const { queryByTestId } = render(
      <ChipTray chips={[]} onRemove={jest.fn()} testID="tray" />
    );
    expect(queryByTestId('tray-chip-1')).toBeNull();
  });

  it('passes onOpenSeverity to Chip when provided', () => {
    const onOpenSeverity = jest.fn();
    const chipsWithSeverity = [
      { id: 3 as number | 'energy', label: 'Cramps', color: '#eee', onOpenSeverity },
    ];
    const { getByTestId } = render(
      <ChipTray chips={chipsWithSeverity} onRemove={jest.fn()} testID="tray" />
    );
    // Chip with severity shows the ··· icon
    fireEvent.press(getByTestId('tray-chip-3-severity-icon'));
    expect(onOpenSeverity).toHaveBeenCalledTimes(1);
  });

  it('supports energy id string', () => {
    const onRemove = jest.fn();
    const energyChips = [{ id: 'energy' as number | 'energy', label: 'Energy: 3', color: '#aaa' }];
    const { getByTestId } = render(
      <ChipTray chips={energyChips} onRemove={onRemove} testID="tray" />
    );
    fireEvent.press(getByTestId('tray-chip-energy'));
    expect(onRemove).toHaveBeenCalledWith('energy');
  });
});
