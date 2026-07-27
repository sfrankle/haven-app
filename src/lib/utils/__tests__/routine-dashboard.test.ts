import {
  groupRoutinesForDashboard,
  formatTimeBlocks,
  formatRoutineProgress,
  disclosureLabel,
} from '../routine-dashboard';
import type { Routine, RoutineCompletionState, RoutineDayProgress } from '@/lib/db/query-types';
import type { ScheduleableBlock } from '@/lib/utils/timestamp';

// ─── fixtures ────────────────────────────────────────────────────────────────

function makeRoutine(
  id: number,
  timeBlocks: ScheduleableBlock[],
  sortOrder = 0
): Routine {
  return {
    id,
    name: `Routine ${id}`,
    associatedFocusId: null,
    frequencyNote: null,
    sortOrder,
    archived: false,
    createdAt: '2026-05-22T09:00:00-07:00',
    updatedAt: '2026-05-22T09:00:00-07:00',
    timeBlocks,
  };
}

function states(map: Record<number, RoutineCompletionState>) {
  return map;
}

// ─── groupRoutinesForDashboard ───────────────────────────────────────────────

describe('groupRoutinesForDashboard', () => {
  test('a due Routine whose first block is the current block is due now', () => {
    const r = makeRoutine(1, ['Morning', 'Afternoon']);
    const result = groupRoutinesForDashboard([r], states({ 1: 'due' }), 'Morning');
    expect(result.dueNow).toEqual([r]);
    expect(result.later).toEqual([]);
    expect(result.completed).toEqual([]);
  });

  test('completed_this_block groups as completed', () => {
    const r = makeRoutine(1, ['Morning', 'Afternoon']);
    const result = groupRoutinesForDashboard(
      [r],
      states({ 1: 'completed_this_block' }),
      'Morning'
    );
    expect(result.completed).toEqual([r]);
    expect(result.dueNow).toEqual([]);
  });

  test('fully_done groups as completed', () => {
    const r = makeRoutine(1, ['Morning', 'Afternoon']);
    const result = groupRoutinesForDashboard([r], states({ 1: 'fully_done' }), 'Afternoon');
    expect(result.completed).toEqual([r]);
    expect(result.dueNow).toEqual([]);
  });

  test('a still-due Routine whose blocks have all passed stays due now, never "missed"', () => {
    const r = makeRoutine(1, ['Morning', 'Afternoon']);
    const result = groupRoutinesForDashboard([r], states({ 1: 'due' }), 'Evening');
    expect(result.dueNow).toEqual([r]);
    expect(result.later).toEqual([]);
  });

  test('a due Routine whose only block is still in the future is later', () => {
    const r = makeRoutine(1, ['Afternoon']);
    const result = groupRoutinesForDashboard([r], states({ 1: 'due' }), 'Morning');
    expect(result.later).toEqual([r]);
    expect(result.dueNow).toEqual([]);
  });

  test('a Routine with no configured blocks is due now in any block', () => {
    const r = makeRoutine(1, []);
    for (const block of ['Morning', 'Midday', 'Afternoon', 'Evening', 'Night'] as const) {
      const result = groupRoutinesForDashboard([r], states({ 1: 'due' }), block);
      expect(result.dueNow).toEqual([r]);
    }
  });

  test('at Night every configured block reads as started, so a due Routine is due now', () => {
    const r = makeRoutine(1, ['Morning']);
    const result = groupRoutinesForDashboard([r], states({ 1: 'due' }), 'Night');
    expect(result.dueNow).toEqual([r]);
  });

  test('a Routine missing from the states map falls to later, never invents "due"', () => {
    const r = makeRoutine(1, ['Morning']);
    const result = groupRoutinesForDashboard([r], states({}), 'Morning');
    expect(result.later).toEqual([r]);
    expect(result.dueNow).toEqual([]);
  });

  test('preserves incoming sort_order sequence within a group', () => {
    const a = makeRoutine(10, ['Morning'], 0);
    const b = makeRoutine(11, ['Morning'], 1);
    const c = makeRoutine(12, ['Morning'], 2);
    const result = groupRoutinesForDashboard(
      [a, b, c],
      states({ 10: 'due', 11: 'due', 12: 'due' }),
      'Morning'
    );
    expect(result.dueNow.map((r) => r.id)).toEqual([10, 11, 12]);
  });

  test('splits a mixed list across all three groups', () => {
    const due = makeRoutine(1, ['Morning'], 0);
    const later = makeRoutine(2, ['Evening'], 1);
    const done = makeRoutine(3, ['Morning'], 2);
    const result = groupRoutinesForDashboard(
      [due, later, done],
      states({ 1: 'due', 2: 'due', 3: 'fully_done' }),
      'Morning'
    );
    expect(result.dueNow.map((r) => r.id)).toEqual([1]);
    expect(result.later.map((r) => r.id)).toEqual([2]);
    expect(result.completed.map((r) => r.id)).toEqual([3]);
  });
});

