## 2026-10-19 — D42: one global token layer, and the surface a consumer can actually change

- Context: after D40/D41 the select and the menu both behave correctly, but a
  consumer asked the sharp question: *the component carries too much style; I
  cannot change the radius, the border, the panel background.* Measured in the
  consumer app, the truth was more precise than the complaint:
  - the **palette and shape** tokens (`--rv-select-bg`, `--rv-select-radius`,
    `--rv-select-shadow`, …) DID work, and they reached the trigger and the
    panel together (measured: `oklch(0.21 0.03 265)` → `rgb(1,2,3)` on both);
  - the **metrics** were hard-coded (row padding `8px 10px`, row radius
    `8px`, row min-height `40px`, trigger padding `8px 12px`, focus ring,
    hover/active tints, search and empty-state padding);
  - and the **CSS class names** already worked as an override surface, because
    the component styles are unencapsulated — but nothing documented that, so
    a consumer could not rely on it.
- Decisions:
  - **A shared semantic layer**, `--rv-bg` / `--rv-fg` / `--rv-muted` /
    `--rv-border` / `--rv-radius` / `--rv-shadow` / `--rv-font` / status
    colours, read by every package as
    `var(--rv-<pkg>-<x>, var(--rv-<semantic>, <default>))`. Three levels of
    control, each beating the next: per-package token → semantic token →
    built-in default. Measured on the consumer app: `--rv-select-bg` (blue)
    won over `--rv-bg` (magenta), which won over the default.
  - **A new `@rivinia/theme` package** carrying that layer, so ONE import
    does it — the shape `tailwindcss` uses: `@import '@rivinia/theme';`.
    It also ships `tailwind.css` and `bootstrap.css` adapters and an SCSS
    entry. The layer's defaults live inside `@layer rivinia-theme`, because
    unlayered declarations beat layered ones: a consumer's own
    `:root { --rv-bg: … }` must win wherever it appears. (Measured: with the
    defaults unlayered, the shipped file beat the app's mapping and the
    override did nothing.)
    - The layer must be mapped on `:root`, never on a component element —
      an element-level declaration shadows the root value and the override
      silently stops working. Measured.
  - **The metric hard-codings became tokens** — ~22 for the select and ~12 for
    the menu (row padding/radius/min-height/size/gap, hover and active tints,
    disabled opacity, focus ring and offset, search and empty-state metrics,
    text alignment, trigger justification). Measured end to end: row padding
    `8px 10px` → `18px 22px`, row radius `8px` → `2px`, trigger padding
    `8px 12px` → `16px 20px`.
  - **The class names are documented as a stable override API**, with the
    `data-*` hooks. They were always global; they are now contract.
  - **`optionTemplate`** — a new input on `rv-select` that replaces an option
    row's content with the consumer's markup, which is the answer to icons,
    avatars, badges and group headers. The `<button>` wrapper stays, so the
    ARIA, the keyboard handling, the disabled state and the multi-mode check
    keep working. An `icon` FIELD was rejected: it would put raw markup (or a
    URL the library must fetch) in the component's hands, and every consumer's
    icons differ. Verified by a test: 59/59 select tests.
- **Framework support** — all of these work, because the components read CSS
  custom properties and every stack can produce or consume them: plain CSS
  (`@import '@rivinia/theme'`), Tailwind v4 (`@theme` / `@theme inline`),
  Bootstrap 5.3 (`--bs-*` + `data-bs-theme`), Sass (`@use '@rivinia/theme/scss'`
  — Dart Sass loads a plain `.css` file as a module when the extension is
  omitted, so the SCSS entry exists for that reason), and Less (custom
  properties pass through untouched; Less VARIABLES are a different mechanism
  and do not interoperate). The library's CSS uses `@supports` and `@media`
  only — no Sass or Less syntax — so it compiles as plain CSS anywhere.
- Verified: 59/59 select, 32/32 menu, all three packages build, the dist
  greps are clean, and a consumer app measures the override surface working
  (tokens, alignment tokens, the global layer reaching both the select and
  the menu, and the panel still attached to its trigger at 0px offset).
  NOT published.
