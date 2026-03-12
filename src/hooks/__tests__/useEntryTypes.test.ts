import { renderHook, waitFor } from '@testing-library/react-native';
import { useEntryTypes } from '../useEntryTypes';
import type { EntryType } from '@/lib/db/query-types';
import { getDb } from '@/lib/db/database';
import { getEntryTypes } from '@/lib/db/queries';

// Mock the database module so no actual SQLite is needed.
jest.mock('@/lib/db/database', () => ({
  getDb: jest.fn(),
}));

// Mock the queries module.
jest.mock('@/lib/db/queries', () => ({
  getEntryTypes: jest.fn(),
}));

const mockGetDb = jest.mocked(getDb);
const mockGetEntryTypes = jest.mocked(getEntryTypes);

const FIXTURE_ENTRY_TYPES: EntryType[] = [
  { id: 1, name: 'Food', title: 'Nourish', icon: 'apple-alt', prompt: 'What did you eat?', measurementType: 'label_select' },
  { id: 2, name: 'Hydration', title: 'Replenish', icon: 'tint', prompt: 'How much did you drink?', measurementType: 'numeric' },
];

const MOCK_DB = {};

describe('useEntryTypes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(MOCK_DB as never);
    mockGetEntryTypes.mockResolvedValue(FIXTURE_ENTRY_TYPES);
  });

  it('starts with loading=true and empty entryTypes', () => {
    // Delay resolution so we can observe the initial state.
    mockGetDb.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useEntryTypes());
    expect(result.current.loading).toBe(true);
    expect(result.current.entryTypes).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('returns entry types after db resolves', async () => {
    const { result } = renderHook(() => useEntryTypes());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.entryTypes).toEqual(FIXTURE_ENTRY_TYPES);
    expect(result.current.error).toBeNull();
  });

  it('propagates errors and sets loading=false', async () => {
    const err = new Error('db failed');
    mockGetDb.mockRejectedValue(err);
    const { result } = renderHook(() => useEntryTypes());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe(err);
    expect(result.current.entryTypes).toEqual([]);
  });
});
