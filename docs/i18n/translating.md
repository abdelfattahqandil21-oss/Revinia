# @rivinia/i18n — translating text

Back to [the README](../../projects/i18n/README.md) ·
[ICU messages](icu.md) · [switching the language](switching.md) ·
[resilience](resilience.md) · [the API](api.md)

Keys are dot paths into the JSON file: `{"booking": {"seats": "Seats"}}` becomes
`booking.seats`. Three ways to read one:

```html
<!-- template: the pipe -->
<p>{{ 'booking.seats' | rvTranslate: { count: seats } }}</p>
```

```ts
// component field: a signal that re-renders on a language switch
readonly title = this.i18n.t('app.title');
// params may be a function of signals — the text follows both language and count
readonly seats = this.i18n.t('booking.seats', () => ({ count: this.count() }));
```

```ts
// plain TypeScript
this.i18n.translate('app.save');
this.i18n.translate('app.title', 'Untitled'); // defaultValue: never reported as missing
this.i18n.translate({ en: 'Hello', ar: 'أهلاً' }); // inline map
```

A key that resolves nowhere renders as the key itself and is reported — see
[missing keys](resilience.md#missing-keys). An inline map resolves current →
fallback → first value → `''`.

## Which one to use

`t()` is a `computed`, so it is the right tool for component fields. The pipe is
impure by necessity — the service reads signals on every call — and re-runs on
every change-detection pass: fine for a page, wasteful for a thousand rows. For
a template expression that runs on every change detection, `translate()` or the
pipe is cheaper than an extra signal.

`RvTranslatePipe` (`rvTranslate`) delegates to `translate()`; that is its whole
implementation.

## `t()` signals

```ts
readonly title = this.i18n.t('app.title');
readonly items = this.i18n.t('cart.items', () => ({ count: this.count() }));
```

A function `params` is invoked inside the computation, so the signals it reads
are tracked: changing `count` re-renders the text without touching the language.
`t()` is a `computed` over the same resolution chain as `translate()`, and
missing keys are recorded in a microtask because Angular forbids signal writes
inside a `computed`.

## Plurals that survive translation

"1 item / 2 items" looks like a single `if`:

```ts
const label = count === 1 ? `${count} item` : `${count} items`;
```

That line is already wrong in Arabic. English has two plural forms; Arabic has
six, and which one applies is decided by the number in a way English never
trained you for:

| count | English category | Arabic category | Arabic text    |
| ----- | ---------------- | --------------- | -------------- |
| 0     | `other`          | `zero`          | سلتك فارغة     |
| 1     | `one`            | `one`           | لديك عنصر واحد |
| 2     | `other`          | `two`           | لديك عنصران    |
| 3     | `other`          | `few`           | لديك 3 عناصر   |
| 11    | `other`          | `many`          | لديك 11 عنصرًا |
| 100   | `other`          | `other`         | لديك 100 عنصر  |

The words around the number also change — gender, case, the shape of the noun —
so gluing `count + ' items'` together cannot produce a correct Arabic sentence.

ICU MessageFormat puts the decision inside the message:

```text
{count, plural,
  =0 {Your cart is empty}
  one {You have one item in your cart}
  other {You have # items in your cart}
}
```

- `count` is the parameter you pass: `translate('cart.items', { count: 3 })`.
- `plural` picks a branch from that number.
- `=0` matches the value **exactly**, in every language.
- `one` and `other` are plural **categories**, selected by
  `Intl.PluralRules(locale)`. English only ever selects `one` and `other`.
- `#` is the number, formatted for the locale — `٣` under `ar-EG`, `3` under `ar`.

The same message in Arabic names the categories Arabic actually has:

```text
{count, plural,
  =0 {سلتك فارغة}
  one {لديك عنصر واحد}
  two {لديك عنصران}
  few {لديك # عناصر}
  many {لديك # عنصرًا}
  other {لديك # عنصر}
}
```

`zero`, `one`, `two`, `few`, `many` and `other` are the six CLDR categories for
Arabic. They are not `if` branches you can reorder: the category is computed
from the number and the locale, so one message yields six Arabic forms and two
English ones with no code change. In Arabic, 3–10 select `few`, 11–99 select
`many`, and 100 selects `other`.

Note the difference between `=0` and `zero`. `=0` is an exact-value rule that
works everywhere; `zero` is a category only some languages select — an English
message with a `zero {…}` branch never shows it, because English at 0 resolves
to `other`. For an empty state, use `=0`.

`select`, `selectordinal`, `offset:` and the number/date styles are in the
[ICU reference](icu.md).
