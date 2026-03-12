import React from 'react';
import { Pressable, Text, StyleSheet, View } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { colors, typeScale, spacing } from '@/constants/theme';
import type { EntryType } from '@/lib/db/query-types';

export interface EntryTypeTileProps {
  entryType: EntryType;
  onPress: () => void;
  testID?: string;
}

export function EntryTypeTile({ entryType, onPress, testID }: EntryTypeTileProps) {
  return (
    <Pressable
      style={styles.tile}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={entryType.title}
      testID={testID}
    >
      <View style={styles.inner}>
        {entryType.icon ? (
          <FontAwesome5
            name={entryType.icon as React.ComponentProps<typeof FontAwesome5>['name']}
            size={32}
            color={colors.interactive}
          />
        ) : null}
        <Text style={styles.title}>{entryType.title}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    minHeight: 100,
    aspectRatio: 1,
    // Minimum touch target per brand.md: 48dp
  },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.pagePadding,
    gap: spacing.elementGap,
  },
  title: {
    fontFamily: typeScale.labelLarge.family,
    fontWeight: typeScale.labelLarge.weight,
    fontSize: typeScale.labelLarge.size,
    color: colors.ink,
    textAlign: 'center',
  },
});
