## 2026-10-19 — D49: the release set — what changed, what the versions are, and what is still open

- **The version set**, chosen by what actually changed, not by convenience:
  | Package  | From  | To     | Why                                                             |
  | -------- | ----- | ------ | --------------------------------------------------------------- |
  | `select` | 0.5.0 | 0.6.0  | The popup rename and `[menuLabel]` → `[popupLabel]` are breaking. |
  | `modal`  | 0.5.3 | 0.6.0  | The forced scheme blocks are gone, and `size`/`coversOthers` are new. Behaviour changed. |
  | `toast`  | 0.4.2 | 0.5.0  | The list became a top-layer popover. Behaviour changed.            |
  | `menu`   | 0.3.4 | 0.3.5  | The RTL panel fix. A bug fix, so a patch.                            |
  | `theme`  | —     | 0.1.0  | New package.                                                      |
  Pre-1.0 rule from `AGENTS.md`: a minor bump is a breaking change, a patch is
  a bug fix.
- **The published 0.5.0 of `@rivinia/select` had MORE public API than the
  local source** — it was built from the 0.5.0 branch, while the work
  continued on the 0.4.2 base. Publishing the local source as-is would have
  REMOVED `computeSelectPosition`, `SELECT_GAP`, the position types and
  `setValue`/`setValues` from the public surface. They were restored before
  the release, and the position helper is exported under its 0.5.0 name
  (`computeSelectPosition`, `SELECT_GAP`, `PanelCoordinates`, `PanelSize`,
  `SelectPlacement`, `TriggerRect`, `ViewportSize`), so 0.6.0 is a strict
  superset of 0.5.0 rather than a regression.
- **A toast now floats above a modal dialog.** The list is a manual popover,
  so it is in the browser's top layer — the layer a `<dialog>` uses — and it is
  re-shown whenever its contents change, because the top layer stacks in the
  order elements are SHOWN. Measured: the element at the toast's position is
  the toast, not the dialog.
  - The popover's **user-agent styles are reset** (background, border, padding,
    `overflow`). Left alone they put a shared canvas and a scrollbar around the
    stack, so five toasts read as one block.
  - Two traps found by measuring, not by reading: `showPopover()` on an
    element that is not a popover yet throws `NotSupportedError`, so the
    attribute is set imperatively as well as by the binding; and
    `inject(ElementRef)` in a component yields the HOST element, so the
    popover has to be the panel — a `viewChild` — not the host.
- **The dialog** gained a per-instance `size`, a `coversOthers` flag, a
  `loadingOf` loader, responsive `clamp()` presets, a `data-caller` attribute
  naming the component that opened it, a box transition, and a view transition
  for the stack change.
- **The select** gained the DI helpers (`provideRiviniaSelect` /
  `injectRiviniaSelect`), frozen registered options, `optionTemplate`,
  `listTemplate`, `loading`, `reachEnd`, a footer slot, and a single
  `--rv-select-popup-animation` token.
- **The consumer app** stopped masking unexpected errors: only an
  `HttpErrorResponse` becomes an `ApiError`; anything else is reported
  through Angular's `ErrorHandler` — which the app replaced with one that
  logs AND shows a toast — and then rethrown. Its `<rv-toast-list>` also had
  no `[manager]`, so **no toast had ever appeared in that app**; that was
  found while wiring the error handler, and fixed.
- Gates: all eight packages build; 70/70 select, 32/32 menu, 53/53 modal,
  35/35 toast; every tarball inspected (exports, types, peers, sideEffects,
  file list) with **zero runtime imports** beyond the declared peers; the
  tarballs installed into a consumer as real npm packages and built.
- **Not published** — the tarballs are in `pack/` and await the user's
  explicit confirmation (name, version, access, file list), per `AGENTS.md`
  gate 7 and D05.
