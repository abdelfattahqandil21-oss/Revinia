## 2026-10-16 — D29: `@rivinia/modal/ui` on native `<dialog>`, no CDK

- Context: the headless Core already owns ordering, lifecycle, guards and
  typed results (the hard parts). The UI layer needed rendering + focus +
  scroll-lock + animations only. Evaluated: (A) native `<dialog>`, (B) CDK
  Dialog/Overlay, (C) custom overlay. Sources: MDN `showModal` (top layer,
  `::backdrop`, inert background, widely available), Angular Package Format
  (secondary-entrypoint `exports`), TS handbook (discriminated unions for
  option contracts, overload guidance).
- Decision: (A) native `<dialog>` + thin custom logic, ZERO new runtime
  dependencies. CDK rejected: it would duplicate Core lifecycle state (two
  sources of truth) and add bundle weight for positioning machinery we
  replace with plain CSS. Proof: core FESM has zero UI markers, UI FESM has
  zero store internals; UI imports are `@angular/common` + `@angular/core`
  - `@rivinia/modal` only.
- Consequences: exit animations ride the existing `closing` →
  `confirmClosed` handshake (default 300 ms covers the 150 ms default);
  toasts can neither `z-index` nor `popover` above a modal dialog (measured
  in Chrome via `elementFromPoint`) — documented limitation, no
  modal→toast dependency; host takes the manager via `[modal]` input typed
  as the structural `RiviniaModalHostManager` (D06 input-composition, immune
  to cross-realm singleton splits between source and `dist` typings).
- Verified: 47/47 modal tests (37 headless + 10 UI), CSR + SSR production
  integration with zero framework errors, lazy chunk 16.72 kB raw
  (4.93 kB transfer). NOT published; proposed `modal 0.5.0` (feature,
  pre-1.0 minor).
