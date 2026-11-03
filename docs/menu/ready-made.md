# @rivinia/menu — the ready-made component

Back to [the README](../../projects/menu/README.md) ·
[the API](api.md) · [keyboard and interaction](interaction.md) ·
[theming and the override surface](theming.md)

`<rv-menu>` is one implementation of the menu-button pattern: it owns the
controller, the keyboard, the focus movement and the placement, and it drives
the same [headless controller](headless.md) you can use on your own markup.

## A data-driven menu

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

## Custom panel content

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
item's `id` or `disabled` state updates its registration. Use a real `button`
for actions or an `a` with an `href` for navigation.

## Projected content is a safe host, not a second menu

- **Row keys** (`ArrowUp`, `ArrowDown`, `Home`, `End`, `Enter`, `Space` and
  printable-character typeahead) act only when the key comes from the panel
  itself or from inside a registered `rvMenuItem` — including content nested
  inside that row.
- **Everything else stays with your control.** Typing in a projected `<input>`
  never moves the active row and never takes focus.
- **Dismiss keys act from anywhere in the panel.** `Escape` closes and returns
  focus to the trigger. `Tab` / `Shift+Tab` close and step focus to the next
  stop after the trigger, or the previous stop before it — focus is never
  trapped and never dropped on `<body>`.
- **A nested widget claims a key with `preventDefault()`.** The menu then does
  nothing with that key, `Escape` and `Tab` included.

After a pick the row disappears with the panel, so focus returns to the
trigger when it was inside the panel at pick time. A pointer pick that never
moved focus into the panel leaves focus where the browser put it.

## A single-choice group

A group of mutually exclusive rows (languages, density, theme) uses `checked`
and `radio`:

```html
<div rvMenuPanel>
  <div role="group" aria-label="Language">
    @for (lang of languages; track lang.id) {
    <button rvMenuItem radio [id]="lang.id" [checked]="lang.id === current()">
      {{ lang.label }}
    </button>
    }
  </div>
</div>
```

`role="group"` and `aria-label` are your markup — the menu only picks the row
role. Switching the language itself is application work: no `@rivinia/i18n`
import is required, and this recipe works with any i18n setup.

## Two sources for the rows, never both

`[items]` and projected `rvMenuItem` rows are alternative ways to populate a
panel. Do not combine them: the component throws rather than silently ignore
one source. You may still project non-item content when using `[items]`.

The `rvMenuTrigger` / `rv-menu-trigger` and `rvMenuPanel` / `rv-menu-panel`
spellings are both accepted.

## An icon in a row

Rows may contain an icon: the library sizes any `svg` (or `[data-icon]`)
child to 16px and tones it muted, while the consumer owns the shape that makes
it visible. Put the stroke on the icon, not on the row:

```html
<button type="button" rvMenuItem id="profile">
  <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor">
    <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 14c0-2.2 2.2-4 5-4s5 1.8 5 4" />
  </svg>
  Profile
</button>
```

## Further reading

- [Inputs, outputs and the row options](api.md) — the full surface, including
  what `checked` + `radio` turn into.
- [Keyboard and interaction](interaction.md) — pointer and keyboard opens,
  Tab, resize, and what the component does not do.
- [Theming and the override surface](theming.md) — the menu's own tokens, the
  documented classes, and the `data-*` hooks.
- [Headless usage](headless.md) — the same behaviour with your own markup.
