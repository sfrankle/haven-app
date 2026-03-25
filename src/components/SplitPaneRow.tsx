import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, lineHeight, typeScale } from '@/constants/theme';

type SplitPaneRowProps = {
  label: string;
  isActive: boolean;
  onPress: () => void;
  testID?: string;
};

/**
 * A single tappable row for use inside SplitPane columns.
 * Active state: interactive color text + surfaceVariant background.
 * Inactive state: chrome color text, transparent background.
 */
export function SplitPaneRow({ label, isActive, onPress, testID }: SplitPaneRowProps) {
  return (
    <Pressable
      style={[styles.row, isActive && styles.rowActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      testID={testID}
    >
      <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  rowActive: {
    backgroundColor: colors.surfaceVariant,
  },
  label: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: lineHeight(typeScale.bodyLarge),
  },
  labelActive: {
    color: colors.interactive,
  },
  labelInactive: {
    color: colors.chrome,
  },
});
