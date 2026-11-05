# @rivinia/theme

[![npm version](https://img.shields.io/npm/v/@rivinia/theme.svg)](https://www.npmjs.com/package/@rivinia/theme)
[![license](https://img.shields.io/npm/l/@rivinia/theme.svg)](https://www.npmjs.com/package/@rivinia/theme)

<p align="center">
  <img src="https://raw.githubusercontent.com/abdelfattahqandil21-oss/Revinia/theme/v1.0.0-rc.3/assets/rivinia-abstract-mark-light.svg" alt="Rivinia" width="140" />
</p>

One stylesheet for the whole Rivinia ecosystem: map a palette once, and every
component follows. Package version: **1.0.0-rc.3**.

1.0.0-rc.1 is the first supported release; 0.x was experimental.

```css
/* your global stylesheet — that is the whole setup */
@import '@rivinia/theme';

:root {
  --rv-bg: #101828;
  --rv-fg: #f4f6fa;
  --rv-accent: #7c9cf5;
}
```

Open a `rv-select` after that and its panel, rows, borders and focus ring are
already your colours: each component reads `var(--rv-bg)`,
`var(--rv-fg)`, `var(--rv-accent)` with its own value as the fallback, so the
palette below is what ships when you set nothing. Light and dark both come with
the package, and a `data-rv-theme` attribute on `<html>` switches either way.

## Why `@rivinia/theme`

- **One place, every component.** The twelve semantic names are what select,
  menu, modal, toast and the i18n toggle read, so a rebrand is one edit.
- **Your rules win without import ordering.** The defaults live inside
  `@layer rivinia-theme`, and unlayered declarations beat layered ones — your
  `:root` mapping wins wherever it appears in the file.
- **Headless first.** Set nothing and nothing changes: every read is
  `var(--rv-accent, <previous value>)`, so a page that never imports the theme
  renders exactly as it did before it existed.

## Install

```bash
npm install @rivinia/theme      # or pnpm add / yarn add / bun add
```

No peers and no runtime: it is a stylesheet, not code. `sideEffects` is
`["**/*.css", "**/*.scss"]` — the CSS is the point. Node follows Angular 22
(`^22.22.3 || ^24.15.0 || >=26.0.0`), and only for the package manager's engine
check.

## Quick start

1. **Import it once, globally.** In your `styles.css`:
   `@import '@rivinia/theme';`. The bare specifier needs a bundler — with no
   bundler, name the file: `@import '@rivinia/theme/theme.css';`.
2. **Map your palette** on `:root`, in that same global stylesheet. Three names
   get you a branded page: `--rv-bg`, `--rv-fg`, `--rv-accent`.
3. **Add a component and look at it.** A `rv-select` on the page now paints
   with your colours, follows `prefers-color-scheme` in both directions, and
   keeps its focus ring visible in Windows High Contrast.

## Two ways to use it

| Way                 | Entry                                                                  | When                                 |
| ------------------- | ---------------------------------------------------------------------- | ------------------------------------ |
| The base stylesheet | `@import '@rivinia/theme';`                                            | you set the `--rv-*` tokens yourself |
| An adapter          | `@rivinia/theme/tailwind.css`, `/bootstrap.css`, `/scss`, `/theme.css` | your stack already owns the palette  |

The entries are independent files, and an adapter imports the base — pick one,
never both, or the stylesheet ships twice (measured: 3,997 B duplicated).

## Compatibility

|               | Chrome / Edge                                                    | Firefox | Safari macOS | Safari iOS |
| ------------- | ---------------------------------------------------------------- | ------- | ------------ | ---------- |
| **Supported** | 114                                                              | 125     | 17           | 18.3       |
| Angular       | 22 (`^22.0.0` peer-free: this package has no Angular dependency) |         |              |            |

`@layer` (99 / 97 / 15.4), `color-mix()` (111 / 113 / 16.2) and
`prefers-color-scheme` (76 / 67 / 12.1) are all above the Supported floor, so
none of them is a gap here. The second floor — CSS anchor positioning, which
makes a panel tether itself to its trigger — belongs to the popup components,
not to a stylesheet; see
[browser support](https://github.com/abdelfattahqandil21-oss/Revinia/blob/theme/v1.0.0-rc.3/docs/browser-support.md)
for both. Real
Safari has not been run, and no CI runs this matrix; the same page says what
else was never measured.

## Go further

| Topic                                                                                                          | Read                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Theming every Rivinia component — the cascade, the three levels, where an override has to live, light and dark | [docs/theme/README.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/theme/v1.0.0-rc.3/docs/theme/README.md)                             |
| The twelve tokens with both schemes                                                                            | [docs/theme/tokens.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/theme/v1.0.0-rc.3/docs/theme/tokens.md)                   |
| Tailwind v4, Bootstrap 5.3, Sass, Less                                                                         | [docs/theme/styling-stacks.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/theme/v1.0.0-rc.3/docs/theme/styling-stacks.md)   |
| What the theme restyles inside the components, and forced colours                                              | [docs/theme/component-theme.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/theme/v1.0.0-rc.3/docs/theme/component-theme.md) |
| Contrast, measured pair by pair                                                                                | [docs/theme/contrast.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/theme/v1.0.0-rc.3/docs/theme/contrast.md)               |
| Browser floors and what each feature is for                                                                    | [docs/browser-support.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/theme/v1.0.0-rc.3/docs/browser-support.md)             |
| Building and checking this package                                                                             | [docs/theme/contributing.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/theme/v1.0.0-rc.3/docs/theme/contributing.md)       |

Migration notes for each version live in
[CHANGELOG.md](https://github.com/abdelfattahqandil21-oss/Revinia/blob/theme/v1.0.0-rc.3/projects/theme/CHANGELOG.md).
MIT licensed.
