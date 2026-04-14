/**
 * Returns grouped trace data for the Trace screen.
 * Groups EntryWithLabels[] by localDate into SectionList sections.
 */

import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getDb } from '@/lib/db/database';
import { getEntriesForTrace, type Db } from '@/lib/db/queries';
import { groupEntriesByDate } from '@/lib/utils/traceUtils';
import type { TraceSection } from '@/lib/utils/traceUtils';

export interface UseTraceEntriesResult {
  sections: TraceSection[];
  loading: boolean;
  error: Error | null;
}

export function useTraceEntries(focusId?: number): UseTraceEntriesResult {
  const [sections, setSections] = useState<TraceSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      async function load() {
        try {
          const db = (await getDb()) as unknown as Db;
          const entries = await getEntriesForTrace(db, { focusId });
          if (!cancelled) {
            setSections(groupEntriesByDate(entries));
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
    }, [focusId])
  );

  return { sections, loading, error };
}
