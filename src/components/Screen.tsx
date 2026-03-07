import React from 'react';
import { StyleSheet, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

interface ScreenProps extends ViewProps {
  children?: React.ReactNode;
}

export function Screen({ children, style, ...props }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.safeArea, style]} {...props}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
