import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors, lineHeight, typeScale, spacing } from '@/constants/theme';

import { ENERGY_LEVELS } from '@/constants/energyLevels';


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
        accessibilityValue={{ min: 1, max: 5, now: value ?? undefined }}
      />
      <View style={styles.labels}>
        {ENERGY_LEVELS.map((level) => (
          <Text
            key={level.value}
            style={[styles.label, value === level.value && styles.labelSelected]}
            numberOfLines={2}
          >
            {level.label}
          </Text>
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
  label: {
    flex: 1,
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
