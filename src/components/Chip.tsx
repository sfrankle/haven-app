import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, typeScale } from '@/constants/theme';

interface ChipProps {
  label: string;
  onRemove: () => void;
  color: string;
  variant?: 'default' | 'severity';
  severity?: number;
  testID?: string;
}

export function Chip({
  label,
  onRemove,
  color,
  variant = 'default',
  severity,
  testID,
}: ChipProps) {
  const displayLabel =
    variant === 'severity' && severity != null
      ? `${label} (${severity}/5)`
      : label;

  return (
    <Pressable
      style={[styles.chip, { backgroundColor: color }]}
      onPress={onRemove}
      accessibilityRole="button"
      accessibilityLabel={displayLabel}
      testID={testID}
    >
      <Text style={styles.label}>{displayLabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  label: {
    fontFamily: typeScale.labelLarge.family,
    fontSize: typeScale.labelLarge.size,
    lineHeight: typeScale.labelLarge.size * typeScale.labelLarge.lineHeightMultiplier,
    color: colors.ink,
  },
});
