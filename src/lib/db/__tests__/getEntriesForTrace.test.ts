/**
 * SQL-shape and parameter-binding tests for getEntriesForTrace.
 *
 * Scope note: `db` here is a mock, so these tests can only observe the SQL
 * string and the bound params. Behavioural correctness of the filter (OR
 * semantics, no duplicate labels across multiple matching focuses) lives in
 * src/__tests__/db/queries.test.ts, which runs against a real SQLite engine.
 * A mocked test cannot detect the JOIN-vs-EXISTS regression at all.
 */
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

function sqlOf(db: Db): string {
  return (db.getAllAsync as jest.Mock).mock.calls[0][0] as string;
}

function paramsOf(db: Db): unknown[] | undefined {
  return (db.getAllAsync as jest.Mock).mock.calls[0][1] as unknown[] | undefined;
}

describe('getEntriesForTrace', () => {
  it('returns all entries when no focusIds are provided', async () => {
    const row1 = { ...BASE_ROW, id: 1 };
    const row2 = { ...BASE_ROW, id: 2, timestamp: '2026-04-13T10:00:00-07:00' };
    const db = makeDb([row1, row2]);

    const result = await getEntriesForTrace(db);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(1);
    expect(result[1].id).toBe(2);
  });

  it('uses unfiltered SQL when no options provided', async () => {
    const db = makeDb([]);

    await getEntriesForTrace(db);

    expect(sqlOf(db)).not.toContain('entry_focus');
    expect(paramsOf(db)).toBeUndefined();
  });

  it('uses unfiltered SQL when focusIds is undefined', async () => {
    const db = makeDb([]);

    await getEntriesForTrace(db, { focusIds: undefined });

    expect(sqlOf(db)).not.toContain('entry_focus');
    expect(paramsOf(db)).toBeUndefined();
  });

  it('uses unfiltered SQL when focusIds is empty', async () => {
    // The state right after the user deselects their last pill. An `IN ()` with
    // zero placeholders is a SQL syntax error, so this must not build a filter.
    const db = makeDb([]);

    await getEntriesForTrace(db, { focusIds: [] });

    expect(sqlOf(db)).not.toContain('entry_focus');
    expect(sqlOf(db)).not.toContain('IN (');
    expect(paramsOf(db)).toBeUndefined();
  });

  it('passes a single focus id as a bound param using an EXISTS semi-join', async () => {
    const db = makeDb([{ ...BASE_ROW, id: 1 }]);

    await getEntriesForTrace(db, { focusIds: [5] });

    expect(sqlOf(db)).toContain('EXISTS');
    expect(sqlOf(db)).toContain('entry_focus');
    expect(paramsOf(db)).toEqual([5]);
  });

  it('returns only the rows the filtered query produced', async () => {
    const db = makeDb([{ ...BASE_ROW, id: 7 }]);

    const result = await getEntriesForTrace(db, { focusIds: [3] });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(7);
  });

  it('returns an empty array when the filtered query matches nothing', async () => {
    const db = makeDb([]);

    const result = await getEntriesForTrace(db, { focusIds: [999] });

    expect(result).toHaveLength(0);
  });

  it('emits exactly one placeholder per focus id and binds them in order', async () => {
    const db = makeDb([]);

    await getEntriesForTrace(db, { focusIds: [3, 7] });

    const inList = /IN \(([^)]*)\)/.exec(sqlOf(db));
    expect(inList).not.toBeNull();
    expect(inList![1].match(/\?/g)).toHaveLength(2);
    expect(paramsOf(db)).toEqual([3, 7]);
  });

  it('selects e.routine_completion_id in both the filtered and unfiltered projections', async () => {
    const unfiltered = makeDb([]);
    await getEntriesForTrace(unfiltered);
    expect(sqlOf(unfiltered)).toContain('e.routine_completion_id');

    const filtered = makeDb([]);
    await getEntriesForTrace(filtered, { focusIds: [1] });
    expect(sqlOf(filtered)).toContain('e.routine_completion_id');
  });

  it('maps routine_completion_id onto routineCompletionId', async () => {
    const db = makeDb([
      { ...BASE_ROW, id: 1, routine_completion_id: 4 },
      { ...BASE_ROW, id: 2, routine_completion_id: null },
    ]);

    const result = await getEntriesForTrace(db);

    expect(result[0].routineCompletionId).toBe(4);
    expect(result[1].routineCompletionId).toBeNull();
  });
});
