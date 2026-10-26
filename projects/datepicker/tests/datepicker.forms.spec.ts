import { Component, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormField, form } from '@angular/forms/signals';
import { beforeEach, describe, expect, it } from 'vitest';
import { DATE_PICKER_CONFIG } from '../src/public-api';
import { RiviniaDatepickerComponent } from '../ui/src/public-api';
import type { RiviniaDate } from '../src/public-api';

const d = (year: number, month: number, day: number): RiviniaDate => ({ year, month, day });
const TODAY = d(2026, 10, 25);

/*
 * The picker implements Angular's `FormValueControl` contract: a writable
 * `value` model (plus an optional `touch` output). That ONE contract is what
 * makes Reactive Forms, `ngModel` and the new Signal Forms all bind it with no
 * custom accessor — the value is a `RiviniaDate`, never a `Date` and never a
 * locale-dependent string.
 */

@Component({
  selector: 'rv-forms-host',
  imports: [ReactiveFormsModule, RiviniaDatepickerComponent],
  template: `<rv-datepicker [formControl]="control" [clearable]="true" (valueChange)="changes.push($event)" />`,
})
class FormsHost {
  readonly control = new FormControl<RiviniaDate | null>(null);
  readonly changes: (RiviniaDate | null)[] = [];
}

@Component({
  selector: 'rv-ngmodel-host',
  imports: [FormsModule, RiviniaDatepickerComponent],
  template: `<rv-datepicker [(ngModel)]="value" />`,
})
class NgModelHost {
  value: RiviniaDate | null = d(2026, 3, 15);
}

