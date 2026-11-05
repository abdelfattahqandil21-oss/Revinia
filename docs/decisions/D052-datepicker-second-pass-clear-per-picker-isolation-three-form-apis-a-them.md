## 2026-10-25 — D52: datepicker second pass — clear, per-picker isolation, three form APIs, a theme input, and one width

- Context: after D51 the user tested the package and reported four concrete
  things: a date cannot be cleared; two adjacent pickers behave as ONE (opening
  a second must not leave two panels); only one form system was demonstrated;
  and the light/dark theme must be reachable from the public API. The panel also
  had to respect the parent's width and keep a minimum width.

- **Two pickers, one panel — reproduced, then fixed.** Before the fix, opening
  the second picker by KEYBOARD (Enter on its trigger) left both panels open in
  Chromium. A pointer-only fix would have missed it: keyboard activation emits
  no pointer event, so the outside-pointer close never runs.
  - Fix: `DatepickerPanelRegistry`, a root service in the UI entry (internal —
    no export, no public name), with `claim(handle)` / `release(handle)`; the
    opening picker claims, the loser is closed with `closeForAnotherPanel()`,
    `DestroyRef` always releases.
  - Measured after: keyboard-open the second → one panel, the second; pointer
    open the third → one panel, the third; Escape → focus returns to the third
    trigger; `panels: 1` at every step in both dev and production builds.
  - Auto-close emits `touch` (the user's interaction with the first field did
    end) but never restores focus (the user is now in another field).

- **Clear.** Opt-in, because a required date must not present a button that
  makes it look optional: `clearable` in `provideRiviniaDatepicker(...)` and as
  an input; an unbound input takes the config. A real `<button>` inside the
  field, after the trigger, visible only while a value exists and the picker is
  enabled.
  - Clearing sets `null`, emits `valueChange(null)`, emits `touch`, closes an
    open panel, and returns focus to the trigger — the button disappears with
    the value, so focus must not stay on a removed node.
  - Accessible name includes the field: `Departure: Clear date`;
    `المغادرة: مسح التاريخ` in Arabic (measured in the browser).
  - One focus ring for the whole field: `:focus-within` on the wrapper; the
    trigger and the clear button draw none of their own, so keyboard and mouse
    produce the same visual and there is no box-in-a-box.

- **Signal Forms join reactive and template-driven.** The component already
  satisfied `FormValueControl` (`value` model + `touch` output, D51); this pass
  proved all three in the same consumer application: a reactive
  `FormControl<RiviniaDate | null>`, `[(ngModel)]`, and the new
  `form()` + `[formField]` API. Picking a day in the Signal Forms demo wrote
  `Monday, 12 October 2026`; `ngModel` wrote `2026-10-20`; the reactive clear
  set `null` and `touched: true`. No second code path exists for forms.

- **A theme input, not a stylesheet swap.** `theme: 'auto' | 'light' | 'dark'`
  in the provider config and as an input (input wins; an unbound input keeps the
  config). The host mirrors it as `data-theme`, so a theme layer that maps
  `[data-theme='dark']` reaches the picker.
  - `light`/`dark` set `color-scheme` on the host; `auto` declares NOTHING and
    inherits the page's scheme — no forced scheme, the D46 rule.
  - The built-in palette is `light-dark()` read at the use site, never declared
    on the host, so `--rv-*` tokens still win. Measured in the browser:
    auto/light `rgb(255,255,255)` / `rgb(17,17,17)`; dark `rgb(24,24,27)` /
    `rgb(244,244,245)` with the selected day `rgb(139,139,240)`; and a custom
    token pair produced `rgb(240,253,250)` / `rgb(15,61,58)` with
    `data-theme="auto"`.

- **One width, measured rather than reasoned.** The first implementation put
  `min-inline-size: min(11rem, 100%)` on the field inside a shrink-to-fit
  inline-block host; Chrome collapsed it to the content width — measured
  **132px**, not 176px. A `min-width` plus `max-width: 100%` cannot both hold
  (the minimum wins and overflows — the D47 lesson), so the field takes ONE
  definite width and lets the cap win:
  - host: `inline-size: var(--rv-datepicker-width, 11rem)`,
    `max-inline-size: 100%`;
  - field: `inline-size: 100%` of that width.
  Measured in Chromium: default field **176px**, panel **308px** (the floor);
  a 25rem block field **400px** → panel **400px** with the calendar still
  **308px**, centred (x=302 inside a 256–656 panel); a 7rem cell → field
  **112px**, overflow **0**; RTL field **224px** (a 14rem override), panel
  **308px**, end-aligned, **4px** gap; a 380px viewport → panel **308px** at
  x=32..340, inside the viewport.
  - Panel rules are unchanged in shape: `max(100%, 19.25rem)` on the absolute
    fallback, `max(anchor-size(inline), 19.25rem)` when anchored, capped by
    `--rv-datepicker-panel-max-width` (`100vw - 1rem`).
  - Not one of those numbers is a unit test: jsdom has no layout. They come
    from the probe.

- Verified: **395/395 unit tests (11 files)**, including the new isolation,
  clear (two-way, reactive, label), theme, Signal Forms, and public-export
  specs; `ng build datepicker`; tarball **8 files / 61.0 kB**; the consumer app
  built in **production** (**266.21 kB raw / 71.24 kB transfer** for that demo
  page — it now imports reactive forms, Signal Forms, and 21 pickers, so this
  is not comparable to D51's 215 kB figure); and the full Playwright probe in
  production: isolation by keyboard and pointer, clear (two-way، reactive,
  inside a `<label>`), Signal Forms and `ngModel`, the four theme cases, the
  four width cases, RTL alignment/gap/arrows and the Arabic clear name — zero
  console errors.
- NOT published, NOT committed. Version remains **0.1.0** (the new surface is
  additive to an unpublished package).
