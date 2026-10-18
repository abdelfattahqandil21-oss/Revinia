# @rivinia/menu

Angular dropdown menus with a headless controller and an optional ready-made
UI. The menu follows the WAI-ARIA menu-button interaction pattern; it is for
actions, not a menubar or a general-purpose listbox.

- Install: `npm install @rivinia/menu`
- Package version: **0.3.4**
- Angular peer dependency: `@angular/core ^22.0.0`
- `@rivinia/menu` exports the headless controller and types.
- `@rivinia/menu/ui` exports the standalone menu component and item directive.

## Ready-made menu

The UI component owns a controller when `[menu]` is omitted. For a typical
data-driven menu, import `RiviniaMenuComponent` into the standalone component
that uses `<rv-menu>`:

```ts
import { Component } from '@angular/core';
import type { MenuPick, RiviniaMenuItemData } from '@rivinia/menu/ui';
import { RiviniaMenuComponent } from '@rivinia/menu/ui';

@Component({
  standalone: true,
  imports: [RiviniaMenuComponent],
  templateUrl: './account-menu.component.html',
})
export class AccountMenu {
  readonly accountActions: readonly RiviniaMenuItemData[] = [
    { id: 'profile', label: 'Profile' },
    { id: 'settings', label: 'Settings' },
    { id: 'sign-out', label: 'Sign out', disabled: true },
  ];

  onPicked(pick: MenuPick): void {
    console.log('Selected action:', pick.id);
  }
}
```

```html
<!-- src/app/account-menu.component.html -->
<rv-menu
  [items]="accountActions"
  menuLabel="Account actions"
  placement="bottom-end"
  (picked)="onPicked($event)"
>
  <button type="button" rvMenuTrigger>Account</button>
</rv-menu>
```

`menuLabel` provides the accessible name for the menu panel and is
recommended. The trigger is consumer markup; the component adds its menu
button ARIA state and handles its keyboard activation. There are no service
providers or global styles to configure.

`(picked)` is the output name; `onPicked` is only the example handler method
name. Rename it freely (for example, `(picked)="onSelect($event)"`) and use
`$event.id` for the selected action ID.

The main template pieces have distinct jobs:

| Template piece             | What it does                                                                     |
| -------------------------- | -------------------------------------------------------------------------------- |
| `<rv-menu>`                | Owns open/close behavior, positioning, keyboard handling, and the panel.         |
| `[items]="accountActions"` | Renders the supplied `{ id, label, disabled? }` rows.                            |
| `menuLabel`                | Gives assistive technology an accessible name for the menu.                      |
| `placement`                | Chooses the preferred logical side of the trigger; the panel can flip to fit.    |
| `rvMenuTrigger`            | Marks consumer-provided trigger content and enables menu-button interaction.     |
| `rvMenuPanel`              | Marks the custom projected panel when using custom content instead of `[items]`. |
| `rvMenuItem`               | Registers one interactive custom row; give each row a unique stable `id`.        |
| `(picked)`                 | Fixed output name; emits `{ id }` after an enabled row is selected.              |
| `onPicked($event)`         | Consumer-chosen handler name; `$event.id` is the selected row ID.                |

### Custom panel content

Use the `RiviniaMenuItem` directive when rows need icons, custom layout, or
non-selectable headings and dividers. Import both standalone declarations:

```ts
import { Component } from '@angular/core';
import { RiviniaMenuComponent, RiviniaMenuItem } from '@rivinia/menu/ui';

@Component({
  standalone: true,
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  templateUrl: './custom-account-menu.component.html',
})
export class CustomAccountMenu {
  runAction(id: string): void {
    console.log('Run account action:', id);
  }
}
```

```html
<!-- src/app/custom-account-menu.component.html -->
<rv-menu menuLabel="Account actions" (picked)="runAction($event.id)">
  <button type="button" rvMenuTrigger>Account</button>
  <div rvMenuPanel>
    <p class="menu-heading">Signed in as Ada</p>
    <button type="button" rvMenuItem id="profile">Profile</button>
    <button type="button" rvMenuItem id="sign-out">Sign out</button>
  </div>
</rv-menu>
```

Every `rvMenuItem` needs a unique `id` within its menu. Items register and
unregister automatically, including rows rendered with `@for`; changing an
item's `id` or `disabled` state updates its registration. Non-item projected
content (such as the heading above) is not keyboard-navigable. Use a real
`button` for actions or an `a` with an `href` for navigation.

`[items]` and projected `rvMenuItem` rows are alternative ways to populate a
panel. Do not combine them: the component throws rather than silently ignore
one source. You may still project non-item content when using `[items]`.

The `rvMenuTrigger` / `rv-menu-trigger` and `rvMenuPanel` / `rv-menu-panel`
spellings are both accepted.

### Inputs and outputs

