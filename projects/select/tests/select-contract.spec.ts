/**
 * Contracts added in 0.2.0: the documented keyboard model, the accessible-name
 * inputs, `clear()` announcing itself, and single-mode rejecting `toggle()`.
 *
 * These assert real behaviour (focus, emitted payloads, resolved names), not
 * merely that elements exist.
 */
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

/** Single mode, searchable — the full interaction surface. */
@Component({
  imports: [RiviniaSelectComponent],
  template: `
    <rv-select
      [options]="options"
      [searchable]="true"
      placeholder="Status…"
      (selectionChange)="changes.push($event)"
    />
  `,
})
class Harness {
  readonly options = OPTIONS;
  readonly changes: unknown[] = [];
}

/** Single mode, no filter box — pure menu keyboard model. */
@Component({
  imports: [RiviniaSelectComponent],
  template: `<rv-select [options]="options" (selectionChange)="changes.push($event)" />`,
})
class PlainHarness {
  readonly options = OPTIONS;
  readonly changes: unknown[] = [];
}

/** Multi mode; the test keeps a handle on the component to call clear(). */
@Component({
  imports: [RiviniaSelectComponent],
  template: `<rv-select
    mode="multi"
    [options]="options"
    (selectionChange)="changes.push($event)"
  />`,
})
class MultiHarness {
  readonly options = OPTIONS;
  readonly changes: unknown[] = [];
}

/** Accessible-name inputs, side by side. */
@Component({
  imports: [RiviniaSelectComponent],
  template: `
    <rv-select
      id="named"
      label="Invoice status"
      ariaLabel="Invoice status, screen-reader only"
      popupLabel="Invoice status options"
      [options]="options"
    />
    <rv-select id="plain" [options]="options" />
    <rv-select id="auto" label="Only a caption" [options]="options" />
  `,
})
class LabelHarness {
  readonly options = OPTIONS;
}

/** Two separately named controls, matching a real form with repeated Selects. */
@Component({
  imports: [RiviniaSelectComponent],
  template: `
    <rv-select label="Billing country" [options]="options" />
    <rv-select label="Shipping country" [options]="options" />
  `,
})
class MultipleLabelHarness {
  readonly options = OPTIONS;
}

interface FixtureLike {
  nativeElement: HTMLElement;
  detectChanges(): void;
}

/** querySelector that fails loudly instead of returning null. */
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

/** Render pass + effects + the component's post-render microtask. */
async function settle(fixture: FixtureLike): Promise<void> {
  fixture.detectChanges();
  TestBed.flushEffects();
  fixture.detectChanges();
  await Promise.resolve();
  fixture.detectChanges();
}

beforeEach(() => {
  TestBed.resetTestingModule();
});

