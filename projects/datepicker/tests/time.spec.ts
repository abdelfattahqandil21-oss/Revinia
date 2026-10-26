import { describe, expect, it } from 'vitest';
import {
  addMinutes,
  compareDateTime,
  dateTimeToIso,
  formatDateTime,
  formatTime,
  formatTimeZoneName,
  formatUnitValue,
  fromSeconds,
  getTimeZoneOffsetMinutes,
  hourCycleOf,
  isSameDateTime,
  isValidDateTime,
  isValidTime,
  isValidTimeZone,
  listTimeZones,
  nowInTimeZone,
  parseDateTime,
  parseTime,
  parseTimePattern,
  resolveWallTime,
  todayInTimeZone,
  uses12HourClock,
} from '../src/public-api';
import type { RiviniaDateTime } from '../src/public-api';

const d = (year: number, month: number, day: number) => ({ year, month, day });
const t = (hour: number, minute = 0, second = 0) => ({ hour, minute, second });
const dt = (year: number, month: number, day: number, hour: number, minute = 0, second = 0): RiviniaDateTime => ({
  date: d(year, month, day),
  time: t(hour, minute, second),
});

describe('time math', () => {
  it('validates and parses times', () => {
    expect(isValidTime(t(23, 59, 59))).toBe(true);
    expect(isValidTime(t(24))).toBe(false);
    expect(isValidTime(t(0, 60))).toBe(false);
    expect(parseTime('09:05')).toEqual(t(9, 5, 0));
    expect(parseTime('09:05:07')).toEqual(t(9, 5, 7));
    expect(parseTime('9:05')).toBeNull();
    expect(parseTime('24:00')).toBeNull();
    expect(parseDateTime('2026-10-25T15:30')).toEqual(dt(2026, 10, 25, 15, 30));
    expect(parseDateTime('2026-10-25 15:30:45')).toEqual(dt(2026, 10, 25, 15, 30, 45));
    expect(parseDateTime('2026-10-25T15:30:00Z')).toBeNull();
    expect(parseDateTime('2026-02-30T10:00')).toBeNull();
    expect(dateTimeToIso(dt(2026, 10, 25, 15, 30, 5))).toBe('2026-10-25T15:30:05');
  });

  it('compares and adds without rolling into another day', () => {
    expect(compareDateTime(dt(2026, 10, 25, 9), dt(2026, 10, 25, 9))).toBe(0);
    expect(compareDateTime(dt(2026, 10, 25, 9), dt(2026, 10, 25, 10))).toBe(-1);
    expect(compareDateTime(dt(2026, 10, 26, 0), dt(2026, 10, 25, 23, 59, 59))).toBe(1);
    expect(isSameDateTime(dt(2026, 10, 25, 9), dt(2026, 10, 25, 9))).toBe(true);
    expect(addMinutes(t(23, 50), 20)).toEqual(t(23, 59, 59));
    expect(fromSeconds(86399)).toEqual(t(23, 59, 59));
    expect(fromSeconds(86400)).toEqual(t(23, 59, 59));
  });

  it('reads the locale clock', () => {
    expect(uses12HourClock('en-US')).toBe(true);
    expect(uses12HourClock('ar-EG')).toBe(true);
    expect(uses12HourClock('en-GB')).toBe(false);
    expect(hourCycleOf('en-GB')).toBe('h23');
  });
});

