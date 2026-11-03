# SPEC — Menu usage and display fixes (`@rivinia/menu` 0.4.0)

Status: **implemented 2026-10-30** — scope approved by the owner on
2026-10-30, implementation and gates complete on this branch. Release:
**0.4.0 (minor)** — the pointer-open interaction change makes this a minor,
not a patch; 0.3.6 was prepared and never published, and 0.4.0 was published
on 2026-10-31. Decisions taken in that exchange: **mechanical fixes only** (no new trigger skin), **pointer open must
not highlight or focus a row**, and the panel gets **a 22rem cap with wrapping
and a 10rem floor**.

Every defect below was reproduced against a real build (`ng build menu` →
`dist/menu` → `ng build menu-e2e`) in Chromium 141 and Firefox 144 before this
spec was written; the numbers in the table are measured, not estimated.

## 1. Defects in scope

| ID   | Class        | Defect                                                                                                             | Evidence                                                                      |
| ---- | ------------ | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| M-1  | usage        | Rows generated from `[items]` are `<button>` without `type` → implicit `submit`; inside a `<form>` a row submits it. | `typeProperty: "submit"`, no `type` attribute on any generated row            |
| M-2  | a11y         | The trigger keeps `aria-controls="rv-menu-panel-N"` while the panel is closed and the node does not exist.          | `aria-controls: "rv-menu-panel-1"`, `targetExists: false`                     |
| M-3  | display      | Two rows paint at once: the hovered row keeps its 8% wash after the arrow keys move the 10% active row.             | `bothPainted: ["duplicate","delete"]`                                         |
| M-4  | design       | `min-width: 16rem` forces a 270px panel around 113px of content.                                                    | `width 270` / `widthWithoutMinWidth 113`                                      |
| M-5  | design       | The open animation scales from the panel's centre, not the trigger corner.                                          | `transform-origin: 135px 0px` on a `bottom-start` panel                        |
| M-6  | display      | A long label stretches the panel to one 548px line on a 1280px viewport.                                            | `panelW 548` / `rowH 40` at 1280; at 390 the same row wraps to `rowH 55`      |
| M-7  | cleanup      | `[id]` on generated rows is dead — the directive's `id` input shadows the DOM property, so no `id` reaches the DOM. | `idAttr: null`, `dataId: "profile"`                                           |
| M-9  | design       | Pointer open activates and focuses the first row, so it reads as already chosen.                                    | `activeIds: ["new"]`, `focusIsInPanel: true`, `focusVisible: false`           |
| M-11 | docs + demo  | Icon support has CSS but no documentation, and the harness icon is invisible (a `path` with no `stroke`).           | `svg { width:16px; color: var(--rv-menu-muted) }` exists; row shows no glyph  |

## 2. Behaviour contract

### 2.1 Open paths (M-9, M-3)

- **Keyboard open** (Enter / Space / ArrowDown / ArrowUp on the trigger) is
  unchanged: the first (or last) enabled row becomes `data-active="true"`,
  receives focus, and `aria-controls` points at the panel.
- **Pointer open** (click on the trigger): the panel opens, **no row is
  active**, and **focus stays on the trigger**. The first `ArrowDown` from the
  trigger then activates and focuses the first enabled row, and a subsequent
  `ArrowDown` moves to the second — the same path keyboard users already take.
- **Hover** activates a row through the controller (`hoverItem` →
  `activate`), and that activation is the *only* highlight. The `:hover`
  background rule is removed, so exactly one row can be painted at any time
  (M-3). Hovering a disabled row paints nothing.
- Clicking a row that is not active still picks it: `pickItem` activates and
  closes, unchanged.

### 2.2 ARIA lifecycle (M-2)

- `aria-haspopup="menu"` and `aria-expanded` stay on the trigger at all times.
- `aria-controls` is present **only while the panel is open**, and its value is
  the panel's id. On close the attribute is removed, so no `aria-controls`
  ever references a missing element.

### 2.3 Panel sizing (M-4, M-6)

- The panel is `box-sizing: border-box`, so every size token describes the
  visible box (today `min-width: 16rem` yields a 270px box because of padding).
- `min-width: var(--rv-menu-width, 10rem)` — 160px, not 256px.
- `max-width: min(var(--rv-menu-max-width, 22rem), calc(100dvw - 1rem))` —
  352px, or the viewport minus 8px per side, whichever is smaller.
- The panel still sizes to its content between those bounds
  (`width: max-content` in the anchor-positioning path); a label longer than
  the cap **wraps** inside the row instead of stretching the panel. Rows keep
  `white-space: normal`; no ellipsis, no clamping.
- `max-height` keeps scrolling the row list (`--rv-menu-panel-max-height`).

### 2.4 Motion origin (M-5)

- The panel scales from the corner nearest the trigger:
  `bottom-start` → top-left in LTR, top-right in RTL; `bottom-end` mirrored;
  `top-*` from the bottom edge. When the panel flips vertically
  (`data-flipped="true"`), the origin follows the side it actually landed on.
