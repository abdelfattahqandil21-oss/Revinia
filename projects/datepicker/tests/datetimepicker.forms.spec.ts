import { Component, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormField, form } from '@angular/forms/signals';
import { beforeEach, describe, expect, it } from 'vitest';
import { DATE_PICKER_CONFIG } from '../src/public-api';
import { RiviniaDatetimepickerComponent } from '../ui/src/public-api';
import type { RiviniaDate, RiviniaDateTime } from '../src/public-api';

const d = (year: number, month: number, day: number): RiviniaDate => ({ year, month, day });
const t = (hour: number, minute = 0, second = 0) => ({ hour, minute, second });
const dt = (year: number, month: number, day: number, hour: number, minute = 0, second = 0): RiviniaDateTime => ({
  date: d(year, month, day),
  time: t(hour, minute, second),
});
const TODAY = d(2026, 10, 25);

/*
 * The datetime picker implements the same `FormValueControl` contract as the
 * date picker: one writable `value` model plus `touch`. Reactive Forms,
 * `ngModel` and Signal Forms bind it without a ControlValueAccessor, and the
 * value is civil `{ date, time }` — never a `Date` and never a locale string.
 */

@Component({
  selector: 'rv-datetime-forms-host',
  imports: [ReactiveFormsModule, RiviniaDatetimepickerComponent],
  template: `<rv-datetimepicker
    [formControl]="control"
    [clearable]="true"
    (valueChange)="changes.push($event)"
  />`,
})
class FormsHost {
  readonly control = new FormControl<RiviniaDateTime | null>(null);
  readonly changes: (RiviniaDateTime | null)[] = [];
}

@Component({
  selector: 'rv-datetime-ngmodel-host',
  imports: [FormsModule, RiviniaDatetimepickerComponent],
  template: `<rv-datetimepicker [(ngModel)]="value" />`,
})
class NgModelHost {
  value: RiviniaDateTime | null = dt(2026, 3, 15, 9, 45);
}

function mountReactive(): {
  fixture: ComponentFixture<FormsHost>;
  host: FormsHost;
  el: HTMLElement;
} {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [FormsHost],
    providers: [{ provide: DATE_PICKER_CONFIG, useValue: { today: TODAY, locale: 'en-US' } }],
  });
  const fixture = TestBed.createComponent(FormsHost);
  fixture.detectChanges();
  return { fixture, host: fixture.componentInstance, el: fixture.nativeElement as HTMLElement };
}

const triggerText = (el: HTMLElement): string =>
  el.querySelector('.rv-datepicker-value')?.textContent?.trim() ?? '';

const openPanel = (fixture: ComponentFixture<unknown>, el: HTMLElement): HTMLElement | null => {
  (el.querySelector('.rv-datepicker-trigger') as HTMLButtonElement).click();
  fixture.detectChanges();
  return el.querySelector('.rv-datepicker-panel') as HTMLElement | null;
};

const pickDay = (fixture: ComponentFixture<unknown>, el: HTMLElement, iso: string): void => {
  const cell = Array.from(el.querySelectorAll<HTMLElement>('td[role="gridcell"]')).find(
    (candidate) => candidate.dataset['date'] === iso,
  );
  expect(cell, `day cell ${iso}`).toBeDefined();
  (cell as HTMLElement).click();
  fixture.detectChanges();
};

const ok = (fixture: ComponentFixture<unknown>, el: HTMLElement): void => {
  (el.querySelector('.rv-time-ok') as HTMLButtonElement).click();
  fixture.detectChanges();
};

const pickAndCommit = (fixture: ComponentFixture<unknown>, el: HTMLElement, iso: string): void => {
  openPanel(fixture, el);
  pickDay(fixture, el, iso);
  ok(fixture, el);
};

