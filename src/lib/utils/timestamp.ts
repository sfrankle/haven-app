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
 * Today's local calendar date as "YYYY-MM-DD" — the form stored dates are
 * compared against with substr(created_at, 1, 10).
 */
export function todayLocalDate(): string {
  return nowLocalIso().slice(0, 10);
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

export type TimeBlock = 'Morning' | 'Midday' | 'Afternoon' | 'Evening' | 'Night';

/** The four time blocks that can be scheduled in a Routine (Night is not scheduleable). */
export type ScheduleableBlock = Exclude<TimeBlock, 'Night'>;

/** Returns the ordered list of scheduleable time blocks. */
export function getScheduleableBlocks(): ScheduleableBlock[] {
  return ['Morning', 'Midday', 'Afternoon', 'Evening'];
}

/**
 * Returns the general time-of-day block for a given time.
 *
 * Pass an ISO string to derive the hour from the wall-clock time baked into
 * the string (immune to timezone re-interpretation). When no argument is
 * provided, falls back to the device's current local hour.
 *
 * Used for Routine scheduling and time-block-aware label suggestions across
 * all entry types. See getMealContext for food-specific display labels.
 *
 * Time blocks:
 *   05:00–11:59 → Morning
 *   12:00–13:59 → Midday
 *   14:00–17:59 → Afternoon
 *   18:00–21:59 → Evening
 *   22:00–04:59 → Night
 */
export function getTimeBlock(isoString?: string): TimeBlock {
  const hour = isoString
    ? parseInt(isoString.slice(11, 13), 10)
    : new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 14) return 'Midday';
  if (hour >= 14 && hour < 18) return 'Afternoon';
  if (hour >= 18 && hour < 22) return 'Evening';
  return 'Night';
}

export type MealContext = 'Breakfast' | 'Lunch' | 'Snack' | 'Dinner' | 'Late Night Snack';

/**
 * Returns the meal context label for a given time. Thin wrapper over
 * getTimeBlock — all time window logic lives there.
 */
export function getMealContext(isoString?: string): MealContext {
  const block = getTimeBlock(isoString);
  switch (block) {
    case 'Morning':   return 'Breakfast';
    case 'Midday':    return 'Lunch';
    case 'Afternoon': return 'Snack';
    case 'Evening':   return 'Dinner';
    case 'Night':     return 'Late Night Snack';
  }
}

/**
 * Formats the date portion of a stored ISO 8601 offset string for display.
 * Returns "Today", "Yesterday", or a formatted date like "March 2".
 *
 * Uses the stored date component directly — immune to timezone re-interpretation.
 *
 * @param isoString - Stored ISO 8601 offset string
 * @param _today - Optional 'YYYY-MM-DD' string override for "today" (injectable for tests).
 *   Parsed with an explicit format so it resolves to local midnight, consistent with
 *   how the stored date component is parsed. Avoids the UTC-midnight ambiguity of
 *   passing a bare dayjs('YYYY-MM-DD') instance.
 */
export function formatEntryDate(isoString: string, _today?: string): string {
  const stored = dayjs(isoString.slice(0, 10), 'YYYY-MM-DD');
  const today = (_today ? dayjs(_today, 'YYYY-MM-DD') : dayjs()).startOf('day');
  const yesterday = today.subtract(1, 'day');

  if (stored.isSame(today, 'day')) return 'Today';
  if (stored.isSame(yesterday, 'day')) return 'Yesterday';

  return stored.format('MMMM D');
}
