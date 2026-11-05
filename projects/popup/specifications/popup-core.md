# `@rivinia/popup` core specification

**Owner:** Rivinia maintainers
**Purpose:** define the smallest shared, headless module for popup positioning and dismissal used by Select and Menu.
**Status:** approved extraction groundwork; owner approved synchronized release-group membership, while release remains out of scope. See [D95](../../../docs/decisions/D095-popup-core-extraction-after-the-1-0-final.md) and [D86](../../../docs/decisions/D086-no-popup-dedupe-before-1-0-a-conformance-suite-instead.md).

## Scope

Move only generic popup mechanics whose behavior is equivalent in the two hosts:

- Pure trigger/panel/viewport position calculation, logical start/end alignment, vertical flip, edge clamping, and the `flipped` result.
- Per-open outside-pointer and outside-scroll dismissal, the S4 height-only resize exemption for an editable inside the panel, and listener cleanup.
- Small browser-capability/SSR-safe helpers only when both hosts use the same rule.

Keep templates, CSS and anchor-positioning declarations, trigger and panel selectors, row ARIA roles, row data and state, controllers, keyboard routing, typeahead, focus entry, focus restoration, and each host's size policy in Select/Menu. CSS anchor support remains guarded in each package's own stylesheet and tested by the existing conformance/CSS suites. No Select, Menu, Theme, or i18n public export or contract changes.

## Minimal public interface

One package entry point, `@rivinia/popup`, with two capabilities:

1. `computePopupPosition(input)` is a pure function. `input` carries trigger rect, panel size, viewport size, placement (`top|bottom` × `start|end`), explicit direction, and optional gap. It returns viewport `left`, `top`, and `flipped`. It reads no DOM or host/computed direction and has no mutable state.
2. `bindPopupDismissal(destroyRef, options)` binds the agreed outside-pointer, outside-scroll, and S4 resize rules for one host. `options` supplies that host's `Document`/`Window` (nullable for SSR), host and panel lookup, an editable-focus predicate, and a dismissal callback. Width-at-open state is local to this binding. Cleanup is registered to the supplied Angular `DestroyRef`.

The host supplies its own DOM lookups and callback; the core owns no selectors, component state, templates, styles, or global registry. These two surfaces cross the same public entry-point seam for host calls and tests.

## Dependency and runtime rules

- `@angular/core` is the sole peer dependency, used for `DestroyRef`; no Angular framework package is a runtime dependency. Do not import `@angular/common`, Select, Menu, Theme, or any UI package.
- `sideEffects: false`; no CSS, HTML, generated styles, or module-level mutable state.
- Do not read `window`, `document`, `HTMLElement`, or computed styles at module evaluation. A null browser context binds no listeners; DOM work runs only when a host provides browser objects.
- State belongs to each `bindPopupDismissal` call and that host's `DestroyRef`. Two installed copies therefore cannot share or corrupt popup state.
- No secondary entry points are justified. Add one only after a consumer need is demonstrated.

## Package consumption and release

`@rivinia/select` and `@rivinia/menu` declare `@rivinia/popup` in regular `dependencies`, never `peerDependencies`; installing either consumer must install the core automatically. Add `@rivinia/popup` to each consumer's ng-packagr `allowedNonPeerDependencies`, then prove the exact tarballs include valid dependency metadata and runtime imports. Core has no dependency on either UI package, and imports cross packages only through public exports; there are no cycles.

The `rivinia-1.0` synchronized group contains Menu, Select, Theme, and i18n at their current `1.0.0-rc.3` versions; Popup joins the approved group but remains `0.0.0` during development. Align it only at release; do not alter any existing version. No package is published by this task. Introducing the new runtime capability uses a synchronized minor bump; a dependency metadata-only change with no new capability may be a patch (see SemVer FAQ and D95).

## Differences preserved for owner review

The inventory found behavior that is not interchangeable. Do not unify either host behavior during extraction: pointer-open initial focus, direction source and CSS anchor alignment, trigger-width sizing in the Select JS fallback, key ownership/defaultPrevented routing for projected controls, focus restoration after picking, and Menu's WebKit focus reseating. Phase 2 characterization tests lock each package's existing behavior before moving any logic. The detail and source locations are in the private task record.
