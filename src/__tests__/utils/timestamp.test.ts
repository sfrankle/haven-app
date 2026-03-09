import dayjs from 'dayjs';
import { nowLocalIso, formatEntryTime, formatEntryDate } from '../../lib/utils/timestamp';

describe('nowLocalIso', () => {
  it('returns a string matching the ISO 8601 offset format', () => {
    const result = nowLocalIso();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
  });

  it('date/time portion is within 2 seconds of the current local time', () => {
    const before = new Date();
    const result = nowLocalIso();
    const after = new Date();

    const resultDate = new Date(result);
    expect(resultDate.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
    expect(resultDate.getTime()).toBeLessThanOrEqual(after.getTime() + 1000);
  });

  it('offset portion matches the device UTC offset', () => {
    const result = nowLocalIso();
    const offsetMatch = result.match(/([+-]\d{2}:\d{2})$/);
    expect(offsetMatch).not.toBeNull();

    const offsetStr = offsetMatch![1];
    const sign = offsetStr[0] === '+' ? 1 : -1;
    const [hours, minutes] = offsetStr.slice(1).split(':').map(Number);
    const offsetMinutes = sign * (hours * 60 + minutes);

    // Use toEqual not toBe to avoid -0 vs 0 mismatch in UTC environments
    const expectedOffsetMinutes = -new Date().getTimezoneOffset();
    expect(offsetMinutes).toEqual(expectedOffsetMinutes);
  });

  it('two calls in quick succession return strings with the same offset', () => {
    const result1 = nowLocalIso();
    const result2 = nowLocalIso();

    const offset1 = result1.match(/([+-]\d{2}:\d{2})$/)![1];
    const offset2 = result2.match(/([+-]\d{2}:\d{2})$/)![1];
    expect(offset1).toBe(offset2);
  });
});

describe('formatEntryTime', () => {
  it('formats 9:00 AM correctly', () => {
    expect(formatEntryTime('2026-03-04T09:00:00-08:00')).toBe('9:00 AM');
  });

  it('formats 9:30 PM correctly', () => {
    expect(formatEntryTime('2026-03-04T21:30:00-08:00')).toBe('9:30 PM');
  });

  it('formats midnight (12:00 AM) correctly', () => {
    expect(formatEntryTime('2026-03-04T00:00:00+00:00')).toBe('12:00 AM');
  });

  it('formats noon (12:00 PM) correctly', () => {
    expect(formatEntryTime('2026-03-04T12:00:00+05:30')).toBe('12:00 PM');
  });

  it('displays wall-clock time regardless of current device timezone', () => {
    // A timestamp stored in PST (-08:00) should always display as 9:00 AM
    // no matter what timezone the device is in now — the stored offset is truth
    const storedPST = '2026-03-04T09:00:00-08:00';
    expect(formatEntryTime(storedPST)).toBe('9:00 AM');
  });

  it('handles half-hour offsets correctly', () => {
    expect(formatEntryTime('2026-03-04T14:30:00+05:30')).toBe('2:30 PM');
  });
});

describe('formatEntryDate', () => {
  // All tests inject a fixed "today" dayjs instance to avoid flakiness

  it('returns "Today" when stored date matches today', () => {
    const today = dayjs('2026-03-09');
    expect(formatEntryDate('2026-03-09T10:00:00-08:00', today)).toBe('Today');
  });

  it('returns "Yesterday" when stored date is one day before today', () => {
    const today = dayjs('2026-03-09');
    expect(formatEntryDate('2026-03-08T10:00:00-08:00', today)).toBe('Yesterday');
  });

  it('returns formatted month and day for older dates', () => {
    const today = dayjs('2026-03-09');
    expect(formatEntryDate('2026-03-02T10:00:00-08:00', today)).toBe('March 2');
  });

  it('uses no leading zero on the day', () => {
    const today = dayjs('2026-03-09');
    const result = formatEntryDate('2026-02-05T10:00:00-08:00', today);
    expect(result).toBe('February 5');
  });

  it('uses stored date component, not UTC-converted date (cross-timezone stability)', () => {
    // Stored: 11:30 PM PST on March 4 (-08:00)
    // UTC equivalent: March 5 07:30 UTC
    // Device may think "local date" is March 5, but stored date component is March 4
    const today = dayjs('2026-03-05'); // simulates device in a later timezone
    const result = formatEntryDate('2026-03-04T23:30:00-08:00', today);
    // Stored date is March 4, today is March 5 → "Yesterday"
    expect(result).toBe('Yesterday');
  });

  it('defaults today to the current date when not provided', () => {
    const result = formatEntryDate('2026-01-01T10:00:00+00:00');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
