/**
 * Returns grouped trace data for the Trace screen.
 * Groups EntryWithLabels[] by localDate into SectionList sections.
 */

import { useState, useEffect } from 'react';
import { getDb } from '@/lib/db/database';
import { getEntriesForTrace, type Db } from '@/lib/db/queries';
import { groupEntriesByDate } from '@/lib/utils/traceUtils';
import type { TraceSection } from '@/lib/utils/traceUtils';

export type { TraceSection };

export interface UseTraceEntriesResult {
  sections: TraceSection[];
  loading: boolean;
  error: Error | null;
}

export function useTraceEntries(): UseTraceEntriesResult {
  const [sections, setSections] = useState<TraceSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const db = (await getDb()) as unknown as Db;
        const entries = await getEntriesForTrace(db);
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
  }, []);

  return { sections, loading, error };
}
