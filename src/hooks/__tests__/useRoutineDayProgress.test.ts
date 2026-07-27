import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useRoutineDayProgress } from '../useRoutineDayProgress';
import type { Routine } from '@/lib/db/query-types';
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

function makeRoutine(id: number): Routine {
  return {
    id,
    name: `Routine ${id}`,
    associatedFocusId: null,
    frequencyNote: null,
    sortOrder: id,
    archived: false,
    createdAt: '2026-05-22T09:00:00-07:00',
    updatedAt: '2026-05-22T09:00:00-07:00',
    timeBlocks: ['Morning'],
  };
}

const FIXTURE_ROUTINES = [makeRoutine(1), makeRoutine(2)];
const TODAY = '2026-05-22';

describe('useRoutineDayProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(MOCK_DB as never);
    mockGetProgress.mockResolvedValue({});
  });

  it('short-circuits without querying when routines is empty', async () => {
    const { result } = renderHook(() => useRoutineDayProgress([], TODAY));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.progress).toEqual({});
    expect(result.current.error).toBeNull();
    expect(mockGetProgress).not.toHaveBeenCalled();
  });

  it('calls the batched query with every routine id in one call', async () => {
    const { result } = renderHook(() => useRoutineDayProgress(FIXTURE_ROUTINES, TODAY));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // One call per trigger, never one per routine — the point of batching.
    expect(mockGetProgress).toHaveBeenCalledWith(expect.anything(), [1, 2], TODAY);
    for (const call of mockGetProgress.mock.calls) {
      expect(call[1]).toEqual([1, 2]);
    }
  });

  it('exposes the returned progress map', async () => {
    mockGetProgress.mockResolvedValue({
      1: { completionCount: 1, completedBlocks: ['Morning'] },
      2: { completionCount: 0, completedBlocks: [] },
    });

    const { result } = renderHook(() => useRoutineDayProgress(FIXTURE_ROUTINES, TODAY));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.progress).toEqual({
      1: { completionCount: 1, completedBlocks: ['Morning'] },
      2: { completionCount: 0, completedBlocks: [] },
    });
    expect(result.current.error).toBeNull();
  });

  it('sets error and leaves progress empty when the query rejects', async () => {
    const err = new Error('db failed');
    mockGetProgress.mockRejectedValue(err);

    const { result } = renderHook(() => useRoutineDayProgress(FIXTURE_ROUTINES, TODAY));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe(err);
    expect(result.current.progress).toEqual({});
  });

  it('re-runs on screen focus even though the routine ids are identical', async () => {
    // Guards the staleness trap: after completing a Routine and navigating
    // back, the routine ids and today string are unchanged, so nothing in the
    // dep array moves. Without the focus refresh the card would stay stale.
    const { result } = renderHook(() => useRoutineDayProgress(FIXTURE_ROUTINES, TODAY));

    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsBefore = mockGetProgress.mock.calls.length;

    act(() => mockFocusCallback?.());

    await waitFor(() =>
      expect(mockGetProgress.mock.calls.length).toBeGreaterThan(callsBefore)
    );
  });
});
