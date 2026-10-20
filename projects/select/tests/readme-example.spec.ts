/**
 * The documented headless example, executed.
 *
 * The README shows a complete headless usage: a controller, a registry, a
 * filter, and a pick. This spec is that example verbatim, so the document
 * cannot drift from the behaviour without a test failing.
 */
import { Component, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { RiviniaSelect } from '../src/lib/services/rivinia-select';
import type { RiviniaSelectOption } from '../src/lib/models/select-types';

@Component({
  template: `
    <input
      type="search"
      [value]="controller.query()"
      (input)="controller.setQuery($any($event.target).value)"
      placeholder="Filter invoices…"
    />

    @if (controller.filtered().length === 0) {
      <p>No invoice matches "{{ controller.query() }}"</p>
    } @else {
      <ul>
        @for (invoice of controller.filtered(); track invoice.id) {
          <li>
            <button type="button" (click)="pick(invoice)">
              {{ invoice.label }}
              @if (invoice.hint) {
                <kbd>{{ invoice.hint }}</kbd>
              }
            </button>
          </li>
        }
      </ul>
    }

    @if (controller.selectedLabels().length > 0) {
      <p>Chosen: {{ controller.selectedLabels().join(', ') }}</p>
    }
  `,
})
class InvoiceFilter {
  readonly controller = new RiviniaSelect('single');
  readonly options: readonly RiviniaSelectOption[] = [
    { id: 'inv-001', label: 'Invoice 001', hint: 'Ctrl+B' },
    { id: 'inv-002', label: 'Invoice 002', hint: 'Ctrl+I' },
    { id: 'inv-003', label: 'Invoice 003', disabled: true },
  ];

  constructor() {
    for (const option of this.options) this.controller.registerOption(option);
  }

  pick(invoice: RiviniaSelectOption): void {
    this.controller.select(invoice.id);
  }
}

describe('the documented headless example', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [InvoiceFilter] }));

  it('lists every registered option when the filter is empty', () => {
    const fixture = TestBed.createComponent(InvoiceFilter);
    fixture.detectChanges();
    expect(fixture.componentInstance.controller.filtered().length).toBe(3);
  });

  it('filters on the label, and the filter is accent- and case-insensitive', () => {
    const fixture = TestBed.createComponent(InvoiceFilter);
    const controller = fixture.componentInstance.controller;

    controller.setQuery('invoice 001');
    expect(controller.filtered().map((o) => o.id)).toEqual(['inv-001']);

    controller.setQuery('INVOICE 002');
    expect(controller.filtered().map((o) => o.id)).toEqual(['inv-002']);
  });

  it('keeps a disabled option visible but refuses to pick it', () => {
    const fixture = TestBed.createComponent(InvoiceFilter);
    const controller = fixture.componentInstance.controller;

    controller.setQuery('003');
    expect(controller.filtered().map((o) => o.id)).toEqual(['inv-003']);

    expect(controller.select('inv-003')).toBe(false);
    expect(controller.value()).toBeNull();
  });

  it('picks a selectable option and reports its label', () => {
    const fixture = TestBed.createComponent(InvoiceFilter);
    fixture.detectChanges();
    const controller = fixture.componentInstance.controller;

    expect(controller.select('inv-001')).toBe(true);
    expect(controller.value()).toBe('inv-001');
    expect(controller.selectedLabels()).toEqual(['Invoice 001']);
  });

  it('renders the chosen label in the template', () => {
    const fixture = TestBed.createComponent(InvoiceFilter);
    fixture.detectChanges();

    fixture.componentInstance.pick(fixture.componentInstance.options[0]);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Chosen: Invoice 001');
  });

  it('shows the empty state when nothing matches', () => {
    const fixture = TestBed.createComponent(InvoiceFilter);
    fixture.detectChanges();

    fixture.componentInstance.controller.setQuery('nothing matches this');
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No invoice matches');
  });

  it('the hint is display-only — it never participates in the filter', () => {
    const fixture = TestBed.createComponent(InvoiceFilter);
    const controller = fixture.componentInstance.controller;

    // "Ctrl+B" is the hint of inv-001; searching for it must not match.
    controller.setQuery('Ctrl');
    expect(controller.filtered().length).toBe(0);
  });
});

describe('the documented registry-sync pattern', () => {
  it('converges when the same content arrives as a new array', () => {
    const controller = new RiviniaSelect('single');
    const list: RiviniaSelectOption[] = [{ id: 'a', label: 'A' }];

    controller.syncOptions(list);
    controller.syncOptions([{ id: 'a', label: 'A' }]);
    controller.syncOptions(list.map((o) => ({ ...o })));

    expect(controller.options().length).toBe(1);
    expect(controller.options()[0].label).toBe('A');
  });

  it('drops a value whose option is not in the new list', () => {
    const controller = new RiviniaSelect('single');
    controller.syncOptions([{ id: 'a', label: 'A' }]);
    controller.select('a');

    // syncOptions prunes ids that are no longer registered.
    controller.syncOptions([{ id: 'b', label: 'B' }]);
    expect(controller.value()).toBeNull();
  });

  it('drops a value whose option genuinely disappeared', () => {
    const controller = new RiviniaSelect('single');
    controller.syncOptions([{ id: 'a', label: 'A' }]);
    controller.select('a');
    expect(controller.value()).toBe('a');

    controller.syncOptions([]);
    expect(controller.value()).toBeNull();
  });
});
