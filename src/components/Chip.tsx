import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, lineHeight, typeScale } from '@/constants/theme';

type ChipProps =
  | { label: string; onRemove: () => void; color: string; showSeverity?: false; severity?: never; testID?: string }
  | { label: string; onRemove: () => void; color: string; showSeverity: true; severity: number; testID?: string };

export function Chip({
  label,
  onRemove,
  color,
  showSeverity,
  severity,
  testID,
}: ChipProps) {
  const displayLabel = showSeverity ? `${label} (${severity}/5)` : label;

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
    lineHeight: lineHeight(typeScale.labelLarge),
    color: colors.ink,
  },
});
