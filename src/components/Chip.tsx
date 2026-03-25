import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, lineHeight, typeScale } from '@/constants/theme';

interface ChipProps {
  label: string;
  onRemove: () => void;
  color: string;
  showSeverity?: boolean;
  severity?: number;
  onOpenSeverity?: () => void;
  testID?: string;
}

export function Chip({
  label,
  onRemove,
  color,
  showSeverity,
  severity,
  onOpenSeverity,
  testID,
}: ChipProps) {
  const displayLabel = showSeverity && severity !== undefined ? `${label} (${severity}/5)` : label;

  return (
    <Pressable
      style={[styles.chip, { backgroundColor: color }]}
      onPress={onRemove}
      accessibilityRole="button"
      accessibilityLabel={displayLabel}
      testID={testID}
    >
      <View style={styles.inner}>
        <Text style={styles.label}>{displayLabel}</Text>
        {onOpenSeverity !== undefined && (
          <Pressable
            style={styles.severityIcon}
            onPress={() => {
              onOpenSeverity();
            }}
            accessibilityRole="button"
            accessibilityLabel="Set severity"
            testID={testID ? `${testID}-severity-icon` : 'chip-severity-icon'}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
          >
            <Text style={styles.severityIconText}>···</Text>
          </Pressable>
        )}
      </View>
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
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontFamily: typeScale.labelLarge.family,
    fontSize: typeScale.labelLarge.size,
    lineHeight: lineHeight(typeScale.labelLarge),
    color: colors.ink,
  },
  severityIcon: {
    paddingLeft: 2,
  },
  severityIconText: {
    fontFamily: typeScale.labelLarge.family,
    fontSize: typeScale.labelLarge.size,
    lineHeight: lineHeight(typeScale.labelLarge),
    color: colors.chrome,
  },
});
