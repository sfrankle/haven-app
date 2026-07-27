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
 *
 * The optional `refreshKey` exists because that stability is, on its own, too
 * good. After a user completes a Routine and navigates back, useRoutines
 * reloads and hands over a new array with the *same* routine IDs, while the
 * time block and today string are also unchanged — so nothing in the dep array
 * moves and the completed Routine would keep rendering as due. Callers bump
 * refreshKey (typically on screen focus) to force a re-read when the underlying
 * completion rows have changed but the inputs have not.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { getTypedDb } from '@/lib/db/typed-db';
import { getRoutineCompletionState } from '@/lib/db/queries';
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
  today: string,
  refreshKey?: number
): UseRoutineCompletionStatesResult {
  const [states, setStates] = useState<RoutineCompletionStateMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Keep a ref so the effect body always reads the current routines array
  // without adding it to the dep array (which would re-run on every render
  // when the caller produces a new array reference with the same contents).
  const routinesRef = useRef(routines);
  routinesRef.current = routines;

  // Stable dep: stringify the routine IDs. The effect re-runs only when the
  // set of routine IDs changes — routinesRef.current is always up-to-date.
  const routineIds = useMemo(
    () => routines.map((r) => r.id).join(','),
    [routines]
  );

  useEffect(() => {
    const current = routinesRef.current;
    if (current.length === 0) {
      setStates({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function load() {
      try {
        const db = await getTypedDb();
        const entries = await Promise.all(
          current.map(async (r) => {
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
  }, [routineIds, currentTimeBlock, today, refreshKey]);

  return { states, loading, error };
}
