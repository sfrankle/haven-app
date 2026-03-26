/**
 * Trace screen utilities — pure functions with no DB access.
 *
 * summariseEntry: produces a one-line display string per entry type.
 * groupEntriesByDate: groups EntryWithLabels[] into SectionList sections.
 */

import { formatEntryDate } from './timestamp';
import type { EntryWithLabels } from '@/lib/db/query-types';

export interface TraceSection {
  /** Formatted date header, e.g. "Today", "Yesterday", "March 2". */
  title: string;
  data: EntryWithLabels[];
}

/**
 * Returns a one-line summary string for an entry suitable for the Trace row.
 *
 * Physical entry type discrimination:
 *   numericValue != null → energy entry (convention established in log screen save logic)
 *   numericValue == null → state entry — first label name, or "Felt" if none
 *
 * // TODO #85: severity not yet surfaced in EntryWithLabels.labels — Physical
 * // state rows omit severity for MVP. Add when EntryWithLabels exposes it.
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
      return labels[0] ? `Felt ${labels[0].name}` : 'Felt';

    case 'Physical':
      // numericValue != null indicates an energy entry (see save logic in physical.tsx)
      if (numericValue != null) {
        return `Felt Energy (${numericValue}/5)`;
      }
      return labels[0] ? `Felt ${labels[0].name}` : 'Felt';

    default:
      return entryTypeTitle;
  }
}

/**
 * Groups entries (already newest-first from getEntriesForTrace) into SectionList
 * sections, preserving order.
 *
 * @param entries - Entries ordered newest-first.
 * @param _today - Optional 'YYYY-MM-DD' override for "today" (injectable for tests).
 */
export function groupEntriesByDate(entries: EntryWithLabels[], _today?: string): TraceSection[] {
  const sectionMap = new Map<string, TraceSection>();
  const orderedKeys: string[] = [];

  for (const entry of entries) {
    const key = entry.localDate;
    if (!sectionMap.has(key)) {
      orderedKeys.push(key);
      // Format the date header using the entry's own timestamp wall-clock date
      const title = formatEntryDate(entry.timestamp, _today);
      sectionMap.set(key, { title, data: [] });
    }
    sectionMap.get(key)!.data.push(entry);
  }

  return orderedKeys.map((key) => sectionMap.get(key)!);
}
