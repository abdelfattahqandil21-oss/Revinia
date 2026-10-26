import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DATE_PICKER_CONFIG, RiviniaCalendar, provideRiviniaDatepicker } from '../src/public-api';
import type {
  RiviniaCalendarView,
  RiviniaDate,
  RiviniaDatepickerConfig,
  RiviniaWeekday,
} from '../src/public-api';

const d = (year: number, month: number, day: number): RiviniaDate => ({ year, month, day });

/*
 * The headless calendar is the whole product: state, range rules, and the
 * meaning of every action in every view. The UI only renders it.
 *
 * `today` is pinned through the config (also the SSR seam: the server's date
 * and the browser's date must agree at hydration time).
 */

const TODAY = d(2026, 10, 25);

function create(config: RiviniaDatepickerConfig = {}): RiviniaCalendar {
  // Several specs need two independent calendars (en-US vs ar-EG) in one test,
  // so each `create` starts from a clean injector.
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      RiviniaCalendar,
      { provide: DATE_PICKER_CONFIG, useValue: { today: TODAY, ...config } },
    ],
  });
  return TestBed.inject(RiviniaCalendar);
}

describe('RiviniaCalendar — initial state', () => {
  let calendar: RiviniaCalendar;
  beforeEach(() => {
    calendar = create({ locale: 'en-US' });
  });

  it('starts empty, on today, in the day view', () => {
    expect(calendar.selected()).toBeNull();
    expect(calendar.focused()).toEqual(TODAY);
    expect(calendar.today()).toEqual(TODAY);
    expect(calendar.view()).toBe('day');
    expect(calendar.month()).toEqual(d(2026, 10, 1));
    expect(calendar.locale()).toBe('en-US');
  });

  it('derives the week start from the locale', () => {
    expect(calendar.firstDay()).toBe(7);
    expect(calendar.weekdays().map((day) => day.weekday)).toEqual([7, 1, 2, 3, 4, 5, 6]);
    expect(calendar.weekdays()[0].long).toBe('Sunday');
  });

  it('renders the month of today, with today marked', () => {
    const flat = calendar.monthGrid().weeks.flatMap((week) => week.cells);
    expect(flat.filter((cell) => cell !== null)).toHaveLength(31);
    const todaysCell = flat.find((cell) => cell !== null && cell.date.day === 25);
    expect(todaysCell?.today).toBe(true);
    expect(todaysCell?.focused).toBe(true);
    expect(calendar.heading()).toBe('October 2026');
  });

  it('honours an explicit firstDay over the locale', () => {
    const monday = create({ locale: 'en-US', firstDay: 1 });
    expect(monday.firstDay()).toBe(1);
    expect(monday.weekdays()[0].long).toBe('Monday');
  });

  it('starts on the selected value when there is one, and marks it', () => {
    const selected = create({ locale: 'en-US', selected: d(2026, 3, 15) });
    expect(selected.selected()).toEqual(d(2026, 3, 15));
    expect(selected.focused()).toEqual(d(2026, 3, 15));
    expect(selected.month()).toEqual(d(2026, 3, 1));
    expect(selected.heading()).toBe('March 2026');
    expect(
      selected
        .monthGrid()
        .weeks.flatMap((week) => week.cells)
        .find((cell) => cell !== null && cell.date.day === 15)?.selected,
    ).toBe(true);
  });

  it('accepts ISO strings for every date input', () => {
    const fromStrings = create({
      locale: 'en-US',
      selected: '2026-03-15',
      min: '2026-01-01',
      max: '2026-12-31',
    });
    expect(fromStrings.selected()).toEqual(d(2026, 3, 15));
    expect(fromStrings.min()).toEqual(d(2026, 1, 1));
    expect(fromStrings.max()).toEqual(d(2026, 12, 31));
  });

  it('reads the labels by locale language, with a per-key override', () => {
    expect(create({ locale: 'ar-EG' }).labels().chooseDate).toMatch(/[\u0600-\u06FF]/);
    const overridden = create({ locale: 'en-US', labels: { chooseDate: 'Pick a day' } });
    expect(overridden.labels().chooseDate).toBe('Pick a day');
    expect(overridden.labels().nextMonth).toBe('Next month');
  });

  it('uses Arabic when the locale is Arabic', () => {
    const arabic = create({ locale: 'ar-EG' });
    expect(arabic.heading()).toBe('أكتوبر ٢٠٢٦');
    expect(arabic.weekdays()[0].long).toBe('السبت');
    expect(arabic.firstDay()).toBe(6);
    expect(arabic.labels().chooseDate).toBe('اختر التاريخ');
  });
});

