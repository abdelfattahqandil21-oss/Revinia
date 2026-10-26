import { Component, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DATE_PICKER_CONFIG } from '../src/public-api';
import { RiviniaDatepickerComponent } from '../ui/src/public-api';
import type {
  RiviniaDate,
  RiviniaDateFormat,
  RiviniaDatepickerConfig,
  RiviniaDatepickerTheme,
} from '../src/public-api';

const d = (year: number, month: number, day: number): RiviniaDate => ({ year, month, day });
const TODAY = d(2026, 10, 25);

@Component({
  selector: 'rv-test-host',
  imports: [RiviniaDatepickerComponent],
  template: `
    <rv-datepicker
      [value]="value()"
      [locale]="locale"
      [format]="format"
      [min]="min"
      [max]="max"
      [disabled]="disabled()"
      [label]="label"
      [theme]="theme()"
      [clearable]="clearable()"
      (valueChange)="onChanged($event)"
      (touch)="touches = touches + 1"
    />
  `,
})
class TestHost {
  readonly value = signal<RiviniaDate | null>(null);
  readonly disabled = signal(false);
  readonly theme = signal<RiviniaDatepickerTheme | undefined>(undefined);
  readonly clearable = signal<boolean | undefined>(undefined);
  onChanged(value: RiviniaDate | null): void {
    this.changes.push(value);
    this.value.set(value);
  }
  locale = 'en-US';
  format: RiviniaDateFormat | undefined = undefined;
  min: RiviniaDate | undefined = undefined;
  max: RiviniaDate | undefined = undefined;
  label: string | undefined = undefined;
  touches = 0;
  readonly changes: (RiviniaDate | null)[] = [];
}

@Component({
  selector: 'rv-label-host',
  imports: [RiviniaDatepickerComponent],
  template: `<label>Departure <rv-datepicker [(value)]="value" /></label>`,
})
class LabelHost {
  readonly value = signal<RiviniaDate | null>(null);
}

interface Mounted {
  fixture: ComponentFixture<TestHost>;
  host: TestHost;
  el: HTMLElement;
  trigger: () => HTMLButtonElement;
  panel: () => HTMLElement | null;
  settle: () => void;
  open: () => void;
  cells: () => HTMLElement[];
  press: (key: string, init?: KeyboardEventInit) => void;
}

function mount(
  config: RiviniaDatepickerConfig = {},
  setup: (host: TestHost) => void = () => undefined,
): Mounted {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [TestHost],
    providers: [{ provide: DATE_PICKER_CONFIG, useValue: { today: TODAY, ...config } }],
  });
  const fixture = TestBed.createComponent(TestHost);
  setup(fixture.componentInstance);
  fixture.detectChanges();

  const el = fixture.nativeElement as HTMLElement;
  const settle = (): void => fixture.detectChanges();
  const trigger = (): HTMLButtonElement =>
    el.querySelector('.rv-datepicker-trigger') as HTMLButtonElement;
  const panel = (): HTMLElement | null => el.querySelector('.rv-datepicker-panel');

  return {
    fixture,
    host: fixture.componentInstance,
    el,
    trigger,
    panel,
    settle,
    open: () => {
      trigger().click();
      settle();
    },
    cells: () => Array.from(el.querySelectorAll<HTMLElement>('td[role="gridcell"]')),
    press: (key: string, init: KeyboardEventInit = {}) => {
      const target = (document.activeElement as HTMLElement | null) ?? panel();
      target?.dispatchEvent(
        new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
      );
      settle();
    },
  };
}