| API                       | Type                                                 | Behavior                                                                                   |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `menu`                    | `RiviniaMenuController \| null`                      | Optional external controller; omitted means the component owns one.                        |
| `items`                   | `readonly RiviniaMenuItemData[] \| null`             | Declarative rows (`id`, `label`, optional `disabled`).                                     |
| `placement`               | `bottom-start \| bottom-end \| top-start \| top-end` | Logical, RTL-aware placement; defaults to `bottom-start` and flips vertically when needed. |
| `menuLabel`               | `string \| null`                                     | Accessible name of the menu panel.                                                         |
| `panelClass`, `itemClass` | `string \| null`                                     | Additional classes on the panel, or on generated data rows.                                |
| `picked`                  | `MenuPick` (`{ id: string }`)                        | Emits after an enabled item is activated and the menu closes.                              |
| `opened`, `closed`        | `void`                                               | Notify when the panel opens or closes, for any close reason.                               |

For projected rows, `rvMenuItem` also accepts:

- `id` (required), `disabled` (defaults to `false`)
- `checked: boolean | null` (defaults to `null`; a boolean uses
  `menuitemcheckbox` semantics and sets `aria-checked`)
- `label: string | null` (optional explicit typeahead text; otherwise visible
  text is used)

Disabled rows remain visible but cannot be activated. For a native disabled
`button`, the directive also recognizes the element's native disabled state.
Data-driven rows are rendered as buttons and use the `id`, `label`, and
`disabled` fields from `RiviniaMenuItemData`.

The UI supplies basic layout and styling. Override its CSS custom properties
such as `--rv-menu-bg`, `--rv-menu-fg`, `--rv-menu-border`,
`--rv-menu-radius`, `--rv-menu-width`, and `--rv-menu-z` to theme it.
Projected content remains yours to style. Where supported, the panel uses the
browser popover top layer to avoid clipping ancestors; browsers without that
support use the positioned-panel fallback.

## Interaction and limitations

- Enter, Space, or ArrowDown opens on the first enabled item; ArrowUp opens on
  the last. Arrow keys wrap through enabled items; Home and End jump to the
  first and last. Printable characters perform typeahead matching.
- Escape closes and returns focus to the trigger. Selecting an item closes
  first, then emits `picked`. Outside pointer-down closes without stealing
  focus from the clicked target.
- Tab closes and moves focus onward; the menu is non-modal. Scrolling or
  resizing the page closes it so the panel does not drift from its trigger.
- An empty or all-disabled menu can open, but has no active item to select.
- The default controller starts closed during server rendering. On the client,
  placement is measured and flipped to fit the viewport when needed.
- Submenus, menubars, virtualization, form-control binding, and option-group
  behavior are not provided. This component does not implement a persistent
  multi-select menu.

## Headless controller

Import `RiviniaMenu` from `@rivinia/menu` when implementing a custom renderer
or when the component must control open state. Bind that instance to the UI's
`menu` input to keep rendering and focus behavior integrated:

```ts
import { Component } from '@angular/core';
import { RiviniaMenu } from '@rivinia/menu';
import { RiviniaMenuComponent, RiviniaMenuItem } from '@rivinia/menu/ui';

@Component({
  standalone: true,
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  templateUrl: './export-menu.component.html',
})
export class ExportMenu {
  readonly menu = new RiviniaMenu();

  exportAs(format: string): void {
    console.log('Export format:', format);
  }
}
```

```html
<!-- src/app/export-menu.component.html -->
<rv-menu [menu]="menu" menuLabel="Export actions" (picked)="exportAs($event.id)">
  <button type="button" rvMenuTrigger>Export</button>
  <div rvMenuPanel>
    <button type="button" rvMenuItem id="csv">CSV</button>
    <button type="button" rvMenuItem id="json">JSON</button>
  </div>
</rv-menu>
<button type="button" (click)="menu.openMenu('last')">Open at last action</button>
```

`RiviniaMenu` has readonly `open`, `activeId`, and `items` signals. Its
methods include `openMenu('first' | 'last' | 'none')`, `closeMenu()`,
`toggle()`, `activate(id)`, `activateFirst()`, `activateLast()`,
`activateNext()`, `activatePrevious()`, `register(item)`, and
`unregister(id)`. The UI directive manages registration for projected rows;
register manually only when building a headless renderer.

The core entry point also exports `RiviniaMenuController`,
`RiviniaMenuItemData`, `RiviniaMenuItem`, `RiviniaMenuFocus`, and
`RiviniaMenuPlacement`. The UI entry point exports
`RiviniaMenuComponent`, `RiviniaMenuItem`, `MenuPick`, and
`RiviniaMenuUiPlacement`, plus `computeMenuPosition`, `MENU_GAP`,
`MenuTriggerRect`, `MenuPanelSize`, `MenuViewport`, and `MenuCoordinates` for
custom positioning integrations.

## License

MIT.
