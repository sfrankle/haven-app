import { renderHook, waitFor } from '@testing-library/react-native';
import { useRoutineDayProgress } from '../useRoutineDayProgress';
import type { Routine } from '@/lib/db/query-types';
import { getDb } from '@/lib/db/database';
import { getRoutineDayProgress } from '@/lib/db/queries';

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

  it('calls the batched query exactly once with every routine id', async () => {
    const { result } = renderHook(() => useRoutineDayProgress(FIXTURE_ROUTINES, TODAY));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetProgress).toHaveBeenCalledTimes(1);
    expect(mockGetProgress).toHaveBeenCalledWith(expect.anything(), [1, 2], TODAY);
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

  it('re-runs when refreshKey changes even though the routine ids are identical', async () => {
    const { result, rerender } = renderHook(
      ({ key }: { key: number }) => useRoutineDayProgress(FIXTURE_ROUTINES, TODAY, key),
      { initialProps: { key: 0 } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetProgress).toHaveBeenCalledTimes(1);

    rerender({ key: 1 });

    await waitFor(() => expect(mockGetProgress).toHaveBeenCalledTimes(2));
  });
});
