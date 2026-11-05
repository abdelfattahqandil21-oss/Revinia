## 2026-10-19 — D46: modal and toast join the shared layer; the forced schemes go

- Context: D42 introduced the shared semantic layer and applied it to the
  select and the menu. The modal and the toast were left out, and they had a
  structural problem the other two did not: they declared their token defaults
  **on the component element**.
- **Why that blocked everything.** A declaration on the element out-ranks any
  value an ancestor sets, so `--rv-modal-bg` declared on `.rv-modal` made the
  semantic layer unreachable for the dialog — not "harder to theme", but
  impossible. The select and the menu read their tokens at the read site, so
  an ancestor's value won there.
- **Decisions:**
  - The modal and the toast now read their palette at the READ SITE, as
    two-level chains: `var(--rv-modal-bg, var(--rv-bg, #ffffff))`. The
    per-package token still wins for that component alone; the semantic layer
    is next; the built-in default is last.
  - The element keeps only the LAYOUT tokens (widths, padding, durations) —
    they are component-specific and have no semantic counterpart.
  - **The forced scheme blocks are gone**: the modal forced a dark palette
    under `prefers-color-scheme: dark` and the toast forced a light one. Both
    contradicted the "no forced dark mode" contract the other packages
    document, and both overrode a consumer's explicit choice. The components
    now follow the consumer's scheme, like everything else.
  - The toast's kind colours chain too: `--rv-toast-success` →
    `--rv-ok`, `--rv-toast-error` → `--rv-danger`, and so on.
  - The remaining type and spacing values in the modal and the toast moved to
    `rem`, like the select and the menu (D44).
- **The consumer app was cleaned up too**: `brand-page` no longer sets
  `--rv-modal-bg` / `--rv-toast-bg` / `--rv-toast-fg` etc. per package. With
  the semantic layer mapped once on `:root` next to the `--app-*` values it
  derives from, those rules were redundant — and they were what had been
  masking the global layer.
- **Verified in the consumer app**, with one variable overridden on `:root`:
  the select's trigger, the menu's panel and the modal's surface all turned
  `rgb(255, 0, 255)`, the modal's text turned `rgb(0, 255, 255)`, and the
  dialog's font scaled from 17px to 24px with the root font size. The toast's
  chain was verified in the built artefact
  (`.rv-toast { background: var(--rv-toast-bg, var(--rv-bg, #ffffff)) }`) —
  the app did not produce a toast during the run, so that one is verified in
  the build rather than on screen, and is reported as such.
- Also added: a **Theming** section to the toast README (it documented no
  theming surface at all) and to the modal README, both example-first.
- 70/70 select, 32/32 menu, 51/51 modal, 33/33 toast; all five packages
  build. NOT published.
