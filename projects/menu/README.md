# @rivinia/menu

[![npm version](https://img.shields.io/npm/v/@rivinia/menu.svg)](https://www.npmjs.com/package/@rivinia/menu)
[![license](https://img.shields.io/npm/l/@rivinia/menu.svg)](https://www.npmjs.com/package/@rivinia/menu)

Dropdown menu for Angular 22+ following the WAI-ARIA APG **menu button**
pattern. Two entry points:

- `@rivinia/menu` — headless controller. Open state, item registry, keyboard
  navigation. No DOM, no styling.
- `@rivinia/menu/ui` — optional ready-made dropdown (`<rv-menu>`) built on the
  controller. Zero runtime dependencies beyond Angular.

Both share one implementation of the navigation algorithm — the UI does not
reimplement it.

- Version: **0.2.0** (0.1.0 published; see [Migration](#migration-notes))
- Requires: **Angular `^22.0.0`**, `tslib`

---

## 1. What this is

A dropdown that opens from a trigger button and exposes a list of actions
(or navigation links). It is **not** a menubar, and it has **no submenu
support** — see [limitations](#19-submenus-and-limitations).

## 2. Requirements

| Requirement | Range                                        |
| ----------- | -------------------------------------------- |
| Angular     | `^22.0.0` (`@angular/core` peer)             |
| TypeScript  | ships with Angular 22 toolchain              |
| Module      | ESM (`@rivinia/menu` and `@rivinia/menu/ui`) |
| Node (dev)  | 20+                                          |

No other runtime dependencies. Verified by FESM import grep on the packed
tarball.

## 3. Supported / not supported

**Supported:** pointer + keyboard open/close, arrow/Home/End navigation with
wrap, typeahead, Escape focus return, non-modal Tab close, outside-click
close, top-layer rendering with viewport auto-flip, RTL, dynamic items,
disabled items, full ARIA wiring, SSR (renders closed).

**Not supported:** submenus, nested menus, menubar/menitem roles, radio
groups (use `checked` + `menuitemcheckbox`), option groups, virtualization of
very large lists, form binding (no `ControlValueAccessor` in 0.2.0).

## 4. Installation

```bash
npm install @rivinia/menu
```

Both entry points ship in the same package — install once, import the entry
point you need.

## 5. Quick start

The smallest complete example. **No controller, no registration** — the
component owns its own state and items register themselves.

```ts
import { Component } from '@angular/core';
import { RiviniaMenuComponent, RiviniaMenuItem } from '@rivinia/menu/ui';

@Component({
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  template: `
    <rv-menu label="Account actions" (picked)="open($event.id)">
      <button rv-menu-trigger>Account</button>
      <div rv-menu-panel>
        <button rvMenuItem id="profile">Profile</button>
        <button rvMenuItem id="billing">Billing</button>
        <hr />
        <button rvMenuItem id="logout">Sign out</button>
      </div>
    </rv-menu>
  `,
})
export class AccountMenu {
  open(id: string) {
    // your routing / api call here
  }
}
```

`rv-menu-trigger` is the trigger (any focusable element). `rv-menu-panel` is
the popup container — headers, dividers and badges can go inside it; they are
automatically skipped by keyboard navigation because they are not items.

## 6. Imports

```ts
// Ready-made UI (what most apps need)
import { RiviniaMenuComponent, RiviniaMenuItem } from '@rivinia/menu/ui';

// Headless controller (own UI, own state)
import { RiviniaMenu } from '@rivinia/menu';
import type {
  RiviniaMenuController,
  RiviniaMenuFocus,
  RiviniaMenuItem as RiviniaMenuItemData,
  RiviniaMenuPlacement,
} from '@rivinia/menu';

// Positioning helper (pure, testable)
import { computeMenuPosition, MENU_GAP } from '@rivinia/menu/ui';
```

Headless consumers who never import `@rivinia/menu/ui` load **zero** UI code
or CSS (core FESM contains no component markup).

## 7. Basic example with a controlled controller

Pass a controller when you need to drive the menu from outside (open it from a
route guard, close it after an async action, or read the active item).

```ts
import { Component } from '@angular/core';
import { RiviniaMenu } from '@rivinia/menu';
import { RiviniaMenuComponent, RiviniaMenuItem } from '@rivinia/menu/ui';

@Component({
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  template: `
    <rv-menu [menu]="menu" placement="bottom-end" (picked)="save($event.id)">
      <button rv-menu-trigger>Save as…</button>
      <div rv-menu-panel>
        <button rvMenuItem id="pdf">PDF</button>
        <button rvMenuItem id="csv">CSV</button>
      </div>
    </rv-menu>
  `,
})
export class SaveMenu {
  protected readonly menu = new RiviniaMenu();

  async save(id: string) {
    await this.persist(id); // async work
    this.menu.closeMenu(); // controller API stays available
  }
}
```

## 8. Inputs and outputs

### `rv-menu` (RiviniaMenuComponent)

| Input       | Type                                                         | Default          | Required | Purpose                                                                  |
| ----------- | ------------------------------------------------------------ | ---------------- | -------- | ------------------------------------------------------------------------ |
| `menu`      | `RiviniaMenuController \| null`                              | `null`           | no       | External controller. `null` → component owns a private one.              |
| `placement` | `'bottom-start' \| 'bottom-end' \| 'top-start' \| 'top-end'` | `'bottom-start'` | no       | Logical (RTL-aware) side to open on. Auto-flips when it does not fit.    |
| `label`     | `string \| null`                                             | `null`           | no       | Accessible name for the menu → panel `aria-label`. Strongly recommended. |

| Output   | Payload          | When                                                                                   |
| -------- | ---------------- | -------------------------------------------------------------------------------------- |
| `picked` | `{ id: string }` | An enabled item was activated (mouse or Enter/Space). Fires **after** the menu closes. |
| `opened` | `void`           | Panel opened (mouse, Enter, Space, ArrowDown, ArrowUp).                                |
| `closed` | `void`           | Panel closed, by any reason.                                                           |

Selection **closes the menu by default** — that is the APG behavior for action
menus. If you need a persistent list (a multi-select), keep the menu open
yourself from `picked`, or drive it with a controller.

### `rvMenuItem` (directive)

| Input      | Type              | Default | Required | Purpose                                                                                |
| ---------- | ----------------- | ------- | -------- | -------------------------------------------------------------------------------------- |
| `id`       | `string`          | —       | **yes**  | Identity. Also emitted in `picked`, and used for `data-rv-id`.                         |
| `disabled` | `boolean`         | `false` | no       | Skipped by keyboard navigation, refused on click, `aria-disabled="true"`.              |
| `checked`  | `boolean \| null` | `null`  | no       | `null` → `role="menuitem"`. `true/false` → `role="menuitemcheckbox"` + `aria-checked`. |

Items register on init and unregister on destroy — no manual bookkeeping, and
`@for`-driven collections work.

## 9. Full public API reference

### `@rivinia/menu` (headless)

| Export                  | Kind      | Summary                                                                                                                                                                                                           |
| ----------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RiviniaMenu`           | class     | Controller. `openMenu(focus?)`, `closeMenu()`, `toggle(focus?)`, `activate(id)`, `activateFirst()`, `activateLast()`, `activateNext()`, `activatePrevious()`, `register(item)`, `unregister(id)`, `pickActive()`. |
| `RiviniaMenuController` | interface | Structural subset a UI layer needs — accepts a controller from any module realm.                                                                                                                                  |
| `RiviniaMenuItem`       | interface | `{ id: string; disabled?: boolean }`.                                                                                                                                                                             |
| `RiviniaMenuPlacement`  | type      | `'bottom-start' \| 'bottom-end' \| 'top-start' \| 'top-end'`.                                                                                                                                                     |
| `RiviniaMenuFocus`      | type      | `'first' \| 'last' \| 'none'` — which item is active when opening.                                                                                                                                                |

Controller state is readonly: `open`, `activeId`, `items` signals. Writes only
happen through the explicit methods above.

### `@rivinia/menu/ui`

| Export                                                                | Kind      | Summary                                                                            |
| --------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------- |
| `RiviniaMenuComponent`                                                | component | `<rv-menu>`.                                                                       |
| `RiviniaMenuItem`                                                     | directive | `[rvMenuItem]`.                                                                    |
| `MenuPick`                                                            | interface | `{ id: string }` — `picked` payload.                                               |
| `RiviniaMenuUiPlacement`                                              | type      | Alias of `RiviniaMenuPlacement`, for UI-only imports.                              |
| `computeMenuPosition`                                                 | function  | Pure `(trigger, panel, placement, viewport, rtl, gap?) => { left, top, flipped }`. |
| `MENU_GAP`                                                            | const     | Default trigger↔panel gap in px (`6`).                                             |
| `MenuTriggerRect`, `MenuPanelSize`, `MenuViewport`, `MenuCoordinates` | types     | Arguments/result of `computeMenuPosition`.                                         |

## 10. Keyboard interaction

Focus starts on the **trigger**. With the menu open:

| Key                                 | Behavior                                                                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `Enter` / `Space` on trigger        | Open, focus first item                                                                                                                    |
| `ArrowDown` on trigger              | Open, focus first item                                                                                                                    |
| `ArrowUp` on trigger                | Open, focus last item                                                                                                                     |
| `ArrowDown` / `ArrowUp`             | Move to next / previous **enabled** item, wrapping                                                                                        |
| `Home` / `End`                      | First / last enabled item                                                                                                                 |
| Printable characters                | Typeahead: focus the first item whose text starts with the buffer; repeating one character cycles its matches; buffer resets after 500 ms |
| `Enter` / `Space`                   | Activate the focused item → `picked` → close                                                                                              |
| `Escape`                            | Close and return focus to the trigger                                                                                                     |
| `Tab` / `Shift+Tab`                 | Close, then focus continues to the next/previous element in document order                                                                |
| `Enter`/`Space`/`↓`/`↑`/`Esc`/`Tab` | Handled → `preventDefault()`. Anything else is left to the browser.                                                                       |

The menu is **non-modal** by design (no focus trap, no `inert`) — Tab leaves
it and traversal stays natural.

## 11. Accessibility and focus behavior

**Roles and wiring**

- Panel: `role="menu"`, stable `id`, `aria-label` from `label`.
- Trigger: `aria-haspopup="menu"`, `aria-expanded` (synchronized with real open
  state), `aria-controls` pointing at the panel id.
- Items: `role="menuitem"`, or `role="menuitemcheckbox"` + `aria-checked` when
  `checked` is set. Disabled items get `aria-disabled="true"` (kept focusable
  so screen readers can still reach them; the controller refuses activation).

**Focus contract**

| Event                          | Focus result                                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Open (mouse or keyboard)       | First enabled item (`ArrowUp` → last). Deferred to after render so it always lands on a real element.                                                                          |
| Arrow / Home / End / typeahead | Physical DOM focus moves to the target item (roving `tabindex`: only the active item is `tabindex="0"`).                                                                       |
| `Escape`                       | Returns to the trigger.                                                                                                                                                        |
| `Tab` / `Shift+Tab`            | Menu closes, focus continues naturally to the next/previous focusable element.                                                                                                 |
| Item activated                 | Focus is **not** restored — the element you activated is gone, so focus is left where the browser puts it. Drive it explicitly (e.g. navigate) if you need something specific. |
| Outside pointer-down           | Menu closes and **focus is not stolen** — the browser's natural focus behavior for the clicked element is preserved.                                                           |
| Outside scroll / window resize | Menu closes (coordinates would drift). Scrolling _inside_ the panel does not close it.                                                                                         |

**Empty / all-disabled menus:** the menu still opens, nothing is focused, and
arrow keys, Home/End, Enter and typeahead are safe no-ops. No exceptions, no
focus on `<body>`.

Verified with: 21 unit tests (`ng test menu`) and 19 Playwright scenarios in a
real Angular production build, including axe-core with zero violations on the
open menu.

## 12. Disabled and dynamic items

- **Disabled items** are skipped by arrows/Home/End/typeahead and cannot be
  activated by click or Enter/Space. They remain in the tab order as
  `aria-disabled` so assistive tech can discover them.
- **Dynamic items** register on init and unregister on destroy, so `@for`,
  `@if` and route-driven changes are safe. Removing or disabling the currently
  focused item clears `activeId` and focus moves to a valid target.
- **Duplicate ids** are idempotent: re-registering updates the entry in place.
- **Duplicate labels** are fine — ids are the identity. Typeahead matches the
  first item whose text starts with the buffer.

## 13. Styling and CSS variables

The panel ships with a **default theme implemented entirely through CSS custom
properties**. Override any of them from your own CSS — no `!important`, no
specificity war:

| Variable             | Default                       | Purpose                                               |
| -------------------- | ----------------------------- | ----------------------------------------------------- |
| `--rv-menu-bg`       | `#ffffff` (`#161616` in dark) | Panel background                                      |
| `--rv-menu-fg`       | `#111111` (`#f2f2f2`)         | Text color                                            |
| `--rv-menu-muted`    | `#555555` (`#a8a8a8`)         | Icons, secondary text                                 |
| `--rv-menu-border`   | `#e0e0e0` (`#333333`)         | Border and divider color                              |
| `--rv-menu-radius`   | `12px`                        | Corner radius                                         |
| `--rv-menu-shadow`   | `0 16px 48px rgba(0,0,0,.22)` | Panel shadow                                          |
| `--rv-menu-pad`      | `6px`                         | Panel padding                                         |
| `--rv-menu-width`    | `16rem`                       | Panel min-width                                       |
| `--rv-menu-font`     | system-ui stack               | Panel font-family                                     |
| `--rv-menu-z`        | `500`                         | Stacking level (only used by the no-popover fallback) |
| `--rv-menu-duration` | `160ms`                       | Enter animation duration                              |
| `--rv-menu-easing`   | `cubic-bezier(0.16,1,0.3,1)`  | Enter animation easing                                |
| `--rv-menu-from-y`   | `-6px` / `6px` for `top-*`    | Enter animation offset                                |

Set them on any ancestor of `rv-menu`, or on the `rv-menu` element itself:

```css
.my-accent {
  --rv-menu-bg: #0b1220;
  --rv-menu-fg: #e2e8f0;
  --rv-menu-radius: 4px;
}
```

**State hooks** for anything the variables do not cover:

| Hook                     | Where           | Meaning                                   |
| ------------------------ | --------------- | ----------------------------------------- |
| `.rv-menu-panel`         | panel           | The popup container                       |
| `.rv-menu-trigger`       | trigger wrapper | Wraps the projected trigger               |
| `[rvmenuitem]`           | item            | Any menu item row                         |
| `[data-active='true']`   | item            | Keyboard-active / pointer-hovered item    |
| `[aria-disabled='true']` | item            | Disabled item                             |
| `[data-placement]`       | panel           | `'bottom-start' \| …`                     |
| `[data-flipped='true']`  | panel           | Auto-flipped away from the requested side |
| `[data-positioned]`      | panel           | `false` until measured, `true` after      |
| `[data-top-layer]`       | panel           | `true` when rendered in the top layer     |
| `[data-rv-id]`           | item            | The item `id`                             |

```css
/* Brand the active row without touching library internals */
.my-accent .rv-menu-panel [data-active='true'] {
  background: color-mix(in srgb, currentColor 14%, transparent);
  outline: 2px dashed currentColor;
}
```

Dark mode is **not forced**: the library ships a `prefers-color-scheme: dark`
default so it looks right out of the box, and your variables override it.

## 14. Tailwind integration

The documented override path is CSS variables and the state hooks above —
those work with any utility framework. For utilities on the panel itself, put
them on your own wrapper:

```html
<div class="rounded-xl border border-slate-200 shadow-lg">
  <rv-menu [menu]="menu"> … </rv-menu>
</div>
```

> **Status:** verified with plain CSS and CSS variables in a real consumer
> production build. A dedicated Tailwind project is **not** part of the test
> suite — treat Tailwind-specific behavior as untested until you verify it in
> your app. Because the panel uses a small set of predictable classes and
> `data-*` hooks (no `!important`, no global resets), utilities should win
> through normal cascade rules, but that is a reasoned expectation, not a
> measured result.

## 15. Plain CSS integration

Fully supported — that is the primary path (see §13). No build plugin, no CSS
import, no configuration. The library's styles ship inside the component
(`ViewEncapsulation.None`, see §16) and are scoped under `.rv-menu-*` /
`rv-menu`, so they cannot leak into your app.

## 16. ViewEncapsulation behavior

`rv-menu` uses **`ViewEncapsulation.None`** deliberately, because projected
content lives in _your_ template: item buttons are created by the consumer, so
emulated (attribute-scoped) selectors can never match them. This was measured
in Chrome — with emulated encapsulation `display` on item buttons stayed
`inline-block` (unstyled, laid out inline).

Implications:

- Every library rule is scoped under `.rv-menu-panel` / `.rv-menu-trigger` /
  `rv-menu`, so nothing leaks out.
- Conversely, your global styles _can_ reach the panel — that is the intended
  escape hatch.
- `Emulated` is **not** claimed to give isolation; global CSS and cascade
  interactions can still affect the component.
- Shadow DOM is **not** used: it would make consumer styling, inherited theme
  variables, Tailwind utilities and top-layer overlays harder, for no gain.

## 17. RTL and positioning

`placement` values are **logical** (`start`/`end`), never physical:

| Placement      | LTR                       | RTL                           |
| -------------- | ------------------------- | ----------------------------- |
| `bottom-start` | below, left edge aligned  | below, **right** edge aligned |
| `bottom-end`   | below, right edge aligned | below, **left** edge aligned  |

Direction is read from `document.dir` first, then the computed style.

**Collision handling** (implemented, not aspirational):

- The panel renders in the **top layer** (native `popover="manual"` +
  measured `fixed` coordinates) when the browser supports it, so it escapes
  `overflow: hidden` ancestors and stacking contexts. Verified in Chromium
  (Playwright); Firefox/WebKit are wired in `playwright.config.ts` but their
  runs are not part of the recorded evidence yet.
- If the preferred vertical side overflows and the other side fits, the panel
  **flips** and sets `data-flipped="true"`.
- It is then **clamped** so it always stays inside the viewport, keeping an
  8 px margin.
- Long lists scroll inside the panel (`max-height: min(20rem, 100dvh - 2rem)`).
- Outside scroll / resize closes the menu instead of drifting.
- Browsers without `popover` fall back to absolute placement with the same
  placement values (no flip, no top layer).

Positioning is pure and reusable: `computeMenuPosition(trigger, panel,
placement, viewport, rtl)`.

## 18. Advanced headless usage

Use the controller with your own markup for full control:

```ts
import { RiviniaMenu } from '@rivinia/menu';

const menu = new RiviniaMenu();
menu.register({ id: 'profile' });
menu.register({ id: 'billing' });
menu.register({ id: 'legacy', disabled: true });

menu.openMenu(); // open, activeId === 'profile'
menu.activateNext(); // 'billing' (skips 'legacy')
menu.activateNext(); // wraps to 'profile'
menu.activatePrevious(); // 'billing'
menu.toggle('last'); // closes; openMenu('last') would focus 'billing'

menu.unregister('legacy');
menu.closeMenu(); // activeId back to null
```

Contract: navigation skips disabled items and wraps; `closeMenu()` clears the
active item; writes only through these methods. The controller has no DOM
knowledge, so it is independently unit-testable (see
`projects/menu/src/lib/rivinia-menu.spec.ts`).

## 19. Submenus and limitations

**No submenu support.** There is no `aria-haspopup` on items, no submenu
placement, no nested open/close lifecycle, and no tests for one. If you need
hierarchical navigation, compose separate menus — do not expect menubar
compliance from this package.

Other limitations:

- `placement` covers vertical + logical inline sides only; no arrow/caret,
  no offset customization.
- Outside scroll closes the menu rather than re-positioning it.
- No `ControlValueAccessor` — wire forms yourself (e.g. `[value]` + a
  `(selectionChange)`-style handler on your own component).
- Typeahead matches `textContent`, so an item's accessible name should match
  its visible text.
- Very large lists (hundreds of items) are not virtualized.

## 20. SSR / hydration

- The panel renders **closed** on the server, so SSR output is deterministic
  and hydration-safe. No panel id or `aria-expanded` state exists in the
  server HTML.
- Focus and positioning are browser-only: `afterRenderEffect` never runs on the
  server, and the top-layer measurement is guarded by `typeof window` /
  feature detection.
- `computeMenuPosition` is pure and environment-independent, so it can run
  anywhere (server-side position hints included).

## 21. Testing commands

```bash
# unit tests (vitest + jsdom, includes headless controller and DOM UI)
npx ng test menu --watch=false

# library production build
pnpm build:menu

# Playwright browser suite (needs the fixture built first)
npx ng build menu-e2e --configuration production
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# packed-artifact inspection
npm pack ./dist/menu
```

The Playwright suite serves `dist/menu-e2e/browser` from a local static server
and runs against a real Angular **production** build of a consumer app, not
unit mocks. A fresh server is always started — a stale server silently serves
an old bundle, which looks exactly like a product bug.

## 22. Troubleshooting

**Items look unstyled / sit inline.**
You are probably styling `rvMenuItem` (camelCase) in CSS — HTML lowercases
attribute names, so the selector never matches. Use `[rvmenuitem]`. The
shipped styles already handle this; if you wrote your own, use the lowercase
selector.

**Panel renders at the bottom of the page.**
The host must be positioned. The library sets `rv-menu { position: relative }`
itself; if you override `position` on `rv-menu`, absolute fallback panels lose
their anchor.

**Menu closes as soon as I click an item.**
An ancestor is calling `stopPropagation()` on `pointerdown`, so the outside
listener never sees the event as inside. Check overlay/menu containers.

**Focus does not land on the first item.**
Only happens when the menu contains **no enabled items**. The panel still
opens; add at least one enabled item or focus the trigger yourself.

**Everything is invisible in forced-colors mode.**
The default theme uses backgrounds and shadows. Supply your own
`--rv-menu-*` values or a `@media (forced-colors: active)` block.

## 23. Migration notes

### 0.1.0 → 0.2.0

No API was removed. Additions: `label` input, panel `id` + trigger
`aria-controls`, `check`ed items (`menuitemcheckbox`), top-layer positioning
with auto-flip.

**One behavior change worth knowing:**

- **Outside pointer-down no longer restores focus to the trigger.** In 0.1.0
  clicking anywhere outside pulled focus back to the trigger, which fought the
  browser's natural behavior and could steal focus from what the user actually
  clicked. Now focus stays where the browser puts it. If your app relied on the
  old behavior (e.g. you expected focus on the trigger after a stray click),
  restore it explicitly in your own outside handler.

Also note: `aria-controls` and the panel id only exist while the menu can be
opened; do not hard-code the `rv-menu-panel-N` id.

### 0.2.0 → 0.2.1 (planned)

Nothing yet.

## 24. Links

- Package: https://www.npmjs.com/package/@rivinia/menu
- Repository: https://github.com/abdelfattahqandil21-oss/Revinia
- WAI-ARIA APG — Menu button pattern:
  https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
- WAI-ARIA APG — Menu (menubar) pattern, for the differences:
  https://www.w3.org/WAI/ARIA/apg/patterns/menubar/
- Runnable fixture: `projects/menu-e2e` in this repository
  (`basic`, `dynamic`, `two`, `rtl`, `edge`, `styled` routes)

## License

MIT
