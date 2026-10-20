import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { RiviniaSelect } from '../src/lib/services/rivinia-select';
import { RiviniaSelectComponent } from '../ui/src/lib/components/select/select-panel';

const OPTIONS = [
  { id: 'outstanding', label: 'Outstanding invoices' },
  { id: 'overdue', label: 'Overdue', disabled: true },
  { id: 'paid', label: 'Paid' },
];

@Component({
  imports: [RiviniaSelectComponent],
  template: `
    <rv-select
      [select]="select"
      [options]="options"
      [searchable]="true"
      placeholder="Status…"
      (selectionChange)="changes.push($event)"
    />
  `,
})
class SelectHarness {
  readonly select = new RiviniaSelect('single');
  readonly options = OPTIONS;
  readonly changes: unknown[] = [];
}

@Component({
  imports: [RiviniaSelectComponent],
  template: `
    <rv-select [select]="select" [options]="options" (selectionChange)="changes.push($event)" />
  `,
})
class MultiHarness {
  readonly select = new RiviniaSelect('multi');
  readonly options = OPTIONS;
  readonly changes: unknown[] = [];
}

beforeEach(() => {
  TestBed.resetTestingModule();
});

describe('RiviniaSelectComponent (single, searchable)', () => {
  it('opens, filters on typing, and picks the match with mouse', async () => {
    const fixture = TestBed.createComponent(SelectHarness);
    fixture.detectChanges();
    const menu = fixture.nativeElement.querySelector('rv-select-popup');
    menu.querySelector('.rv-select-trigger').click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();
    expect(fixture.nativeElement.querySelectorAll('[rvselectpopupitem]').length).toBe(3);

    const search: HTMLInputElement = fixture.nativeElement.querySelector('.rv-select-search');
    search.value = 'paid';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();
    const items = fixture.nativeElement.querySelectorAll('[rvselectpopupitem]');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('Paid');
    expect(
      fixture.nativeElement.querySelector('.rv-select-trigger').getAttribute('aria-expanded'),
    ).toBe('true');

    (items[0] as HTMLElement).click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();
    expect(fixture.componentInstance.changes).toEqual(['paid']);
    expect(fixture.componentInstance.select.value()).toBe('paid');
    expect(fixture.nativeElement.querySelector('.rv-select-popup-panel')).toBeNull();
    expect(items[0].getAttribute('role')).toBe('menuitem');
    expect(items[0].hasAttribute('aria-checked')).toBe(false);
    expect(fixture.nativeElement.querySelector('.rv-select-value').textContent).toContain('Paid');
  });

  it('shows the empty state and ignores disabled picks', async () => {
    const fixture = TestBed.createComponent(SelectHarness);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.rv-select-trigger').click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();

    const search: HTMLInputElement = fixture.nativeElement.querySelector('.rv-select-search');
    search.value = 'zzz';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.rv-select-empty')).not.toBeNull();

    search.value = '';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();
    const items = fixture.nativeElement.querySelectorAll('[rvselectpopupitem]');
    (items[1] as HTMLElement).click();
    expect(fixture.componentInstance.changes).toEqual([]);
    expect(fixture.componentInstance.select.value()).toBeNull();
    expect(fixture.nativeElement.querySelector('.rv-select-popup-panel')).not.toBeNull();
  });
});

describe('RiviniaSelectComponent (multi)', () => {
  it('toggles values, keeps the panel open, and marks with checks', async () => {
    const fixture = TestBed.createComponent(MultiHarness);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.rv-select-trigger').click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();

    const items = () => fixture.nativeElement.querySelectorAll('[rvselectpopupitem]');
    (items()[0] as HTMLElement).click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();
    (items()[2] as HTMLElement).click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();
    expect(fixture.componentInstance.changes).toEqual([['outstanding'], ['outstanding', 'paid']]);
    expect(fixture.componentInstance.select.values()).toEqual(['outstanding', 'paid']);
    expect(fixture.nativeElement.querySelector('.rv-select-popup-panel')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.rv-select-check').length).toBe(2);
    const rows = fixture.nativeElement.querySelectorAll('[rvselectpopupitem]');
    expect(rows[0].getAttribute('role')).toBe('menuitemcheckbox');
    expect(rows[0].getAttribute('aria-checked')).toBe('true');
    expect(rows[1].getAttribute('role')).toBe('menuitemcheckbox');
    expect(rows[1].getAttribute('aria-checked')).toBe('false');
    expect(fixture.nativeElement.querySelector('.rv-select-value').textContent).toContain(
      'Outstanding invoices, Paid',
    );
  });
});

describe('RiviniaSelectComponent (search box)', () => {
  it('autofocuses search on open and keeps keystrokes inside it', async () => {
    const fixture = TestBed.createComponent(SelectHarness);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.rv-select-trigger').click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();
    const search: HTMLInputElement = fixture.nativeElement.querySelector('.rv-select-search');
    expect(document.activeElement).toBe(search);

    // Regression: keydown used to bubble to the panel typeahead, which stole
    // focus to an item mid-word and the typed text never landed.
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true }));
    expect(document.activeElement).toBe(search);

    search.value = 'paid';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();
    expect(fixture.componentInstance.select.query()).toBe('paid');
    expect(fixture.nativeElement.querySelectorAll('[rvselectpopupitem]').length).toBe(1);
    expect(document.activeElement).toBe(search);
  });

  it('clears the query when the panel closes', async () => {
    const fixture = TestBed.createComponent(SelectHarness);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.rv-select-trigger').click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();
    await Promise.resolve();

    const search: HTMLInputElement = fixture.nativeElement.querySelector('.rv-select-search');
    search.value = 'zzz';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    expect(fixture.componentInstance.select.query()).toBe('zzz');

    const panel: HTMLElement = fixture.nativeElement.querySelector('.rv-select-popup-panel');
    panel.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(fixture.componentInstance.select.query()).toBe('');
    expect(fixture.nativeElement.querySelector('.rv-select-trigger').textContent).toContain(
      'Status',
    );
  });
});
