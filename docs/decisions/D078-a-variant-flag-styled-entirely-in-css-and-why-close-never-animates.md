## 2026-10-30 — D78: a `variant` flag, styled entirely in CSS, and why close never animates

- **What shipped.** `@rivinia/select` 0.7.0 (prepared, unpublished): a `variant`
  input on `<rv-select>` (`'simple' | 'premium'`, default `'simple'`), reflected
  as `data-variant` on the select and on the `<rv-select-popup>` it builds.
  `RiviniaSelectVariant` is exported from `@rivinia/select/ui`. The popup
  component carries the same input so the flag reaches the panel's host, but
  `SelectPopupComponent` stays unexported — the select is its only caller, and
  a consumer writing their own UI drives the headless controller instead.
- **Why an attribute and not a component or a directive.** The headless layer
  owns behaviour and the UI layer owns paint, so a second select component
  would fork the behaviour surface, and a directive would still need a CSS
  contract. One input, one attribute, and every premium rule scoped under
  `[data-variant='premium']` gives a single source of truth with **zero JS
  branches**: unset means `simple`, `simple` means the 0.6.1 bytes. Cost
  measured on the packed tarball: +801 B brotli / +1,292 B gzip on the
  `@rivinia/select/ui` chunk, 0 B on the headless entry point; the only runtime
  work is a host-binding comparison that a `simple` consumer never triggers a
  repaint from.
- **The cascade needed two mappings, not one.** The select already maps
  `--rv-select-*` onto `--rv-select-popup-*` on the panel element, and a
  declared token beats a `var()` fallback. So the premium panel defaults live
  in `select-panel.css` (specificity (0,2,1), above the base (0,2,0) rule)
  while `select-popup.css` carries property-level premium fallbacks for the
  popup's own host. A single declaration site
  was rejected: it would have silently overridden the consumer-facing
  `--rv-select-popup-*` tokens the README documents.
- **No exit animation.** Considered and dropped, not forgotten. The panel is
  destroyed by `@if` and lives in the browser top layer; keeping it mounted
  for a leave transition means (a) it keeps swallowing pointer events aimed at
  the page underneath, (b) `panelReady` handed the virtualiser a node that is
  about to be removed, and (c) a reopen inside the leave window can latch onto
  the leaving element via `querySelector`. That is the family of bugs D77
  fixed; close stays instant and the perception is carried by the chevron
  returning and the panel leaving.
- **No row stagger.** The motion scale's per-item offset is 40 ms; at 27 rows
  the last one lands 1.1 s late, and the list can hold 2,000. One authored
  moment — the panel — is the correct call for a control people open dozens of
  times an hour.
- **Scrollbar: standard properties only.** `scrollbar-width: thin` plus
  `scrollbar-color`. Chromium ignores `::-webkit-scrollbar` once
  `scrollbar-color` is set, so shipping both would be dead code that still
  costs bytes; the pseudo-element is asserted absent by a test. Width still
  varies by OS (8–12px on Chromium/Windows, overlay on macOS), which is the
  platform's call, documented in the README rather than forced with
  `!important` tricks.
- **Selected rows: a hook, not a fill.** `data-selected="true"` is emitted in
  both skins. A premium fill was prototyped and dropped: to stay visible it
  had to out-rank hover and active for no information the check mark does not
  already carry, and it fought the active wash.
- **Tests.** `projects/select/tests/select-variants.spec.ts` (9 cases): both
  hosts default to `simple`, the select passes its flag down, the popup
  honours its own, `data-selected` lands only on the selected row, the
  premium row/trigger rules reference their tokens, the keyframe reads
  `--rv-select-popup-from-scale`, the panel block carries the 250 ms /
  `0.22, 1, 0.36, 1` pair, the scrollbar uses the standard pair and no
  `::-webkit-scrollbar` block exists, the skeleton is `display: none` by
  default, and both stylesheets keep their reduced-motion guards. Mutation-
  checked: removing the pass-down, the host binding, `data-selected`, or the
  `from-scale` token each fails the suite.
