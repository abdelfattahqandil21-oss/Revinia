import { Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { RiviniaSelect } from '../src/lib/services/rivinia-select';
import type { RiviniaSelectController } from '../src/lib/models/select-types';
import { RiviniaSelectComponent, type SelectChange } from '../ui/src/lib/components/select/select-panel';

const OPTIONS = [
  { id: 'outstanding', label: 'Outstanding invoices' },
  { id: 'overdue', label: 'Overdue', disabled: true },
  { id: 'paid', label: 'Paid' },
];

/** The `mode` input disagrees with the controller; the controller must win. */
@Component({
  imports: [RiviniaSelectComponent],
  template: `
    <rv-select
      [select]="single"
      mode="multi"
      [options]="options"
      (selectionChange)="changes.push($event)"
    />
  `,
})
class ModeMismatch {
  readonly single = new RiviniaSelect('single');
  readonly options = OPTIONS;
  readonly changes: unknown[] = [];
}

@Component({
  imports: [RiviniaSelectComponent],
  template: `
    <rv-select [select]="first" [options]="options" />
    <rv-select [select]="second" [options]="options" />
  `,
})
class TwoControllers {
  readonly first = new RiviniaSelect('single');
  readonly second = new RiviniaSelect('single');
  readonly options = OPTIONS;
}

/**
 * One controller, one logical value: both components bind the same `value`
 * model, so neither treats the controller as stale.
 */
@Component({
  imports: [RiviniaSelectComponent],
  template: `
    <rv-select [select]="shared" [options]="options" [(value)]="value" />
    <rv-select [select]="shared" [options]="options" [(value)]="value" />
  `,
})
class SharedController {
  readonly shared = new RiviniaSelect('single');
  readonly options = OPTIONS;
  readonly value = signal<SelectChange>(null);
}

@Component({
  imports: [RiviniaSelectComponent],
  template: `<rv-select [select]="current()" [options]="options" />`,
})
class SwappedController {
  readonly before = new RiviniaSelect('single');
  readonly after = new RiviniaSelect('single');
  readonly current = signal<RiviniaSelectController>(this.before);
  readonly options = OPTIONS;
}

function triggers(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return [...fixture.nativeElement.querySelectorAll('.rv-select-trigger')] as HTMLElement[];
}

function rows(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return [...fixture.nativeElement.querySelectorAll('[rvselectpopupitem]')] as HTMLElement[];
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  TestBed.flushEffects();
  fixture.detectChanges();
  await Promise.resolve();
}

async function open(fixture: ComponentFixture<unknown>, index = 0): Promise<void> {
  triggers(fixture)[index].click();
  await settle(fixture);
}

beforeEach(() => {
  TestBed.resetTestingModule();
});

describe('controller ownership', () => {
  it('uses the bound controller mode, not the mode input', async () => {
    const fixture = TestBed.createComponent(ModeMismatch);
    await settle(fixture);
    await open(fixture);

    rows(fixture)[0].click();
    await settle(fixture);

    expect(fixture.componentInstance.changes).toEqual(['outstanding']);
    expect(fixture.componentInstance.single.value()).toBe('outstanding');
    expect(fixture.componentInstance.single.values()).toEqual([]);
    // Single mode closes on pick; multi would have kept the panel open.
    expect(fixture.nativeElement.querySelector('.rv-select-popup-panel')).toBeNull();
  });

  it('keeps two selects with their own controllers independent', async () => {
    const fixture = TestBed.createComponent(TwoControllers);
    await settle(fixture);
    await open(fixture, 0);

    rows(fixture)[0].click();
    await settle(fixture);

    const { first, second } = fixture.componentInstance;
    expect(first.value()).toBe('outstanding');
    expect(second.value()).toBeNull();
    expect(triggers(fixture)[0].textContent).toContain('Outstanding invoices');
    expect(triggers(fixture)[1].textContent).toContain('Select…');
  });

  it('shares the selection between two selects bound to one controller', async () => {
    const fixture = TestBed.createComponent(SharedController);
    await settle(fixture);
    await open(fixture, 0);

    rows(fixture)[0].click();
    await settle(fixture);

    expect(fixture.componentInstance.shared.selectedLabels()).toEqual(['Outstanding invoices']);
    expect(triggers(fixture)[0].textContent).toContain('Outstanding invoices');
    expect(triggers(fixture)[1].textContent).toContain('Outstanding invoices');
  });

  it('does not share the panel even when the controller is shared', async () => {
    const fixture = TestBed.createComponent(SharedController);
    await settle(fixture);
    await open(fixture, 0);

    rows(fixture)[0].click();
    await settle(fixture);
    await open(fixture, 1);

    expect(fixture.nativeElement.querySelectorAll('.rv-select-popup-panel').length).toBe(1);
    expect(triggers(fixture)[0].getAttribute('aria-expanded')).toBe('false');
    expect(triggers(fixture)[1].getAttribute('aria-expanded')).toBe('true');
  });

  it('follows a controller swapped at runtime', async () => {
    const fixture = TestBed.createComponent(SwappedController);
    await settle(fixture);
    expect(triggers(fixture)[0].textContent).toContain('Select…');

    const { after, before, current } = fixture.componentInstance;
    current.set(after);
    await settle(fixture);

    await open(fixture);
    rows(fixture)[2].click();
    await settle(fixture);

    expect(after.value()).toBe('paid');
    expect(before.value()).toBeNull();
    expect(triggers(fixture)[0].textContent).toContain('Paid');
  });
});
