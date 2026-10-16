# @rivinia/select

[![npm version](https://img.shields.io/npm/v/@rivinia/select.svg)](https://www.npmjs.com/package/@rivinia/select)
[![license](https://img.shields.io/npm/l/@rivinia/select.svg)](https://www.npmjs.com/package/@rivinia/select)

Headless select behavior for Angular 22+. Option registry, accent-insensitive
search filter, and single/multi value — no DOM, no styling. Rendering lives in
`@rivinia/select/ui` (built on `@rivinia/menu/ui`) or your own UI.

- Version: **0.1.0**
- Requires: **Angular `^22.0.0`**, `@rivinia/menu` (UI entry only), `tslib`

## Install

```bash
npm install @rivinia/select @rivinia/menu
```

## Quick start

```ts
const status = new RiviniaSelect(); // single
status.registerOption({ id: 'paid', label: 'Paid' });
status.setQuery('pai'); // filtered -> [paid]
status.select('paid');

const tags = new RiviniaSelect('multi'); // stays open, toggles
tags.toggle('a');
tags.toggle('b'); // values -> ['a', 'b']
```

## Ready-made UI (`@rivinia/select/ui`)

```html
<rv-select
  [options]="invoices"
  [searchable]="true"
  placeholder="Status…"
  (selectionChange)="apply($event)"
/>
<rv-select [select]="tags" [options]="tagOptions" />
```

Single picks one value and closes; multi toggles with a check mark and stays
open. Typing filters, Tab jumps into the list, Enter picks the top match.
Disabled options render but refuse picks. Rich per-option custom content
(icons, badges, headers) stays the job of raw `rv-menu`.

## API

| Export                   | Kind  | Purpose                                                                                                                                              |
| ------------------------ | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RiviniaSelect`          | class | `options/query/filtered/value/values/selectedLabels` signals + `registerOption/unregisterOption/syncOptions/setQuery/select/toggle/clear/isSelected` |
| types                    | types | `RiviniaSelectController` (structural UI contract), `RiviniaSelectOption`, `RiviniaSelectMode`                                                       |
| `RiviniaSelectComponent` | ui    | `rv-select`: `select/mode/options/searchable/placeholder/searchPlaceholder/emptyLabel/placement` + `selectionChange/opened/closed`                   |

## License

MIT.
