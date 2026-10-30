# @rivinia/theme

[![npm version](https://img.shields.io/npm/v/@rivinia/theme.svg)](https://www.npmjs.com/package/@rivinia/theme)
[![license](https://img.shields.io/npm/l/@rivinia/theme.svg)](https://www.npmjs.com/package/@rivinia/theme)

<p align="center">
  <img src="https://raw.githubusercontent.com/abdelfattahqandil21-oss/Revinia/main/assets/rivinia-abstract-mark-light.svg" alt="Rivinia" width="140" />
</p>

The shared Rivinia design-token layer. One import, one place to set the whole
component ecosystem's colours, shapes and type.

- Package version: **0.1.0**
- Requires: **nothing** — it is a stylesheet, not code.
- Side effects: **the CSS itself** (`sideEffects: ["**/*.css", "**/*.scss"]`).

## Quick features

- **One import.** `@import '@rivinia/theme';` — the same shape as
  `@import 'tailwindcss';`.
- **Every component follows.** Select, menu, modal and toast all read the same
  semantic tokens, so a palette change reaches all of them at once.
- **Per-component override still wins.** The chain is
  `--rv-select-bg → --rv-bg → #ffffff`: narrowest first, then the global
  layer, then the built-in default.
- **Framework-neutral.** Plain CSS, Tailwind v4, Bootstrap 5.3, Sass and Less
  all work, because the components read CSS custom properties and every one of
  those stacks can produce or consume them.
- **Your rules always win.** The defaults live inside `@layer rivinia-theme`,
  and unlayered declarations beat layered ones — so your `:root` mapping wins
  wherever it appears, with no import-ordering to get wrong.

## Install

```bash
npm install @rivinia/theme
```

or

```bash
pnpm add @rivinia/theme
```

or

```bash
yarn add @rivinia/theme
```

or

```bash
bun add @rivinia/theme
```

## Quick start

```css
/* your stylesheet */
@import '@rivinia/theme';

:root {
  /* your palette — the whole ecosystem follows */
  --rv-bg: #ffffff;
  --rv-fg: #111111;
  --rv-border: #e0e0e0;
}

[data-theme='dark'] {
  --rv-bg: #161616;
  --rv-fg: #f2f2f2;
  --rv-border: #333333;
}
```

## The tokens

| Token          | Paints             | Default                       |
| -------------- | ------------------ | ----------------------------- |
| `--rv-bg`      | surface background | `#ffffff`                     |
| `--rv-fg`      | text               | `#111111`                     |
| `--rv-muted`   | secondary text     | `#555555`                     |
| `--rv-border`  | borders            | `#e0e0e0`                     |
| `--rv-radius`  | corner radius      | `10px`                        |
| `--rv-shadow`  | elevation          | `0 16px 48px rgba(0,0,0,.22)` |
| `--rv-font`    | font stack         | system stack                  |
| `--rv-accent`  | brand / primary    | `#5b5bd6`                     |
| `--rv-danger`  | destructive        | `#dc2626`                     |
| `--rv-ok`      | success            | `#16a34a`                     |
| `--rv-info`    | informational      | `#2563eb`                     |
| `--rv-warning` | caution            | `#d97706`                     |

Each package also owns tokens of its own — `--rv-select-bg`,
`--rv-menu-bg`, `--rv-modal-bg`, `--rv-toast-bg` — and they resolve as:

```
--rv-select-bg  →  --rv-bg  →  #ffffff
```

So there are three levels of control, and each beats the next:

| Level          | Token            | Scope                               |
| -------------- | ---------------- | ----------------------------------- |
| 1. per package | `--rv-select-bg` | that component only                 |
| 2. global      | `--rv-bg`        | every Rivinia component, everywhere |
| 3. default     | —                | what you get if you set nothing     |

**Map the global palette on `:root`.** An element-level declaration shadows the
root value for that element's subtree, so `--rv-bg` set inside a component
stylesheet changes that component only and stops any page-level override from
reaching it. Set `--rv-*` on a subtree only when that scoped override is what
you mean.

## Overrides

The theme is a **global stylesheet import**: your components never import it,
they read `var(--rv-*)`, and the value comes from wherever the theme is mapped
in the page.

Four placements look right. Three silently do nothing, and the fourth works
with a cost:

| Placement                                        | Result                                                                                                               |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `@layer base { :root { --rv-bg: … } }`           | loses — `rivinia-theme` is declared after `base`, and between layers the later one wins                              |
| `@theme { --rv-bg: … }` (Tailwind)               | ignored — `--rv-bg` is not a Tailwind theme key                                                                      |
| `:root { --rv-bg: … }` in a component stylesheet | never applies — Angular rewrites `:root` to `[_ngcontent-…]:root`, which matches nothing                             |
| `@theme { --color-rv-bg: … }` (Tailwind)         | works — but `@theme` emits at `:root`, it replaces the alias, and a subtree `--rv-bg` then stops reaching `bg-rv-bg` |

Put the override in a **global** stylesheet, **unlayered**, on `:root` or on a
subtree selector. Unlayered declarations beat layered ones, so its position in
the file does not matter.

The bare `@import '@rivinia/theme';` is resolved by a **bundler** through the
package's `style` export condition (measured with Angular CLI; other bundlers
not measured). A page loading CSS with no bundler has to name the file:
`@import '@rivinia/theme/theme.css';`.

## Which styling stack?

| Stack           | How you wire it                                                                      |
| --------------- | ------------------------------------------------------------------------------------ |
| **Plain CSS**   | `@import '@rivinia/theme';` then set `--rv-*` on `:root`.                            |
| **Tailwind v4** | `@import '@rivinia/theme/tailwind.css';` — utilities `bg-rv-*`; colour via `--rv-*`. |
| **Bootstrap**   | `@import '@rivinia/theme/bootstrap.css';` — your `--bs-*` become `--rv-*`.           |
| **Sass / SCSS** | `@use '@rivinia/theme/scss';` — bundlers only; the `sass` CLI needs `pkg:`.          |
| **Less**        | `@import (less) '@rivinia/theme/theme.css';` — the explicit file, nothing else.      |

Import the Tailwind or Bootstrap adapter **instead of** the base entry, never in
addition: the adapter already imports the base, and both together emit the
theme twice (1,019 B of built CSS instead of 613 B).

### Tailwind v4

```css
@import 'tailwindcss';
@import '@rivinia/theme/tailwind.css';

:root {
  --rv-bg: #ffffff;
  --rv-fg: #111111;
}
```

The adapter registers `--color-rv-bg`, `--color-rv-fg`, `--color-rv-accent`, …
with `@theme inline`, so `bg-rv-bg`, `text-rv-accent`, `border-rv-border` and
the rest are generated, and each utility reads the semantic token on the
element. A subtree override therefore paints that subtree:

```css
/* bg-rv-bg inside .promo paints #101828 */
.promo {
  --rv-bg: #101828;
}
```

Both adapter blocks are `inline` because they reference other variables, and
`inline` is what makes the reference resolve at use-site.

**Set colours with `--rv-*`, not `--color-rv-*`.** `--color-rv-*` is the name
Tailwind generates a utility from. Overriding it on an element no longer reaches
the utility — before 0.2.0, with a plain `@theme` block, it did. A later
`@theme { --color-rv-bg: … }` still wins, but it replaces the alias, so that
token stops following `--rv-bg` in the same stylesheet.

### Bootstrap 5.3

```css
@import 'bootstrap/dist/css/bootstrap.css';
@import '@rivinia/theme/bootstrap.css';
```

The adapter maps the semantic layer onto `--bs-body-bg`, `--bs-body-color`,
`--bs-border-color` and `--bs-secondary-color`, under both
`[data-bs-theme='light']` and `[data-bs-theme='dark']`. A Bootstrap theme
switch re-themes the Rivinia components with no extra wiring.

Import order does not matter — the adapter and Bootstrap read each other through
`var()`, which resolves at computed-value time (measured: swapping the two lines
gives identical colours). The order above is the readable one.

### Sass

```scss
@use '@rivinia/theme/scss';
```

`@rivinia/theme/scss` is a one-line SCSS file that forwards the stylesheet, so
`@use` has a stable module specifier. The extension is optional in both
spellings — `@use '@rivinia/theme/theme.css'` compiles to the same CSS.

Bundlers that compile your stylesheet (measured with Angular CLI; Vite not
measured) resolve that specifier through the package's `exports`. The **`sass`
CLI** does not read `exports`, so give it the `pkg:` scheme:

```bash
sass --pkg-importer=node styles.scss
```

```scss
@use 'pkg:@rivinia/theme/scss';
```

`--pkg-importer=node` requires Dart Sass 1.71+.

### Less

```less
@import (less) '@rivinia/theme/theme.css';
```

The explicit file is the only spelling that works in Less 4. Less resolves bare
specifiers from `node_modules` but ignores `exports`, so:

- `@import (less) '@rivinia/theme';` compiles to **nothing** — Less inlines the
  package root, which is the empty ESM entry, and the theme silently disappears;
- `@import (less) '@rivinia/theme/scss';` is invalid in Less (that file is Sass).

Less passes CSS custom properties through untouched. Less **variables**
(`@color: …`) are a different mechanism and do not interoperate with them — use
`var(--rv-*)` inside Less files.

## Conditionals

The stylesheet uses `@supports` and `@media` only — no Sass or Less syntax —
so it compiles as plain CSS anywhere. Your own `@if` / `@media` rules live in
your files and can override anything the tokens expose.

## For contributors

- `pnpm build:theme` — production build into `dist/theme`.
- `pnpm test:theme` — the packaging-check tests, run against synthetic packages
  in temp dirs (no build needed).
- `pnpm check:theme` — asserts the packaged contract of `dist/theme` after a
  build: `exports["."].style` exists and resolves, every other export target
  exists, the file list is exactly the expected nine, and `styles/theme.css`
  declares `--rv-bg` inside `@layer rivinia-theme`. Pass a path to check
  something else — before a release, the tarball:
  `pnpm check:theme rivinia-theme-x.y.z.tgz`.

## License

MIT.
