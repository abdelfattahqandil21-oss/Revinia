# Changelog

Per-package behavior changes. Pre-1.0: minor = breaking/feature, patch = fix.
A change is listed the moment it lands on `main`, not when npm is published.

## Prepared releases (unpublished)

### @rivinia/env 0.3.4 · @rivinia/http 0.5.4 · @rivinia/i18n 0.3.4 · @rivinia/modal 0.6.2 · @rivinia/toast 0.5.2 · @rivinia/menu 0.3.6 · @rivinia/select 0.6.1

- **The packages are organised into layers.** Every package used to keep its
  types, its controller, its helpers, its provider and its pipe in one flat
  `src/lib/`. Each package now follows the same layout:

  ```
  src/lib/models/       the types and the contracts — no behaviour
  src/lib/services/     the classes that DO something
  src/lib/utils/        pure functions and pure math
  src/lib/providers/    provide*() and inject*()
  src/lib/pipes/        the pipes
  ui/src/lib/components/<name>/   the .ts, the .html and the .css together
  tests/                the specs, outside the source the package ships
  ```

  The public API is unchanged — the same symbols are exported, from the same
  entry points, and the `exports` map never exposed an internal path.
- **The specs live in `tests/`.** `src/` now holds only what the package
  ships. The test target reaches the specs through `include`, so a suite can
  no longer be excluded by a glob that no longer matches.
- **The UI templates and styles are files.** `@rivinia/modal` and
  `@rivinia/toast` carried their template and their CSS inline; they now use
  `templateUrl` / `styleUrl`, as `@rivinia/select` and `@rivinia/menu` already
  did. The content moved verbatim.
- **The dead references are gone.** The workspace root pointed at two
  `proof-*` projects that no longer exist, which broke the build of every
  package that loaded the root tsconfig.
- `@rivinia/select` now declares `"@angular/common": "^22.0.0"` in its
  `peerDependencies`. The select's UI imports `NgComponentOutlet` /
  `NgTemplateOutlet` from `@angular/common` at runtime, and the FESM grep
  confirms the import — it was undeclared.

### @rivinia/env 0.3.3 (published 2026-10-20)

- **Packaging fix:** the `ng add` schematic requires `@angular-devkit/schematics`
  at runtime, but the package did not declare it — an undeclared runtime
  dependency. Declared `"@angular-devkit/schematics": "^22.0.0"` in
  `peerDependencies`. No API change.

### @rivinia/http 0.5.3 (published 2026-10-20)

- **Packaging fix:** the `ng add` schematic requires `@angular-devkit/schematics`
  at runtime, but the package did not declare it — an undeclared runtime
  dependency. Declared `"@angular-devkit/schematics": "^22.0.0"` in
  `peerDependencies`. No API change.

- **Fixed:** `ng add` could break the application's build. The import check
  matched one exact line, so an app that already imported the provider beside
  other symbols (`import { other, provideRiviniaHttp } from
  '@rivinia/http';`) was given a SECOND import of the same symbol, and the
  build failed with `TS2300: Duplicate identifier`. The check now reads the
  file's import statements instead of matching one line.

### @rivinia/i18n 0.3.3 (published 2026-10-20)

- **Packaging fix:** the `ng add` schematic requires `@angular-devkit/schematics`
  at runtime, but the package did not declare it — an undeclared runtime
  dependency. Declared `"@angular-devkit/schematics": "^22.0.0"` in
  `peerDependencies`. No API change.

- **Fixed:** `ng add` could break the application's build. The import check
  matched one exact line, so an app that already imported the provider beside
  other symbols (`import { other, provideRiviniaI18n } from
  '@rivinia/i18n';`) was given a SECOND import of the same symbol, and the
  build failed with `TS2300: Duplicate identifier`. The check now reads the
  file's import statements instead of matching one line.

### @rivinia/modal 0.6.1 (published 2026-10-20)

- **Packaging fix:** the `ng add` schematic requires `@angular-devkit/schematics`
  at runtime, but the package did not declare it — an undeclared runtime
  dependency. Declared `"@angular-devkit/schematics": "^22.0.0"` in
  `peerDependencies`. No API change.

- **Fixed:** `ng add` could break the application's build. The import check
  matched one exact line, so an app that already imported the provider beside
  other symbols (`import { other, provideRiviniaModal } from
  '@rivinia/modal';`) was given a SECOND import of the same symbol, and the
  build failed with `TS2300: Duplicate identifier`. The check now reads the
  file's import statements instead of matching one line.

### @rivinia/toast 0.5.1 (published 2026-10-20)

