import { renderHook, waitFor } from '@testing-library/react-native';
import { useRoutines } from '../useRoutines';
import type { Routine } from '@/lib/db/query-types';
import { getDb } from '@/lib/db/database';
import { getRoutines } from '@/lib/db/queries';

// useFocusEffect runs the callback immediately — sufficient for unit tests.
jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => () => void) => {
    cb();
  },
}));

jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn(),
}));

jest.mock('@/lib/db/queries', () => ({
  getRoutines: jest.fn(),
}));

const mockGetDb = jest.mocked(getDb);
const mockGetRoutines = jest.mocked(getRoutines);

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
    frequencyNote: 'Before bed',
    sortOrder: 1,
    archived: false,
    createdAt: '2026-05-22T10:00:00-07:00',
    updatedAt: '2026-05-22T10:00:00-07:00',
    timeBlocks: ['Evening'],
  },
];

const MOCK_DB = {};

describe('useRoutines', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(MOCK_DB as never);
    mockGetRoutines.mockResolvedValue(FIXTURE_ROUTINES);
  });

  it('starts with loading=true and routines=[]', () => {
    mockGetDb.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useRoutines());
    expect(result.current.loading).toBe(true);
    expect(result.current.routines).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('returns routines after db resolves', async () => {
    const { result } = renderHook(() => useRoutines());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.routines).toEqual(FIXTURE_ROUTINES);
    expect(result.current.error).toBeNull();
  });

  it('sets error and loading=false on db failure', async () => {
    const err = new Error('db failed');
    mockGetDb.mockRejectedValue(err);
    const { result } = renderHook(() => useRoutines());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(err);
    expect(result.current.routines).toEqual([]);
  });
});
