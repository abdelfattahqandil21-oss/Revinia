/**
 * A row whose `id` binding changes keeps its activation.
 *
 * The row directive unregisters the old id before registering the new one, and
 * `unregister` hands activation to the top remaining row. Registration is not
 * allowed to steal activation back (the registry is never empty), so without an
 * explicit hand-back the renamed row is demoted and Enter picks a neighbour.
 *
 * The id is a signal because this harness is zoneless: a plain field does not
 * mark the view dirty, so `detectChanges()` alone would not re-evaluate it.
 */
import { Component, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { SelectPopupComponent, SelectPopupItem } from '../ui/src/lib/components/popup/select-popup';

@Component({
  imports: [SelectPopupComponent, SelectPopupItem],
  template: `
    <rv-select-popup>
      <button rv-select-popup-trigger type="button">Open</button>
      <div rv-select-popup-panel>
        <button rvSelectPopupItem [id]="first()">First</button>
        <button rvSelectPopupItem id="second">Second</button>
      </div>
    </rv-select-popup>
  `,
})
class RenameHost {
  readonly first = signal('one');
}

function open(fixture: ComponentFixture<unknown>): HTMLElement {
  const trigger = fixture.nativeElement.querySelector('.rv-select-popup-trigger') as HTMLElement;
  trigger.click();
  fixture.detectChanges();
  TestBed.flushEffects();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

function activeRow(host: HTMLElement): string | null {
  return host.querySelector('[data-active="true"]')?.getAttribute('data-rv-id') ?? null;
}

beforeEach(() => {
  TestBed.resetTestingModule();
});

describe('a row whose id changes', () => {
  it('stays the active row', () => {
    const fixture = TestBed.createComponent(RenameHost);
    fixture.detectChanges();
    const host = open(fixture);
    expect(activeRow(host)).toBe('one');

    fixture.componentInstance.first.set('uno');
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(host.querySelector('[data-rv-id="one"]')).toBeNull();
    expect(activeRow(host)).toBe('uno');
  });
});
