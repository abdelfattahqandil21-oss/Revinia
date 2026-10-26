import { Component, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DATE_PICKER_CONFIG, nowInTimeZone, todayInTimeZone } from '../src/public-api';
import type {
  RiviniaDate,
  RiviniaDateTime,
  RiviniaDateTimeResolution,
  RiviniaHour12,
  RiviniaTimeFormat,
} from '../src/public-api';
import { RiviniaDatetimepickerComponent } from '../ui/src/public-api';

const d = (year: number, month: number, day: number): RiviniaDate => ({ year, month, day });
const t = (hour: number, minute = 0, second = 0) => ({ hour, minute, second });
const dt = (year: number, month: number, day: number, hour: number, minute = 0, second = 0): RiviniaDateTime => ({
  date: d(year, month, day),
  time: t(hour, minute, second),
});
const TODAY = d(2026, 10, 25);

@Component({
  selector: 'rv-datetime-host',
  imports: [RiviniaDatetimepickerComponent],
  template: `
    <rv-datetimepicker
      [value]="value()"
      [locale]="locale()"
      [format]="format()"
      [timeFormat]="timeFormat()"
      [timeZone]="timeZone()"
      [showSeconds]="showSeconds()"
      [minuteStep]="minuteStep()"
      [hour12]="hour12()"
      [label]="label()"
      [theme]="theme()"
      [clearable]="clearable()"
      (valueChange)="value.set($event)"
      (touch)="touches = touches + 1"
      (resolved)="resolved.push($event)"
    />
  `,
})
class Host {
  readonly value = signal<RiviniaDateTime | null>(null);
  readonly locale = signal<string | undefined>(undefined);
  readonly format = signal<string | undefined>(undefined);
  readonly timeFormat = signal<RiviniaTimeFormat | undefined>(undefined);
  readonly timeZone = signal<string | undefined>(undefined);
  readonly showSeconds = signal<boolean | undefined>(undefined);
  readonly minuteStep = signal<number | undefined>(undefined);
  readonly hour12 = signal<RiviniaHour12 | undefined>(undefined);
  readonly label = signal<string | undefined>(undefined);
  readonly theme = signal<'auto' | 'light' | 'dark' | undefined>(undefined);
  readonly clearable = signal<boolean | undefined>(undefined);
  touches = 0;
  readonly resolved: RiviniaDateTimeResolution[] = [];
}

interface MountOptions {
  readonly value?: RiviniaDateTime;
  readonly locale?: string;
  readonly timeZone?: string;
  readonly showSeconds?: boolean;
  readonly minuteStep?: number;
  readonly hour12?: RiviniaHour12;
  readonly timeFormat?: RiviniaTimeFormat;
  readonly format?: string;
  readonly clearable?: boolean;
  readonly label?: string;
  readonly today?: RiviniaDate;
}

