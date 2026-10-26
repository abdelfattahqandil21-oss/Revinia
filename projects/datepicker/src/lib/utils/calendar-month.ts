import type {
  RiviniaBuildMonthInput,
  RiviniaCalendarCell,
  RiviniaCalendarMonth,
  RiviniaCalendarWeek,
} from '../models/calendar-types';
import { daysInMonth, isSameDay, weekdayOf } from './date-math';

/**
 * Build the six-by-seven grid for one month.
 *
 * Two deliberate rules, both visible in the tests:
 *  - the grid is ALWAYS 6 × 7, so paging between months never changes the
 *    panel's height mid-interaction;
 *  - a day that belongs to the neighbouring month is `null`, not a greyed-out
 *    number that looks clickable. It is a day picker: showing the 30th of the
 *    previous month invites a click that silently changes the month.
 */
export function buildMonth(input: RiviniaBuildMonthInput): RiviniaCalendarMonth {
  const { year, month, firstDay, isDisabled } = input;
  const today = input.today ?? null;
  const selected = input.selected ?? null;
  const focused = input.focused ?? null;

  const total = daysInMonth(year, month);
  const lead = (weekdayOf({ year, month, day: 1 }) - firstDay + 7) % 7;

  const weeks: RiviniaCalendarWeek[] = [];
  let day = 1;

  for (let row = 0; row < 6; row++) {
    const cells: (RiviniaCalendarCell | null)[] = [];
    for (let column = 0; column < 7; column++) {
      const index = row * 7 + column;
      if (index < lead || day > total) {
        cells.push(null);
        continue;
      }
      const date = { year, month, day };
      cells.push({
        date,
        today: isSameDay(date, today),
        selected: isSameDay(date, selected),
        focused: isSameDay(date, focused),
        disabled: isDisabled ? isDisabled(date) === true : false,
      });
      day++;
    }
    weeks.push({ cells });
  }

  return { year, month, weeks };
}
