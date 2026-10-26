import { describe, expect, it } from 'vitest';
import { buildMonth, daysInMonth, toIso, weekdayOf } from '../src/public-api';
import type { RiviniaCalendarCell, RiviniaDate, RiviniaWeekday } from '../src/public-api';

const d = (year: number, month: number, day: number): RiviniaDate => ({ year, month, day });

/*
 * The grid is ALWAYS 6 rows × 7 columns, in every month of every year — a
 * calendar that changes height when the user pages between months is a
 * layout jump in the middle of an interaction. Days that belong to the
 * neighbouring months are `null`, not a greyed-out number: this is a
 * DAY PICKER, and offering the 30th of the previous month invites a click
 * that silently changes the month. (That decision is a D-entry.)
 *
 * Leading offsets below are hand-computed, not derived from the implementation:
 *   Oct 1 2026 = Thursday (ISO 4), Feb 1 2026 = Sunday (7), Feb 1 2024 = Thursday.
 */

const flatten = (month: { weeks: readonly { cells: readonly (RiviniaCalendarCell | null)[] }[] }) =>
  month.weeks.flatMap((week) => week.cells);

const days = (month: { weeks: readonly { cells: readonly (RiviniaCalendarCell | null)[] }[] }) =>
  flatten(month)
    .filter((cell): cell is RiviniaCalendarCell => cell !== null)
    .map((cell) => cell.date);

describe('buildMonth — the shape never changes', () => {
  it.each([
    { year: 2026, month: 10, firstDay: 7 as RiviniaWeekday },
    { year: 2026, month: 2, firstDay: 7 as RiviniaWeekday },
    { year: 2024, month: 2, firstDay: 1 as RiviniaWeekday },
    { year: 2026, month: 5, firstDay: 6 as RiviniaWeekday },
    { year: 2026, month: 12, firstDay: 7 as RiviniaWeekday },
  ])('$year-$month (firstDay $firstDay) is 6 × 7', ({ year, month, firstDay }) => {
    const built = buildMonth({ year, month, firstDay });
    expect(built.year).toBe(year);
    expect(built.month).toBe(month);
    expect(built.weeks).toHaveLength(6);
    for (const week of built.weeks) {
      expect(week.cells).toHaveLength(7);
    }
    expect(flatten(built)).toHaveLength(42);
  });

  it('is 6 × 7 for every month and every week start', () => {
    for (let month = 1; month <= 12; month++) {
      for (const firstDay of [1, 2, 3, 4, 5, 6, 7] as const) {
        const built = buildMonth({ year: 2026, month, firstDay });
        expect(built.weeks).toHaveLength(6);
        expect(flatten(built)).toHaveLength(42);
      }
    }
  });
});

describe('buildMonth — the leading blanks match the locale week start', () => {
  it.each([
    { firstDay: 7 as RiviniaWeekday, leading: 4, why: 'Sunday start, the 1st is a Thursday' },
    { firstDay: 1 as RiviniaWeekday, leading: 3, why: 'Monday start' },
    { firstDay: 6 as RiviniaWeekday, leading: 5, why: 'Saturday start (Egypt)' },
    { firstDay: 4 as RiviniaWeekday, leading: 0, why: 'the 1st is a Thursday' },
  ])('Oct 2026, $why → $leading blanks', ({ firstDay, leading }) => {
    const flat = flatten(buildMonth({ year: 2026, month: 10, firstDay }));
    expect(flat.slice(0, leading).every((cell) => cell === null)).toBe(true);
    expect(flat[leading]).not.toBeNull();
    expect(flat[leading]?.date).toEqual(d(2026, 10, 1));
  });

  it.each([
    { firstDay: 7 as RiviniaWeekday, leading: 0, why: 'Sunday start, the 1st is a Sunday' },
    { firstDay: 1 as RiviniaWeekday, leading: 6, why: 'Monday start' },
    { firstDay: 6 as RiviniaWeekday, leading: 1, why: 'Saturday start' },
  ])('Feb 2026, $why → $leading blanks', ({ firstDay, leading }) => {
    const flat = flatten(buildMonth({ year: 2026, month: 2, firstDay }));
    expect(flat.slice(0, leading).every((cell) => cell === null)).toBe(true);
    expect(flat[leading]?.date).toEqual(d(2026, 2, 1));
  });

  it('has no leading blanks when the month starts on the locale first day', () => {
    const flat = flatten(buildMonth({ year: 2026, month: 2, firstDay: 7 }));
    expect(flat[0]?.date).toEqual(d(2026, 2, 1));
  });
});

