import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { colors, spacing } from '@/constants/theme';

interface SurfaceProps extends ViewProps {
  children?: React.ReactNode;
  padded?: boolean;
}

export function Surface({ children, padded = true, style, ...props }: SurfaceProps) {
  return (
    <View
      style={[styles.base, padded && styles.padded, style]}
      {...props}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  padded: {
    padding: spacing.elementGap,
  },
});