describe('time formatting', () => {
  it('formats the style keywords through Intl', () => {
    expect(formatTime('en-GB', t(15, 30), 'short')).toBe('15:30');
    expect(formatTime('en-GB', t(15, 30), 'medium')).toBe('15:30:00');
    expect(formatTime('en-US', t(15, 30), 'short')).toBe('3:30 PM');
    expect(formatTime('en-US', t(15, 30, 7), 'medium')).toBe('3:30:07 PM');
    expect(formatTime('ar-EG', t(15, 30), 'short')).toBe('٣:٣٠ م');
  });

  it('formats time patterns and localizes the digits', () => {
    expect(formatTime('en-GB', t(15, 30), 'HH:mm')).toBe('15:30');
    expect(formatTime('en-US', t(15, 30), 'hh:mm a')).toBe('03:30 PM');
    expect(formatTime('ar-EG', t(15, 30), 'hh:mm a')).toBe('٠٣:٣٠ م');
    expect(formatTime('ar-EG', t(15, 30), 'HH:mm')).toBe('١٥:٣٠');
    expect(formatTime('en-GB', t(9, 5, 7), 'H:m:s')).toBe('9:5:7');
    expect(formatTime('en-GB', t(9, 5, 7), 'HH:mm:ss')).toBe('09:05:07');
  });

  it('rejects invalid time patterns with a message', () => {
    expect(() => parseTimePattern('HH:MM')).toThrow(/Use "m" for minutes/);
    expect(() => parseTimePattern('yyyy HH:mm')).toThrow(/date letter/);
    expect(() => parseTimePattern('HH:mm a')).toThrow(/mixes/);
    expect(() => parseTimePattern('hh:mm:ss a')).not.toThrow();
    expect(() => parseTimePattern('HH:mm X')).toThrow(/not supported/);
  });

  it('joins date and time through one Intl formatter when both are styles', () => {
    expect(formatDateTime('en-US', dt(2026, 10, 25, 15, 30), 'medium', 'short')).toBe(
      'Oct 25, 2026, 3:30 PM',
    );
    expect(formatDateTime('ar-EG', dt(2026, 10, 25, 15, 30), 'long', 'short')).toBe(
      '٢٥ أكتوبر ٢٠٢٦ في ٣:٣٠ م',
    );
    expect(formatDateTime('en-GB', dt(2026, 10, 25, 15, 30), 'dd/MM/yyyy', 'HH:mm')).toBe(
      '25/10/2026, 15:30',
    );
    expect(formatDateTime('ar-EG', dt(2026, 10, 25, 15, 30), 'dd/MM/yyyy', 'HH:mm')).toBe(
      '٢٥/١٠/٢٠٢٦ في ١٥:٣٠',
    );
  });

  it('formats unit values and day periods', () => {
    expect(formatUnitValue('en-US', 30, 'minute')).toBe('30 minutes');
    expect(formatUnitValue('ar-EG', 30, 'minute')).toBe('٣٠ دقيقة');
    expect(formatTime('ar-EG', t(9), 'a')).toBe('ص');
    expect(formatTime('en-US', t(21), 'a')).toBe('PM');
  });
});

