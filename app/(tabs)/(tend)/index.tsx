import React, { useCallback } from 'react';
import { FlatList, Pressable, ScrollView, Text, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { Screen, EntryTypeTile, FocusPill } from '@/components';
import { useEntryTypes, useFocuses } from '@/hooks';
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

function FocusRow() {
  const router = useRouter();
  // error is intentionally ignored: if the DB query fails, the row shows only
  // "+ Add Focus" so the user can still navigate. No error UI at this surface.
  const { focuses, loading } = useFocuses();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.focusRowContent}
      style={styles.focusRow}
    >
      {!loading && focuses.map((focus) => (
        <FocusPill
          key={focus.id}
          label={focus.name}
          // Route is intentionally dead until #135 (Focus quick-log) ships
          onPress={() => router.push(`/focus/${focus.id}`)}
          testID={`focus-pill-${focus.id}`}
        />
      ))}
      <Pressable
        style={styles.addFocusPill}
        onPress={() => router.push('/focus/create')}
        testID="add-focus-pill"
        accessibilityRole="button"
      >
        <Text style={styles.addFocusPillText}>+ Add Focus</Text>
      </Pressable>
    </ScrollView>
  );
}

function ListHeader() {
  return (
    <>
      <DateHeader />
      <FocusRow />
    </>
  );
}

export default function TendScreen() {
  const router = useRouter();
  const { entryTypes, loading } = useEntryTypes();

  const handlePress = useCallback((item: EntryType) => {
    router.push(`/log/${item.name.toLowerCase()}`);
  }, [router]);

  const renderItem = useCallback(({ item }: { item: EntryType }) => (
    <EntryTypeTile
      entryType={item}
      onPress={() => handlePress(item)}
      testID={`tile-${item.name.toLowerCase()}`}
    />
  ), [handlePress]);

  return (
    <Screen>
      <FlatList
        data={loading ? [] : entryTypes}
        numColumns={2}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        columnWrapperStyle={styles.columnWrapper}
        renderItem={renderItem}
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
  focusRow: {
    marginBottom: spacing.sectionGap,
  },
  focusRowContent: {
    gap: spacing.elementGap,
    alignItems: 'center',
  },
  addFocusPill: {
    paddingHorizontal: spacing.sectionGap,
    paddingVertical: spacing.elementGap,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.chrome,
    backgroundColor: colors.surface,
  },
  addFocusPillText: {
    fontFamily: typeScale.labelLarge.family,
    fontSize: typeScale.labelLarge.size,
    lineHeight: lineHeight(typeScale.labelLarge),
    color: colors.ink,
  },
});
