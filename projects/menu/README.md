# @rivinia/menu

[![npm version](https://img.shields.io/npm/v/@rivinia/menu.svg)](https://www.npmjs.com/package/@rivinia/menu)
[![license](https://img.shields.io/npm/l/@rivinia/menu.svg)](https://www.npmjs.com/package/@rivinia/menu)

<p align="center">
  <img src="https://raw.githubusercontent.com/abdelfattahqandil21-oss/Revinia/menu/v1.0.1/assets/rivinia-abstract-mark-light.svg" alt="Rivinia" width="340" />
</p>

Angular dropdown menus: an optional ready-made UI and the headless controller
behind it. The menu follows the WAI-ARIA menu-button pattern; it is for
**actions**, not for a menubar or a general-purpose listbox.
Package version: **1.0.1**.

1.0.0-rc.1 is the first supported release; 0.x was experimental.

```ts
import { Component } from '@angular/core';
import { RiviniaMenuComponent } from '@rivinia/menu/ui';

@Component({
  imports: [RiviniaMenuComponent],
  template: `
    <rv-menu [items]="actions" menuLabel="Account actions" (picked)="run($event.id)">
      <button type="button" rvMenuTrigger>Account</button>
    </rv-menu>
  `,
})
export class AccountMenu {
  readonly actions = [
    { id: 'profile', label: 'Profile' },
    { id: 'sign-out', label: 'Sign out' },
  ];
  run(id: string): void {
    console.log(id);
  }
}
```

That is the whole menu: arrow keys and typeahead, one highlighted row, Escape
back to the trigger, and a panel that stays attached to its button in
right-to-left layouts. No service providers, no global styles to configure. The
same page under
[`projects/menu-e2e/src/app/pages`](https://github.com/abdelfattahqandil21-oss/Revinia/tree/menu/v1.0.1/projects/menu-e2e/src/app/pages)
is what the conformance suite drives — `npx ng build menu-e2e` runs it locally.

## Why `@rivinia/menu`

- **The menu-button pattern is done once, and tested in three engines.** A
  click opens without pre-selecting a row; the keyboard does the selecting.
  Tab closes and steps past the menu instead of trapping focus, because a
  menu-button is not a dialog.
- **Two levels of use, one implementation.** Declarative (`[items]` +
  `(picked)`) or composable (`rvMenuItem` markup) — both drive the same
  controller, so keyboard, focus and registration exist once.
- **Headless first.** `@rivinia/menu` is the behaviour with no DOM; the
  component in `@rivinia/menu/ui` is one implementation on top of it, not a
  layer you have to accept.
- **Placed with CSS anchor positioning** where the engine supports the whole
  gate, so the panel keeps up with its trigger in both writing directions —
  and the component's own coordinates where it does not.

## Install

```bash
npm install @rivinia/menu         # or pnpm add / yarn add / bun add
```

Optional, for the shared token layer: `npm install @rivinia/theme`.

- Requires **Angular `^22.0.0`** (`@angular/core` is a peer, not a dependency).
- Node: **same as Angular 22** (`^22.22.3 || ^24.15.0 || >=26.0.0`).
- `@rivinia/menu` exports the headless controller and its types;
  `@rivinia/menu/ui` exports `RiviniaMenuComponent` and `RiviniaMenuItem`.
- Side effects: **none** (`sideEffects: false`).

## Quick start

1. **Import the declarations** into the standalone component that uses the
   menu: `RiviniaMenuComponent` from `@rivinia/menu/ui`, plus `RiviniaMenuItem`
   if you will write your own rows. Nothing to provide at the application root.
2. **Write the trigger and the rows.** Put your own `<button>` in the content
   marked `rvMenuTrigger`, then either hand the component
   `RiviniaMenuItemData` rows through `[items]` or project `<button rvMenuItem
id="…">` rows inside a `<div rvMenuPanel>`. Give the panel an accessible
   name with `menuLabel`.
3. **Handle `(picked)` and look at it.** The output fires after an enabled row
   is chosen and the panel has closed; `$event.id` is the row's id. Open the
   page and try the arrows, a printable key, Escape and Tab — and then resize
   the window, which closes the panel rather than letting it drift.

## Two ways to use it

| Way                 | Entry              | You get                                                                                       |
| ------------------- | ------------------ | --------------------------------------------------------------------------------------------- |
| Ready-made UI       | `@rivinia/menu/ui` | the component, its panel, its CSS and its placement                                           |
| Headless controller | `@rivinia/menu`    | the registry, the active row, the movement — your markup, your ARIA, your focus and placement |

The two entries are independent: `/ui` uses the headless package through its
public API, and the headless package knows nothing about the component. Bind
your own controller to the component's `[menu]` input when you want the
ready-made behaviour with your own open/close logic.

## Compatibility

|               | Chrome / Edge | Firefox | Safari macOS | Safari iOS |
| ------------- | ------------- | ------- | ------------ | ---------- |
| **Supported** | 114           | 125     | 17           | 18.3       |
| **Enhanced**  | 131           | never   | 26.2         | 26.2       |

**Supported** is the floor the test suite runs against: the menu opens,
navigates, picks and is keyboard-operable; below it the panel loses the browser
top layer and can be clipped by an ancestor. **Enhanced** adds placement by CSS
anchor positioning. Firefox is excluded from that block on purpose — a measured
right-to-left bug — so it permanently uses the component's own coordinates,
which is the path this suite measures three times a day.

`@rivinia/menu` needs no feature to work that Angular itself does not need.
The floor dates, the `@supports` gate, and what has never been run (including
real Safari) are in
[browser support](https://github.com/abdelfattahqandil21-oss/Revinia/blob/menu/v1.0.1/docs/browser-support.md).

## Go further

| Topic                                                                                                | Read                                                                                                                     |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| The ready-made component: data rows, custom panel content, projected content that keeps its own keys | [docs/menu/ready-made.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/menu/v1.0.1/docs/menu/ready-made.md)   |
| Every input, output, option and type, per entry point                                                | [docs/menu/api.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/menu/v1.0.1/docs/menu/api.md)                 |
| Keyboard, opening and closing, resize, and the limitations                                           | [docs/menu/interaction.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/menu/v1.0.1/docs/menu/interaction.md) |
| Headless: the controller surface and a complete custom dropdown                                      | [docs/menu/headless.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/menu/v1.0.1/docs/menu/headless.md)       |
| The menu's tokens, classes, `data-*` hooks and forced-colours behaviour                              | [docs/menu/theming.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/menu/v1.0.1/docs/menu/theming.md)         |
| Theming every Rivinia component — the cascade, light and dark, where an override has to live         | [docs/theme/README.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/menu/v1.0.1/docs/theme/README.md)         |

Migration notes for each version live in
[CHANGELOG.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/menu/v1.0.1/projects/menu/CHANGELOG.md).
MIT licensed.
