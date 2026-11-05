## 2026-10-26 — D57: tray accessible names fixed (WCAG 2.5.3), final audit

- The scoped axe run (the three picker sections) found **20 serious
  `label-content-name-mismatch`** nodes in the pointer tray: the visible text
  is `03` / `05`, while the accessible name was `3 PM` / `5 minutes`. The
  visible text was not a substring (leading zero, 12-hour form, plural unit),
  so voice-control users could not say what they see.
- Fix: the row's accessible name now **starts with its visible text** —
  `03, 3 PM`, `٠٣, ٣ م`, `05, 5 minutes`. It is composed once in the component
  (`accessibleLabel`), not in the template. A regression test asserts, for
  `en-US` and `ar-EG` and for hour/minute/second, that every row's visible text
  is contained in its accessible name.
- Verified on the final build (2026-10-26):
  - **463/463 unit tests in 14 files**; `ng build datepicker`; tarball
    **8 files**; dist FESM imports unchanged (`@angular/core`; UI adds
    `@rivinia/datepicker`), no `tslib` import.
  - Tarball reinstalled in the consumer; production build
    **371.60 kB raw / 88.72 kB transfer**.
  - Chromium, zero console errors: exit `animationstart` → `animationend` at
    ~100 ms and panel gone by the 150 ms sample; `prefers-reduced-motion:
    reduce` closes instantly; keyboard takeover leaves **1 panel, 0 closing**;
    RTL panel 308 × 413.8 with a 290-wide tray, no overflow, tray labels
    `الساعة` / `الدقيقة`, selected row `٠٣, ٣ م`; `+03:00` resolved offset 180,
    instant `2026-10-25T13:00:00.000Z`, kind `unique`; **axe: 0 violations**
    in `#datetime`, `#zones`, `#datetime-forms`.
- The pointer-takeover path is different and stays as designed: clicking
  another picker is an outside pointer for the open one, so the first closes
  with its 100 ms exit (measured 2 panels with 1 closing for <100 ms); the
  immediate close belongs to the keyboard/registry takeover.
- Not published; version remains **0.1.0**.
