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

    case 'Activity':
      return labels[0]?.name ?? 'Journey';

    case 'Food':
      if (labels.length === 0) return 'Nourish';
      return `Ate ${labels.map((l) => l.name).join(', ')}`;

    case 'Emotion':
      return feltSummary(labels);

    case 'Physical': {
      const isEnergy = labels.some((l) => l.parentId === null);
      if (isEnergy) return `Felt Energy (${numericValue}/5)`;
      const stateName = labels[0]?.name;
      if (!stateName) return 'Felt';
      return numericValue != null ? `Felt ${stateName} (${numericValue}/5)` : `Felt ${stateName}`;
    }

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

  const sections = Array.from(sectionMap.values());
  for (const section of sections) {
    section.data.reverse();
  }
  return sections;
}
