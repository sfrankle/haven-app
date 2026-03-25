import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, lineHeight, typeScale, spacing } from '@/constants/theme';

const ENERGY_LEVELS: { value: number; label: string }[] = [
  { value: 1, label: 'Exhausted' },
  { value: 2, label: 'Bit Tired' },
  { value: 3, label: 'Average' },
  { value: 4, label: 'Well Rested' },
  { value: 5, label: 'Pumped' },
];

interface EnergySliderProps {
  value: number | null;
  onChange: (value: number) => void;
  testID?: string;
}

export function EnergySlider({ value, onChange, testID }: EnergySliderProps) {
  return (
    <View style={styles.container} testID={testID}>
      <View style={styles.track}>
        {ENERGY_LEVELS.map((level) => (
          <Pressable
            key={level.value}
            style={[
              styles.position,
              value === level.value && styles.positionSelected,
            ]}
            onPress={() => onChange(level.value)}
            accessibilityRole="button"
            accessibilityLabel={`Energy level ${level.value}: ${level.label}`}
            accessibilityState={{ selected: value === level.value }}
          >
            <View
              style={[
                styles.dot,
                value === level.value && styles.dotSelected,
              ]}
            />
            <Text
              style={[
                styles.levelLabel,
                value === level.value && styles.levelLabelSelected,
              ]}
              numberOfLines={2}
            >
              {level.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.elementGap,
  },
  track: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  position: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    minHeight: 48,
  },
  positionSelected: {
    // visual state handled by dot/label styles
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.chrome,
    marginBottom: 6,
  },
  dotSelected: {
    backgroundColor: colors.interactive,
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  levelLabel: {
    fontFamily: typeScale.labelSmall.family,
    fontSize: typeScale.labelSmall.size,
    lineHeight: lineHeight(typeScale.labelSmall),
    color: colors.chrome,
    textAlign: 'center',
  },
  levelLabelSelected: {
    color: colors.interactive,
    fontFamily: typeScale.labelMedium.family,
  },
});
