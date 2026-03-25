import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SeverityRow } from '../SeverityRow';

describe('SeverityRow', () => {
  it('renders 5 buttons for values 1-5', () => {
    const { getAllByRole } = render(
      <SeverityRow value={null} onChange={jest.fn()} onDismiss={jest.fn()} />
    );
    expect(getAllByRole('button').length).toBe(5);
  });

  it('displays labels 1 through 5', () => {
    const { getByText } = render(
      <SeverityRow value={null} onChange={jest.fn()} onDismiss={jest.fn()} />
    );
    for (let i = 1; i <= 5; i++) {
      expect(getByText(String(i))).toBeTruthy();
    }
  });

  it('tapping a button calls onChange with that value', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <SeverityRow value={null} onChange={onChange} onDismiss={jest.fn()} />
    );
    fireEvent.press(getByText('3'));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('tapping a button calls onDismiss', () => {
    const onDismiss = jest.fn();
    const { getByText } = render(
      <SeverityRow value={null} onChange={jest.fn()} onDismiss={onDismiss} />
    );
    fireEvent.press(getByText('2'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('renders with testID on the container', () => {
    const { getByTestId } = render(
      <SeverityRow
        value={null}
        onChange={jest.fn()}
        onDismiss={jest.fn()}
        testID="severity-row"
      />
    );
    expect(getByTestId('severity-row')).toBeTruthy();
  });

  it('selected value button has accessible state selected', () => {
    const { getAllByRole } = render(
      <SeverityRow value={3} onChange={jest.fn()} onDismiss={jest.fn()} />
    );
    const buttons = getAllByRole('button');
    // Button at index 2 is value 3
    expect(buttons[2].props.accessibilityState?.selected).toBe(true);
  });
});
