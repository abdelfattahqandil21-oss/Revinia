# `@rivinia/theme` — the five styling stacks, measured

Status: **research** (2026-10-29, branch `pkg/i18n/ui`). No source file was
changed by this work; every number below came from a build or a browser this
session. The point of the file is to answer one question with evidence:
*does the theme package actually work in plain CSS, Sass, Less, Tailwind v4 and
Bootstrap 5.3 — and where does it fail silently?*

Companion reading: `projects/theme/README.md` (what we tell consumers),
`docs/DECISIONS.md` D42 (the token model) and D44 (rem sizing).

---

## 0. Verdict

| Stack | Correct entry point | Angular 22 build | Proof |
| --- | --- | --- | --- |
| Plain CSS | `@import '@rivinia/theme';` | works | 613 B stylesheet, `--rv-bg` present |
| Sass | `@use '@rivinia/theme/scss';` | works | 566 B; also `@use '@rivinia/theme'` (548 B) and `@use 'pkg:@rivinia/theme/scss'` (570 B) |
| Less | `@import (less) '@rivinia/theme/theme.css';` | works | 547 B |
| Tailwind v4 | `@import 'tailwindcss'; @import '@rivinia/theme/tailwind.css';` | works | 5,314 B on the 0.1.0 adapter (plain `@theme`); §8 re-measures after `@theme inline` |
| Bootstrap 5.3 | `@import 'bootstrap/dist/css/bootstrap.css'; @import '@rivinia/theme/bootstrap.css';` | works | light `#fff`, dark `#212529` measured in Chromium + Firefox |

Three of the five have a **silent** failure mode that a build will not catch:

1. Less with the package root (`@import (less) '@rivinia/theme';`) compiles and
   emits **nothing**.
2. A CSS/Sass consumer loses the whole theme if the `"style"` export condition
   is ever dropped from `package.json`: the build still succeeds, the theme is
   absent.
3. Tailwind's plain `@theme` makes every **subtree-scoped** `--rv-*` override a
   no-op (root-level overrides still work).

The rest of this file is the evidence, then the package edits those three
findings imply.

---

## 1. How this was run

Toolchain actually executed (versions printed by the binaries):

| Tool | Version |
| --- | --- |
| Angular CLI / `@angular/build` | 22.2.4 in the workspace; the consumer fixture's own install reports `@angular/core` 22.2.3 and `@angular/build` / `@angular/cli` 22.2.5 |
| Sass (Dart Sass) | 1.97.0 |
| Less | 4.4.2 |
| Tailwind CSS + CLI | 4.1.16 |
| Bootstrap | 5.3.8 |
| Browsers | Playwright 1.64.1 — Chromium and Firefox |

Which binary built each early run was **not recorded**; the fixture versions
above were read from its `node_modules` after the fact (2026-10-29).

Artifact under test: the **built** package, not the source folder —
`ng build theme` → `dist/theme`, `npm pack` → 8 files, 4.5 kB packed,
shasum `9a8ef9c28f15a8b6906a8c0f826fc94f9ff8f647`:

```
README.md  fesm2022/rivinia-theme.mjs (0 B)  package.json
styles/_index.scss  styles/bootstrap.css  styles/tailwind.css
styles/theme.css  types/rivinia-theme.d.ts (9 B, `export {}`)
```

Fixtures (all outside the repo):

- `/tmp/consumer-theme` — a minimal `@angular/build:application` app whose
  global `styles` entry was swapped per case, with `@rivinia/theme` installed
  from the tarball above. Builds were `ng build --configuration development`
  unless stated otherwise; the emitted `styles.css` was then loaded from
  `file://` into Chromium and Firefox and inspected with `getComputedStyle`.
- `/tmp/rv-theme-matrix` — standalone `sass`, `lessc`, `@tailwindcss/cli`
  runs against the same extracted package.

Commands are quoted inline per section so each result can be re-run alone.

---

