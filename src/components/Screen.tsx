import React from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';

interface ScreenProps extends ViewProps {
  children?: React.ReactNode;
}

export function Screen({ children, style, ...props }: ScreenProps) {
  return (
    <SafeAreaView style={[styles.safeArea, style]} {...props}>
      <View style={styles.fill}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  fill: {
    flex: 1,
  },
});
