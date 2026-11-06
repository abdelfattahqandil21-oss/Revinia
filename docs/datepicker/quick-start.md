# Quick start

Build the first working example from the package quick start.

[Back to @rivinia/datepicker README](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/projects/datepicker/README.md)

## Quick start

```ts
// src/app/flight-date.component.ts
import { Component, signal } from '@angular/core';
import { RiviniaDatepickerComponent } from '@rivinia/datepicker/ui';
import type { RiviniaDate } from '@rivinia/datepicker';

@Component({
  selector: 'app-flight-date',
  imports: [RiviniaDatepickerComponent],
  templateUrl: './flight-date.component.html',
})
export class FlightDateComponent {
  readonly departure = signal<RiviniaDate | null>(null);
}
```

```html
<!-- src/app/flight-date.component.html -->
<rv-datepicker
  [(value)]="departure"
  locale="en-GB"
  format="dd/MM/yyyy"
  [min]="{ year: 2026, month: 1, day: 1 }"
  [max]="{ year: 2026, month: 12, day: 31 }"
/>
```

The trigger shows the formatted date; the panel opens under it, focuses the
selected day (or today), and closes as soon as a day is picked.

For a date **and** a time, use the sibling component — same field, same panel,
plus a time row:

```ts
import { Component, signal } from '@angular/core';
import { RiviniaDatetimepickerComponent } from '@rivinia/datepicker/ui';
import type { RiviniaDateTime, RiviniaDateTimeResolution } from '@rivinia/datepicker';

@Component({
  selector: 'app-appointment',
  imports: [RiviniaDatetimepickerComponent],
  template: `
    <rv-datetimepicker
      [(value)]="appointment"
      label="Appointment"
      locale="en-GB"
      format="dd/MM/yyyy"
      timeFormat="HH:mm"
      timeZone="Europe/London"
      (resolved)="onResolved($event)"
    />
  `,
})
export class AppointmentComponent {
  readonly appointment = signal<RiviniaDateTime | null>(null);

  onResolved(event: RiviniaDateTimeResolution): void {
    // event.value is the civil wall time; event.resolution.instant is the
    // exact epoch in event.timeZone, with the DST rule already applied.
    console.log(event.resolution.instant, event.resolution.kind);
  }
}
```

The value stays civil (`{ date, time }`); the `timeZone` tells the picker which
zone to display and validate against, and the `resolved` output carries the
instant on commit. See [Date + time](date-and-time.md) and
[Time zones and DST](time-zones-and-dst.md).