## 2. Per-stack results

### 2.1 Plain CSS

```css
/* src/entry.css */
@import '@rivinia/theme';
.rv-probe { background: var(--rv-bg); color: var(--rv-fg); }
```

`ng build` → 613 B. Measured: probe background `rgb(255,255,255)`, text
`rgb(17,17,17)`, and `#scoped { --rv-bg: rgb(4,5,6) }` reached its child
(`rgb(4,5,6)`) in both engines.

The bare specifier is resolved by the bundler — Angular's stylesheet
resolution sets `conditions: ['style', 'sass', 'less', …]`
(`node_modules/@angular/build/src/tools/esbuild/stylesheets/bundle-options.js:58`),
so `exports["."].style` is what resolves. A **browser alone cannot** resolve
`@import '@rivinia/theme'`; the README's "one import" shape assumes a bundler.
`@import` must also stay above other rules (CSS spec) — bundlers are lenient,
browsers are not.

**The `style` condition is load-bearing.** Removing it from the installed
package and rebuilding the same entry:

```
{"entry":"src/entry.css","ok":true,"cssBytes":188,"rvBgDefaults":0}
```

The build passes, the stylesheet shrinks to the consumer's own rule, and no
warning is printed. `exports["."].default` points at the (empty)
`fesm2022/rivinia-theme.mjs`, so a resolver that ignores `style` gets nothing.
This is the single most fragile part of the package and it has no test today.

### 2.2 Sass

Inside the package, `_index.scss` is a one-liner (`@use './theme.css';`,
`projects/theme/styles/_index.scss:20`). Its comment claims *"the extension must
be OMITTED for `@use` to treat it as a module"*. Measured with Dart Sass 1.97.0:

| Input | Result |
| --- | --- |
| `@use './theme.css';` (as shipped) | exit 0, 1,840 B, 9 `--rv-*` |
| `@use './theme';` (extension omitted) | exit 0, **identical** 1,840 B |

