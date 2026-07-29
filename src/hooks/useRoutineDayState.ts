/**
 * Everything the Tend dashboard knows about a set of Routines today: the raw
 * progress read, and the completion state derived from it.
 *
 * One read of routine_completion per refresh. The card's progress line and its
 * group placement are derived from the same resolved rows, so they can never
 * disagree — previously they were two independent async reads that could
 * resolve at different points in time.
 *
 * Reading is delegated to useRoutineDayProgress; see useRoutineKeyedRead for
 * the dep-stability and focus-refresh contract. Changing the current block
 * re-derives without touching the database.
 */

import { useMemo } from 'react';
import type { Routine, RoutineCompletionState } from '@/lib/db/query-types';
import { deriveRoutineCompletionStates } from '@/lib/utils/routine-dashboard';
import type { ScheduleableBlock } from '@/lib/utils/timestamp';
import { useRoutineDayProgress, type RoutineDayProgressMap } from './useRoutineDayProgress';

export interface UseRoutineDayStateResult {
  progress: RoutineDayProgressMap;
  states: Record<number, RoutineCompletionState>;
  loading: boolean;
  error: Error | null;
}

export function useRoutineDayState(
  routines: Routine[],
  currentTimeBlock: ScheduleableBlock,
  today: string
): UseRoutineDayStateResult {
  const { progress, loading, error } = useRoutineDayProgress(routines, today);

  // `routines` is a new array identity on every parent render, so this
  // recomputes often. That is fine — it is a pure loop over a handful of items
  // with no I/O, and an id-string dep would cost more indirection than it saves.
  const states = useMemo(
    () => deriveRoutineCompletionStates(routines, progress, currentTimeBlock),
    [routines, progress, currentTimeBlock]
  );

  return { progress, states, loading, error };
}
