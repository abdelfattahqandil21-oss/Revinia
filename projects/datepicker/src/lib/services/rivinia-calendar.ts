import { computed, inject, Injectable, signal } from '@angular/core';
import type {
  RiviniaCalendarView,
  RiviniaDate,
  RiviniaDatepickerConfig,
  RiviniaDatepickerLabels,
  RiviniaWeekday,
} from '../models/date-types';
import type {
  RiviniaCalendarAction,
  RiviniaCalendarMonth,
  RiviniaCalendarMonthOption,
  RiviniaCalendarResult,
  RiviniaCalendarYearOption,
  RiviniaWeekdayName,
} from '../models/calendar-types';
import { DATE_PICKER_CONFIG } from '../providers/datepicker-config';
import {
  addDays,
  addMonths,
  addYears,
  compare,
  daysInMonth,
  endOfWeek,
  isSameDay,
  isValidDate,
  parseDate,
  startOfWeek,
  todayDate,
  toIso,
} from '../utils/date-math';
import { buildMonth } from '../utils/calendar-month';
import { firstDayOf } from '../utils/week-info';
import {
  formatMonthName,
  formatViewHeading,
  formatYear,
  weekdaysOf,
} from '../utils/date-format';
import { datepickerLabelsFor } from '../models/date-types';

/**
 * The whole behaviour of the calendar, with no DOM.
 *
 * One instance per picker: it holds the focused day (the roving tabindex
 * target), the visible view, the value and the range. `rv-datepicker` provides
 * it at component level; a consumer building their own UI provides it where
 * their state lives and injects it with `injectRiviniaDatepicker()`.
 */
@Injectable()
export class RiviniaCalendar {
  private readonly config = inject<RiviniaDatepickerConfig>(DATE_PICKER_CONFIG);

  private readonly _locale = signal(this.config.locale ?? 'en-US');
  private readonly _firstDayOverride = signal<RiviniaWeekday | null>(
    this.config.firstDay ?? null,
  );
  private readonly _selected = signal<RiviniaDate | null>(parseDate(this.config.selected));
  private readonly _min = signal<RiviniaDate | null>(parseDate(this.config.min));
  private readonly _max = signal<RiviniaDate | null>(parseDate(this.config.max));
  private readonly _today = signal<RiviniaDate>(
    parseDate(this.config.today) ?? todayDate(),
  );
  private readonly _view = signal<RiviniaCalendarView>(this.config.view ?? 'day');
  private readonly _labelOverrides = signal<Partial<RiviniaDatepickerLabels>>({});
  /** Not clamped to the range: a disabled day is still focusable (aria-disabled). */
  private readonly _focused = signal<RiviniaDate>(this.initialFocus());

  readonly locale = this._locale.asReadonly();
  readonly selected = this._selected.asReadonly();
  readonly view = this._view.asReadonly();
  readonly today = this._today.asReadonly();
  readonly min = this._min.asReadonly();
  readonly max = this._max.asReadonly();
  readonly focused = this._focused.asReadonly();

  readonly firstDay = computed<RiviniaWeekday>(
    () => this._firstDayOverride() ?? firstDayOf(this._locale()),
  );

  readonly labels = computed<RiviniaDatepickerLabels>(() => ({
    ...datepickerLabelsFor(this._locale()),
    ...(this.config.labels ?? {}),
    ...this._labelOverrides(),
  }));

  readonly weekdays = computed<readonly RiviniaWeekdayName[]>(() =>
    weekdaysOf(this._locale(), this.firstDay()),
  );

  /** The first day of the focused month. */
  readonly month = computed<RiviniaDate>(() => {
    const focused = this._focused();
    return { year: focused.year, month: focused.month, day: 1 };
  });

  /** The first year of the 12-year page shown by the year view. */
  readonly decade = computed<number>(() => {
    const year = this._focused().year;
    return year - (year % 12);
  });

  readonly monthGrid = computed<RiviniaCalendarMonth>(() => {
    const focused = this._focused();
    return buildMonth({
      year: focused.year,
      month: focused.month,
      firstDay: this.firstDay(),
      today: this._today(),
      selected: this._selected(),
      focused,
      isDisabled: (date) => !this.canSelect(date),
    });
  });

