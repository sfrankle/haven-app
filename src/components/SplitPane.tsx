import { colors } from '@/constants/theme';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

type SplitPaneProps = {
  left: React.ReactNode;
  right: React.ReactNode;
  /** Flex ratio for the left column. Right column gets (1 - leftFlex). Default 0.45. */
  leftFlex?: number;
  testID?: string;
};

/**
 * Two-column split-pane layout. Both columns scroll independently.
 * Used by the emotion flow for Tier navigation.
 */
export function SplitPane({ left, right, leftFlex = 0.38, testID }: SplitPaneProps) {
  const leftStyle = useMemo(() => ({ flex: leftFlex }), [leftFlex]);
  const rightStyle = useMemo(() => ({ flex: 1 - leftFlex }), [leftFlex]);

  return (
    <View style={styles.root} testID={testID}>
      <ScrollView style={leftStyle} contentContainerStyle={styles.columnContent}>
        {left}
      </ScrollView>
      <View style={styles.divider} />
      <ScrollView style={rightStyle} contentContainerStyle={styles.columnContent}>
        {right}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  divider: {
    width: 1,
    backgroundColor: colors.chrome,
    opacity: 0.25,
  },
  columnContent: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
});
