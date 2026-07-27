/**
 * Loads today's completion progress for each routine in the provided array —
 * the count and the blocks already done, for display on a Routine card.
 *
 * Mirrors useRoutineCompletionStates: one batched read, reloaded whenever the
 * set of routine IDs, the today string, or refreshKey changes.
 *
 * Dep array stability note:
 * Passing `routines` (an array) directly as a useEffect dep would re-fetch on
 * every parent render, because a new array reference is produced each time.
 * Instead we depend on a stable string derived from the routine IDs. The
 * optional `refreshKey` exists precisely because that stability is too good:
 * after completing a Routine the IDs are unchanged, so the caller bumps
 * refreshKey to force a re-read of data that has genuinely changed underneath.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { getTypedDb } from '@/lib/db/typed-db';
import { getRoutineDayProgress } from '@/lib/db/queries';
import type { Routine, RoutineDayProgress } from '@/lib/db/query-types';

export type RoutineDayProgressMap = Record<number, RoutineDayProgress>;

export interface UseRoutineDayProgressResult {
  progress: RoutineDayProgressMap;
  loading: boolean;
  error: Error | null;
}

export function useRoutineDayProgress(
  routines: Routine[],
  today: string,
  refreshKey?: number
): UseRoutineDayProgressResult {
  const [progress, setProgress] = useState<RoutineDayProgressMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Keep a ref so the effect body always reads the current routines array
  // without adding it to the dep array.
  const routinesRef = useRef(routines);
  routinesRef.current = routines;

  const routineIds = useMemo(() => routines.map((r) => r.id).join(','), [routines]);

  useEffect(() => {
    const current = routinesRef.current;
    if (current.length === 0) {
      setProgress({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const db = await getTypedDb();
        const result = await getRoutineDayProgress(
          db,
          current.map((r) => r.id),
          today
        );
        if (!cancelled) {
          setProgress(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setProgress({});
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
  }, [routineIds, today, refreshKey]);

  return { progress, loading, error };
}