function mount(options: MountOptions = {}) {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [Host],
    providers: [
      {
        provide: DATE_PICKER_CONFIG,
        useValue: { today: options.today ?? TODAY, locale: options.locale ?? 'en-US' },
      },
    ],
  });
  const fixture = TestBed.createComponent(Host);
  const host = fixture.componentInstance;
  host.locale.set(options.locale);
  host.timeZone.set(options.timeZone);
  host.showSeconds.set(options.showSeconds);
  host.minuteStep.set(options.minuteStep);
  host.hour12.set(options.hour12);
  host.timeFormat.set(options.timeFormat);
  host.format.set(options.format);
  host.clearable.set(options.clearable);
  host.label.set(options.label);
  if (options.value) host.value.set(options.value);
  fixture.detectChanges();

  const el = fixture.nativeElement.querySelector('rv-datetimepicker') as HTMLElement;
  const trigger = el.querySelector('.rv-datepicker-trigger') as HTMLButtonElement;
  const triggerText = () =>
    (el.querySelector('.rv-datepicker-value')?.textContent ?? '').trim();
  const open = (): HTMLElement | null => {
    trigger.click();
    fixture.detectChanges();
    return el.querySelector('.rv-datepicker-panel') as HTMLElement | null;
  };
  const panel = () => el.querySelector('.rv-datepicker-panel') as HTMLElement | null;
  const day = (iso: string) =>
    el.querySelector(`.rv-calendar-day[data-date="${iso}"]`) as HTMLElement | null;
  const hour = () => el.querySelector('.rv-time-hour') as HTMLInputElement | null;
  const minute = () => el.querySelector('.rv-time-minute') as HTMLInputElement | null;
  const second = () => el.querySelector('.rv-time-second') as HTMLInputElement | null;
  const ok = () => el.querySelector('.rv-time-ok') as HTMLButtonElement | null;
  const now = () => el.querySelector('.rv-time-now') as HTMLButtonElement | null;
  const meridiem = (period: 'am' | 'pm' | number) => {
    const buttons = el.querySelectorAll('.rv-time-meridiem-button');
    return (
      (typeof period === 'number' ? buttons[period] : buttons[period === 'am' ? 0 : 1]) as
        | HTMLButtonElement
        | undefined
    );
  };
  const timeToggle = () => el.querySelector('.rv-time-toggle') as HTMLButtonElement | null;
  const timeOptions = () => el.querySelector('.rv-time-options') as HTMLElement | null;
  const optionList = (name: string) =>
    el.querySelector(`[role="listbox"][aria-label="${name}"]`) as HTMLElement | null;
  const optionItems = (name: string) =>
    [...(optionList(name)?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])];
  const option = (name: string, text: string) =>
    optionItems(name).find((item) => item.textContent?.trim() === text) ?? null;

  return {
    fixture,
    host,
    el,
    trigger,
    triggerText,
    open,
    panel,
    day,
    hour,
    minute,
    second,
    ok,
    now,
    meridiem,
    timeToggle,
    timeOptions,
    optionList,
    optionItems,
    option,
  };
}

function keydown(target: Element, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

function typeInto(target: HTMLInputElement, value: string): void {
  target.value = value;
  target.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('rv-datetimepicker — the time row is inside the date panel', () => {
  it('renders the trigger value, the calendar and the time row in one panel', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30) });
    expect(view.triggerText()).toBe('Oct 25, 2026, 3:30 PM');

    const panel = view.open();
    expect(panel).not.toBeNull();
    expect(panel?.querySelector('.rv-calendar')).not.toBeNull();
    expect(panel?.querySelector('.rv-time-row')).not.toBeNull();
    expect(view.hour()?.value).toBe('03');
    expect(view.minute()?.value).toBe('30');
    expect(view.meridiem('pm')?.getAttribute('aria-pressed')).toBe('true');
    expect(view.host.touches).toBe(0);
  });

  it('opens on the configured today, even when a time zone is set', () => {
    const view = mount({ today: d(2026, 3, 9), timeZone: 'Africa/Cairo' });
    view.open();
    expect(view.el.querySelector('.rv-calendar-heading-text')?.textContent?.trim()).toBe(
      'March 2026',
    );
  });

  it('does not emit a resolved instant without a time zone', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30) });
    view.open();
    view.ok()?.click();
    view.fixture.detectChanges();

    expect(view.host.value()).toEqual(dt(2026, 10, 25, 15, 30));
    expect(view.host.resolved).toHaveLength(0);
  });

  it('a day updates the draft only; OK commits date and time together', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30) });
    view.open();
    view.day('2026-10-26')?.click();
    view.fixture.detectChanges();

    expect(view.host.value()).toEqual(dt(2026, 10, 25, 15, 30));
    expect(view.panel()).not.toBeNull();
    expect(view.hour()?.value).toBe('03');

    view.ok()?.click();
    view.fixture.detectChanges();
    expect(view.host.value()).toEqual(dt(2026, 10, 26, 15, 30));
    expect(view.panel()).toBeNull();
    expect(view.host.touches).toBe(1);
  });

  it('edits the time as a draft and does not close until OK', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30) });
    view.open();
    keydown(view.hour()!, 'ArrowUp');
    view.fixture.detectChanges();

    expect(view.hour()?.value).toBe('04');
    expect(view.host.value()).toEqual(dt(2026, 10, 25, 15, 30));
    expect(view.panel()).not.toBeNull();

    view.ok()?.click();
    view.fixture.detectChanges();
    expect(view.host.value()).toEqual(dt(2026, 10, 25, 16, 30));
  });

  it('supports direct typing, clamping and the minute step', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30), minuteStep: 5 });
    view.open();
    typeInto(view.minute()!, '59');
    view.fixture.detectChanges();
    expect(view.minute()?.value).toBe('59');

    keydown(view.minute()!, 'PageDown');
    view.fixture.detectChanges();
    expect(view.minute()?.value).toBe('54');

    typeInto(view.hour()!, '09');
    view.fixture.detectChanges();
    expect(view.hour()?.value).toBe('09');
    expect(view.meridiem('pm')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('switches the meridiem without changing the minute', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30) });
    view.open();
    view.meridiem('am')?.click();
    view.fixture.detectChanges();
    expect(view.hour()?.value).toBe('03');
    expect(view.meridiem('am')?.getAttribute('aria-pressed')).toBe('true');
    view.ok()?.click();
    view.fixture.detectChanges();
    expect(view.host.value()).toEqual(dt(2026, 10, 25, 3, 30));
  });

  it('shows seconds only when asked and steps them', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30, 7), showSeconds: true });
    view.open();
    expect(view.second()?.value).toBe('07');
    keydown(view.second()!, 'ArrowUp');
    view.fixture.detectChanges();
    expect(view.second()?.value).toBe('08');
    view.ok()?.click();
    view.fixture.detectChanges();
    expect(view.host.value()?.time).toEqual(t(15, 30, 8));
  });

  it('follows a 24-hour locale without a meridiem group', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30), locale: 'en-GB' });
    view.open();
    expect(view.hour()?.value).toBe('15');
    expect(view.minute()?.value).toBe('30');
    expect(view.el.querySelector('.rv-time-meridiem')).toBeNull();
    expect(view.triggerText()).toBe('25 Oct 2026, 15:30');
  });

  it('uses the locale digits and day periods in Arabic', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30), locale: 'ar-EG' });
    view.open();
    expect(view.hour()?.value).toBe('٠٣');
    expect(view.minute()?.value).toBe('٣٠');
    expect(view.meridiem('pm')?.textContent?.trim()).toBe('م');
    view.meridiem('am')?.click();
    view.fixture.detectChanges();
    view.ok()?.click();
    view.fixture.detectChanges();
    expect(view.host.value()).toEqual(dt(2026, 10, 25, 3, 30));
  });

  it('formats the trigger with a time pattern and hour12 override', () => {
    const view = mount({
      value: dt(2026, 10, 25, 15, 30),
      format: 'dd/MM/yyyy',
      timeFormat: 'HH:mm:ss',
    });
    expect(view.triggerText()).toBe('25/10/2026, 15:30:00');

    const twelve = mount({
      value: dt(2026, 10, 25, 15, 30),
      locale: 'en-GB',
      format: 'dd/MM/yyyy',
      timeFormat: 'hh:mm a',
      hour12: true,
    });
    expect(twelve.triggerText()).toBe('25/10/2026, 03:30 pm');
  });
});

