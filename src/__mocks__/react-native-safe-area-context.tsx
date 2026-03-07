import React from 'react';
import { View } from 'react-native';

export const SafeAreaView = ({ children, style }: { children?: React.ReactNode; style?: object }) => (
  <View style={style}>{children}</View>
);

export const SafeAreaProvider = ({ children }: { children?: React.ReactNode }) => <>{children}</>;

export function useSafeAreaInsets() {
  return { top: 0, right: 0, bottom: 0, left: 0 };
}
