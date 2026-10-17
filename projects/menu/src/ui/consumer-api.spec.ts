import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';
import type { RiviniaMenuItemData } from '../lib/menu-types';
import { RiviniaMenuComponent, RiviniaMenuItem } from '../../ui/src/lib/menu-panel';

/**
 * Consumer-level tests: the documented public surface only — no calls to the
 * headless controller from the template, no manual register/unregister.
 */

const ITEMS: readonly RiviniaMenuItemData[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'billing', label: 'Billing', disabled: true },
  { id: 'logout', label: 'Log out' },
];

/** Level A: declarative. No controller, no registration, no markup rows. */
@Component({
  standalone: true,
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  template: `
    <rv-menu
      [items]="items"
      menuLabel="Account"
      panelClass="p"
      itemClass="r"
      (picked)="picked.push($event.id)"
    >
      <button rvMenuTrigger>Account</button>
    </rv-menu>
  `,
})
class DataDrivenHarness {
  readonly items = ITEMS;
  readonly picked: string[] = [];
}

/** Level B: composable. Trigger + panel projected, items self-register. */
@Component({
  standalone: true,
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  template: `
    <rv-menu menuLabel="Custom">
      <button rvMenuTrigger>Open</button>
      <div rvMenuPanel>
        <button rvMenuItem id="one">One</button>
        <button rvMenuItem id="two" [disabled]="true">Two</button>
        <button rvMenuItem id="three">Three</button>
      </div>
    </rv-menu>
  `,
})
class ComposableHarness {}

/** Two instances in one template: isolation check. */
@Component({
  standalone: true,
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  template: `
    <rv-menu (picked)="picked.push('a:' + $event.id)">
      <button rvMenuTrigger>First</button>
      <div rvMenuPanel><button rvMenuItem id="a1">Alpha</button></div>
    </rv-menu>
    <rv-menu (picked)="picked.push('b:' + $event.id)">
      <button rvMenuTrigger>Second</button>
      <div rvMenuPanel><button rvMenuItem id="b1">Beta</button></div>
    </rv-menu>
  `,
})
class TwoHarness {
  readonly picked: string[] = [];
}

/** Dynamic rows + live disabled toggling. */
@Component({
  standalone: true,
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  template: `
    <rv-menu (picked)="picked.push($event.id)">
      <button rvMenuTrigger>Dyn</button>
      <div rvMenuPanel>
        @for (row of rows(); track row.id) {
          <button rvMenuItem [id]="row.id" [disabled]="row.disabled">{{ row.label }}</button>
        }
      </div>
    </rv-menu>
  `,
})
class DynamicHarness {
  readonly picked: string[] = [];
  readonly rows = signal([
    { id: 'x', label: 'X', disabled: false },
    { id: 'y', label: 'Y', disabled: false },
  ]);
}

/** The rv-menu component instance under test (no index-path fragility). */
function menuOf(fixture: {
  debugElement: { query: (b: unknown) => { componentInstance: RiviniaMenuComponent } };
}): RiviniaMenuComponent {
  return fixture.debugElement.query(By.directive(RiviniaMenuComponent)).componentInstance;
}

/** HTML lowercases attribute names, so match both spellings in the DOM. */
function triggerOf(root: Element): HTMLElement | null {
  return root.querySelector('[rv-menu-trigger], [rvmenutrigger]') as HTMLElement | null;
}
function openViaTrigger(fixture: { nativeElement: Element }): void {
  const target = triggerOf(fixture.nativeElement) ?? (fixture.nativeElement as HTMLElement);
  target.click();
}

function key(target: Element, k: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
}

async function settle(fixture: { detectChanges: () => void }): Promise<void> {
  fixture.detectChanges();
  TestBed.flushEffects();
  fixture.detectChanges();
  await Promise.resolve();
}

beforeEach(() => TestBed.resetTestingModule());

describe('consumer API — data-driven [items]', () => {
  it('needs no controller and no registration to work', async () => {
    const fixture = TestBed.createComponent(DataDrivenHarness);
    await settle(fixture);
    // Renders only the trigger until opened.
    expect(fixture.nativeElement.querySelector('.rv-menu-panel')).toBeNull();
    openViaTrigger(fixture);
    await settle(fixture);
    const rows = fixture.nativeElement.querySelectorAll('[rvmenuitem]');
    expect(rows.length).toBe(3);
    expect(rows[1].getAttribute('aria-disabled')).toBe('true');
  });

  it('emits the picked id and applies panelClass/itemClass', async () => {
    const fixture = TestBed.createComponent(DataDrivenHarness);
    await settle(fixture);
    openViaTrigger(fixture);
    await settle(fixture);
    const panel = fixture.nativeElement.querySelector('.rv-menu-panel') as HTMLElement;
    expect(panel.classList.contains('rv-menu-panel')).toBe(true);
    expect(panel.classList.contains('p')).toBe(true);
    const rows = fixture.nativeElement.querySelectorAll('[rvmenuitem]');
    expect((rows[0] as HTMLElement).classList.contains('r')).toBe(true);
    (rows[2] as HTMLElement).click();
    expect(fixture.componentInstance.picked).toEqual(['logout']);
  });

  it('registers each rendered row and unregisters on destroy', async () => {
    const fixture = TestBed.createComponent(DataDrivenHarness);
    await settle(fixture);
    openViaTrigger(fixture);
    await settle(fixture);
    const menu = fixture.debugElement.children[0].children[0]
      .componentInstance as RiviniaMenuComponent;
    expect(menu.controller().items().length).toBe(3);
    fixture.destroy();
  });
});