describe('rv-datetimepicker — the pointer-friendly time tray', () => {
  it('opens inside the same panel, on the selected hour and minute', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30) });
    view.open();
    const toggle = view.timeToggle()!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('Choose time');

    toggle.click();
    view.fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(view.timeOptions()).not.toBeNull();
    expect(view.panel()?.contains(view.timeOptions())).toBe(true);
    expect(view.panel()?.querySelector('.rv-calendar')).not.toBeNull();
    expect(view.optionList('Hour')?.getAttribute('role')).toBe('listbox');
    expect(view.optionList('Minute')?.getAttribute('role')).toBe('listbox');
    expect(view.optionItems('Hour').find((item) => item.getAttribute('aria-selected') === 'true')?.textContent?.trim()).toBe('03');
    expect(view.optionItems('Minute').find((item) => item.getAttribute('aria-selected') === 'true')?.textContent?.trim()).toBe('30');
    expect(document.activeElement?.textContent?.trim()).toBe('03');
  });

  it('places the tray directly after the clock button in the tab order', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30, 7), showSeconds: true });
    view.open();
    const toggle = view.timeToggle()!;
    toggle.click();
    view.fixture.detectChanges();

    const tray = view.timeOptions()!;
    // Tabbing from the clock button must reach the tray before the meridiem
    // and the actions; the old markup put the tray last.
    expect(toggle.nextElementSibling).toBe(tray);

    for (const name of ['Hour', 'Minute', 'Second']) {
      const items = [...view.optionList(name)!.querySelectorAll('[role="option"]')];
      const stops = items.filter((item) => item.getAttribute('tabindex') === '0');
      expect(stops).toHaveLength(1);
      expect(stops[0].getAttribute('aria-selected')).toBe('true');
    }

    const actions = view.panel()!.querySelector('.rv-time-actions')!;
    expect(tray.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('selects an hour and a minute without closing the panel, then OK commits', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30) });
    view.open();
    view.timeToggle()?.click();
    view.fixture.detectChanges();

    view.option('Hour', '05')?.click();
    view.fixture.detectChanges();
    view.option('Minute', '45')?.click();
    view.fixture.detectChanges();

    expect(view.hour()?.value).toBe('05');
    expect(view.minute()?.value).toBe('45');
    expect(view.host.value()).toEqual(dt(2026, 10, 25, 15, 30));
    expect(view.panel()).not.toBeNull();
    expect(view.timeOptions()).not.toBeNull();

    view.ok()?.click();
    view.fixture.detectChanges();
    expect(view.host.value()).toEqual(dt(2026, 10, 25, 17, 45));
    expect(view.panel()).toBeNull();
  });

  it('follows the 12-hour display and keeps the meridiem when picking an hour', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30) });
    view.open();
    view.timeToggle()?.click();
    view.fixture.detectChanges();

    expect(view.optionItems('Hour').map((item) => item.textContent?.trim())).toEqual([
      '12',
      '01',
      '02',
      '03',
      '04',
      '05',
      '06',
      '07',
      '08',
      '09',
      '10',
      '11',
    ]);
    view.option('Hour', '12')?.click();
    view.fixture.detectChanges();
    expect(view.hour()?.value).toBe('12');
    expect(view.meridiem('pm')?.getAttribute('aria-pressed')).toBe('true');

    view.ok()?.click();
    view.fixture.detectChanges();
    expect(view.host.value()).toEqual(dt(2026, 10, 25, 12, 30));
  });

  it('uses 24-hour options when the locale is 24-hour', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30), locale: 'en-GB' });
    view.open();
    view.timeToggle()?.click();
    view.fixture.detectChanges();

    expect(view.optionItems('Hour')).toHaveLength(24);
    expect(view.optionItems('Hour')[0].textContent?.trim()).toBe('00');
    expect(view.optionItems('Hour')[23].textContent?.trim()).toBe('23');
    expect(view.el.querySelector('.rv-time-meridiem')).toBeNull();
  });

  it('honours minuteStep but still shows a typed off-step value', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 59), minuteStep: 5 });
    view.open();
    view.timeToggle()?.click();
    view.fixture.detectChanges();

    const values = view.optionItems('Minute').map((item) => item.textContent?.trim());
    expect(values.slice(0, 4)).toEqual(['00', '05', '10', '15']);
    expect(values.at(-1)).toBe('59');
    expect(view.optionItems('Minute').find((item) => item.getAttribute('aria-selected') === 'true')?.textContent?.trim()).toBe('59');
  });

  it('adds the seconds column only when showSeconds is on', () => {
    const without = mount({ value: dt(2026, 10, 25, 15, 30, 7) });
    without.open();
    without.timeToggle()?.click();
    without.fixture.detectChanges();
    expect(without.optionList('Second')).toBeNull();

    const withSeconds = mount({ value: dt(2026, 10, 25, 15, 30, 7), showSeconds: true });
    withSeconds.open();
    withSeconds.timeToggle()?.click();
    withSeconds.fixture.detectChanges();
    expect(withSeconds.optionList('Second')).not.toBeNull();
    expect(withSeconds.option('Second', '07')?.getAttribute('aria-selected')).toBe('true');
  });

  it('speaks the locale digits, labels and accessible names in Arabic', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30), locale: 'ar-EG' });
    view.open();
    const toggle = view.timeToggle()!;
    expect(toggle.getAttribute('aria-label')).toBe('اختر الوقت');
    toggle.click();
    view.fixture.detectChanges();

    expect(view.optionList('الساعة')).not.toBeNull();
    expect(view.optionItems('الساعة').find((item) => item.getAttribute('aria-selected') === 'true')?.textContent?.trim()).toBe('٠٣');
    expect(view.optionItems('الساعة').find((item) => item.getAttribute('aria-selected') === 'true')?.getAttribute('aria-label')).toBe('٠٣, ٣ م');
  });

  it('keeps each row\'s visible text inside its accessible name (WCAG 2.5.3)', () => {
    for (const locale of ['en-US', 'ar-EG']) {
      const view = mount({ value: dt(2026, 10, 25, 15, 30, 7), locale, showSeconds: true });
      view.open();
      view.timeToggle()?.click();
      view.fixture.detectChanges();

      for (const name of ['Hour', 'Minute', 'Second', 'الساعة', 'الدقيقة', 'الثانية']) {
        for (const item of view.optionItems(name)) {
          const visible = item.textContent?.trim() ?? '';
          const accessible = item.getAttribute('aria-label') ?? '';
          expect(accessible).toContain(visible);
        }
      }
    }
  });

  it('closes the tray on Escape first, then the panel on the next Escape', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30) });
    view.open();
    view.timeToggle()?.click();
    view.fixture.detectChanges();
    const selected = document.activeElement as HTMLElement;

    keydown(selected, 'Escape');
    view.fixture.detectChanges();
    expect(view.timeOptions()).toBeNull();
    expect(view.panel()).not.toBeNull();
    expect(document.activeElement).toBe(view.timeToggle());

    keydown(view.timeToggle()!, 'Escape');
    view.fixture.detectChanges();
    expect(view.panel()).toBeNull();
  });

  it('a pointer outside the tray closes only the tray', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30) });
    view.open();
    view.timeToggle()?.click();
    view.fixture.detectChanges();

    view.panel()?.querySelector('.rv-calendar-heading')?.dispatchEvent(
      new Event('pointerdown', { bubbles: true }),
    );
    view.fixture.detectChanges();
    expect(view.timeOptions()).toBeNull();
    expect(view.panel()).not.toBeNull();
  });
});

