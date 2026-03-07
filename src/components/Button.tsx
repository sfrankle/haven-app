import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
} from 'react-native';
import { colors, spacing, typeScale } from '@/constants/theme';

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
    minHeight: 48, // Material minimum tap target (brand.md)
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.interactive,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    // 0x38 = 56/255 ≈ 22% opacity, matching visual-style.md secondary button spec
    borderColor: `${colors.ink}38`,
  },
  disabled: {
    opacity: 0.4,
  },
  label: {
    fontFamily: typeScale.labelLarge.family,
    fontSize: typeScale.labelLarge.size,
    lineHeight: typeScale.labelLarge.size * typeScale.labelLarge.lineHeightMultiplier,
  },
  labelPrimary: {
    color: colors.background,
  },
  labelSecondary: {
    color: colors.ink,
  },
});
