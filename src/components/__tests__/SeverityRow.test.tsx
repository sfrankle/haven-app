import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SeverityRow } from '../SeverityRow';

describe('SeverityRow', () => {
  it('renders 6 buttons for values 0-5', () => {
    const { getAllByRole } = render(
      <SeverityRow value={null} onChange={jest.fn()} onDismiss={jest.fn()} />
    );
    expect(getAllByRole('button').length).toBe(6);
  });

  it('displays labels 0 through 5', () => {
    const { getByText } = render(
      <SeverityRow value={null} onChange={jest.fn()} onDismiss={jest.fn()} />
    );
    for (let i = 0; i <= 5; i++) {
      expect(getByText(String(i))).toBeTruthy();
    }
  });

  it('button "0" has accessibility label "Severity 0 — symptom absent"', () => {
    const { getByLabelText } = render(
      <SeverityRow value={null} onChange={jest.fn()} onDismiss={jest.fn()} />
    );
    expect(getByLabelText('Severity 0 — symptom absent')).toBeTruthy();
  });

  it('tapping "0" calls onChange(0) and onDismiss', () => {
    const onChange = jest.fn();
    const onDismiss = jest.fn();
    const { getByText } = render(
      <SeverityRow value={null} onChange={onChange} onDismiss={onDismiss} />
    );
    fireEvent.press(getByText('0'));
    expect(onChange).toHaveBeenCalledWith(0);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('value={0} marks button 0 as selected', () => {
    const { getByLabelText } = render(
      <SeverityRow value={0} onChange={jest.fn()} onDismiss={jest.fn()} />
    );
    const btn = getByLabelText('Severity 0 — symptom absent');
    expect(btn.props.accessibilityState?.selected).toBe(true);
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

  it('selected value button (non-zero) has accessible state selected', () => {
    const { getAllByRole } = render(
      <SeverityRow value={3} onChange={jest.fn()} onDismiss={jest.fn()} />
    );
    const buttons = getAllByRole('button');
    // Button at index 3 is value 3 (0-indexed: 0,1,2,3,...)
    expect(buttons[3].props.accessibilityState?.selected).toBe(true);
  });
});
