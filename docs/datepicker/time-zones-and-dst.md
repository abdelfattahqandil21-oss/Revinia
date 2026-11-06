# Time zones and DST

Resolve wall times in IANA zones or fixed offsets.

[Back to @rivinia/datepicker README](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/datepicker/v1.0.1/projects/datepicker/README.md)

## Time zones and DST

The value is **civil**: `{ date, time }` describes what the user read on the
wall, not an instant. A time zone is a separate, optional input on the picker
and a separate argument in the core. That separation is deliberate — storing an
instant loses the wall time the user chose, and storing only a wall time cannot
tell you which instant it meant during a DST overlap.

### In the picker

Set `timeZone` to an IANA id, or to a **fixed UTC offset** when the zone must
not follow DST:

```html
<rv-datetimepicker [(value)]="departure" timeZone="Africa/Cairo" (resolved)="save($event)" />

<!-- always GMT+3, in January and in July, with no DST rules -->
<rv-datetimepicker [(value)]="shift" timeZone="+03:00" (resolved)="save($event)" />
```

A fixed offset is written `+HH:MM` or `-HH:MM` (`+03:00`, `-05:30`, `+00:00`).
It is resolved by `Intl` like a zone: `resolveWallTime()` returns
`kind: 'unique'` for every wall time, the offset is the literal one, and there
is no gap or overlap. `GMT+3` is **not** accepted (that is a display name, not
an offset); `Etc/GMT-3` is the IANA zone with the same offset — note the POSIX
sign inversion. Use the fixed offset when the business rule is "3 hours ahead
of UTC", and an IANA zone when the rule is "Cairo's local time". There is no
end-user time-zone selector: the developer chooses the zone or offset in code.

- The trigger shows the zone's offset (e.g. `GMT+3`); the panel adds the IANA
  id as `<bdi>` and the zone name when `Intl` gives one.
- The picker validates the wall time on every draft change:
  - **unique** — one instant;
  - **overlap** (the clock fell back) — two offsets are offered as
    `aria-pressed` buttons; the chosen one is used on commit. The default is
    the **earlier** instant, matching `Temporal`'s `compatible` rule;
  - **gap** (the clock jumped forward) — a polite warning names the real wall
    time after the gap and offers a `Use …` button. Nothing is moved silently:
    the user must adopt the suggestion. `OK` on a gap keeps the civil value but
    `resolved` reports `kind: 'nonexistent'` with both sides;
  - **invalid zone** — a warning is shown, no `resolved` is emitted, and the
    picker still works as a civil date + time picker.
- `resolved` is emitted only on commit and only with a valid zone:
  `{ value, timeZone, resolution }`, where `resolution.instant` is epoch ms and
  `resolution.kind` is `unique`, `ambiguous` or `nonexistent`.
- The picker's "today" follows the zone when one is set. If you pin
  `provideRiviniaDatepicker({ today })` for SSR determinism, that pin wins over
  the zone's clock.

### In the headless core

| Function                                                | Answer                                                                                                                |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `resolveWallTime(value, timeZone, disambiguation?)`     | The instant(s), offset(s) and kind for a civil wall time. `null` for an invalid zone/value.                           |
| `wallTimeInTimeZone(timeZone, instant)`                 | The civil wall time at an epoch.                                                                                      |
| `getTimeZoneOffsetMinutes(timeZone, instant)`           | Offset east of UTC in minutes, or `null`.                                                                             |
| `nowInTimeZone(timeZone)` / `todayInTimeZone(timeZone)` | The zone's current wall time / date.                                                                                  |
| `isValidTimeZone(id)` / `listTimeZones()`               | Validate an IANA id or a fixed offset (`+03:00`) / enumerate the runtime's IANA zones (fixed offsets are not listed). |
| `formatTimeZoneName(locale, zone, instant, style?)`     | `short` (`EEST`), `shortOffset` (`GMT+3`), `long`, `longOffset`.                                                      |

`disambiguation` is `'compatible'` (default), `'earlier'`, `'later'` or
`'reject'`. `'reject'` throws a `RangeError` instead of guessing — for an
application that must never move a value silently.

### Recipes

**Civil + zone → instant.** Resolve once, store the instant (or its ISO
string), and keep the civil value only for display/editing:

