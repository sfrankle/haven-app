import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FocusPill } from '../FocusPill';

describe('FocusPill', () => {
  it('renders the label text', () => {
    const { getByText } = render(<FocusPill label="Gut Health" onPress={jest.fn()} />);
    expect(getByText('Gut Health')).toBeTruthy();
  });

  it('has accessibilityRole button', () => {
    const { getByRole } = render(<FocusPill label="Energy" onPress={jest.fn()} />);
    expect(getByRole('button')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByRole } = render(<FocusPill label="Sleep" onPress={onPress} />);
    fireEvent.press(getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('applies testID prop', () => {
    const { getByTestId } = render(<FocusPill label="Focus" onPress={jest.fn()} testID="focus-pill-99" />);
    expect(getByTestId('focus-pill-99')).toBeTruthy();
  });

  it('uses label as accessibilityLabel', () => {
    const { getByLabelText } = render(<FocusPill label="Mood" onPress={jest.fn()} />);
    expect(getByLabelText('Mood')).toBeTruthy();
  });

  it('renders unselected style by default', () => {
    const { getByRole } = render(<FocusPill label="Gut Health" onPress={jest.fn()} />);
    const pill = getByRole('button');
    expect(pill.props.accessibilityState?.selected).toBeFalsy();
  });

  it('renders selected style when selected={true}', () => {
    const { getByRole } = render(
      <FocusPill label="Gut Health" onPress={jest.fn()} selected={true} />
    );
    const pill = getByRole('button');
    expect(pill.props.accessibilityState?.selected).toBe(true);
  });
});
