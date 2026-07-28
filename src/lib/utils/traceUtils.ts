import { formatEntryDate } from './timestamp';
import { energyLabel } from '@/constants/energyLevels';
import type { EntryWithLabels, RoutineCompletionGroup } from '@/lib/db/query-types';

export const WHOLE_BODY_NAMES = ['whole body', 'body'];

/** Returns true when a physical chip should be prefixed with the parent area name (e.g. "Gut: Cramping"). */
export function shouldShowAreaPrefix(parentName: string | null | undefined): boolean {
  return parentName != null && !WHOLE_BODY_NAMES.includes(parentName.toLowerCase());
}

/**
 * One row in the Trace list: either a standalone entry, or a Routine completion
 * collapsed into a single expandable row.
 */
export type TraceItem =
  | { kind: 'entry'; entry: EntryWithLabels }
  | {
      kind: 'group';
      group: RoutineCompletionGroup;
      /**
       * IDs of every entry that matched the active filter, across the whole
       * list — shared by reference between group items. The group row
       * intersects it with its own members to decide what to mute. Never a
       * per-group copy.
       */
      matchedIds: Set<number>;
    };

export interface TraceSection {
  /** Formatted date header, e.g. "Today", "Yesterday", "March 2". */
  title: string;
  data: TraceItem[];
}

/** Returns "Felt {label}" or "Felt" when no labels are present. */
function feltSummary(labels: EntryWithLabels['labels']): string {
  return labels[0] ? `Felt ${labels[0].name}` : 'Felt';
}

/**
 * Returns a one-line summary string for an entry suitable for the Trace row.
 *
 * Physical discrimination: energy entries have a parent label (parentId === null);
 * state entries have child labels (parentId !== null). Both may have numericValue
 * set (energy level vs. severity) so numericValue alone is not a reliable signal.
 */
export function summariseEntry(entry: EntryWithLabels): string {
  const { entryTypeName, entryTypeTitle, numericValue, labels } = entry;

  switch (entryTypeName) {
    case 'Hydration':
      return `Drank ${numericValue}oz`;

    case 'Sleep':
      return `Slept ${numericValue} hours`;

    case 'Activity': {
      if (labels.length === 0) return 'Journey';
      return labels
        .map((l) => (l.categoryName ? `${l.name} (${l.categoryName})` : l.name))
        .join(', ');
    }

    case 'Food':
      if (labels.length === 0) return 'Nourish';
      return `Ate ${labels.map((l) => l.name).join(', ')}`;

    case 'Emotion':
      return feltSummary(labels);

    case 'Physical': {
      const isEnergy = labels.some((l) => l.name.toLowerCase() === 'energy');
      if (isEnergy) {
        const level = numericValue != null ? energyLabel(numericValue) : null;
        const levelStr = level ?? String(numericValue);
        return `Felt ${levelStr} (Energy ${numericValue}/5)`;
      }
      const label = labels[0];
      if (!label) return 'Felt';
      const parentName = label.parentName;
      const stateName = shouldShowAreaPrefix(parentName) ? `${parentName}: ${label.name}` : label.name;
      if (numericValue === 0) return `Felt ${stateName} (absent)`;
      return numericValue !== null
        ? `Felt ${stateName} (${numericValue}/5)`
        : `Felt ${stateName}`;
    }

    default:
      return entryTypeTitle;
  }
}

/**
 * Merges the filtered entry stream with Routine completion groups into the list
 * Trace actually renders.
 *
 * Entries sharing a `routineCompletionId` collapse into a single group item,
 * emitted at the position of their first (newest) member so the chronology of
 * the surrounding entries is preserved. Grouping is keyed strictly off
 * `routineCompletionId` — never timestamp proximity, and never conditional on
 * member count, so a one-item Routine still reads "Morning Flow · 08:12".
 *
 * An entry whose completion has no matching group is emitted as an individual
 * row rather than dropped. Passing `groups: []` therefore renders everything
 * ungrouped, which is exactly the behaviour required when the
 * getRoutineCompletions enrichment query fails — one code path, two triggers.
 *
 * @param matched - Entries from getEntriesForTrace, newest-first.
 * @param groups  - Completion groups from getRoutineCompletions; `[]` on failure.
 */
export function buildTraceItems(
  matched: EntryWithLabels[],
  groups: RoutineCompletionGroup[],
): TraceItem[] {
  const groupsById = new Map(groups.map((g) => [g.completionId, g]));
  const matchedIds = new Set(matched.map((e) => e.id));
  const emitted = new Set<number>();
  const items: TraceItem[] = [];

  for (const entry of matched) {
    const completionId = entry.routineCompletionId;
    if (completionId == null) {
      items.push({ kind: 'entry', entry });
      continue;
    }

    const group = groupsById.get(completionId);
    if (group === undefined) {
      items.push({ kind: 'entry', entry });
      continue;
    }

    if (!emitted.has(completionId)) {
      emitted.add(completionId);
      items.push({ kind: 'group', group, matchedIds });
    }
  }

  return items;
}

/**
 * Groups Trace items (already newest-first) into SectionList sections,
 * preserving order. A group is filed under its completion date, which may
 * differ from a member entry's date around midnight.
 *
 * @param items - Items ordered newest-first.
 * @param today - Optional 'YYYY-MM-DD' override for "today" (injectable for tests).
 */
export function groupTraceItemsByDate(items: TraceItem[], today?: string): TraceSection[] {
  const sectionMap = new Map<string, TraceSection>();

  for (const item of items) {
    const key = item.kind === 'group' ? item.group.localDate : item.entry.localDate;
    const timestamp = item.kind === 'group' ? item.group.completedAt : item.entry.timestamp;
    if (!sectionMap.has(key)) {
      sectionMap.set(key, { title: formatEntryDate(timestamp, today), data: [] });
    }
    sectionMap.get(key)!.data.push(item);
  }

  const sections = Array.from(sectionMap.values());
  for (const section of sections) {
    section.data = [...section.data].reverse();
  }
  return sections;
}
