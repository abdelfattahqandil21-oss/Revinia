# @rivinia/theme

[![npm version](https://img.shields.io/npm/v/@rivinia/theme.svg)](https://www.npmjs.com/package/@rivinia/theme)
[![license](https://img.shields.io/npm/l/@rivinia/theme.svg)](https://www.npmjs.com/package/@rivinia/theme)

The shared Rivinia design-token layer. One import, one place to set the whole
component ecosystem's colours, shapes and type.

- Package version: **0.1.0**
- Requires: **nothing** — it is a stylesheet, not code.
- Side effects: **the CSS itself** (`sideEffects: ["**/*.css"]`).

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

**Map the semantic layer on `:root`, never on a component element.** An
element-level declaration shadows the root value for that subtree, and the
override silently stops working.

## Which styling stack?

| Stack           | How you wire it                                                                |
| --------------- | ------------------------------------------------------------------------------ |
| **Plain CSS**   | `@import '@rivinia/theme';` then set `--rv-*` on `:root`.                      |
| **Tailwind v4** | `@import '@rivinia/theme/tailwind.css';` — your palette in `@theme`.           |
| **Bootstrap**   | `@import '@rivinia/theme/bootstrap.css';` — your `--bs-*` become `--rv-*`.     |
| **Sass / SCSS** | `@use '@rivinia/theme/scss';` — Dart Sass loads the stylesheet as a module.    |
| **Less**        | `@import (less) '@rivinia/theme/theme.css';` — custom properties pass through. |

### Tailwind v4

```css
@import 'tailwindcss';
@import '@rivinia/theme/tailwind.css';

@theme {
  --color-surface: #ffffff;
  --color-fg: #111111;
}

:root {
  --rv-bg: var(--color-surface);
  --rv-fg: var(--color-fg);
}
```

`@theme` is for a token with a literal value; `@theme inline` is for one that
references another variable, so the utility resolves at use-site and a scoped
override still works.

### Bootstrap 5.3

```css
@import 'bootstrap/dist/css/bootstrap.css';
@import '@rivinia/theme/bootstrap.css';
```

The adapter maps the semantic layer onto `--bs-body-bg`, `--bs-body-color`,
`--bs-border-color` and `--bs-secondary-color`, under both
`[data-bs-theme='light']` and `[data-bs-theme='dark']`. A Bootstrap theme
switch re-themes the Rivinia components with no extra wiring.

### Sass

```scss
@use '@rivinia/theme/scss';
```

Dart Sass can load a plain `.css` file, but the extension must be **omitted**
for `@use` to treat it as a module rather than a plain CSS `@import`.
`@rivinia/theme/scss` is a one-line SCSS file that exists for that reason.
Sass 1.71+ can also resolve `pkg:` URLs from `node_modules` with
`--pkg-importer=node`.

### Less

```less
@import (less) '@rivinia/theme/theme.css';
```

Less passes CSS custom properties through untouched. Less **variables**
(`@color: …`) are a different mechanism and do not interoperate with CSS
custom properties — use `var(--rv-*)` inside Less files.

## Conditionals

The stylesheet uses `@supports` and `@media` only — no Sass or Less syntax —
so it compiles as plain CSS anywhere. Your own `@if` / `@media` rules live in
your files and can override anything the tokens expose.

## License

MIT.
