import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';

type SplitPaneProps = {
  left: React.ReactNode;
  right: React.ReactNode;
  testID?: string;
};

/**
 * Two-column split-pane layout. Left column is fixed-width (~38%); right
 * column fills remaining space. Both sides scroll independently.
 * Used by the emotion flow for Tier navigation.
 */
export function SplitPane({ left, right, testID }: SplitPaneProps) {
  return (
    <View style={styles.root} testID={testID}>
      <ScrollView style={styles.leftColumn} contentContainerStyle={styles.columnContent}>
        {left}
      </ScrollView>
      <View style={styles.divider} />
      <ScrollView style={styles.rightColumn} contentContainerStyle={styles.columnContent}>
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
  leftColumn: {
    width: '38%',
  },
  divider: {
    width: 1,
    backgroundColor: colors.chrome,
    opacity: 0.25,
  },
  rightColumn: {
    flex: 1,
  },
  columnContent: {
    paddingVertical: 8,
  },
});