So both spellings work and the sentence is wrong on the mechanism (Sass docs:
"@use 'variables' will automatically load `variables.scss`, `variables.sass`, or
`variables.css`"). The entry file still earns its place — it gives consumers a
stable short specifier and a place for the Less note — but the reason stated
inside it is not the real one.

Consumer side, standalone `sass` CLI:

| Command | Result |
| --- | --- |
| `sass in.scss` with `@use '@rivinia/theme/scss';` | **fails**, exit 65 |
| `sass in.scss` with `@use '@rivinia/theme/styles/theme.css';` | **fails**, exit 65 |
| `sass --load-path=node_modules` with `@use '@rivinia/theme/styles/theme.css';` | works — but that is an **internal** path |
| `sass --pkg-importer=node` with `@use 'pkg:@rivinia/theme/scss';` | works |
| `sass --pkg-importer=node` with `@use 'pkg:@rivinia/theme';` | works (resolves through the `style` condition) |
| `sass --pkg-importer=node` with bare `@use '@rivinia/theme/scss';` | **fails**, exit 65 |

Dart Sass's `NodePackageImporter` is the documented path for this: it uses the
`sass`, `style` and `default` export conditions and the `pkg:` scheme, from
Dart Sass 1.71.0 (sass-lang.com → JS API → `NodePackageImporter`).

Inside Angular the same lines that fail in the CLI **work**, because Angular
resolves package specifiers itself and compiles the resolved file:

| Angular entry | Result |
| --- | --- |
| `@use '@rivinia/theme/scss';` | works, 566 B |
| `@use '@rivinia/theme';` | works, 548 B |
| `@use 'pkg:@rivinia/theme/scss';` | works, 570 B |
| `@use '@rivinia/theme/theme.css';` | works, 551 B |

Consequence for the README: `@use '@rivinia/theme/scss';` is correct for
Angular/Vite/webpack users, but a Sass-CLI-only user must be told
`pkg:` + `--pkg-importer=node`. Today they are not.

### 2.3 Less

| Input | lessc 4.4.2 | Angular build |
| --- | --- | --- |
| `@import (less) '@rivinia/theme/theme.css';` | works, 1,856 B | works, 547 B |
| `@import (less) '@rivinia/theme';` | **34 B, silent no-op** | **104 B, silent no-op** |
| `@import (less) '@rivinia/theme/scss';` | 54 B, and it inlines the literal text `@use './theme.css';` into the CSS | not run (same resolver) |
| `@import '@rivinia/theme/theme.css';` (no `(less)`) | works | — |

lessc resolves bare package specifiers by walking `node_modules` — no
`--include-path` needed — but it does **not** consult the `exports` map. The
package root therefore resolves to the `module`/`default` entry
(`fesm2022/rivinia-theme.mjs`, 0 bytes) and inlines nothing, without an error.
`/scss` is worse: `_index.scss` is Sass, so Less copies its one line verbatim
and the stylesheet ships an invalid at-rule.

`(less)` is required, not cosmetic: without it Less treats the file as plain CSS
and skips Less-specific processing; with mixed consumer files it is the explicit
signal. CSS custom properties pass through untouched; Less **variables**
(`@color`) remain a separate mechanism and cannot exchange values with them.

### 2.4 Tailwind v4

```css
@import 'tailwindcss';
@import '@rivinia/theme/tailwind.css';
@source './app/app.ts';
```

`npx @tailwindcss/cli` (5,245 B) and `ng build` (5,314 B) both succeed.
Generated output:

```css
@layer theme { :root, :host { --color-rv-bg: var(--rv-bg); … } }
@layer utilities { .bg-rv-bg { background-color: var(--color-rv-bg); } }
@layer rivinia-theme { :root { --rv-bg: #ffffff; … } }   /* the imported theme, last */
```

Utilities are generated (`bg-rv-bg`, `text-rv-accent`), the adapter's
`@theme` blocks survive Tailwind's PostCSS pass, and the theme's own defaults
land in `@layer rivinia-theme` **after** Tailwind's four layers.

`@theme` inside an imported file is legal — Tailwind flattens imports before it
processes at-rules, which is why the adapter can be its own exported file.

**Two measured cascade traps** (Chromium and Firefox agree):

| Setup | `--rv-bg` on a scoped `#scoped` subtree | Probe background |
| --- | --- | --- |
| plain `@theme` (as shipped, `tailwind.css:28`) | `rgb(4,5,6)` on the wrapper, but utility still paints `rgb(255,255,255)` | **override lost** |
| `@theme inline` | `rgb(4,5,6)` / `rgb(7,8,9)` | **override applied** |

Reason: with plain `@theme`, `--color-rv-bg: var(--rv-bg)` is computed where it
is declared (`:root`) and the *resolved* `#ffffff` is what inherits. With
`@theme inline`, the utility itself becomes
`.bg-rv-bg { background-color: var(--rv-bg) }`, so the lookup happens on the
element that uses it. Tailwind's docs describe exactly this
(tailwindcss.com/docs/theme → "referencing other variables").

A root-level override (`html { --rv-bg: … }` or `document.documentElement.style`)
works in both variants — the loss is only for **subtree** scoping (a dark card,
a themed section, `[data-theme]` on a nested element).

Two more, measured:

- `@layer base { :root { --rv-bg: rgb(10,20,30) } }` → **ignored**
  (`--rv-bg` stayed `#ffffff`), while an unlayered `:root { --rv-fg: … }` in the
  same file applied. `rivinia-theme` is declared after `base`, so the default
  beats anything the consumer puts in a Tailwind layer. Tailwind users who
  follow the "put base overrides in `@layer base`" habit lose silently.
- `@theme { --rv-bg: rgb(10,20,30) }` → **ignored**. It is emitted into
  `@layer theme` (line 27 of the bundle) and the default at line 228 wins.

### 2.5 Bootstrap 5.3

```css
@import 'bootstrap/dist/css/bootstrap.css';
@import '@rivinia/theme/bootstrap.css';
```

`ng build` → 280,705 B. Measured in both engines:

| `data-bs-theme` | `--bs-body-bg` | `--rv-bg` | probe background |
| --- | --- | --- | --- |
| none | `#fff` | `#fff` | `rgb(255,255,255)` |
| `light` | `#fff` | `#fff` | `rgb(255,255,255)` |
| `dark` | `#212529` | `#212529` | `rgb(33,37,41)` |

Text followed too (`rgb(33,37,41)` → `rgb(222,226,230)` in dark). The mapping
is one-directional and the layered default loses to it, as designed.

**Order does not matter.** Reversing the two imports (`bootstrap.css` adapter
first) produced identical measurements: light `#fff`, dark `#212529`. Custom
properties resolve at computed-value time, so the adapter can reference
`--bs-*` before Bootstrap declares them. The README's order is convention, not
a requirement — worth keeping for readability, not for correctness.

Bootstrap's own caveat, from its docs: not every component is fully
CSS-variable driven (embedded SVG icons, and derived `$theme-colors` maps that
must be declared in Sass for alerts/list-groups). Rivinia only *reads*
`--bs-*`, so nothing here blocks us; it does mean a consumer's custom Bootstrap
colour needs the Sass maps before `--bs-primary` reflects it.

---

## 3. Why the silent failures happen

### 3.1 The published export map

`dist/theme/package.json` (written by ng-packagr, not by hand):

```json
"exports": {
  ".": { "style": "./styles/theme.css", "types": "./types/rivinia-theme.d.ts",
         "default": "./fesm2022/rivinia-theme.mjs" },
  "./theme.css": "./styles/theme.css",
  "./tailwind.css": "./styles/tailwind.css",
  "./bootstrap.css": "./styles/bootstrap.css",
  "./scss": "./styles/_index.scss"
}
```

Two observations:

- The source `package.json` maps `"."` `default` to `./styles/theme.css`; the
  published one maps it to the empty FESM. Anything that resolves `default`
  instead of `style` (Less, a JS `import '@rivinia/theme'`, a resolver without
  the condition) gets **nothing**.
- ng-packagr also adds `"dependencies": { "tslib": "^2.3.0" }` and
  `"type": "module"` (D20 noise). For a stylesheet-only package both are
  meaningless, and `tslib` makes consumers install a dependency they never use.

### 3.2 Who resolves what

| Consumer | Resolver | Conditions / rules | Effect |
| --- | --- | --- | --- |
| Angular CSS | Angular stylesheet plugin → esbuild | `style`, `sass`, `less`, `production`/`development` | `style` wins for `"."` |
| Angular Sass | Angular → esbuild, then Dart Sass on the file | same conditions; `pkg:` understood | every documented spelling works |
| Angular Less | **lessc itself** on the entry file | Less's own `node_modules` walk, ignores `exports` | only explicit file paths work |
| `sass` CLI | Dart Sass | `pkg:` + `--pkg-importer=node` | needs `pkg:` |
| `lessc` CLI | Less | own resolver | same as Angular Less |
| Tailwind CLI | Tailwind's own `@import` resolver | resolves package paths | works |
| Browser, no bundler | CSS `@import` | URL only | bare specifier impossible |

The Less column is the dangerous one: it is the only stack where the *presence*
of a JS entry point silently satisfies an import that meant to load CSS.

### 3.3 Theme tokens inside component styles (Angular-specific)

Angular compiles component styles separately. Importing the theme from a
component stylesheet:

```scss
/* app.scss */
@use '@rivinia/theme/scss';
.panel { background: var(--rv-bg); }
```

Development bundle:

```css
@layer rivinia-theme {
  [_ngcontent-%COMP%]:root { --rv-bg: #ffffff; … }
}
.panel[_ngcontent-%COMP%] { background: var(--rv-bg); }
```

`[_ngcontent-x]:root` matches no element (`:root` is `<html>`, which never
carries a component's content attribute), and the production optimizer drops
the whole block (the built CSS contains only the consumer's rule). The tokens
never apply — no warning, no error.

Custom properties declared *normally* in a component do survive: Angular's
compiler prefixes them with a namespace placeholder
(`@angular/compiler` → `namespaceCssVariable`, `--%NS%`), and at runtime the
placeholder resolves to nothing. Measured on `#panel`:
`--rv-bg: rgb(2,3,4)` was readable as `--rv-bg`, and both a global rule
(`#panel { --rv-bg }`) and an inline style won over it.

Net rule for the docs: **the theme is a global-stylesheet import.** In a
component, read `var(--rv-*)`; never import the theme there. That is already
what the `/ui` packages do (`ViewEncapsulation.None`, tokens only), and what
`SPEC-0.6-ui.md` assumes for `rv-language-toggle`.

### 3.4 Duplicate imports

`@import '@rivinia/theme';` followed by `@import '@rivinia/theme/tailwind.css';`
(the adapter itself imports `theme.css`) emitted the theme **twice** —
1,019 B instead of 613 B, two `@layer rivinia-theme` blocks. Harmless to the
cascade, wasteful in bytes. The adapter should be imported *instead of* the
base entry, never alongside it; the README does not say this.

---

## 4. Edits this implies (priority order)

Nothing here is implemented yet; these are proposals for the owner.

1. **Tailwind adapter: `@theme` → `@theme inline` for the `--color-rv-*`
   block** (`projects/theme/styles/tailwind.css:28`). Measured to be the
   difference between subtree overrides working and not working, and it is what
   the file's own comment recommends. The reverse block (`:48`) is already
   `inline`.
2. **A packaging test that fails if `exports["."].style` disappears.** Today its
   loss is a silent 188-byte build. Cheap shape: unpack the tarball, assert the
   condition and that the referenced file exists; or a consumer fixture that
   greps the emitted `styles.css` for `--rv-bg`.
3. **README: rewrite the Less row** (`README.md:117`, `:164-172`) to say the
   package **root is a no-op** and `/scss` is invalid, with the one correct
   line only.
4. **README: add a Sass-CLI note** (`README.md:152-162`): bundler users write
   `@use '@rivinia/theme/scss';`; CLI users need
   `@use 'pkg:@rivinia/theme/scss';` plus `--pkg-importer=node`.
5. **README: one paragraph on where overrides may live**
   (`README.md:97-107` today says "on `:root`"): unlayered, not inside
   `@layer base`, not inside `@theme`, and never inside a component stylesheet.
   All three measured.
6. **Fix the `_index.scss` comment** (`:5-8`): the extension may be included or
   omitted; the entry exists for a stable specifier, not because Sass needs the
   omission. Keep the Less note, add "do not import the package root in Less".
7. **Say "import the adapter instead of the base entry"** next to the Tailwind
   and Bootstrap examples, to avoid the duplicate block.
8. Optional, packaging: drop the meaningless `tslib` dependency and the empty
   FESM for this package (ng-packagr behaviour, so it needs a D-entry and a
   build experiment, not a manifest edit).

Two smaller truths worth keeping in the README because they are counter-intuitive:

- Bootstrap import order does not matter (measured identical output).
- `sideEffects` in `package.json` is `["**/*.css", "**/*.scss"]`, while
  `README.md:11` says `["**/*.css"]`. Harmless, but it should match.

---

## 5. Not verified

- **WebKit** — no WebKit build is configured in this workspace. Chromium and
  Firefox only. Cascade layers are Baseline 2022, so the risk is low, but it is
  not evidence.
- **webpack / Vite / Parcel** — not installed here. Whether each honours the
  `style` condition (and therefore `@import '@rivinia/theme'`) is unmeasured;
  do not claim it until a fixture runs.
- **Safari / older Chromium** — same reason.
- **Angular versions before 22** — the `style/sass/less` conditions and the
  custom-property namespacing were read from 22.2.4 sources only.
- **`@import` ordering with a browser-only setup** (no bundler) — stated from
  the CSS spec, not measured here.
- **Bootstrap with a consumer-customised Sass palette** — we only read the
  shipped `--bs-*` defaults.
- **SSR** — this package is CSS only; no server render was involved.

---

## 6. Sources (read 2026-10-29)

- Sass `@use` — "Sass can load plain old `.css` files"; extension optional:
  https://sass-lang.com/documentation/at-rules/use/
- Sass `NodePackageImporter` — `sass` / `style` / `default` conditions, `pkg:`
  scheme, Dart Sass ≥ 1.71.0:
  https://sass-lang.com/documentation/js-api/classes/nodepackageimporter/
- Tailwind v4 theme variables and when to use `inline`:
  https://tailwindcss.com/docs/theme
- Angular + Tailwind (packages and `.postcssrc.json` content):
  https://angular.dev/guide/tailwind
- Bootstrap 5.3 colour modes, `data-bs-theme`, and the Sass-variable caveat:
  https://getbootstrap.com/docs/5.3/customize/color-modes/
- Less import options `(less)` / `(css)` / `(inline)` / `(reference)`:
  https://lesscss.org/features/
- CSS cascade layers, Baseline 2022:
  https://developer.mozilla.org/en-US/docs/Web/CSS/@layer
- Local, authoritative for behaviour: `dist/theme/package.json`,
  `node_modules/@angular/build/src/tools/esbuild/stylesheets/bundle-options.js:58`,
  `node_modules/@angular/compiler/fesm2022/compiler.mjs` (`namespaceCssVariable`,
  `namespaceCssVariables`).

---

## 7. Candidate decision entry (D67)

> **D67 — the theme is a bundled-CSS contract, and three of its failures are
> silent.** `@rivinia/theme` is consumed through a bundler (Angular's
> stylesheet resolver sets `style`/`sass`/`less` conditions); the `style`
> condition on `"."` is load-bearing and must be covered by a packaging test.
> Tailwind's palette block switches to `@theme inline` so subtree overrides
> reach utilities. Documented overrides are unlayered only — not in
> `@layer base`, not in `@theme`, never inside a component stylesheet.
> Less must import `@rivinia/theme/theme.css`; the package root is a verified
> no-op there. Sass CLI users need `pkg:` with `--pkg-importer=node`.
> Measured on `@angular/core` 22.2.3 / `@angular/build`+`@angular/cli` 22.2.5 /
> Sass 1.97.0 / Less 4.4.2 / Tailwind 4.1.16 / Bootstrap 5.3.8 in Chromium and
> Firefox; WebKit and webpack/Vite unverified.

---

## 8. After the change — THM-01 and THM-02 re-measured (2026-10-29)

Same consumer fixture (`@angular/core` 22.2.3, `@angular/build` /
`@angular/cli` 22.2.5, Tailwind 4.1.16), same tarball for the
"before" column (`/tmp/pack-theme/rivinia-theme-0.1.0.tgz`), rebuilt with
`ng build --configuration development`; the only difference is
`projects/theme/styles/tailwind.css`, copied into the extracted package
(sha256 `e52e0c1e…` after the edit, `f5926816…` before). `#probe` carries
`bg-rv-bg text-rv-accent`; `#scoped` sits inside `.scope`; `#direct` carries
`--color-rv-bg: rgb(7,8,9)` on the element.

### 8.1 `bg-rv-bg`, computed `background-color`

| Stylesheet | Before (`@theme`) | After (`@theme inline`) | Firefox, after |
| --- | --- | --- | --- |
| no override | 255,255,255 | 255,255,255 | 255,255,255 |
| `:root { --rv-bg: rgb(10,20,30) }` after the import | 10,20,30 | 10,20,30 | 10,20,30 |
| `.scope { --rv-bg: rgb(1,2,3) }` | **255,255,255** (lost) | **1,2,3** | **1,2,3** |
| element `--color-rv-bg: rgb(7,8,9)` | 7,8,9 | **255,255,255** (lost) | 255,255,255 |
| consumer `@theme { --color-rv-bg: rgb(9,9,9) }` after the adapter | 9,9,9 | 9,9,9 | 9,9,9 |
| that override **plus** `.scope { --rv-bg: rgb(1,2,3) }` | — | **9,9,9** (subtree lost) | 9,9,9 |

`text-rv-accent` stayed `rgb(91, 91, 214)` in every build, and `#panel`
(component stylesheet, `background: var(--rv-bg)`) stayed `rgb(2, 3, 4)`.

Why the last row: a later `@theme` block re-declares `--color-rv-bg` with a
literal, which replaces the inline alias for that token. Tailwind then emits
`.bg-rv-bg { background-color: var(--color-rv-bg) }` instead of
`var(--rv-bg)`, so the utility follows `:root` and a subtree `--rv-bg` stops
reaching it. That is the exact cost of the "Tailwind-style" palette override,
and the reason the migration note says to set `--rv-*`.

Generated CSS, default build (after):

```css
:root { --color-rv-bg: var(--rv-bg); }        /* the token is STILL emitted */
@layer utilities { .bg-rv-bg { background-color: var(--rv-bg); } }
@layer utilities { .text-rv-accent { color: var(--rv-accent); } }
```

Consumer CSS for the default case, `entry-scope-tw.css` (the entry carrying
`.scope` and `#direct`), before and after on the **same entry**: 5,399 B → 5,346
B, −53 B. **Hypothesis, not measured:** the smaller `@theme inline` block should
remove indirection, and 53 B is consistent with that, but the mechanism was not
isolated. The other Tailwind figures are different entries and must not be
compared with this pair — §0/§2.4's 5,314 B (default template, 0.1.0 adapter)
and §9's 5,261 B (`entry-tw.css`, no scoped selectors).

### 8.2 THM-02 — `check:theme`

- `projects/theme/tests/check-theme-package.spec.ts`: 11 tests, all against
  synthetic packages in `mkdtemp` dirs (good package, `style` removed, dangling
  `style`, missing export target, dangling export key, wrong file list, `--rv-bg`
  outside the layer, tarball with a `package/` root, missing directory, CLI exit
  codes 0/1, and a spawn of `pnpm check:theme <tarball>` that asserts the given
  tarball is really the thing checked — not the default `dist/theme`). Run with
  `pnpm test:theme` (`vitest run projects/theme/tests` from the repo root — no
  new `angular.json` target).
- On the real artifacts before adding `CHANGELOG.md`: the 8-file `dist/theme`
  and the 0.1.0 tarball each fail with exactly one problem —
  `missing from the package: CHANGELOG.md (expected 9 files)`. Checks 1, 2 and 4
  pass on the real package.
- A copy of the real `dist/theme` with `exports["."].style` deleted fails with
  the `style` message, as designed.

### 8.3 Who reads `--color-rv-*`

`grep -rn -- '--color-rv-' projects` (2026-10-29):

- **No code in any package reads these names.** Nothing consumes them at
  runtime, so the THM-01 behaviour change breaks no app code in this repo.
- They appear only in the adapter that declares them
  (`projects/theme/styles/tailwind.css`), and in the theme's own docs
  (`README.md`, `CHANGELOG.md`, `SPEC-0.1.1.md`).
- `projects/select/README.md` mentions `--color-rv-select-bg` and
  `--color-rv-select-fg` — a **different namespace** (`--color-rv-<package>-…`),
  mapped by that package's Tailwind guidance and untouched by this change.

---

## 9. Final tarball — all five stacks re-run (2026-10-29)

`dist/theme` built by `pnpm build:theme` (9 files), packed to
`/tmp/pack-theme-020/rivinia-theme-0.1.0.tgz` (6,687 B, shasum
`bd3533dd1013d046fe04859a74e88e3ae17096c6`), extracted into the consumer's
`node_modules/@rivinia/theme` and hash-checked file by file against `dist/theme`.
Every entry is an Angular development build (`ng build`; fixture
`@angular/core` 22.2.3, `@angular/build` / `@angular/cli` 22.2.5), served over
HTTP, measured with Playwright in Chromium and Firefox. `#probe` is a
`.rv-probe` element; `--rv-bg` is read on `document.documentElement`.

| Entry (exactly as a consumer writes it) | built `styles.css` | `--rv-bg` default | with `:root { --rv-bg: rgb(10,20,30) }` |
| --- | --- | --- | --- |
| `@import '@rivinia/theme';` | 613 B | 255,255,255 | 10,20,30 |
| `@use '@rivinia/theme/scss';` | 566 B | 255,255,255 | 10,20,30 |
| `@import (less) '@rivinia/theme/theme.css';` | 547 B | 255,255,255 | 10,20,30 |
| `@import '@rivinia/theme/tailwind.css';` (with `tailwindcss`) | 5,261 B | 255,255,255 | 10,20,30 |
| `@import '@rivinia/theme/bootstrap.css';` (with Bootstrap 5.3.8) | 280,705 B | 255,255,255 | 10,20,30 |

Chromium and Firefox agreed on every cell. `#panel` (component stylesheet,
`--rv-bg` mapped on `.panel`) stayed `rgb(2, 3, 4)` throughout.

Negative cases, same tarball, both browsers:

- `@import (less) '@rivinia/theme';` → 104 B, no `--rv-bg` declared, probe
  transparent. The documented silent no-op.
- `sass src/plain.scss` with `@use '@rivinia/theme/scss'` → **exit 65**,
  "Can't find stylesheet to import." (Sass 1.97.0).
  `sass --pkg-importer=node` with `@use 'pkg:@rivinia/theme/scss'` → exit 0,
  1,870 B, all nine semantic tokens present.

Shipped sizes: `theme.css` 1,826 B, `tailwind.css` 2,172 B, `bootstrap.css`
1,333 B, `_index.scss` 1,389 B, `README.md` 9,419 B, `CHANGELOG.md` 2,172 B,
FESM 0 B (ng-packagr's empty re-export, D20), `types/rivinia-theme.d.ts` 9 B;
tarball 6,687 B (4.5 kB at 0.1.0 — the delta is `CHANGELOG.md` and the longer
README).

---

## 10. Final tarball after the review fixes (2026-10-29)

The review in §8–§9 found packaging-check and wording defects; this section
records the build that includes their fixes. `pnpm build:theme` → the 9-file
`dist/theme`; `npm pack` from `dist/theme` →
`/tmp/pack-theme-final/rivinia-theme-0.1.0.tgz` (6,763 B, 9 files, shasum
`66e778e5f8c89dccd2eb92f3361e83da54730ab9`). `pnpm check:theme` passes on
`dist/theme` and `pnpm check:theme <tarball>` passes on the tarball itself.

Shipped sizes: `theme.css` 1,826 B, `tailwind.css` 2,455 B (the measured
comment), `bootstrap.css` 1,333 B, `_index.scss` 621 B (comment trimmed to
THM-06), `README.md` 10,378 B, `CHANGELOG.md` 2,174 B, FESM 0 B,
`types/rivinia-theme.d.ts` 9 B.

The five-stack browser matrix in §9 was measured on the earlier 6,687 B
tarball. It must be re-run at release time on the final tarball — all five
stacks, including Bootstrap light **and** dark, and Tailwind's subtree
override, `:root` override and consumer `@theme { --color-rv-bg }` cases.
