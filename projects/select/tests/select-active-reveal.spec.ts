import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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

  it('hands activation to the top remaining row when the active one goes away', () => {
    // Filtering destroys the rows that no longer match, and Angular flushes
    // the query effect before that removal. `activateFirst()` therefore ran
    // against the full registry, and the removal of the row it had just made
    // active left `activeId` null — Enter then picked nothing (measured in
    // Chromium: `data-active="false"` on the single leftover row).
    const c = new SelectPopupControllerImpl();
    c.openMenu('first');
    c.register({ id: 'outstanding', disabled: false });
    c.register({ id: 'overdue', disabled: true });
    c.register({ id: 'paid', disabled: false });
    expect(c.activeId()).toBe('outstanding');

    c.unregister('outstanding');

    // `overdue` is disabled, so the top MATCH is `paid`.
    expect(c.activeId()).toBe('paid');
  });

  it('ends with nothing when every row goes away', () => {
    const c = new SelectPopupControllerImpl();
    c.openMenu('first');
    c.register({ id: 'cairo', disabled: false });
    c.register({ id: 'giza', disabled: false });

    c.unregister('cairo');
    expect(c.activeId()).toBe('giza');
    c.unregister('giza');
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
  let scrollIntoViewCalls: string[] = [];
  let panel: HTMLElement;
  let scrollWrites: number[];
  const original = Element.prototype.scrollIntoView;
  const rectDescriptor = Object.getOwnPropertyDescriptor(
    Element.prototype,
    'getBoundingClientRect',
  );
  const scrollTopDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollTop');

  const rect = (top: number, bottom: number): DOMRect =>
    ({
      top,
      bottom,
      left: 0,
      right: 0,
      width: 0,
      height: bottom - top,
      x: 0,
      y: top,
      toJSON: () => ({}),
    }) as DOMRect;

  /** The row's bottom edge, 40px past the scrollport's. */
  function stageRowBelowTheScrollport(id: string): void {
    panel.getBoundingClientRect = () => rect(0, 100);
    const row = panel.querySelector(`[data-rv-id="${id}"]`) as HTMLElement;
    row.getBoundingClientRect = () => rect(120, 140);
  }

  async function open(): Promise<ComponentFixture<FilledHarness>> {
    const fixture = TestBed.createComponent(FilledHarness);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.rv-select-trigger') as HTMLElement).click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
    TestBed.flushEffects();
    return fixture;
  }

  beforeEach(() => {
    TestBed.resetTestingModule();
    scrollIntoViewCalls = [];
    scrollWrites = [];
    (
      Element.prototype as unknown as { scrollIntoView: (arg?: ScrollIntoViewOptions) => void }
    ).scrollIntoView = function (this: Element) {
      scrollIntoViewCalls.push(this.getAttribute('data-rv-id') ?? this.tagName);
    };
  });

  afterEach(() => {
    (Element.prototype as unknown as { scrollIntoView: unknown }).scrollIntoView = original;
    if (rectDescriptor)
      Object.defineProperty(Element.prototype, 'getBoundingClientRect', rectDescriptor);
    if (scrollTopDescriptor)
      Object.defineProperty(Element.prototype, 'scrollTop', scrollTopDescriptor);
  });

  function watchScrollTop(element: HTMLElement): void {
    Object.defineProperty(element, 'scrollTop', {
      configurable: true,
      get: () => 0,
      set: (value: number) => scrollWrites.push(value),
    });
  }

  async function openWithStagedPanel(): Promise<ComponentFixture<FilledHarness>> {
    const fixture = await open();
    panel = fixture.nativeElement.querySelector('.rv-select-popup-panel') as HTMLElement;
    watchScrollTop(panel);
    return fixture;
  }

  function moveActive(
    fixture: ComponentFixture<FilledHarness>,
    key: string,
    next: string,
  ): HTMLElement {
    stageRowBelowTheScrollport(next);
    const active = fixture.nativeElement.querySelector('[data-active="true"]') as HTMLElement;
    active.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    return fixture.nativeElement;
  }

  /**
   * The panel does not exist until the open renders, and the reveal runs in
   * that same pass, so the geometry has to be staged on the prototype and the
   * panel's `scrollTop` writes intercepted there rather than on an element.
   */
  function stageBeforeOpen(): void {
    Element.prototype.getBoundingClientRect = function (this: Element) {
      if (this.classList.contains('rv-select-popup-panel')) return rect(0, 100);
      if (this.getAttribute('data-rv-id') === 'b') return rect(120, 140);
      return rectDescriptor!.value!.call(this);
    };
    if (!scrollTopDescriptor?.get || !scrollTopDescriptor.set) {
      throw new Error('scrollTop is not an accessor on Element.prototype');
    }
    Object.defineProperty(Element.prototype, 'scrollTop', {
      configurable: true,
      get(this: Element) {
        return scrollTopDescriptor.get!.call(this);
      },
      set(this: Element, value: number) {
        if (this.classList.contains('rv-select-popup-panel')) scrollWrites.push(value);
        scrollTopDescriptor.set!.call(this, value);
      },
    });
  }

  it('opens on the selected row', async () => {
    const { nativeElement: host } = await open();
    expect(host.querySelector('[data-active="true"]')?.textContent).toContain('Banana');
  });

  /**
   * The reopen case from the defect report: the panel opened at `scrollTop` 0
   * whatever the value, so a deep selection was active but out of view. This
   * is the open path, which no key press is involved in.
   */
  it('reveals the selected row when it opens', async () => {
    stageBeforeOpen();
    const { nativeElement: host } = await open();

    expect(host.querySelector('[data-active="true"]')?.textContent).toContain('Banana');
    // 140 (row bottom) - 100 (scrollport bottom) - 0 (scroll-padding).
    expect(scrollWrites).toEqual([40]);
  });

  it('scrolls the newly active row by moving the panel, not the document', async () => {
    const fixture = await openWithStagedPanel();
    const host = moveActive(fixture, 'ArrowDown', 'c');

    expect(host.querySelector('[data-active="true"]')?.textContent).toContain('Cherry');
    // 140 (row bottom) - 100 (scrollport bottom) - 0 (scroll-padding).
    expect(scrollWrites).toEqual([40]);
  });

  /**
   * `scrollIntoView` also scrolls the DOCUMENT once Chromium paints the panel
   * in the top layer. The popup closes on outside scroll (stale coordinates),
   * so its own reveal used to close the list under the keyboard: measured on a
   * page scrolled to 389px, pressing ArrowDown scrolled it to 325 and the
   * panel unmounted.
   */
  it('never calls scrollIntoView, which would scroll the document too', async () => {
    const fixture = await openWithStagedPanel();
    moveActive(fixture, 'ArrowDown', 'c');

    expect(scrollIntoViewCalls).toEqual([]);
  });
});