describe('rv-datetimepicker — closing, clearing and focus', () => {
  it('Escape from a time field discards the draft and restores focus', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30) });
    view.open();
    keydown(view.hour()!, 'ArrowUp');
    view.fixture.detectChanges();
    keydown(view.hour()!, 'Escape');
    view.fixture.detectChanges();

    expect(view.panel()).toBeNull();
    expect(view.host.value()).toEqual(dt(2026, 10, 25, 15, 30));
    expect(document.activeElement).toBe(view.trigger);
    expect(view.host.touches).toBe(1);
  });

  it('an outside pointer closes without committing', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30) });
    view.open();
    keydown(view.hour()!, 'ArrowUp');
    view.fixture.detectChanges();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    view.fixture.detectChanges();

    expect(view.panel()).toBeNull();
    expect(view.host.value()).toEqual(dt(2026, 10, 25, 15, 30));
  });

  it('clears the value and returns focus to the trigger', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30), clearable: true, label: 'Appointment' });
    const clear = view.el.querySelector('.rv-datepicker-clear') as HTMLButtonElement;
    expect(clear.getAttribute('aria-label')).toBe('Appointment: Clear date and time');
    clear.click();
    view.fixture.detectChanges();

    expect(view.host.value()).toBeNull();
    expect(view.triggerText()).toBe('Choose date and time');
    expect(document.activeElement).toBe(view.trigger);
    expect(view.host.touches).toBe(1);
  });

  it('Now moves the draft to today in the zone; OK commits it', () => {
    const before = nowInTimeZone('Africa/Cairo');
    const view = mount({
      value: dt(2020, 1, 1, 0, 0),
      timeZone: 'Africa/Cairo',
      locale: 'en-GB',
    });
    view.open();
    view.now()?.click();
    view.fixture.detectChanges();
    keydown(view.hour()!, 'Enter');
    view.fixture.detectChanges();

    const after = nowInTimeZone('Africa/Cairo');
    const value = view.host.value();
    expect(value).not.toBeNull();
    expect([before.date, after.date, todayInTimeZone('Africa/Cairo')]).toContainEqual(value?.date);
    expect(view.panel()).toBeNull();
  });
});

