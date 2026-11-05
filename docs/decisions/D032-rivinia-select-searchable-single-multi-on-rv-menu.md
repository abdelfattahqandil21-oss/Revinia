## 2026-10-16 — D32: `@rivinia/select` searchable single/multi on rv-menu

- Context: invoice-filter (searchable single) and tag-picker (multi) designs
  need one select primitive, not two components.
- Decision: headless `RiviniaSelect` (option registry, accent-insensitive
  label filter, single value / multi values, `syncOptions` mirroring) plus
  `rv-select` composed on the inner `rv-menu` (owns a private `RiviniaMenu`
  for nav; reopen-in-same-pass for multi so the panel never drops; Tab in the
  search box jumps into the list instead of closing; structural
  `RiviniaSelectController` per the dual-realm rule). Options come from an
  `options` input; rich custom rows stay with raw `rv-menu`. Peer-depends on
  `@rivinia/menu` (declared; FESM grep gate applies).
- Verified: 10/10 select tests, CSR headed run with zero errors.
  NOT published (new package 0.1.0).