```ts
const resolved = resolveWallTime(departure, 'Africa/Cairo');
if (!resolved) throw new Error('Invalid date or zone');
await api.save({ at: new Date(resolved.instant).toISOString(), kind: resolved.kind });
```

**Instant → civil, for display.** Never read `Date` getters; they use the
machine's zone:

```ts
const shown = wallTimeInTimeZone('Africa/Cairo', instant)!;
formatDateTime('en-GB', shown, 'medium', 'short'); // 25 Oct 2026, 15:30
```

**Overlap.** The UI offers both offsets. Headless, choose explicitly:

```ts
const earlier = resolveWallTime(value, zone, 'earlier')!; // first occurrence
const later = resolveWallTime(value, zone, 'later')!; // second occurrence
```

**Gap.** The UI offers the suggested wall time. Headless:

```ts
const r = resolveWallTime(value, zone); // { kind: 'nonexistent', dateTime, alternatives }
// r.alternatives[0] is the real wall time before the gap,
// r.alternatives[1] after it.
```

**Detect DST without a table.** Compare the offsets six months apart:

```ts
const jan = getTimeZoneOffsetMinutes(zone, Date.UTC(2026, 0, 15, 12))!;
const jul = getTimeZoneOffsetMinutes(zone, Date.UTC(2026, 6, 15, 12))!;
const observesDst = jan !== jul;
```

**The list of zones.** `listTimeZones()` returns the runtime's ids (418 in the
verified environment). A demo selector or a settings page can use it directly;
`Intl.supportedValuesOf('timeZone')` is the underlying API.

### Measured examples (2026)

- `+03:00` — a fixed offset: 25 Oct 2026 16:00 resolves to `+180` minutes and
  `2026-10-25T13:00:00.000Z`, `kind: 'unique'`, in January and July alike.
  `Etc/GMT-3` resolves to the same offset; `GMT+3` is rejected by
  `isValidTimeZone()`. `listTimeZones()` (418 ids here) does not include the
  fixed offset, by design.
- `Africa/Cairo` — 25 Oct 2026 15:00 is `GMT+3`; 29 Oct 2026 23:30 occurs twice
  (`20:30Z` at `+3`, `21:30Z` at `+2`); 24 Apr 2026 00:30 does not exist and
  the compatible suggestion is 01:30 `+3` (the earlier side is 23:30 on 23
  April at `+2`).
- `America/New_York` — 8 Mar 2026 02:30 → 03:30 `-4`; 1 Nov 2026 01:30 occurs
  at `-4` and `-5`.
- `Australia/Lord_Howe` — a **30-minute** DST shift: 4 Oct 2026 02:15 → 02:45
  `+11`; 5 Apr 2026 01:45 occurs at `+11` and `+10:30`.
- `Asia/Riyadh` — no DST; 25 Oct 2026 15:00 is uniquely `+3`.

These are facts of the runtime's ICU data, verified in the unit suite; they can
change if a government changes its rules. The package bundles no rules, so it
follows the runtime.

### Limits

- No time-zone **picker** is included; `listTimeZones()` is the data, the
  application owns the control. Auto-detection is
  `Intl.DateTimeFormat().resolvedOptions().timeZone` in your app.
- No `ZonedDateTime` and no Temporal dependency. The resolver is `Intl`-only
  and was exercised in Node and Chromium ICU; `Temporal` can be used by the
  application on top of the same civil value.
- Historic and future rule changes follow the runtime's tzdata. A runtime with
  no `Intl.supportedValuesOf` still resolves zones; only `listTimeZones()` is
  empty.
- The value has no offset field. If you need to preserve "the user meant +03:00
  even if the zone's rules change", store the resolved `instant` **and** the
  zone id, not the civil value alone.
- SSR: the picker's "today" in a zone reads the current clock unless `today` is
  pinned in the provider. The formatters are deterministic for a given civil
  value and locale.
- On a short viewport the panel shifts **up** by the deficit so its bottom edge
  stays 8px inside the viewport (measured 320 × 568: bottom 560.1 on a 568
  viewport, previously 577.1). It overlaps its field by that amount — the
  native-select behaviour — because a 337px panel cannot fit on either side of
  a field near the middle. The shift is recomputed when the panel grows (a DST
  warning, a wrapped action row) and resets on every open. Width is unaffected.
- The browser evidence is **Chromium** (headless Playwright, production build).
  Firefox and WebKit, and SSR hydration, are not claimed.
