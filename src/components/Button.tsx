import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
} from 'react-native';
import { colors, fontFamilies, spacing } from '@/constants/theme';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: 'primary' | 'secondary';
  testID?: string;
}

export function Button({
  label,
  variant = 'primary',
  disabled,
  testID,
  ...props
}: ButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <Pressable
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        disabled && styles.disabled,
      ]}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      testID={testID}
      {...props}
    >
      <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelSecondary]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    paddingVertical: spacing.elementGap,
    paddingHorizontal: spacing.sectionGap,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.interactive,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: `${colors.ink}38`,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontFamily: fontFamilies.lexendMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  labelPrimary: {
    color: colors.background,
  },
  labelSecondary: {
    color: colors.ink,
  },
});
