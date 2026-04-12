import { renderHook, waitFor } from '@testing-library/react-native';
import { useFocuses } from '../useFocuses';
import type { Focus } from '@/lib/db/query-types';
import { getDb } from '@/lib/db/database';
import { getFocuses } from '@/lib/db/queries';

// useFocusEffect runs the callback immediately and returns the cleanup —
// this is sufficient for unit tests where we don't need real navigation.
jest.mock('expo-router', () => ({
  useFocusEffect: (cb: () => () => void) => {
    // Run in useEffect-equivalent: call synchronously in test environment
    cb();
  },
}));

jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn(),
}));

jest.mock('@/lib/db/queries', () => ({
  getFocuses: jest.fn(),
}));

const mockGetDb = jest.mocked(getDb);
const mockGetFocuses = jest.mocked(getFocuses);

const FIXTURE_FOCUSES: Focus[] = [
  {
    id: 1,
    name: 'Gut health',
    description: null,
    archived: false,
    sortOrder: 0,
    createdAt: '2026-04-10T09:00:00-07:00',
  },
  {
    id: 2,
    name: 'Sleep quality',
    description: 'Track what affects sleep',
    archived: false,
    sortOrder: 1,
    createdAt: '2026-04-10T10:00:00-07:00',
  },
];

const MOCK_DB = {};

describe('useFocuses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(MOCK_DB as never);
    mockGetFocuses.mockResolvedValue(FIXTURE_FOCUSES);
  });

  it('starts with loading=true and focuses=[]', () => {
    mockGetDb.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useFocuses());
    expect(result.current.loading).toBe(true);
    expect(result.current.focuses).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('returns focuses after db resolves', async () => {
    const { result } = renderHook(() => useFocuses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.focuses).toEqual(FIXTURE_FOCUSES);
    expect(result.current.error).toBeNull();
  });

  it('sets error and loading=false on db failure', async () => {
    const err = new Error('db failed');
    mockGetDb.mockRejectedValue(err);
    const { result } = renderHook(() => useFocuses());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(err);
    expect(result.current.focuses).toEqual([]);
  });
});
