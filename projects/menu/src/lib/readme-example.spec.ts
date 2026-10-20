/**
 * The documented headless example, executed.
 *
 * The README shows a complete custom dropdown built on the headless
 * controller. This spec is that example's behaviour, so the document cannot
 * drift from the implementation without a test failing.
 */
import { describe, expect, it } from 'vitest';

import { RiviniaMenu } from '../lib/rivinia-menu';
import type { RiviniaMenuItem } from '../lib/menu-types';

/**
 * The controller's registry is IDENTITY and enabled state only — the label is
 * UI-owned, so it is not registered. The consumer keeps its own shape.
 */
const ACTIONS: readonly RiviniaMenuItem[] = [
  { id: 'copy' },
  { id: 'move' },
  { id: 'delete', disabled: true },
];

function menuWith(actions: readonly RiviniaMenuItem[] = ACTIONS): RiviniaMenu {
  const menu = new RiviniaMenu();
  for (const action of actions) menu.register(action);
  return menu;
}

describe('the documented headless example', () => {
  it('starts closed, with no active item', () => {
    const menu = menuWith();
    expect(menu.open()).toBe(false);
    expect(menu.activeId()).toBeNull();
  });

  it('opens on the first item and reports it', () => {
    const menu = menuWith();
    menu.openMenu('first');
    expect(menu.open()).toBe(true);
    expect(menu.pickActive()).toBe('copy');
  });

  it('opens on the last item', () => {
    const menu = menuWith();
    menu.openMenu('last');
    // The last ENABLED item: 'delete' is disabled, so it is skipped.
    expect(menu.pickActive()).toBe('move');
  });

  it('moves between items and wraps around', () => {
    const menu = menuWith();
    menu.openMenu('first');

    menu.activateNext();
    expect(menu.pickActive()).toBe('move');

    // 'delete' is disabled, so it is skipped.
    menu.activateNext();
    expect(menu.pickActive()).toBe('copy');

    menu.activatePrevious();
    expect(menu.pickActive()).toBe('move');
  });

  it('refuses to activate a disabled or unknown item', () => {
    const menu = menuWith();
    expect(menu.activate('delete')).toBe(false);
    expect(menu.activate('nope')).toBe(false);
    expect(menu.activeId()).toBeNull();
  });

  it('closes and clears the active item', () => {
    const menu = menuWith();
    menu.openMenu('first');
    menu.closeMenu();
    expect(menu.open()).toBe(false);
    expect(menu.activeId()).toBeNull();
  });

  it('toggles', () => {
    const menu = menuWith();
    menu.toggle();
    expect(menu.open()).toBe(true);
    menu.toggle();
    expect(menu.open()).toBe(false);
  });

  it('unregisters an item and clears it if it was active', () => {
    const menu = menuWith();
    menu.openMenu('first');
    expect(menu.pickActive()).toBe('copy');

    menu.unregister('copy');
    expect(menu.activeId()).toBeNull();
    expect(menu.items().map((i) => i.id)).toEqual(['move', 'delete']);
  });
});
