import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { Screen } from '../Screen';
import { colors } from '@/constants/theme';

describe('Screen', () => {
  it('renders children', () => {
    const { getByText } = render(
      <Screen>
        <Text>Hello</Text>
      </Screen>
    );
    expect(getByText('Hello')).toBeTruthy();
  });

  it('applies background-warm fill', () => {
    const { getByTestId } = render(
      <Screen testID="screen">
        <Text>Hi</Text>
      </Screen>
    );
    const style = getByTestId('screen').props.style;
    const flatStyle = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flatStyle.backgroundColor).toBe(colors.background);
  });
});
