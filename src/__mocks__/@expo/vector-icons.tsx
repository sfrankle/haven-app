import React from 'react';
import { Text } from 'react-native';

// Minimal stub for @expo/vector-icons used in Jest.
// Renders the icon name as text so tests can assert on it if needed.
export function FontAwesome5({ name, testID }: { name: string; size?: number; color?: string; testID?: string }) {
  return <Text testID={testID ?? `icon-${name}`}>{name}</Text>;
}
