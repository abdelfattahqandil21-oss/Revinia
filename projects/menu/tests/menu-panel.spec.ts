import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { RiviniaMenu } from '../src/lib/services/rivinia-menu';
import { RiviniaMenuComponent, RiviniaMenuItem } from '../ui/src/lib/components/menu/menu-panel';

@Component({
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  template: `
    <rv-menu
      [menu]="menu"
      [menuLabel]="menuLabel"
      (picked)="picked.push($event.id)"
      (opened)="opens.push(1)"
    >
      <button rv-menu-trigger>Account</button>
      <div rv-menu-panel>
        <button rvMenuItem id="profile">Profile</button>
        <button rvMenuItem id="team" [disabled]="true">Team</button>
        <button rvMenuItem id="logout">Sign out</button>
      </div>
    </rv-menu>
  `,
})
class MenuHarness {
  readonly menu = new RiviniaMenu();
  readonly picked: string[] = [];
  readonly opens: number[] = [];
  menuLabel: string | null = null;
}

/** Declarative `[items]` mode: the component renders the rows itself. */
@Component({
  imports: [RiviniaMenuComponent],
  template: `
    <rv-menu [items]="items" (picked)="picked.push($event.id)">
      <button rv-menu-trigger>Data</button>
    </rv-menu>
  `,
})
class DataMenuHarness {
  readonly items: readonly { id: string; label: string; disabled?: boolean }[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'billing', label: 'Billing' },
  ];
  readonly picked: string[] = [];
}

/**
 * Projected content: an input the consumer owns, plus a hook that lets a test
 * decide which key that input claims for itself (`preventDefault()`).
 */
@Component({
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  template: `
    <rv-menu [menu]="menu" menuLabel="Projected" (picked)="picked.push($event.id)">
      <button rv-menu-trigger>Projected</button>
      <div rv-menu-panel>
        <input class="projected-input" type="text" (keydown)="onInputKey($event)" />
        <div rvMenuItem id="first">
          First <input class="row-input" (keydown)="onInputKey($event)" />
        </div>
        <button rvMenuItem id="second"><span class="nested">Second</span></button>
      </div>
    </rv-menu>
  `,
})
class ProjectedMenuHarness {
  readonly menu = new RiviniaMenu();
  readonly picked: string[] = [];
  /** The one key the projected control claims via `preventDefault()`. */
  claim: string | null = null;

  onInputKey(event: KeyboardEvent): void {
    if (event.key === this.claim) event.preventDefault();
  }
}

/**
 * Selection roles on projected rows: a checked row is a checkbox by default
 * and a radio when the consumer says the set is exclusive. The `role="group"`
 * wrapper is consumer markup on purpose — the menu does not invent one.
 */
@Component({
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  template: `
    <rv-menu [menu]="menu" menuLabel="Language" (picked)="picked.push($event.id)">
      <button rv-menu-trigger>Language</button>
      <div rv-menu-panel>
        <span role="group" aria-label="Language">
          <button rvMenuItem radio id="en" [checked]="true">English</button>
          <button rvMenuItem radio id="ar" [checked]="false">العربية</button>
        </span>
        <button rvMenuItem id="strict" [checked]="true">Strict</button>
        <button rvMenuItem id="plain">Plain</button>
      </div>
    </rv-menu>
  `,
})
class RadioMenuHarness {
  readonly menu = new RiviniaMenu();
  readonly picked: string[] = [];
}

