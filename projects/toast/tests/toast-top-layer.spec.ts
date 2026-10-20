/**
 * The toast list lives in the browser's TOP LAYER.
 *
 * A modal `<dialog>` opened with `showModal()` is in the top layer, and the
 * top layer is above every `z-index` in the document. A toast in the document
 * therefore renders UNDER the dialog, which is useless: the message appears
 * exactly when the user cannot see it.
 *
 * Putting the toast list in the top layer as a manual popover fixes the
 * order, because the top layer stacks in the order elements are SHOWN: a toast
 * shown while a dialog is open lands above it.
 */
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { RiviniaToastList } from '../ui/src/lib/components/toast-list/toast-list';

@Component({
  imports: [RiviniaToastList],
  template: `<rv-toast-list [toasts]="[]" />`,
})
class ListHost {}

describe('the toast list in the top layer', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [ListHost] }));

  it('declares itself a manual popover where the browser can enter the top layer', () => {
    const fixture = TestBed.createComponent(ListHost);
    fixture.detectChanges();

    const list = (fixture.nativeElement as HTMLElement).querySelector('.rv-toasts');
    expect(list).not.toBeNull();

    // Where the API exists, the list must use it: a manual popover does not
    // trap focus, does not make the page inert, and does not close on an
    // outside click — it behaves like the list it replaces, but it lands in
    // the top layer, which is the only way to be above a modal dialog.
    const supported =
      typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
    expect(list?.getAttribute('popover')).toBe(supported ? 'manual' : null);
  });

  it('resets the popover UA insets so the position rules win', () => {
    const fixture = TestBed.createComponent(ListHost);
    fixture.detectChanges();

    // The popover UA style sets inset: 0 + margin: auto, which would
    // over-constrain the box and break the per-position placement.
    const list = (fixture.nativeElement as HTMLElement).querySelector('.rv-toasts');
    const style = Array.from(document.styleSheets)
      .flatMap((sheet) => {
        try {
          return Array.from(sheet.cssRules);
        } catch {
          return [];
        }
      })
      .filter((r) => r.cssText?.includes('.rv-toasts') && r.cssText?.includes('inset'))
      .map((r) => r.cssText.slice(0, 120));
    expect(style.length).toBeGreaterThan(0);
  });
});
