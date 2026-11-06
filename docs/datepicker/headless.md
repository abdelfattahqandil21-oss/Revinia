# Headless usage

Use the calendar controller without the ready-made UI.

[Back to @rivinia/datepicker README](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/datepicker/v1.0.1/projects/datepicker/README.md)

## Headless usage

```ts
import { Component, computed, inject } from '@angular/core';
import { RiviniaCalendar, buildMonth, resolveCalendarKey } from '@rivinia/datepicker';

@Component({/* … */})
export class MyDateField {
  readonly calendar = inject(RiviniaCalendar);
  readonly grid = computed(() => buildMonth({/* … */}));

  onKeydown(event: KeyboardEvent): void {
    const intent = resolveCalendarKey({ key: event.key, direction: 'rtl' });
    if (intent) this.calendar.applyAction(intent);
  }
}
```

`RiviniaCalendar` exposes `focused()`, `selected()`, `view()` (`day` | `month` |
`year`), `locale()`, `firstDay()`, `weekdays()`, `monthGrid()`, `months()`,
`years()`, `heading()`, and the methods `focus`, `setSelected`, `setLocale`,
`setFirstDay`, `setBounds`, `setLabels`, `setView`, `chooseMonth`, `chooseYear`,
`applyAction`.

`provideRiviniaDatepicker({ … })` and the per-instance inputs both feed it; a
picker always provides its **own** `RiviniaCalendar`, so two pickers never
share a focused day.

The time and zone halves are headless too, and they are the part to reuse when
the value crossing your API is an **instant**:

```ts
import {
  formatDateTime,
  nowInTimeZone,
  resolveWallTime,
  wallTimeInTimeZone,
} from '@rivinia/datepicker';

const departure = {
  date: { year: 2026, month: 10, day: 25 },
  time: { hour: 15, minute: 30, second: 0 },
};

// Civil → instant, with the DST rule made explicit.
const resolved = resolveWallTime(departure, 'Africa/Cairo');
// { kind: 'unique', instant: 1792…, offsetMinutes: 180, alternatives: [...] }

// Instant → civil, for display.
const shown = wallTimeInTimeZone('Africa/Cairo', resolved!.instant);
// { date: { year: 2026, month: 10, day: 25 }, time: { hour: 15, minute: 30, second: 0 } }

// The browser's "now" as read on that zone's wall.
const todayThere = nowInTimeZone('Africa/Cairo');

// One display string, with the locale's separator and digits.
const label = formatDateTime('ar-EG', departure, 'long', 'short');
// ٢٥ أكتوبر ٢٠٢٦ في ٣:٣٠ م
```

`resolveWallTime(value, zone, disambiguation?)` returns `null` for an invalid
zone or an invalid civil value; otherwise:

- `kind: 'unique'` — one candidate;
- `kind: 'ambiguous'` — the clock fell back; `alternatives` has two entries
  sorted by instant, and the default rule picks the **earlier** one;
- `kind: 'nonexistent'` — the clock jumped forward; `alternatives[0]` is the
  real wall time before the gap, `alternatives[1]` after it, and `dateTime` is
  the suggested wall time (the default `compatible` rule takes the later one).

`disambiguation` is `'compatible'` (default), `'earlier'`, `'later'`, or
`'reject'` (throws a `RangeError` instead of guessing). Every alternative has
`instant` (epoch ms), `offsetMinutes` (east of UTC) and the actual `dateTime`.
