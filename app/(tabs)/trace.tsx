import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { FlatList, SectionList, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Screen, ChipTray } from '@/components';
import { useFocusEffect, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { useTraceEntries } from '@/hooks/useTraceEntries';
import { summariseEntry, shouldShowAreaPrefix } from '@/lib/utils/traceUtils';
import { formatEntryTime } from '@/lib/utils/timestamp';
import { colors, typeScale, lineHeight, spacing } from '@/constants/theme';
import type { EntryWithLabels, RoutineCompletionGroup } from '@/lib/db/query-types';
import type { TraceItem, TraceSection } from '@/lib/utils/traceUtils';
import { messages } from '@/constants/messages';
import { useFocuses } from '@/hooks/useFocuses';
import { FocusPill } from '@/components/FocusPill';
import { toggleFilter, focusIdsOf } from '@/lib/utils/traceFilters';
import type { TraceFilter } from '@/lib/utils/traceFilters';
import { getTypedDb } from '@/lib/db/typed-db';
import { getContextEntries } from '@/lib/db/queries';
import dayjs from 'dayjs';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTraceChipLabel(label: EntryWithLabels['labels'][number], entry: EntryWithLabels): string {
  if (entry.entryTypeName !== 'Physical') return label.name;
  const base = shouldShowAreaPrefix(label.parentName) ? `${label.parentName}: ${label.name}` : label.name;
  return entry.numericValue != null ? `${base} (${entry.numericValue}/5)` : base;
}

// Entry IDs and completion IDs are different key spaces, so the keys are
// namespaced to keep a group and an entry with the same numeric ID distinct.
function traceItemKey(item: TraceItem): string {
  return item.kind === 'group' ? `g-${item.group.completionId}` : `e-${item.entry.id}`;
}

/** Returns a new Set with `id` removed if present, added if not. Never mutates. */
function toggleInSet(set: Set<number>, id: number): Set<number> {
  const next = new Set(set);
  if (next.has(id)) {
    next.delete(id);
  } else {
    next.add(id);
  }
  return next;
}

// ─── Shared icon ──────────────────────────────────────────────────────────────

function EntryIcon({ icon, testID }: { icon: string | null | undefined; testID?: string }) {
  if (icon) {
    return (
      <MaterialCommunityIcons
        // icon names come from seeded DB values; safe to assert
        name={icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
        size={20}
        color={colors.chrome}
        testID={testID}
      />
    );
  }
  return <View style={styles.iconPlaceholder} testID={testID} />;
}

// ─── Shared expanded body ─────────────────────────────────────────────────────

interface EntryDetailProps {
  entry: EntryWithLabels;
  chipsTestID: string;
  notesTestID: string;
}

/**
 * The chips-and-notes body shown when an entry is expanded.
 *
 * Shared by the standalone row and by each member of an expanded Routine group
 * so the Physical severity/area chip rules (formatTraceChipLabel) and the
 * empty-notes guard live in exactly one place.
 */
function EntryDetail({ entry, chipsTestID, notesTestID }: EntryDetailProps) {
  return (
    <>
      {entry.labels.length > 0 && (
        <ChipTray
          chips={entry.labels.map((label) => ({
            id: label.id,
            label: formatTraceChipLabel(label, entry),
            color: colors.surfaceVariant,
          }))}
          testID={chipsTestID}
        />
      )}
      {entry.notes != null && entry.notes !== '' && (
        <Text style={styles.expandedNotes} testID={notesTestID}>
          {entry.notes}
        </Text>
      )}
    </>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

interface EntryRowProps {
  entry: EntryWithLabels;
  expanded: boolean;
  onToggle: (id: number) => void;
  filterActive?: boolean;
  onShowContext?: (entry: EntryWithLabels) => void;
}

function EntryRow({ entry, expanded, onToggle, filterActive, onShowContext }: EntryRowProps) {
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
        <EntryIcon icon={entry.entryTypeIcon} testID={`trace-row-icon-${entry.id}`} />
        <Text style={styles.summary} numberOfLines={1}>
          {summary}
        </Text>
        <Text style={styles.time}>{time}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.expandedContainer}>
          <EntryDetail
            entry={entry}
            chipsTestID="trace-expanded"
            notesTestID={`trace-notes-${entry.id}`}
          />
        </View>
      )}

      {filterActive && (
        <Pressable
          onPress={() => onShowContext?.(entry)}
          testID={`show-context-${entry.id}`}
          accessibilityRole="button"
          accessibilityLabel="Show context"
          style={styles.contextButton}
        >
          <Text style={styles.contextButtonText}>Show context</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── Routine group row ────────────────────────────────────────────────────────

interface RoutineGroupRowProps {
  group: RoutineCompletionGroup;
  /** IDs of every entry matching the active filter, across the whole list. */
  matchedIds: Set<number>;
  expanded: boolean;
  onToggle: (completionId: number) => void;
  filterActive: boolean;
}

/**
 * One Routine completion, collapsed into a single row.
 *
 * Expanding reveals every member entry — including entries the active filter
 * excluded, which render muted so it is clear why the Routine surfaced at all.
 *
 * No "Show context" affordance here: a group has N entries and no single focal
 * one, so the ±2h window would be ambiguous.
 */
function RoutineGroupRow({ group, matchedIds, expanded, onToggle, filterActive }: RoutineGroupRowProps) {
  const time = formatEntryTime(group.completedAt);
  const itemCount = group.entries.length;

  return (
    <View>
      <Pressable
        style={styles.row}
        onPress={() => onToggle(group.completionId)}
        accessibilityRole="button"
        accessibilityLabel={`${group.routineName}, ${time}, ${itemCount} items`}
        accessibilityState={{ expanded }}
        testID={`trace-group-${group.completionId}`}
      >
        <EntryIcon
          icon="format-list-checks"
          testID={`trace-group-icon-${group.completionId}`}
        />
        <Text style={styles.summary} numberOfLines={1}>
          {group.routineName}
        </Text>
        <Text style={styles.time}>{time}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.expandedContainer}>
          {group.entries.map((entry) => {
            const muted = filterActive && !matchedIds.has(entry.id);
            return (
              <View
                key={entry.id}
                style={muted ? styles.rowMuted : undefined}
                testID={
                  muted
                    ? `trace-group-item-muted-${entry.id}`
                    : `trace-group-item-${entry.id}`
                }
              >
                <Text style={styles.summary} numberOfLines={1}>
                  {summariseEntry(entry)}
                </Text>
                <EntryDetail
                  entry={entry}
                  chipsTestID={`trace-group-item-chips-${entry.id}`}
                  notesTestID={`trace-group-item-notes-${entry.id}`}
                />
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

// ─── Context View ─────────────────────────────────────────────────────────────

interface ContextViewProps {
  focalEntry: EntryWithLabels;
  contextEntries: EntryWithLabels[];
  /** What the user returns to, e.g. "Knee PT filter" or "filters". */
  backLabel: string;
  onDismiss: () => void;
}

function ContextView({ focalEntry, contextEntries, backLabel, onDismiss }: ContextViewProps) {
  // Build the flat list: focal entry + all context entries, sorted by timestamp.
  // Context entries are all other entries in the ±2h window — they render muted
  // since they were not part of the active focus filter. The focal entry gets a
  // glow left border as a position marker.
  const allEntries = [...contextEntries, focalEntry].sort(
    (a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0)
  );

  const focalId = focalEntry.id;
  const renderContextItem = useCallback(
    ({ item }: { item: EntryWithLabels }) => (
      <ContextViewRow entry={item} isFocal={item.id === focalId} isMuted={item.id !== focalId} />
    ),
    [focalId],
  );

  return (
    <View style={styles.contextViewContainer} testID="context-view">
      <Pressable
        onPress={onDismiss}
        testID="context-view-dismiss"
        accessibilityRole="button"
        style={styles.contextViewDismiss}
      >
        <Text style={styles.contextViewDismissText}>
          {`← Back to ${backLabel}`}
        </Text>
      </Pressable>

      <FlatList
        data={allEntries}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={renderContextItem}
      />
    </View>
  );
}

interface ContextViewRowProps {
  entry: EntryWithLabels;
  isFocal: boolean;
  isMuted: boolean;
}

function ContextViewRow({ entry, isFocal, isMuted }: ContextViewRowProps) {
  const summary = summariseEntry(entry);
  const time = formatEntryTime(entry.timestamp);

  return (
    <View
      style={[
        styles.row,
        isFocal && styles.rowFocal,
        isMuted && styles.rowMuted,
      ]}
      testID={isFocal ? `context-view-focal-${entry.id}` : `context-view-muted-${entry.id}`}
    >
      <EntryIcon icon={entry.entryTypeIcon} />
      <Text style={styles.summary} numberOfLines={1}>
        {summary}
      </Text>
      <Text style={styles.time}>{time}</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function TraceScreen() {
  const router = useRouter();
  const [activeFilters, setActiveFilters] = useState<TraceFilter[]>([]);
  // Memoised so the array identity is stable across renders — useTraceEntries
  // otherwise sees a fresh array on every entry/group toggle.
  const focusIds = useMemo(() => focusIdsOf(activeFilters), [activeFilters]);
  const filterCount = activeFilters.length;
  const filterActive = filterCount > 0;
  const { focuses } = useFocuses({ includeArchived: true });
  const { sections, loading, error } = useTraceEntries(focusIds);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  // Keyed by routine_completion.id — a separate set from expandedIds because
  // entry IDs and completion IDs are different key spaces and would collide.
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<number>>(new Set());

  // Context view mode: when set, the filtered SectionList is replaced by a
  // flat context view showing all entries around the focal entry.
  const [contextState, setContextState] = useState<{
    focalEntry: EntryWithLabels;
    entries: EntryWithLabels[];
  } | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      setExpandedIds(new Set());
      setExpandedGroupIds(new Set());
      setContextState(undefined);
    }, [])
  );

  const navigation = useNavigation();
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const unsubscribe = navigation.addListener('tabPress' as any, () => {
      // Only reset if this screen is already focused (guards against first-visit
      // navigation from another tab also triggering a reset).
      if (navigation.isFocused()) {
        setActiveFilters([]);
        setExpandedIds(new Set());
        setExpandedGroupIds(new Set());
        setContextState(undefined);
      }
    });
    return unsubscribe;
  }, [navigation]);

  const handleFocusPillPress = useCallback((id: number) => {
    setActiveFilters((prev) => toggleFilter(prev, { type: 'focus', id }));
    setContextState(undefined);
  }, []);

  const handleFocusPillLongPress = useCallback((id: number) => {
    router.push(`/focus/${id}/edit`);
  }, [router]);

  const handleToggle = useCallback((id: number) => {
    setExpandedIds((prev) => toggleInSet(prev, id));
  }, []);

  const handleToggleGroup = useCallback((completionId: number) => {
    setExpandedGroupIds((prev) => toggleInSet(prev, completionId));
  }, []);

  const handleShowContext = useCallback(async (entry: EntryWithLabels) => {
    // Switch to context view immediately so the user sees a response, then
    // populate the context entries when the fetch resolves.
    setContextState({ focalEntry: entry, entries: [] });
    try {
      const db = await getTypedDb();
      const afterIso = dayjs(entry.timestamp).subtract(120, 'minute').format('YYYY-MM-DDTHH:mm:ssZ');
      const beforeIso = dayjs(entry.timestamp).add(120, 'minute').format('YYYY-MM-DDTHH:mm:ssZ');
      const entries = await getContextEntries(db, {
        excludeEntryId: entry.id,
        afterIso,
        beforeIso,
      });
      setContextState((prev) => prev ? { ...prev, entries } : prev);
    } catch {
      // Silent fallback — context fetch failed; focal entry still shown alone
    }
  }, []);

  const handleDismissContext = useCallback(() => {
    setContextState(undefined);
  }, []);

  const renderSectionHeader = useCallback(
    ({ section }: { section: TraceSection }) => (
      <Text style={styles.sectionHeader}>{section.title}</Text>
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: TraceItem }) =>
      item.kind === 'group' ? (
        <RoutineGroupRow
          group={item.group}
          matchedIds={item.matchedIds}
          expanded={expandedGroupIds.has(item.group.completionId)}
          onToggle={handleToggleGroup}
          filterActive={filterActive}
        />
      ) : (
        <EntryRow
          entry={item.entry}
          expanded={expandedIds.has(item.entry.id)}
          onToggle={handleToggle}
          filterActive={filterActive}
          onShowContext={handleShowContext}
        />
      ),
    [expandedIds, expandedGroupIds, handleToggle, handleToggleGroup, filterActive, handleShowContext],
  );

  if (loading) {
    return null;
  }

  if (error) {
    return (
      <Screen>
        <View style={styles.emptyContainer}>
          <Text style={styles.errorText} testID="trace-load-error">
            {messages.traceLoadError}
          </Text>
        </View>
      </Screen>
    );
  }

  const isEmpty = sections.length === 0;
  // With exactly one filter the back label names it, byte-identical to the
  // single-filter behaviour before multi-select. With several, "filters" is the
  // only honest label.
  // Both key off `filterCount`, not `focusIds.length`, so a future non-focus
  // filter variant still reads as "filtered" here rather than silently falling
  // back to the unfiltered copy.
  const contextBackLabel =
    filterCount === 1 && focusIds.length === 1
      ? `${focuses.find((f) => f.id === focusIds[0])?.name ?? 'Focus'} filter`
      : 'filters';

  const emptyMessage =
    filterCount === 0
      ? messages.traceEmpty
      : filterCount === 1
        ? messages.traceEmptyFiltered
        : messages.traceEmptyFilteredPlural;

  return (
    <Screen>
      {focuses.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterRowContent}
          testID="focus-filter-row"
        >
          {focuses.map((focus) => (
            <FocusPill
              key={focus.id}
              label={focus.name}
              selected={focusIds.includes(focus.id)}
              onPress={() => handleFocusPillPress(focus.id)}
              onLongPress={() => handleFocusPillLongPress(focus.id)}
              testID={`focus-pill-${focus.id}`}
            />
          ))}
        </ScrollView>
      )}

      {/* Context view mode: replaces the filtered SectionList entirely */}
      {contextState != null ? (
        <ContextView
          focalEntry={contextState.focalEntry}
          contextEntries={contextState.entries}
          backLabel={contextBackLabel}
          onDismiss={handleDismissContext}
        />
      ) : isEmpty ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      ) : (
        <SectionList<TraceItem, TraceSection>
          sections={sections}
          keyExtractor={traceItemKey}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
        />
      )}
    </Screen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  filterRow: {
    flexGrow: 0,
    flexShrink: 0,
  },
  filterRowContent: {
    flexDirection: 'row',
    gap: spacing.elementGap,
    paddingHorizontal: spacing.pagePadding,
    paddingVertical: spacing.elementGap,
  },
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
  rowFocal: {
    borderLeftWidth: 2,
    borderLeftColor: colors.glow,
  },
  rowMuted: {
    opacity: 0.45,
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
  expandedNotes: {
    fontFamily: typeScale.bodyMedium.family,
    fontSize: typeScale.bodyMedium.size,
    lineHeight: lineHeight(typeScale.bodyMedium),
    color: colors.chrome,
    paddingTop: spacing.elementGap,
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
  errorText: {
    fontFamily: typeScale.bodyMedium.family,
    fontSize: typeScale.bodyMedium.size,
    lineHeight: lineHeight(typeScale.bodyMedium),
    color: colors.error,
  },
  contextButton: {
    paddingHorizontal: spacing.pagePadding,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  contextButtonText: {
    fontFamily: typeScale.bodySmall.family,
    fontSize: typeScale.bodySmall.size,
    color: colors.interactive,
  },
  contextViewContainer: {
    flex: 1,
  },
  contextViewDismiss: {
    paddingHorizontal: spacing.pagePadding,
    paddingVertical: spacing.elementGap,
  },
  contextViewDismissText: {
    fontFamily: typeScale.bodySmall.family,
    fontSize: typeScale.bodySmall.size,
    color: colors.interactive,
  },
});
