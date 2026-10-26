import { Injectable } from '@angular/core';

/**
 * What the registry needs from a picker: a way to close it when ANOTHER picker
 * opens. Restoring focus is deliberately not part of the contract — the picker
 * that is opening owns the focus, and stealing it back would fight the user.
 */
export interface DatepickerPanelHandle {
  closeForAnotherPanel(): void;
}

/**
 * One open panel at a time, across the whole application.
 *
 * The state of a picker is per component on purpose: two pickers next to each
 * other must never share a focused day or a value (D52). But two panels open at
 * the same time is a bug the browser cannot prevent — a pointer click closes the
 * first panel through the outside-pointerdown listener, while a KEYBOARD
 * activation of the second trigger (Tab, then Enter) never fires a pointer
 * event at all. Measured: both panels open, one above the other.
 *
 * This registry is the missing coordination: it remembers the open picker and
 * closes it when another one opens. It is a root service because the constraint
 * is application-wide; it is NOT exported from the public entry point because a
 * consumer never needs to touch it.
 */
@Injectable({ providedIn: 'root' })
export class DatepickerPanelRegistry {
  private active: DatepickerPanelHandle | null = null;

  /** Makes `handle` the one open picker, closing whatever was open before. */
  claim(handle: DatepickerPanelHandle): void {
    const previous = this.active;
    this.active = handle;
    if (previous && previous !== handle) previous.closeForAnotherPanel();
  }

  /** Called on close and on destroy; only the active handle can release. */
  release(handle: DatepickerPanelHandle): void {
    if (this.active === handle) this.active = null;
  }
}
