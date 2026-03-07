import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';
import { colors } from '@/constants/theme';
import { getStyle } from '../test-utils';

describe('Button', () => {
  it('renders the label', () => {
    const { getByText } = render(<Button label="Save" onPress={() => {}} />);
    expect(getByText('Save')).toBeTruthy();
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(<Button label="Save" onPress={onPress} />);
    fireEvent.press(getByText('Save'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('primary variant has interactive background', () => {
    const { getByTestId } = render(
      <Button label="Save" onPress={() => {}} testID="btn" />
    );
    const flatStyle = getStyle(getByTestId('btn'));
    expect(flatStyle.backgroundColor).toBe(colors.interactive);
  });

  it('secondary variant has transparent background', () => {
    const { getByTestId } = render(
      <Button label="Cancel" variant="secondary" onPress={() => {}} testID="btn" />
    );
    const flatStyle = getStyle(getByTestId('btn'));
    expect(flatStyle.backgroundColor).toBe('transparent');
  });

  it('meets minimum 48dp touch target height', () => {
    const { getByTestId } = render(<Button label="Save" onPress={() => {}} testID="btn" />);
    const flatStyle = getStyle(getByTestId('btn'));
    expect(flatStyle.minHeight).toBeGreaterThanOrEqual(48);
  });

  it('does not call onPress when disabled', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button label="Save" onPress={onPress} disabled />
    );
    fireEvent.press(getByText('Save'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
