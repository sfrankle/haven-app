import { getTypedDb } from '../typed-db';
import { getDb } from '../database';

jest.mock('../database', () => ({
  getDb: jest.fn(),
}));

const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;

describe('getTypedDb', () => {
  beforeEach(() => {
    mockGetDb.mockReset();
  });

  it('returns the same handle getDb resolves (transparent delegation)', async () => {
    const sentinel = { getAllAsync: jest.fn() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetDb.mockResolvedValue(sentinel as any);

    const db = await getTypedDb();

    expect(db).toBe(sentinel);
    expect(mockGetDb).toHaveBeenCalledTimes(1);
  });

  it('propagates rejection from getDb', async () => {
    const err = new Error('open failed');
    mockGetDb.mockRejectedValue(err);

    await expect(getTypedDb()).rejects.toThrow('open failed');
  });
});
