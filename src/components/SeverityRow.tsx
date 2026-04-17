import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, lineHeight, typeScale } from '@/constants/theme';

interface SeverityRowProps {
  value: number | null;
  onChange: (severity: number) => void;
  onDismiss: () => void;
  testID?: string;
}

const SEVERITY_VALUES = [0, 1, 2, 3, 4, 5] as const;

export function SeverityRow({ value, onChange, onDismiss, testID }: SeverityRowProps) {
  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.label}>Severity</Text>
      <View style={styles.buttons}>
        {SEVERITY_VALUES.map((sev) => {
          const isZero = sev === 0;
          const isSelected = value === sev;
          return (
            <Pressable
              key={sev}
              style={[
                styles.button,
                isZero && !isSelected && styles.buttonZero,
                isSelected && styles.buttonSelected,
              ]}
              onPress={() => {
                onChange(sev);
                onDismiss();
              }}
              accessibilityRole="button"
              accessibilityLabel={
                isZero ? 'Severity 0 — symptom absent' : `Severity ${sev} of 5`
              }
              accessibilityState={{ selected: isSelected }}
            >
              <Text
                style={[
                  styles.buttonText,
                  isSelected && styles.buttonTextSelected,
                ]}
              >
                {sev}
              </Text>
            </Pressable>
          );
        })}
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
  buttonZero: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.chrome,
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
