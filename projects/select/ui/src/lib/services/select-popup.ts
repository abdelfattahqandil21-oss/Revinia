import { signal, untracked } from '@angular/core';
import type { SelectPopupController, SelectPopupFocus, SelectPopupItem } from '../models/select-popup.types';

/**
 * Headless per-menu controller. Owns open state, the registered items and
 * the active (keyboard-focused) item — no DOM, no styling, no positioning.
 * Instantiate one per menu (`new RiviniaSelectPopup()`); rendering and focus moves
 * are the UI layer's job (the vendored popup UI implements them).
 *
 * Navigation skips disabled items and wraps around. Closing clears the
 * active item; the UI restores focus to the trigger.
 */
export class SelectPopupControllerImpl implements SelectPopupController {
  /** Whether the panel is open. */
  readonly open = signal(false);
  /** Id of the keyboard-active item (`null` when closed or unfocused). */
  readonly activeId = signal<string | null>(null);

  private readonly _items = signal<readonly SelectPopupItem[]>([]);
  /** Registered items, in registration order. */
  readonly items = this._items.asReadonly();
  /**
   * Id requested by {@link activate} before its row existed.
   *
   * A reopen asks for the current value while the declarative rows have not
   * rendered yet, so the call failed and the first row that registered won the
   * open (measured: a select on Alexandria reopened with Cairo active). Held
   * only while open, and dropped by any explicit navigation.
   */
  private requestedId: string | null = null;

  /**
   * Register an item (idempotent by id — re-register updates it).
   *
   * Untracked on purpose: rows call this from their own effect, and reading the
   * registry there made that effect depend on the array it was writing — every
   * registration re-ran every row's effect, forever.
   */
  register(item: SelectPopupItem): void {
    untracked(() => {
      const known = this._items().some((i) => i.id === item.id);
      this._items.update((list) => {
        const at = list.findIndex((i) => i.id === item.id);
        if (at === -1) return [...list, { ...item }];
        return list.map((i, index) => (index === at ? { ...i, ...item } : i));
      });
      if (this.requestedId !== null) {
        // While a request is pending, a row that is NOT the requested one must
        // not steal the open — the highlight would sit on the wrong option.
        if (this.requestedId === item.id) {
          this.requestedId = null;
          if (!item.disabled) this.activeId.set(item.id);
        }
        return;
      }
      // Rows render only after the panel opened, so `openMenu('first')` had an
      // empty registry and could not activate anything (measured: `activeId`
      // stayed null, the highlight never appeared). The first row to arrive
      // claims that initial activation.
      if (known) return;
      if (this.open() && this.activeId() === null && !item.disabled) {
        this.activeId.set(item.id);
      }
    });
  }

  /** Remove an item; clears `activeId` when it pointed at it. */
  unregister(id: string): void {
    untracked(() => {
      this._items.update((list) => list.filter((i) => i.id !== id));
      if (this.requestedId === id) this.requestedId = null;
      if (this.activeId() === id) this.activeId.set(null);
    });
  }

  /** Open and optionally focus the first/last enabled item, or preserve current. */
  openMenu(focus: SelectPopupFocus = 'first'): void {
    this.requestedId = null;
    this.open.set(true);
    if (focus === 'first') this.activateFirst();
    else if (focus === 'last') this.activateLast();
    else if (focus === 'current') {
      // Preserve the current active item — used by multi-select so keyboard
      // navigation continues from the picked item instead of resetting to first.
    } else this.activeId.set(null);
  }

  /** Close and clear the active item. Focus restoration is UI-owned. */
  closePopup(): void {
    this.requestedId = null;
    this.open.set(false);
    this.activeId.set(null);
  }

  toggle(focus: SelectPopupFocus = 'first'): void {
    if (this.open()) this.closePopup();
    else this.openMenu(focus);
  }

  /** The active id, or `null` when nothing is active. */
  pickActive(): string | null {
    return this.activeId();
  }

  activateFirst(): void {
    this.requestedId = null;
    untracked(() => this.activeId.set(firstEnabled(this._items())));
  }

  activateLast(): void {
    this.requestedId = null;
    untracked(() => {
      const enabled = this._items().filter((i) => !i.disabled);
      this.activeId.set(enabled.length > 0 ? enabled[enabled.length - 1].id : null);
    });
  }

  activateNext(): void {
    this.requestedId = null;
    this.step(1);
  }

  activatePrevious(): void {
    this.requestedId = null;
    this.step(-1);
  }

  /**
   * Activate a row by id. Returns false when it is not registered (yet); while
   * open, the request is held and honoured when that row registers.
   */
  activate(id: string): boolean {
    return untracked(() => {
      const found = this._items().find((i) => i.id === id && !i.disabled);
      if (!found) {
        if (this.open()) this.requestedId = id;
        return false;
      }
      this.requestedId = null;
      this.activeId.set(id);
      return true;
    });
  }

  private step(direction: 1 | -1): void {
    untracked(() => {
      const enabled = this._items().filter((i) => !i.disabled);
      if (enabled.length === 0) {
        this.activeId.set(null);
        return;
      }
      const at = enabled.findIndex((i) => i.id === this.activeId());
      const next = enabled[(at + direction + enabled.length) % enabled.length];
      this.activeId.set(next.id);
    });
  }
}

function firstEnabled(items: readonly SelectPopupItem[]): string | null {
  return items.find((i) => !i.disabled)?.id ?? null;
}
