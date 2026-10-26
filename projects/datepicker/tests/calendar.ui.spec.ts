import { Component, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { DATE_PICKER_CONFIG, RiviniaCalendar } from '../src/public-api';
import type { RiviniaDate, RiviniaDatepickerConfig } from '../src/public-api';
import { RiviniaCalendarComponent } from '../ui/src/public-api';

const d = (year: number, month: number, day: number): RiviniaDate => ({ year, month, day });
const TODAY = d(2026, 10, 25);

/*
 * The calendar UI contract, measured against the DOM rather than the internals:
 * a real `table[role=grid]`, one roving tabindex, `aria-*` instead of the
 * `disabled` attribute, and the RTL arrow rule observed through actual focus
 * movement.
 */

@Component({
  selector: 'rv-test-host',
  imports: [RiviniaCalendarComponent],
  template: `<div [attr.dir]="direction()"><rv-calendar [calendar]="calendar" (picked)="picked = $event" (dismissed)="dismissed = dismissed + 1" /></div>`,
})
class TestHost {
  calendar!: RiviniaCalendar;
  readonly direction = signal<'ltr' | 'rtl'>('ltr');
  picked: RiviniaDate | null = null;
  dismissed = 0;
}

interface Mounted {
  fixture: ComponentFixture<TestHost>;
  host: TestHost;
  calendar: RiviniaCalendar;
  el: HTMLElement;
  cells: () => HTMLElement[];
  active: () => HTMLElement | null;
  activate: () => void;
  setDirection: (direction: 'ltr' | 'rtl') => void;
  press: (key: string, init?: KeyboardEventInit) => void;
  click: (element: Element) => void;
  settle: () => void;
  heading: () => string;
}

function mount(config: RiviniaDatepickerConfig = {}): Mounted {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TestHost],
    providers: [
      RiviniaCalendar,
      { provide: DATE_PICKER_CONFIG, useValue: { today: TODAY, locale: 'en-US', ...config } },
    ],
  });
  const fixture = TestBed.createComponent(TestHost);
  const calendar = TestBed.inject(RiviniaCalendar);
  fixture.componentInstance.calendar = calendar;
  fixture.detectChanges();

  const el = fixture.nativeElement as HTMLElement;

  const settle = (): void => {
    fixture.detectChanges();
  };

  const activeCell = (): HTMLElement | null => {
    const cells = Array.from(el.querySelectorAll<HTMLElement>('td[role="gridcell"]'));
    return cells.find((cell) => cell.getAttribute('tabindex') === '0') ?? null;
  };

  const activate = (): void => {
    const target =
      activeCell() ??
      (el.querySelector('[data-month][tabindex="0"]') as HTMLElement | null) ??
      (el.querySelector('[data-year][tabindex="0"]') as HTMLElement | null);
    target?.focus();
  };

  return {
    fixture,
    host: fixture.componentInstance,
    calendar,
    el,
    cells: () => Array.from(el.querySelectorAll<HTMLElement>('td[role="gridcell"]')),
    active: activeCell,
    activate,
    setDirection: (direction) => {
      fixture.componentInstance.direction.set(direction);
      settle();
    },
    settle,
    click: (element: Element) => {
      (element as HTMLElement).click();
      settle();
    },
    press: (key: string, init: KeyboardEventInit = {}) => {
      const target = (document.activeElement as HTMLElement | null) ?? activeCell();
      target?.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
      );
      settle();
    },
    heading: () => el.querySelector('.rv-calendar-heading-text')?.textContent?.trim() ?? '',
  };
}

