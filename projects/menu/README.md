# @rivinia/menu

[![npm version](https://img.shields.io/npm/v/@rivinia/menu.svg)](https://www.npmjs.com/package/@rivinia/menu)
[![license](https://img.shields.io/npm/l/@rivinia/menu.svg)](https://www.npmjs.com/package/@rivinia/menu)

Angular dropdown menus: a headless controller and an optional ready-made UI.
The menu follows the WAI-ARIA menu-button pattern; it is for **actions**, not
for a menubar or a general-purpose listbox.

- Package version: **0.3.5**
- Requires: **Angular `^22.0.0`** (`@angular/core`).
- `@rivinia/menu` exports the headless controller and its types.
- `@rivinia/menu/ui` exports the standalone menu component and item directive.
- Side effects: **none** (`sideEffects: false`).

## Quick features

- **Headless first.** The controller is the product; pixels are yours.
- **APG menu-button.** Arrow keys, Home/End, Enter/Space, Escape, and a
  non-modal Tab that steps past the menu instead of trapping focus.
- **Two levels of use.** Declarative (`[items]` + `(picked)`) or composable
  (`rvMenuItem` markup) — both routed through the same directives, so the
  keyboard, focus and registration exist once.
- **Placed with CSS anchor positioning**, so the panel stays with its trigger
  in both LTR and RTL, with no JS coordinates.
- **Two styling levels.** A global token layer (`@rivinia/theme`) or
  per-menu tokens, plus documented class names for the details.

## Install

```bash
npm install @rivinia/menu
```

or

```bash
pnpm add @rivinia/menu
```

or

```bash
yarn add @rivinia/menu
```

or

```bash
bun add @rivinia/menu
```

The optional theme layer, if you want the shared token set:

```bash
npm install @rivinia/theme
```

## Ready-made menu

The UI component owns a controller when `[menu]` is omitted. For a typical
data-driven menu, import `RiviniaMenuComponent` into the standalone component
that uses `<rv-menu>`:

```ts
import { Component } from '@angular/core';
import type { MenuPick, RiviniaMenuItemData } from '@rivinia/menu/ui';
import { RiviniaMenuComponent } from '@rivinia/menu/ui';

@Component({
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

## Theming

Every component reads **its own token → the shared semantic layer → its
built-in default**:

```css
--rv-menu-bg  →  --rv-bg  →  #ffffff
```

| Level          | Token          | Scope                               |
| -------------- | -------------- | ----------------------------------- |
| 1. per package | `--rv-menu-bg` | that menu only                      |
| 2. global      | `--rv-bg`      | every Rivinia component, everywhere |
| 3. default     | —              | what you get if you set nothing     |

```css
@import '@rivinia/theme';

:root {
  --rv-bg: #ffffff;
  --rv-fg: #111111;
  --rv-border: #e0e0e0;
}
```

Its defaults sit in `@layer rivinia-theme`, so your unlayered `:root` rules win
wherever they appear. **Map it on `:root`, never on a component element** — an
element-level declaration shadows the root value and the override silently
stops working.

### Which styling stack?

| Stack           | Import                                       |
| --------------- | -------------------------------------------- |
| **Plain CSS**   | `@import '@rivinia/theme';`                  |
| **Tailwind v4** | `@import '@rivinia/theme/tailwind.css';`     |
| **Bootstrap**   | `@import '@rivinia/theme/bootstrap.css';`    |
| **Sass / SCSS** | `@use '@rivinia/theme/scss';`                |
| **Less**        | `@import (less) '@rivinia/theme/theme.css';` |

**Tailwind v4** — your palette in `@theme`, the components point at it:

```css
@import 'tailwindcss';
@import '@rivinia/theme/tailwind.css';

@theme {
  --color-surface: #ffffff;
  --color-fg: #111111;
}

:root {
  --rv-bg: var(--color-surface);
  --rv-fg: var(--color-fg);
}
```

**Bootstrap 5.3** — the components read Bootstrap's own variables:

```css
@import 'bootstrap/dist/css/bootstrap.css';
@import '@rivinia/theme/bootstrap.css';
```

**Sass** — Dart Sass loads a plain `.css` file, but the extension must be
omitted for `@use` to treat it as a module:

```scss
@use '@rivinia/theme/scss';
```

**Less** — custom properties pass through untouched:

```less
@import (less) '@rivinia/theme/theme.css';
```

**Every size is in `rem`, not `px`.** The components scale with the reader's
root font size, so they follow the browser's text-size preference, a
user-set accessibility default, and whatever `html { font-size }` the app
sets. Measured: at a 17px root the trigger is 14.875px with `0.5rem 0.75rem`
padding; at a 24px root it is 21px with `0.75rem 1.125rem` padding. In `px`
none of it would have moved.

### The library's own tokens

| Token              | Default                       | Applies to      |
| ------------------ | ----------------------------- | --------------- |
| `--rv-menu-bg`     | `#ffffff`                     | panel           |
| `--rv-menu-fg`     | `#111111`                     | panel           |
| `--rv-menu-border` | `#e0e0e0`                     | panel + divider |
| `--rv-menu-muted`  | `#555555`                     | icon tone       |
| `--rv-menu-radius` | `12px`                        | panel           |
| `--rv-menu-shadow` | `0 16px 48px rgba(0,0,0,.22)` | panel           |
| `--rv-menu-width`  | `16rem`                       | panel min-width |

**No forced dark mode** — there is no `prefers-color-scheme` block in this
package.

## The override surface

**Tokens** for colour and shape:

```css
rv-menu {
  --rv-menu-bg: #101014;
  --rv-menu-fg: #f2f2f7;
  --rv-menu-border: #2a2a33;
  --rv-menu-radius: 6px;
}
```

**Tokens** for the metrics:

```css
rv-menu {
  --rv-menu-item-padding: 0.75rem 0.875rem;
  --rv-menu-item-radius: 0.25rem;
  --rv-menu-item-min-height: 2.75rem;
  --rv-menu-focus-ring: 2px solid var(--rv-accent);
}
```

**Classes** for anything the tokens do not cover. The component styles are
unencapsulated, so these selectors are global and stable:

```css
.rv-menu-panel [rvmenuitem] {
  padding: 16px 20px;
  border-radius: 0;
}
```

| Selector                      | What it styles              |
| ----------------------------- | --------------------------- |
| `.rv-menu-panel`              | the opened panel            |
| `.rv-menu-trigger`            | the trigger slot            |
| `.rv-menu-panel [rvmenuitem]` | a menu row                  |
| `.rv-menu-check`              | the multi-mode check mark   |
| `.rv-menu-hint`               | a row's trailing hint       |
| `.rv-menu-empty`              | the "nothing to show" state |
| `rv-menu hr`                  | a divider between groups    |

| Hook              | On    | Means                          |
| ----------------- | ----- | ------------------------------ |
| `data-active`     | row   | the keyboard-active row        |
| `data-placement`  | panel | `bottom-start`, `top-end`, …   |
| `data-flipped`    | panel | it flipped to the other side   |
| `data-positioned` | panel | it has been measured           |
| `data-top-layer`  | panel | it is in the browser top layer |

## Migration notes

### 0.3.4 → 0.3.5

**Nothing to do.** No API changed, no token was renamed, no class was renamed.

The only difference is that the panel now stays attached to its trigger in
right-to-left layouts, where it used to drift to the edge of the viewport. If
you styled the panel by targeting its markup, the selectors are unchanged:

```css
.rv-menu-panel { … }
.rv-menu-panel [rvmenuitem] { … }
```

## License

MIT.
