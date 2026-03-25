import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, lineHeight, typeScale } from '@/constants/theme';

interface SeverityRowProps {
  value: number | null;
  onChange: (severity: number) => void;
  onDismiss: () => void;
  testID?: string;
}

const SEVERITY_VALUES = [1, 2, 3, 4, 5] as const;

export function SeverityRow({ value, onChange, onDismiss, testID }: SeverityRowProps) {
  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.label}>Severity</Text>
      <View style={styles.buttons}>
        {SEVERITY_VALUES.map((sev) => (
          <Pressable
            key={sev}
            style={[styles.button, value === sev && styles.buttonSelected]}
            onPress={() => {
              onChange(sev);
              onDismiss();
            }}
            accessibilityRole="button"
            accessibilityLabel={`Severity ${sev} of 5`}
            accessibilityState={{ selected: value === sev }}
          >
            <Text
              style={[
                styles.buttonText,
                value === sev && styles.buttonTextSelected,
              ]}
            >
              {sev}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  label: {
    fontFamily: typeScale.labelMedium.family,
    fontSize: typeScale.labelMedium.size,
    lineHeight: lineHeight(typeScale.labelMedium),
    color: colors.chrome,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSelected: {
    backgroundColor: colors.interactive,
  },
  buttonText: {
    fontFamily: typeScale.labelMedium.family,
    fontSize: typeScale.labelMedium.size,
    lineHeight: lineHeight(typeScale.labelMedium),
    color: colors.ink,
  },
  buttonTextSelected: {
    color: colors.surface,
  },
});