describe('rv-calendar — the grid', () => {
  let mounted: Mounted;
  beforeEach(() => {
    mounted = mount();
  });

  it('renders a real grid with seven column headers', () => {
    expect(mounted.el.querySelector('table[role="grid"]')).not.toBeNull();
    const headers = Array.from(mounted.el.querySelectorAll('th[scope="col"]'));
    expect(headers).toHaveLength(7);
    expect(headers[0].getAttribute('abbr')).toBe('Sunday');
    expect(headers[0].textContent?.trim()).toBe('S');
  });

  it('renders 42 table cells, 31 of them days of October', () => {
    expect(mounted.el.querySelectorAll('tbody td')).toHaveLength(42);
    expect(mounted.cells()).toHaveLength(31);
    expect(mounted.cells()[0].getAttribute('data-date')).toBe('2026-10-01');
    expect(mounted.cells()[30].getAttribute('data-date')).toBe('2026-10-31');
  });

  it('labels every day with its full date, and marks today', () => {
    const today = mounted.cells().find((cell) => cell.dataset['date'] === '2026-10-25');
    expect(today?.getAttribute('aria-label')).toBe('Sunday, October 25, 2026');
    expect(today?.getAttribute('aria-current')).toBe('date');
    expect(today?.getAttribute('aria-selected')).toBe('false');
  });

  it('exposes exactly one roving tab stop, on the focused day', () => {
    const tabbable = mounted.cells().filter((cell) => cell.getAttribute('tabindex') === '0');
    expect(tabbable).toHaveLength(1);
    expect(tabbable[0].dataset['date']).toBe('2026-10-25');
    expect(mounted.active()?.dataset['date']).toBe('2026-10-25');
  });

  it('reflects the selected day', () => {
    mounted.calendar.select(d(2026, 10, 10));
    mounted.settle();
    const selected = mounted.cells().find((cell) => cell.dataset['date'] === '2026-10-10');
    expect(selected?.getAttribute('aria-selected')).toBe('true');
    expect(mounted.cells().filter((c) => c.getAttribute('aria-selected') === 'true')).toHaveLength(1);
  });

  it('has a polite live heading', () => {
    const heading = mounted.el.querySelector('[aria-live="polite"]');
    expect(heading?.textContent?.trim()).toBe('October 2026');
  });

  it('describes the grid with the instructions, once', () => {
    const grid = mounted.el.querySelector('table[role="grid"]');
    const describedBy = grid?.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const instructions = mounted.el.querySelector(`#${describedBy}`);
    expect(instructions?.textContent).toMatch(/arrow keys/i);
    expect(instructions?.className).toContain('rv-sr-only');
  });
});

describe('rv-calendar — pointer', () => {
  it('a day click commits it', () => {
    const mounted = mount();
    const day = mounted.cells().find((cell) => cell.dataset['date'] === '2026-10-12');
    mounted.click(day!);
    expect(mounted.host.picked).toEqual(d(2026, 10, 12));
  });

  it('a disabled day is aria-disabled and never commits', () => {
    const mounted = mount({ min: d(2026, 10, 10) });
    const day = mounted.cells().find((cell) => cell.dataset['date'] === '2026-10-09');
    expect(day?.getAttribute('aria-disabled')).toBe('true');
    expect(day?.hasAttribute('disabled')).toBe(false);
    mounted.click(day!);
    expect(mounted.host.picked).toBeNull();
  });

  it('the nav buttons page by a month, with labelled buttons', () => {
    const mounted = mount();
    const next = mounted.el.querySelector('[aria-label="Next month"]');
    expect(next).not.toBeNull();
    mounted.click(next!);
    expect(mounted.heading()).toBe('November 2026');
  });
});

describe('rv-calendar — keyboard, LTR', () => {
  it('ArrowLeft goes to the previous day and moves the tab stop', () => {
    const mounted = mount();
    mounted.activate();
    mounted.press('ArrowLeft');
    expect(mounted.calendar.focused()).toEqual(d(2026, 10, 24));
    expect(mounted.active()?.dataset['date']).toBe('2026-10-24');
    expect(document.activeElement).toBe(mounted.active());
  });

  it('ArrowRight goes to the next day', () => {
    const mounted = mount();
    mounted.activate();
    mounted.press('ArrowRight');
    expect(mounted.calendar.focused()).toEqual(d(2026, 10, 26));
  });

  it('ArrowUp/Down move a week', () => {
    const mounted = mount();
    mounted.activate();
    mounted.press('ArrowUp');
    expect(mounted.calendar.focused()).toEqual(d(2026, 10, 18));
    mounted.press('ArrowDown');
    expect(mounted.calendar.focused()).toEqual(d(2026, 10, 25));
  });

  it('Home/End reach the ends of the week', () => {
    const mounted = mount();
    mounted.activate();
    mounted.press('Home');
    expect(mounted.calendar.focused()).toEqual(d(2026, 10, 25));
    mounted.press('End');
    expect(mounted.calendar.focused()).toEqual(d(2026, 10, 31));
  });

  it('PageDown moves to the next month and re-renders the grid', () => {
    const mounted = mount();
    mounted.activate();
    mounted.press('PageDown');
    expect(mounted.heading()).toBe('November 2026');
    expect(mounted.cells()[0].dataset['date']).toBe('2026-11-01');
    expect(mounted.calendar.focused()).toEqual(d(2026, 11, 25));
  });

  it('Shift+PageUp moves to the previous year', () => {
    const mounted = mount();
    mounted.activate();
    mounted.press('PageUp', { shiftKey: true });
    expect(mounted.heading()).toBe('October 2025');
  });

  it('Enter commits the focused day', () => {
    const mounted = mount();
    mounted.activate();
    mounted.press('ArrowRight');
    mounted.press('Enter');
    expect(mounted.host.picked).toEqual(d(2026, 10, 26));
  });

  it('Escape asks the host to dismiss', () => {
    const mounted = mount();
    mounted.activate();
    mounted.press('Escape');
    expect(mounted.host.dismissed).toBe(1);
  });

  it('ignores modifier combinations', () => {
    const mounted = mount();
    mounted.activate();
    mounted.press('ArrowLeft', { ctrlKey: true });
    expect(mounted.calendar.focused()).toEqual(d(2026, 10, 25));
  });

  it('never commits a disabled day from the keyboard', () => {
    const mounted = mount({ min: d(2026, 10, 26) });
    // Today (25 October) is out of range, so the initial focus clamps to the
    // 26th; one day back is the disabled 25th. Focus may land there — a
    // disabled day is reachable, it just cannot be committed.
    mounted.activate();
    mounted.press('ArrowLeft');
    expect(mounted.calendar.focused()).toEqual(d(2026, 10, 25));
    mounted.press('Enter');
    expect(mounted.host.picked).toBeNull();
  });
});

