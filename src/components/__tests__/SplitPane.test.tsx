import React from 'react';
import { Text, ScrollView } from 'react-native';
import { render } from '@testing-library/react-native';
import { SplitPane } from '../SplitPane';

describe('SplitPane', () => {
  it('renders left children', () => {
    const { getByText } = render(
      <SplitPane left={<Text>Left content</Text>} right={<Text>Right content</Text>} />
    );
    expect(getByText('Left content')).toBeTruthy();
  });

  it('renders right children', () => {
    const { getByText } = render(
      <SplitPane left={<Text>Left content</Text>} right={<Text>Right content</Text>} />
    );
    expect(getByText('Right content')).toBeTruthy();
  });

  it('renders two ScrollViews (one per column)', () => {
    const { UNSAFE_getAllByType } = render(
      <SplitPane left={<Text>L</Text>} right={<Text>R</Text>} />
    );
    const scrollViews = UNSAFE_getAllByType(ScrollView);
    expect(scrollViews.length).toBeGreaterThanOrEqual(2);
  });

  it('forwards testID to root view', () => {
    const { getByTestId } = render(
      <SplitPane left={<Text>L</Text>} right={<Text>R</Text>} testID="split-pane-test" />
    );
    expect(getByTestId('split-pane-test')).toBeTruthy();
  });
});
