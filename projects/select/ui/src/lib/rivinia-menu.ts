import { signal } from '@angular/core';
import type { RiviniaMenuController, RiviniaMenuFocus, RiviniaMenuItem } from './menu-types';

/**
 * Headless per-menu controller. Owns open state, the registered items and
 * the active (keyboard-focused) item — no DOM, no styling, no positioning.
 * Instantiate one per menu (`new RiviniaMenu()`); rendering and focus moves
 * are the UI layer's job (the vendored menu UI implements them).
 *
 * Navigation skips disabled items and wraps around. Closing clears the
 * active item; the UI restores focus to the trigger.
 */
export class RiviniaMenu implements RiviniaMenuController {
  /** Whether the panel is open. */
  readonly open = signal(false);
  /** Id of the keyboard-active item (`null` when closed or unfocused). */
  readonly activeId = signal<string | null>(null);

  private readonly _items = signal<readonly RiviniaMenuItem[]>([]);
  /** Registered items, in registration order. */
  readonly items = this._items.asReadonly();

  /** Register an item (idempotent by id — re-register updates it). */
  register(item: RiviniaMenuItem): void {
    this._items.update((list) => {
      const at = list.findIndex((i) => i.id === item.id);
      if (at === -1) return [...list, { ...item }];
      return list.map((i, index) => (index === at ? { ...i, ...item } : i));
    });
  }

  /** Remove an item; clears `activeId` when it pointed at it. */
  unregister(id: string): void {
    this._items.update((list) => list.filter((i) => i.id !== id));
    if (this.activeId() === id) this.activeId.set(null);
  }

  /** Open and optionally focus the first/last enabled item. */
  openMenu(focus: RiviniaMenuFocus = 'first'): void {
    this.open.set(true);
    if (focus === 'first') this.activateFirst();
    else if (focus === 'last') this.activateLast();
    else this.activeId.set(null);
  }

  /** Close and clear the active item. Focus restoration is UI-owned. */
  closeMenu(): void {
    this.open.set(false);
    this.activeId.set(null);
  }

  toggle(focus: RiviniaMenuFocus = 'first'): void {
    if (this.open()) this.closeMenu();
    else this.openMenu(focus);
  }

  /** The active id, or `null` when nothing is active. */
  pickActive(): string | null {
    return this.activeId();
  }

  activateFirst(): void {
    this.activeId.set(firstEnabled(this._items()));
  }

  activateLast(): void {
    const enabled = this._items().filter((i) => !i.disabled);
    this.activeId.set(enabled.length > 0 ? enabled[enabled.length - 1].id : null);
  }

  activateNext(): void {
    this.step(1);
  }

  activatePrevious(): void {
    this.step(-1);
  }

  activate(id: string): boolean {
    const found = this._items().find((i) => i.id === id && !i.disabled);
    if (!found) return false;
    this.activeId.set(id);
    return true;
  }

  private step(direction: 1 | -1): void {
    const enabled = this._items().filter((i) => !i.disabled);
    if (enabled.length === 0) {
      this.activeId.set(null);
      return;
    }
    const at = enabled.findIndex((i) => i.id === this.activeId());
    const next = enabled[(at + direction + enabled.length) % enabled.length];
    this.activeId.set(next.id);
  }
}

function firstEnabled(items: readonly RiviniaMenuItem[]): string | null {
  return items.find((i) => !i.disabled)?.id ?? null;
}
