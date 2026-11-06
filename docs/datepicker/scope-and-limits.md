# Scope and limits

See the supported behavior and documented limits.

[Back to @rivinia/datepicker README](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/projects/datepicker/README.md)

## Scope and limits

Included: day/month/year views, single-date picking, Gregorian calendar,
locale week start, date styles and date patterns, clear action, one-panel
coordination, light/dark/auto theming, all three Angular form APIs, RTL.

Also included: date + time in the same panel, time styles and time
patterns, locale digits and clocks, the APG spinbutton keyboard model, an
optional IANA time zone **or fixed UTC offset** with offset display, DST
gap/overlap reporting and an explicit disambiguation choice, the `resolved`
instant output, the pointer-friendly time tray, and enter/exit panel motion.

Not included (each is additive):

- a typed date input with segments (`dd/MM/yyyy` typed by hand) — the time row
  is typed, the date grid is not;
- range selection, presets, a time-only picker, and a separate timezone picker;
- time bounds in `min`/`max` (the grid uses the date half; a time outside a
  bound is not rejected);
- a Hijri (Umm al-Qura) grid — the formatting seam is documented in
  `DECISIONS.md`, the grid is not implemented;
- date/time pattern **parsing** (patterns format; they do not parse);
- virtualisation of the year view;
- a Temporal dependency. The resolver is `Intl`-only, so it needs no new
  engine feature; `Temporal` is an application option, not a package
  requirement.
