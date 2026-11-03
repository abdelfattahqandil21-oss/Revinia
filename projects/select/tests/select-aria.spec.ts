/**
 * S2 (D85): the ARIA contract of the select menu, asserted on the rendered DOM.
 *
 *  1. Single-mode rows are `menuitemradio` with `aria-checked`; multi stays
 *     `menuitemcheckbox`.
 *  2. `role="menu"` owns rows only — the filter box, the loader and empty
 *     state, and the consumer's footer live beside it (D85 addendum).
 *  3. The trigger's accessible name contains its visible value, which is what
 *     WCAG 2.5.3 (axe `label-content-name-mismatch`) requires of a button
 *     whose text is the current pick.
 *
 * Keyboard coverage for arrows/Enter/Escape/Tab lives in select-contract.spec;
 * Home/End and typeahead are asserted here because S2 lists them.
 */
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { RiviniaSelectComponent } from '../ui/src/lib/components/select/select-panel';

const OPTIONS = [
  { id: 'outstanding', label: 'Outstanding invoices' },
  { id: 'overdue', label: 'Overdue', disabled: true },
  { id: 'paid', label: 'Paid' },
];

@Component({
  imports: [RiviniaSelectComponent],
  template: `<rv-select
    label="Invoice status"
    popupLabel="Invoice status options"
    [options]="options"
    [searchable]="true"
    (selectionChange)="changes.push($event)"
  />`,
})
class SearchableHarness {
  readonly options = OPTIONS;
  readonly changes: unknown[] = [];
}

@Component({
  imports: [RiviniaSelectComponent],
  template: `<rv-select [options]="options" />`,
})
class PlainHarness {
  readonly options = OPTIONS;
}

@Component({
  imports: [RiviniaSelectComponent],
  template: `<div dir="rtl"><rv-select label="حالة الفاتورة" [options]="options" /></div>`,
})
class RtlHarness {
  readonly options = OPTIONS;
}

@Component({
  imports: [RiviniaSelectComponent],
  template: `<rv-select mode="multi" [options]="options" />`,
})
class MultiHarness {
  readonly options = OPTIONS;
}

@Component({
  imports: [RiviniaSelectComponent],
  template: `<rv-select ariaLabel="Invoice status" [options]="options" />`,
})
class AriaLabelHarness {
  readonly options = OPTIONS;
}

@Component({
  imports: [RiviniaSelectComponent],
  template: `<rv-select [options]="[]" [loading]="true" />`,
})
class LoadingHarness {}

@Component({
  imports: [RiviniaSelectComponent],
  template: `<rv-select [options]="[]">
    <button rv-select-popup-footer type="button">Load more</button>
  </rv-select>`,
})
class EmptyFooterHarness {}

interface FixtureLike {
  nativeElement: HTMLElement;
  detectChanges(): void;
}

function q<T extends Element = HTMLElement>(root: ParentNode, sel: string): T {
  const el = root.querySelector(sel);
  if (!el) throw new Error(`fixture is missing "${sel}"`);
  return el as T;
}

function qa<T extends Element = HTMLElement>(root: ParentNode, sel: string): T[] {
  return Array.from(root.querySelectorAll(sel)) as T[];
}

function key(target: Element, k: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
}

async function settle(fixture: FixtureLike): Promise<void> {
  fixture.detectChanges();
  TestBed.flushEffects();
  fixture.detectChanges();
  await Promise.resolve();
  fixture.detectChanges();
}