- **Packaging fix:** the `ng add` schematic requires `@angular-devkit/schematics`
  at runtime, but the package did not declare it — an undeclared runtime
  dependency. Declared `"@angular-devkit/schematics": "^22.0.0"` in
  `peerDependencies`. No API change.

- **Fixed:** `ng add` could break the application's build. The import check
  matched one exact line, so an app that already imported the provider beside
  other symbols (`import { other, provideRiviniaToast } from
  '@rivinia/toast';`) was given a SECOND import of the same symbol, and the
  build failed with `TS2300: Duplicate identifier`. The check now reads the
  file's import statements instead of matching one line.

### @rivinia/select 0.6.0 (BREAKING)

The select's private panel is renamed out of the `menu` namespace, and the
right-to-left placement is fixed.

**Why the rename:** the select shipped a private copy of the menu component
using the SAME selector (`rv-menu`) as `@rivinia/menu`. An app depending on
both packages hit

```
NG0912: Component ID generation collision detected. Components
'RiviniaMenuComponent' and 'RiviniaMenuComponent' with selector 'rv-menu'
generated the same component ID.
```

Angular registers one definition per colliding id, so the loser's `styles`
were never injected — the select's panel was silently rendered with the other
package's CSS.

**DOM / CSS changes** (only if you targeted the markup):

- `rv-select-menu` → `rv-select-popup`
- `.rv-select-menu-panel` → `.rv-select-popup-panel`
- `.rv-select-menu-trigger` → `.rv-select-popup-trigger`
- `[rvselectmenuitem]` → `[rvselectpopupitem]`
- `rvSelectMenuItem` / `rvSelectMenuTrigger` / `rvSelectMenuPanel` →
  `rvSelectPopupItem` / `rvSelectPopupTrigger` / `rvSelectPopupPanel`
- `--rv-select-menu-*` → `--rv-select-popup-*`

The `--rv-select-*` tokens are unchanged, and they are still bridged onto the
panel, so setting them on an ancestor of `rv-select` keeps working.

**One input renamed:** `[menuLabel]` → `[popupLabel]`.

Fixed:

- **The panel flew across the viewport in a right-to-left layout.** A
  specificity tie let the placement insets override the top-layer reset, so
  the panel pinned itself to the viewport edge instead of its trigger's
  (measured: trigger at `x=11..232`, panel at `x=708..929` in a 929px
  viewport). The top-layer rule now comes after the placement rules.
- **Reopening a single-mode select started at the first option** instead of
  the one already chosen, so arrowing to a long list meant walking past
  everything again. It now reopens on the current selection.
- **A select could overflow its row.** A `min-width` beats `max-width` in
  CSS, so a large `--rv-select-width` overflowed the cell and landed on the
  next select. The width is now capped by the container.

Added:

- `provideRiviniaSelect(mode)` / `injectRiviniaSelect()`, so the controller
  is in the injector and a test can replace it.
- `optionTemplate` — custom markup for an option row (icons, avatars, badges).
- `listTemplate` — replaces the whole list, for a virtualised one.
- `loading` / `loadingLabel` — a loader row under the list.
- `reachEnd` — emitted when the panel scrolls close to its end.
- A footer slot, `[rv-select-popup-footer]`, for a "Load more" button.
- `--rv-select-popup-animation` — the whole entrance as ONE token, so it
  never fights the cascade.
- Registered options are frozen, so the filtered list and the selection
  cannot disagree.

### @rivinia/menu 0.3.5

**Nothing to do.** No API, token or class name changed.

Fixed: the same right-to-left placement defect the select had — a panel in an
RTL layout drifted to the viewport edge instead of staying with its trigger.
The panel is now placed with CSS anchor positioning, so it follows its
trigger in both directions and takes the trigger's width.

### @rivinia/modal 0.6.0 (BREAKING)

**No forced colour scheme.** The dialog forced a dark palette under
`prefers-color-scheme: dark` and the toast forced a light one. Both
overrode an explicit consumer choice and contradicted the "no forced dark
mode" contract the other packages document. A dialog now follows the
consumer's scheme.

Added:

- `size` per dialog, so one host can show a small confirm over a wide form.
  The presets are `clamp()`, so they scale with the viewport.
- `coversOthers` — a dialog that hides the ones below it, for a flow where
  the detail view replaces the list view.
- `loadingOf` — a loader while a dialog's data is in flight.
- `data-caller` — the name of the component that opened the dialog, so the
  DevTools inspector points at its source.
- The dialog transitions its own box, and the stack change is wrapped in a
  view transition, so a dialog opening over another is a movement rather
  than a flicker.