describe('time zones and DST', () => {
  it('resolves a unique Cairo summer time', () => {
    const result = resolveWallTime(dt(2026, 10, 25, 15), 'Africa/Cairo');
    expect(result?.kind).toBe('unique');
    expect(result?.offsetMinutes).toBe(180);
    expect(result?.instant).toBe(Date.UTC(2026, 9, 25, 12, 0, 0));
  });

  it('resolves the Cairo overlap with two offsets, earlier by default', () => {
    const result = resolveWallTime(dt(2026, 10, 29, 23, 30), 'Africa/Cairo');
    expect(result?.kind).toBe('ambiguous');
    expect(result?.alternatives.map((a) => a.offsetMinutes)).toEqual([180, 120]);
    expect(result?.offsetMinutes).toBe(180);
    expect(result?.instant).toBe(Date.UTC(2026, 9, 29, 20, 30, 0));
    expect(result?.alternatives[1].instant).toBe(Date.UTC(2026, 9, 29, 21, 30, 0));
  });

  it('resolves the Cairo gap and suggests the later wall time', () => {
    const result = resolveWallTime(dt(2026, 4, 24, 0, 30), 'Africa/Cairo');
    expect(result?.kind).toBe('nonexistent');
    expect(result?.dateTime).toEqual(dt(2026, 4, 24, 1, 30));
    expect(result?.offsetMinutes).toBe(180);
    expect(result?.instant).toBe(Date.UTC(2026, 3, 23, 22, 30, 0));
    expect(result?.alternatives[0].dateTime).toEqual(dt(2026, 4, 23, 23, 30));
    expect(result?.alternatives[0].offsetMinutes).toBe(120);
    expect(result?.alternatives[1].dateTime).toEqual(dt(2026, 4, 24, 1, 30));
  });

  it('honours the disambiguation option', () => {
    const earlier = resolveWallTime(dt(2026, 10, 29, 23, 30), 'Africa/Cairo', 'earlier');
    const later = resolveWallTime(dt(2026, 10, 29, 23, 30), 'Africa/Cairo', 'later');
    expect(earlier?.offsetMinutes).toBe(180);
    expect(later?.offsetMinutes).toBe(120);
    expect(() =>
      resolveWallTime(dt(2026, 10, 29, 23, 30), 'Africa/Cairo', 'reject'),
    ).toThrow(/occurs twice/);
    expect(() =>
      resolveWallTime(dt(2026, 4, 24, 0, 30), 'Africa/Cairo', 'reject'),
    ).toThrow(/does not exist/);
  });

  it('handles New York and Lord Howe', () => {
    const nyGap = resolveWallTime(dt(2026, 3, 8, 2, 30), 'America/New_York');
    expect(nyGap?.kind).toBe('nonexistent');
    expect(nyGap?.dateTime).toEqual(dt(2026, 3, 8, 3, 30));
    expect(nyGap?.offsetMinutes).toBe(-240);

    const nyOverlap = resolveWallTime(dt(2026, 11, 1, 1, 30), 'America/New_York');
    expect(nyOverlap?.kind).toBe('ambiguous');
    expect(nyOverlap?.alternatives.map((a) => a.offsetMinutes)).toEqual([-240, -300]);

    const lordHoweGap = resolveWallTime(dt(2026, 10, 4, 2, 15), 'Australia/Lord_Howe');
    expect(lordHoweGap?.kind).toBe('nonexistent');
    expect(lordHoweGap?.dateTime).toEqual(dt(2026, 10, 4, 2, 45));
    expect(lordHoweGap?.offsetMinutes).toBe(660);

    const lordHoweOverlap = resolveWallTime(dt(2026, 4, 5, 1, 45), 'Australia/Lord_Howe');
    expect(lordHoweOverlap?.kind).toBe('ambiguous');
    expect(lordHoweOverlap?.alternatives.map((a) => a.offsetMinutes)).toEqual([660, 630]);
  });

  it('has no DST in Riyadh and no answer for an invalid zone', () => {
    const riyadh = resolveWallTime(dt(2026, 10, 25, 15), 'Asia/Riyadh');
    expect(riyadh?.kind).toBe('unique');
    expect(riyadh?.offsetMinutes).toBe(180);
    expect(isValidTimeZone('Asia/Riyadh')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus')).toBe(false);
    expect(resolveWallTime(dt(2026, 10, 25, 15), 'Mars/Olympus')).toBeNull();
  });

  it('accepts a fixed offset zone, and rejects the GMT+3 label', () => {
    const fixed = resolveWallTime(dt(2026, 10, 25, 15), '+03:00');
    expect(fixed?.kind).toBe('unique');
    expect(fixed?.offsetMinutes).toBe(180);
    expect(fixed?.instant).toBe(Date.UTC(2026, 9, 25, 12, 0));
    expect(formatTimeZoneName('en-GB', '+03:00', fixed!.instant, 'short')).toBe('GMT+3');
    expect(formatTimeZoneName('en-GB', '+03:00', fixed!.instant, 'shortOffset')).toBe('GMT+3');

    const iana = resolveWallTime(dt(2026, 10, 25, 15), 'Etc/GMT-3');
    expect(iana?.kind).toBe('unique');
    expect(iana?.offsetMinutes).toBe(180);
    expect(iana?.instant).toBe(fixed?.instant);

    expect(isValidTimeZone('+03:00')).toBe(true);
    expect(isValidTimeZone('Etc/GMT-3')).toBe(true);
    expect(isValidTimeZone('GMT+3')).toBe(false);
    expect(resolveWallTime(dt(2026, 10, 25, 15), 'GMT+3')).toBeNull();
    expect(listTimeZones()).not.toContain('+03:00');
  });

  it('reads the zone offset and wall clock at an instant', () => {
    const instant = Date.UTC(2026, 9, 25, 12, 0, 0);
    expect(getTimeZoneOffsetMinutes('Africa/Cairo', instant)).toBe(180);
    expect(nowInTimeZone('Africa/Cairo', instant)).toEqual(dt(2026, 10, 25, 15));
    expect(todayInTimeZone('Africa/Cairo', instant)).toEqual(d(2026, 10, 25));
    expect(getTimeZoneOffsetMinutes('Mars/Olympus', instant)).toBeNull();
    expect(formatTimeZoneName('en-GB', 'Africa/Cairo', instant, 'short')).toBe('EEST');
    expect(formatTimeZoneName('en-GB', 'Africa/Cairo', instant, 'shortOffset')).toBe('GMT+3');
    expect(listTimeZones()).toContain('Africa/Cairo');
  });
});