describe('RiviniaCalendar — range bounds', () => {
  it('clamps the initial focus into [min, max]', () => {
    const future = create({ min: d(2027, 1, 1) });
    expect(future.focused()).toEqual(d(2027, 1, 1));

    const past = create({ max: d(2026, 1, 1) });
    expect(past.focused()).toEqual(d(2026, 1, 1));
  });

  it('canSelect is inclusive of both ends', () => {
    const calendar = create({ min: d(2026, 10, 10), max: d(2026, 10, 20) });
    expect(calendar.canSelect(d(2026, 10, 9))).toBe(false);
    expect(calendar.canSelect(d(2026, 10, 10))).toBe(true);
    expect(calendar.canSelect(d(2026, 10, 15))).toBe(true);
    expect(calendar.canSelect(d(2026, 10, 20))).toBe(true);
    expect(calendar.canSelect(d(2026, 10, 21))).toBe(false);
  });

  it('refuses to select outside the range', () => {
    const calendar = create({ min: d(2026, 10, 10), max: d(2026, 10, 20) });
    expect(calendar.select(d(2026, 10, 9))).toBe(false);
    expect(calendar.selected()).toBeNull();
    expect(calendar.select(d(2026, 10, 15))).toBe(true);
    expect(calendar.selected()).toEqual(d(2026, 10, 15));
  });

  it('marks out-of-range days as disabled in the grid', () => {
    const calendar = create({ min: d(2026, 10, 10), max: d(2026, 10, 20) });
    const cells = calendar.monthGrid().weeks.flatMap((week) => week.cells);
    const byDay = (day: number) =>
      cells.find((cell) => cell !== null && cell.date.day === day);
    expect(byDay(9)?.disabled).toBe(true);
    expect(byDay(10)?.disabled).toBe(false);
    expect(byDay(20)?.disabled).toBe(false);
    expect(byDay(21)?.disabled).toBe(true);
  });

  it('re-clamps the focus when the bounds change', () => {
    const calendar = create({ locale: 'en-US' });
    calendar.setBounds(d(2026, 12, 1), null);
    expect(calendar.focused()).toEqual(d(2026, 12, 1));
  });

  it('disables a month only when the WHOLE month is out of range', () => {
    const calendar = create({ min: d(2026, 10, 10), max: d(2026, 11, 5) });
    calendar.setView('month');
    const october = calendar.months().find((month) => month.month === 10);
    const november = calendar.months().find((month) => month.month === 11);
    const december = calendar.months().find((month) => month.month === 12);
    const september = calendar.months().find((month) => month.month === 9);
    expect(october?.disabled).toBe(false);
    expect(november?.disabled).toBe(false);
    expect(december?.disabled).toBe(true);
    expect(september?.disabled).toBe(true);
  });

  it('disables a year only when the WHOLE year is out of range', () => {
    const calendar = create({ min: d(2026, 6, 1) });
    calendar.setView('year');
    const years = calendar.years();
    expect(years.find((year) => year.year === 2025)?.disabled).toBe(true);
    expect(years.find((year) => year.year === 2026)?.disabled).toBe(false);
    expect(years.find((year) => year.year === 2027)?.disabled).toBe(false);
  });
});

