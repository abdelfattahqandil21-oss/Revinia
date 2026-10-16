# @rivinia/menu

[![npm version](https://img.shields.io/npm/v/@rivinia/menu.svg)](https://www.npmjs.com/package/@rivinia/menu)
[![license](https://img.shields.io/npm/l/@rivinia/menu.svg)](https://www.npmjs.com/package/@rivinia/menu)

Headless menu behavior for Angular 22+. Per-instance open state, item
registry, and keyboard navigation model — no DOM, no styling, no
positioning. Rendering lives in `@rivinia/menu/ui` (or your own UI).

- Version: **0.1.0**
- Requires: **Angular `^22.0.0`**, `tslib`

## Install

```bash
npm install @rivinia/menu
```

## Quick start

```ts
const menu = new RiviniaMenu();
menu.register({ id: 'profile' });
menu.register({ id: 'logout' });

menu.openMenu(); // focuses 'profile'
menu.activateNext(); // 'logout' (disabled items are skipped, then wraps)
menu.closeMenu();
```

Keyboard mapping (UI-owned, behavior owned here): Enter/Space/ArrowDown
opens, Escape closes (UI restores focus to the trigger), arrows/Home/End
move through enabled items, Tab closes and moves on naturally.

## API

| Export | Kind | Purpose |
|---|---|---|
| `RiviniaMenu` | class | per-instance controller: `open/activeId/items` signals + `register/unregister/openMenu/closeMenu/toggle/activate*/pickActive` |
| types | types | `RiviniaMenuController` (structural UI contract), `RiviniaMenuItem`, `RiviniaMenuPlacement`, `RiviniaMenuFocus` |

## Ready-made UI (`@rivinia/menu/ui`)

Optional secondary entry point. Zero new runtime dependencies.

```html
<rv-menu [menu]="menu" [placement]="'bottom-start'" (picked)="go($event)">
  <button rv-menu-trigger><img src="avatar.png" alt="Account" /></button>
  <div rv-menu-panel>
    <div class="head">Sophie · sophie@ui.live</div>
    <button rvMenuItem id="profile">Profile</button>
    <button rvMenuItem id="logout">Sign out</button>
  </div>
</rv-menu>
```

```ts
menu = new RiviniaMenu();
```

Keyboard (APG menu-button pattern): Enter/Space/↓ opens, Escape closes and
refocuses the trigger, arrows/Home/End move through enabled items, Tab closes
and moves on (non-modal by design), outside pointer-down closes. Disabled
items are skipped and reported via `aria-disabled`. SSR renders closed.

## License

MIT.