describe('buildMonth — only days of the month, consecutive, no overflow', () => {
  it.each([
    { year: 2026, month: 10, days: 31 },
    { year: 2026, month: 2, days: 28 },
    { year: 2024, month: 2, days: 29 },
    { year: 2026, month: 4, days: 30 },
    { year: 2026, month: 12, days: 31 },
  ])('$year-$month has exactly $days cells', ({ year, month, days: count }) => {
    const built = buildMonth({ year, month, firstDay: 7 });
    const dates = days(built);
    expect(dates).toHaveLength(count);
    expect(dates[0]).toEqual(d(year, month, 1));
    expect(dates[count - 1]).toEqual(d(year, month, count));
    expect(count).toBe(daysInMonth(year, month));
  });

  it('is strictly consecutive from the 1st to the last day', () => {
    const dates = days(buildMonth({ year: 2026, month: 10, firstDay: 6 }));
    dates.forEach((date, index) => {
      expect(date).toEqual(d(2026, 10, index + 1));
      expect(date.month).toBe(10);
      expect(date.year).toBe(2026);
    });
  });

  it('never leaks a date from the previous or the next month', () => {
    for (let month = 1; month <= 12; month++) {
      for (const date of days(buildMonth({ year: 2026, month, firstDay: 1 }))) {
        expect(date.year).toBe(2026);
        expect(date.month).toBe(month);
      }
    }
  });

  it('trailing blanks fill the grid to 42 cells', () => {
    const flat = flatten(buildMonth({ year: 2026, month: 2, firstDay: 7 }));
    // 28 days from index 0 → 14 trailing blanks.
    expect(flat.slice(28)).toHaveLength(14);
    expect(flat.slice(28).every((cell) => cell === null)).toBe(true);
  });
});

describe('buildMonth — the per-day flags', () => {
  const built = buildMonth({
    year: 2026,
    month: 10,
    firstDay: 7,
    today: d(2026, 10, 25),
    selected: d(2026, 10, 10),
    focused: d(2026, 10, 5),
  });
  const cellOn = (day: number) =>
    flatten(built).find((cell) => cell !== null && cell.date.day === day) as RiviniaCalendarCell;

  it('marks today', () => {
    expect(cellOn(25).today).toBe(true);
    expect(cellOn(24).today).toBe(false);
  });

  it('marks the selected day', () => {
    expect(cellOn(10).selected).toBe(true);
    expect(cellOn(11).selected).toBe(false);
  });

  it('marks the focused day (the roving tabindex target)', () => {
    expect(cellOn(5).focused).toBe(true);
    expect(cellOn(6).focused).toBe(false);
  });

  it('leaves every flag false when no value is supplied', () => {
    const plain = buildMonth({ year: 2026, month: 10, firstDay: 7 });
    for (const cell of flatten(plain)) {
      if (cell === null) continue;
      expect(cell.today).toBe(false);
      expect(cell.selected).toBe(false);
      expect(cell.focused).toBe(false);
      expect(cell.disabled).toBe(false);
    }
  });

  it('flags a day outside the month as neither today nor selected', () => {
    // 25 Oct 2026 is a Sunday; in a Monday-start October grid, 1 Nov is NOT
    // rendered at all — this asserts the "no overflow" decision.
    const dates = days(built).map(toIso);
    expect(dates).not.toContain('2026-11-01');
    expect(dates).not.toContain('2026-09-30');
  });
});

describe('buildMonth — disabled days', () => {
  it('applies the predicate to every day of the month', () => {
    const seen: RiviniaDate[] = [];
    const built = buildMonth({
      year: 2026,
      month: 10,
      firstDay: 7,
      isDisabled: (date) => {
        seen.push(date);
        return weekdayOf(date) === 5;
      },
    });
    expect(seen).toHaveLength(31);
    expect(seen.every((date) => date.month === 10 && date.year === 2026)).toBe(true);

    const fridays = flatten(built).filter(
      (cell): cell is RiviniaCalendarCell => cell !== null && cell.disabled,
    );
    expect(fridays.map((cell) => cell.date.day)).toEqual([2, 9, 16, 23, 30]);

    const enabled = flatten(built).filter(
      (cell): cell is RiviniaCalendarCell => cell !== null && !cell.disabled,
    );
    expect(enabled).toHaveLength(31 - 5);
    expect(enabled.every((cell) => weekdayOf(cell.date) !== 5)).toBe(true);
  });

  it('does not call the predicate for a padding cell', () => {
    const seen: string[] = [];
    buildMonth({
      year: 2026,
      month: 10,
      firstDay: 7,
      isDisabled: (date) => {
        seen.push(toIso(date));
        return false;
      },
    });
    expect(seen).toHaveLength(31);
  });

  it('total-blocking works: every day disabled', () => {
    const built = buildMonth({
      year: 2026,
      month: 10,
      firstDay: 7,
      isDisabled: () => true,
    });
    expect(
      flatten(built)
        .filter((cell): cell is RiviniaCalendarCell => cell !== null)
        .every((cell) => cell.disabled),
    ).toBe(true);
  });
});