describe('rv-datepicker — the trigger', () => {
  it('shows the placeholder when empty, and is a button', () => {
    const mounted = mount();
    expect(mounted.trigger().tagName).toBe('BUTTON');
    expect(mounted.trigger().textContent?.trim()).toBe('Choose date');
    expect(mounted.trigger().getAttribute('aria-haspopup')).toBe('dialog');
    expect(mounted.trigger().getAttribute('aria-expanded')).toBe('false');
    expect(mounted.trigger().getAttribute('aria-controls')).toBeTruthy();
  });

  it('uses the field label as the accessible name', () => {
    const mounted = mount({}, (host) => {
      host.label = 'Departure';
      host.value.set(d(2026, 10, 25));
    });
    expect(mounted.trigger().getAttribute('aria-label')).toBe('Departure: Oct 25, 2026');

    const empty = mount({}, (host) => {
      host.label = 'Departure';
    });
    expect(empty.trigger().getAttribute('aria-label')).toBe('Departure: Choose date');
  });

  it('shows the value with the default medium style', () => {
    const mounted = mount({}, (host) => host.value.set(d(2026, 10, 25)));
    expect(mounted.trigger().textContent?.trim()).toBe('Oct 25, 2026');
    expect(mounted.trigger().getAttribute('aria-label')).toContain('Oct 25, 2026');
  });

  it('shows the value with an explicit pattern', () => {
    const mounted = mount({}, (host) => {
      host.value.set(d(2026, 10, 25));
      host.format = 'dd/MM/yyyy';
    });
    expect(mounted.trigger().textContent?.trim()).toBe('25/10/2026');
  });

  it('shows the user examples exactly as written', () => {
    for (const [format, expected] of [
      ['MM-dd-yyyy', '10-25-2026'],
      ['MM-dd-yy', '10-25-26'],
      ['dd-mm-yy', '25-10-26'],
      ['dd/mm/yyyy', '25/10/2026'],
    ] as const) {
      const mounted = mount({}, (host) => {
        host.value.set(d(2026, 10, 25));
        host.format = format;
      });
      expect(mounted.trigger().textContent?.trim()).toBe(expected);
    }
  });

  it('localizes with the locale, digits included', () => {
    const mounted = mount(
      { locale: 'ar-EG' },
      (host) => {
        host.locale = 'ar-EG';
        host.format = 'long';
        host.value.set(d(2026, 10, 25));
      },
    );
    expect(mounted.trigger().textContent).toContain('٢٥');
    expect(mounted.trigger().textContent).toContain('أكتوبر');
  });

  it('is disabled when asked', () => {
    const mounted = mount({}, (host) => host.disabled.set(true));
    expect(mounted.trigger().disabled).toBe(true);
    mounted.open();
    expect(mounted.panel()).toBeNull();
  });
});

