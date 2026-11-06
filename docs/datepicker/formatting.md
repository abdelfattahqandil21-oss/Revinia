# Formatting dates and times

Choose date and time styles or patterns.

[Back to @rivinia/datepicker README](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/projects/datepicker/README.md)

## Formatting

The `format` input accepts either a **style** or a **pattern**. One input, two
modes, and the mode is detected from the value.

### Styles

`short`, `medium` (the default), `long` and `full` are passed to
`Intl.DateTimeFormat` as a `dateStyle` — **date only**, never a time.

```html
<rv-datepicker format="short" />
<!-- 10/25/26 (en-US), ٢٥‏/١٠‏/٢٠٢٦ (ar-EG) -->
<rv-datepicker format="medium" />
<!-- Oct 25, 2026 / ٢٥‏/١٠‏/٢٠٢٦ -->
<rv-datepicker format="long" />
<!-- October 25, 2026 / ٢٥ أكتوبر ٢٠٢٦ -->
<rv-datepicker format="full" />
<!-- Sunday, October 25, 2026 / الأحد، ٢٥ أكتوبر ٢٠٢٦ -->
```

Formatters are cached per locale and options, so a 42-cell grid does not
construct `Intl.DateTimeFormat` objects on every render.

### Patterns

A pattern is a date-only string built from these tokens. **Case is ignored;
the width is the number of letters.**

| Token     | Meaning                        | Example (25 October 2026) |
| --------- | ------------------------------ | ------------------------- |
| `d`       | day, no padding                | `25`                      |
| `dd`      | day, two digits                | `25`                      |
| `M`, `mm` | month, no padding / two digits | `10`                      |
| `MMM`     | abbreviated month name         | `Oct`                     |
| `MMMM`    | full month name                | `October`                 |
| `yy`      | year, two digits               | `26`                      |
| `yyyy`    | year, four digits              | `2026`                    |
| `EEEE`    | weekday, full name             | `Sunday`                  |

```html
<rv-datepicker format="MM-dd-yyyy" />
<!-- 10-25-2026 -->
<rv-datepicker format="MM-dd-yy" />
<!-- 10-25-26 -->
<rv-datepicker format="dd-mm-yy" />
<!-- 25-10-26 -->
<rv-datepicker format="dd/mm/yyyy" />
<!-- 25/10/2026 -->
<rv-datepicker format="dd MMMM yyyy" /><!-- 25 October 2026 -->
```

- Month and weekday **names and digits still come from the locale**: the same
  `dd MMMM yyyy` renders `25 أكتوبر 2026` in `ar-EG`.
- `''` is an escaped quote (e.g. `dd ''of'' MMMM`).
- Non-ASCII letters are literals, so an Arabic pattern never swallows a word.
- A **time** token (`h`, `H`, `k`, `K`, `s`, `S`, `a`, `A`, `X`, `Z`, `z`,
  `O`, `v`, `V`, `b`, `B`) throws a descriptive error: a date picker has no
  time, and silently dropping it would be a lie. `ddd` also throws — use
  `EEEE`.

### Time styles and patterns

`timeFormat` is independent from `format`. The same two modes apply:

```html
<rv-datetimepicker timeFormat="short" />
<!-- 15:30 (en-GB), 3:30 PM (en-US) -->
<rv-datetimepicker timeFormat="medium" />
<!-- 15:30:00 / 3:30:00 PM -->
<rv-datetimepicker timeFormat="HH:mm" />
<rv-datetimepicker timeFormat="hh:mm a" />
<rv-datetimepicker timeFormat="HH:mm:ss" />
```

Time styles are `short` (hour and minute) and `medium` (adds seconds). The
locale's own clock is used unless `hour12` says otherwise: `en-GB` is 24-hour,
`en-US` and `ar-EG` are 12-hour, and the day period is the locale's (`PM`, `م`).

A time pattern uses these tokens. Unlike the date pattern language, **case is
significant** here, because `h` and `H` mean different clocks:

| Token    | Meaning                         | Example (`15:30:05`) |
| -------- | ------------------------------- | -------------------- |
| `H`      | hour, 0–23, no padding          | `15`                 |
| `HH`     | hour, 0–23, two digits          | `15`                 |
| `h`      | hour, 1–12, no padding          | `3`                  |
| `hh`     | hour, 1–12, two digits          | `03`                 |
| `m`/`mm` | minute, no padding / two digits | `30`                 |
| `s`/`ss` | second, no padding / two digits | `5` / `05`           |
| `a`      | the locale's day period         | `PM` / `م`           |

- Digits come from the locale: `HH:mm` in `ar-EG` is `١٥:٣٠`.
- `''` is an escaped quote; non-ASCII letters are literals.
- Mixing a 24-hour token with a 12-hour token or `a` (`HH:mm a`) throws, because
  the result would be ambiguous.
- `M`, `S`, `A`, `k`, `K`, the timezone letters and the date letters throw with
  a message. In particular `HH:MM` says _use `m` for minutes_ — in the date
  pattern language `M` is the month, so guessing would be worse than an error.
- `formatTime(locale, time, format, { hour12? })`,
  `formatTimeWithPattern(locale, time, pattern)` and `parseTimePattern()` are
  exported for your own templates and tests.

`formatDateTime(locale, value, dateFormat, timeFormat, { hour12? })` joins the
two halves. When **both** are style keywords it uses one combined
`Intl.DateTimeFormat({ dateStyle, timeStyle })`, which is the only way to get
ICU's locale-specific separator and bidi marks; otherwise it formats each half
and joins with the locale's comma (Arabic uses `في`).

### Why not `DatePipe`

Angular's `DatePipe` is a poor fit for a date-only field:

- its `short`, `medium`, `long` and `full` presets all include **time**;
- its pattern letters include time, so `dd/MM/yyyy` style patterns become
  ambiguous;
- it does not produce Arabic-Indic digits, and its bidi marks vary by locale.

So the package formats with `Intl` for styles and with its own per-token
formatter for patterns. `formatDate(locale, date, format)` exposes the same
behaviour to your own templates.
