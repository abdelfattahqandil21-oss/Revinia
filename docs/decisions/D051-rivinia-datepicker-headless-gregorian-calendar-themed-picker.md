## 2026-10-25 — D51: `@rivinia/datepicker` — headless Gregorian calendar + themed picker

- Context: the ecosystem had no date primitive. The brief: Arabic and English,
  LTR and RTL, Gregorian dates, configurable output formats, the Rivinia theme,
  headless core plus ready-made UI — specs first, then implementation.
- **The core is `Date`-free**, except the two functions that must cross the
  local-time boundary (`todayDate()`, `toLocalDate()`). Days are integer
  `{year, month, day}` values and all movement is civil-calendar arithmetic
  (Hinnant's days-from-civil), so no timezone or DST can shift a date.
  - `toLocalDate` builds `new Date(2000, m - 1, d, 12)` and then
    `setFullYear(year)`: a two-digit year passed to the constructor maps to
    1900+ (`formatYear(locale, 5)` returned `1905`, measured), and noon keeps
    a ±12h zone shift from changing the day.
- **Formatting**: one `format` input, two modes.
  - A style keyword (`short|medium|long|full`) maps to `Intl.DateTimeFormat`'s
    `dateStyle` — date only. Measured: en-US short `10/25/26`, medium
    `Oct 25, 2026`; ar-EG medium `٢٥‏/١٠‏/٢٠٢٦`, long `٢٥ أكتوبر ٢٠٢٦`.
  - A pattern (`MM-dd-yyyy`, `dd/MM/yy`, …) is parsed and formatted per token
    through `Intl` parts. **Case-insensitive, width is the letter count**;
    `mm` is month. Time letters (`h,H,k,K,s,S,a,A,X,Z,z,O,v,V,b,B`) throw a
    date-only error instead of being silently dropped; `ddd` throws with an
    "use EEEE" hint. Non-ASCII letters are literals; `''` escapes a quote.
  - **`DatePipe` rejected, measured reasons**: its four presets all include
    time; its pattern letters include time (so `dd/MM/yyyy` is ambiguous);
    it does not produce Arabic-Indic digits; its bidi marks vary by locale.
    The library inserts no invisible marks the formatter did not emit —
    `Intl`'s output is authoritative.
  - The calendar is pinned to `-u-ca-gregory` by rewriting the locale's
    Unicode extension key/value pairs (a regex broke
    `ar-SA-u-ca-islamic-umalqura`, whose calendar value spans two subtags).
    **Measured: `ar-SA` formats as Gregorian here** (no default Hijri), so the
    Hijri seam test pins the opposite direction explicitly:
    `ar-SA-u-ca-islamic-umalqura` renders ١٤٤٨ unpinned and ٢٠٢٦ pinned.
    A Hijri GRID is out of scope for 0.1.0; the formatting seam is the hook.
  - Formatters are cached (bounded Map, 40 entries): a day view asks for 42
    day labels plus 7 weekday names per render.
- **Week start** comes from CLDR via `Intl.Locale.getWeekInfo()`, then the
  legacy `weekInfo`, then ISO Monday. Measured: `en-US` 7/[6,7], `en-GB` 1,
  `ar-EG` 6/[5,6], `ar-SA` 7/[5,6], `he` 7/[5,6], `fa` 6/[5], `fr` 1.
- **RTL mirrors the horizontal arrows and nothing else.** In a right-to-left
  grid the next day is drawn to the left, so `ArrowLeft` moves FORWARD and
  `ArrowRight` moves BACK; Up/Down, Home/End, PageUp/Down and Shift+Page are
  never mirrored. Direction is read at keydown from the nearest `[dir]`
  attribute first, then `getComputedStyle(...).direction` (jsdom does not
  inherit computed direction).
- **The component follows the ecosystem's form contract**: `value` is a
  `model()`, so it satisfies `FormValueControl` (the documented Angular 22
  interface `@rivinia/select` already implements) and `touch` is the touched
  protocol. A `ControlValueAccessor` was tried first and removed: Angular 22
  auto-detects any component with a `value` input + `valueChange` output as a
  custom control (measured in `initializeCustomControlStatus`), so with a plain
  input the CVA was dead code and `touched` never fired; with
  `NG_VALUE_ACCESSOR` the classic path won but Signal Forms' `[formField]`
  would have had no model signal. `valueChange` belongs to the model and emits
  only when the value really changes; a form writing the value in does not echo
  (model input writes go through `inputSignalSetFn`, verified in core).
  `touch` fires when the panel closes (a pick returns focus to the trigger, so
  a focusout would never happen) and when focus leaves the host.
  `@angular/forms` stays a peer because the published `.d.ts` imports
  `FormValueControl` from `@angular/forms/signals`; the FESM imports no forms
  code at all.
- **State**: `rv-datepicker` provides its own `RiviniaCalendar`, so two pickers
  never share a focused day; `rv-calendar` owns no state and takes the service
  as an input (D06 input composition). The panel is non-modal, uses the top
  layer where available (`popover="manual"` + CSS anchor positioning with
  logical keywords) and an absolute fallback elsewhere; Escape closes and
  restores focus, an outside pointerdown closes without stealing focus (D36).
- **Packaging, and a D06 exception**: the UI entry imports the core through the
  **package specifier** `@rivinia/datepicker`, not a relative path, because the
  UI genuinely needs the service and the pure helpers. ng-packagr accepted it
  (D06's TS6059 problem was relative cross-entry imports). Exports map: `.`
  and `./ui` only. Dist FESM imports: core → `@angular/core`; UI →
  `@angular/core` + `@rivinia/datepicker`. Zero `tslib` imports. Tarball:
  8 files (the D20 injected dependency entry is expected).
- **Three defects that only a real browser exposed** (jsdom has no layout and
  does not forward label clicks):
  1. **The panel filled its anchor area.** `position-area: block-end
     span-inline-end` makes an auto-width box span from the anchor's
     inline-start to the containing block's inline-end — measured 1006px for a
     290px trigger. `width: max-content` is not an escape hatch: the day grid
     is `inline-size: 100%`, so max-content is cyclic (measured 1,000,018px).
     Fixed with an explicit token width (`--rv-datepicker-panel-width`,
     19.25rem = 7 × 2.5rem cells + gaps + panel padding) capped by
     `max-inline-size`. Measured after: 308px, 0px offset from the trigger in
     LTR and RTL, 4px gap.
  2. **A `<label>` around the picker re-opened the panel after every pick.**
     Clicking inside a label makes the browser forward a synthetic click to
     the label's control — the trigger — so `toggle()` ran right after
     `closePanel()` (measured with a click-event trace: two clicks, the second
     targeting the button). The panel now cancels the default action of its own
     clicks; measured fix: inside a label, picking closes the panel and updates
     the value. The README documents the sibling-label markup as the clean
     option, and a new `label` input puts the field name into the trigger's
     accessible name ("Departure: ٢٥/١٠/٢٠٢٦").
  3. **The popover margin reset killed the gap.** `.rv-datepicker-panel[popover]
     { margin: 0 }` and the placement rule have the same specificity, so the
     gap was restored in a later `@supports` rule of the same specificity.
     Measured 4px below and 4px above after flipping.
- **A repo-level lesson, recorded because it cost a cycle**: in Angular 22's
  zoneless test host, mutating a PLAIN field and calling
  `fixture.detectChanges()` does not update a binding — a signal does. Four
  "RTL is behaving like LTR" failures were the test host, not the library.
- Verified: **380/380 unit tests (11 files)** — core date math, week info,
  styles, patterns, month grid, key intents, the service, calendar UI,
  datepicker UI, reactive + template-driven forms, and the published export
  surface; `ng build datepicker` (both entry points); tarball inspected
  (exports/types/peers/sideEffects/files/FESM imports); installed into a fresh
  Angular 22 app created for this check and built in production
  (**215.32 kB raw / 59.73 kB transfer**); and the real-browser run (Chromium,
  production and dev builds) covering the popover path, the 308px panel,
  the 4px gap, RTL alignment and arrow direction, flipping above at the
  viewport edge, picking inside a `<label>`, and focus returning to the trigger.
- NOT published. Version **0.1.0** (new package). Deliberately out of scope,
  each additive: a typed input with segments, range selection, presets, time,
  a Hijri grid, pattern PARSING, year-view virtualisation.
