import React from 'react';
import { FlatList, Text, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { Screen, EntryTypeTile } from '@/components';
import { useEntryTypes } from '@/hooks';
import { colors, typeScale, spacing, lineHeight } from '@/constants/theme';
import type { EntryType } from '@/lib/db/query-types';

function DateHeader() {
  const dateStr = dayjs().format('MMMM D');
  return (
    <View style={styles.header}>
      <Text style={styles.headerText}>{`Today, ${dateStr}`}</Text>
    </View>
  );
}

export default function TendScreen() {
  const router = useRouter();
  const { entryTypes, loading } = useEntryTypes();

  function handlePress(item: EntryType) {
    router.push(`/log/${item.name.toLowerCase()}`);
  }

  return (
    <Screen>
      <FlatList
        data={loading ? [] : entryTypes}
        numColumns={2}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={<DateHeader />}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={({ item }) => (
          <EntryTypeTile
            entryType={item}
            onPress={() => handlePress(item)}
            testID={`tile-${item.name.toLowerCase()}`}
          />
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: spacing.pagePadding,
    gap: spacing.elementGap,
  },
  columnWrapper: {
    gap: spacing.elementGap,
  },
  header: {
    marginBottom: spacing.sectionGap,
  },
  headerText: {
    fontFamily: typeScale.titleLarge.family,
    fontWeight: typeScale.titleLarge.weight,
    fontSize: typeScale.titleLarge.size,
    lineHeight: lineHeight(typeScale.titleLarge),
    color: colors.ink,
  },
});
