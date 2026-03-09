/**
 * Timestamp utilities for Haven entry logging and display.
 *
 * Core invariant: a timestamp captured on a device in PST must display the
 * same wall-clock time when the device (or user) is later in a different
 * timezone. The stored UTC offset is the source of truth, not the device's
 * current timezone at display time.
 */

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Returns the current local wall-clock time as an ISO 8601 string with the
 * device's current UTC offset, e.g. "2026-03-09T09:00:00-08:00".
 *
 * Does NOT use toISOString() (which returns UTC with Z suffix) — that would
 * lose the wall-clock time when displayed after timezone changes.
 */
export function nowLocalIso(): string {
  const d = new Date();

  const year = d.getFullYear();
  const month = pad2(d.getMonth() + 1);
  const day = pad2(d.getDate());
  const hours = pad2(d.getHours());
  const minutes = pad2(d.getMinutes());
  const seconds = pad2(d.getSeconds());

  // getTimezoneOffset returns minutes-west; negate for ISO 8601 offset sign
  const offsetMinutesWest = d.getTimezoneOffset();
  const offsetSign = offsetMinutesWest <= 0 ? '+' : '-';
  const offsetAbsMinutes = Math.abs(offsetMinutesWest);
  const offsetHours = pad2(Math.floor(offsetAbsMinutes / 60));
  const offsetMins = pad2(offsetAbsMinutes % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offsetSign}${offsetHours}:${offsetMins}`;
}

/**
 * Formats the time portion of a stored ISO 8601 offset string for display,
 * e.g. "9:00 AM", "9:30 PM", "12:00 AM".
 *
 * Parses the wall-clock hours and minutes directly from the string — does NOT
 * re-interpret via the current device timezone. The stored offset is the
 * source of truth.
 */
export function formatEntryTime(isoString: string): string {
  // Format: YYYY-MM-DDTHH:mm:ss±HH:MM
  const timePart = isoString.split('T')[1]; // "HH:mm:ss±HH:MM"
  const [hhStr, mmStr] = timePart.split(':');
  const hh = parseInt(hhStr, 10);
  const mm = parseInt(mmStr, 10);

  const period = hh < 12 ? 'AM' : 'PM';
  const displayHour = hh % 12 === 0 ? 12 : hh % 12;
  const displayMinute = pad2(mm);

  return `${displayHour}:${displayMinute} ${period}`;
}

/**
 * Formats the date portion of a stored ISO 8601 offset string for display.
 * Returns "Today", "Yesterday", or a formatted date like "March 2".
 *
 * Uses the stored date component directly — does NOT convert to UTC or the
 * device's current timezone. The stored date is the source of truth.
 *
 * @param isoString - Stored ISO 8601 offset string
 * @param _today - Optional override for "today" (used in tests to inject a
 *   fixed date without global mocking)
 */
export function formatEntryDate(isoString: string, _today?: Date): string {
  // Parse stored date components directly from the string
  const datePart = isoString.split('T')[0]; // "YYYY-MM-DD"
  const [yearStr, monthStr, dayStr] = datePart.split('-');
  const storedYear = parseInt(yearStr, 10);
  const storedMonth = parseInt(monthStr, 10); // 1-indexed
  const storedDay = parseInt(dayStr, 10);

  // Get current local date components
  const now = _today ?? new Date();
  const todayYear = now.getFullYear();
  const todayMonth = now.getMonth() + 1; // convert to 1-indexed
  const todayDay = now.getDate();

  if (
    storedYear === todayYear &&
    storedMonth === todayMonth &&
    storedDay === todayDay
  ) {
    return 'Today';
  }

  // Compute yesterday's local date components
  const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yYear = yesterdayDate.getFullYear();
  const yMonth = yesterdayDate.getMonth() + 1;
  const yDay = yesterdayDate.getDate();

  if (storedYear === yYear && storedMonth === yMonth && storedDay === yDay) {
    return 'Yesterday';
  }

  // Use local midnight constructed from the stored date components so Intl
  // doesn't shift the date due to UTC offset interpretation
  const displayDate = new Date(storedYear, storedMonth - 1, storedDay);
  return new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' }).format(displayDate);
}
