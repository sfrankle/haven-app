/**
 * Derives completion state for each routine in the provided array, reloading
 * whenever the routines list, current time block, or today string changes —
 * and whenever the screen regains focus, so a Routine completed elsewhere and
 * navigated back from stops reading as due.
 *
 * See useRoutineKeyedRead for the dep-stability and focus-refresh contract.
 */

import { useCallback } from 'react';
import { getRoutineCompletionState } from '@/lib/db/queries';
import type { Db } from '@/lib/db/queries';
import type { Routine, RoutineCompletionState } from '@/lib/db/query-types';
import type { ScheduleableBlock } from '@/lib/utils/timestamp';
import { useRoutineKeyedRead } from './useRoutineKeyedRead';

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
  const load = useCallback(
    async (db: Db, current: Routine[]) => {
      const entries = await Promise.all(
        current.map(async (r) => {
          const state = await getRoutineCompletionState(db, r.id, currentTimeBlock, today);
          return [r.id, state] as [number, RoutineCompletionState];
        })
      );
      return Object.fromEntries(entries) as RoutineCompletionStateMap;
    },
    [currentTimeBlock, today]
  );

  const { data, loading, error } = useRoutineKeyedRead<RoutineCompletionState>(
    routines,
    `${currentTimeBlock}|${today}`,
    load
  );

  return { states: data, loading, error };
}
