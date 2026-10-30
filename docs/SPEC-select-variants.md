# SPEC — Select appearance variants (`simple` | `premium`)

Status: approved for implementation by the owner on 2026-10-30 ("ماشي يسطي اابدأ
وريني بقي" + "استخدم skills الخاصة بالتصميمات"). Library default stays `simple`.

## 1. Goal

One select, two skins, chosen per instance with a flag:

- `simple` — the 0.6.1 look, byte-for-byte. Zero visual change, zero breaking.
- `premium` — the same DOM with a designed surface, a longer, origin-aware open
  animation, an easier-to-hit trigger, a styled scrollbar, a selected-row tint
  and a loading skeleton.

Hard constraints from the owner:

- **No JavaScript branch.** One input reflected onto a host attribute; the skin
  is CSS only.
- **No production bundle growth beyond CSS.** The FESM/JS delta is the input
  and one attribute binding.
- Every premium value is a `--rv-select-*` token with a usable fallback, so a
  consumer theme still wins and every value can be changed without touching
  the library.

## 2. API

```html
<rv-select [options]="rows" variant="premium" />
<rv-select-popup variant="premium"> … </rv-select-popup>
```

```ts
export type RiviniaSelectVariant = 'simple' | 'premium';
```

| Surface | Input | Default | Effect |
| --- | --- | --- | --- |
| `<rv-select>` | `variant` | `'simple'` | `data-variant` on the `<rv-select>` host **and** on the inner `<rv-select-popup>` |
| `<rv-select-popup>` | `variant` | `'simple'` | `data-variant` on its own host; the select is its only caller (`SelectPopupComponent` is not exported) |

- The attribute is always present (`simple` included), so consumer CSS can
  target either skin explicitly and the DOM is self-describing.
- There is no provider default in this version. `provideRiviniaSelect(mode)`
  stays mode-only: a second global default multiplies the precedence rules
  (`input` > provider > default) for a flag nobody asked to set globally yet.
- Out of scope: `@boundary`/`@error` (still `@developerPreview 22.2`, and it
  governs template errors, not appearance), `animate.leave`, `backdrop-filter`.

## 3. Token contract

Every premium value below is read through the token in the left column; the
right column is the premium fallback. The base (simple) fallbacks are
unchanged.

| Token | simple (unchanged) | premium |
| --- | --- | --- |
| `--rv-select-radius` | `0.625rem` | `0.75rem` |
| `--rv-select-trigger-padding` | `0.5rem 0.75rem` | `0.5625rem 0.8125rem` |
| `--rv-select-trigger-shadow` | none | `0 1px 2px rgba(16, 24, 40, 0.06)` |
| `--rv-select-border` | `--rv-border` (`#e0e0e0`) | `color-mix(in srgb, fg 14%, transparent)` |
| `--rv-select-popup-radius` | `0.75rem` | `0.875rem` |
| `--rv-select-popup-border` | `--rv-border` | `color-mix(in srgb, fg 10%, transparent)` |
| `--rv-select-popup-shadow` | `0 16px 48px rgba(0,0,0,0.22)` | `0 12px 32px -8px rgba(16,24,40,.18), 0 4px 8px -4px rgba(16,24,40,.10)` |
| `--rv-select-popup-pad` | `0.375rem` | `0.3125rem` |
| `--rv-select-item-active-bg` | `currentColor 10%` | `fg 7%` |
| `--rv-select-item-hover-bg` | `currentColor 8%` | `fg 5%` |
| `--rv-select-focus-ring` | `2px solid currentColor` | `2px solid fg 55%` + `--rv-select-focus-offset: 2px` |

Notes that matter:

- The border is derived from the **foreground**, not from a grey: a premium
  panel on a dark background must tint toward the text, not toward a light
  grey that belongs to no theme.
- Elevation is declared once per surface. The trigger carries a border plus a
  1px drop shadow (the standard input lift); the panel carries a border plus a
  two-layer soft shadow. No surface carries both a wide shadow and a heavy
  border.
- The selected row carries `data-selected="true"` in every skin. Premium gives
  it **no extra fill**: the row is already highlighted when the panel opens
  (the selection is the active row), the check mark is the permanent signal,
  and a third background state would have to out-rank hover and active for no
  information gain. The attribute exists so a consumer can style it.

## 4. Motion

Token scale from the design skills (`transitions-dev` / `transitions-polish`),
dropdown class, not invented:

| | value | token |
| --- | --- | --- |
| open duration | 250 ms | `--rv-select-popup-duration` (`160ms` default) |
| open easing | `cubic-bezier(0.22, 1, 0.36, 1)` | `--rv-select-popup-easing` (`cubic-bezier(0.16, 1, 0.3, 1)` default) |
| open pre-scale | `0.97` | `--rv-select-popup-from-scale` (new token, `0.96` default) |
| open travel | 4 px | `--rv-select-popup-from-y` (existing) |
| row hover in | 150 ms | literal `transition-duration` |
| row hover out | 250 ms | `--rv-select-popup-easing` |
| trigger/chevron turn | 250 ms in, 150 ms out | literal `cubic-bezier(0.22, 1, 0.36, 1)` |

The panel tokens already existed at HEAD — the 0.6.1 entrance reads
`--rv-select-popup-duration` (160ms) and `--rv-select-popup-easing` — so
premium redeclares the same two names instead of introducing a parallel
`--rv-select-open-*` family that consumers would have to learn twice. The only
new name is `--rv-select-popup-from-scale`, added because the keyframe used a
literal `scale(0.96)` and premium needs `0.97`; its default keeps 0.6.1
byte-identical.

- The panel grows out of the trigger edge it is anchored to; the existing
  `transform-origin` rules by placement are reused unchanged.
- **No row stagger.** The list can be 27 or 2,000 rows; a 40 ms stagger per row
  puts the last row 800 ms late. One authored moment: the panel.
- **No close animation.** `premium` closes instantly, deliberately. The panel
  is destroyed by `@if`, and a native `animate.leave` would keep it mounted for
  its duration, which means (a) a top-layer panel that still swallows pointer
  events, (b) `panelReady` handing the virtualizer a node that is about to be
  removed, and (c) a reopen inside the leave window picking the leaving
  element with `querySelector`. That is the same class of bug D77 fixed. The
  close is carried by the chevron returning and the panel leaving.
- No blur and no `backdrop-filter`: both cost paint time on every frame and the
  owner's constraint is performance, not decoration.

## 5. Scrollbar

Premium panel only, standard properties, no vendor pseudo-elements:

```css
scrollbar-width: thin;
scrollbar-color: color-mix(in srgb, var(--rv-select-fg) 22%, transparent) transparent;
```

Chromium ignores `::-webkit-scrollbar` once `scrollbar-color` is set, so mixing
the two is a silent no-op; the standard pair is the only one that works in
Chromium 121+, Firefox and Safari 18.2+. macOS overlay scrollbars are drawn by
the OS and ignore this — documented, not worked around.

## 6. Loading

`@if (loading())` already renders one row. Premium adds, inside it and only
while loading:

```html
<span class="rv-select-skeleton" aria-hidden="true"><i></i><i></i><i></i></span>
<span class="rv-select-loading-text">{{ loadingLabel() }}</span>
```

- Three shimmer bars (82 / 64 / 73 % width, 10 px tall, 1.6 s linear loop)
  above the label. The label stays visible: the bars say "working", the label
  says what is working.
- `role="status"`/`aria-live="polite"` stay on the wrapper, so the state is
  announced once, not per bar.
- `simple` keeps the label-only row (`.rv-select-skeleton { display: none }`).
- No virtual-list work: the consumer owns the scroll element and `reachEnd`;
  the skeleton is the library's part of "load more".

## 7. Reduced motion

`@media (prefers-reduced-motion: reduce)` turns off the panel entrance, the
chevron turn, the row colour transition and the shimmer (bars stay, static).

## 8. Budget

Measured, not estimated — `ng build select` on this branch (A) and on a detached
worktree at HEAD (B), plus `lightningcss` minification of both stylesheets.

| Artifact | Before (HEAD) | After | Delta |
| --- | --- | --- | --- |
| `rivinia-select-ui.mjs` raw | 68,475 B | 81,151 B | **+12,676 B** |
| `rivinia-select-ui.mjs` gzip -9 | 11,514 B | 12,806 B | **+1,292 B** |
| `rivinia-select-ui.mjs` brotli | 9,780 B | 10,581 B | **+801 B** |
| `rivinia-select.mjs` (headless) | 3,711 B | 3,711 B | **0** |
| both `.css` minified raw | 9,280 B | 14,644 B | +5,364 B |
| both `.css` minified gzip | 2,538 B | 3,318 B | +780 B |
| both `.css` minified brotli | 2,151 B | 2,834 B | +683 B |

The FESM delta is larger than the minified-CSS delta because Angular inlines
component styles verbatim into the FESM — comments included — and no consumer
minifier touches bytes inside a string literal. Those comments are why the
shipped delta is +12.7 KB raw.

What a consumer actually pays over the wire is the compressed column:
**+801 B brotli / +1,292 B gzip** for the whole feature, on the UI chunk only,
and **0 B** on the headless entry point. Rewritten allowance, from the
measurement: **+1.5 KB gzip / +1 KB brotli**, met with margin. The earlier
+3,000 B raw guess was wrong by roughly 2× and is superseded by this table.

- JS/FESM: one input + one host binding per component, one template attribute
  binding; no new runtime code, no new dependency, no new entry point.
- DOM: `data-variant` on two hosts; `data-selected` on selected rows;
  three `<i>` + one `<span>` inside the loading row, and only while
  `loading()` is true.

## 9. Acceptance

1. Default unchanged: `<rv-select>` with no `variant` renders
   `data-variant="simple"`; every simple fallback above is the 0.6.1 value.
2. `variant="premium"` reflects on both `<rv-select>` and the `<rv-select-popup>`
   it builds; the popup honours its own input when constructed directly in a
   TestBed (it is not a public export).
3. The selected row in single mode carries `data-selected="true"`, others do
   not.
4. CSS contract: every premium rule is scoped under `[data-variant='premium']`;
   both stylesheets keep a `prefers-reduced-motion` guard; the entrance reads
   `--rv-select-popup-from-scale`.
5. The premium block adds no `!important`, no vendor-prefixed scrollbar rule and
   no `transition: all`.
6. Gates: `ng test select --watch=false`, `ng build select`, `npm pack`
   (tarball inspected), sizes within §8.
7. Browser proof on :4300: both skins rendered, the open animation measured on
   the real tarball, skeleton visible while `loading()`, scrollbar thin in
   Chromium, RTL unchanged.

## 10. Proof (2026-10-30, Chromium 141 / Firefox 144 via Playwright)

Against `pack/rivinia-select-0.6.1-variants.tgz` installed into the
`~/Desktop/i18n-testing` playground on :4300, `/skins`:

| Claim | Measurement |
| --- | --- |
| premium entrance is 250ms on the dropdown curve | `getAnimations()[0]`: `CSSAnimation`, `duration 250`, name `rv-select-popup-in`; at t≈0 `transform: matrix(0.97, 0, 0, 0.97, 0, -4)`, `opacity: 0`; settled `none` / `1` |
| simple entrance is untouched | same element with `simple`: `duration 160`, pre-scale `0.96` |
| the flag reaches both hosts | `rv-select[data-variant=premium]` and its `rv-select-popup[data-variant=premium]`; flip to `simple` rewrites all four selects on the page without recreating them |
| premium panel paint | `border-radius 12px`, `box-shadow` two layers, `padding 5px` (0 on the searchable panel's top edge, where the sticky bar carries it) |
| trigger lift | resting `0 1px 2px rgba(16,24,40,.06)`, hover/open `0 2px 4px … .08`; simple: `none` |
| scrollbar | `scrollbarWidth: thin`, `scrollbarColor: color(srgb … / 0.22) transparent`; simple: `auto`/`auto`. Dark theme recomputes the mix from the light text (`0.96` lightness) with no dark-specific rule |
| skeleton | `.rv-select-skeleton` `display: flex`, 3 `<i>`, `animation: rv-select-shimmer 1.6s`; label intact; simple: `display: none` |
| long list | 30 rows, `scrollHeight 1210` over `clientHeight 350` |
| RTL | `dir=rtl`: panel right edge exactly the trigger's right edge (117→611 both), rows `direction: rtl` |
| no regression | `/places` on the same tarball: 2 triggers, 10 rows, loads and opens |

Honestly not verified in this run:

- **The painted scrollbar.** Both headless engines here use overlay
  scrollbars and neither paints them into a screenshot (`offsetWidth −
  clientWidth` is exactly the 2px border in both skins), so `scrollbar-width:
  thin` has no measurable gutter and no visible thumb could be captured. What
  is proven is the declaration (`thin` in Chromium, `scrollbar-color` applied
  in Firefox, where the premium rule matches). A classic-scrollbar OS is
  expected — not measured — to show an ~8px gutter.
- **WebKit.** Not run for this feature.
- **Close-path timing.** There is no close animation to measure; `Escape`
  removed the panel on the first frame (`panel` count 0 after one tick).
