import React from 'react';
import { View, ViewProps } from 'react-native';

export const SafeAreaView = ({ children, style, ...props }: ViewProps) => (
  <View style={style} {...props}>{children}</View>
);

export const SafeAreaProvider = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

export function useSafeAreaInsets() {
  return { top: 0, right: 0, bottom: 0, left: 0 };
}
