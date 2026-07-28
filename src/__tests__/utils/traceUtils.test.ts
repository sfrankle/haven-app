import { summariseEntry, buildTraceItems, groupTraceItemsByDate } from '@/lib/utils/traceUtils';
import type { TraceItem } from '@/lib/utils/traceUtils';
import type { EntryWithLabels, RoutineCompletionGroup } from '@/lib/db/query-types';

function makeEntry(overrides: Partial<EntryWithLabels> = {}): EntryWithLabels {
  return {
    id: 1,
    entryTypeId: 1,
    entryTypeName: 'Sleep',
    entryTypeTitle: 'Sleep',
    entryTypeIcon: 'moon',
    sourceType: 'log',
    timestamp: '2026-03-25T08:00:00-07:00',
    localDate: '2026-03-25',
    numericValue: null,
    notes: null,
    labels: [],
    routineCompletionId: null,
    ...overrides,
  };
}

function makeLabel(id: number, name: string, parentId: number | null = null) {
  return {
    id,
    entryTypeId: 1,
    name,
    parentId,
    categoryId: null,
    categoryName: null,
    sortOrder: 0,
  };
}

// ─── summariseEntry ───────────────────────────────────────────────────────────

describe('summariseEntry', () => {
  it('Hydration: shows oz amount', () => {
    const entry = makeEntry({ entryTypeName: 'Hydration', numericValue: 16 });
    expect(summariseEntry(entry)).toBe('Drank 16oz');
  });

  it('Sleep: shows hours', () => {
    const entry = makeEntry({ entryTypeName: 'Sleep', numericValue: 8 });
    expect(summariseEntry(entry)).toBe('Slept 8 hours');
  });

  it('Activity: shows first label name', () => {
    const entry = makeEntry({
      entryTypeName: 'Activity',
      labels: [makeLabel(1, 'Running')],
    });
    expect(summariseEntry(entry)).toBe('Running');
  });

  it('Activity: falls back to "Journey" when no labels', () => {
    const entry = makeEntry({ entryTypeName: 'Activity', labels: [] });
    expect(summariseEntry(entry)).toBe('Journey');
  });

  it('Food: joins label names with comma prefix', () => {
    const entry = makeEntry({
      entryTypeName: 'Food',
      labels: [makeLabel(1, 'Oats'), makeLabel(2, 'Banana')],
    });
    expect(summariseEntry(entry)).toBe('Ate Oats, Banana');
  });

  it('Food: falls back to "Nourish" when no labels', () => {
    const entry = makeEntry({ entryTypeName: 'Food', labels: [] });
    expect(summariseEntry(entry)).toBe('Nourish');
  });

  it('Emotion: shows felt + first label', () => {
    const entry = makeEntry({
      entryTypeName: 'Emotion',
      labels: [makeLabel(1, 'Anxious')],
    });
    expect(summariseEntry(entry)).toBe('Felt Anxious');
  });

  it('Emotion: shows "Felt" when no labels', () => {
    const entry = makeEntry({ entryTypeName: 'Emotion', labels: [] });
    expect(summariseEntry(entry)).toBe('Felt');
  });

  it('Physical energy: parent label (parentId null) → shows level label and energy reading', () => {
    const entry = makeEntry({
      entryTypeName: 'Physical',
      numericValue: 3,
      labels: [makeLabel(1, 'Energy', null)],
    });
    expect(summariseEntry(entry)).toBe('Felt Steady (Energy 3/5)');
  });

  it('Physical state without severity: child label → shows label name only', () => {
    const entry = makeEntry({
      entryTypeName: 'Physical',
      numericValue: null,
      labels: [makeLabel(1, 'Cramping', 5)],
    });
    expect(summariseEntry(entry)).toBe('Felt Cramping');
  });

  it('Physical state with severity: child label + numericValue → shows label + fraction', () => {
    const entry = makeEntry({
      entryTypeName: 'Physical',
      numericValue: 2,
      labels: [makeLabel(1, 'Cramping', 5)],
    });
    expect(summariseEntry(entry)).toBe('Felt Cramping (2/5)');
  });

  it('Physical with no labels: shows "Felt"', () => {
    const entry = makeEntry({
      entryTypeName: 'Physical',
      numericValue: null,
      labels: [],
    });
    expect(summariseEntry(entry)).toBe('Felt');
  });

  it('unknown entry type: falls back to entry type title', () => {
    const entry = makeEntry({ entryTypeName: 'Unknown', entryTypeTitle: 'Custom Type' });
    expect(summariseEntry(entry)).toBe('Custom Type');
  });
});

