import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

/**
 * Returns the current local wall-clock time as an ISO 8601 string with the
 * device's UTC offset, e.g. "2026-03-09T09:00:00-08:00".
 *
 * Core invariant: an entry logged at 9:00 AM must display as 9:00 AM even
 * if the user's device timezone changes later. The stored offset is the
 * source of truth, not the device's current timezone at display time.
 */
export function nowLocalIso(): string {
  return dayjs().format('YYYY-MM-DDTHH:mm:ssZ');
}

/**
 * Formats the time portion of a stored ISO 8601 offset string for display,
 * e.g. "9:00 AM". Reads the wall-clock hours and minutes directly from the
 * string — does not re-interpret via the current device timezone.
 */
export function formatEntryTime(isoString: string): string {
  // We can't use dayjs(isoString).format() here — dayjs converts the stored
  // offset to the device's current timezone, which is the bug we're avoiding.
  // e.g. "14:30:00+05:30" becomes "9:00 AM" on a UTC device instead of "2:30 PM".
  // Slicing the wall-clock time directly from the string is the simplest way
  // to display what the user actually experienced, regardless of current timezone.
  const [hh, mm] = isoString.slice(11, 16).split(':').map(Number);
  const period = hh < 12 ? 'AM' : 'PM';
  const displayHour = hh % 12 === 0 ? 12 : hh % 12;
  return `${displayHour}:${String(mm).padStart(2, '0')} ${period}`;
}

/**
 * Formats the date portion of a stored ISO 8601 offset string for display.
 * Returns "Today", "Yesterday", or a formatted date like "March 2".
 *
 * Uses the stored date component directly — immune to timezone re-interpretation.
 *
 * @param isoString - Stored ISO 8601 offset string
 * @param _today - Optional override for "today" (injectable for tests)
 */
export function formatEntryDate(isoString: string, _today?: dayjs.Dayjs): string {
  const stored = dayjs(isoString.slice(0, 10), 'YYYY-MM-DD');
  const today = (_today ?? dayjs()).startOf('day');
  const yesterday = today.subtract(1, 'day');

  if (stored.isSame(today, 'day')) return 'Today';
  if (stored.isSame(yesterday, 'day')) return 'Yesterday';

  return stored.format('MMMM D');
}
