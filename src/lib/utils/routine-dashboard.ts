/**
 * Pure product semantics for the Tend dashboard Routines section.
 *
 * Everything here is a pure function — no React, no database — so the rules can
 * be tested directly against the design spec's worked examples.
 *
 * Guiding principle: a Routine is never "overdue", "missed", or "behind". Once
 * one of its configured blocks has begun it simply stays available until the
 * day ends. The vocabulary in this file reflects that.
 */

import type { Routine, RoutineDayProgress } from '@/lib/db/query-types';
import {
  getScheduleableBlocks,
  type ScheduleableBlock,
  type TimeBlock,
} from '@/lib/utils/timestamp';

/**
 * How a Routine card presents today. Derived, never stored and never read — it
 * lives here rather than in the query types because no query produces it.
 */
export type RoutineCompletionState = 'due' | 'completed_this_block' | 'fully_done';

export type RoutineGroup = 'dueNow' | 'later' | 'completed';

export interface GroupedRoutines {
  dueNow: Routine[];
  later: Routine[];
  completed: Routine[];
}

// Derived, not restated: timestamp.ts owns the canonical block order, and Night
// is the one block that is never scheduleable but always sorts last.
//
// Resolved lazily and cached rather than computed at module load. Several test
// suites partially mock timestamp.ts, and a module-level call would run against
// the mock at import time — in files that never touch a Routine.
let blockOrderCache: TimeBlock[] | null = null;
function blockOrder(): TimeBlock[] {
  blockOrderCache ??= [...getScheduleableBlocks(), 'Night'];
  return blockOrderCache;
}

/**
 * Position of a time block in the day. Night sorts last and is only ever the
 * *current* block, never a configured one — so at night every configured block
 * reads as already started.
 */
function blockIndex(block: TimeBlock): number {
  return blockOrder().indexOf(block);
}

/**
 * Sorts scheduleable blocks into canonical day order and drops duplicates.
 */
function inBlockOrder(blocks: ScheduleableBlock[]): ScheduleableBlock[] {
  const present = new Set(blocks);
  return blockOrder().filter((b): b is ScheduleableBlock => b !== 'Night' && present.has(b));
}

/**
 * Completion state for one Routine, derived from today's progress.
 *
 *   'fully_done'           — completions today >= configured blocks (blocks > 0)
 *   'completed_this_block' — a completion landed in the current block
 *   'due'                  — neither
 *
 * Pure: every fact this needs is already in the batched getRoutineDayProgress
 * read plus the Routine's configured blocks, so the dashboard reads
 * routine_completion once per refresh. The >= boundary is load-bearing — see
 * "three completions against two blocks" in routine-dashboard.test.ts.
 */
export function deriveRoutineCompletionState(
  progress: RoutineDayProgress,
  timeBlocks: ScheduleableBlock[],
  currentBlock: ScheduleableBlock
): RoutineCompletionState {
  // Order matters: fully_done wins over completed_this_block. The length guard
  // stops a zero-block "anytime" Routine from satisfying 0 >= 0.
  if (timeBlocks.length > 0 && progress.completionCount >= timeBlocks.length) {
    return 'fully_done';
  }
  if (progress.completedBlocks.includes(currentBlock)) return 'completed_this_block';
  return 'due';
}

/**
 * deriveRoutineCompletionState across a set of Routines.
 *
 * A Routine absent from the progress map is skipped, not defaulted to 'due':
 * groupRoutinesForDashboard deliberately parks a stateless Routine in "later"
 * rather than presenting an unverified one as due now.
 */
export function deriveRoutineCompletionStates(
  routines: Routine[],
  progress: Record<number, RoutineDayProgress>,
  currentBlock: ScheduleableBlock
): Record<number, RoutineCompletionState> {
  const states: Record<number, RoutineCompletionState> = {};
  for (const routine of routines) {
    const p = progress[routine.id];
    if (p === undefined) continue;
    states[routine.id] = deriveRoutineCompletionState(p, routine.timeBlocks, currentBlock);
  }
  return states;
}

/**
 * Splits active Routines into the three dashboard groups, preserving the
 * incoming order (sort_order) within each group.
 *
 * Rules, per Routine:
 *   - completed_this_block or fully_done  → completed
 *   - due, no configured blocks           → dueNow (unscheduled means anytime)
 *   - due, any configured block started   → dueNow
 *   - due, every block still in the future → later
 *   - no state yet (loading or read error) → later, never invent a "due"
 */
export function groupRoutinesForDashboard(
  routines: Routine[],
  states: Record<number, RoutineCompletionState>,
  nowBlock: TimeBlock
): GroupedRoutines {
  const grouped: GroupedRoutines = { dueNow: [], later: [], completed: [] };
  const nowIndex = blockIndex(nowBlock);

  for (const routine of routines) {
    const state = states[routine.id];

    if (state === 'completed_this_block' || state === 'fully_done') {
      grouped.completed.push(routine);
      continue;
    }

    if (state !== 'due') {
      // Still loading, or the read failed. Park it out of the way rather than
      // presenting an unverified Routine as something to do right now.
      grouped.later.push(routine);
      continue;
    }

    const hasStarted =
      routine.timeBlocks.length === 0 ||
      routine.timeBlocks.some((b) => blockIndex(b) <= nowIndex);

    if (hasStarted) {
      grouped.dueNow.push(routine);
    } else {
      grouped.later.push(routine);
    }
  }

  return grouped;
}

/**
 * The blocks line on a Routine card: "Morning · Afternoon", or "Anytime" for a
 * Routine with no configured blocks.
 */
export function formatTimeBlocks(blocks: ScheduleableBlock[]): string {
  if (blocks.length === 0) return 'Anytime';
  return inBlockOrder(blocks).join(' · ');
}

/**
 * The progress line on a Routine card. Returns null when there is nothing to
 * say — silence reads better than "0 of 2".
 *
 * The count is the true number of completions and is never clamped to the
 * configured block count: a Routine completed three times against two blocks
 * reads "3 of 2". Showing "2 of 2" would quietly hide something the user did.
 *
 * An over-count is disclosure-only, never on a due-now card:
 * deriveRoutineCompletionState returns fully_done once completions >=
 * configured blocks, so anything that could read "3 of 2" has already been
 * grouped as completed. Both come from the same progress read. Pinned by
 * "three completions against two blocks" in routine-dashboard.test.ts and its
 * database-backed twin in queries-routines.test.ts.
 */
export function formatRoutineProgress(
  progress: RoutineDayProgress | undefined,
  timeBlocks: ScheduleableBlock[]
): string | null {
  // undefined only on the first render, before the batched read resolves.
  if (progress === undefined) return null;

  const { completionCount, completedBlocks } = progress;
  if (completionCount === 0) return null;

  if (timeBlocks.length === 0) {
    return completionCount === 1 ? 'Once today' : `${completionCount} times today`;
  }

  const base = `${completionCount} of ${timeBlocks.length}`;
  const ordered = inBlockOrder(completedBlocks);
  if (ordered.length === 0) return base;

  return `${base} · ${ordered.join(', ')} done`;
}

/**
 * Label for the collapsed disclosure row holding completed and later Routines.
 * Returns null when there is nothing behind it — the row is then not rendered.
 */
export function disclosureLabel(
  completedCount: number,
  laterCount: number
): string | null {
  if (completedCount === 0 && laterCount === 0) return null;
  if (completedCount > 0 && laterCount > 0) return 'Completed · Later';
  return completedCount > 0 ? 'Completed' : 'Later';
}