describe('RiviniaCalendar — day-view actions', () => {
  let calendar: RiviniaCalendar;
  beforeEach(() => {
    calendar = create({ locale: 'en-US' });
  });

  it('moves by one day and keeps the month in sync', () => {
    calendar.applyAction('move-next');
    expect(calendar.focused()).toEqual(d(2026, 10, 26));
    calendar.applyAction('move-previous');
    expect(calendar.focused()).toEqual(d(2026, 10, 25));
  });

  it('crosses a month boundary and re-renders that month', () => {
    calendar.focus(d(2026, 10, 31));
    calendar.applyAction('move-next');
    expect(calendar.focused()).toEqual(d(2026, 11, 1));
    expect(calendar.month()).toEqual(d(2026, 11, 1));
    expect(calendar.heading()).toBe('November 2026');
  });

  it('moves a week with the row actions', () => {
    calendar.applyAction('move-row-up');
    expect(calendar.focused()).toEqual(d(2026, 10, 18));
    calendar.applyAction('move-row-down');
    expect(calendar.focused()).toEqual(d(2026, 10, 25));
  });

  it('Home/End go to the locale week start/end', () => {
    calendar.applyAction('move-row-start');
    expect(calendar.focused()).toEqual(d(2026, 10, 25)); // Sunday start
    calendar.applyAction('move-row-end');
    expect(calendar.focused()).toEqual(d(2026, 10, 31));
  });

  it('Home/End follow a Monday week start', () => {
    const monday = create({ locale: 'en-GB' });
    monday.focus(d(2026, 10, 25));
    monday.applyAction('move-row-start');
    expect(monday.focused()).toEqual(d(2026, 10, 19));
    monday.applyAction('move-row-end');
    expect(monday.focused()).toEqual(d(2026, 10, 25));
  });

  it('Home/End follow a Saturday week start (Egypt)', () => {
    const egypt = create({ locale: 'ar-EG' });
    egypt.focus(d(2026, 10, 25));
    egypt.applyAction('move-row-start');
    expect(egypt.focused()).toEqual(d(2026, 10, 24));
    egypt.applyAction('move-row-end');
    expect(egypt.focused()).toEqual(d(2026, 10, 30));
  });

  it('PageUp/PageDown step a month, clamping the day', () => {
    calendar.focus(d(2026, 1, 31));
    calendar.applyAction('page-forward');
    expect(calendar.focused()).toEqual(d(2026, 2, 28));
    calendar.applyAction('page-forward');
    expect(calendar.focused()).toEqual(d(2026, 3, 28));
  });

  it('Shift+Page steps a year, clamping 29 February', () => {
    calendar.focus(d(2024, 2, 29));
    calendar.applyAction('page-forward-year');
    expect(calendar.focused()).toEqual(d(2025, 2, 28));
  });

  it('keeps the focused day visible in the grid after every move', () => {
    for (const action of ['page-forward', 'move-next', 'move-row-down', 'page-back-year'] as const) {
      calendar.applyAction(action);
      const focused = calendar.focused();
      expect(calendar.month().year).toBe(focused.year);
      expect(calendar.month().month).toBe(focused.month);
      expect(
        calendar
          .monthGrid()
          .weeks.flatMap((week) => week.cells)
          .some((cell) => cell !== null && cell.focused),
      ).toBe(true);
    }
  });

  it('can focus a disabled day (aria-disabled stays focusable) but not select it', () => {
    const bounded = create({ min: d(2026, 10, 10) });
    bounded.focus(d(2026, 10, 9));
    expect(bounded.focused()).toEqual(d(2026, 10, 9));
    expect(bounded.selectFocused()).toBeNull();
  });

  it('selectFocused commits and returns the date', () => {
    calendar.focus(d(2026, 10, 12));
    expect(calendar.selectFocused()).toEqual(d(2026, 10, 12));
    expect(calendar.selected()).toEqual(d(2026, 10, 12));
  });

  it('clear empties the value without moving the focus', () => {
    calendar.select(d(2026, 10, 12));
    calendar.clear();
    expect(calendar.selected()).toBeNull();
    expect(calendar.focused()).toEqual(d(2026, 10, 12));
  });

  it('goToToday focuses today', () => {
    calendar.focus(d(2020, 1, 1));
    calendar.goToToday();
    expect(calendar.focused()).toEqual(TODAY);
    expect(calendar.month()).toEqual(d(2026, 10, 1));
  });
});

describe('RiviniaCalendar — applyAction contract', () => {
  it('a day pick commits', () => {
    const calendar = create({ locale: 'en-US' });
    expect(calendar.applyAction('select')).toBe('commit');
    expect(calendar.selected()).toEqual(TODAY);
  });

  it('Escape cancels, and cancelling does not change the value', () => {
    const calendar = create({ locale: 'en-US', selected: d(2026, 10, 1) });
    calendar.focus(d(2026, 10, 20));
    expect(calendar.applyAction('close')).toBe('cancel');
    expect(calendar.selected()).toEqual(d(2026, 10, 1));
  });

  it('every movement reports "moved"', () => {
    const calendar = create({ locale: 'en-US' });
    for (const action of [
      'move-previous',
      'move-next',
      'move-row-up',
      'move-row-down',
      'move-row-start',
      'move-row-end',
      'page-back',
      'page-forward',
      'page-back-year',
      'page-forward-year',
    ] as const) {
      expect(calendar.applyAction(action)).toBe('moved');
    }
  });
});