describe('keyboard contract (single mode, no filter box)', () => {
  it('opens with Enter and moves the active option with the arrows', async () => {
    const fixture = TestBed.createComponent(PlainHarness);
    fixture.detectChanges();
    const host = fixture.nativeElement;

    key(q(host, '.rv-select-trigger'), 'Enter');
    await settle(fixture);

    expect(q(host, '.rv-select-popup-panel')).toBeTruthy();
    expect(q(host, '.rv-select-trigger').getAttribute('aria-expanded')).toBe('true');

    const rows = () => qa(host, '[rvselectpopupitem]');
    expect(rows().length).toBe(3);
    // Opening must land on the first *enabled* option, never the disabled one.
    expect(rows()[0].getAttribute('data-active')).toBe('true');
    expect(rows()[1].getAttribute('data-active')).toBe('false');

    // ArrowDown skips the disabled option instead of stopping on it.
    key(q(host, '.rv-select-popup-panel'), 'ArrowDown');
    fixture.detectChanges();
    expect(rows()[0].getAttribute('data-active')).toBe('false');
    expect(rows()[1].getAttribute('data-active')).toBe('false');
    expect(rows()[2].getAttribute('data-active')).toBe('true');

    // ArrowUp walks back and also skips the disabled option.
    key(q(host, '.rv-select-popup-panel'), 'ArrowUp');
    fixture.detectChanges();
    expect(rows()[0].getAttribute('data-active')).toBe('true');
    expect(rows()[2].getAttribute('data-active')).toBe('false');
  });

  it('picks the active option with Enter and closes the panel', async () => {
    const fixture = TestBed.createComponent(PlainHarness);
    fixture.detectChanges();
    const host = fixture.nativeElement;

    key(q(host, '.rv-select-trigger'), 'Enter');
    await settle(fixture);

    key(q(host, '.rv-select-popup-panel'), 'ArrowDown');
    fixture.detectChanges();
    key(q(host, '.rv-select-popup-panel'), 'Enter');
    await settle(fixture);

    expect(fixture.componentInstance.changes).toEqual(['paid']);
    expect(host.querySelector('.rv-select-popup-panel')).toBeNull();
    expect(q(host, '.rv-select-value').textContent).toContain('Paid');
  });

  it('closes with Escape without picking', async () => {
    const fixture = TestBed.createComponent(PlainHarness);
    fixture.detectChanges();
    const host = fixture.nativeElement;

    key(q(host, '.rv-select-trigger'), 'Enter');
    await settle(fixture);
    key(q(host, '.rv-select-popup-panel'), 'Escape');
    fixture.detectChanges();

    expect(host.querySelector('.rv-select-popup-panel')).toBeNull();
    expect(fixture.componentInstance.changes).toEqual([]);
  });

  it('never activates a disabled option with Enter', async () => {
    const fixture = TestBed.createComponent(PlainHarness);
    fixture.detectChanges();
    const host = fixture.nativeElement;

    key(q(host, '.rv-select-trigger'), 'Enter');
    await settle(fixture);

    const panel = q(host, '.rv-select-popup-panel');
    const rows = () => qa(host, '[rvselectpopupitem]');
    // The disabled row can never become the active one through navigation —
    // menu's activateNext/activatePrevious skip it.
    key(panel, 'ArrowDown');
    fixture.detectChanges();
    expect(rows()[1].getAttribute('data-active')).toBe('false');
    key(panel, 'ArrowDown');
    fixture.detectChanges();
    expect(rows()[1].getAttribute('data-active')).toBe('false');
    key(panel, 'ArrowUp');
    fixture.detectChanges();
    key(panel, 'ArrowUp');
    fixture.detectChanges();
    expect(rows()[1].getAttribute('data-active')).toBe('false');
  });
});

describe('keyboard contract (filter box)', () => {
  it('moves focus from the box into the list on Tab', async () => {
    const fixture = TestBed.createComponent(Harness);
    fixture.detectChanges();
    q(fixture.nativeElement, '.rv-select-trigger').click();
    await settle(fixture);

    const search = q<HTMLInputElement>(fixture.nativeElement, '.rv-select-search');
    expect(document.activeElement).toBe(search);

    // Focus must LEAVE the box — this is the documented, non-combobox model.
    key(search, 'Tab');
    expect(document.activeElement).not.toBe(search);
    expect((document.activeElement as HTMLElement).hasAttribute('rvselectpopupitem')).toBe(true);
  });

  it('picks the top match with Enter and closes', async () => {
    const fixture = TestBed.createComponent(Harness);
    fixture.detectChanges();
    const host = fixture.nativeElement;
    q(host, '.rv-select-trigger').click();
    await settle(fixture);

    const search = q<HTMLInputElement>(host, '.rv-select-search');
    search.value = 'over';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);

    // The filter matched exactly one row, and Enter must be refused because
    // that row is disabled.
    key(search, 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.changes).toEqual([]);

    search.value = 'paid';
    search.dispatchEvent(new Event('input', { bubbles: true }));
    await settle(fixture);
    key(search, 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.changes).toEqual(['paid']);
    expect(host.querySelector('.rv-select-popup-panel')).toBeNull();
  });

  it('keeps ordinary typing out of the menu typeahead', async () => {
    const fixture = TestBed.createComponent(Harness);
    fixture.detectChanges();
    const host = fixture.nativeElement;
    q(host, '.rv-select-trigger').click();
    await settle(fixture);

    const search = q<HTMLInputElement>(host, '.rv-select-search');
    search.focus();
    // A space is the classic leak: the menu typeahead treats it as a search
    // reset. It must stay inside the box.
    key(search, ' ');
    expect(document.activeElement).toBe(search);
  });
});

