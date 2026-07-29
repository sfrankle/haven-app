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
import type { Routine } from '@/lib/db/query-types';
import {
  deriveRoutineCompletionStates,
  type RoutineCompletionState,
} from '@/lib/utils/routine-dashboard';
import type { ScheduleableBlock } from '@/lib/utils/timestamp';
import {
  useRoutineDayProgress,
  type UseRoutineDayProgressResult,
} from './useRoutineDayProgress';

export interface UseRoutineDayStateResult extends UseRoutineDayProgressResult {
  states: Record<number, RoutineCompletionState>;
}

export function useRoutineDayState(
  routines: Routine[],
  currentTimeBlock: ScheduleableBlock,
  today: string
): UseRoutineDayStateResult {
  const { progress, loading, error } = useRoutineDayProgress(routines, today);

  // Cheap enough to be indifferent to `routines` identity: a pure loop over a
  // handful of items with no I/O. An id-string dep would cost more indirection
  // than it saves.
  const states = useMemo(
    () => deriveRoutineCompletionStates(routines, progress, currentTimeBlock),
    [routines, progress, currentTimeBlock]
  );

  return { progress, states, loading, error };
}
