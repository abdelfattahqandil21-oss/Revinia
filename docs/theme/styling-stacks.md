# @rivinia/theme — which styling stack?

Back to [the README](../../projects/theme/README.md) ·
[where an override has to live](../theming.md)

| Stack           | How you wire it                                                                      |
| --------------- | ------------------------------------------------------------------------------------ |
| **Plain CSS**   | `@import '@rivinia/theme';` then set `--rv-*` on `:root`.                            |
| **Tailwind v4** | `@import '@rivinia/theme/tailwind.css';` — utilities `bg-rv-*`; colour via `--rv-*`. |
| **Bootstrap**   | `@import '@rivinia/theme/bootstrap.css';` — your `--bs-*` become `--rv-*`.           |
| **Sass / SCSS** | `@use '@rivinia/theme/scss';` — bundlers only; the `sass` CLI needs `pkg:`.          |
| **Less**        | `@import (less) '@rivinia/theme/theme.css';` — the explicit file, nothing else.      |

Import the Tailwind or Bootstrap adapter **instead of** the base entry, never in
addition: the adapter already imports the base, and both together emit
`styles/theme.css` twice — 3,997 B duplicated at this version.

## Tailwind v4

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

## Bootstrap 5.3

```css
@import 'bootstrap/dist/css/bootstrap.css';
@import '@rivinia/theme/bootstrap.css';
```

The adapter maps the semantic layer onto `--bs-body-bg`, `--bs-body-color`,
`--bs-secondary-color`, `--bs-border-color`, `--bs-primary`, `--bs-danger`,
`--bs-success`, `--bs-info` and `--bs-warning`, under both
`[data-bs-theme='light']` and `[data-bs-theme='dark']`. `--rv-shadow` has no
Bootstrap equivalent, so it keeps the theme's values. A Bootstrap theme switch
re-themes the Rivinia components with no extra wiring.

Import order does not matter — the adapter and Bootstrap read each other through
`var()`, which resolves at computed-value time (measured: swapping the two lines
gives identical colours). The order above is the readable one.

## Sass

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

## Less

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