  readonly heading = computed<string>(() =>
    formatViewHeading(this._locale(), this._view(), this.month(), this.decade()),
  );

  readonly months = computed<readonly RiviniaCalendarMonthOption[]>(() => {
    const year = this._focused().year;
    const current = this._focused().month;
    const locale = this._locale();
    return Array.from({ length: 12 }, (_, index) => {
      const month = index + 1;
      return {
        month,
        label: formatMonthName(locale, year, month),
        current: month === current,
        disabled: this.isMonthDisabled(year, month),
      };
    });
  });

  readonly years = computed<readonly RiviniaCalendarYearOption[]>(() => {
    const start = this.decade();
    const current = this._focused().year;
    const locale = this._locale();
    return Array.from({ length: 12 }, (_, index) => {
      const year = start + index;
      return {
        year,
        label: formatYear(locale, year),
        current: year === current,
        disabled: this.isYearDisabled(year),
      };
    });
  });

  /** True when the day is inside `[min, max]` (both ends inclusive). */
  readonly canSelect = (date: RiviniaDate): boolean => {
    const min = this._min();
    const max = this._max();
    if (min && compare(date, min) < 0) return false;
    if (max && compare(date, max) > 0) return false;
    return true;
  };

  /** A month is disabled only when the WHOLE month is out of range. */
  isMonthDisabled(year: number, month: number): boolean {
    const first = { year, month, day: 1 };
    const last = { year, month, day: daysInMonth(year, month) };
    return !this.canSelect(first) && !this.canSelect(last);
  }

  /** A year is disabled only when the WHOLE year is out of range. */
  isYearDisabled(year: number): boolean {
    return (
      !this.canSelect({ year, month: 1, day: 1 }) &&
      !this.canSelect({ year, month: 12, day: 31 })
    );
  }

  setLocale(locale: string): void {
    this._locale.set(locale);
  }

  setFirstDay(firstDay: RiviniaWeekday | null): void {
    this._firstDayOverride.set(firstDay);
  }

  setToday(date: RiviniaDate | string | null): void {
    this._today.set(parseDate(date) ?? todayDate());
  }

  setBounds(min: RiviniaDate | string | null, max: RiviniaDate | string | null): void {
    this._min.set(parseDate(min));
    this._max.set(parseDate(max));

    const focused = this._focused();
    const clamped = this.clamp(focused);
    if (!isSameDay(clamped, focused)) {
      this._focused.set(clamped);
    }
  }

  /**
   * Sets the value. A non-null value also brings the view to that month — an
   * external value arriving (a form reset, a server payload) must be visible
   * without the user paging to it.
   */
  setSelected(value: RiviniaDate | string | null): void {
    const date = parseDate(value);
    this._selected.set(date);
    if (date) this._focused.set(date);
  }

  setLabels(labels: Partial<RiviniaDatepickerLabels>): void {
    this._labelOverrides.set(labels ?? {});
  }

  focus(date: RiviniaDate): void {
    if (!isValidDate(date)) return;
    this._focused.set(date);
  }

  select(date: RiviniaDate): boolean {
    if (!this.canSelect(date)) return false;
    this._selected.set(date);
    this._focused.set(date);
    return true;
  }

  clear(): void {
    this._selected.set(null);
  }

  setView(view: RiviniaCalendarView): void {
    this._view.set(view);
  }

  goToToday(): void {
    this._focused.set(this.clamp(this._today()));
  }

  /** Picks the focused day; `null` when it is disabled. */
  selectFocused(): RiviniaDate | null {
    const focused = this._focused();
    if (!this.canSelect(focused)) return null;
    this._selected.set(focused);
    return focused;
  }

  /** Chosen from the month view; keeps the day of month (clamped). */
  chooseMonth(month: number): boolean {
    const focused = this._focused();
    if (this.isMonthDisabled(focused.year, month)) return false;
    this._focused.set(addMonths(focused, month - focused.month));
    this._view.set('day');
    return true;
  }

  /** Chosen from the year view; keeps month and day (clamped). */
  chooseYear(year: number): boolean {
    if (this.isYearDisabled(year)) return false;
    const focused = this._focused();
    this._focused.set(addYears(focused, year - focused.year));
    this._view.set('month');
    return true;
  }

