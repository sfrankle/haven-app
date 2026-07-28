/**
 * Returns grouped trace data for the Trace screen.
 *
 * Orchestrates two reads: the (optionally focus-filtered) entry list, and the
 * Routine completion groups that collapse Routine entries into single rows.
 */

import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getTypedDb } from '@/lib/db/typed-db';
import { getEntriesForTrace, getRoutineCompletions } from '@/lib/db/queries';
import { buildTraceItems, groupTraceItemsByDate } from '@/lib/utils/traceUtils';
import type { TraceSection } from '@/lib/utils/traceUtils';
import type { RoutineCompletionGroup } from '@/lib/db/query-types';

export interface UseTraceEntriesResult {
  sections: TraceSection[];
  loading: boolean;
  error: Error | null;
}

/**
 * @param focusIds - Active focus filters, OR-combined. `[]` means unfiltered.
 */
export function useTraceEntries(focusIds: number[]): UseTraceEntriesResult {
  const [sections, setSections] = useState<TraceSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // `focusIds` is an array, so a caller that rebuilds it inline would change its
  // identity on every render and refire the effect in a loop. Depend on a stable
  // primitive key instead. The effect still reads `focusIds` directly: the
  // callback is only rebuilt when the key changes, so the captured array always
  // has the members the key describes.
  const focusKey = [...focusIds].sort((a, b) => a - b).join(',');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        try {
          const db = await getTypedDb();
          const entries = await getEntriesForTrace(db, { focusIds });

          const completionIds = [
            ...new Set(
              entries
                .map((e) => e.routineCompletionId)
                .filter((id): id is number => id != null)
            ),
          ];

          // Routine grouping is presentation-only enrichment: every entry it
          // describes is already in `entries`. A failure here must degrade to an
          // ungrouped list, never blank the user's history behind an error
          // screen. The swallow is deliberate — do not turn it into a re-throw.
          let groups: RoutineCompletionGroup[] = [];
          if (completionIds.length > 0) {
            try {
              groups = await getRoutineCompletions(db, completionIds);
            } catch {
              groups = [];
            }
          }

          if (!cancelled) {
            setSections(groupTraceItemsByDate(buildTraceItems(entries, groups)));
          }
        } catch (err) {
          if (!cancelled) {
            setError(err instanceof Error ? err : new Error(String(err)));
          }
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      }

      load();

      return () => {
        cancelled = true;
      };
      // `focusIds` is intentionally omitted — `focusKey` is its stable proxy.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusKey])
  );

  return { sections, loading, error };
}
