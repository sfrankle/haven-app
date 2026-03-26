import { formatEntryDate } from './timestamp';
import type { EntryWithLabels } from '@/lib/db/query-types';

export interface TraceSection {
  /** Formatted date header, e.g. "Today", "Yesterday", "March 2". */
  title: string;
  data: EntryWithLabels[];
}

/** Returns "Felt {label}" or "Felt" when no labels are present. */
function feltSummary(labels: EntryWithLabels['labels']): string {
  return labels[0] ? `Felt ${labels[0].name}` : 'Felt';
}

/**
 * Returns a one-line summary string for an entry suitable for the Trace row.
 *
 * Physical discrimination: numericValue != null → energy entry (see save logic
 * in physical.tsx); null → state entry.
 */
export function summariseEntry(entry: EntryWithLabels): string {
  const { entryTypeName, entryTypeTitle, numericValue, labels } = entry;

  switch (entryTypeName) {
    case 'Hydration':
      return `Drank ${numericValue}oz`;

    case 'Sleep':
      return `Slept ${numericValue} hours`;

    case 'Activity':
      return labels[0]?.name ?? 'Journey';

    case 'Food':
      if (labels.length === 0) return 'Nourish';
      return `Ate ${labels.map((l) => l.name).join(', ')}`;

    case 'Emotion':
      return feltSummary(labels);

    case 'Physical':
      if (numericValue != null) return `Felt Energy (${numericValue}/5)`;
      return feltSummary(labels);

    default:
      return entryTypeTitle;
  }
}

/**
 * Groups entries (already newest-first from getEntriesForTrace) into SectionList
 * sections, preserving order.
 *
 * @param entries - Entries ordered newest-first.
 * @param today - Optional 'YYYY-MM-DD' override for "today" (injectable for tests).
 */
export function groupEntriesByDate(entries: EntryWithLabels[], today?: string): TraceSection[] {
  const sectionMap = new Map<string, TraceSection>();

  for (const entry of entries) {
    const key = entry.localDate;
    if (!sectionMap.has(key)) {
      sectionMap.set(key, { title: formatEntryDate(entry.timestamp, today), data: [] });
    }
    sectionMap.get(key)!.data.push(entry);
  }

  return Array.from(sectionMap.values());
}
