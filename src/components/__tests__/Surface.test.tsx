import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { Surface } from '../Surface';
import { colors } from '@/constants/theme';
import { getStyle } from './test-utils';

describe('Surface', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Surface>
        <Text>Content</Text>
      </Surface>
    );
    expect(getByText('Content')).toBeTruthy();
  });

  it('has surface (white) background', () => {
    const { getByTestId } = render(
      <Surface testID="surface">
        <Text>Content</Text>
      </Surface>
    );
    const flatStyle = getStyle(getByTestId('surface'));
    expect(flatStyle.backgroundColor).toBe(colors.surface);
  });

  it('applies padding when padded=true (default)', () => {
    const { getByTestId } = render(
      <Surface testID="surface">
        <Text>Content</Text>
      </Surface>
    );
    const flatStyle = getStyle(getByTestId('surface'));
    expect(flatStyle.padding).toBeGreaterThan(0);
  });

  it('omits padding when padded=false', () => {
    const { getByTestId } = render(
      <Surface testID="surface" padded={false}>
        <Text>Content</Text>
      </Surface>
    );
    const flatStyle = getStyle(getByTestId('surface'));
    expect(flatStyle.padding ?? 0).toBe(0);
  });
});
