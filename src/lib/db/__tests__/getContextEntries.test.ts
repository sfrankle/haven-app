import { getContextEntries, type Db } from '../queries';

function makeDb(rows: unknown[]): Db {
  return {
    getAllAsync: jest.fn().mockResolvedValue(rows),
    getFirstAsync: jest.fn(),
    runAsync: jest.fn(),
    withTransactionAsync: jest.fn(),
  };
}

const BASE_ROW = {
  id: 2,
  entry_type_id: 3,
  source_type: 'log' as const,
  timestamp: '2026-04-14T11:00:00-07:00',
  numeric_value: null,
  notes: null,
  routine_completion_id: null,
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

describe('getContextEntries', () => {
  it('returns entries within the time window ordered ASC by timestamp', async () => {
    const row1 = { ...BASE_ROW, id: 2, timestamp: '2026-04-14T09:30:00-07:00' };
    const row2 = { ...BASE_ROW, id: 3, timestamp: '2026-04-14T11:30:00-07:00' };
    const db = makeDb([row1, row2]);

    const result = await getContextEntries(db, {
      excludeEntryId: 1,
      afterIso: '2026-04-14T08:00:00-07:00',
      beforeIso: '2026-04-14T12:00:00-07:00',
    });

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(2);
    expect(result[1].id).toBe(3);
  });

  it('excludes the focal entry from results', async () => {
    const db = makeDb([]);

    await getContextEntries(db, {
      excludeEntryId: 42,
      afterIso: '2026-04-14T08:00:00-07:00',
      beforeIso: '2026-04-14T12:00:00-07:00',
    });

    const calls = (db.getAllAsync as jest.Mock).mock.calls;
    expect(calls[0][1]).toContain(42);
    expect(calls[0][0]).toContain('e.id != ?');
  });

  it('returns empty array when no entries exist in the window', async () => {
    const db = makeDb([]);

    const result = await getContextEntries(db, {
      excludeEntryId: 1,
      afterIso: '2026-04-14T08:00:00-07:00',
      beforeIso: '2026-04-14T12:00:00-07:00',
    });

    expect(result).toHaveLength(0);
  });

  it('collapses multiple label rows for one entry into a single entry with labels array', async () => {
    const rowA = {
      ...BASE_ROW,
      id: 5,
      label_id: 10,
      label_name: 'Oats',
      label_parent_id: null,
      label_parent_name: null,
      label_category_id: null,
      label_category_name: null,
      label_sort_order: 0,
    };
    const rowB = {
      ...BASE_ROW,
      id: 5,
      label_id: 11,
      label_name: 'Banana',
      label_parent_id: null,
      label_parent_name: null,
      label_category_id: null,
      label_category_name: null,
      label_sort_order: 1,
    };
    const db = makeDb([rowA, rowB]);

    const result = await getContextEntries(db, {
      excludeEntryId: 1,
      afterIso: '2026-04-14T08:00:00-07:00',
      beforeIso: '2026-04-14T12:00:00-07:00',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(5);
    expect(result[0].labels).toHaveLength(2);
  });

  it('passes afterIso, beforeIso, and excludeEntryId as SQL params', async () => {
    const db = makeDb([]);
    const afterIso = '2026-04-14T08:00:00-07:00';
    const beforeIso = '2026-04-14T12:00:00-07:00';
    const excludeEntryId = 7;

    await getContextEntries(db, { excludeEntryId, afterIso, beforeIso });

    const calls = (db.getAllAsync as jest.Mock).mock.calls;
    expect(calls[0][1]).toContain(afterIso);
    expect(calls[0][1]).toContain(beforeIso);
    expect(calls[0][1]).toContain(excludeEntryId);
  });

  // getContextEntries shares EntryTraceRaw and the row collapser with
  // getEntriesForTrace. Adding a column to only one of the two SELECTs
  // type-checks cleanly and yields `undefined` at runtime — these two tests pin
  // that hazard for routine_completion_id.
  it('selects e.routine_completion_id', async () => {
    const db = makeDb([]);

    await getContextEntries(db, {
      excludeEntryId: 1,
      afterIso: '2026-04-14T08:00:00-07:00',
      beforeIso: '2026-04-14T12:00:00-07:00',
    });

    const calls = (db.getAllAsync as jest.Mock).mock.calls;
    expect(calls[0][0]).toContain('e.routine_completion_id');
  });

  it('maps routine_completion_id onto the returned entry', async () => {
    const db = makeDb([{ ...BASE_ROW, id: 6, routine_completion_id: 12 }]);

    const result = await getContextEntries(db, {
      excludeEntryId: 1,
      afterIso: '2026-04-14T08:00:00-07:00',
      beforeIso: '2026-04-14T12:00:00-07:00',
    });

    expect(result[0].routineCompletionId).toBe(12);
  });

  it('orders results ASC by timestamp', async () => {
    const db = makeDb([]);

    await getContextEntries(db, {
      excludeEntryId: 1,
      afterIso: '2026-04-14T08:00:00-07:00',
      beforeIso: '2026-04-14T12:00:00-07:00',
    });

    const calls = (db.getAllAsync as jest.Mock).mock.calls;
    expect(calls[0][0]).toMatch(/ORDER BY e\.timestamp ASC/i);
  });
});