### @rivinia/toast 0.5.0 (BREAKING)

**The list is in the browser's top layer.** It is a manual popover, so it is
no longer clipped by an `overflow: hidden` ancestor and it floats above a
modal dialog. Measured: the element at the toast's position is the toast, not
the dialog.

**The list must be MANAGED.** `<rv-toast-list>` without a `[manager]` renders
an empty list — no toast ever appears. Pass the manager:

```html
<rv-toast-list [manager]="toast" position="bottom-end" />
```

### @rivinia/theme 0.1.0 (new)

The shared design-token layer. One import, one place to set the whole
component ecosystem's colours:

```css
@import '@rivinia/theme';

:root {
  --rv-bg: #ffffff;
  --rv-fg: #111111;
}
```

Every component reads its own token first, then the semantic layer, then its
built-in default — so a consumer can theme one component, or all of them,
from one place. Adapters are included for Tailwind v4 and Bootstrap 5.3, and
an SCSS entry for `@use`.

### @rivinia/http 0.5.2

- Expanded the consumer guide with separate service, component, and template
  examples covering every request method.

### @rivinia/toast 0.4.2

- Clarified the standalone UI and headless examples with separate TypeScript
  and HTML files.

### @rivinia/modal 0.5.3

- Documented both decorator and signal view queries, component content through
  the modal host's `NgComponentOutlet`, scoped modal context injection, and
  rendering toast UI inside a native dialog.

### @rivinia/i18n 0.3.2

- Split the standalone component example into separate TypeScript and HTML
  files.

### @rivinia/env 0.3.2

- Added real `dev`, `stag`, and `prod` build configurations while retaining
  legacy configuration names; avoid sharing nested configuration state between
  generated aliases.
- Corrected the guide to match `ng build --configuration dev|stag|prod`.

### @rivinia/menu 0.3.4

- Replaced the unsupported NgModule example with standalone TypeScript and HTML
  examples and clarified menu template inputs and event-handler naming.

### @rivinia/select 0.4.2

- Expanded the standalone forms and UI examples with separate TypeScript and
  HTML files.

## select 0.4.0 (forms integration, unpublished)

### @rivinia/select

- **New — `FormValueControl<SelectChange>` integration.** `rv-select` now
  implements Angular 22's stable `FormValueControl` interface, so it works with
  Signal Forms (`[formField]`), Reactive Forms (`formControlName`) and
  Template-driven Forms (`ngModel`) — no `ControlValueAccessor`, no
  `NG_VALUE_ACCESSOR` provider, no manual callbacks.
- **New — `value` model signal** (the form-bound value), `disabled` input,
  `touched`/`touch` outputs, `errors`/`invalid` inputs (reflected as
  `aria-invalid` on the trigger).
- **Backward compatible:** `selectionChange` output is preserved for user-driven
  picks and `clear()`. External form writes do NOT emit `selectionChange`.
- **No feedback loops:** the sync effect only writes to the controller when the
  form value actually differs; user picks update both controller and `value`
  signal without re-triggering the effect.
- **New peer dependency:** `@angular/forms: ^22.0.0` (Signal Forms stable
  since 22.0). Does not narrow the existing `@angular/core` range.
- **Tests:** 15 new integration tests covering Reactive Forms, Template-driven
  Forms, Signal Forms, multi-select, disabled sync, clear, and backward
  compatibility. 43/45 total passing.

## select 0.3.1 (hint field + typeahead unification, unpublished)

### @rivinia/select

- **New — `hint?: string` on `RiviniaSelectOption`.** Rendered right-aligned in
  muted monospace (e.g. a keyboard shortcut). Typeahead matches on `label`
  only, never on the hint.
- **Typeahead unification:** Select already matched on `label`; Menu now matches
  on `label` (with `textContent` fallback) via the new `label` input on
  `rvMenuItem`. Both libraries now use the same rule: typeahead matches the
  accessible label, not hint/icon text.
- **Documented:** input naming difference (`select` vs `menu` controller inputs)
  is intentional, not a rename.

## select 0.3.0 (independence from @rivinia/menu, unpublished)

### Breaking / behaviour changes

