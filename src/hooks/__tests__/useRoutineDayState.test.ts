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

const FIXTURE_ROUTINES: Routine[] = [
  {
    id: 1,
    name: 'Morning Reset',
    associatedFocusId: null,
    frequencyNote: null,
    sortOrder: 0,
    archived: false,
    createdAt: '2026-05-22T09:00:00-07:00',
    updatedAt: '2026-05-22T09:00:00-07:00',
    timeBlocks: ['Morning'],
  },
  {
    id: 2,
    name: 'Evening Wind-Down',
    associatedFocusId: null,
    frequencyNote: null,
    sortOrder: 1,
    archived: false,
    createdAt: '2026-05-22T09:00:00-07:00',
    updatedAt: '2026-05-22T09:00:00-07:00',
    timeBlocks: ['Evening'],
  },
];

const TODAY = '2026-05-22';

describe('useRoutineDayState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(MOCK_DB as never);
    mockGetProgress.mockResolvedValue({});
  });

  it('returns empty maps and loading=false when routines is []', async () => {
    const { result } = renderHook(() => useRoutineDayState([], 'Morning', TODAY));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.states).toEqual({});
    expect(result.current.progress).toEqual({});
    expect(result.current.error).toBeNull();
    expect(mockGetProgress).not.toHaveBeenCalled();
  });

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

  it('sets error and leaves both maps empty when the read fails', async () => {
    const err = new Error('db failed');
    mockGetProgress.mockRejectedValue(err);

    const { result } = renderHook(() =>
      useRoutineDayState(FIXTURE_ROUTINES, 'Morning', TODAY)
    );
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe(err);
    expect(result.current.states).toEqual({});
    expect(result.current.progress).toEqual({});
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
        useRoutineDayState([{ ...FIXTURE_ROUTINES[0], timeBlocks: ['Morning', 'Evening'] }], block, TODAY),
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