- Direction comes from a `data-rtl` attribute the component writes on the panel
  during change detection (the same `isRtl()` the positioning path uses), so
  the rule is CSS-only and works with no JavaScript coordinates (`:dir()`
  support is not required).

### 2.5 Generated rows (M-1, M-7)

- Rendered as `<button type="button" …>`.
- The `[id]` binding stays: it feeds the directive's required `id` input, and
  Angular prefers the directive input over the DOM property, so no `id`
  attribute lands on the element. DOM identity stays on `data-rv-id` only
  (see §8).

## 3. Exact change list

### `projects/menu/ui/src/lib/components/menu/menu-panel.html`

- Generated row: add `type="button"`; keep `[id]="item.id"` (it feeds the
  directive input and never lands on the DOM — see §8).
- Panel: add `[attr.data-rtl]="isRtl()"`.

### `projects/menu/ui/src/lib/components/menu/menu-panel.ts`

- `isRtl()` becomes `protected` and caches against the host's computed
  `direction` per call (no stored state; SSR-safe, panel is client-only).
- `markOpening()` takes the open trigger (`'pointer' | 'keyboard'`):
  pointer → `focusPending = false`, `pendingActivation = false`;
  keyboard → `focusPending = true`, `pendingActivation = true` (today both are
  always true, which is M-9).
- `onTriggerKey`'s `ArrowDown`/`ArrowUp` while already open: activate
  first/last and move focus, instead of re-emitting `opened` a second time.
- ARIA effect: set `aria-controls` only when `open()`, remove it otherwise.

### `projects/menu/ui/src/lib/components/menu/menu-panel.css`

- Delete `.rv-menu-panel [rvmenuitem]:hover { background: … }` (M-3).
- `.rv-menu-panel`: `box-sizing: border-box`, `min-width: var(--rv-menu-width, 10rem)`,
  `max-width: min(var(--rv-menu-max-width, 22rem), calc(100dvw - 1rem))`.
- Replace `transform-origin: top center` / the two `flipped` rules with the
  eight placement × direction rules (top-layer and fallback alike).
- Keep the reduced-motion guard, the anchor-positioning block, and every
  existing token fallback untouched.

### `projects/menu/README.md`

- Tokens table: `--rv-menu-width` default `10rem` (min-width), add
  `--rv-menu-max-width` `22rem` (max-width), note that sizes are border-box.
- Interaction section: pointer open leaves no row active and focus on the
  trigger; the first ArrowDown activates the first row. Hover is the only
  pointer highlight.
- Custom-panel section: document icon support (`svg` / `[data-icon]` sized and
  toned by the library; the consumer owns `fill`/`stroke`).
- Migration note under `0.3.4 → 0.3.5` … a new `0.3.5 → 0.4.0` note: the
  default minimum width shrinks, long labels wrap, and a pointer-opened menu
  no longer pre-highlights its first row.

### `projects/menu-e2e/src/app/pages/api.ts`

- Wrap the data-driven menu in a `<form (submit)>` and record submits, so the
  M-1 regression is observable.
- Set `stroke="currentColor" fill="none"` on the demo icon (M-11).
- Add one long-label item to exercise M-6.

### `CHANGELOG.md`

- Extend the prepared `@rivinia/menu 0.4.0` entry with a "Menu usage and
  display" bullet set listing M-1…M-11 in user terms.

### `docs/DECISIONS.md`

- New entry: the pointer/keyboard split, the single-highlight rule, the
  border-box sizing model, and why the panel caps at 22rem rather than
  ellipsizing.

## 4. Token changes

| Token                | Was     | Now     | Note                                     |
| -------------------- | ------- | ------- | ---------------------------------------- |
| `--rv-menu-width`    | `16rem` | `10rem` | still the **min**-width; border-box now  |
| `--rv-menu-max-width`| —       | `22rem` | new; capped by `100dvw - 1rem`           |

No other token changes. `--rv-menu-radius`, `--rv-menu-shadow` and
`--rv-menu-muted` keep their values; retuning the shadow is explicitly out of
scope for this batch.

## 5. Tests (written first, must fail on the current code)

`projects/menu/tests/menu-panel.spec.ts` (jsdom-component)

1. Pointer open: no `[data-active="true"]`, `document.activeElement` is the
   trigger, panel is open.
2. Pointer open then ArrowDown on the trigger: first enabled row active and
   focused, exactly one `opened` emission.
3. Keyboard open (Enter): first row active and focused (guards the old path).
4. Closed: trigger has `aria-haspopup`/`aria-expanded` but **no**
   `aria-controls`; open: `aria-controls` equals the panel id and resolves.
5. Generated rows: `type="button"`, no `id` attribute, `data-rv-id` still set.

`projects/menu/tests/menu-panel-css.spec.ts` (source assertions, same style as
the existing file)

6. No `:hover` background rule for `[rvmenuitem]`.
7. `box-sizing: border-box`, `min-width` fallback `10rem`, `max-width`
   fallback `22rem`, viewport cap present.
