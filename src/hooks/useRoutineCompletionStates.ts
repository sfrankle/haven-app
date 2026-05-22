/**
 * Derives completion state for each routine in the provided array, reloading
 * whenever the routines list, current time block, or today string changes.
 *
 * Uses useEffect (not useFocusEffect) because the inputs are reactive — the
 * caller already re-renders with a new time block when the block transitions,
 * so no navigation focus dependency is needed.
 *
 * Dep array stability note:
 * Passing `routines` (an array) directly as a useEffect dep would trigger a
 * re-fetch on every parent render cycle because a new array reference is
 * produced each time. Instead, we use a stable string derived from the routine
 * IDs (`routineIds`) as the dep. This is the canonical approach for arrays
 * in effect deps throughout Haven.
 */

import { useState, useEffect, useMemo } from 'react';
import { getDb } from '@/lib/db/database';
import { getRoutineCompletionState, type Db } from '@/lib/db/queries';
import type { Routine, RoutineCompletionState } from '@/lib/db/query-types';
import type { ScheduleableBlock } from '@/lib/utils/timestamp';

export type RoutineCompletionStateMap = Record<number, RoutineCompletionState>;

export interface UseRoutineCompletionStatesResult {
  states: RoutineCompletionStateMap;
  loading: boolean;
  error: Error | null;
}

export function useRoutineCompletionStates(
  routines: Routine[],
  currentTimeBlock: ScheduleableBlock,
  today: string
): UseRoutineCompletionStatesResult {
  const [states, setStates] = useState<RoutineCompletionStateMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Stable dep: stringify the routine IDs to avoid re-running the effect on
  // every render when the caller passes a new array with the same contents.
  const routineIds = useMemo(
    () => routines.map((r) => r.id).join(','),
    [routines]
  );

  useEffect(() => {
    if (routines.length === 0) {
      setStates({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const db = (await getDb()) as unknown as Db;
        const entries = await Promise.all(
          routines.map(async (r) => {
            const state = await getRoutineCompletionState(db, r.id, currentTimeBlock, today);
            return [r.id, state] as [number, RoutineCompletionState];
          })
        );
        if (!cancelled) {
          setStates(Object.fromEntries(entries));
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setStates({});
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routineIds, currentTimeBlock, today]);

  return { states, loading, error };
}
