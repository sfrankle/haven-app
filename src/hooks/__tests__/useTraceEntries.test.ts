import { renderHook, waitFor } from '@testing-library/react-native';
import { useTraceEntries } from '../useTraceEntries';
import { getDb } from '@/lib/db/database';
import { getEntriesForTrace, getRoutineCompletions } from '@/lib/db/queries';
import type { EntryWithLabels, RoutineCompletionGroup } from '@/lib/db/query-types';

// Mirror the real useFocusEffect closely enough to be meaningful: it re-runs
// when the callback *identity* changes. A mock that calls cb() on every render
// would hide dependency-array bugs — the exact class of bug the focusKey guard
// exists to prevent.
jest.mock('expo-router', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useEffect } = require('react');
  return {
    useFocusEffect: (cb: () => (() => void) | void) => useEffect(cb, [cb]),
  };
});

jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn(),
}));

jest.mock('@/lib/db/queries', () => ({
  getEntriesForTrace: jest.fn(),
  getRoutineCompletions: jest.fn(),
}));

const mockGetDb = jest.mocked(getDb);
const mockGetEntriesForTrace = jest.mocked(getEntriesForTrace);
const mockGetRoutineCompletions = jest.mocked(getRoutineCompletions);

function makeEntry(overrides: Partial<EntryWithLabels> = {}): EntryWithLabels {
  return {
    id: 1,
    entryTypeId: 2,
    entryTypeName: 'Food',
    entryTypeTitle: 'Food',
    entryTypeIcon: null,
    sourceType: 'log',
    timestamp: '2026-04-14T10:00:00-07:00',
    localDate: '2026-04-14',
    numericValue: null,
    notes: null,
    labels: [],
    routineCompletionId: null,
    ...overrides,
  };
}

const FIXTURE_ENTRIES: EntryWithLabels[] = [makeEntry()];

const MOCK_DB = {};

