/**
 * Shared shell for the dashboard's per-Routine reads.
 *
 * Both useRoutineCompletionStates and useRoutineDayProgress answer "what is
 * true about these Routines today?" and need the same three awkward things:
 *
 * 1. A stable effect dep. Passing `routines` directly would re-read on every
 *    parent render, because the caller produces a new array each time. We
 *    depend on a string of the routine IDs instead.
 *
 * 2. A refresh on screen focus. That ID string is, on its own, too stable:
 *    after the user completes a Routine and navigates back, useRoutines hands
 *    over a new array with the *same* IDs and the completion rows underneath
 *    have changed with nothing in the dep array to show for it. The focus tick
 *    lives in here rather than being a parameter the caller has to remember —
 *    an opt-in refresh is an opt-in staleness bug.
 *
 * 3. Cancellation, so a read that resolves after the inputs moved on cannot
 *    overwrite fresher state.
 *
 * `depKey` is any extra scalar inputs the loader closes over, joined into a
 * string — the effect re-runs when it changes.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { getTypedDb } from '@/lib/db/typed-db';
import type { Db } from '@/lib/db/queries';
import type { Routine } from '@/lib/db/query-types';

export interface RoutineKeyedReadResult<T> {
  data: Record<number, T>;
  loading: boolean;
  error: Error | null;
}

export function useRoutineKeyedRead<T>(
  routines: Routine[],
  depKey: string,
  load: (db: Db, routines: Routine[]) => Promise<Record<number, T>>
): RoutineKeyedReadResult<T> {
  const [data, setData] = useState<Record<number, T>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Refs so the effect body always sees current values without putting either
  // in the dep array — both change identity on every render.
  const routinesRef = useRef(routines);
  routinesRef.current = routines;
  const loadRef = useRef(load);
  loadRef.current = load;

  const routineIds = useMemo(() => routines.map((r) => r.id).join(','), [routines]);

  // The first focus is the mount itself, which the read effect below already
  // covers — bumping on it would fire a second identical query immediately.
  const [focusTick, setFocusTick] = useState(0);
  const isInitialFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (isInitialFocus.current) {
        isInitialFocus.current = false;
        return;
      }
      setFocusTick((t) => t + 1);
    }, [])
  );

  useEffect(() => {
    const current = routinesRef.current;
    if (current.length === 0) {
      setData({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function run() {
      try {
        const db = await getTypedDb();
        const result = await loadRef.current(db, current);
        if (!cancelled) {
          setData(result);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setData({});
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    run();

    return () => {
      cancelled = true;
    };
  }, [routineIds, depKey, focusTick]);

  return { data, loading, error };
}