8. `transform-origin` rules exist for all four placements in both directions
   and for `data-flipped="true"`.

`e2e/menu/usage.spec.ts` (new, Chromium + Firefox + WebKit headed)

9. Form guard: clicking a generated row inside a `<form>` does not submit.
10. Single highlight: hover row 2, press ArrowDown, exactly one painted row.
11. Long label: panel ≤ 352px at 1280 and the row wraps (height > 40px, no
    horizontal overflow anywhere).
12. Pointer open: no row carries `data-active`; keyboard open does.
13. `aria-controls` resolves while open and is absent when closed.

## 6. Acceptance

- All existing gates: `ng build menu` and `ng build menu-e2e` exit 0; unit
  suites green at **49 tests** (was 41 — one extra case was added for the
  data-driven pointer-open path).
- **Correction to the original line "the 49 existing menu e2e cases stay
  green": that was false.** Those cases encoded the OLD pointer-open contract
  (a click left the first row focused), which this spec deliberately reverses.
  They were updated to the new contract through `e2e/menu/support.ts`'s
  `openMenu()` helper. Final counts: **57 menu cases per browser, 57/57 green
  on chromium, firefox and webkit (webkit headed)**. The suite total grew
  because `usage.spec.ts` adds eight cases.
- The new cases fail on the pre-change tree and pass after it — every
  production hunk was mutation-checked: `toggle('first')`, keyboard
  `markOpening`, the ARIA `removeAttribute`, the old `16rem`/no-cap CSS, the
  `:hover` rule, the RTL origin rule, the `data-rtl` binding, the Tab case,
  the generated-row `type`, and `reseatTriggerFocus()` each turn at least one
  case red. The `focusActive` null guard is enforced by the compiler
  (`CSS.escape(string | null)` → TS2345), measured by removing it.
- WebKit runs headed (headless WPE cannot load `libavif.so.16` on this box).
- Screenshots before/after for M-3, M-4/M-6 and M-5 were captured to
  `/tmp/menu-036/` while the corresponding production hunk was reverted:
  `before-/after-pointer-open`, `before-double-highlight` /
  `after-single-highlight`, `before-/after-long-label`, `after-rtl`. They are
  workspace evidence, not committed assets.
- Out of scope, reported rather than fixed: `e2e/select/select.spec.ts`
  "opens, filters, picks, and closes" fails on the untouched `/select` demo
  route (15 passed, 1 failed). No select file appears in this branch's diff.
- Verified again on 2026-10-30 after the final `isRtl()` binding change:
  `npx ng test menu --watch=false` → 49/49; `npx ng build menu` and
  `npx ng build menu-e2e` exit 0; `npx playwright test e2e/menu
  --project=chromium|firefox` → 57/57 each, and
  `--project=webkit --headed` → 57/57.

## 7. Out of scope (unchanged, still documented as not provided)

- Submenus, menubars, option groups, virtualization, persistent multi-select.
- A library trigger skin (`rv-menu-trigger` stays layout-only: inline-flex).
- Shadow/elevation retune, hover/active token values, close animation.
- Any change to `@rivinia/menu` headless (`RiviniaMenu`) semantics.

## 8. Contradictions found while auditing

- `menu-panel.css` says "A MENU sizes to its CONTENT; only a SELECT matches its
  trigger width" while the rule 30 lines above forces `min-width: 16rem`
  (M-4). The new cap/floor keeps the comment true.
- `--rv-menu-width` is documented in the README's token table as
  "panel min-width" but the prose above it calls it the width to theme; the
  new `--rv-menu-max-width` makes the pair explicit.
- The README's "Interaction and limitations" never mentions that a pointer open
  moves focus into the panel — after this change it does not, and the
  documented keyboard path is the only one that does.
- Icon CSS ships with no documentation and the harness icon is invisible, so
  nothing in the repo proved the feature ever worked (M-11).
- **M-7's "remove `[id]` from the generated rows" is impossible as written.**
  `RiviniaMenuItem.id` is `input.required<string>()`, and `[id]` on the row is
  the only binding that feeds it (Angular prefers a matching directive input
  over the DOM property). Removing it breaks compilation; the `id` attribute
  simply never lands on the element, which is what the test now asserts.
  M-7 is reclassified as documentation.
- **Tab-from-the-trigger close was missing from the spec but is required.**
  With the pointer contract, focus stays on the trigger, so the panel's own
  Tab handler never runs. `onTriggerKey` now closes on Tab without
  `preventDefault`; without it the menu stayed open (measured).
- The demo icon this spec references lives in `projects/menu-e2e/src/app/pages/basic.ts`,
  not `api.ts`; `api.ts` supplies the composable-markup icon.
- Not anticipated: **WebKit drops backward focus navigation after a popover
  closes while focus sits on the trigger**. `doClose()` re-seats focus
  (`blur()` + `focus()`) only when the trigger is the active element; see D80.