  /**
   * The single keyboard/pointer command entry point, so the view semantics
   * live in one place: `Enter` commits in the day view but navigates in the
   * month and year views; `Escape` always cancels.
   */
  applyAction(action: RiviniaCalendarAction): RiviniaCalendarResult {
    if (action === 'close') return 'cancel';

    if (action === 'select') {
      if (this._view() === 'day') {
        return this.selectFocused() ? 'commit' : null;
      }
      if (this._view() === 'month') {
        this.chooseMonth(this._focused().month);
        return 'moved';
      }
      this.chooseYear(this._focused().year);
      return 'moved';
    }

    this.move(action);
    return 'moved';
  }

  /** A stable id per month, handy as a DOM key. */
  monthKey(): string {
    return toIso(this.month()).slice(0, 7);
  }

  private initialFocus(): RiviniaDate {
    return this.clamp(this._selected() ?? this._today());
  }

  private clamp(date: RiviniaDate): RiviniaDate {
    const min = this._min();
    const max = this._max();
    if (min && compare(date, min) < 0) return min;
    if (max && compare(date, max) > 0) return max;
    return date;
  }

  private move(action: RiviniaCalendarAction): void {
    const focused = this._focused();
    const view = this._view();

    if (view === 'day') {
      this._focused.set(this.moveDay(focused, action));
      return;
    }
    if (view === 'month') {
      this._focused.set(this.moveMonth(focused, action));
      return;
    }
    this._focused.set(this.moveYear(focused, action));
  }

  private moveDay(focused: RiviniaDate, action: RiviniaCalendarAction): RiviniaDate {
    switch (action) {
      case 'move-previous':
        return addDays(focused, -1);
      case 'move-next':
        return addDays(focused, 1);
      case 'move-row-up':
        return addDays(focused, -7);
      case 'move-row-down':
        return addDays(focused, 7);
      case 'move-row-start':
        return startOfWeek(focused, this.firstDay());
      case 'move-row-end':
        return endOfWeek(focused, this.firstDay());
      case 'page-back':
        return addMonths(focused, -1);
      case 'page-forward':
        return addMonths(focused, 1);
      case 'page-back-year':
        return addYears(focused, -1);
      case 'page-forward-year':
        return addYears(focused, 1);
      default:
        return focused;
    }
  }

  private moveMonth(focused: RiviniaDate, action: RiviniaCalendarAction): RiviniaDate {
    switch (action) {
      case 'move-previous':
        return addMonths(focused, -1);
      case 'move-next':
        return addMonths(focused, 1);
      case 'move-row-up':
        return addMonths(focused, -3);
      case 'move-row-down':
        return addMonths(focused, 3);
      case 'move-row-start':
        return addMonths(focused, -((focused.month - 1) % 3));
      case 'move-row-end': {
        const start = focused.month - ((focused.month - 1) % 3);
        return addMonths(focused, start + 2 - focused.month);
      }
      case 'page-back':
        return addYears(focused, -1);
      case 'page-forward':
        return addYears(focused, 1);
      case 'page-back-year':
        return addYears(focused, -12);
      case 'page-forward-year':
        return addYears(focused, 12);
      default:
        return focused;
    }
  }

  private moveYear(focused: RiviniaDate, action: RiviniaCalendarAction): RiviniaDate {
    const offset = focused.year - this.decade();
    switch (action) {
      case 'move-previous':
        return addYears(focused, -1);
      case 'move-next':
        return addYears(focused, 1);
      case 'move-row-up':
        return addYears(focused, -3);
      case 'move-row-down':
        return addYears(focused, 3);
      case 'move-row-start':
        return addYears(focused, -(offset % 3));
      case 'move-row-end': {
        const start = focused.year - (offset % 3);
        return addYears(focused, start + 2 - focused.year);
      }
      case 'page-back':
        return addYears(focused, -12);
      case 'page-forward':
        return addYears(focused, 12);
      case 'page-back-year':
        return addYears(focused, -120);
      case 'page-forward-year':
        return addYears(focused, 120);
      default:
        return focused;
    }
  }
}
