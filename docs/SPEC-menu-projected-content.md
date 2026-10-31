# SPEC — Menu panel as a projected-content host (`@rivinia/menu` 0.5.0)

Status: **implemented 2026-10-31.** Scope approved in the design interview of
2026-10-31; frozen after approval, and the change list in §3 is the contract.
Every case was written red first, one slice at a time, and §5 records the
counts from the runs rather than promising them.

Route: `tdd` → `test-verification` inside `@rivinia/menu` only. `browser` and
`playwright-cli` are loaded at the proof stage; no UI skill is loaded because
the demo page is an internal fixture, not an app screen.

Scope guard (owner's words, 2026-10-31): **no changes in `@rivinia/i18n`, no
`itemTemplate`, no Language Menu component, no nested-navigation engine, no
dynamic re-measure.** The language switcher is a consumer recipe built from
projected rows; this package only has to make the panel a safe host and to
make a single-choice row expressible.

## 1. Defects and the one feature in scope

M-12…M-15 are established **from source**, not yet from a running build:
reproduction tests r1–r4 (§4.2) are written first and must fail on the current
tree before any production hunk lands. F-1 is an API gap, not a defect.

| ID   | Class | Finding                                                                                                                                                                                                                                                    | Evidence (source of truth)                                                         |
| ---- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| M-12 | a11y  | `onPanelKey` is bound on `.rv-menu-panel` and handles **every** keydown that bubbles from projected content: `Enter`/`Space`/arrows/`Home`/`End` are `preventDefault`ed and drive menu navigation; hidden control. Printable keys fall into the typeahead. | `menu-panel.html:18`, `menu-panel.ts:482-530`, `menu-panel.ts:527` → `onTypeahead` |
| M-13 | a11y  | `focusActive` queries the whole panel for `[data-rv-id="…"]`, so a projected widget that uses the same attribute can receive menu focus on an id collision. `matchTypeahead` reads every `[data-rv-id]` before filtering by the registry.                  | `menu-panel.ts:669-683`, `menu-panel.ts:562-585`                                   |
| M-14 | a11y  | After a pick, `pickFocused`/`pickItem` close without restoring focus (`doClose(false)`); the picked row unmounts and focus falls to `<body>`. `rv-select` already restores in the same situation.                                                          | `menu-panel.ts:587-598`, `menu-panel.ts:604-608`, `select-panel.ts:388`            |
| M-15 | a11y  | Keyboard ownership has no written contract: `Escape` from projected content is not handled at all, and `Tab` from projected content is not handled, so focus can leave an open panel that stays mounted.                                                   | `menu-panel.ts:482-530`; `README.md:161-163` ("not keyboard-navigable")            |
| F-1  | API   | `RiviniaMenuItem.checked` always maps to `role="menuitemcheckbox"`. A single-choice group (languages, density, theme) is announced as multi-select, and `role` is host-bound, so the consumer cannot override it.                                          | `menu-panel.ts:36-48`, `menu-panel.ts:77-79`                                       |

## 2. Behaviour contract

### 2.1 Keyboard ownership

The panel keeps its `keydown` listener; ownership is now explicit.

- **`event.defaultPrevented` is respected first**: if any handler inside the
  panel already handled the key, the menu does nothing. This is the only
  signal a nested control needs — `rv-select-popup` already calls
  `preventDefault()` for every key it handles (`select-popup.ts:548-596`), so
  the nested-control case needs no API and no `stopPropagation` requirement
  (a stopped event never reaches the panel anyway).
- **Row-navigation keys** — `ArrowUp`, `ArrowDown`, `Home`, `End`, `Enter`,
  `Space`, and printable-character typeahead — act **only** when the event's
  target is the panel element itself or lies inside an element that is a
  **registered row**: `closest('[rvmenuitem]')` **and** its `data-rv-id` exists
  in `controller().items()`. Registry membership is checked, not enabled-ness:
  a key pressed while a disabled row holds focus must still move on.
- **Dismiss keys** — `Escape` and `Tab`/`Shift+Tab` — act from **any** target
  inside the panel, unless `defaultPrevented`:
  - `Escape` closes and returns focus to the trigger.
  - `Tab` closes and steps focus to the next stop **after** the trigger;
    `Shift+Tab` to the stop before it. This reuses the existing
    `focusAdjacentToTrigger()` path (`menu-panel.ts:709-731`), which already
    skips anything inside a `.rv-menu-panel` because that content is about to
    disappear.
- Anything else from a projected control does nothing. Typing in a projected
  `<input>` never reaches the typeahead and never moves focus.

**Why `Tab` closes** (decided against "let the browser tab, stay open"): the
stay-open option needs a `focusout` watcher to prevent an open panel whose
focus has left, and that watcher races the same native tab step the existing
`Tab` handler exists to defeat (`menu-panel.ts:514-525`). Closing on `Tab` is
the APG menu-button behaviour, it makes the contract one rule for rows and
projected content alike, and a nested control that needs `Tab` internally
claims it with `preventDefault` — `rv-select` does exactly that
(`select-panel.ts:409-415`).

**Invariant** (asserted in §4.3): after any `Tab` from inside the panel,
`open()` is `false` and focus is on an element outside `rv-menu` — never
`<body>`.

The trigger keeps its two existing paths: `Tab` on the trigger closes without
`preventDefault` (native step), `Tab` from a row closes and steps explicitly.
Both end on the same next stop; both stay, and both are tested.

### 2.2 Focus restoration after a pick

- The decision is taken **at pick time**, synchronously, before the panel is
  removed: if `document.activeElement` is inside the panel, close with
  `doClose(true)` (which already focuses the trigger and re-seats focus for
  the WebKit popover quirk, D80). Otherwise close with `doClose(false)`.
- A keyboard pick always restores. A pointer pick restores where the engine
  focuses the clicked button before `click` (Chromium); where it does not, the
  condition is false and focus is left alone — the same philosophy the
  outside-click path already documents. WebKit is not runnable on this box
  (`libavif.so.16`), so that branch stays unverified by execution.
- A programmatic `pickItem(id)` from outside the panel never steals focus.

### 2.3 `[radio]` on `rvMenuItem`

- New input `radio = input(false, { transform: (v: boolean | string) => v === '' || v === true })`,
  same attribute transform as `disabled`, so `<button rvMenuItem radio>` works.
- Role mapping, all three states:

  | `checked` | `radio` | `role`             |
  | --------- | ------- | ------------------ |
  | `null`    | any     | `menuitem`         |
  | boolean   | `false` | `menuitemcheckbox` |
  | boolean   | `true`  | `menuitemradio`    |

- `aria-checked` is unchanged (`String(checked)`, present only when non-null).
- Nothing else changes: the row registers identically, `radio` never affects
  the registry, navigation, typeahead or the `[items]` path.
- "Exactly one checked" is the consumer's binding. The group is consumer
  markup: `<div role="group" aria-label="…">` — the menu already treats a
  non-row container as passive.

### 2.4 Positioning and trigger association (regression guard)

Projected content must not change how the panel is anchored or announced:
relative to the trigger, flipping when it does not fit, with
`aria-haspopup="menu"` and `aria-expanded` on the trigger and `aria-controls`
present only while open. Proven with real layout in Playwright (§4.3 E7);
jsdom cannot see it.

Dynamic size re-measure is **out of scope** (owner's decision): the panel is
measured at open on the JS path, and a projected control that resizes the
panel while it is open is documented, not handled.

## 3. Exact change list

### `projects/menu/ui/src/lib/components/menu/menu-panel.ts`

1. `RiviniaMenuItem` (around L59): add `readonly radio = input(false, { transform: … })`
   with a doc comment that names the three roles.
2. `computedRole()` (L77-79): return `menuitemradio` when `checked() !== null && radio()`.
3. `onPanelKey()` (L482): first line `if (event.defaultPrevented) return;`.
4. New private helper `ownsRowKeys(event: KeyboardEvent): boolean` — target is
   the panel or inside a `[rvmenuitem]` whose `data-rv-id` is in
   `controller().items()`. Used by the arrow/Home/End/Enter/Space branches and
   by the `default` branch before `onTypeahead`.
5. `pickFocused()` (L587) and `pickItem()` (L604): compute
   `const restore = this.focusInsidePanel();` before closing and pass it to
   `doClose(restore)`.
6. New private `focusInsidePanel(): boolean` — reads `document.activeElement`,
   SSR-safe like the existing `activeDocumentElement()`.
7. `matchTypeahead()` (L562) and `focusActive()` (L669): scope the query to
   `[rvmenuitem][data-rv-id]`, and `focusActive`'s fallback to `[rvmenuitem]`.
8. No other behaviour changes. `doClose`, `focusAdjacentToTrigger`,
   `reseatTriggerFocus`, `markOpening`, the ARIA effect and the outside-click
   path stay byte-identical.

### `projects/menu/ui/src/lib/components/menu/menu-panel.html`

- No change. Rendered rows keep `[checked]`; `[items]` data has no radio field
  (see §6).

### `projects/menu/ui/src/lib/components/menu/menu-panel.css`

- No change. No new class, token or rule; the fixture styles itself.

### `projects/menu/tests/menu-panel.spec.ts`

- New harness with a projected `<input>`, a nested control that calls
  `preventDefault` on one key, and a `role="group"` of `radio` rows.
- New cases: unit 1–9 in §4.2. No existing case is edited.

### `projects/menu/README.md`

- "Custom panel content" (`:127`): replace "Non-item projected content … is
  not keyboard-navigable" with the contract in §2.1 — projected controls keep
  their own keys; the menu owns row navigation and the dismiss keys; a nested
  control claims a key with `preventDefault`.
- "For projected rows, `rvMenuItem` also accepts" (`:184`): add `radio` and
  the role table, plus the `role="group"` grouping rule and a three-row
  language example.
- Note the focus-return rule after a pick (§2.2).

### `projects/menu-e2e/src/app/pages/content.ts` (new) + `app.routes.ts`

- New page `/content`, styled like the neighbouring fixtures: a trigger showing
  the current language, a panel with a heading, a projected `<input>`, and a
  `role="group"` of three `radio` rows (Arabic / English / German). It doubles
  as the documented "language in a menu" recipe with **no** i18n import — the
  rows swap `dir`/`lang` on the page's own root to prove the visual part.
- Route added to `app.routes.ts` (one line).

### `e2e/menu/projected-content.spec.ts` (new)

- E1–E7 in §4.3. Uses `support.ts`'s `openMenu()` where a pointer open is
  wanted; new fixture only, no existing spec edited.

### `CHANGELOG.md` (root)

- New `@rivinia/menu 0.5.0` entry: projected-content keyboard ownership, focus
  return after a pick, `[radio]` / `menuitemradio`. No byte sizes (they would
  be shipped inside the tarball).

### `docs/DECISIONS.md`

- New entry **D83**: the ownership model (`defaultPrevented` + registry
  identity), why `Tab` closes (and the rejected `focusout` alternative), focus
  restoration timing, and why `radio` is a general menu improvement rather
  than an i18n requirement.

### `docs/SPEC-menu-projected-content.md`

- This file.

## 4. Seams under test (agreed before writing tests)

| Seam                                                                                                      | What it catches                                                                                                             | What it misses                                           |
| --------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Public `RiviniaMenuComponent` + `RiviniaMenuItem` through a host template, jsdom (`projects/menu/tests/`) | Keydown ownership, registry gating, role mapping, the focus-restore decision, registry navigation                           | Real layout, real tab stepping, engine focus differences |
| Packed build in Playwright (`e2e/menu/`, `menu-e2e` demo)                                                 | `Tab`/`Escape` in a real DOM, focus after a pick, panel positioning with projected content, `aria-controls`/`aria-expanded` | WebKit (cannot launch here), Safari focus rules          |
| CSS source assertions (`menu-panel-css.spec.ts`)                                                          | —                                                                                                                           | Not touched in this batch                                |

### 4.1 Red-first order (vertical slices)

X1 → fix → X2 → fix → … One slice at a time; no bulk test authoring.

### 4.2 Unit cases (jsdom) — each must fail before its production hunk

1. r1 — typing `a` in a projected `<input>` does not move focus and does not
   activate a row (guards M-12's typeahead path).
2. r2 — `Enter` / `ArrowDown` from the projected `<input>` activates nothing
   and emits nothing.
3. A nested control that `preventDefault()`s `ArrowDown` keeps the menu open
   and the active row unchanged.
4. `Escape` from the projected `<input>` closes the menu and focuses the
   trigger; the same key from a control that prevents it does not close.
5. r3 — `Enter` on a row closes and leaves `document.activeElement === trigger`.
6. r4 — a pick while focus sits outside the panel leaves that focus alone.
7. r5 — `radio` row: `role="menuitemradio"`, `aria-checked="true"`, and the
   `role="group"` container is not treated as a row.
8. `radio` default-off: the same row without `radio` stays `menuitemcheckbox`
   (existing rows unchanged).
9. Navigation with a colliding `data-rv-id` on projected non-row content:
   `ArrowDown`/typeahead/focus land on the registered row only.

### 4.3 Browser cases (Playwright, Chromium + Firefox)

1. E1 — `Tab` from the projected input: menu closed, focus on the element
   after `rv-menu`; `Shift+Tab` on the element before it.
2. E2 — typing in the input keeps focus there and does not highlight rows.
3. E3 — `Enter`/arrows from the input change nothing.
4. E4 — `Escape` from the input closes; the fixture's preventing control does
   not close.
5. E5 — keyboard pick (Enter on the German row) returns focus to the trigger
   and flips `dir`/`lang` on the page root.
6. E6 — the three rows expose `menuitemradio` + exactly one `aria-checked="true"`.
7. E7 — panel anchored to the trigger (bounds within a tolerance of the
   trigger's box), `aria-expanded="true"` and `aria-controls` resolving while
   open; both absent/false after close.

## 5. Acceptance

Recorded on 2026-10-31, after the final source state:

- `npx ng test menu --watch=false` → **59/59** (was 49 before this batch; every
  pre-existing case unedited).
- `npx ng build menu` and `npx ng build menu-e2e` → exit 0.
- `npx playwright test e2e/menu --project=chromium` → **66/66**;
  `--project=firefox` → **66/66** (57 pre-existing cases plus the 9 new ones).
  WebKit **not run**: `libavif.so.16` is missing on this host.
- Mutation check, each hunk reverted in the working tree and the unit suite
  re-run:

  | Hunk reverted                                   | Red cases  |
  | ----------------------------------------------- | ---------- |
  | the `defaultPrevented` guard line               | r3, r9     |
  | `const rowKeys = this.ownsRowKeys(event)` gate  | r2         |
  | the focus condition (`doClose(inside)` → false) | r4, r5b    |
  | the focus condition (→ always true)             | r5         |
  | the `[rvmenuitem]` selector scoping             | r6         |
  | the role mapping (`radio` → `menuitemradio`)    | r7         |
  | the `closest('[rvmenuitem]')` lookup            | r4, r8, r9 |

- No new console errors on `/content` in either engine (the browser runs
  listened for `console`, page errors and failed requests).
- The two `Tab` paths stay and agree: the new E1/E2 cases cover the panel path,
  `focus-contract.spec.ts` keeps covering the trigger path, unedited.

## 6. Out of scope

- Any change in `@rivinia/i18n` (docs, types, code).
- `[itemTemplate]`, a language-menu component, a submenu/nested-navigation
  engine, dynamic re-measure.
- `radio` in the declarative `[items]` path: that path has no checked source
  without an external `isSelected`, so it would ship half a feature.
- Nested menus (a menu inside a panel): the registry gate makes them inert by
  construction; nothing is added to support them.
- The trigger's own projected content (a control inside `rv-menu-trigger`):
  `onTriggerKey` is unchanged.

## 7. Contradictions and risks found while writing this

- `README.md:161-163` says non-row projected content is "not keyboard-navigable".
  That stays true for _menu navigation_ but is false for a control that is
  keyboard-operable on its own; the wording is corrected in §3.
- Two different `Tab` paths exist today (trigger: native step; row: explicit
  step). They agree on the destination and both are kept, but a future edit
  could "simplify" one and break the invariant; E1 asserts the outcome, not
  the path.
- `focusAdjacentToTrigger` filters out stops inside **any** `.rv-menu-panel`.
  That is correct for the closing panel, but it also hides stops in a _nested_
  panel — irrelevant today (nested menus are inert) and noted so nobody
  mistakes it for a bug.
- `defaultPrevented` can be set by a capture-phase handler outside the panel
  (an app-level shortcut). The menu would then yield. Accepted: an app that
  claims a key has claimed it everywhere.
- jsdom's `HTMLElement.click()` does not focus the element. Unit case 5 must
  `focus()` the row first, as the existing pointer-open case already does
  (`menu-panel.spec.ts:65`).
- The demo page lives in `menu-e2e`, which depends on `@rivinia/select/ui`
  already; this batch adds **no** import of it, to keep the two packages'
  stories separate.

### 7.1 Found during implementation

- **The `/content` nav link collides with a pinned pre-existing case.**
  `focus-contract.spec.ts` asserts `Shift+Tab` lands on the **last nav link**
  (`Styled`). Adding `Content` at the end of the nav moved that stop and turned
  the case red. The acceptance rule forbids editing pre-existing cases, so the
  nav link was placed before `Styled`; document order is demo data, not a
  contract.
- **Keyboard open defers focus to `afterRenderEffect`.** After a pointer open,
  `ArrowDown` activates the first row on the trigger, and focus lands on it one
  render later. A test that follows with another key immediately sends it to
  the trigger instead of the row (measured: the German pick test chose English
  on its second open). Every multi-key browser case therefore waits for
  `toBeFocused()` between steps; the same sequencing keeps `openMenu()` honest.
- **`ownsRowKeys` must stay the single gate.** The `default` (typeahead) branch
  still calls it directly rather than reusing `rowKeys`; an early mutation
  replacing only the switch's `rowKeys` left typeahead gated and masked the
  regression. r1 guards that line specifically.

## 8. Version and release

- `projects/menu/package.json`: 0.4.0 → **0.5.0** (new input + behaviour
  change; pre-1.0 minor). Version bump, tag `menu/v0.5.0` and publish are a
  separate gate with explicit owner confirmation; this spec stops before the
  registry.
- `pnpm build menu` / `npx ng test menu` / `npm pack` are development gates
  and run freely.