describe('rv-datetimepicker — reactive forms', () => {
  let fixture: ComponentFixture<FormsHost>;
  let host: FormsHost;
  let el: HTMLElement;
  beforeEach(() => {
    ({ fixture, host, el } = mountReactive());
  });

  it('writeValue shows the date and the time', () => {
    host.control.setValue(dt(2026, 3, 15, 9, 45));
    fixture.detectChanges();
    expect(triggerText(el)).toBe('Mar 15, 2026, 9:45 AM');
  });

  it('writeValue accepts an ISO date-time string', () => {
    host.control.setValue('2026-03-15T09:45' as unknown as RiviniaDateTime);
    fixture.detectChanges();
    expect(triggerText(el)).toBe('Mar 15, 2026, 9:45 AM');
  });

  it('writeValue(null) clears it', () => {
    host.control.setValue(dt(2026, 3, 15, 9, 45));
    fixture.detectChanges();
    host.control.setValue(null);
    fixture.detectChanges();
    expect(triggerText(el)).toBe('Choose date and time');
  });

  it('a programmatic write does not echo back through valueChange', () => {
    host.control.setValue(dt(2026, 3, 15, 9, 45));
    fixture.detectChanges();
    expect(host.changes).toHaveLength(0);
  });

  it('picking a day and confirming updates the control with both halves', () => {
    openPanel(fixture, el);
    pickDay(fixture, el, '2026-10-12');

    // A pick is a draft: the form still holds nothing until OK.
    expect(host.control.value).toBeNull();
    expect(host.changes).toHaveLength(0);

    ok(fixture, el);
    expect(host.control.value?.date).toEqual(d(2026, 10, 12));
    expect(host.control.value?.time).toBeDefined();
    expect(host.control.dirty).toBe(true);
    expect(host.control.touched).toBe(true);
    expect(host.changes).toHaveLength(1);
    expect(triggerText(el)).toContain('Oct 12, 2026');
  });

  it('keeps the time half when the day changes', () => {
    host.control.setValue(dt(2026, 3, 15, 9, 45));
    fixture.detectChanges();
    pickAndCommit(fixture, el, '2026-03-20');
    expect(host.control.value).toEqual(dt(2026, 3, 20, 9, 45));
  });

  it('disable() disables the trigger and the time controls; enable() restores them', () => {
    host.control.disable();
    fixture.detectChanges();
    expect((el.querySelector('.rv-datepicker-trigger') as HTMLButtonElement).disabled).toBe(true);

    host.control.enable();
    fixture.detectChanges();
    expect((el.querySelector('.rv-datepicker-trigger') as HTMLButtonElement).disabled).toBe(false);

    openPanel(fixture, el);
    expect((el.querySelector('.rv-time-hour') as HTMLInputElement).disabled).toBe(false);
  });

  it('reset() clears the value', () => {
    host.control.setValue(dt(2026, 3, 15, 9, 45));
    fixture.detectChanges();
    host.control.reset();
    fixture.detectChanges();
    expect(triggerText(el)).toBe('Choose date and time');
  });

  it('the clear button empties the control, publishes null and marks it touched', () => {
    host.control.setValue(dt(2026, 3, 15, 9, 45));
    fixture.detectChanges();

    (el.querySelector('.rv-datepicker-clear') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(host.control.value).toBeNull();
    expect(host.control.touched).toBe(true);
    expect(host.changes.at(-1)).toBeNull();
    expect(triggerText(el)).toBe('Choose date and time');
  });

  it('a programmatic write while open moves the calendar and the draft', () => {
    openPanel(fixture, el);
    host.control.setValue(dt(2027, 2, 10, 14, 5));
    fixture.detectChanges();

    const heading = el.querySelector('.rv-calendar-heading-text')?.textContent?.trim();
    expect(heading).toBe('February 2027');
    expect((el.querySelector('.rv-time-hour') as HTMLInputElement).value).toBe('02');
    expect((el.querySelector('.rv-time-minute') as HTMLInputElement).value).toBe('05');
    expect(triggerText(el)).toBe('Feb 10, 2027, 2:05 PM');
  });
});

describe('rv-datetimepicker — template-driven forms', () => {
  it('ngModel reads the initial value and receives a confirmed pick', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [NgModelHost],
      providers: [{ provide: DATE_PICKER_CONFIG, useValue: { today: TODAY, locale: 'en-US' } }],
    });
    const fixture = TestBed.createComponent(NgModelHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    await Promise.resolve();
    fixture.detectChanges();

    expect(triggerText(el)).toBe('Mar 15, 2026, 9:45 AM');

    pickAndCommit(fixture, el, '2026-03-20');
    expect(fixture.componentInstance.value).toEqual(dt(2026, 3, 20, 9, 45));
    expect(triggerText(el)).toBe('Mar 20, 2026, 9:45 AM');
  });
});

@Component({
  selector: 'rv-datetime-signal-host',
  imports: [FormField, RiviniaDatetimepickerComponent],
  template: `<rv-datetimepicker [formField]="form.appointment" />`,
})
class SignalFormsHost {
  readonly model = signal<{ appointment: RiviniaDateTime | null }>({ appointment: null });
  readonly form = form(this.model);
}

describe('rv-datetimepicker — signal forms', () => {
  let fixture: ComponentFixture<SignalFormsHost>;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [SignalFormsHost],
      providers: [{ provide: DATE_PICKER_CONFIG, useValue: { today: TODAY, locale: 'en-US' } }],
    });
    fixture = TestBed.createComponent(SignalFormsHost);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  it('binds the value both ways and reports dirty and touched', () => {
    expect(triggerText(el)).toBe('Choose date and time');

    pickAndCommit(fixture, el, '2026-10-12');

    expect(fixture.componentInstance.model().appointment?.date).toEqual(d(2026, 10, 12));
    expect(fixture.componentInstance.model().appointment?.time).toBeDefined();
    expect(fixture.componentInstance.form.appointment().dirty()).toBe(true);
    expect(fixture.componentInstance.form.appointment().touched()).toBe(true);
    expect(triggerText(el)).toContain('Oct 12, 2026');

    // Field → control: a programmatic write reaches the view without echoing.
    fixture.componentInstance.form.appointment().value.set(dt(2027, 2, 10, 16, 30));
    fixture.detectChanges();
    expect(triggerText(el)).toBe('Feb 10, 2027, 4:30 PM');
  });

  it('accepts the clear action from the form field', () => {
    fixture.componentInstance.form.appointment().value.set(dt(2026, 10, 12, 8, 15));
    fixture.detectChanges();
    expect(triggerText(el)).toBe('Oct 12, 2026, 8:15 AM');

    fixture.componentInstance.form.appointment().reset();
    fixture.componentInstance.form.appointment().value.set(null);
    fixture.detectChanges();
    expect(triggerText(el)).toBe('Choose date and time');
    expect(fixture.componentInstance.form.appointment().dirty()).toBe(false);
  });
});
