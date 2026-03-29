import React, { useState, useCallback } from 'react';
import { SectionList, StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, Chip } from '@/components';
import { useFocusEffect } from 'expo-router';
import { useTraceEntries } from '@/hooks/useTraceEntries';
import { summariseEntry, shouldShowAreaPrefix } from '@/lib/utils/traceUtils';
import { formatEntryTime } from '@/lib/utils/timestamp';
import { colors, typeScale, lineHeight, spacing } from '@/constants/theme';
import type { EntryWithLabels } from '@/lib/db/query-types';
import type { TraceSection } from '@/lib/utils/traceUtils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTraceChipLabel(label: EntryWithLabels['labels'][number], entry: EntryWithLabels): string {
  if (entry.entryTypeName !== 'Physical') return label.name;
  const base = shouldShowAreaPrefix(label.parentName) ? `${label.parentName}: ${label.name}` : label.name;
  return entry.numericValue != null ? `${base} (${entry.numericValue}/5)` : base;
}

// ─── Row ──────────────────────────────────────────────────────────────────────

interface EntryRowProps {
  entry: EntryWithLabels;
  expanded: boolean;
  onToggle: (id: number) => void;
}

function EntryRow({ entry, expanded, onToggle }: EntryRowProps) {
  const summary = summariseEntry(entry);
  const time = formatEntryTime(entry.timestamp);

  return (
    <View>
      <Pressable
        style={styles.row}
        onPress={() => onToggle(entry.id)}
        accessibilityRole="button"
        accessibilityLabel={`${summary}, ${time}`}
      >
        {entry.entryTypeIcon ? (
          <MaterialCommunityIcons
            // icon names come from seeded DB values; safe to assert
            name={entry.entryTypeIcon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
            size={20}
            color={colors.chrome}
            testID={`trace-row-icon-${entry.id}`}
          />
        ) : (
          <View testID={`trace-row-icon-${entry.id}`} style={styles.iconPlaceholder} />
        )}
        <Text style={styles.summary} numberOfLines={1}>
          {summary}
        </Text>
        <Text style={styles.time}>{time}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.expandedContainer}>
          {entry.labels.length > 0 && (
            <View style={styles.chipsRow}>
              {entry.labels.map((label) => (
                <Chip
                  key={label.id}
                  label={formatTraceChipLabel(label, entry)}
                  color={colors.surfaceVariant}
                  testID={`trace-chip-${label.id}`}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TraceScreen() {
  const { sections, loading, error } = useTraceEntries();
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  useFocusEffect(
    useCallback(() => {
      setExpandedIds(new Set());
    }, [])
  );

  const handleToggle = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (loading) {
    return null;
  }

  if (error) {
    return (
      <Screen>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText} testID="trace-load-error">
            Could not load your entries.
          </Text>
        </View>
      </Screen>
    );
  }

  const isEmpty = sections.length === 0;

  return (
    <Screen>
      {isEmpty ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Nothing logged yet.</Text>
        </View>
      ) : (
        <SectionList<EntryWithLabels, TraceSection>
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <EntryRow
              entry={item}
              expanded={expandedIds.has(item.id)}
              onToggle={handleToggle}
            />
          )}
        />
      )}
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  listContent: {
    paddingBottom: spacing.pagePadding,
  },
  sectionHeader: {
    fontFamily: typeScale.titleMedium.family,
    fontWeight: typeScale.titleMedium.weight,
    fontSize: typeScale.titleMedium.size,
    lineHeight: lineHeight(typeScale.titleMedium),
    color: colors.ink,
    paddingHorizontal: spacing.pagePadding,
    paddingTop: spacing.pagePadding,
    paddingBottom: spacing.elementGap,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.elementGap,
    paddingHorizontal: spacing.pagePadding,
    paddingVertical: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    marginHorizontal: spacing.pagePadding,
    marginBottom: 4,
    minHeight: 48,
  },
  iconPlaceholder: {
    width: 20,
    height: 20,
  },
  summary: {
    flex: 1,
    fontFamily: typeScale.bodyMedium.family,
    fontSize: typeScale.bodyMedium.size,
    lineHeight: lineHeight(typeScale.bodyMedium),
    color: colors.ink,
  },
  time: {
    fontFamily: typeScale.bodySmall.family,
    fontSize: typeScale.bodySmall.size,
    lineHeight: lineHeight(typeScale.bodySmall),
    color: colors.chrome,
  },
  expandedContainer: {
    marginHorizontal: spacing.pagePadding,
    marginBottom: 4,
    backgroundColor: colors.surfaceVariant,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: spacing.pagePadding,
    paddingTop: spacing.elementGap,
    paddingBottom: 32,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.elementGap,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: typeScale.bodyMedium.family,
    fontSize: typeScale.bodyMedium.size,
    lineHeight: lineHeight(typeScale.bodyMedium),
    color: colors.chrome,
  },
});
