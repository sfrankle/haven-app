import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors, lineHeight, typeScale, spacing } from '@/constants/theme';

import { ENERGY_LEVELS, energyLabel } from '@/constants/energyLevels';


interface EnergySliderProps {
  value: number | null;
  onChange: (value: number) => void;
  testID?: string;
}

export function EnergySlider({ value, onChange, testID }: EnergySliderProps) {
  return (
    <View style={styles.container} testID={testID}>
      <Slider
        style={styles.slider}
        minimumValue={1}
        maximumValue={5}
        step={1}
        value={value ?? 3}
        onValueChange={onChange}
        minimumTrackTintColor={colors.interactive}
        maximumTrackTintColor={colors.chrome}
        thumbTintColor={colors.interactive}
        accessibilityLabel="Energy level"
        accessibilityValue={{ min: 1, max: 5, now: value ?? undefined, text: value != null ? (energyLabel(value) ?? undefined) : undefined }}
      />
      {/* The labels are selectable, not decorative: they already shift colour and
          weight on selection, so they read as interactive, and a label is a much
          larger target than the slider thumb. */}
      <View style={styles.labels}>
        {ENERGY_LEVELS.map((level) => (
          <Pressable
            key={level.value}
            style={styles.labelTarget}
            onPress={() => onChange(level.value)}
            accessibilityRole="button"
            accessibilityLabel={level.label}
            accessibilityState={{ selected: value === level.value }}
          >
            <Text
              style={[styles.label, value === level.value && styles.labelSelected]}
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
  slider: {
    width: '100%',
    height: 40,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  labelTarget: {
    flex: 1,
    paddingVertical: spacing.elementGap,
  },
  label: {
    fontFamily: typeScale.labelSmall.family,
    fontSize: typeScale.labelSmall.size,
    lineHeight: lineHeight(typeScale.labelSmall),
    color: colors.chrome,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.interactive,
    fontFamily: typeScale.labelMedium.family,
  },
});
