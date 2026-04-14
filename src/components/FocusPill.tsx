import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, typeScale, spacing, lineHeight } from '@/constants/theme';

interface FocusPillProps {
  label: string;
  onPress: () => void;
  testID?: string;
  selected?: boolean;
}

export function FocusPill({ label, onPress, testID, selected = false }: FocusPillProps) {
  return (
    <Pressable
      style={[styles.pill, selected && styles.pillSelected]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      testID={testID}
    >
      <Text style={[styles.pillText, selected && styles.pillTextSelected]}>{label}</Text>
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
  pillSelected: {
    backgroundColor: colors.interactive,
    borderColor: colors.interactive,
  },
  pillText: {
    fontFamily: typeScale.labelLarge.family,
    fontSize: typeScale.labelLarge.size,
    lineHeight: lineHeight(typeScale.labelLarge),
    color: colors.ink,
  },
  pillTextSelected: {
    color: colors.surface,
  },
});