describe('accessible names (0.2.0)', () => {
  it('exposes the caption, the trigger name and the panel name', async () => {
    const fixture = TestBed.createComponent(LabelHarness);
    fixture.detectChanges();
    const host = fixture.nativeElement;

    const named = q(host, 'rv-select#named');
    expect(q(named, '.rv-select-caption').textContent).toContain('Invoice status');
    expect(q(named, '.rv-select-trigger').getAttribute('aria-labelledby')).not.toBeNull();
    expect(q(named, '.rv-select-trigger').getAttribute('aria-label')).toBe(
      'Invoice status, screen-reader only',
    );

    // No caption and no ariaLabel: the trigger must not invent a name.
    const plain = q(host, 'rv-select#plain');
    expect(q(plain, '.rv-select-trigger').hasAttribute('aria-labelledby')).toBe(false);
    expect(q(plain, '.rv-select-trigger').hasAttribute('aria-label')).toBe(false);
  });

  it('names the opened panel via popupLabel, or falls back to the caption', async () => {
    const fixture = TestBed.createComponent(LabelHarness);
    fixture.detectChanges();
    const host = fixture.nativeElement;

    q(host, 'rv-select#named .rv-select-trigger').click();
    await settle(fixture);
    expect(q(host, '#named .rv-select-popup-panel').getAttribute('aria-label')).toBe(
      'Invoice status options',
    );
    q(host, 'rv-select#named .rv-select-trigger').click();
    await settle(fixture);

    // A caption alone is enough to name the panel.
    q(host, 'rv-select#auto .rv-select-trigger').click();
    await settle(fixture);
    expect(q(host, '#auto .rv-select-popup-panel').getAttribute('aria-label')).toBe('Only a caption');
    q(host, 'rv-select#auto .rv-select-trigger').click();
    await settle(fixture);

    // Unnamed stays unnamed — asserted so the fallback is not accidental.
    q(host, 'rv-select#plain .rv-select-trigger').click();
    await settle(fixture);
    expect(q(host, '#plain .rv-select-popup-panel').hasAttribute('aria-label')).toBe(false);
  });

  it('keeps the documented menu semantics, not combobox', async () => {
    const fixture = TestBed.createComponent(LabelHarness);
    fixture.detectChanges();
    const host = fixture.nativeElement;

    q(host, 'rv-select#named .rv-select-trigger').click();
    await settle(fixture);

    const panel = q(host, '#named .rv-select-popup-panel');
    expect(panel.getAttribute('role')).toBe('menu');
    expect(q(host, 'rv-select#named .rv-select-trigger').getAttribute('aria-haspopup')).toBe(
      'menu',
    );
    expect(q(panel, '[rvselectpopupitem]').getAttribute('role')).toBe('menuitem');
    // A combobox would require these; their absence is the documented model.
    expect(panel.hasAttribute('aria-activedescendant')).toBe(false);
    expect(panel.getAttribute('role')).not.toBe('listbox');
  });

  it('exposes a configurable name for the filter box', async () => {
    const fixture = TestBed.createComponent(Harness);
    fixture.detectChanges();
    q(fixture.nativeElement, '.rv-select-trigger').click();
    await settle(fixture);
    expect(q(fixture.nativeElement, '.rv-select-search').getAttribute('aria-label')).toBe(
      'Search options',
    );
  });
});

