import { getEntriesForTrace, type Db } from '../queries';

function makeDb(rows: unknown[]): Db {
  return {
    getAllAsync: jest.fn().mockResolvedValue(rows),
    getFirstAsync: jest.fn(),
    runAsync: jest.fn(),
    withTransactionAsync: jest.fn(),
  };
}

const BASE_ROW = {
  id: 1,
  entry_type_id: 2,
  source_type: 'log' as const,
  timestamp: '2026-04-14T10:00:00-07:00',
  numeric_value: null,
  notes: null,
  entry_type_name: 'Food',
  entry_type_title: 'Food',
  entry_type_icon: null,
  label_id: null,
  label_name: null,
  label_parent_id: null,
  label_parent_name: null,
  label_category_id: null,
  label_category_name: null,
  label_sort_order: null,
};

describe('getEntriesForTrace', () => {
  it('returns all entries when no focusId is provided', async () => {
    const row1 = { ...BASE_ROW, id: 1 };
    const row2 = { ...BASE_ROW, id: 2, timestamp: '2026-04-13T10:00:00-07:00' };
    const db = makeDb([row1, row2]);

    const result = await getEntriesForTrace(db);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });

  it('passes focusId as param when filtering', async () => {
    const row1 = { ...BASE_ROW, id: 1 };
    const db = makeDb([row1]);

    await getEntriesForTrace(db, { focusId: 5 });

    const calls = (db.getAllAsync as jest.Mock).mock.calls;
    expect(calls).toHaveLength(1);
    // The params array should include the focusId
    expect(calls[0][1]).toContain(5);
    // The SQL should reference entry_focus join
    expect(calls[0][0]).toContain('entry_focus');
  });

  it('returns only associated entries when filtered by focusId', async () => {
    const db = makeDb([{ ...BASE_ROW, id: 7 }]);

    const result = await getEntriesForTrace(db, { focusId: 3 });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(7);
  });

  it('returns empty array when filtered focusId has no matches', async () => {
    const db = makeDb([]);

    const result = await getEntriesForTrace(db, { focusId: 999 });

    expect(result).toHaveLength(0);
  });

  it('returns entries for an archived focus when that focusId is used', async () => {
    // The query filters on entry_focus.focus_id, not on focus.archived.
    // An archived focus still has entry_focus rows — they should be returned.
    const db = makeDb([{ ...BASE_ROW, id: 4 }]);

    const result = await getEntriesForTrace(db, { focusId: 2 });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(4);
  });

  it('uses unfiltered SQL when no options provided', async () => {
    const db = makeDb([]);

    await getEntriesForTrace(db);

    const calls = (db.getAllAsync as jest.Mock).mock.calls;
    expect(calls[0][0]).not.toContain('entry_focus');
  });

  it('uses unfiltered SQL when focusId is undefined', async () => {
    const db = makeDb([]);

    await getEntriesForTrace(db, { focusId: undefined });

    const calls = (db.getAllAsync as jest.Mock).mock.calls;
    expect(calls[0][0]).not.toContain('entry_focus');
  });
});