// ─── buildTraceItems ──────────────────────────────────────────────────────────

function makeGroup(overrides: Partial<RoutineCompletionGroup> = {}): RoutineCompletionGroup {
  return {
    completionId: 1,
    routineId: 1,
    routineName: 'Morning Flow',
    completedAt: '2026-03-25T08:12:00-07:00',
    localDate: '2026-03-25',
    entries: [],
    ...overrides,
  };
}

function entryIds(items: TraceItem[]): number[] {
  return items.map((i) => (i.kind === 'group' ? i.group.completionId : i.entry.id));
}

describe('buildTraceItems', () => {
  it('returns an empty list for no entries', () => {
    expect(buildTraceItems([], [])).toEqual([]);
  });

  it('emits plain entry items when nothing belongs to a completion, preserving order', () => {
    const e1 = makeEntry({ id: 1 });
    const e2 = makeEntry({ id: 2 });
    const items = buildTraceItems([e1, e2], []);
    expect(items.map((i) => i.kind)).toEqual(['entry', 'entry']);
    expect(entryIds(items)).toEqual([1, 2]);
  });

  it('collapses three entries sharing a completion into exactly one group item', () => {
    const members = [
      makeEntry({ id: 1, routineCompletionId: 7 }),
      makeEntry({ id: 2, routineCompletionId: 7 }),
      makeEntry({ id: 3, routineCompletionId: 7 }),
    ];
    const group = makeGroup({ completionId: 7, entries: members });

    const items = buildTraceItems(members, [group]);

    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('group');
  });

  it('emits the group at the position of its first (newest) matched member', () => {
    const before = makeEntry({ id: 10 });
    const m1 = makeEntry({ id: 1, routineCompletionId: 7 });
    const m2 = makeEntry({ id: 2, routineCompletionId: 7 });
    const after = makeEntry({ id: 20 });
    const group = makeGroup({ completionId: 7, entries: [m1, m2] });

    const items = buildTraceItems([before, m1, m2, after], [group]);

    expect(items.map((i) => i.kind)).toEqual(['entry', 'group', 'entry']);
    expect(entryIds(items)).toEqual([10, 7, 20]);
  });

  it('emits a group once even when its members are non-adjacent in the stream', () => {
    const m1 = makeEntry({ id: 1, routineCompletionId: 7 });
    const other = makeEntry({ id: 10 });
    const m2 = makeEntry({ id: 2, routineCompletionId: 7 });
    const group = makeGroup({ completionId: 7, entries: [m1, m2] });

    const items = buildTraceItems([m1, other, m2], [group]);

    expect(items.map((i) => i.kind)).toEqual(['group', 'entry']);
    expect(entryIds(items)).toEqual([7, 10]);
  });

  it('groups a single-member completion as a group row, not a bare entry', () => {
    const m1 = makeEntry({ id: 1, routineCompletionId: 7 });
    const items = buildTraceItems([m1], [makeGroup({ completionId: 7, entries: [m1] })]);
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('group');
  });

  it('falls back to an individual row when a completion id resolves to no group', () => {
    // Shouldn't happen (routine_completion CASCADEs and entry.routine_completion_id
    // SET NULLs), but an unresolvable id must never make an entry disappear.
    const orphan = makeEntry({ id: 1, routineCompletionId: 99 });
    const plain = makeEntry({ id: 2 });

    const items = buildTraceItems([orphan, plain], [makeGroup({ completionId: 7 })]);

    expect(items).toHaveLength(2);
    expect(items.map((i) => i.kind)).toEqual(['entry', 'entry']);
    expect(entryIds(items)).toEqual([1, 2]);
  });

  it('renders every routine entry individually when groups is empty (query-failure shape)', () => {
    // This is the getRoutineCompletions-failed contract at the pure-function
    // level: degrade to ungrouped, never to invisible.
    const entries = [
      makeEntry({ id: 1, routineCompletionId: 7 }),
      makeEntry({ id: 2, routineCompletionId: 7 }),
      makeEntry({ id: 3, routineCompletionId: 8 }),
    ];

    const items = buildTraceItems(entries, []);

    expect(items).toHaveLength(entries.length);
    expect(items.every((i) => i.kind === 'entry')).toBe(true);
  });

  it('sets matchedIds to exactly the ids of the matched array', () => {
    const matchedMember = makeEntry({ id: 1, routineCompletionId: 7 });
    const unmatchedMember = makeEntry({ id: 2, routineCompletionId: 7 });
    const group = makeGroup({ completionId: 7, entries: [matchedMember, unmatchedMember] });

    const items = buildTraceItems([matchedMember], [group]);

    expect(items[0].kind).toBe('group');
    const matchedIds = items[0].kind === 'group' ? items[0].matchedIds : new Set<number>();
    expect(matchedIds.has(1)).toBe(true);
    expect(matchedIds.has(2)).toBe(false);
  });
});