// ─── formatTimeBlocks ────────────────────────────────────────────────────────

describe('formatTimeBlocks', () => {
  test('renders "Anytime" when no blocks are configured', () => {
    expect(formatTimeBlocks([])).toBe('Anytime');
  });

  test('renders a single block', () => {
    expect(formatTimeBlocks(['Morning'])).toBe('Morning');
  });

  test('renders blocks in canonical order regardless of input order', () => {
    expect(formatTimeBlocks(['Afternoon', 'Morning'])).toBe('Morning · Afternoon');
  });

  test('renders all four blocks in canonical order', () => {
    expect(formatTimeBlocks(['Evening', 'Midday', 'Morning', 'Afternoon'])).toBe(
      'Morning · Midday · Afternoon · Evening'
    );
  });
});

// ─── formatRoutineProgress ───────────────────────────────────────────────────

function progress(
  completionCount: number,
  completedBlocks: ScheduleableBlock[] = []
): RoutineDayProgress {
  return { completionCount, completedBlocks };
}

describe('formatRoutineProgress', () => {
  test('renders nothing when there are no completions today', () => {
    expect(formatRoutineProgress(progress(0), ['Morning', 'Afternoon'])).toBeNull();
    expect(formatRoutineProgress(progress(0), [])).toBeNull();
  });

  test('renders count of configured blocks plus the blocks already done', () => {
    expect(
      formatRoutineProgress(progress(1, ['Morning']), ['Morning', 'Afternoon'])
    ).toBe('1 of 2 · Morning done');
  });

  test('lists multiple completed blocks', () => {
    expect(
      formatRoutineProgress(progress(2, ['Morning', 'Midday']), [
        'Morning',
        'Midday',
        'Afternoon',
      ])
    ).toBe('2 of 3 · Morning, Midday done');
  });

  test('omits the blocks clause when no scheduleable block was completed', () => {
    expect(formatRoutineProgress(progress(1, []), ['Morning', 'Afternoon'])).toBe('1 of 2');
  });

  test('reports the true count even when it exceeds the configured block count', () => {
    // Deliberately unclamped: a Routine completed three times against two
    // configured blocks reads "3 of 2". Truth beats a tidy-looking cap.
    expect(
      formatRoutineProgress(progress(3, ['Morning', 'Afternoon']), ['Morning', 'Afternoon'])
    ).toBe('3 of 2 · Morning, Afternoon done');
  });

  test('renders "Once today" for a single completion of an unscheduled Routine', () => {
    expect(formatRoutineProgress(progress(1, ['Morning']), [])).toBe('Once today');
  });

  test('renders "N times today" for repeat completions of an unscheduled Routine', () => {
    expect(formatRoutineProgress(progress(3, ['Morning']), [])).toBe('3 times today');
  });
});

// ─── disclosureLabel ─────────────────────────────────────────────────────────

describe('disclosureLabel', () => {
  test('returns null when there is nothing to disclose', () => {
    expect(disclosureLabel(0, 0)).toBeNull();
  });

  test('names both groups when both are populated', () => {
    expect(disclosureLabel(2, 1)).toBe('Completed · Later');
  });

  test('names only the completed group', () => {
    expect(disclosureLabel(2, 0)).toBe('Completed');
  });

  test('names only the later group', () => {
    expect(disclosureLabel(0, 1)).toBe('Later');
  });
});

// ─── voice guard ─────────────────────────────────────────────────────────────

describe('voice', () => {
  test('no formatter output uses judgemental or urgency language', () => {
    const outputs = [
      formatTimeBlocks([]),
      formatTimeBlocks(['Morning', 'Evening']),
      formatRoutineProgress(progress(1, ['Morning']), ['Morning', 'Afternoon']),
      formatRoutineProgress(progress(3, ['Morning', 'Afternoon']), ['Morning', 'Afternoon']),
      formatRoutineProgress(progress(1, []), []),
      formatRoutineProgress(progress(3, []), []),
      disclosureLabel(1, 1),
      disclosureLabel(1, 0),
      disclosureLabel(0, 1),
    ].filter((s): s is string => s !== null);

    for (const output of outputs) {
      expect(output).not.toMatch(/overdue|missed|skipped|behind|streak/i);
    }
  });
});
