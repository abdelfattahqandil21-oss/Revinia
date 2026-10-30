import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RiviniaSelect } from '../src/lib/services/rivinia-select';
import { SelectPopupControllerImpl } from '../ui/src/lib/services/select-popup';
import { RiviniaSelectComponent } from '../ui/src/lib/components/select/select-panel';

/**
 * Reopening a filled select landed on the first row and never moved the list:
 * `onOpened` calls `activate(value)` before the rows have registered, the call
 * returns false, and the first row that registers wins. The panel also opened
 * at `scrollTop` 0 whatever the value, so a deep selection was active but out
 * of view — and arrow keys never scrolled either (`focus({ preventScroll })`
 * was the only focus call in the component).
 *
 * Two contracts are pinned here: the controller keeps a requested id until it
 * registers, and the panel reveals the active row after every render that
 * changes it.
 */
describe('activation requested before the rows exist', () => {
  it('activates the requested id once it registers', () => {
    const c = new SelectPopupControllerImpl();
    c.openMenu('first');

    expect(c.activate('red-sea')).toBe(false);
    c.register({ id: 'cairo', disabled: false });
    c.register({ id: 'giza', disabled: false });
    c.register({ id: 'red-sea', disabled: false });

    expect(c.activeId()).toBe('red-sea');
  });

  it('does not resurrect a request from a previous open', () => {
    const c = new SelectPopupControllerImpl();
    c.openMenu('first');
    c.activate('red-sea');
    c.closePopup();
    c.openMenu('first');

    c.register({ id: 'cairo', disabled: false });
    c.register({ id: 'red-sea', disabled: false });

    expect(c.activeId()).toBe('cairo');
  });

  it('drops the request when the user moves first', () => {
    const c = new SelectPopupControllerImpl();
    c.openMenu('first');
    c.activate('red-sea');
    c.activateFirst();

    c.register({ id: 'cairo', disabled: false });
    c.register({ id: 'red-sea', disabled: false });

    // The dropped request never resurfaces: the first row claims the open.
    expect(c.activeId()).toBe('cairo');
  });

  it('still falls back to nothing when the request never registers', () => {
    const c = new SelectPopupControllerImpl();
    c.openMenu('first');
    c.activate('not-an-option');

    c.register({ id: 'cairo', disabled: false });

    expect(c.activeId()).toBeNull();
  });
});

const OPTIONS = [
  { id: 'a', label: 'Apple' },
  { id: 'b', label: 'Banana' },
  { id: 'c', label: 'Cherry' },
];

@Component({
  imports: [RiviniaSelectComponent],
  template: `<rv-select [select]="select" [options]="options" [value]="'b'" />`,
})
class FilledHarness {
  readonly select = new RiviniaSelect('single');
  readonly options = OPTIONS;
}

describe('the panel reveals the active row', () => {
  let calls: { id: string | null; block?: string }[] = [];
  const original = Element.prototype.scrollIntoView;

  beforeEach(() => {
    TestBed.resetTestingModule();
    calls = [];
    (
      Element.prototype as unknown as { scrollIntoView: (arg?: ScrollIntoViewOptions) => void }
    ).scrollIntoView = function (this: Element, arg?: ScrollIntoViewOptions) {
      calls.push({ id: this.getAttribute('data-rv-id'), block: arg?.block });
    };
  });

  afterEach(() => {
    (Element.prototype as unknown as { scrollIntoView: unknown }).scrollIntoView = original;
  });

  it('opens on the selected row and scrolls it into view', async () => {
    const fixture = TestBed.createComponent(FilledHarness);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.rv-select-trigger') as HTMLElement).click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
    TestBed.flushEffects();

    const host: HTMLElement = fixture.nativeElement;
    expect(host.querySelector('[data-active="true"]')?.textContent).toContain('Banana');
    expect(calls.at(-1)).toEqual({ id: 'b', block: 'nearest' });
  });

  it('scrolls the newly active row after a keyboard move', async () => {
    const fixture = TestBed.createComponent(FilledHarness);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.rv-select-trigger') as HTMLElement).click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
    TestBed.flushEffects();

    const host: HTMLElement = fixture.nativeElement;
    const active = host.querySelector('[data-active="true"]') as HTMLElement;
    active.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(host.querySelector('[data-active="true"]')?.textContent).toContain('Cherry');
    expect(calls.at(-1)).toEqual({ id: 'c', block: 'nearest' });
  });
});
