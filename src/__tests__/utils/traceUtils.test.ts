import { summariseEntry, groupEntriesByDate } from '@/lib/utils/traceUtils';
import type { EntryWithLabels } from '@/lib/db/query-types';

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

// ─── groupEntriesByDate ───────────────────────────────────────────────────────

describe('groupEntriesByDate', () => {
  it('returns empty array for empty input', () => {
    expect(groupEntriesByDate([])).toEqual([]);
  });

  it('groups two entries on the same localDate into one section', () => {
    const e1 = makeEntry({ id: 1, localDate: '2026-03-25', timestamp: '2026-03-25T10:00:00-07:00' });
    const e2 = makeEntry({ id: 2, localDate: '2026-03-25', timestamp: '2026-03-25T08:00:00-07:00' });
    const sections = groupEntriesByDate([e1, e2]);
    expect(sections).toHaveLength(1);
    expect(sections[0].data).toHaveLength(2);
  });

  it('creates two sections for entries on different dates, newest first', () => {
    const older = makeEntry({ id: 2, localDate: '2026-03-24', timestamp: '2026-03-24T10:00:00-07:00' });
    const newer = makeEntry({ id: 1, localDate: '2026-03-25', timestamp: '2026-03-25T10:00:00-07:00' });
    // Input is already newest-first (as returned by getEntriesForTrace)
    const sections = groupEntriesByDate([newer, older]);
    expect(sections).toHaveLength(2);
    expect(sections[0].data[0].localDate).toBe('2026-03-25');
    expect(sections[1].data[0].localDate).toBe('2026-03-24');
  });

  it('sets section title to "Today" for today\'s date', () => {
    // Use the _today override by injecting a matching localDate
    const today = '2026-03-25';
    const entry = makeEntry({ localDate: today, timestamp: `${today}T10:00:00-07:00` });
    const sections = groupEntriesByDate([entry], today);
    expect(sections[0].title).toBe('Today');
  });

  it('sets section title to a formatted date for older entries', () => {
    const entry = makeEntry({ localDate: '2026-03-01', timestamp: '2026-03-01T10:00:00-07:00' });
    // today is 2026-03-25, so March 1 is not today or yesterday
    const sections = groupEntriesByDate([entry], '2026-03-25');
    expect(sections[0].title).toBe('March 1');
  });
});
