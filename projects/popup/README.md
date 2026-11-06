# @rivinia/popup

Headless popup positioning and dismissal mechanics shared by Rivinia UI packages.
This package contains no popup markup, styles, focus policy, or component state.

## Position calculation

`computePopupPosition` calculates viewport coordinates from trigger and panel
geometry. The host supplies direction explicitly, so applications can retain
their own direction source.

```ts
import { computePopupPosition } from '@rivinia/popup';

const position = computePopupPosition(
  { left: 24, top: 40, width: 160, height: 36 },
  { width: 220, height: 180 },
  'bottom-start',
  { width: window.innerWidth, height: window.innerHeight },
  'ltr',
);
```

The result contains `left`, `top`, and whether vertical placement flipped.
Coordinates are clamped to the viewport edge inset. `POPUP_GAP` and
`POPUP_EDGE_INSET` expose the default geometry constants.

## Dismissal binding

`bindPopupDismissal(options, destroyRef)` attaches outside-pointer, scroll,
and resize listeners for one open popup host. The caller supplies the browser
`document` and `window` (or `null` during server rendering), host and panel
lookups, the editable-focus predicate, and a dismiss callback. The binding
cleans up listeners through Angular `DestroyRef` and the optional effect
cleanup callback. Null browser objects make it a no-op, keeping the helper
safe during SSR.

The host remains responsible for open state, focus movement and restoration,
keyboard ownership, event cancellation, row semantics, styling, and sizing.
Select and Menu intentionally retain their different behavior policies.

## Compatibility

Package version: **1.0.1**. This is the first public release of the
shared popup core. See the [core specification](https://github.com/abdelfattahqandil21-oss/Revinia/blob/popup/v1.0.1/projects/popup/specifications/popup-core.md)
and [release notes](https://github.com/abdelfattahqandil21-oss/Revinia/blob/popup/v1.0.1/projects/popup/CHANGELOG.md). The
[release policy](https://github.com/abdelfattahqandil21-oss/Revinia/blob/popup/v1.0.1/docs/engineering/VERSIONING.md)
describes synchronized package versioning.


This package belongs to the `rivinia-1.0` synchronized release group, whose eleven packages share one version.