/** The text an AT derives from `aria-labelledby` on `el`. */
function resolvedName(host: HTMLElement, el: Element): string {
  const ids = (el.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
  return ids
    .map((id) => host.querySelector(`[id="${id}"]`)?.textContent?.trim() ?? '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function open(fixture: FixtureLike): Promise<HTMLElement> {
  const host = fixture.nativeElement;
  q(host, '.rv-select-trigger').click();
  await settle(fixture);
  return q(host, '.rv-select-popup-menu');
}

beforeEach(() => {
  TestBed.resetTestingModule();
});

describe('single mode rows (D85)', () => {
  it('are menuitemradio with aria-checked, and the state follows the pick', async () => {
    const fixture = TestBed.createComponent(PlainHarness);
    fixture.detectChanges();
    const host = fixture.nativeElement;

    const menu = await open(fixture);
    const rows = qa(menu, '[rvselectpopupitem]');
    expect(rows.map((row) => row.getAttribute('role'))).toEqual([
      'menuitemradio',
      'menuitemradio',
      'menuitemradio',
    ]);
    // Nothing selected yet: every radio is unchecked, not missing the attribute.
    expect(rows.map((row) => row.getAttribute('aria-checked'))).toEqual([
      'false',
      'false',
      'false',
    ]);

    key(menu, 'ArrowDown');
    fixture.detectChanges();
    key(menu, 'Enter');
    await settle(fixture);

    // Reopen: the picked row is the checked radio, the others are unchecked.
    const reopened = await open(fixture);
    const state = qa(reopened, '[rvselectpopupitem]').map((row) => [
      row.getAttribute('role'),
      row.getAttribute('aria-checked'),
    ]);
    expect(state).toEqual([
      ['menuitemradio', 'false'],
      ['menuitemradio', 'false'],
      ['menuitemradio', 'true'],
    ]);
  });

  it('keeps the roles in RTL', async () => {
    const fixture = TestBed.createComponent(RtlHarness);
    fixture.detectChanges();
    const menu = await open(fixture);
    expect(qa(menu, '[rvselectpopupitem]').map((row) => row.getAttribute('role'))).toEqual([
      'menuitemradio',
      'menuitemradio',
      'menuitemradio',
    ]);
  });

  it('marks a disabled option as a disabled radio, not a plain item', async () => {
    const fixture = TestBed.createComponent(PlainHarness);
    fixture.detectChanges();
    const menu = await open(fixture);
    const disabled = qa(menu, '[rvselectpopupitem]')[1];
    expect(disabled.getAttribute('role')).toBe('menuitemradio');
    expect(disabled.getAttribute('aria-disabled')).toBe('true');
  });
});

describe('multi mode rows', () => {
  it('stay menuitemcheckbox, checked per pick', async () => {
    const fixture = TestBed.createComponent(MultiHarness);
    fixture.detectChanges();
    const menu = await open(fixture);
    const rows = qa(menu, '[rvselectpopupitem]');
    expect(rows.map((row) => row.getAttribute('role'))).toEqual([
      'menuitemcheckbox',
      'menuitemcheckbox',
      'menuitemcheckbox',
    ]);
    expect(rows[0].getAttribute('aria-checked')).toBe('false');
  });
});

describe('role="menu" owns rows only (D85 addendum)', () => {
  it('keeps the filter box beside the menu, not inside it', async () => {
    const fixture = TestBed.createComponent(SearchableHarness);
    fixture.detectChanges();
    const host = fixture.nativeElement;
    const menu = await open(fixture);

    const search = q(host, '.rv-select-search');
    expect(menu.contains(search)).toBe(false);
    expect(host.querySelector('[role="menu"] [role="searchbox"]')).toBeNull();
    // The box is still inside the scrollport, so the sticky rule keeps working.
    expect(q(host, '.rv-select-popup-panel').contains(search)).toBe(true);
    // And the menu still owns every row.
    expect(qa(menu, '[rvselectpopupitem]').length).toBe(3);
  });

  it('keeps the loader and the empty state beside the menu', async () => {
    const loading = TestBed.createComponent(LoadingHarness);
    loading.detectChanges();
    const loadingMenu = await open(loading);
    expect(loading.componentInstance).toBeTruthy();
    expect(loading.nativeElement.querySelector('[role="menu"] .rv-select-loading')).toBeNull();
    expect(q(loading.nativeElement, '.rv-select-popup-panel .rv-select-loading')).toBeTruthy();

    const empty = TestBed.createComponent(EmptyFooterHarness);
    empty.detectChanges();
    const emptyMenu = await open(empty);
    expect(emptyMenu.querySelector('.rv-select-empty')).toBeNull();
    expect(q(empty.nativeElement, '.rv-select-popup-panel .rv-select-empty')).toBeTruthy();
    // A consumer footer is interactive content; it must not be a menu child.
    expect(emptyMenu.querySelector('[rv-select-popup-footer]')).toBeNull();
    expect(
      q(empty.nativeElement, '.rv-select-popup-panel [rv-select-popup-footer]'),
    ).toBeTruthy();
  });

  it('names the menu and points the trigger at it', async () => {
    const fixture = TestBed.createComponent(SearchableHarness);
    fixture.detectChanges();
    const host = fixture.nativeElement;
    const menu = await open(fixture);

    expect(menu.getAttribute('role')).toBe('menu');
    expect(menu.getAttribute('aria-label')).toBe('Invoice status options');
    const trigger = q(host, '.rv-select-trigger');
    expect(trigger.getAttribute('aria-controls')).toBe(menu.id);
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    // The outer panel is a plain container now: one role="menu" per popup.
    expect(qa(host, '[role="menu"]').length).toBe(1);
    expect(q(host, '.rv-select-popup-panel').hasAttribute('role')).toBe(false);
  });
});

describe('trigger accessible name (WCAG 2.5.3)', () => {
  it('contains the caption and the visible value', async () => {
    const fixture = TestBed.createComponent(SearchableHarness);
    fixture.detectChanges();
    const host = fixture.nativeElement;
    const trigger = q(host, '.rv-select-trigger');

    const menu = await open(fixture);
    key(menu, 'End');
    fixture.detectChanges();
    key(menu, 'Enter');
    await settle(fixture);

    expect(trigger.hasAttribute('aria-label')).toBe(false);
    const name = resolvedName(host, trigger);
    expect(name).toContain('Invoice status');
    expect(name).toContain('Paid');
    // The visible text must be part of the name, not a prefix of it.
    expect(name).toContain(q(host, '.rv-select-value').textContent?.trim() ?? '');
  });

  it('contains an ariaLabel-only name and the visible value', async () => {
    const fixture = TestBed.createComponent(AriaLabelHarness);
    fixture.detectChanges();
    const host = fixture.nativeElement;
    const trigger = q(host, '.rv-select-trigger');

    const menu = await open(fixture);
    expect(menu.getAttribute('aria-label')).toBeNull();
    key(menu, 'End');
    fixture.detectChanges();
    key(menu, 'Enter');
    await settle(fixture);

    const name = resolvedName(host, trigger);
    expect(name).toContain('Invoice status');
    expect(name).toContain('Paid');
  });

  it('stays content-based when neither a caption nor ariaLabel is set', async () => {
    const fixture = TestBed.createComponent(PlainHarness);
    fixture.detectChanges();
    const trigger = q(fixture.nativeElement, '.rv-select-trigger');
    expect(trigger.hasAttribute('aria-labelledby')).toBe(false);
    expect(trigger.hasAttribute('aria-label')).toBe(false);
  });
});

describe('keyboard: Home, End and typeahead', () => {
  it('jumps to the last and first enabled rows', async () => {
    const fixture = TestBed.createComponent(PlainHarness);
    fixture.detectChanges();
    const host = fixture.nativeElement;
    const menu = await open(fixture);
    const rows = () => qa(host, '[rvselectpopupitem]');

    key(menu, 'End');
    fixture.detectChanges();
    expect(rows()[2].getAttribute('data-active')).toBe('true');

    key(menu, 'Home');
    fixture.detectChanges();
    expect(rows()[0].getAttribute('data-active')).toBe('true');
  });

  it('moves to the row matching the typed characters', async () => {
    const fixture = TestBed.createComponent(PlainHarness);
    fixture.detectChanges();
    const host = fixture.nativeElement;
    const menu = await open(fixture);
    const rows = () => qa(host, '[rvselectpopupitem]');

    key(menu, 'p');
    fixture.detectChanges();
    expect(rows()[2].getAttribute('data-active')).toBe('true');
  });
});
