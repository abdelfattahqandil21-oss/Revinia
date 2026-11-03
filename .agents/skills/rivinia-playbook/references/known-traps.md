# Known traps — symptom → the entry that paid for it

This repo has already spent cycles on these. Match the symptom first; the
answer is usually a recorded decision, not a fresh investigation.

## Layout, top layer, RTL

| Symptom | Cause | Entry |
| --- | --- | --- |
| A panel is pinned to the viewport edge, **RTL only**; LTR looks fine | `inset: auto` declared before the placement rules at the same specificity, so `inset-inline-end` leaked into the fixed box | D40, D41 |
| Every popup on the page anchors to the **last** trigger | duplicate `anchor-name`, no `anchor-scope` | D40 — `anchor-scope: all` on the host |
| A panel is ~1000px wide in the browser although the trigger is 290px | `position-area` auto width, `max-content` is cyclic because the grid is `inline-size: 100%` | D51 — explicit token width + `max-inline-size` |
| A select is wider than its grid cell and overlaps its neighbour | `min-width` beats `max-width`; a plain `max-width` cannot cap it | D47 — `min-width: min(var(--…), 100%)` |
| A `<label>` around a picker **reopens** the panel after every pick | the label forwards a synthetic click to its control | D51 — the panel cancels the default action of its own clicks |
| Two components, one selector → `NG0912`, the loser's CSS never injected | a vendored copy reusing another package's selector | D40 — rename the selector, not just the class |
| A global `--rv-*` token does nothing on the modal/toast | token defaults declared **on the component element** shadow any ancestor | D46 — read-site `var(--pkg-x, var(--semantic, default))` |
| The exit animation never completes; removal waits for the 500ms fallback | Angular scopes CSS animation names (`_ngcontent-…_rv-…-exit`) | D56 — compare with `endsWith`, not equality |
| A toast is invisible above a modal | top layer stacks in the order elements are **shown** | D49 — re-show the popover when its contents change |
| A panel overflows the bottom of a short viewport | CSS cannot express "neither side fits" | D58 — measured `translate` clamp + `ResizeObserver` |

## Forms, components, data

| Symptom | Cause | Entry |
| --- | --- | --- |
| `ngModel` validators never run on a picker (errors `null`, `_rawValidators` populated) | Angular 22 `setupCustomControl()` never calls `setUpValidators()` | D54 — documented; validate in submit or use a reactive control. Do **not** add a CVA |
| A control writes the value and the picker echoes it back | model input writes bypass the output | D51 — verified in core; if it echoes, the output is not the model's |
| A global token works on select/menu but not modal/toast | see the token row above | D46 |
| Selecting an option then reopening starts at the first row | `activateFirst()` ignored the selection | D45 — activate the selected option on open (single mode) |

## Tests and tooling

| Symptom | Cause | Entry |
| --- | --- | --- |
| A spec exists but never runs | the test glob starts at `sourceRoot`; specs live in `tests/` | D43, D50 — `include: ../tests/**/*.spec.ts` |
| `ng test` resolves an old build of `@rivinia/<pkg>` | the workspace resolves the package from `dist/` | D60 — `ng build <pkg>` first |
| The consumer still runs the previous tarball after replacing it | Vite prebundles deps; `.angular/cache/**/vite/deps` is stale | D60 — clear the cache or use a real `pnpm add` |
| A Playwright run asserts a stale bundle | `reuseExistingServer` kept the old server | D37 — kill it |
| A "failure" that is actually a wrong expectation | opening focuses the first enabled item; tests assumed an extra ArrowDown | D37 — check the contract before the code |
| A plain field mutation does not render in a zoneless test | the test host does not see non-signal writes | D51 — use a signal |
| Files that were moved come back after a merge | `git checkout <commit> -- <path>` adds, never removes | D50 — `git mv`, or `git rm` the old path |

## Packaging and release

| Symptom | Cause | Entry |
| --- | --- | --- |
| `dependencies.tslib` appears in the tarball although nothing uses it | ng-packagr injects it unconditionally | D20 — expected; an actual `tslib` **import** in the FESM is the blocker |
| A rename still appears in the bundle | a string survived the rename | D40/D41 — grep the FESM for the old vocabulary before packing |
| A local source is behind the published API | the published branch and the working branch diverged | D49 — diff the exported symbols before a release |
| The first publish of a new name shows `0.0.0-stage` | npm staged publishing | D22 — budget for manual approval |
| A publish returns `404 PUT` | the npm org/scope does not exist or the token lacks it | D13 — check the scope before retrying |
| An `ng add` schematic silently does nothing | the package is ESM (`"type": "module"`) and the schematic shipped as `.js` | D9 — compile to `.cjs` |

## Configuration defaults that surprise

| Symptom | Cause | Entry |
| --- | --- | --- |
| `unwrap` does nothing by default | the shipped default is **`false`** (D07's text was wrong) | D28 |
| i18n 404s at `assets/i18n/ar.json` | modern templates serve `public/` at the site root | D27 — the default is `i18n/{lang}.json` |
| A hidden skill never appears in the list | `opencode/autoinvoke: false` | this playbook — load it by exact ID |
