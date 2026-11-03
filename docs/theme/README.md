# Theming every Rivinia component

Owned by [`@rivinia/theme`](../../projects/theme/README.md) and shared by every
package that paints: [select](../../projects/select/README.md),
[menu](../../projects/menu/README.md), [i18n](../../projects/i18n/README.md), modal
and toast. Each package keeps only its own token table and links here. Read it
once; the components all follow.

## The chain, and the three levels of control

Every colour ships in two schemes and resolves narrowest-first:

```
--rv-select-bg  →  --rv-bg  →  #ffffff
```

| Level          | Token            | Scope                               |
| -------------- | ---------------- | ----------------------------------- |
| 1. per package | `--rv-select-bg` | that component only                 |
| 2. global      | `--rv-bg`        | every Rivinia component, everywhere |
| 3. default     | —                | what you get if you set nothing     |

The twelve global names (`--rv-bg`, `--rv-fg`, `--rv-muted`, `--rv-border`,
`--rv-radius`, `--rv-shadow`, `--rv-font`, `--rv-accent`, `--rv-danger`,
`--rv-ok`, `--rv-info`, `--rv-warning`) are the public contract: renaming one is
a breaking change, adding one is not. Their values are in
[the token table](tokens.md).

**Map the global palette on `:root`.** An element-level declaration shadows the
root value for that element's subtree, so `--rv-bg` set inside a component
stylesheet changes that component only and stops any page-level override from
reaching it. Set `--rv-*` on a subtree only when that scoped override is what
you mean.

## Where the override has to live

The theme is a **global stylesheet import**: your components never import it,
they read `var(--rv-*)`, and the value comes from wherever the theme is mapped
in the page. Four placements look right. Three silently do nothing, and the
fourth works with a cost:

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

## Light and dark

The dark values apply from **two** places, and they are kept identical:

```css
/* 1. the OS setting, unless the page opts out */
@media (prefers-color-scheme: dark) {
  :root:not([data-rv-theme='light']) {
    --rv-bg: #161616; /* … */
  }
}

/* 2. an explicit switch that beats a light OS setting */
:root[data-rv-theme='dark'] {
  --rv-bg: #161616; /* … */
}
```

| You want                 | Do this                                             |
| ------------------------ | --------------------------------------------------- |
| Follow the OS            | nothing                                             |
| Always light             | `<html data-rv-theme="light">`                      |
| Always dark              | `<html data-rv-theme="dark">`                       |
| A dark section in a page | set the `--rv-*` tokens on that element (see below) |

The attribute is read on `<html>` only: the tokens are declared on `:root`, so
an attribute lower down the tree changes nothing. To paint one section, set the
tokens and the scheme on it:

```css
.hero-dark {
  color-scheme: dark;
  --rv-bg: #161616;
  --rv-fg: #f2f2f2;
  --rv-muted: #a1a1aa;
  --rv-border: #3f3f46;
  --rv-accent: #8b8bf0;
  --rv-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
}
```

Every Rivinia component inside that element follows those tokens, and the rest
of the page is untouched. The status tokens and `--rv-font`/`--rv-radius` keep
their root values unless you list them too. A component token set on `:root`
still wins inside the section — the component reads its own token before
`--rv-bg`, as it does everywhere — so do not set one there if you want the
section to override it. `pnpm check:theme-dark` renders that rule and measures
both sides of its boundary.

Both blocks also set `color-scheme` on `:root`, which descendants inherit, so
form controls, scrollbars and the canvas follow the palette instead of staying
light under a dark surface. If you override the dark values yourself, set
`color-scheme: dark` in the same rule.

**Adapters.** The Tailwind adapter needs nothing: its utilities are `inline`
aliases of `--rv-*`, so they follow the switch. The Bootstrap adapter maps both
schemes from `--bs-*` and sets `color-scheme` itself — its rules are unlayered
so that Bootstrap stays authoritative even when the OS preference says dark.
Under `bootstrap.css` the switch is Bootstrap's own `data-bs-theme`; the
adapter's unlayered mapping beats the theme's `:root[data-rv-theme]` block, so
`data-rv-theme` does nothing on that path.

`pnpm check:theme-dark` proves all of this in Chromium and Firefox: eleven cases
across both engines, reading the computed background, colour, shadow and
`color-scheme` from real pages.

## Further reading

- [The token table](tokens.md) — every name, both schemes.
- [Which styling stack?](styling-stacks.md) — Tailwind v4, Bootstrap 5.3,
  Sass, Less.
- [What the theme restyles in the components](component-theme.md) — the
  accent wiring and forced-colors mode.
- [Contrast](contrast.md) — what the palette guarantees, measured.
