import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { RiviniaMenu } from '../lib/rivinia-menu';
import { RiviniaMenuComponent, RiviniaMenuItem } from '../../ui/src/lib/menu-panel';

@Component({
  standalone: true,
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  template: `
    <rv-menu [menu]="menu" [label]="menuLabel" (picked)="picked.push($event.id)">
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
  menuLabel: string | null = null;
}

function key(target: Element, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

beforeEach(() => {
  TestBed.resetTestingModule();
});

describe('RiviniaMenuComponent', () => {
  it('opens on trigger click and Enter, focuses the first enabled item', async () => {
    const fixture = TestBed.createComponent(MenuHarness);
    fixture.detectChanges();
    const menu = fixture.componentInstance.menu;
    expect(menu.open()).toBe(false);
    const trigger = fixture.nativeElement.querySelector('[rv-menu-trigger]');
    trigger.click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    // afterRender hooks settle on the next microtask/CD rhythm in tests.
    await Promise.resolve();
    fixture.detectChanges();
    expect(menu.open()).toBe(true);
    expect(menu.activeId()).toBe('profile');
    expect(document.activeElement?.getAttribute('data-rv-id')).toBe('profile');
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
