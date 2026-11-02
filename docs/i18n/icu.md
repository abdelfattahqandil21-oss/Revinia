# @rivinia/i18n — ICU messages

Back to [the README](../../projects/i18n/README.md) ·
[translating text](translating.md) · [the API](api.md)

The message compiler implements the ICU MessageFormat 1 (MF1) subset the
package's own dictionaries need. Supported: `{name}` interpolation,
`{n, plural, …}` (with `offset:`), `{n, selectordinal, …}`, `{x, select, …}`,
`#` inside plural-style arguments, `{n, number[, style]}`,
`{d, date[, style]}`, nesting, and ICU apostrophe quoting.

```json
{
  "items": "{count, plural, =0 {No items} one {# item} other {# items}}",
  "guests": "{n, plural, offset:1 =0 {Nobody} =1 {Only you} one {You and # other} other {You and # others}}",
  "place": "{rank, selectordinal, one {#st} two {#nd} few {#rd} other {#th}}",
  "amount": "{value, number, ::currency/USD}",
  "ratio": "{value, number, percent}",
  "day": "{value, date, long}"
}
```

- Categories come from `Intl.PluralRules(locale)`, so Arabic gets all six forms
  (`zero`, `one`, `two`, `few`, `many`, `other`) with no dependency. The
  walkthrough of those six forms is in
  [translating text](translating.md#plurals-that-survive-translation).
- `offset:` follows ICU: `=N` matches the **raw** value, the category is
  selected with `value - offset`, and `#` renders `value - offset` in the
  locale's digits.
- `number` styles: `percent`, `integer`, `::currency/XXX`. `date` styles:
  `short`/`medium`/`long`/`full`. Anything else is unsupported.
- Unsupported or malformed constructs never throw: the raw `{…}` segment is
  returned as-is and parsing continues.
- `{name}` interpolation is `String(value)`; use `{n, number}` when formatting
  matters.
- `''` renders one apostrophe. A single apostrophe immediately before `{` or `}`
  (and `#` inside a plural) starts a quoted literal that ends at the next
  apostrophe: `It''s '{'x'}'` → `It's {x}`. A lone apostrophe elsewhere
  (`Don't`) is unchanged.
- `date` accepts a `Date`, epoch milliseconds, or a strict ISO-8601 string
  (`2026-10-28`, `2026-10-28T12:00:00Z`). Invalid input keeps the raw segment.
  Plain `{d}` on a `Date` uses `String()` — use `{d, date, …}` for localized
  output.
- Templates are compiled once into a cached AST, so a message rendered on every
  change-detection pass is not re-parsed. The cache holds 500 templates, so a
  long-lived tab stays bounded.

A message that needs `{name}` and does not receive it keeps the placeholder and
reports it — see [missing parameters](resilience.md#missing-parameters).

`formatIcu(template, params, locale, options?)` is the same compiler the service
calls, exported for one-off formatting outside a dictionary. Its
`IcuFormatOptions` carries the single optional `onMissingParam(name)` hook.