describe('consumer API — composable markup', () => {
  it('auto-registers projected items without any register() call', async () => {
    const fixture = TestBed.createComponent(ComposableHarness);
    await settle(fixture);
    openViaTrigger(fixture);
    await settle(fixture);
    const menu = fixture.debugElement.children[0].children[0]
      .componentInstance as RiviniaMenuComponent;
    expect(
      menu
        .controller()
        .items()
        .map((i) => i.id),
    ).toEqual(['one', 'two', 'three']);
  });

  it('unregisters items when the component is destroyed', async () => {
    const fixture = TestBed.createComponent(ComposableHarness);
    await settle(fixture);
    const menu = fixture.debugElement.children[0].children[0]
      .componentInstance as RiviniaMenuComponent;
    openViaTrigger(fixture);
    await settle(fixture);
    expect(menu.controller().items().length).toBe(3);
    fixture.destroy();
    expect(menu.controller().items()).toEqual([]);
  });
});

describe('consumer API — instance isolation', () => {
  it('two menus keep separate controllers and separate picks', async () => {
    const fixture = TestBed.createComponent(TwoHarness);
    await settle(fixture);
    const [first, second] = fixture.nativeElement.querySelectorAll('rv-menu');
    openViaTrigger({ nativeElement: first });
    await settle(fixture);
    const firstCmp = fixture.debugElement.children[0].children[0]
      .componentInstance as RiviniaMenuComponent;
    const secondCmp = fixture.debugElement.children[1].children[0]
      .componentInstance as RiviniaMenuComponent;
    expect(firstCmp.controller().open()).toBe(true);
    expect(secondCmp.controller().open()).toBe(false);
    expect(firstCmp.controller()).not.toBe(secondCmp.controller());
    (first.querySelector('[rvmenuitem]') as HTMLElement).click();
    expect(fixture.componentInstance.picked).toEqual(['a:a1']);
  });
});

describe('consumer API — dynamic rows and live disabled', () => {
  it('adds and removes rows while keeping navigation valid', async () => {
    const fixture = TestBed.createComponent(DynamicHarness);
    await settle(fixture);
    openViaTrigger(fixture);
    await settle(fixture);
    expect(fixture.nativeElement.querySelectorAll('[rvmenuitem]').length).toBe(2);

    fixture.componentInstance.rows.set([{ id: 'x', label: 'X', disabled: false }]);
    await settle(fixture);
    expect(fixture.nativeElement.querySelectorAll('[rvmenuitem]').length).toBe(1);

    fixture.componentInstance.rows.set([
      { id: 'x', label: 'X', disabled: false },
      { id: 'y', label: 'Y', disabled: false },
      { id: 'z', label: 'Z', disabled: false },
    ]);
    await settle(fixture);
    expect(fixture.nativeElement.querySelectorAll('[rvmenuitem]').length).toBe(3);
  });

  it('toggling disabled at runtime is reflected and blocks activation', async () => {
    const fixture = TestBed.createComponent(DynamicHarness);
    await settle(fixture);
    openViaTrigger(fixture);
    await settle(fixture);
    const menu = fixture.debugElement.children[0].children[0]
      .componentInstance as RiviniaMenuComponent;
    menu.controller().openMenu('last');
    await settle(fixture);
    expect(menu.controller().activeId()).toBe('y');
    // Disable the active row; Enter must not emit it.
    fixture.componentInstance.rows.set([
      { id: 'x', label: 'X', disabled: false },
      { id: 'y', label: 'Y', disabled: true },
    ]);
    await settle(fixture);
    const panel = fixture.nativeElement.querySelector('.rv-menu-panel');
    key(panel, 'Enter');
    expect(fixture.componentInstance.picked).toEqual([]);
  });
});

describe('consumer API — ambiguity guard', () => {
  @Component({
    standalone: true,
    imports: [RiviniaMenuComponent, RiviniaMenuItem],
    template: `
      <rv-menu [items]="items" menuLabel="X">
        <button rvMenuTrigger>Open</button>
        <div rvMenuPanel><button rvMenuItem id="dup">Dup</button></div>
      </rv-menu>
    `,
  })
  class AmbiguousHarness {
    readonly items: readonly RiviniaMenuItemData[] = [{ id: 'x', label: 'X' }];
  }

  it('throws instead of silently ignoring one of the two sources', async () => {
    const fixture = TestBed.createComponent(AmbiguousHarness);
    expect(() => TestBed.flushEffects()).toThrowError(/cannot be combined/);
    fixture.destroy();
  });
});
