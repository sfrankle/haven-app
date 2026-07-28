/**
 * Trace filter state — a list of active filters combined with OR semantics
 * (an entry matches if it belongs to *any* active filter).
 *
 * This module is deliberately tiny: a discriminated union plus pure helpers.
 * It is the extension point for future Trace filters (entry type, date range),
 * which should be added as new members of `TraceFilter` with a matching
 * selector alongside `focusIdsOf`. Do not grow it into a reducer, a context, or
 * a generic filter registry — the query layer only ever needs plain ID lists.
 */

/** A single active Trace filter. Only Focus exists today. */
export type TraceFilter = { type: 'focus'; id: number };

/** True when two filters refer to the same thing (same kind, same id). */
export function isSameFilter(a: TraceFilter, b: TraceFilter): boolean {
  return a.type === b.type && a.id === b.id;
}

/**
 * Toggles a filter in or out of the active list.
 *
 * Adding appends to the end; removing preserves the order of the rest. Always
 * returns a new array — never mutates the input.
 */
export function toggleFilter(active: TraceFilter[], filter: TraceFilter): TraceFilter[] {
  return active.some((f) => isSameFilter(f, filter))
    ? active.filter((f) => !isSameFilter(f, filter))
    : [...active, filter];
}

/** Extracts focus IDs from the active filter list, for the query layer. */
export function focusIdsOf(active: TraceFilter[]): number[] {
  return active.filter((f) => f.type === 'focus').map((f) => f.id);
}
