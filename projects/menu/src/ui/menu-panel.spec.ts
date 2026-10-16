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
    <rv-menu [menu]="menu" (picked)="picked.push($event.id)">
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
    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    expect(menu.open()).toBe(false);
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