// ─── groupTraceItemsByDate ────────────────────────────────────────────────────

describe('groupTraceItemsByDate', () => {
  it('returns empty array for empty input', () => {
    expect(groupTraceItemsByDate([])).toEqual([]);
  });

  it('groups two entries on the same localDate into one section', () => {
    const e1 = makeEntry({ id: 1, localDate: '2026-03-25', timestamp: '2026-03-25T10:00:00-07:00' });
    const e2 = makeEntry({ id: 2, localDate: '2026-03-25', timestamp: '2026-03-25T08:00:00-07:00' });
    const sections = groupTraceItemsByDate(buildTraceItems([e1, e2], []));
    expect(sections).toHaveLength(1);
    expect(sections[0].data).toHaveLength(2);
  });

  it('creates two sections for entries on different dates, newest first', () => {
    const older = makeEntry({ id: 2, localDate: '2026-03-24', timestamp: '2026-03-24T10:00:00-07:00' });
    const newer = makeEntry({ id: 1, localDate: '2026-03-25', timestamp: '2026-03-25T10:00:00-07:00' });
    // Input is already newest-first (as returned by getEntriesForTrace)
    const sections = groupTraceItemsByDate(buildTraceItems([newer, older], []));
    expect(sections).toHaveLength(2);
    expect(entryIds(sections[0].data)).toEqual([1]);
    expect(entryIds(sections[1].data)).toEqual([2]);
  });

  it('sets section title to "Today" for today\'s date', () => {
    const today = '2026-03-25';
    const entry = makeEntry({ localDate: today, timestamp: `${today}T10:00:00-07:00` });
    const sections = groupTraceItemsByDate(buildTraceItems([entry], []), today);
    expect(sections[0].title).toBe('Today');
  });

  it('sets section title to a formatted date for older entries', () => {
    const entry = makeEntry({ localDate: '2026-03-01', timestamp: '2026-03-01T10:00:00-07:00' });
    // today is 2026-03-25, so March 1 is not today or yesterday
    const sections = groupTraceItemsByDate(buildTraceItems([entry], []), '2026-03-25');
    expect(sections[0].title).toBe('March 1');
  });

  it('files a group and an entry sharing a local date in one section', () => {
    const member = makeEntry({ id: 1, routineCompletionId: 7, localDate: '2026-03-25', timestamp: '2026-03-25T08:12:00-07:00' });
    const plain = makeEntry({ id: 2, localDate: '2026-03-25', timestamp: '2026-03-25T07:00:00-07:00' });
    const group = makeGroup({ completionId: 7, localDate: '2026-03-25', entries: [member] });

    const sections = groupTraceItemsByDate(buildTraceItems([member, plain], [group]));

    expect(sections).toHaveLength(1);
    expect(sections[0].data).toHaveLength(2);
  });

  it('files a group under completedAt even when a member entry has a different date', () => {
    // A completion started at 23:50 whose member entry timestamp rolled past midnight.
    const member = makeEntry({ id: 1, routineCompletionId: 7, localDate: '2026-03-26', timestamp: '2026-03-26T00:05:00-07:00' });
    const group = makeGroup({
      completionId: 7,
      localDate: '2026-03-25',
      completedAt: '2026-03-25T23:50:00-07:00',
      entries: [member],
    });

    const sections = groupTraceItemsByDate(buildTraceItems([member], [group]), '2026-03-26');

    expect(sections).toHaveLength(1);
    expect(sections[0].title).toBe('Yesterday');
  });
});