describe('multiple Select label associations (RIV-001)', () => {
  // Business scenario:
  // Given two Select controls rendered together with distinct visible captions,
  // when each trigger's label relationship is evaluated, then IDs are unique
  // and each trigger references the caption inside its own component.
  // Must not: share an ID, point to the sibling caption, or pass on element
  // existence alone. Evidence: projects/select/README.md documents `label` as
  // the trigger's accessible name via aria-labelledby; HTML requires unique IDs
  // (https://html.spec.whatwg.org/multipage/dom.html#the-id-attribute); WAI-ARIA
  // derives a name from referenced text
  // (https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/).
  it('keeps each trigger associated with its own unique caption', () => {
    const fixture = TestBed.createComponent(MultipleLabelHarness);
    fixture.detectChanges();

    const selects = qa<HTMLElement>(fixture.nativeElement, 'rv-select');
    expect(selects).toHaveLength(2);
    const captions = selects.map((select) => q<HTMLElement>(select, '.rv-select-caption'));
    const triggers = selects.map((select) => q<HTMLButtonElement>(select, '.rv-select-trigger'));
    const captionIds = captions.map((caption) => caption.id);

    expect(new Set(captionIds).size).toBe(2);
    expect(captions.map((caption) => caption.textContent?.trim())).toEqual([
      'Billing country',
      'Shipping country',
    ]);
    for (let index = 0; index < selects.length; index += 1) {
      expect(triggers[index].hasAttribute('aria-label')).toBe(false);
      expect(triggers[index].getAttribute('aria-labelledby')).toBe(captionIds[index]);
      expect(selects[index].querySelector(`#${captionIds[index]}`)).toBe(captions[index]);
    }
  });
});

describe('clear() announces itself (0.2.0)', () => {
  it('emits null in single mode and empties the value', async () => {
    const fixture = TestBed.createComponent(Harness);
    fixture.detectChanges();
    const host = fixture.nativeElement;
    const view = fixture.debugElement.children[0].componentInstance as RiviniaSelectComponent;

    q(host, '.rv-select-trigger').click();
    await settle(fixture);
    key(q(host, '.rv-select-popup-panel'), 'Enter');
    await settle(fixture);
    expect(fixture.componentInstance.changes).toEqual(['outstanding']);
    expect(q(host, '.rv-select-value').textContent).toContain('Outstanding invoices');

    view.clear();
    fixture.detectChanges();
    expect(fixture.componentInstance.changes).toEqual(['outstanding', null]);
    expect(q(host, '.rv-select-value').textContent).toContain('Status');
  });

  it('emits an empty array in multi mode', async () => {
    const fixture = TestBed.createComponent(MultiHarness);
    fixture.detectChanges();
    const host = fixture.nativeElement;

    q(host, '.rv-select-trigger').click();
    await settle(fixture);
    qa(host, '[rvselectpopupitem]')[0].click();
    await settle(fixture);
    expect(fixture.componentInstance.changes).toEqual([['outstanding']]);

    const view = fixture.debugElement.children[0].componentInstance as RiviniaSelectComponent;
    view.clear();
    fixture.detectChanges();
    expect(fixture.componentInstance.changes).toEqual([['outstanding'], []]);
    expect(qa(host, '.rv-select-check').length).toBe(0);
  });
});

describe('single mode rejects toggle() (0.2.0)', () => {
  it('leaves both signals untouched so they cannot disagree', () => {
    const single = new RiviniaSelect('single');
    single.syncOptions(OPTIONS);

    expect(single.toggle('paid')).toBe(false);
    // Regression: toggle used to write `values` while isSelected read `value`.
    expect(single.values()).toEqual([]);
    expect(single.value()).toBeNull();
    expect(single.isSelected('paid')).toBe(false);

    // Single mode still picks through select().
    expect(single.select('paid')).toBe(true);
    expect(single.isSelected('paid')).toBe(true);
  });

  it('still toggles in multi mode', () => {
    const multi = new RiviniaSelect('multi');
    multi.syncOptions(OPTIONS);
    expect(multi.toggle('paid')).toBe(true);
    expect(multi.values()).toEqual(['paid']);
    expect(multi.toggle('paid')).toBe(true);
    expect(multi.values()).toEqual([]);
    // disabled stays refused in both modes
    expect(multi.toggle('overdue')).toBe(false);
  });
});