describe('useTraceEntries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(MOCK_DB as never);
    mockGetEntriesForTrace.mockResolvedValue(FIXTURE_ENTRIES);
    mockGetRoutineCompletions.mockResolvedValue([]);
  });

  it('starts with loading=true and sections=[]', () => {
    mockGetDb.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useTraceEntries([]));
    expect(result.current.loading).toBe(true);
    expect(result.current.sections).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('returns sections after db resolves', async () => {
    const { result } = renderHook(() => useTraceEntries([]));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sections).toHaveLength(1);
    const item = result.current.sections[0].data[0];
    expect(item.kind).toBe('entry');
    expect(item.kind === 'entry' && item.entry.id).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('passes an empty focusIds list through when no filter is active', async () => {
    const { result } = renderHook(() => useTraceEntries([]));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetEntriesForTrace).toHaveBeenCalledWith(MOCK_DB, { focusIds: [] });
  });

  it('passes focusIds to getEntriesForTrace', async () => {
    const { result } = renderHook(() => useTraceEntries([3, 5]));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetEntriesForTrace).toHaveBeenCalledWith(MOCK_DB, { focusIds: [3, 5] });
  });

  it('reloads when re-rendered with different focusIds', async () => {
    const { rerender } = renderHook(({ ids }: { ids: number[] }) => useTraceEntries(ids), {
      initialProps: { ids: [] as number[] },
    });
    await waitFor(() => expect(mockGetEntriesForTrace).toHaveBeenCalledWith(MOCK_DB, { focusIds: [] }));

    rerender({ ids: [7] });
    await waitFor(() => expect(mockGetEntriesForTrace).toHaveBeenCalledWith(MOCK_DB, { focusIds: [7] }));
  });

  it('does not reload when re-rendered with a new array of the same contents', async () => {
    // Guards the dep-array hazard: an array literal is a fresh identity every
    // render, which would refire the effect in a loop on device.
    const { rerender } = renderHook(({ ids }: { ids: number[] }) => useTraceEntries(ids), {
      initialProps: { ids: [3, 5] },
    });
    await waitFor(() => expect(mockGetEntriesForTrace).toHaveBeenCalledTimes(1));

    rerender({ ids: [3, 5] });
    rerender({ ids: [5, 3] });

    await waitFor(() => expect(mockGetEntriesForTrace).toHaveBeenCalledTimes(1));
  });

  it('does not call getRoutineCompletions when no entry has a completion id', async () => {
    const { result } = renderHook(() => useTraceEntries([]));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetRoutineCompletions).not.toHaveBeenCalled();
  });

  it('calls getRoutineCompletions with the deduped completion ids', async () => {
    mockGetEntriesForTrace.mockResolvedValue([
      makeEntry({ id: 1, routineCompletionId: 4 }),
      makeEntry({ id: 2, routineCompletionId: 4 }),
      makeEntry({ id: 3, routineCompletionId: 9 }),
      makeEntry({ id: 4, routineCompletionId: null }),
    ]);

    const { result } = renderHook(() => useTraceEntries([]));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mockGetRoutineCompletions).toHaveBeenCalledWith(MOCK_DB, [4, 9]);
  });

  it('groups entries into a group item when getRoutineCompletions resolves', async () => {
    const members = [
      makeEntry({ id: 1, routineCompletionId: 4 }),
      makeEntry({ id: 2, routineCompletionId: 4 }),
    ];
    const group: RoutineCompletionGroup = {
      completionId: 4,
      routineId: 1,
      routineName: 'Morning Flow',
      completedAt: '2026-04-14T08:12:00-07:00',
      localDate: '2026-04-14',
      entries: members,
    };
    mockGetEntriesForTrace.mockResolvedValue(members);
    mockGetRoutineCompletions.mockResolvedValue([group]);

    const { result } = renderHook(() => useTraceEntries([]));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const data = result.current.sections[0].data;
    expect(data).toHaveLength(1);
    expect(data[0].kind).toBe('group');
  });

  it('degrades to an ungrouped list when getRoutineCompletions rejects', async () => {
    // The most important test in this file: enrichment failure must never blank
    // the user's history behind an error screen.
    mockGetEntriesForTrace.mockResolvedValue([
      makeEntry({ id: 1, routineCompletionId: 4 }),
      makeEntry({ id: 2, routineCompletionId: 4 }),
    ]);
    mockGetRoutineCompletions.mockRejectedValue(new Error('enrichment blew up'));

    const { result } = renderHook(() => useTraceEntries([]));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    const data = result.current.sections[0].data;
    expect(data).toHaveLength(2);
    expect(data.every((i) => i.kind === 'entry')).toBe(true);
  });

  it('sets error and loading=false on db failure', async () => {
    const err = new Error('db failed');
    mockGetDb.mockRejectedValue(err);
    const { result } = renderHook(() => useTraceEntries([]));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(err);
    expect(result.current.sections).toEqual([]);
  });

  it('sets error when getEntriesForTrace rejects', async () => {
    const err = new Error('trace read failed');
    mockGetEntriesForTrace.mockRejectedValue(err);
    const { result } = renderHook(() => useTraceEntries([]));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(err);
    expect(result.current.sections).toEqual([]);
  });

  it('does not set state after unmount between the two queries', async () => {
    let releaseCompletions: (groups: RoutineCompletionGroup[]) => void = () => {};
    mockGetEntriesForTrace.mockResolvedValue([makeEntry({ id: 1, routineCompletionId: 4 })]);
    mockGetRoutineCompletions.mockReturnValue(
      new Promise((resolve) => {
        releaseCompletions = resolve;
      })
    );

    const { result, unmount } = renderHook(() => useTraceEntries([]));
    await waitFor(() => expect(mockGetRoutineCompletions).toHaveBeenCalled());
    unmount();
    releaseCompletions([]);

    await waitFor(() => expect(result.current.sections).toEqual([]));
    expect(result.current.loading).toBe(true);
  });
});