describe('rv-datetimepicker — panel motion', () => {
  function stubMotion(reduced: boolean): void {
    vi.stubGlobal(
      'matchMedia',
      (query: string) =>
        ({
          matches: query.includes('prefers-reduced-motion') ? reduced : false,
          media: query,
          onchange: null,
          addListener: () => undefined,
          removeListener: () => undefined,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => false,
        }) as MediaQueryList,
    );
  }

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('keeps the panel inert during the exit, then removes it', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30) });
    view.open();
    vi.useFakeTimers();
    stubMotion(false);

    view.trigger.click();
    view.fixture.detectChanges();

    const panel = view.panel();
    expect(panel).not.toBeNull();
    expect(panel?.classList.contains('rv-datepicker-panel--closing')).toBe(true);
    expect(panel?.hasAttribute('inert')).toBe(true);
    expect(panel?.getAttribute('aria-hidden')).toBe('true');
    expect(view.trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(view.trigger);

    vi.advanceTimersByTime(499);
    view.fixture.detectChanges();
    expect(view.panel()).not.toBeNull();

    vi.advanceTimersByTime(1);
    view.fixture.detectChanges();
    expect(view.panel()).toBeNull();
  });

  it('removes the panel when Angular’s scoped exit animation ends', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30) });
    view.open();
    stubMotion(false);
    view.trigger.click();
    view.fixture.detectChanges();

    const panel = view.panel()!;
    expect(panel.classList.contains('rv-datepicker-panel--closing')).toBe(true);
    const event = new Event('animationend', { bubbles: true });
    Object.defineProperty(event, 'animationName', {
      value: '_ngcontent-ng-c123_rv-datepicker-exit',
    });
    panel.dispatchEvent(event);
    view.fixture.detectChanges();
    expect(view.panel()).toBeNull();
  });

  it('removes the panel immediately when reduced motion is requested', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30) });
    view.open();
    stubMotion(true);

    view.trigger.click();
    view.fixture.detectChanges();
    expect(view.panel()).toBeNull();
    expect(document.activeElement).toBe(view.trigger);
  });

  it('reopening during the exit cancels it and keeps one panel', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30) });
    view.open();
    vi.useFakeTimers();
    stubMotion(false);

    view.trigger.click();
    view.fixture.detectChanges();
    expect(view.panel()?.classList.contains('rv-datepicker-panel--closing')).toBe(true);

    view.trigger.click();
    view.fixture.detectChanges();
    expect(view.panel()).not.toBeNull();
    expect(view.panel()?.classList.contains('rv-datepicker-panel--closing')).toBe(false);
    expect(view.trigger.getAttribute('aria-expanded')).toBe('true');

    vi.advanceTimersByTime(600);
    view.fixture.detectChanges();
    expect(view.panel()).not.toBeNull();
  });
});