- **`@rivinia/select` no longer depends on `@rivinia/menu`.** The UI entry
  point previously imported `RiviniaMenu`, `RiviniaMenuComponent` and
  `RiviniaMenuItem` from `@rivinia/menu`. These are now vendored into Select's
  own package (same source, compiled into Select's FESM). Consumers no longer
  need to install `@rivinia/menu` to use `rv-select`. The headless
  `RiviniaSelect` controller never depended on Menu.
- **`@rivinia/menu` removed from `peerDependencies`.** Only `@angular/core`
  remains.
- **Version bump to 0.3.0** (breaking architecture change).

### Added

- Vendored menu primitives: `RiviniaMenu` controller, `RiviniaMenuItem`
  directive, `RiviniaMenuComponent`, `computeMenuPosition`, and the placement
  types — all compiled into `@rivinia/select/ui`'s own FESM. No runtime
  import of `@rivinia/menu` remains (verified by FESM grep).

### Verified

- Build succeeds **without** `@rivinia/menu` installed or built.
- FESM imports: only `@angular/core` (core) and `@angular/core` + `@rivinia/select`
  (ui). Zero `@rivinia/menu` references.
- Unit tests: 28/28 passing. Menu regression: 32/32 passing.
- Consumer install + strict TS compile without `@rivinia/menu`: exit 0.
- Playwright: 6/6 select specs in Chromium and Firefox.

### Known limitations (unchanged)

WebKit, Tailwind, real screen readers, forced-colors remain unverified.
CVA and combobox deferred.

## select 0.3.0 (independence from @rivinia/menu, unpublished)

### Breaking / behaviour changes

- **`@rivinia/select` no longer depends on `@rivinia/menu`.** The UI entry
  point previously imported `RiviniaMenu`, `RiviniaMenuComponent` and
  `RiviniaMenuItem` from `@rivinia/menu`. These are now vendored into Select's
  own package (same source, compiled into Select's FESM). Consumers no longer
  need to install `@rivinia/menu` to use `rv-select`. The headless
  `RiviniaSelect` controller never depended on Menu.
- **`@rivinia/menu` removed from `peerDependencies`.** Only `@angular/core`
  remains.

### Added

- Vendored menu primitives: `RiviniaMenu` controller, `RiviniaMenuItem`
  directive, `RiviniaMenuComponent`, `computeMenuPosition`, and the placement
  types — all compiled into `@rivinia/select/ui`'s own FESM. No runtime
  import of `@rivinia/menu` remains (verified by FESM grep).

### Verified

- Build succeeds **without** `@rivinia/menu` installed or built.
- FESM imports: only `@angular/core` (core) and `@angular/core` + `@rivinia/select`
  (ui). Zero `@rivinia/menu` references in FESM and `.d.ts`.
- Unit tests: 28/28 passing. Menu regression: 32/32 passing.
- Consumer install + strict TS compile without `@rivinia/menu`: exit 0.
- Playwright: 6/6 select specs in Chromium and Firefox.

### Known limitations (unchanged)

WebKit, Tailwind, real screen readers, forced-colors remain unverified.
CVA and combobox deferred.

## select 0.2.0 (independent audit & hardening, unpublished)

### Breaking / behaviour changes

- **Theming tokens renamed and isolated.** Select no longer reads
  `--rv-menu-*`. It now consumes its own `--rv-select-*` namespace
  (`--rv-select-bg`, `-fg`, `-border`, `-muted`, `-radius`, `-shadow`,
  `-width`). Existing selectors that themed Select through `--rv-menu-*`
  must move to `--rv-select-*` — see README -> Migration.
- **Forced dark mode removed.** The `@media (prefers-color-scheme: dark)`
  block that overrode consumer values on the trigger is gone. Tokens are now
  `var(--rv-select-*, fallback)` values, so an ancestor theme always wins.
- **Select no longer changes Menu appearance.** Tokens are bridged onto the
  panel element only, scoped under `.rv-select-panel`, so a `--rv-select-*`
  value never reaches a neighbouring `rv-menu` and vice versa.

### Added

- **Accessible-name inputs on `rv-select`:** `label` (visible caption + the
  trigger's `aria-labelledby`), `ariaLabel` (explicit fallback name),
  `menuLabel` (the opened panel's `aria-label`, falling back to the caption),
  `searchLabel` (filter box name, default 'Search options').
- **`clear()` on `rv-select`** — clears the selection and emits
  `selectionChange` with the same payload shape as a pick (`null` single,
  `[]` multi).
- **Honest semantics.** Comments and docs no longer claim a "combobox
  pattern": the component is a filterable menu (`role="menu"` with
  `menuitem` options) because focus physically moves into the option list.
  See README -> Accessibility.

### Fixed

- `toggle()` on a single-mode controller is now a documented no-op that
  returns `false` instead of writing to `values` while `isSelected` reads
  `value` (the two signals could disagree).
- `clear()` at the headless level is documented as silent; the component
  layer is what announces it.
- `--rv-select-width` is the only token Select owned before; it is now
  joined by bg/fg/border/muted/radius/shadow.

### Tests

- 13 (existing) + 15 (new) = **28 passing** unit tests in Chromium/jsdom:
  keyboard (ArrowDown/Up skip disabled, Enter, Escape, Tab into the list,
  typing isolation), accessible names, `clear()`, single-mode `toggle()`
  rejection.
- Playwright: new `e2e/select/select.spec.ts` covering single, multi, search,
  outside click, theme isolation (measured CSS values) and accessible names.
- Menu regression: 32/32 still green.

### Verified

Unit 28/28, menu 32/32, builds 2 entry points, `check:docs` 0 failures,
Prettier clean. NOT published. WebKit, Tailwind, real screen readers and
forced-colors remain unverified.

## select 0.1.1 (install-blocker patch, unpublished)

Packaging only — no source, API, styling or behavior change.

### @rivinia/select

- **Fix — `npm install` failed against any Menu newer than 0.1.x.** The peer
  range was `@rivinia/menu: ^0.1.0`, and in `0.x` semver `^0.1.0` means
  `>=0.1.0 <0.2.0`. With `@rivinia/menu@0.3.1` published, a plain
  `npm install @rivinia/select @rivinia/menu` terminated with `ERESOLVE`:
  `Could not resolve dependency: peer @rivinia/menu@"^0.1.0" from
@rivinia/select@0.1.0`. The range is now
  `"^0.1.0 || ^0.2.0 || ^0.3.0"`.
- **The range is widened, not loosened.** Every Menu version it accepts was
  type-checked against the published Select 0.1.0 types: `0.1.0` and `0.3.1`
  both compile clean. `^0.4.0` is deliberately excluded — no Menu 0.4.x exists
  or has been tested. This is **not** a breaking change for consumers: it only
  accepts versions that already worked.

### Verified

`npm pack` inspected (8 files, no specs). Clean consumer installs without
`--legacy-peer-deps` for Select 0.1.1 + Menu 0.1.0, Select 0.1.1 + Menu 0.3.1,
and the documented `npm install @rivinia/select @rivinia/menu`. `tsc --noEmit
--strict` against the packed artifact + registry Menu. NOT published.

## env 0.3.0 (breaking: short environment names, unpublished)

### @rivinia/env

- **Breaking — environment names shortened.** `development`/`staging`/`production`
  are no longer accepted; use `dev`/`stage`/`prod` (aliases `stag`/`stage` still
  work). Migration: replace `--environments=development,staging,production` with
  `--environments=dev,stage,prod`. The Angular CLI configuration names
  (`development`, `staging`, `production`) are unchanged — only the schematic's
  option values changed.
- **Files unchanged:** `environment.staging.ts` / `environment.prod.ts` filenames
  are kept for compatibility with existing projects.
- **Tests:** updated to use short names; all pass.

## env 0.3.0 (breaking: short environment names, unpublished)

### @rivinia/env

- **Breaking — environment names shortened.** `development`/`staging`/`production`
  are no longer accepted as schematic option values; use `dev`/`stage`/`prod`
  (aliases `stag`/`stage` still work). Migration: replace
  `--environments=development,staging,production` with `--environments=dev,stage,prod`.
  The Angular CLI configuration names (`development`, `staging`, `production`)
  are unchanged — only the schematic's option values changed.
- **Files unchanged:** `environment.staging.ts` / `environment.prod.ts` filenames
  are kept for compatibility with existing projects.
- **Tests:** 14 passing (updated to use short names).

## menu 0.3.2 (typeahead label support, unpublished)

### @rivinia/menu

- **New — `label` input on `rvMenuItem`.** When set, typeahead matches on this
  instead of the row's `textContent`. Defaults to `null` → falls back to
  `textContent`. Fixes the inconsistency where typeahead matched hints/icons
  text. Additive, non-breaking.
- **Typeahead** now reads `data-rv-label` (set from the `label` input) with
  `textContent` fallback.

## menu 0.3.1 (published as a single release; 0.2.0/0.3.0 were never on npm)

Only `0.1.0` was ever published. Everything below ships together as `0.3.1`.

### Breaking / behaviour changes

- **`label` → `menuLabel` on `rv-menu`.** The input names the _menu_ (it maps to
  the panel's `aria-label`), while `RiviniaMenuItemData.label` names a _row_;
  the old name was an ambiguity trap. Migrate: `label="…"` / `[label]="…"` →
  `menuLabel="…"` / `[menuLabel]="…"`.
- **Forced dark mode removed.** The library shipped `prefers-color-scheme: dark`
  defaults, which also over-rode consumer tokens in dark mode. Design tokens are
  now `var(--token, fallback)` values, so your theme always wins. Opt in yourself
  (README → Styling).
- **Tab / Shift+Tab step focus explicitly.** Focus now moves to the tab stop
  before/after the _trigger_. Previously the browser re-entered the still-mounted
  panel and focus was then lost to `<body>` (reproduced on Chromium and Firefox).

### Added

- **Declarative `[items]`.** `<rv-menu [items]="rows" (picked)="…">` renders,
  registers and manages the rows itself — no controller, no `register()`, no item
  markup. Rows use the **same** `rvMenuItem` directive as the composable path, so
  keyboard, focus and click handling are not implemented twice. Combining
  `[items]` with projected `rvMenuItem` throws by design.
- **`panelClass` / `itemClass`** to style the generated panel and rows.
- **camelCase projection attributes** (`rvMenuTrigger`, `rvMenuPanel`) alongside
  the dashed ones.
- **`RiviniaMenuItemData`** (from both entry points) and **`MenuPick`**
  (from `@rivinia/menu/ui`) types.

### Fixed

- **Items registering after the panel opened could not be activated.** With
  `[items]` rows render only once `open()` is true, so `openMenu()` ran against an
  empty registry: no highlight and ArrowDown could not move (`activeId` stayed
  `null`). The first enabled row registered after an open now claims the initial
  activation.
- **`[disabled]` changes at runtime never reached the registry** (registration
  ran once in `ngOnInit`); renames are now de-registered.
- **A static `disabled` attribute on a native `<button rvMenuItem>`** landed on
  the DOM property instead of the directive input, so the row reported
  `aria-disabled="false"`.
- **Consumer CSS variables set on an ancestor were ignored** because the panel
  declared the defaults on itself. Tokens are now fallbacks (README →
  ViewEncapsulation).

### Verified

32 unit tests, 49 Playwright scenarios on Chromium and 49 on Firefox (all green),
`npm pack` inspected (6 files, no specs), and the packed `0.3.1` tarball
installed into a clean consumer app where both README examples compile verbatim
and were exercised in a real browser. **Tailwind, WebKit and real screen-reader
testing remain unverified.** NOT published.

## menu 0.2.0 (accessibility audit, unpublished)

### @rivinia/menu

- **P0 — disabled items could be activated with Enter.** An item that became
  disabled _after_ receiving focus stayed `activeId`, and `pickFocused()`
  trusted it. Enter then emitted `picked` for a disabled row (measured: an
  all-disabled menu emitted `picked=one`). `pickFocused()` now re-validates
  against the live registry. Regression test verified by negative control.
- **P0 — opening could strand focus on `<body>`.** The deferred-focus flag was
  cleared before confirming the panel existed, so a pass that raced panel
  insertion silently dropped focus forever. The flag now survives until the
  panel is present, and measurement state is reset on every open so a second
  render pass is guaranteed.
- **P0 — outside pointer-down stole focus.** Closing on an outside click pulled
  focus back to the trigger, fighting the browser and hijacking focus from what
  the user actually clicked. Outside clicks now close without restoring focus;
  Escape and Tab-close still do.
- **P1 — the typeahead buffer survived a close**, so the next open started
  mid-word. It is now per-open (reset in `doClose`).
- **New:** `label` input (panel `aria-label`), stable per-instance panel `id`
  with `aria-controls` on the trigger, `checked` items (`menuitemcheckbox` +
  `aria-checked`), pure `computeMenuPosition` + rect types exported.
- **Tests:** 23 unit tests, 33 Playwright scenarios (Chromium) against a real
  Angular production fixture, axe-core clean. README rewritten against the
  verified API.

## modal 0.5.1 (packaging fix, published 2026-10-16)

### @rivinia/modal

- **Packaging fix:** `@rivinia/modal/ui` imports `NgComponentOutlet` /
  `NgTemplateOutlet` from `@angular/common` at runtime, but `@angular/common`
  was missing from `peerDependencies` (release-gate failure found by FESM
  grep). Declared `"@angular/common": "^22.0.0"`. No API change.

## menu 0.1.0 / select 0.1.0 (new packages, published 2026-10-16)

### @rivinia/menu

- **New package (0.1.0):** headless per-instance menu controller
  (`open/activeId/items` signals, item registry, keyboard navigation model
  skipping disabled items with wrap) + secondary `@rivinia/menu/ui`
  (`rv-menu`, `rvMenuItem`, placements, roving focus, outside-click,
  focus return). Zero new runtime dependencies.

### @rivinia/select

- **New package (0.1.0):** headless select controller (`options/query/filtered`
  signals, accent-insensitive search, single `value` / multi `values`,
  `syncOptions` for input mirroring) + secondary `@rivinia/select/ui`
  (`rv-select` on top of `rv-menu`: searchable filter box, single-pick-close,
  multi-toggle-stays-open with checks, empty state, chevron). Peer-depends on
  `@rivinia/menu`. Rich per-option custom content stays with raw `rv-menu`.

## 2026-10-16 — toast 0.4.0

### @rivinia/toast

- **T-06 (feature):** new secondary entry `@rivinia/toast/ui` — ready-made
  `RiviniaToastList` (managed `[manager]` + presentational `[toasts]`, six
  logical positions defaulting to `bottom-end`, kind rail vs `richColors`,
  `role="status"`, hover/focus pause, 150 ms exit snapshots). Zero new
  runtime dependencies. Headless entry unchanged and UI-free.

## 2026-10-16 — modal 0.5.0

### @rivinia/modal

- **M-09 (feature):** new secondary entry `@rivinia/modal/ui` — ready-made
  `RiviniaModalDialog` (native `<dialog>`, header/content/footer slots,
  sizes, positions incl. side panels, directional animations, CSS-var
  theming) + `RiviniaModalHost` adapter + ref-counted scroll lock. Zero new
  runtime dependencies. Headless entry unchanged and UI-free.
- **M-10 (feature):** dialog `description` input (`aria-describedby`),
  top-aligned header, focus-to-title rule, responsive bottom-sheet mapping.

## 2026-10-15 — http 0.5.0

### @rivinia/http

- **H-05 (breaking):** global `unwrap`/`unwrapKey` configuration removed from
  `provideRiviniaHttp()`. Unwrapping is strictly per request:
  `{ unwrap: true, unwrapKey }` with a mandatory key (no default).
  A missing key now throws `RiviniaHttpUnwrapError` instead of silently
  passing the body through. Migrate each applicable call (see the README
  migration note); `ng add` no longer asks about unwrapping.
- **H-06 (feature):** `RiviniaHttpUnwrapError` (`key` + `endpoint` + raw
  `body`; body never interpolated into the message) shared by plain methods
  and `getResource` (surfaces as `resource.error()`).
- **H-07 (breaking):** `getBlob`/`getText`/`getResponse`/`postResponse` take
  `RiviniaRawOptions` — unwrap fields are rejected at compile time instead
  of silently ignored.

## 2026-10-15 — toast 0.3.1

### @rivinia/toast

- **T-05 (fix):** generation tracking no longer leaks across show/dismiss
  cycles (`_generations` entry deleted on dismiss, cleared in `dismissAll`).
- Description wording no longer claims a nonexistent "UI outlet".

## 2026-10-15 — modal 0.4.0

### @rivinia/modal

- **M-07 (feature):** additive readonly `closing` (status `closing`) and
  `visible` (active + closing) signals in strategy display order.
  `active`/`queued`/`top` semantics unchanged.
- **M-08 (fix):** public snapshots (`active`, `queued`, `closing`, `visible`,
  `top`, `findByRef`) no longer expose `guards`, `closingTimer`,
  `ownerCleanup`, `generation`, `openedSeq`; state updates consistently
  immutable.

## 2026-10-15 — i18n 0.3.0

### @rivinia/i18n

- **I-08 (breaking):** default loader path `assets/i18n` → `i18n` (files in
  `public/i18n/`, served from the site root; matches the app template's
  `{ "glob": "**/*", "input": "public" }`). Migration: move
  `src/assets/i18n/*.json` → `public/i18n/*.json`, or pin the old layout with
  `jsonLoader({ path: 'assets/i18n' })`. `ng-add` starter, schema descriptions,
  README and JSDoc synced.
- **I-09 (fix):** language cookie gets `Secure` automatically on `https:`
  (never on `localhost`); server never writes cookies (unchanged).
- **Cleanup:** removed dead `_supported` getter and redundant
  `standalone: true` on `RTranslatePipe` (Angular 20+ default).

## 2026-10-13 — env 0.2.0

### @rivinia/env

- **New package (0.2.0):** `BaseEnvironment` contract + `ng-add` scaffolding
  with environment multi-select, short aliases (`dev`/`stag`/`prod`) and
  per-environment output directories. Typed `environment.model/dev/staging/prod`
  files (version snapshotted from the app's `package.json`) and wiring
  `production`/`staging` file replacements (staging copied from production when
  present). Never overwrites, never removes user config; `development`
  untouched by design.

## 2026-10-13 — http 0.4.0, toast 0.3.0, modal 0.3.0, i18n 0.2.0

### @rivinia/http

- **H-03 (feature):** opt-in backend-envelope validation via an `envelope`
  policy (`successKey`/`errorKey`, default `isSuccess`/`error`). A failed
  envelope throws a typed `RiviniaHttpEnvelopeError` (body + code) instead of
  flowing into `next()` as success; in `getResource` it surfaces as
  `resource.error()`. Off by default; per-call policy replaces global.
  `getResponse`/`postResponse` validate too (raw body kept); binary/text
  paths are exempt (non-JSON by construction).
- **H-02 (feature):** `getResource` accepts signals and reactive functions for
  `params`/`headers`/`context` (evaluated per request, like `httpResource`).
  New `ReactiveInput<T>` type. URL was already reactive; the rest was static.
- **H-04 (feature):** `getResponse`/`postResponse` expose raw status + headers
  (pagination counts, 201 `Location`), plus `getText` for raw text. Raw by
  design — compose `unwrapAs`/`assertEnvelope` yourself when needed.
- **H-01 (breaking fix):** `unwrapAs` unwraps exactly one envelope level.
  Nested payloads (`{ data: { data, page } }`) are returned whole; recursive
  unwrapping silently dropped sibling fields. No `recursive` option — file an
  issue if a double-wrapped backend genuinely needs it.

### @rivinia/toast

- **T-04 (fix):** overflow eviction prefers the oldest timed, actionless toast;
  persistent errors with actions are evicted only when nothing else can go.
- **T-03 (fix):** a kind change re-resolves the per-kind default duration
  unless the toast carries an explicit duration (explicit is sticky forever).
- **T-01 (breaking fix):** `pause()`/`resume()` track suspension explicitly.
  Persistent toasts can never pause, so hover-leave no longer dismisses them;
  `resume()` on anything unpaused returns `false`. Toasts expose `paused`.
  Updating a paused toast stores the new remaining without re-arming.

### @rivinia/modal

- **M-06 (fix):** concurrent `requestDismiss` calls share one in-flight guard
  run (identical results) instead of double-prompting.
- **M-05 (fix):** registry entries are deleted on settle — queued-cancelled
  and rejected opens leave no residue.
- **M-04 (breaking fix):** opening with an already-destroyed owner settles
  `owner-destroyed` immediately without adding a ghost instance (previously
  threw NG0205 after adding).
- **M-02 (breaking fix):** global `dismiss` config is actually read. Merge
  order: built-in defaults < global < preset < per-call, field-by-field (an
  absent key never clobbers).
- **M-03 (feature):** `openModal` accepts a raw `TemplateRef`, a component
  `Type`, or a full descriptor (overloads preserve `TData`/`TResult`);
  component `inputs` via options. README quick start compiles again.
- **M-01 (breaking fix):** owner teardown promotes the queue like any other
  removal. Same-owner queued requests still settle `owner-destroyed` (via
  their own owner callback); independently-owned ones activate.

### @rivinia/i18n

- **I-07 (feature):** `injectRiviniaI18n<L>()` preserves the language union and
  `defineRiviniaI18n(config)` binds config + accessors with inference, so
  unconfigured ids fail compilation (`@ts-expect-error` covered).
- **I-06 (feature):** `Language.locale` (BCP-47) drives Intl formatting and ICU
  plurals (`ar-EG` digits, not bare-`ar` Latin); formatters cached by
  locale + options.
- **I-05 (breaking fix):** `setLanguageAsync` aborts on load failure —
  language, direction and dictionary stay untouched.
- **I-04 (fix):** browser detection follows priority order (exact then base
  tag per entry) instead of scanning all exact matches first.
- **I-01 (feature):** `provideRiviniaI18n()` loads the initial language during
  setup (SSR waits via `PendingTasks`). New `preload: false` opt-out, inline
  `translations` seed (network refresh still wins; failures preserve the
  seed), and a `ready` signal. Behavior change: upgrading apps now fetch at
  startup where previously nothing loaded.
- **I-02 (breaking fix):** dictionaries reach visible signals only for the
  currently intended language (replaces the request-token guard, which blocked
  legitimate same-language loads). Explicit preloads of other languages stay
  cached without touching the UI.
- **I-03 (feature):** SSR gaps closed — `<html dir/lang>` via injected
  `DOCUMENT` (server-rendered, no first-paint shift), `'cookie'` storage
  strategy (server reads the request cookie, browser writes it), `TransferState`
  hydration (no double fetch). Server-only paths are code-reviewed, not
  server-executed (no platform-server in this workspace).