describe('RiviniaCalendar — month view', () => {
  let calendar: RiviniaCalendar;
  beforeEach(() => {
    calendar = create({ locale: 'en-US' });
    calendar.setView('month');
  });

  it('shows the 12 months of the focused year, localized, with the current one marked', () => {
    const months = calendar.months();
    expect(months).toHaveLength(12);
    expect(months.map((month) => month.month)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
    ]);
    expect(months[9].label).toBe('October');
    expect(months[9].current).toBe(true);
    expect(months[0].current).toBe(false);
    expect(calendar.heading()).toBe('2026');
  });

  it('localizes the month labels', () => {
    const arabic = create({ locale: 'ar-EG' });
    arabic.setView('month');
    expect(arabic.months()[0].label).toBe('يناير');
    expect(arabic.heading()).toBe('٢٠٢٦');
  });

  it('moves by a month, a row of three, and a page of years', () => {
    calendar.applyAction('move-next');
    expect(calendar.focused().month).toBe(11);
    calendar.applyAction('move-next');
    expect(calendar.focused()).toEqual(d(2026, 12, 25));

    calendar.setView('month');
    calendar.applyAction('move-row-down'); // +3 months from December → March 2027
    expect(calendar.focused()).toEqual(d(2027, 3, 25));

    calendar.setView('month');
    calendar.applyAction('page-forward'); // +1 year
    expect(calendar.focused().year).toBe(2028);
  });

  it('row start/end snap to the 3-month row', () => {
    calendar.focus(d(2026, 5, 25));
    calendar.applyAction('move-row-start');
    expect(calendar.focused().month).toBe(4); // Apr, May, Jun
    calendar.applyAction('move-row-end');
    expect(calendar.focused().month).toBe(6);
  });

  it('Enter picks the focused month and returns to the day view', () => {
    calendar.focus(d(2026, 5, 25));
    expect(calendar.applyAction('select')).toBe('moved');
    expect(calendar.view()).toBe('day');
    expect(calendar.month()).toEqual(d(2026, 5, 1));
    expect(calendar.selected()).toBeNull();
  });

  it('choosing a month keeps the day, so the day view lands in the right place', () => {
    calendar.focus(d(2026, 10, 25));
    calendar.chooseMonth(2);
    expect(calendar.view()).toBe('day');
    expect(calendar.focused()).toEqual(d(2026, 2, 25));
    expect(calendar.month()).toEqual(d(2026, 2, 1));
  });

  it('choosing a month clamps the day (31 → 28)', () => {
    calendar.focus(d(2026, 1, 31));
    calendar.chooseMonth(2);
    expect(calendar.focused()).toEqual(d(2026, 2, 28));
  });

  it('refuses to choose a fully disabled month', () => {
    const bounded = create({ max: d(2026, 6, 30) });
    bounded.setView('month');
    expect(bounded.chooseMonth(12)).toBe(false);
    expect(bounded.view()).toBe('month');
    expect(bounded.chooseMonth(3)).toBe(true);
    expect(bounded.view()).toBe('day');
  });
});

describe('RiviniaCalendar — year view', () => {
  let calendar: RiviniaCalendar;
  beforeEach(() => {
    calendar = create({ locale: 'en-US' });
    calendar.setView('year');
  });

  it('shows a decade page of 12 years around the focused year', () => {
    expect(calendar.decade()).toBe(2016);
    expect(calendar.years().map((year) => year.year)).toEqual([
      2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027,
    ]);
    expect(calendar.years().find((year) => year.year === 2026)?.current).toBe(true);
    expect(calendar.heading()).toBe('2016 – 2027');
  });

  it('localizes the heading digits', () => {
    const arabic = create({ locale: 'ar-EG' });
    arabic.setView('year');
    expect(arabic.heading()).toBe('٢٠١٦ – ٢٠٢٧');
  });

  it('moves by a year, a row of three, a page of twelve, a page of 120', () => {
    calendar.applyAction('move-next');
    expect(calendar.focused().year).toBe(2027);
    calendar.applyAction('move-row-down');
    expect(calendar.focused().year).toBe(2030);
    calendar.applyAction('page-forward');
    expect(calendar.focused().year).toBe(2042);
    calendar.applyAction('page-forward-year');
    expect(calendar.focused().year).toBe(2162);
  });

  it('row start/end snap to the 3-year row', () => {
    calendar.focus(d(2025, 10, 25));
    calendar.applyAction('move-row-start');
    expect(calendar.focused().year).toBe(2025);
    calendar.applyAction('move-row-end');
    expect(calendar.focused().year).toBe(2027);
  });

  it('Enter picks the focused year and returns to the month view', () => {
    calendar.focus(d(2024, 10, 25));
    expect(calendar.applyAction('select')).toBe('moved');
    expect(calendar.view()).toBe('month');
    expect(calendar.heading()).toBe('2024');
  });

  it('choosing a year goes to the month view of that year', () => {
    expect(calendar.chooseYear(2030)).toBe(true);
    expect(calendar.view()).toBe('month');
    expect(calendar.focused().year).toBe(2030);
    expect(calendar.heading()).toBe('2030');
  });

  it('refuses to choose a fully disabled year', () => {
    const bounded = create({ min: d(2026, 1, 1) });
    bounded.setView('year');
    bounded.focus(d(2026, 10, 25));
    expect(bounded.chooseYear(2000)).toBe(false);
    expect(bounded.chooseYear(2030)).toBe(true);
  });
});

