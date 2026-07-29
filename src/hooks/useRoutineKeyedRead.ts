/**
 * Shared shell for the dashboard's per-Routine reads.
 *
 * A read that answers "what is true about these Routines today?" needs the same
 * three awkward things wherever it appears:
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

  // Every focus bumps the tick, including the first. Skipping the first would
  // save one query on the common path where mount and focus coincide, but a
  // screen can mount without being focused (tab pre-render) — and then the
  // skipped focus is the one that matters, because the user has been away
  // completing a Routine in between. A duplicate read of a local SQLite table
  // is far cheaper than reintroducing the staleness bug.
  const [focusTick, setFocusTick] = useState(0);
  useFocusEffect(
    useCallback(() => {
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
