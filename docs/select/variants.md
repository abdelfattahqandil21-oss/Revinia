# @rivinia/select — variants

Back to [the README](../../projects/select/README.md) ·
[theming](theming.md) · [the API](api.md)

One input picks the skin. Nothing else about the component changes — same
controller, same keyboard contract, same ARIA.

```html
<rv-select [options]="options" variant="premium" />
```

| Value       | What you get                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------ |
| `'simple'`  | The default. The pre-variant skin, unchanged — including its 160ms entrance. The flag changes nothing. |
| `'premium'` | A slower, softer entrance, layered shadow, thin styled scrollbar, hover/active wash, loading skeleton. |

`<rv-select>` forwards its own value to the panel it builds (`select-panel.html:7`),
so a custom `listTemplate` inside it still gets the premium chrome.
`<rv-select-popup>` is the panel primitive and takes the same input
(`select-popup.ts:199`), but it is internal — the select is its only caller;
drive the [headless controller](headless.md) instead if you need your own markup.

The value lands on both hosts as `data-variant` (`select-panel.ts:85`,
`select-popup.ts:184`), and every premium rule is scoped under
`[data-variant='premium']`. There is no branch in the component logic and no
extra work when the flag is off — the browser matches a selector or it does not.

## What premium actually does

- **Entrance, 250ms.** Both skins animate in; premium retunes the shot — 250ms on
  `cubic-bezier(0.22, 1, 0.36, 1)`, rising 4px from `scale(0.97)`, where simple
  keeps the original 160ms / 6px / `0.96` (`select-popup.css:440-444`). On a
  `top-*` placement the travel flips to 4px below rest
  (`select-popup.css:470-473`). Tune with `--rv-select-popup-duration`,
  `--rv-select-popup-easing`, `--rv-select-popup-from-scale`,
  `--rv-select-popup-from-y`.
- **No exit animation, by design.** The panel is a real top-layer element; a
  closing animation would keep it over the page swallowing clicks, hand
  `panelReady` a node that the virtualiser is about to lose, and let the next open
  latch onto the leaving element. Close is instant.
- **Rows.** Hover washes in at 150ms, out at 250ms (`select-popup.css:476-481`);
  the keyboard-active row sits one step stronger
  (`select-popup.css:483-489`).
- **Scrollbar.** `scrollbar-width: thin` and `scrollbar-color` on the panel
  (`select-popup.css:467-468`). These are the standard properties — the
  `::-webkit-scrollbar` pseudo-elements are ignored by Chromium as soon as
  `scrollbar-color` is set, so the library ships only the standard pair. The
  actual width is the OS's call: 8–12px on Chromium, overlay on macOS, always
  visible on Windows.
- **Loading row.** While `[loading]="true"` the row shows three shimmering bars
  next to `loadingLabel` (`select-panel.html:139`, widths 100/64/73% at
  `select-panel.css:415-433`). They are static under
  `prefers-reduced-motion: reduce` (`select-panel.css:450-452`). The markup is
  in the loading row in every skin; only premium paints it — `.rv-select-skeleton`
  is `display: none` by default (`select-panel.css:398`).
- **Search and trigger.** A `0 1px 2px` resting shadow and a 14%-foreground
  border on the trigger (`select-panel.css:148-157`), a search field that is a
  quiet inset wash rather than a bordered box (`select-panel.css:312-315`), and a
  chevron that rotates over 250ms on the same curve (`select-panel.css:236-238`).

Every value above resolves through the same token chain as the rest of the
library — each premium declaration is a `var()` fallback, so a `--rv-select-*` or
`--rv-*` you already set still wins and the two skins can never fight: exactly
one selector matches.

```css
:root {
  --rv-select-trigger-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  --rv-select-popup-shadow: 0 24px 48px rgba(0, 0, 0, 0.3);
  --rv-select-popup-duration: 180ms;
}
```

Selected rows carry `data-selected="true"` in both skins
(`select-panel.html:83`) — a hook for your own styling, with no paint of its own
(the check mark already reads as selected).

## Cost

Measured on the packed tarball, for shipping both skins: **+801 B brotli /
+1,292 B gzip** on the `@rivinia/select/ui` chunk, **0 B** on the headless
`@rivinia/select` entry point. The full measurement, including the per-file
breakdown and what a consumer pays over the wire, is in
[`projects/select/specifications/select-variants.md`](../../projects/select/specifications/select-variants.md)
§8 "Budget" and [`docs/DECISIONS.md`](../DECISIONS.md)
D78.

## Further reading

- [Theming and the override surface](theming.md) — every `--rv-select-*` name,
  both skins.
- [Theming every Rivinia component](../theming.md) — the cascade, the three
  levels, light and dark.
- [The API](api.md) — `variant` in the input table, `RiviniaSelectVariant` in the
  shapes.
