/**
 * Loads today's completion progress for each routine in the provided array —
 * the count and the blocks already done, for display on a Routine card.
 *
 * One batched read. See useRoutineKeyedRead for the dep-stability and
 * focus-refresh contract.
 */

import { useCallback } from 'react';
import { getRoutineDayProgress } from '@/lib/db/queries';
import type { Db } from '@/lib/db/queries';
import type { Routine, RoutineDayProgress } from '@/lib/db/query-types';
import { useRoutineKeyedRead } from './useRoutineKeyedRead';

export type RoutineDayProgressMap = Record<number, RoutineDayProgress>;

export interface UseRoutineDayProgressResult {
  progress: RoutineDayProgressMap;
  loading: boolean;
  error: Error | null;
}

export function useRoutineDayProgress(
  routines: Routine[],
  today: string
): UseRoutineDayProgressResult {
  const load = useCallback(
    (db: Db, current: Routine[]) =>
      getRoutineDayProgress(
        db,
        current.map((r) => r.id),
        today
      ),
    [today]
  );

  const { data, loading, error } = useRoutineKeyedRead<RoutineDayProgress>(
    routines,
    today,
    load
  );

  return { progress: data, loading, error };
}
