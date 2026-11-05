## 2026-10-19 — D48: DI for the select controller, frozen options, and errors the consumer can see

- **The controller can be injected.** `new RiviniaSelect('multi')` in a component
  is opaque to Angular: it cannot be overridden in a test and it is invisible
  to the injector graph. A root singleton would be wrong — the controller is
  per-select state — so the provider form is used instead:
  `provideRiviniaSelect(mode)` + `injectRiviniaSelect()`, over a
  `RIVINIA_SELECT` token typed as the structural
  `RiviniaSelectController`. A test replaces the controller by providing the
  token, without touching the component. `injectRiviniaSelect()` throws when
  nothing is provided, rather than returning `undefined` and failing much
  later somewhere unrelated.
- **Registered options are frozen.** `readonly` on `RiviniaSelectOption` is a
  compile-time promise only. An option that could be mutated after
  registration would let the filtered list and the selection disagree, so the
  registry now holds `Object.freeze`d copies.
- **The item radius follows the semantic layer**, like every other shape:
  `--rv-select-item-radius` → `--rv-radius` → `0.5rem`, and the same for the
  menu's item radius.
- **An unexpected error now reaches the consumer.**
  - The library throws; the app decides what "unexpected" means.
  - The consumer app replaced Angular's `ErrorHandler` with one that logs
    WITH the cause and shows a toast. Angular's default only logs, so a defect
    that passes TypeScript and breaks at runtime used to vanish into the
    console while the screen quietly stopped working.
  - `rethrowIfUnexpected(error, context)` reports through the `ErrorHandler`
    (so the app can show it) and then rethrows (so it is never silent). An
    `ApiError` is still just handled.
  - **Verified on screen**: an unhandled `TypeError` produced a toast reading
    *"Cannot read properties of undefined (reading 'data')"*.
  - **A second defect fell out of that work**: the app's `<rv-toast-list>` had
    no `[manager]`, so the list was in presentational mode with an empty
    array — **no toast had ever appeared in this app**. Every toast the app
    had been showing was going nowhere. The list is now managed, and the
    app's own "Signed in as …" toast appears for the first time.
