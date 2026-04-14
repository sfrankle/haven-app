import { renderHook, waitFor } from '@testing-library/react-native';
import { useTraceEntries } from '../useTraceEntries';
import { getDb } from '@/lib/db/database';
import { getEntriesForTrace } from '@/lib/db/queries';
import type { EntryWithLabels } from '@/lib/db/query-types';

jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => () => void) => {
    cb();
  },
}));

jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn(),
}));

jest.mock('@/lib/db/queries', () => ({
  getEntriesForTrace: jest.fn(),
}));

const mockGetDb = jest.mocked(getDb);
const mockGetEntriesForTrace = jest.mocked(getEntriesForTrace);

const FIXTURE_ENTRIES: EntryWithLabels[] = [
  {
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
  },
];

const MOCK_DB = {};

describe('useTraceEntries', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(MOCK_DB as never);
    mockGetEntriesForTrace.mockResolvedValue(FIXTURE_ENTRIES);
  });

  it('starts with loading=true and sections=[]', () => {
    mockGetDb.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useTraceEntries());
    expect(result.current.loading).toBe(true);
    expect(result.current.sections).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('returns sections after db resolves', async () => {
    const { result } = renderHook(() => useTraceEntries());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.sections).toHaveLength(1);
    expect(result.current.sections[0].data[0].id).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('calls getEntriesForTrace with no focusId when none provided', async () => {
    const { result } = renderHook(() => useTraceEntries());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetEntriesForTrace).toHaveBeenCalledWith(MOCK_DB, { focusId: undefined });
  });

  it('passes focusId to getEntriesForTrace', async () => {
    const { result } = renderHook(() => useTraceEntries(3));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetEntriesForTrace).toHaveBeenCalledWith(MOCK_DB, { focusId: 3 });
  });

  it('re-fetches when focusId changes', async () => {
    // Render with focusId=5 directly — the hook must pass that value through
    const { result } = renderHook(() => useTraceEntries(5));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(mockGetEntriesForTrace).toHaveBeenCalledWith(MOCK_DB, { focusId: 5 });
  });

  it('sets error and loading=false on db failure', async () => {
    const err = new Error('db failed');
    mockGetDb.mockRejectedValue(err);
    const { result } = renderHook(() => useTraceEntries());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(err);
    expect(result.current.sections).toEqual([]);
  });
});
