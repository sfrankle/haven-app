import { isSameFilter, toggleFilter, focusIdsOf } from '../traceFilters';
import type { TraceFilter } from '../traceFilters';

const focus = (id: number): TraceFilter => ({ type: 'focus', id });

describe('isSameFilter', () => {
  it('is true for the same type and id', () => {
    expect(isSameFilter(focus(1), focus(1))).toBe(true);
  });

  it('is false for the same type and a different id', () => {
    expect(isSameFilter(focus(1), focus(2))).toBe(false);
  });
});

describe('toggleFilter', () => {
  it('adds a filter that is absent', () => {
    expect(toggleFilter([], focus(3))).toEqual([focus(3)]);
  });

  it('appends to the end, preserving insertion order', () => {
    expect(toggleFilter([focus(1), focus(2)], focus(3))).toEqual([
      focus(1),
      focus(2),
      focus(3),
    ]);
  });

  it('removes a filter that is already present', () => {
    expect(toggleFilter([focus(1), focus(2)], focus(1))).toEqual([focus(2)]);
  });

  it('preserves the order of the remaining filters on removal', () => {
    expect(toggleFilter([focus(1), focus(2), focus(3)], focus(2))).toEqual([
      focus(1),
      focus(3),
    ]);
  });

  it('returns to the original contents when the same filter is toggled twice', () => {
    const initial = [focus(1), focus(2)];
    const once = toggleFilter(initial, focus(5));
    const twice = toggleFilter(once, focus(5));
    expect(twice).toEqual(initial);
  });

  it('does not mutate the input array', () => {
    const initial = [focus(1)];
    toggleFilter(initial, focus(2));
    expect(initial).toEqual([focus(1)]);
  });
});

describe('focusIdsOf', () => {
  it('returns [] for an empty list', () => {
    expect(focusIdsOf([])).toEqual([]);
  });

  it('extracts focus ids in list order', () => {
    expect(focusIdsOf([focus(4), focus(2)])).toEqual([4, 2]);
  });

  it('ignores filter kinds that are not focus filters', () => {
    // The union has exactly one member today. Cast a future-shaped member in so
    // the narrowing in focusIdsOf is actually exercised rather than vacuous.
    const future = { type: 'entryType', id: 9 } as unknown as TraceFilter;
    expect(focusIdsOf([focus(4), future, focus(2)])).toEqual([4, 2]);
  });
});
