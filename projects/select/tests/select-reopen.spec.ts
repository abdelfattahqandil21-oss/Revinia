/**
 * Reopening a single-mode select.
 *
 * The complaint: pick a value with the arrow keys, reopen, and the active row
 * starts at the FIRST option instead of the one already chosen. Multi mode
 * was already right — it never closes on a pick, so the active row stayed put.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { RiviniaSelectComponent, type SelectChange } from '../ui/src/lib/components/select/select-panel';
import type { RiviniaSelectOption } from '@rivinia/select';

const OPTIONS: readonly RiviniaSelectOption[] = [
  { id: 'a', label: 'Alpha' },
  { id: 'b', label: 'Beta' },
  { id: 'c', label: 'Gamma' },
];

@Component({
  imports: [RiviniaSelectComponent],
  template: `
    <rv-select label="Item" [options]="options" (selectionChange)="chosen.set($event)" />
  `,
})
class SingleHost {
  readonly options = OPTIONS;
  readonly chosen = signal<SelectChange>(null);
}

@Component({
  imports: [RiviniaSelectComponent],
  template: `
    <rv-select label="Item" mode="multi" [options]="options" (selectionChange)="chosen.set($event)" />
  `,
})
class MultiHost {
  readonly options = OPTIONS;
  readonly chosen = signal<SelectChange>(null);
}

function activeRow(host: HTMLElement): string | null {
  return host.querySelector('[data-active="true"]')?.getAttribute('data-rv-id') ?? null;
}

function open(host: HTMLElement): void {
  host
    .querySelector('.rv-select-trigger')
    ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('reopening a single-mode select', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [SingleHost, MultiHost] }));

  it('activates the first option when nothing is selected yet', () => {
    const fixture = TestBed.createComponent(SingleHost);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    open(host);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(activeRow(host)).toBe('a');
  });

  it('reopens on the option that was picked, not on the first one', () => {
    const fixture = TestBed.createComponent(SingleHost);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    open(host);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    // pick the THIRD option
    const rows = [...host.querySelectorAll('[rvselectpopupitem]')];
    (rows[2] as HTMLElement).click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(fixture.componentInstance.chosen()).toBe('c');

    // reopen
    open(host);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(activeRow(host)).toBe('c');
  });

  it('reopens on the selection after a second open-close cycle', () => {
    const fixture = TestBed.createComponent(SingleHost);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    open(host);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    (host.querySelectorAll('[rvselectpopupitem]')[1] as HTMLElement).click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    // close and reopen again — the selection is still 'b'
    open(host);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(activeRow(host)).toBe('b');
  });

  it('multi mode keeps the picked row active', () => {
    const fixture = TestBed.createComponent(MultiHost);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    open(host);
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    const rows = [...host.querySelectorAll('[rvselectpopupitem]')];
    (rows[2] as HTMLElement).click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(activeRow(host)).toBe('c');
  });
});
