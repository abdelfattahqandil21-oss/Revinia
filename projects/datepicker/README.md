# @rivinia/datepicker

[![npm version](https://img.shields.io/npm/v/@rivinia/datepicker.svg)](https://www.npmjs.com/package/@rivinia/datepicker)
[![license](https://img.shields.io/npm/l/@rivinia/datepicker.svg)](https://www.npmjs.com/package/@rivinia/datepicker)

A headless Gregorian date and time picker for Angular, with an optional ready-made UI.

```ts
import { Component, signal } from '@angular/core';
import { RiviniaDatepickerComponent } from '@rivinia/datepicker/ui';
import type { RiviniaDate } from '@rivinia/datepicker';
@Component({
  selector: 'app-flight-date', imports: [RiviniaDatepickerComponent],
  template: '<rv-datepicker [(value)]="date" locale="en-GB" format="dd/MM/yyyy" />',
})
export class FlightDateComponent { readonly date = signal<RiviniaDate | null>(null); }
```

## Why @rivinia/datepicker

- Civil Gregorian date/time values keep zone conversion explicit.
- One controller supports the ready-made picker or custom rendering.
- Locale formatting, keyboard navigation, RTL, and Angular forms are built in.

## Install

```bash
npm install @rivinia/datepicker
```

## Quick start

1. Install the package and configure its provider or schematic when required.
2. Use the entry point shown in the example above.
3. Render the field on the screen and pick a date.

## Two ways to use it

| Ready-made UI | Headless controller |
| --- | --- |
| `@rivinia/datepicker/ui` | `@rivinia/datepicker` |

The UI and controller are independent; use either or combine them.

## Compatibility

| Angular | Node | Browser verification |
| --- | --- | --- |
| `^22.0.0` | `^22.22.3 or ^24.15.0 or >=26.0.0` | Chromium and Firefox; native Safari not verified |

## Go further

| Topic                      | Read                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Overview                   | [Overview](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/docs/datepicker/overview.md)                     |
| Picker layout and widths   | [Picker layout and widths](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/docs/datepicker/layout.md)       |
| Install                    | [Install](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/docs/datepicker/installation.md)                  |
| API reference              | [API reference](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/docs/datepicker/api.md)                     |
| Quick start                | [Quick start](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/docs/datepicker/quick-start.md)               |
| Formatting dates and times | [Formatting dates and times](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/docs/datepicker/formatting.md) |
| Headless usage             | [Headless usage](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/docs/datepicker/headless.md)               |
| Forms                      | [Forms](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/docs/datepicker/forms.md)                           |
| Keyboard and RTL           | [Keyboard and RTL](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/docs/datepicker/keyboard-and-rtl.md)     |
| Theming                    | [Theming](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/docs/datepicker/theming.md)                       |
| Accessibility              | [Accessibility](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/docs/datepicker/accessibility.md)           |
| Scope and limits           | [Scope and limits](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/docs/datepicker/scope-and-limits.md)     |
| Date and time              | [Date and time](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/docs/datepicker/date-and-time.md)           |
| Time zones and DST         | [Time zones and DST](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/docs/datepicker/time-zones-and-dst.md) |
| Design notes               | [Design notes](https://github.com/abdelfattahqandil21-oss/Revinia/blob/datepicker/v1.0.1/docs/datepicker/design-notes.md)             |
