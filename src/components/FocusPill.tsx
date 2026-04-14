import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, typeScale, spacing, lineHeight } from '@/constants/theme';

interface FocusPillProps {
  label: string;
  onPress: () => void;
  testID?: string;
}

export function FocusPill({ label, onPress, testID }: FocusPillProps) {
  return (
    <Pressable
      style={styles.pill}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
    >
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: spacing.sectionGap,
    paddingVertical: spacing.elementGap,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.chrome,
    backgroundColor: colors.surface,
  },
  pillText: {
    fontFamily: typeScale.labelLarge.family,
    fontSize: typeScale.labelLarge.size,
    lineHeight: lineHeight(typeScale.labelLarge),
    color: colors.ink,
  },
});
