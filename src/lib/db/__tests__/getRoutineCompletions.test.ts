import { getRoutineCompletions, type Db } from '../queries';

function makeDb(rows: unknown[]): Db {
  return {
    getAllAsync: jest.fn().mockResolvedValue(rows),
    getFirstAsync: jest.fn(),
    runAsync: jest.fn(),
    withTransactionAsync: jest.fn(),
  };
}

interface RowOverrides {
  id?: number;
  timestamp?: string;
  completion_id?: number;
  completion_created_at?: string;
  routine_id?: number;
  routine_name?: string;
  label_id?: number | null;
  label_name?: string | null;
  label_sort_order?: number | null;
}

function makeRow(overrides: RowOverrides = {}) {
  return {
    id: 1,
    entry_type_id: 2,
    source_type: 'log' as const,
    timestamp: '2026-06-01T20:16:00-07:00',
    numeric_value: null,
    notes: null,
    routine_completion_id: overrides.completion_id ?? 10,
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
    completion_id: 10,
    completion_created_at: '2026-06-01T20:15:00-07:00',
    routine_id: 4,
    routine_name: 'Evening Wind Down',
    ...overrides,
  };
}

describe('getRoutineCompletions', () => {
  it('returns [] without querying when completionIds is empty', async () => {
    const db = makeDb([]);

    const result = await getRoutineCompletions(db, []);

    expect(result).toEqual([]);
    expect(db.getAllAsync).not.toHaveBeenCalled();
  });

  it('emits one placeholder per completion id and binds them in order', async () => {
    const db = makeDb([]);

    await getRoutineCompletions(db, [10, 11, 12]);

    const [sql, params] = (db.getAllAsync as jest.Mock).mock.calls[0];
    const inList = /IN \(([^)]*)\)/.exec(sql as string);
    expect(inList).not.toBeNull();
    expect(inList![1].match(/\?/g)).toHaveLength(3);
    expect(params).toEqual([10, 11, 12]);
  });

  it('collapses three member rows into one group, oldest-first', async () => {
    const db = makeDb([
      makeRow({ id: 1, timestamp: '2026-06-01T20:16:00-07:00' }),
      makeRow({ id: 2, timestamp: '2026-06-01T20:17:00-07:00' }),
      makeRow({ id: 3, timestamp: '2026-06-01T20:18:00-07:00' }),
    ]);

    const [group] = await getRoutineCompletions(db, [10]);

    expect(group.entries.map((e) => e.id)).toEqual([1, 2, 3]);
    expect(group.routineName).toBe('Evening Wind Down');
    expect(group.routineId).toBe(4);
  });

  it('collapses multiple label rows for one member into a single entry', async () => {
    const db = makeDb([
      makeRow({ id: 1, label_id: 50, label_name: 'Oats', label_sort_order: 0 }),
      makeRow({ id: 1, label_id: 51, label_name: 'Banana', label_sort_order: 1 }),
    ]);

    const [group] = await getRoutineCompletions(db, [10]);

    expect(group.entries).toHaveLength(1);
    expect(group.entries[0].labels.map((l) => l.name)).toEqual(['Oats', 'Banana']);
  });

  it('keeps two interleaved completions separate', async () => {
    const db = makeDb([
      makeRow({ id: 1, completion_id: 10 }),
      makeRow({ id: 5, completion_id: 11, completion_created_at: '2026-06-02T08:00:00-07:00' }),
      makeRow({ id: 2, completion_id: 10 }),
      makeRow({ id: 6, completion_id: 11, completion_created_at: '2026-06-02T08:00:00-07:00' }),
    ]);

    const groups = await getRoutineCompletions(db, [10, 11]);

    expect(groups).toHaveLength(2);
    const byId = new Map(groups.map((g) => [g.completionId, g]));
    expect(byId.get(10)!.entries.map((e) => e.id)).toEqual([1, 2]);
    expect(byId.get(11)!.entries.map((e) => e.id)).toEqual([5, 6]);
  });

  it('takes completedAt from the completion row, not from any entry timestamp', async () => {
    const db = makeDb([
      makeRow({
        id: 1,
        timestamp: '2026-06-01T23:59:00-07:00',
        completion_created_at: '2026-06-01T20:15:00-07:00',
      }),
    ]);

    const [group] = await getRoutineCompletions(db, [10]);

    expect(group.completedAt).toBe('2026-06-01T20:15:00-07:00');
  });

  it('slices localDate from the wall-clock completedAt, not a UTC normalisation', async () => {
    // 23:30 at -07:00 is 06:30 the *next* day in UTC. The group must be filed
    // under the day the user experienced — same rule as EntryWithLabels.localDate.
    const db = makeDb([
      makeRow({ id: 1, completion_created_at: '2026-06-01T23:30:00-07:00' }),
    ]);

    const [group] = await getRoutineCompletions(db, [10]);

    expect(group.localDate).toBe('2026-06-01');
  });

  it('joins routine via routine_completion.routine_id, not entry.routine_id', async () => {
    // entry.routine_id is ON DELETE SET NULL and can be null while the
    // completion survives, so the routine name must not depend on it.
    const db = makeDb([]);

    await getRoutineCompletions(db, [10]);

    const sql = (db.getAllAsync as jest.Mock).mock.calls[0][0] as string;
    expect(sql).toContain('JOIN routine r ON r.id = rc.routine_id');
  });
});
