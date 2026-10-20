import { beforeEach, describe, expect, it } from 'vitest';
import { RiviniaMenu } from '../src/lib/services/rivinia-menu';

describe('RiviniaMenu', () => {
  let menu: RiviniaMenu;
  beforeEach(() => {
    menu = new RiviniaMenu();
  });

  it('starts closed with no active item', () => {
    expect(menu.open()).toBe(false);
    expect(menu.activeId()).toBeNull();
    expect(menu.items()).toEqual([]);
  });

  it('opens, closes and toggles, focusing ends on demand', () => {
    menu.register({ id: 'a' });
    menu.register({ id: 'b' });
    menu.openMenu();
    expect(menu.open()).toBe(true);
    expect(menu.activeId()).toBe('a');
    menu.openMenu('last');
    expect(menu.activeId()).toBe('b');
    menu.openMenu('none');
    expect(menu.activeId()).toBeNull();
    expect(menu.open()).toBe(true);
    menu.toggle();
    expect(menu.open()).toBe(false);
    expect(menu.activeId()).toBeNull();
    menu.toggle();
    expect(menu.open()).toBe(true);
  });

  it('skips disabled items and wraps around', () => {
    menu.register({ id: 'a' });
    menu.register({ id: 'b', disabled: true });
    menu.register({ id: 'c' });
    menu.openMenu();
    expect(menu.activeId()).toBe('a');
    menu.activateNext();
    expect(menu.activeId()).toBe('c');
    menu.activateNext();
    expect(menu.activeId()).toBe('a');
    menu.activatePrevious();
    expect(menu.activeId()).toBe('c');
    expect(menu.activate('b')).toBe(false);
    expect(menu.activate('c')).toBe(true);
  });

  it('unregisters by id and clears a dangling active id', () => {
    menu.register({ id: 'a' });
    menu.register({ id: 'a', disabled: true });
    expect(menu.items().length).toBe(1);
    expect(menu.items()[0].disabled).toBe(true);
    menu.openMenu();
    menu.unregister('missing');
    menu.unregister('a');
    expect(menu.items()).toEqual([]);
    expect(menu.activeId()).toBeNull();
  });

  it('picks the active id and stays empty with no enabled items', () => {
    expect(menu.pickActive()).toBeNull();
    menu.register({ id: 'x', disabled: true });
    menu.openMenu();
    expect(menu.activeId()).toBeNull();
    expect(menu.pickActive()).toBeNull();
  });
});
