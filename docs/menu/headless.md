# @rivinia/menu — headless usage

Back to [the README](../../projects/menu/README.md) ·
[the API](api.md) · [ready-made component](ready-made.md)

`@rivinia/menu` (the headless entry point) is the whole menu behaviour with
**no DOM**: which item is registered, which one is active, and how focus moves.
The UI entry point is one implementation on top of it — you are not obliged to
use it.

## Binding a controller to the ready-made component

When you want the component's keyboard, focus and placement but your own
open/close logic, bind a controller to its `menu` input:

```ts
import { Component } from '@angular/core';
import { RiviniaMenu } from '@rivinia/menu';
import { RiviniaMenuComponent, RiviniaMenuItem } from '@rivinia/menu/ui';

@Component({
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  template: `
    <rv-menu [menu]="menu" menuLabel="Export actions" (picked)="exportAs($event.id)">
      <button type="button" rvMenuTrigger>Export</button>
      <div rvMenuPanel>
        <button type="button" rvMenuItem id="csv">CSV</button>
      </div>
    </rv-menu>
  `,
})
export class ExportMenu {
  readonly menu = new RiviniaMenu();

  exportAs(format: string): void {
    console.log('Export format:', format);
  }
}
```

## The controller

| Member                                  | Kind                                 | What it does                                                         |
| --------------------------------------- | ------------------------------------ | -------------------------------------------------------------------- |
| `open`                                  | `Signal<boolean>`                    | Whether the menu is open.                                            |
| `activeId`                              | `Signal<string \| null>`             | The active item's id, or `null`.                                     |
| `items`                                 | `Signal<readonly RiviniaMenuItem[]>` | The registry, in registration order.                                 |
| `register(item)`                        | method                               | Adds an item; re-registering the same id updates it.                 |
| `unregister(id)`                        | method                               | Removes an item and clears it if it was active.                      |
| `openMenu(focus?)`                      | method                               | Opens, activating the first, last, or the current item.              |
| `closeMenu()`                           | method                               | Closes and clears the active item.                                   |
| `toggle(focus?)`                        | method                               | Opens if closed, closes if open.                                     |
| `pickActive()`                          | method                               | The active item's id — what a pick would return.                     |
| `activateFirst()` / `activateLast()`    | methods                              | Move the active item to an end.                                      |
| `activateNext()` / `activatePrevious()` | methods                              | Move the active item one step, wrapping around.                      |
| `activate(id)`                          | method                               | Make an item active. Returns `false` for an unknown or disabled one. |

`RiviniaMenuController` is the **structural** subset of that surface, so a UI
layer can depend on the interface instead of the class — the same dual-realm
rule the other Rivinia packages follow.

## A complete headless example

A custom dropdown that follows the menu-button pattern, with no Rivinia markup
at all:

```ts
import { Component, ElementRef, signal, viewChild } from '@angular/core';
import { RiviniaMenu } from '@rivinia/menu';

interface Action {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
}

@Component({
  selector: 'app-action-menu',
  template: `
    <button
      #trigger
      type="button"
      [attr.aria-expanded]="menu.open()"
      aria-haspopup="menu"
      (click)="menu.toggle()"
      (keydown.arrowdown)="onArrow($event)"
      (keydown.escape)="menu.closeMenu()"
    >
      Actions
    </button>

    @if (menu.open()) {
      <ul role="menu" (keydown)="onKeydown($event)">
        @for (action of actions(); track action.id) {
          <li>
            <button
              type="button"
              role="menuitem"
              [attr.data-active]="menu.activeId() === action.id"
              [disabled]="action.disabled"
              (click)="run(action)"
              (mouseenter)="menu.activate(action.id)"
            >
              {{ action.label }}
            </button>
          </li>
        }
      </ul>
    }
  `,
})
export class ActionMenu {
  readonly menu = new RiviniaMenu();
  readonly actions = signal<readonly Action[]>([
    { id: 'copy', label: 'Copy link' },
    { id: 'move', label: 'Move' },
    { id: 'delete', label: 'Delete', disabled: true },
  ]);

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  constructor() {
    /*
     * The controller's registry is IDENTITY and enabled state only — the
     * label is UI-owned, so it is not registered. That is what lets the
     * consumer render the row however it likes.
     */
    for (const action of this.actions()) {
      this.menu.register({ id: action.id, disabled: action.disabled });
    }
  }

  onArrow(event: Event): void {
    event.preventDefault();
    this.menu.openMenu('first');
  }

  onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.menu.activateNext();
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.menu.activatePrevious();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.run(this.actions().find((a) => a.id === this.menu.pickActive())!);
        break;
      default:
        break;
    }
  }

  run(action: Action): void {
    if (action.disabled) return;
    this.menu.closeMenu();
    this.trigger()?.nativeElement.focus();
    console.log('ran', action.id);
  }
}
```

What the controller gives you, and what you still own:

- **Given**: the registry, the active item, and the movement between items
  (`activateNext` / `activatePrevious` wrap around and skip disabled ones).
- **Yours**: the markup, the ARIA wiring, the focus management, and where the
  panel is placed. `activate(id)` returns `false` for an unknown or disabled
  item, so respect it.

If you want the keyboard, the focus handling and the placement done for you,
use the ready-made component instead — it drives this same controller.

## What the ready-made component adds

`rv-menu` is one implementation. If your design needs a different look, drive
the headless controller yourself and render your own markup, as above.

The pieces it adds, so you know what you are taking on:

- **Roving `tabindex`** — only the active item is tabbable; the rest are `-1`,
  so Tab never walks the list.
- **Focus** moves into the panel on open and returns to the trigger on close.
- **Placement** with CSS anchor positioning where the engine supports it, so
  the panel stays with its trigger in both writing directions — see
  [browser support](../browser-support.md) for the two floors.
- **Dismissal**: Escape closes, a pointer-down outside closes without stealing
  focus from the element you pressed on, and Tab closes WITHOUT trapping focus
  and steps to the next tab stop.
