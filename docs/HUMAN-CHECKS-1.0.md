# Human checks — Rivinia 1.0

Everything in this file needs a person. The automated evidence lives in
`docs/a11y-verification.md`; nothing here was inferred from it.

Run the checks in the order below. Each one says **what to do**, **what to look
for**, and **what result would force a change** — if you hit the last one, stop
and record it, because the code has to move, not the expectation.

## Order

1. **S2 — screen reader pass** (one row of the matrix per sitting; NVDA first).
2. **S4 — real device resize** (one phone, one tablet, portrait and landscape).
3. **S7 — Safari** (macOS Safari, current version).

## How to run the demo

From the repository root, on a machine with a browser:

```bash
pnpm build select
pnpm build menu-e2e
node e2e/serve.mjs dist/menu-e2e/browser 4299
```

Then open `http://127.0.0.1:4299/select`. The page holds the fixtures the checks
name: `#single-select` (searchable, three invoices, one disabled),
`#multi-select` (two roles), `#rtl-select` (Arabic label, three rows) and
`#virtual-select` (500 rows, custom list template).

---

## S2 — screen reader matrix

Pick one combination per run and tick only the cells you actually heard. The
matrix is in `docs/a11y-verification.md`; its cells start at "not tested" and
only you can fill them.

### Steps (repeat per combination)

1. Focus the single select. Expect the caption and the current value, then a
   button with a popup menu that is collapsed, e.g. **"Invoice status Select…,
   button, menu, collapsed"** (wording varies per screen reader).
2. Press <kbd>Enter</kbd>. Expect the menu reported expanded, then the filter
   box focused and announced as a **search box**, not as a menu item.
3. Type `out`, then <kbd>Tab</kbd>. Expect the first remaining row focused and
   announced as a **radio button**, unchecked.
4. Press <kbd>↓</kbd> then <kbd>Enter</kbd>. Expect the pick to be announced and
   focus back on the trigger, whose name now contains the value
   ("… Outstanding invoices").
5. Reopen and arrow through the rows. Expect **three** rows, the middle one
   announced **dimmed/unavailable** and never selected.
6. Go to `#multi-select`, open it, pick two rows with <kbd>Enter</kbd>. Expect
   each row announced as a **check box**, checked/unchecked, and the picks
   listed in the trigger after close.
7. Go to `#rtl-select`, open it. Expect the three rows in the order
   **Owner, Admin, Member**, in Arabic reading order.

### Pass means

- The menu is announced as a menu; rows as radio buttons (single) or check
  boxes (multi) with their checked state.
- The filter box is announced as a search box with its own name, and typing
  into it is not announced as menu typeahead.
- The disabled row is announced unavailable and cannot be picked.
- Focus returns to the trigger on pick and on <kbd>Esc</kbd>, and the trigger
  name contains the visible value.

### This forces a change

- **The filter box announced as content of the menu** (e.g. "menu, search box"
  with no boundary, or arrowing from the rows into the box): switch the
  searchable variant to the recorded fallback, option 3 in the D85 addendum (a
  select-only combobox + listbox with `aria-activedescendant`) — post-1.0 unless
  it blocks 1.0 for you.
- **Rows not announced as selected/checked**, or the checked state not updating
  after a pick: the `menuitemradio` decision in D85 needs revisiting before
  `1.0.0`.
- **Focus landing on `<body>`** after a pick or <kbd>Esc</kbd>: a regression in
  the focus-restore path; file it with the combination and the step number.
- **The RTL rows read in reverse order**: a DOM-order bug, not a screen-reader
  quirk.

## S4 — real device resize

Pending: written with S4 (the height-only resize policy). Until then the
real-device result is **not tested**.

## S7 — Safari

Pending: written with S7 (the browser support matrix), together with the WebKit
results. Until then Safari is **not tested**.