function mountReactive(): { fixture: ComponentFixture<FormsHost>; host: FormsHost; el: HTMLElement } {
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
  el.querySelector('.rv-datepicker-trigger')?.textContent?.trim() ?? '';

const openAndPick = (fixture: ComponentFixture<unknown>, el: HTMLElement, iso: string): void => {
  (el.querySelector('.rv-datepicker-trigger') as HTMLButtonElement).click();
  fixture.detectChanges();
  const cell = Array.from(el.querySelectorAll<HTMLElement>('td[role="gridcell"]')).find(
    (candidate) => candidate.dataset['date'] === iso,
  );
  (cell as HTMLElement).click();
  fixture.detectChanges();
};

describe('rv-datepicker — reactive forms', () => {
  let fixture: ComponentFixture<FormsHost>;
  let host: FormsHost;
  let el: HTMLElement;
  beforeEach(() => {
    ({ fixture, host, el } = mountReactive());
  });

  it('writeValue shows the value', () => {
    host.control.setValue(d(2026, 3, 15));
    fixture.detectChanges();
    expect(triggerText(el)).toBe('Mar 15, 2026');
  });

  it('writeValue accepts an ISO string', () => {
    host.control.setValue('2026-03-15' as unknown as RiviniaDate);
    fixture.detectChanges();
    expect(triggerText(el)).toBe('Mar 15, 2026');
  });

  it('writeValue(null) clears it', () => {
    host.control.setValue(d(2026, 3, 15));
    fixture.detectChanges();
    host.control.setValue(null);
    fixture.detectChanges();
    expect(triggerText(el)).toBe('Choose date');
  });

  it('writeValue does not echo back through valueChange', () => {
    host.control.setValue(d(2026, 3, 15));
    fixture.detectChanges();
    expect(host.changes).toHaveLength(0);
  });

  it('picking a day updates the control and marks it dirty and touched', () => {
    fixture.detectChanges();
    openAndPick(fixture, el, '2026-10-12');
    expect(host.control.value).toEqual(d(2026, 10, 12));
    expect(host.control.dirty).toBe(true);
    expect(host.control.touched).toBe(true);
    expect(host.changes).toHaveLength(1);
    expect(triggerText(el)).toBe('Oct 12, 2026');
  });

  it('disable() disables the trigger, enable() re-enables it', () => {
    host.control.disable();
    fixture.detectChanges();
    const trigger = el.querySelector('.rv-datepicker-trigger') as HTMLButtonElement;
    expect(trigger.disabled).toBe(true);

    host.control.enable();
    fixture.detectChanges();
    expect(trigger.disabled).toBe(false);
  });

  it('reset() clears the value', () => {
    host.control.setValue(d(2026, 3, 15));
    fixture.detectChanges();
    host.control.reset();
    fixture.detectChanges();
    expect(triggerText(el)).toBe('Choose date');
  });

  it('the clear button empties the control, publishes null and marks it touched', () => {
    host.control.setValue(d(2026, 3, 15));
    fixture.detectChanges();

    (el.querySelector('.rv-datepicker-clear') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(host.control.value).toBeNull();
    expect(host.control.touched).toBe(true);
    expect(host.changes.at(-1)).toBeNull();
    expect(triggerText(el)).toBe('Choose date');
  });

  it('a programmatic write while open moves the calendar to that month', () => {
    (el.querySelector('.rv-datepicker-trigger') as HTMLButtonElement).click();
    fixture.detectChanges();

    host.control.setValue(d(2027, 2, 10));
    fixture.detectChanges();

    const active = document.activeElement as HTMLElement;
    const heading = el.querySelector('.rv-calendar-heading-text')?.textContent?.trim();
    expect(heading).toBe('February 2027');
    expect(active.dataset['date']).toBe('2027-02-10');
  });
});

describe('rv-datepicker — template-driven forms', () => {
  it('ngModel reads the initial value and receives a pick', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [NgModelHost],
      providers: [{ provide: DATE_PICKER_CONFIG, useValue: { today: TODAY, locale: 'en-US' } }],
    });
    const fixture = TestBed.createComponent(NgModelHost);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    // `NgModel` writes the initial value on a microtask
    // (`_updateValue` → `resolvedPromise.then`), so the first value only
    // reaches the accessor once the queue drains.
    await Promise.resolve();
    fixture.detectChanges();

    expect(triggerText(el)).toBe('Mar 15, 2026');

    // The panel opens on the month of the current value (March), so the pick
    // is made from that month — not from the current month.
    openAndPick(fixture, el, '2026-03-20');
    expect(fixture.componentInstance.value).toEqual(d(2026, 3, 20));
    expect(triggerText(el)).toBe('Mar 20, 2026');
  });
});

@Component({
  selector: 'rv-signal-host',
  imports: [FormField, RiviniaDatepickerComponent],
  template: `<rv-datepicker [formField]="form.departure" />`,
})
class SignalFormsHost {
  readonly model = signal<{ departure: RiviniaDate | null }>({ departure: null });
  readonly form = form(this.model);
}

describe('rv-datepicker — signal forms', () => {
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
    expect(triggerText(el)).toBe('Choose date');

    openAndPick(fixture, el, '2026-10-12');

    expect(fixture.componentInstance.model().departure).toEqual(d(2026, 10, 12));
    expect(fixture.componentInstance.form.departure().dirty()).toBe(true);
    expect(fixture.componentInstance.form.departure().touched()).toBe(true);
    expect(triggerText(el)).toBe('Oct 12, 2026');

    // Field → control: a programmatic write reaches the view without echoing.
    fixture.componentInstance.form.departure().value.set(d(2027, 2, 10));
    fixture.detectChanges();
    expect(triggerText(el)).toBe('Feb 10, 2027');
  });

  it('accepts the clear action from the form field', () => {
    fixture.componentInstance.form.departure().value.set(d(2026, 10, 12));
    fixture.detectChanges();
    expect(triggerText(el)).toBe('Oct 12, 2026');

    fixture.componentInstance.form.departure().reset();
    fixture.componentInstance.form.departure().value.set(null);
    fixture.detectChanges();
    expect(triggerText(el)).toBe('Choose date');
    expect(fixture.componentInstance.form.departure().dirty()).toBe(false);
  });
});