function key(target: Element, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

beforeEach(() => {
  TestBed.resetTestingModule();
});

describe('RiviniaMenuComponent', () => {
  it('pointer open highlights nothing and leaves focus on the trigger', async () => {
    const fixture = TestBed.createComponent(MenuHarness);
    fixture.detectChanges();
    const menu = fixture.componentInstance.menu;
    expect(menu.open()).toBe(false);
    const trigger: HTMLElement = fixture.nativeElement.querySelector('[rv-menu-trigger]');
    // A real pointer focuses the button on mousedown; jsdom's click() does not.
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    // afterRender hooks settle on the next microtask/CD rhythm in tests.
    await Promise.resolve();
    fixture.detectChanges();

    // APG menu button: a pointer open is a glance, not a keyboard entry. The
    // first row must not look chosen, and focus must not jump into the panel.
    expect(menu.open()).toBe(true);
    expect(menu.activeId()).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('[data-active="true"]').length).toBe(0);
    expect(document.activeElement).toBe(trigger);
    expect(fixture.componentInstance.opens.length).toBe(1);
  });

  it('ArrowDown on the trigger enters the rows of a pointer-opened panel', () => {
    const fixture = TestBed.createComponent(MenuHarness);
    fixture.detectChanges();
    const menu = fixture.componentInstance.menu;
    const trigger: HTMLElement = fixture.nativeElement.querySelector('[rv-menu-trigger]');
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    key(trigger, 'ArrowDown');
    expect(menu.activeId()).toBe('profile');
    expect(document.activeElement?.getAttribute('data-rv-id')).toBe('profile');
    // Entering the rows is not a second open.
    expect(fixture.componentInstance.opens.length).toBe(1);
  });

  it('pointer open on [items] rows starts unhighlighted too', async () => {
    // The data-driven rows mount only while the panel is open, so they
    // register after the click handler ran — the path where a stray
    // pending activation would silently highlight row one.
    const fixture = TestBed.createComponent(DataMenuHarness);
    fixture.detectChanges();
    const trigger: HTMLElement = fixture.nativeElement.querySelector('[rv-menu-trigger]');
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('[rvmenuitem]').length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('[data-active="true"]').length).toBe(0);
    expect(document.activeElement).toBe(trigger);
  });

  it('keyboard open (Enter) still activates and focuses the first enabled item', async () => {
    const fixture = TestBed.createComponent(MenuHarness);
    fixture.detectChanges();
    const menu = fixture.componentInstance.menu;
    const trigger: HTMLElement = fixture.nativeElement.querySelector('[rv-menu-trigger]');
    expect(menu.open()).toBe(false);
    trigger.focus();
    key(trigger, 'Enter');
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();
    fixture.detectChanges();
    expect(menu.open()).toBe(true);
    expect(menu.activeId()).toBe('profile');
    expect(document.activeElement?.getAttribute('data-rv-id')).toBe('profile');
  });

  it('only advertises aria-controls while the panel exists', () => {
    const fixture = TestBed.createComponent(MenuHarness);
    fixture.detectChanges();
    const menu = fixture.componentInstance.menu;
    const trigger: HTMLElement = fixture.nativeElement.querySelector('[rv-menu-trigger]');
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    // Closed: the panel id does not resolve to any element, so the trigger
    // must not point at one.
    expect(trigger.hasAttribute('aria-controls')).toBe(false);

    menu.openMenu();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    const panel: HTMLElement = fixture.nativeElement.querySelector('.rv-menu-panel');
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
    expect(fixture.nativeElement.querySelector(`#${panel.id}`)).toBe(panel);

    menu.closeMenu();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(trigger.hasAttribute('aria-controls')).toBe(false);
  });

  it('renders [items] rows as plain buttons that never carry an id attribute', () => {
    const fixture = TestBed.createComponent(DataMenuHarness);
    fixture.detectChanges();
    const trigger: HTMLElement = fixture.nativeElement.querySelector('[rv-menu-trigger]');
    trigger.focus();
    key(trigger, 'Enter');
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('[rvmenuitem]');
    expect(rows.length).toBe(2);
    // Inside a <form> an implicit `submit` button would submit it.
    expect(rows[0].getAttribute('type')).toBe('button');
    // `[id]` feeds the directive input (Angular prefers the directive over the
    // DOM property), so it never leaks onto the element; identity is data-rv-id.
    expect(rows[0].hasAttribute('id')).toBe(false);
    expect(rows[0].getAttribute('data-rv-id')).toBe('profile');
  });

  it('moves with arrows (skipping disabled), wraps, and picks with Enter', () => {
    const fixture = TestBed.createComponent(MenuHarness);
    fixture.detectChanges();
    const menu = fixture.componentInstance.menu;
    menu.openMenu();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    const panel: HTMLElement = fixture.nativeElement.querySelector('.rv-menu-panel');
    key(panel, 'ArrowDown');
    expect(menu.activeId()).toBe('logout');
    key(panel, 'ArrowDown');
    expect(menu.activeId()).toBe('profile');
    key(panel, 'ArrowUp');
    expect(menu.activeId()).toBe('logout');
    key(panel, 'End');
    expect(menu.activeId()).toBe('logout');
    key(panel, 'Home');
    expect(menu.activeId()).toBe('profile');
    key(panel, 'Enter');
    expect(fixture.componentInstance.picked).toEqual(['profile']);
    expect(menu.open()).toBe(false);
  });

  it('Escape closes and refocuses the trigger; outside pointer closes', () => {
    const fixture = TestBed.createComponent(MenuHarness);
    fixture.detectChanges();
    const menu = fixture.componentInstance.menu;
    menu.openMenu();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    const panel: HTMLElement = fixture.nativeElement.querySelector('.rv-menu-panel');
    key(panel, 'Escape');
    expect(menu.open()).toBe(false);
    expect(document.activeElement?.textContent).toContain('Account');

    menu.openMenu();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    // Outside close must not steal focus back to the trigger: a focusable
    // outside target keeps focus (browser default), which doClose(false)
    // preserves by never calling focus itself.
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(menu.open()).toBe(false);
    expect(document.activeElement).toBe(outside);
    outside.remove();
  });

  it('exposes APG trigger states and moves focus with typeahead', async () => {
    const fixture = TestBed.createComponent(MenuHarness);
    fixture.detectChanges();
    const menu = fixture.componentInstance.menu;
    const trigger = (): HTMLElement => fixture.nativeElement.querySelector('[rv-menu-trigger]');

    menu.openMenu();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();
    expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    const first = fixture.nativeElement.querySelector('[data-rv-id="profile"]');
    expect(first.getAttribute('role')).toBe('menuitem');
    expect(first.hasAttribute('aria-checked')).toBe(false);

    const panel: HTMLElement = fixture.nativeElement.querySelector('.rv-menu-panel');
    key(panel, 's');
    expect(menu.activeId()).toBe('logout');
    key(panel, 'i');
    expect(menu.activeId()).toBe('logout');
    key(panel, 'x');
    expect(menu.activeId()).toBe('logout');

    menu.closeMenu();
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('skips disabled items in typeahead', async () => {
    const fixture = TestBed.createComponent(MenuHarness);
    fixture.detectChanges();
    const menu = fixture.componentInstance.menu;
    menu.openMenu();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();
    // 'team' is disabled, so 't' matches nothing and focus stays put.
    expect(menu.activeId()).toBe('profile');
    const panel: HTMLElement = fixture.nativeElement.querySelector('.rv-menu-panel');
    key(panel, 't');
    expect(menu.activeId()).toBe('profile');
  });

  it('unregisters items on destroy and ignores Tab with a close', () => {
    const fixture = TestBed.createComponent(MenuHarness);
    fixture.detectChanges();
    const menu = fixture.componentInstance.menu;
    expect(menu.items().length).toBe(3);
    menu.openMenu();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    const panel: HTMLElement = fixture.nativeElement.querySelector('.rv-menu-panel');
    key(panel, 'Tab');
    expect(menu.open()).toBe(false);
    fixture.destroy();
    expect(menu.items()).toEqual([]);
  });

  it('links trigger and panel with unique ids and an accessible name', async () => {
    const first = TestBed.createComponent(MenuHarness);
    const second = TestBed.createComponent(MenuHarness);
    first.componentInstance.menuLabel = 'Account actions';
    first.detectChanges();
    second.detectChanges();
    TestBed.flushEffects();
    first.componentInstance.menu.openMenu();
    second.componentInstance.menu.openMenu();
    first.detectChanges();
    second.detectChanges();
    TestBed.flushEffects();
    const panelA: HTMLElement = first.nativeElement.querySelector('.rv-menu-panel');
    const panelB: HTMLElement = second.nativeElement.querySelector('.rv-menu-panel');
    expect(panelA.id).toBeTruthy();
    expect(panelB.id).toBeTruthy();
    expect(panelA.id).not.toBe(panelB.id);
    expect(panelA.getAttribute('role')).toBe('menu');
    expect(panelA.getAttribute('aria-label')).toBe('Account actions');
    expect(panelB.hasAttribute('aria-label')).toBe(false);
    const triggerA: HTMLElement = first.nativeElement.querySelector('[rv-menu-trigger]');
    expect(triggerA.getAttribute('aria-controls')).toBe(panelA.id);
    first.destroy();
    second.destroy();
  });

  it('keeps keyboard safe on empty and all-disabled menus', () => {
    const fixture = TestBed.createComponent(MenuHarness);
    fixture.detectChanges();
    const menu = fixture.componentInstance.menu;
    // Strip all items: empty menu opens, focuses nothing, Enter is a no-op.
    for (const item of [...menu.items()]) menu.unregister(item.id);
    expect(menu.items()).toEqual([]);
    menu.openMenu();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(menu.open()).toBe(true);
    expect(menu.activeId()).toBeNull();
    const panel: HTMLElement = fixture.nativeElement.querySelector('.rv-menu-panel');
    key(panel, 'ArrowDown');
    key(panel, 'Home');
    key(panel, 'Enter');
    key(panel, 'x');
    expect(menu.open()).toBe(true);
    expect(fixture.componentInstance.picked).toEqual([]);
    // All-disabled: opens with no active item, arrows wrap nowhere.
    menu.register({ id: 'a', disabled: true });
    menu.register({ id: 'b', disabled: true });
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    menu.openMenu('last');
    expect(menu.activeId()).toBeNull();
    const panel2: HTMLElement = fixture.nativeElement.querySelector('.rv-menu-panel');
    key(panel2, 'ArrowDown');
    key(panel2, 'End');
    expect(menu.activeId()).toBeNull();
    expect(menu.open()).toBe(true);
  });

  it('resets the typeahead buffer when the menu closes', () => {
    const fixture = TestBed.createComponent(MenuHarness);
    fixture.detectChanges();
    const menu = fixture.componentInstance.menu;
    menu.openMenu();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    const panel: HTMLElement = fixture.nativeElement.querySelector('.rv-menu-panel');
    // Build a buffer that matches nothing ('x').
    key(panel, 'x');
    expect(menu.activeId()).toBe('profile');
    key(panel, 'Escape');
    expect(menu.open()).toBe(false);
    // Reopen and type the start of the 'Sign out' LABEL (typeahead matches
    // accessible text, not the id): with a stale buffer this would never match.
    menu.openMenu();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    const reopened: HTMLElement = fixture.nativeElement.querySelector('.rv-menu-panel');
    key(reopened, 's');
    expect(menu.activeId()).toBe('logout');
  });

  it('never activates an item that became disabled after receiving focus', () => {
    const fixture = TestBed.createComponent(MenuHarness);
    fixture.detectChanges();
    const menu = fixture.componentInstance.menu;
    // Harness rows: profile, team (disabled), logout.
    menu.openMenu('first');
    expect(menu.activeId()).toBe('profile');
    // The focused row is disabled afterwards (dynamic [disabled] input).
    menu.register({ id: 'profile', disabled: true });
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    const panel: HTMLElement = fixture.nativeElement.querySelector('.rv-menu-panel');
    key(panel, 'Enter');
    expect(fixture.componentInstance.picked).toEqual([]);
    expect(menu.open()).toBe(true);

    // All-disabled registry: Enter must stay a no-op even if activeId lingers.
    menu.register({ id: 'logout', disabled: true });
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    key(panel, 'Enter');
    expect(fixture.componentInstance.picked).toEqual([]);
  });

  it('picks items with mouse click and ignores disabled ones', async () => {
    const fixture = TestBed.createComponent(MenuHarness);
    fixture.detectChanges();
    const menu = fixture.componentInstance.menu;
    menu.openMenu();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();
    const items = fixture.nativeElement.querySelectorAll('[rvmenuitem]');
    (items[2] as HTMLElement).click();
    expect(fixture.componentInstance.picked).toEqual(['logout']);
    expect(menu.open()).toBe(false);

    menu.openMenu();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();
    const again = fixture.nativeElement.querySelectorAll('[rvmenuitem]');
    (again[1] as HTMLElement).click();
    expect(fixture.componentInstance.picked).toEqual(['logout']);
    expect(menu.open()).toBe(true);
  });
});

/**
 * The panel is a host for consumer content. The keyboard contract: a key aimed
 * at a projected control belongs to that control; only a key aimed at the panel
 * itself or a registered row belongs to the menu.
 */
describe('RiviniaMenuComponent — projected content', () => {
  /** Pointer open: no row active, so the menu starts from a clean state. */
  function open(fixture: ReturnType<typeof TestBed.createComponent<ProjectedMenuHarness>>): void {
    fixture.detectChanges();
    const trigger: HTMLElement = fixture.nativeElement.querySelector('[rv-menu-trigger]');
    trigger.focus();
    trigger.click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
  }

  it('r1: typing in a projected input never reaches the menu typeahead', () => {
    const fixture = TestBed.createComponent(ProjectedMenuHarness);
    open(fixture);
    const menu = fixture.componentInstance.menu;
    expect(menu.open()).toBe(true);
    expect(menu.activeId()).toBeNull();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.projected-input');
    input.focus();
    // "f" matches the "First" row: the old typeahead activated it and moved
    // focus out of the field the user was typing in.
    key(input, 'f');
    expect(menu.activeId()).toBeNull();
    expect(document.activeElement).toBe(input);
  });

  it('r2: row navigation and Enter from a projected control stay with that control', () => {
    const fixture = TestBed.createComponent(ProjectedMenuHarness);
    open(fixture);
    const menu = fixture.componentInstance.menu;
    const panel: HTMLElement = fixture.nativeElement.querySelector('.rv-menu-panel');
    // The panel itself owns row keys: this is the documented entry path.
    key(panel, 'ArrowDown');
    expect(menu.activeId()).toBe('first');

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.projected-input');
    input.focus();
    key(input, 'ArrowDown');
    expect(menu.activeId()).toBe('first');
    expect(document.activeElement).toBe(input);

    key(input, 'Enter');
    expect(fixture.componentInstance.picked).toEqual([]);
    expect(menu.open()).toBe(true);
    expect(document.activeElement).toBe(input);
  });

  it('r3: a projected control that claims Escape or Tab keeps the menu open', () => {
    const fixture = TestBed.createComponent(ProjectedMenuHarness);
    open(fixture);
    const menu = fixture.componentInstance.menu;
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.projected-input');
    input.focus();

    fixture.componentInstance.claim = 'Escape';
    key(input, 'Escape');
    expect(menu.open()).toBe(true);
    expect(document.activeElement).toBe(input);

    fixture.componentInstance.claim = 'Tab';
    key(input, 'Tab');
    expect(menu.open()).toBe(true);

    // Unclaimed, the same control hands the key back to the menu.
    fixture.componentInstance.claim = null;
    key(input, 'Escape');
    expect(menu.open()).toBe(false);
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('[rv-menu-trigger]'));
  });

  it('r9: a nested control claiming ArrowDown keeps the active row', () => {
    const fixture = TestBed.createComponent(ProjectedMenuHarness);
    open(fixture);
    const menu = fixture.componentInstance.menu;
    const panel: HTMLElement = fixture.nativeElement.querySelector('.rv-menu-panel');
    key(panel, 'ArrowDown');
    expect(menu.activeId()).toBe('first');

    // The target sits inside a registered row, so the row would own the key —
    // unless the nested control claims it first.
    const nested: HTMLInputElement = fixture.nativeElement.querySelector('.row-input');
    nested.focus();
    fixture.componentInstance.claim = 'ArrowDown';
    key(nested, 'ArrowDown');
    expect(menu.activeId()).toBe('first');
    expect(document.activeElement).toBe(nested);

    fixture.componentInstance.claim = null;
    key(nested, 'ArrowDown');
    expect(menu.activeId()).toBe('second');
  });

  it('r4: picking a row from the keyboard returns focus to the trigger', () => {
    const fixture = TestBed.createComponent(ProjectedMenuHarness);
    open(fixture);
    const menu = fixture.componentInstance.menu;
    const panel: HTMLElement = fixture.nativeElement.querySelector('.rv-menu-panel');
    key(panel, 'ArrowDown');
    const row: HTMLElement = fixture.nativeElement.querySelector('[data-rv-id="first"]');
    expect(document.activeElement).toBe(row);

    key(row, 'Enter');
    expect(fixture.componentInstance.picked).toEqual(['first']);
    expect(menu.open()).toBe(false);
    // The row is about to unmount: focus must not fall to <body>.
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('[rv-menu-trigger]'));
    fixture.destroy();
    expect(document.activeElement).not.toBe(document.body);
  });

  it('r5: a pointer pick only restores focus when it was inside the panel', () => {
    const fixture = TestBed.createComponent(ProjectedMenuHarness);
    open(fixture);
    const menu = fixture.componentInstance.menu;
    const trigger: HTMLElement = fixture.nativeElement.querySelector('[rv-menu-trigger]');
    const row: HTMLElement = fixture.nativeElement.querySelector('[data-rv-id="second"]');
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    outside.focus();

    (row as HTMLButtonElement).click();
    expect(fixture.componentInstance.picked).toEqual(['second']);
    expect(menu.open()).toBe(false);
    // Focus was never in the panel, so the menu must leave it alone.
    expect(document.activeElement).toBe(outside);

    outside.remove();
    // With focus on the trigger (pointer-open path) a click pick is a no-op
    // for focus: the trigger already has it.
    fixture.componentInstance.picked.length = 0;
    open(fixture);
    expect(menu.open()).toBe(true);
    expect(document.activeElement).toBe(trigger);
    (fixture.nativeElement.querySelector('[data-rv-id="first"]') as HTMLElement).click();
    expect(fixture.componentInstance.picked).toEqual(['first']);
    expect(document.activeElement).toBe(trigger);
  });

  it('r5b: a pick with focus inside the panel re-seats it on the trigger', () => {
    const fixture = TestBed.createComponent(ProjectedMenuHarness);
    open(fixture);
    const row: HTMLElement = fixture.nativeElement.querySelector('[data-rv-id="second"]');
    // A real browser focuses a button on mousedown; jsdom does not, so the
    // pick path is emulated by focusing the row before the click.
    row.focus();
    row.click();
    expect(fixture.componentInstance.picked).toEqual(['second']);
    expect(document.activeElement).toBe(fixture.nativeElement.querySelector('[rv-menu-trigger]'));
    fixture.destroy();
    expect(document.activeElement).not.toBe(document.body);
  });

  it('r6: a projected element reusing data-rv-id is not a row', () => {
    const fixture = TestBed.createComponent(ProjectedMenuHarness);
    open(fixture);
    const menu = fixture.componentInstance.menu;
    const panel: HTMLElement = fixture.nativeElement.querySelector('.rv-menu-panel');
    // Same identity as a registered row, but not a row: the old selectors
    // matched it for both focus and typeahead.
    const decoy = document.createElement('div');
    decoy.setAttribute('data-rv-id', 'first');
    decoy.textContent = 'apple';
    panel.insertBefore(decoy, panel.firstChild);

    key(panel, 'ArrowDown');
    expect(menu.activeId()).toBe('first');
    expect(document.activeElement).toBe(
      fixture.nativeElement.querySelector('[rvmenuitem][data-rv-id="first"]'),
    );

    // Typeahead only sees registry-backed rows: nothing starts with "a".
    key(panel, 'a');
    expect(menu.activeId()).toBe('first');
  });

  it('r8: keys from content nested inside a registered row still navigate', () => {
    const fixture = TestBed.createComponent(ProjectedMenuHarness);
    open(fixture);
    const menu = fixture.componentInstance.menu;
    const panel: HTMLElement = fixture.nativeElement.querySelector('.rv-menu-panel');
    key(panel, 'ArrowDown');
    expect(menu.activeId()).toBe('first');

    // The event target is the inner span, not the row: the row still owns it.
    const nested: HTMLElement = fixture.nativeElement.querySelector('.nested');
    key(nested, 'ArrowDown');
    expect(menu.activeId()).toBe('second');
    key(nested, 'Enter');
    expect(fixture.componentInstance.picked).toEqual(['second']);
  });

  it('r7: [radio] renders a checked row as menuitemradio', () => {
    const fixture = TestBed.createComponent(RadioMenuHarness);
    fixture.detectChanges();
    const menu = fixture.componentInstance.menu;
    const trigger: HTMLElement = fixture.nativeElement.querySelector('[rv-menu-trigger]');
    trigger.click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    const row = (id: string): HTMLElement =>
      fixture.nativeElement.querySelector(`[data-rv-id="${id}"]`);
    expect(row('en').getAttribute('role')).toBe('menuitemradio');
    expect(row('ar').getAttribute('role')).toBe('menuitemradio');
    expect(row('en').getAttribute('aria-checked')).toBe('true');
    expect(row('ar').getAttribute('aria-checked')).toBe('false');
    // Unchanged without [radio].
    expect(row('strict').getAttribute('role')).toBe('menuitemcheckbox');
    expect(row('plain').getAttribute('role')).toBe('menuitem');
    expect(row('plain').hasAttribute('aria-checked')).toBe(false);

    // The panel and the consumer's group keep their own roles.
    const panel: HTMLElement = fixture.nativeElement.querySelector('.rv-menu-panel');
    expect(panel.getAttribute('role')).toBe('menu');
    expect(fixture.nativeElement.querySelector('[role="group"]')).not.toBeNull();

    // Radios are ordinary rows for navigation and picking.
    key(panel, 'ArrowDown');
    expect(menu.activeId()).toBe('en');
    key(panel, 'ArrowDown');
    expect(menu.activeId()).toBe('ar');
    key(panel, 'Enter');
    expect(fixture.componentInstance.picked).toEqual(['ar']);
  });
});
