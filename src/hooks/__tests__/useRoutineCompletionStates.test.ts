import { renderHook, waitFor, act } from '@testing-library/react-native';
import { useRoutineCompletionStates } from '../useRoutineCompletionStates';
import type { Routine } from '@/lib/db/query-types';
import type { ScheduleableBlock } from '@/lib/utils/timestamp';
import { getDb } from '@/lib/db/database';
import { getRoutineCompletionState } from '@/lib/db/queries';

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
  getRoutineCompletionState: jest.fn(),
}));

const mockGetDb = jest.mocked(getDb);
const mockGetCompletionState = jest.mocked(getRoutineCompletionState);

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

describe('useRoutineCompletionStates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(MOCK_DB as never);
  });

  it('returns empty states map and loading=false when routines is []', async () => {
    const { result } = renderHook(() =>
      useRoutineCompletionStates([], 'Morning', TODAY)
    );
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.states).toEqual({});
    expect(result.current.error).toBeNull();
  });

  it('returns correct state map when all routines resolve', async () => {
    mockGetCompletionState.mockImplementation(async (_db, routineId) => {
      if (routineId === 1) return 'completed_this_block';
      return 'due';
    });

    const { result } = renderHook(() =>
      useRoutineCompletionStates(FIXTURE_ROUTINES, 'Morning', TODAY)
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.states).toEqual({
      1: 'completed_this_block',
      2: 'due',
    });
    expect(result.current.error).toBeNull();
  });

  it('sets error and loading=false on DB failure', async () => {
    const err = new Error('db failed');
    mockGetDb.mockRejectedValue(err);

    const { result } = renderHook(() =>
      useRoutineCompletionStates(FIXTURE_ROUTINES, 'Morning', TODAY)
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(err);
    expect(result.current.states).toEqual({});
  });

  it('re-fetches when currentTimeBlock changes', async () => {
    mockGetCompletionState.mockResolvedValue('due');

    const { result, rerender } = renderHook(
      ({ block }: { block: ScheduleableBlock }) =>
        useRoutineCompletionStates(FIXTURE_ROUTINES, block, TODAY),
      { initialProps: { block: 'Morning' as ScheduleableBlock } }
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetCompletionState).toHaveBeenCalledWith(
      expect.anything(),
      expect.any(Number),
      'Morning',
      TODAY
    );

    const callCountAfterFirst = mockGetCompletionState.mock.calls.length;

    // Change the time block — should trigger a re-fetch
    rerender({ block: 'Evening' });

    await waitFor(() =>
      expect(mockGetCompletionState).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Number),
        'Evening',
        TODAY
      )
    );

    expect(mockGetCompletionState.mock.calls.length).toBeGreaterThan(callCountAfterFirst);
  });

  it('re-fetches on screen focus even though the routine ids are identical', async () => {
    // Guards the staleness trap: after completing a Routine and navigating
    // back, the routine IDs, time block, and today string are all unchanged,
    // so without the focus refresh the completed card would still read as due.
    mockGetCompletionState.mockResolvedValue('due');

    const { result } = renderHook(() =>
      useRoutineCompletionStates(FIXTURE_ROUTINES, 'Morning', TODAY)
    );

    await waitFor(() => expect(result.current.loading).toBe(false));
    const callsAfterFirst = mockGetCompletionState.mock.calls.length;

    mockGetCompletionState.mockResolvedValue('fully_done');
    act(() => mockFocusCallback?.());

    await waitFor(() =>
      expect(mockGetCompletionState.mock.calls.length).toBeGreaterThan(callsAfterFirst)
    );
    await waitFor(() => expect(result.current.states[1]).toBe('fully_done'));
  });
});