describe('rv-calendar — keyboard, RTL', () => {
  it('ArrowLeft moves FORWARD in time', () => {
    const mounted = mount({ firstDay: 6 });
    mounted.setDirection('rtl');
    mounted.activate();
    mounted.press('ArrowLeft');
    expect(mounted.calendar.focused()).toEqual(d(2026, 10, 26));
  });

  it('ArrowRight moves BACK in time', () => {
    const mounted = mount({ firstDay: 6 });
    mounted.setDirection('rtl');
    mounted.activate();
    mounted.press('ArrowRight');
    expect(mounted.calendar.focused()).toEqual(d(2026, 10, 24));
  });

  it('PageDown is not mirrored', () => {
    const mounted = mount({ firstDay: 6 });
    mounted.setDirection('rtl');
    mounted.activate();
    mounted.press('PageDown');
    expect(mounted.heading()).toBe('November 2026');
  });
});

describe('rv-calendar — month and year views', () => {
  it('the heading opens the month view', () => {
    const mounted = mount();
    const headingButton = mounted.el.querySelector('.rv-calendar-heading') as HTMLElement;
    expect(headingButton.getAttribute('aria-label')).toBe('October 2026 — Switch to month view');
    mounted.click(headingButton);
    const months = Array.from(mounted.el.querySelectorAll<HTMLElement>('[data-month]'));
    expect(months).toHaveLength(12);
    expect(months[9].textContent?.trim()).toBe('October');
    expect(months[9].getAttribute('aria-current')).toBe('true');
    expect(mounted.heading()).toBe('2026');
  });

  it('choosing a month returns to the day grid of that month', () => {
    const mounted = mount();
    mounted.click(mounted.el.querySelector('.rv-calendar-heading')!);
    const february = mounted.el.querySelector('[data-month="2"]') as HTMLElement;
    mounted.click(february);
    expect(mounted.heading()).toBe('February 2026');
    expect(mounted.cells()[0].dataset['date']).toBe('2026-02-01');
  });

  it('the month-view heading opens the year view', () => {
    const mounted = mount();
    mounted.click(mounted.el.querySelector('.rv-calendar-heading')!);
    const headingButton = mounted.el.querySelector('.rv-calendar-heading') as HTMLElement;
    expect(headingButton.getAttribute('aria-label')).toBe('2026 — Switch to year view');
    mounted.click(headingButton);
    const years = Array.from(mounted.el.querySelectorAll<HTMLElement>('[data-year]'));
    expect(years).toHaveLength(12);
    expect(years[10].textContent?.trim()).toBe('2026');
    expect(mounted.heading()).toBe('2016 – 2027');
  });

  it('choosing a year lands on its month view', () => {
    const mounted = mount();
    mounted.click(mounted.el.querySelector('.rv-calendar-heading')!);
    mounted.click(mounted.el.querySelector('.rv-calendar-heading')!);
    mounted.click(mounted.el.querySelector('[data-year="2024"]')!);
    expect(mounted.heading()).toBe('2024');
    expect(mounted.el.querySelectorAll('[data-month]')).toHaveLength(12);
  });

  it('month view: ArrowRight goes to the next month in LTR', () => {
    const mounted = mount();
    mounted.calendar.setView('month');
    mounted.settle();
    mounted.activate();
    mounted.press('ArrowRight');
    expect(mounted.calendar.focused().month).toBe(11);
    expect(mounted.heading()).toBe('2026');
  });

  it('month view RTL: ArrowLeft goes to the next month', () => {
    const mounted = mount();
    mounted.calendar.setView('month');
    mounted.setDirection('rtl');
    mounted.settle();
    mounted.activate();
    mounted.press('ArrowLeft');
    expect(mounted.calendar.focused().month).toBe(11);
  });

  it('year view: PageDown moves twelve years', () => {
    const mounted = mount();
    mounted.calendar.setView('year');
    mounted.settle();
    mounted.activate();
    mounted.press('PageDown');
    expect(mounted.heading()).toBe('2028 – 2039');
  });
});
