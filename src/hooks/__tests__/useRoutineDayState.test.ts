import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useRoutineDayState } from '../useRoutineDayState';
import type { Routine } from '@/lib/db/query-types';
import type { ScheduleableBlock } from '@/lib/utils/timestamp';
import { getDb } from '@/lib/db/database';
import { getRoutineDayProgress } from '@/lib/db/queries';

// Captures the hook's focus callback so a test can fire a second focus. The
// mount render fires it once, mirroring real navigation focus.
let mockFocusCallback: (() => void) | null = null;
jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => void) => {
    mockFocusCallback = cb;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const react = require('react');
    react.useEffect(cb, [cb]);
  },
}));

jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn(),
}));

jest.mock('@/lib/db/queries', () => ({
  getRoutineDayProgress: jest.fn(),
}));

const mockGetDb = jest.mocked(getDb);
const mockGetProgress = jest.mocked(getRoutineDayProgress);

const MOCK_DB = {};

function makeRoutine(id: number, timeBlocks: ScheduleableBlock[]): Routine {
  return {
    id,
    name: `Routine ${id}`,
    associatedFocusId: null,
    frequencyNote: null,
    sortOrder: id,
    archived: false,
    createdAt: '2026-05-22T09:00:00-07:00',
    updatedAt: '2026-05-22T09:00:00-07:00',
    timeBlocks,
  };
}

const FIXTURE_ROUTINES = [makeRoutine(1, ['Morning']), makeRoutine(2, ['Evening'])];

const TODAY = '2026-05-22';

describe('useRoutineDayState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // clearAllMocks does not touch module-level state, and a callback left over
    // from a previous test closes over an unmounted hook.
    mockFocusCallback = null;
    mockGetDb.mockResolvedValue(MOCK_DB as never);
    mockGetProgress.mockResolvedValue({});
  });

  // The empty-routines short-circuit and the query-rejection path belong to
  // useRoutineDayProgress and are pinned in its own suite. Tested here too they
  // would give one contract two owners, so what follows is only what this hook
  // adds: the derivation, and its independence from the read.

  it('derives both halves from a single batched read', async () => {
    mockGetProgress.mockResolvedValue({
      1: { completionCount: 1, completedBlocks: ['Morning'] },
      2: { completionCount: 0, completedBlocks: [] },
    });

    const { result } = renderHook(() =>
      useRoutineDayState(FIXTURE_ROUTINES, 'Morning', TODAY)
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Routine 1: one completion against one configured block → fully_done.
    // Routine 2: nothing today → due.
    expect(result.current.states).toEqual({ 1: 'fully_done', 2: 'due' });
    expect(result.current.progress).toEqual({
      1: { completionCount: 1, completedBlocks: ['Morning'] },
      2: { completionCount: 0, completedBlocks: [] },
    });
    expect(result.current.error).toBeNull();
  });

  it('re-derives without a second read when the current block changes', async () => {
    // The reason for the refactor: completion state is a pure function of
    // progress, so moving between blocks costs nothing. getRoutineDayProgress
    // depends on the date alone.
    mockGetProgress.mockResolvedValue({
      1: { completionCount: 1, completedBlocks: ['Morning'] },
    });

    const { result, rerender } = renderHook(
      ({ block }: { block: ScheduleableBlock }) =>
        useRoutineDayState([makeRoutine(1, ['Morning', 'Evening'])], block, TODAY),
      { initialProps: { block: 'Morning' as ScheduleableBlock } }
    );

    await waitFor(() => expect(result.current.states[1]).toBe('completed_this_block'));
    const callsBefore = mockGetProgress.mock.calls.length;

    rerender({ block: 'Midday' });

    await waitFor(() => expect(result.current.states[1]).toBe('due'));
    expect(mockGetProgress.mock.calls.length).toBe(callsBefore);
  });

  it('re-reads on screen focus even though the routine ids are identical', async () => {
    // Guards the staleness trap: after completing a Routine and navigating
    // back, the routine ids, block, and today string are all unchanged, so
    // without the focus refresh the completed card would still read as due.
    mockGetProgress.mockResolvedValue({
      1: { completionCount: 0, completedBlocks: [] },
    });

    const { result } = renderHook(() =>
      useRoutineDayState([FIXTURE_ROUTINES[0]], 'Morning', TODAY)
    );

    await waitFor(() => expect(result.current.states[1]).toBe('due'));
    const callsBefore = mockGetProgress.mock.calls.length;

    mockGetProgress.mockResolvedValue({
      1: { completionCount: 1, completedBlocks: ['Morning'] },
    });
    act(() => mockFocusCallback?.());

    await waitFor(() =>
      expect(mockGetProgress.mock.calls.length).toBeGreaterThan(callsBefore)
    );
    await waitFor(() => expect(result.current.states[1]).toBe('fully_done'));
  });
});
