import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SplitPaneRow } from '../SplitPaneRow';
import { colors } from '@/constants/theme';

describe('SplitPaneRow', () => {
  it('renders the label text', () => {
    const { getByText } = render(
      <SplitPaneRow label="Warm" isActive={false} onPress={jest.fn()} />
    );
    expect(getByText('Warm')).toBeTruthy();
  });

  it('shows interactive color text when active', () => {
    const { getByText } = render(
      <SplitPaneRow label="Warm" isActive onPress={jest.fn()} />
    );
    const text = getByText('Warm');
    const flatStyle = Array.isArray(text.props.style)
      ? Object.assign({}, ...text.props.style)
      : text.props.style;
    expect(flatStyle.color).toBe(colors.interactive);
  });

  it('shows chrome color text when inactive', () => {
    const { getByText } = render(
      <SplitPaneRow label="Still" isActive={false} onPress={jest.fn()} />
    );
    const text = getByText('Still');
    const flatStyle = Array.isArray(text.props.style)
      ? Object.assign({}, ...text.props.style)
      : text.props.style;
    expect(flatStyle.color).toBe(colors.chrome);
  });

  it('calls onPress when tapped', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <SplitPaneRow label="Charged" isActive={false} onPress={onPress} />
    );
    fireEvent.press(getByText('Charged'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('meets 48dp minimum touch target height', () => {
    const { getByTestId } = render(
      <SplitPaneRow label="Heavy" isActive={false} onPress={jest.fn()} testID="row-test" />
    );
    const row = getByTestId('row-test');
    const flatStyle = Array.isArray(row.props.style)
      ? Object.assign({}, ...row.props.style)
      : row.props.style;
    expect(flatStyle.minHeight).toBeGreaterThanOrEqual(48);
  });
});