describe('rv-datetimepicker — timezone, offsets and DST', () => {
  it('shows the zone and offset, and emits the resolved instant on commit', () => {
    const view = mount({
      value: dt(2026, 10, 25, 15),
      timeZone: 'Africa/Cairo',
    });
    expect(view.triggerText()).toContain('GMT+3');
    view.open();
    expect(view.el.querySelector('.rv-datetimepicker-zone')?.textContent).toContain('Africa/Cairo');
    expect(view.el.querySelector('.rv-datetimepicker-zone')?.textContent).toContain('GMT+3');
    view.ok()?.click();
    view.fixture.detectChanges();

    expect(view.host.resolved).toHaveLength(1);
    expect(view.host.resolved[0].timeZone).toBe('Africa/Cairo');
    expect(view.host.resolved[0].resolution.kind).toBe('unique');
    expect(view.host.resolved[0].resolution.offsetMinutes).toBe(180);
    expect(view.host.resolved[0].resolution.instant).toBe(Date.UTC(2026, 9, 25, 12, 0));
  });

  it('warns about a DST gap and adopts the suggested wall time explicitly', () => {
    const view = mount({
      value: dt(2026, 4, 24, 0, 30),
      timeZone: 'Africa/Cairo',
    });
    view.open();
    const warning = view.el.querySelector('.rv-datetimepicker-warning');
    expect(warning?.textContent).toContain('does not exist');
    expect(warning?.textContent).toContain('Apr 24, 2026, 1:30 AM');
    expect(warning?.querySelector('button')?.textContent).toContain('Use 1:30 AM');

    (warning?.querySelector('button') as HTMLButtonElement).click();
    view.fixture.detectChanges();
    expect(view.hour()?.value).toBe('01');
    expect(view.minute()?.value).toBe('30');
    expect(view.host.value()).toEqual(dt(2026, 4, 24, 0, 30));
    view.ok()?.click();
    view.fixture.detectChanges();
    expect(view.host.value()).toEqual(dt(2026, 4, 24, 1, 30));
  });

  it('offers both offsets for an overlap and commits the chosen one', () => {
    const view = mount({
      value: dt(2026, 10, 29, 23, 30),
      timeZone: 'Africa/Cairo',
    });
    view.open();
    const warning = view.el.querySelector('.rv-datetimepicker-warning');
    expect(warning?.textContent).toContain('occurs twice');
    const buttons = [...view.el.querySelectorAll('.rv-datetimepicker-offset')] as HTMLButtonElement[];
    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      'GMT+3',
      'GMT+2',
    ]);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');

    buttons[1].click();
    view.fixture.detectChanges();
    expect(buttons[1].getAttribute('aria-pressed')).toBe('true');
    view.ok()?.click();
    view.fixture.detectChanges();

    const resolved = view.host.resolved.at(-1);
    expect(resolved?.resolution.kind).toBe('ambiguous');
    expect(resolved?.resolution.offsetMinutes).toBe(120);
    expect(resolved?.resolution.instant).toBe(Date.UTC(2026, 9, 29, 21, 30));
    expect(view.host.value()).toEqual(dt(2026, 10, 29, 23, 30));
  });

  it('accepts a fixed offset such as +03:00, with no DST', () => {
    const view = mount({
      value: dt(2026, 10, 25, 15),
      timeZone: '+03:00',
    });
    expect(view.triggerText()).toContain('GMT+3');
    view.open();
    expect(view.el.querySelector('.rv-datetimepicker-zone')?.textContent).toContain('+03:00');
    expect(view.el.querySelector('.rv-datetimepicker-zone')?.textContent).toContain('GMT+3');
    expect(view.el.querySelector('.rv-datetimepicker-warning')).toBeNull();
    view.ok()?.click();
    view.fixture.detectChanges();

    expect(view.host.resolved).toHaveLength(1);
    expect(view.host.resolved[0].timeZone).toBe('+03:00');
    expect(view.host.resolved[0].resolution.kind).toBe('unique');
    expect(view.host.resolved[0].resolution.offsetMinutes).toBe(180);
    expect(view.host.resolved[0].resolution.instant).toBe(Date.UTC(2026, 9, 25, 12, 0));
  });

  it('rejects the non-standard label GMT+3 instead of guessing', () => {
    const view = mount({
      value: dt(2026, 10, 25, 15),
      timeZone: 'GMT+3',
    });
    expect(view.triggerText()).toBe('Oct 25, 2026, 3:00 PM');
    view.open();
    expect(view.el.querySelector('.rv-datetimepicker-warning')?.textContent).toContain(
      'Unknown time zone',
    );
  });

  it('reports an unknown zone without crashing or claiming an instant', () => {
    const view = mount({
      value: dt(2026, 10, 25, 15),
      timeZone: 'Mars/Olympus',
    });
    expect(view.triggerText()).toBe('Oct 25, 2026, 3:00 PM');
    view.open();
    expect(view.el.querySelector('.rv-datetimepicker-warning')?.textContent).toContain(
      'Unknown time zone',
    );
    view.ok()?.click();
    view.fixture.detectChanges();
    expect(view.host.value()).toEqual(dt(2026, 10, 25, 15));
    expect(view.host.resolved).toHaveLength(0);
  });
});

describe('rv-datetimepicker — accessibility and RTL markup', () => {
  it('exposes spinbuttons with names, ranges and value text', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30) });
    view.open();
    const hour = view.hour()!;
    expect(hour.getAttribute('role')).toBe('spinbutton');
    expect(hour.getAttribute('aria-label')).toBe('Hour');
    expect(hour.getAttribute('aria-valuenow')).toBe('3');
    expect(hour.getAttribute('aria-valuemin')).toBe('1');
    expect(hour.getAttribute('aria-valuemax')).toBe('12');
    expect(hour.getAttribute('aria-valuetext')).toBe('3 PM');
    expect(view.minute()?.getAttribute('aria-valuetext')).toBe('30 minutes');
    expect(view.el.querySelector('.rv-time-row')?.getAttribute('role')).toBe('group');
  });

  it('keeps the numeric fields LTR in an RTL host', () => {
    const view = mount({ value: dt(2026, 10, 25, 15, 30), locale: 'ar-EG' });
    view.el.setAttribute('dir', 'rtl');
    view.open();
    expect(view.el.querySelector('.rv-time-fields')?.getAttribute('dir')).toBe('ltr');
    expect(view.triggerText()).toContain('٣:٣٠ م');
  });
});