describe('rv-datepicker — the panel', () => {
  let mounted: Mounted;
  beforeEach(() => {
    mounted = mount();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('opens on click as a non-modal dialog, and focuses the focused day', () => {
    mounted.open();
    const panel = mounted.panel();
    expect(panel).not.toBeNull();
    expect(panel?.getAttribute('role')).toBe('dialog');
    expect(panel?.getAttribute('aria-modal')).not.toBe('true');
    expect(mounted.trigger().getAttribute('aria-expanded')).toBe('true');

    const active = document.activeElement as HTMLElement;
    expect(active.getAttribute('role')).toBe('gridcell');
    expect(active.dataset['date']).toBe('2026-10-25');
  });

  it('is labelled by the calendar heading', () => {
    mounted.open();
    const labelledBy = mounted.panel()?.getAttribute('aria-labelledby');
    expect(labelledBy).toBeTruthy();
    const label = mounted.el.querySelector(`#${labelledBy}`);
    expect(label?.textContent?.trim()).toBe('October 2026');
  });

  it('closes when a day is picked, publishes it, and returns focus', () => {
    mounted.open();
    const day = mounted.cells().find((cell) => cell.dataset['date'] === '2026-10-12');
    (day as HTMLElement).click();
    mounted.settle();

    expect(mounted.panel()).toBeNull();
    expect(mounted.host.value()).toEqual(d(2026, 10, 12));
    expect(mounted.host.changes.at(-1)).toEqual(d(2026, 10, 12));
    expect(mounted.trigger().textContent?.trim()).toBe('Oct 12, 2026');
    expect(document.activeElement).toBe(mounted.trigger());
  });

  it('Escape closes without changing the value, and returns focus', () => {
    mounted.host.value.set(d(2026, 10, 1));
    mounted.settle();
    mounted.open();
    mounted.press('Escape');

    expect(mounted.panel()).toBeNull();
    expect(mounted.host.value()).toEqual(d(2026, 10, 1));
    expect(mounted.host.changes).toHaveLength(0);
    expect(document.activeElement).toBe(mounted.trigger());
  });

  it('a click outside closes it', () => {
    mounted.open();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    mounted.settle();
    expect(mounted.panel()).toBeNull();
  });

  it('a click inside does not close it', () => {
    mounted.open();
    mounted.panel()?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    mounted.settle();
    expect(mounted.panel()).not.toBeNull();
  });

  it('keeps the panel for the exit animation, then removes it', () => {
    vi.stubGlobal(
      'matchMedia',
      (query: string) =>
        ({
          matches: false,
          media: query,
          onchange: null,
          addListener: () => undefined,
          removeListener: () => undefined,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => false,
        }) as MediaQueryList,
    );
    mounted.open();
    vi.useFakeTimers();
    mounted.trigger().click();
    mounted.settle();

    const panel = mounted.panel();
    expect(panel?.classList.contains('rv-datepicker-panel--closing')).toBe(true);
    expect(panel?.hasAttribute('inert')).toBe(true);
    expect(mounted.trigger().getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(mounted.trigger());

    vi.advanceTimersByTime(499);
    mounted.settle();
    expect(mounted.panel()).not.toBeNull();
    vi.advanceTimersByTime(1);
    mounted.settle();
    expect(mounted.panel()).toBeNull();
  });

  it('carries the range into the grid', () => {
    const bounded = mount({}, (host) => {
      host.min = d(2026, 10, 10);
      host.max = d(2026, 10, 20);
    });
    bounded.open();
    const ninth = bounded.cells().find((cell) => cell.dataset['date'] === '2026-10-09');
    expect(ninth?.getAttribute('aria-disabled')).toBe('true');
  });

  it('marks today from the configured clock', () => {
    mounted.open();
    const today = mounted.cells().find((cell) => cell.dataset['date'] === '2026-10-25');
    expect(today?.getAttribute('aria-current')).toBe('date');
  });

  it('reopening starts on the selected month', () => {
    const selected = mount({}, (host) => host.value.set(d(2026, 3, 15)));
    selected.open();
    const active = document.activeElement as HTMLElement;
    expect(active.dataset['date']).toBe('2026-03-15');
  });
});


describe('rv-datepicker — wrapped in a <label>', () => {
  it('closes after a pick instead of letting the label re-open it', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [LabelHost],
      providers: [{ provide: DATE_PICKER_CONFIG, useValue: { today: TODAY, locale: 'en-US' } }],
    });
    const fixture = TestBed.createComponent(LabelHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    (el.querySelector('.rv-datepicker-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el.querySelector('.rv-datepicker-panel')).not.toBeNull();

    (el.querySelector('td[data-date="2026-10-12"]') as HTMLElement).click();
    fixture.detectChanges();

    expect(el.querySelector('.rv-datepicker-panel')).toBeNull();
    expect(fixture.componentInstance.value()).toEqual(d(2026, 10, 12));
  });
});

describe('rv-datepicker — theme', () => {
  const hostElement = (el: HTMLElement): HTMLElement =>
    el.querySelector('rv-datepicker') as HTMLElement;

  it('inherits the page scheme by default and pins one when asked', () => {
    const mounted = mount();
    expect(hostElement(mounted.el).getAttribute('data-theme')).toBe('auto');

    mounted.host.theme.set('dark');
    mounted.settle();
    expect(hostElement(mounted.el).getAttribute('data-theme')).toBe('dark');

    mounted.host.theme.set('light');
    mounted.settle();
    expect(hostElement(mounted.el).getAttribute('data-theme')).toBe('light');
  });

  it('takes the configured theme when the input is unbound', () => {
    const mounted = mount({ theme: 'dark' });
    expect(hostElement(mounted.el).getAttribute('data-theme')).toBe('dark');
  });

  it('lets the per-instance input win over the configuration', () => {
    const mounted = mount({ theme: 'dark' }, (host) => host.theme.set('light'));
    expect(hostElement(mounted.el).getAttribute('data-theme')).toBe('light');
  });
});

describe('rv-datepicker — clearing', () => {
  it('renders no clear button unless the field opts in', () => {
    const mounted = mount({}, (host) => host.value.set(d(2026, 10, 25)));
    expect(mounted.el.querySelector('.rv-datepicker-clear')).toBeNull();
  });

  it('clears the value, publishes null, closes the panel and returns focus', () => {
    const mounted = mount({}, (host) => {
      host.clearable.set(true);
      host.value.set(d(2026, 10, 25));
    });
    mounted.open();

    const clear = mounted.el.querySelector('.rv-datepicker-clear') as HTMLButtonElement;
    expect(clear).not.toBeNull();
    clear.click();
    mounted.settle();

    expect(mounted.host.value()).toBeNull();
    expect(mounted.host.changes.at(-1)).toBeNull();
    expect(mounted.host.touches).toBe(1);
    expect(mounted.panel()).toBeNull();
    expect(document.activeElement).toBe(mounted.trigger());
    expect(mounted.el.querySelector('.rv-datepicker-clear')).toBeNull();
  });

  it('works from the closed state too', () => {
    const mounted = mount({ clearable: true }, (host) => host.value.set(d(2026, 10, 25)));
    (mounted.el.querySelector('.rv-datepicker-clear') as HTMLButtonElement).click();
    mounted.settle();
    expect(mounted.host.value()).toBeNull();
    expect(mounted.host.touches).toBe(1);
    expect(mounted.trigger().textContent?.trim()).toBe('Choose date');
  });

  it('takes clearable from the configuration', () => {
    const mounted = mount({ clearable: true }, (host) => host.value.set(d(2026, 10, 25)));
    expect(mounted.el.querySelector('.rv-datepicker-clear')).not.toBeNull();
  });

  it('hides the button when the field is disabled', () => {
    const mounted = mount({}, (host) => {
      host.clearable.set(true);
      host.value.set(d(2026, 10, 25));
      host.disabled.set(true);
    });
    expect(mounted.el.querySelector('.rv-datepicker-clear')).toBeNull();
  });

  it('names the action after the field, in the field language', () => {
    const mounted = mount({}, (host) => {
      host.locale = 'ar-EG';
      host.clearable.set(true);
      host.value.set(d(2026, 10, 25));
      host.label = 'Departure';
    });
    const clear = mounted.el.querySelector('.rv-datepicker-clear') as HTMLButtonElement;
    expect(clear.getAttribute('aria-label')).toBe('Departure: مسح التاريخ');
  });
});

@Component({
  selector: 'rv-many-host',
  imports: [RiviniaDatepickerComponent],
  template: `
    <rv-datepicker [(value)]="first" />
    <rv-datepicker [(value)]="second" />
    <rv-datepicker [(value)]="third" />
  `,
})
class ManyPickersHost {
  readonly first = signal<RiviniaDate | null>(null);
  readonly second = signal<RiviniaDate | null>(null);
  readonly third = signal<RiviniaDate | null>(null);
}

describe('rv-datepicker — several pickers on one page', () => {
  function mountMany(): {
    fixture: ComponentFixture<ManyPickersHost>;
    el: HTMLElement;
    triggers: HTMLButtonElement[];
  } {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ManyPickersHost],
      providers: [{ provide: DATE_PICKER_CONFIG, useValue: { today: TODAY, locale: 'en-US' } }],
    });
    const fixture = TestBed.createComponent(ManyPickersHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      el,
      triggers: Array.from(el.querySelectorAll<HTMLButtonElement>('.rv-datepicker-trigger')),
    };
  }

  it('never leaves two panels open, even without a pointer event', () => {
    const { fixture, el, triggers } = mountMany();

    triggers[0].click();
    fixture.detectChanges();
    expect(triggers[0].getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelectorAll('.rv-datepicker-panel')).toHaveLength(1);

    // A keyboard activation fires NO pointerdown, which is the path that used
    // to leave the first panel open (measured in Chromium).
    triggers[1].click();
    fixture.detectChanges();
    expect(triggers[0].getAttribute('aria-expanded')).toBe('false');
    expect(triggers[1].getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelectorAll('.rv-datepicker-panel')).toHaveLength(1);
  });

  it('closes the middle picker when a third one opens', () => {
    const { fixture, el, triggers } = mountMany();

    triggers[0].click();
    fixture.detectChanges();
    triggers[1].click();
    fixture.detectChanges();
    triggers[2].click();
    fixture.detectChanges();

    expect(triggers.map((trigger) => trigger.getAttribute('aria-expanded'))).toEqual([
      'false',
      'false',
      'true',
    ]);
    expect(el.querySelectorAll('.rv-datepicker-panel')).toHaveLength(1);
  });

  it('keeps their months and values independent', () => {
    const { fixture, el, triggers } = mountMany();

    triggers[0].click();
    fixture.detectChanges();
    const firstPanel = el.querySelectorAll('.rv-datepicker-panel')[0] as HTMLElement;
    (firstPanel.querySelector('.rv-calendar-nav-next') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(firstPanel.querySelector('.rv-calendar-heading-text')?.textContent?.trim()).toBe(
      'November 2026',
    );

    (el.querySelector('td[data-date="2026-11-10"]') as HTMLElement).click();
    fixture.detectChanges();

    triggers[1].click();
    fixture.detectChanges();
    const panels = el.querySelectorAll('.rv-datepicker-panel');
    expect(panels).toHaveLength(1);
    expect(panels[0].querySelector('.rv-calendar-heading-text')?.textContent?.trim()).toBe(
      'October 2026',
    );
    expect(triggers[0].textContent?.trim()).toBe('Nov 10, 2026');
    expect(triggers[1].textContent?.trim()).toBe('Choose date');
  });
});