describe('RiviniaCalendar — view switching', () => {
  it('setView is free-form and keeps the focus', () => {
    const calendar = create({ locale: 'en-US' });
    for (const view of ['month', 'year', 'day'] as RiviniaCalendarView[]) {
      calendar.setView(view);
      expect(calendar.view()).toBe(view);
      expect(calendar.focused()).toEqual(TODAY);
    }
  });

  it('starts in the configured view', () => {
    expect(create({ view: 'month' }).view()).toBe('month');
    expect(create({ view: 'year' }).view()).toBe('year');
  });
});

describe('RiviniaCalendar — configuration is live', () => {
  it('setLocale re-derives the week start, the weekdays and the heading', () => {
    const calendar = create({ locale: 'en-US' });
    calendar.setLocale('ar-EG');
    expect(calendar.firstDay()).toBe(6);
    expect(calendar.weekdays()[0].long).toBe('السبت');
    expect(calendar.heading()).toBe('أكتوبر ٢٠٢٦');
  });

  it('setFirstDay overrides the locale, and null restores it', () => {
    const calendar = create({ locale: 'ar-EG' });
    expect(calendar.firstDay()).toBe(6);
    calendar.setFirstDay(1);
    expect(calendar.firstDay()).toBe(1);
    calendar.setFirstDay(null);
    expect(calendar.firstDay()).toBe(6);
  });

  it('setToday moves the today marker', () => {
    const calendar = create({ locale: 'en-US' });
    calendar.setToday(d(2026, 10, 1));
    const first = calendar
      .monthGrid()
      .weeks.flatMap((week) => week.cells)
      .find((cell) => cell !== null && cell.date.day === 1);
    expect(first?.today).toBe(true);
  });

  it('setSelected follows the value, including null', () => {
    const calendar = create({ locale: 'en-US' });
    calendar.setSelected(d(2027, 1, 20));
    expect(calendar.selected()).toEqual(d(2027, 1, 20));
    expect(calendar.month()).toEqual(d(2027, 1, 1));
    calendar.setSelected(null);
    expect(calendar.selected()).toBeNull();
  });
});

describe('provideRiviniaDatepicker', () => {
  it('wires the config through DI for injectRiviniaDatepicker consumers', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRiviniaDatepicker({ locale: 'ar-EG', today: TODAY }),
        RiviniaCalendar,
      ],
    });
    const calendar = TestBed.inject(RiviniaCalendar);
    expect(calendar.locale()).toBe('ar-EG');
    expect(calendar.firstDay()).toBe(6);
  });

  it('has safe defaults when no config is provided at all', () => {
    TestBed.configureTestingModule({ providers: [RiviniaCalendar] });
    const calendar = TestBed.inject(RiviniaCalendar);
    expect(calendar.locale()).toBe('en-US');
    expect(calendar.selected()).toBeNull();
    expect(calendar.view()).toBe('day');
  });
});

describe('RiviniaCalendar — firstDay typing', () => {
  it('a Sunday-start grid puts Sunday in the first column', () => {
    const calendar = create({ locale: 'en-US', firstDay: 7 as RiviniaWeekday });
    expect(calendar.weekdays()[0].weekday).toBe(7);
  });
});
