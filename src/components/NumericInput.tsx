import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, typeScale } from '@/constants/theme';

interface NumericInputProps {
  value: string;
  onChangeText: (text: string) => void;
  unit: string;
  defaultValue?: string;
  testID?: string;
}

export function NumericInput({
  value,
  onChangeText,
  unit,
  testID,
}: NumericInputProps) {
  return (
    <View style={styles.row}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        testID={testID}
      />
      <Text style={styles.unit}>{unit}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  input: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: typeScale.bodyLarge.size * typeScale.bodyLarge.lineHeightMultiplier,
    color: colors.ink,
    minWidth: 80,
    borderBottomWidth: 1,
    borderBottomColor: colors.chrome,
    paddingHorizontal: 4,
  },
  unit: {
    fontFamily: typeScale.bodyLarge.family,
    fontSize: typeScale.bodyLarge.size,
    lineHeight: typeScale.bodyLarge.size * typeScale.bodyLarge.lineHeightMultiplier,
    color: colors.chrome,
    marginLeft: 8,
  },
});
