## 2026-10-12 — D02: Confirmed stable APIs usable in libraries

- `@Service()` — stable, exported from `@angular/core` (verified in installed `core.d.ts`).
  Default for root singletons; `@Injectable` retained for ctor-DI / non-root scopes.
- `injectAsync` — stable since v22.0, with `prefetch: onIdle`. For async DI boundaries.
- Signal Forms — stable via `@angular/forms/signals` + `/compat` (verified exports
  in `@angular/forms@22.2.2`). Classic Reactive Forms remain supported, not deprecated.
- Impact: libraries may depend on these without an experimental-risk note.
