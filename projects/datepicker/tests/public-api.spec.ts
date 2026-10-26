import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import * as core from '../src/public-api';
import * as ui from '../ui/src/public-api';
import {
  DATE_PICKER_CONFIG,
  DATEPICKER_LABELS_AR,
  DATEPICKER_LABELS_EN,
  DEFAULT_DATE_FORMAT,
  RiviniaCalendar,
  injectRiviniaDatepicker,
  isDateStyle,
  provideRiviniaDatepicker,
} from '../src/public-api';

const d = (year: number, month: number, day: number) => ({ year, month, day });

/*
 * The published surface is a contract. A symbol that a consumer imports from
 * `@rivinia/datepicker` must exist at RUNTIME, not only in the typings — a
 * value export that silently disappeared is a broken release, and the build
 * would not tell us.
 */

const CORE_VALUE_EXPORTS = [
  // labels, styles, config helpers
  'DATE_STYLES',
  'DATEPICKER_LABELS_AR',
  'DATEPICKER_LABELS_EN',
  'DATEPICKER_THEMES',
  'DEFAULT_DATE_FORMAT',
  'datepickerLabelsFor',
  'isDateStyle',
  // date math
  'addDays',
  'addMonths',
  'addYears',
  'compare',
  'daysInMonth',
  'endOfWeek',
  'fromIso',
  'isLeapYear',
  'isSameDay',
  'isValidDate',
  'parseDate',
  'startOfWeek',
  'toIso',
  'toLocalDate',
  'todayDate',
  'weekdayOf',
  // locale facts
  'firstDayOf',
  'weekInfo',
  // formatting
  'gregorianLocale',
  'formatDate',
  'formatDayNumber',
  'formatFullDate',
  'formatMonthName',
  'formatMonthYear',
  'formatViewHeading',
  'formatWithStyle',
  'formatYear',
  'weekdaysOf',
  'formatWithPattern',
  'parseDatePattern',
  // grid + keyboard
  'buildMonth',
  'resolveCalendarKey',
  // time
  'DEFAULT_TIME_FORMAT',
  'TIME_STYLES',
  'isTimeStyle',
  'addMinutes',
  'addSeconds',
  'civilToEpochMs',
  'compareDateTime',
  'compareTime',
  'dateTimeToIso',
  'displayHour',
  'fromSeconds',
  'hourCycleOf',
  'isSameDateTime',
  'isValidDateTime',
  'isValidTime',
  'normalizeTime',
  'nowDateTime',
  'nowTime',
  'parseDateTime',
  'parseTime',
  'timeToSeconds',
  'to24Hour',
  'uses12HourClock',
  'dayPeriodOf',
  'dayPeriodsOf',
  'formatTimeUnit',
  'formatTimeWithPattern',
  'formatUnitValue',
  'parseTimePattern',
  'formatDateTime',
  'formatTime',
  'formatTimeZoneName',
  'getTimeZoneOffsetMinutes',
  'isValidTimeZone',
  'listTimeZones',
  'nowInTimeZone',
  'resolveWallTime',
  'todayInTimeZone',
  'wallTimeInTimeZone',
  // state
  'RiviniaCalendar',
  // providers
  'DATE_PICKER_CONFIG',
  'injectRiviniaDatepicker',
  'provideRiviniaDatepicker',
] as const;

describe('@rivinia/datepicker — the published surface', () => {
  beforeEach(() => TestBed.resetTestingModule());

  it('exports every documented symbol at runtime', () => {
    for (const name of CORE_VALUE_EXPORTS) {
      expect(core[name as keyof typeof core], name).toBeDefined();
    }
  });

  it('defaults to the medium style and recognises the four styles', () => {
    expect(DEFAULT_DATE_FORMAT).toBe('medium');
    for (const style of ['short', 'medium', 'long', 'full']) {
      expect(isDateStyle(style), style).toBe(true);
    }
    for (const other of ['mediumm', 'MEDIUM', 'dd/MM/yyyy', '']) {
      expect(isDateStyle(other), other).toBe(false);
    }
  });

  it('ships complete English and Arabic label sets', () => {
    const en = Object.entries(DATEPICKER_LABELS_EN);
    const ar = Object.entries(DATEPICKER_LABELS_AR);
    expect(en).toHaveLength(ar.length);
    expect(en.map(([key]) => key).sort()).toEqual(ar.map(([key]) => key).sort());
    for (const [key, value] of [...en, ...ar]) {
      expect(value.trim(), key).not.toBe('');
    }
    // The Arabic set is a translation, not a copy of the English one.
    expect(ar.map(([, value]) => value)).not.toEqual(en.map(([, value]) => value));
  });

  it('provides the configuration and the calendar at the same level', () => {
    const selected = d(2026, 10, 25);
    TestBed.configureTestingModule({
      providers: [
        provideRiviniaDatepicker({ locale: 'ar-EG', firstDay: 6, selected, format: 'dd/MM/yyyy' }),
      ],
    });

    const injected = TestBed.runInInjectionContext(() => injectRiviniaDatepicker());
    expect(injected).toBeInstanceOf(RiviniaCalendar);
    expect(injected.locale()).toBe('ar-EG');
    expect(injected.firstDay()).toBe(6);
    expect(injected.selected()).toEqual(selected);
    expect(TestBed.inject(DATE_PICKER_CONFIG).format).toBe('dd/MM/yyyy');
    // The provider registers the service, so both routes are the same instance.
    expect(injected).toBe(TestBed.inject(RiviniaCalendar));
  });

  it('works with no provider at all', () => {
    TestBed.configureTestingModule({});
    expect(TestBed.inject(DATE_PICKER_CONFIG)).toEqual({});
  });
});

describe('@rivinia/datepicker/ui — the published surface', () => {
  it('exports both components', () => {
    expect(ui.RiviniaCalendarComponent).toBeTypeOf('function');
    expect(ui.RiviniaDatepickerComponent).toBeTypeOf('function');
    expect(ui.RiviniaDatetimepickerComponent).toBeTypeOf('function');
    expect(ui.RiviniaTimeRowComponent).toBeTypeOf('function');
  });

  it('keeps the core out of the UI entry point', () => {
    // The UI entry re-exports ONLY rendering. A consumer who wants date math
    // imports the primary entry point, which is what keeps the two entry
    // points honest about their layers.
    expect(Object.keys(ui).sort()).toEqual([
      'RiviniaCalendarComponent',
      'RiviniaDatepickerComponent',
      'RiviniaDatetimepickerComponent',
      'RiviniaTimeRowComponent',
    ]);
  });
});
