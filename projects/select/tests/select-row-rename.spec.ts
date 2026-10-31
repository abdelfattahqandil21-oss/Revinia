/**
 * A row whose `id` binding changes keeps its activation AND its place.
 *
 * The row directive reports the rename instead of unregistering and
 * re-registering on its own: `unregister` hands activation to the top
 * remaining row and `register` appends, so doing it naively demotes the row
 * and pushes it last, which would reverse arrow navigation around it.
 *
 * The ids are signals because this harness is zoneless: a plain field does not
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
        <button rvSelectPopupItem [id]="second()">Second</button>
        <button rvSelectPopupItem id="third">Third</button>
      </div>
    </rv-select-popup>
  `,
})
class RenameHost {
  readonly first = signal('one');
  readonly second = signal('two');
}

function open(fixture: ComponentFixture<unknown>): HTMLElement {
  const trigger = fixture.nativeElement.querySelector('.rv-select-popup-trigger') as HTMLElement;
  trigger.click();
  settle(fixture);
  return fixture.nativeElement as HTMLElement;
}

function settle(fixture: ComponentFixture<unknown>): void {
  fixture.detectChanges();
  TestBed.flushEffects();
  fixture.detectChanges();
}

function activeRow(host: HTMLElement): string | null {
  return host.querySelector('[data-active="true"]')?.getAttribute('data-rv-id') ?? null;
}

function press(fixture: ComponentFixture<unknown>, key: string): void {
  const target = fixture.nativeElement.querySelector('.rv-select-popup-panel') as HTMLElement;
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  settle(fixture);
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
    settle(fixture);

    expect(host.querySelector('[data-rv-id="one"]')).toBeNull();
    expect(activeRow(host)).toBe('uno');
  });

  it('keeps its place, so arrow navigation around it does not skip a row', () => {
    const fixture = TestBed.createComponent(RenameHost);
    fixture.detectChanges();
    const host = open(fixture);
    press(fixture, 'End');
    expect(activeRow(host)).toBe('third');

    fixture.componentInstance.second.set('dos');
    settle(fixture);
    expect(activeRow(host)).toBe('third');

    // Order kept: one, dos, third — so ArrowUp from third lands on dos. Had
    // the rename appended, the order would be one, third, dos and ArrowUp
    // would land on one.
    press(fixture, 'ArrowUp');
    expect(activeRow(host)).toBe('dos');
  });
});
