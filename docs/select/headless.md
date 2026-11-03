# @rivinia/select — headless usage

Back to [the README](../../projects/select/README.md) ·
[the API](api.md) · [forms](forms.md) · [recipes](recipes.md)

`@rivinia/select` (the headless entry point) is the whole selection behaviour
with **no DOM**: an option registry, an accent-insensitive filter, and a
single/multi value. The UI entry point is one implementation on top of it —
you are not obliged to use it.

Per D21, the headless controller is the product; pixels are yours.

## A complete headless example

A searchable filter with no UI of our own — a plain `<input>` plus a `<ul>`:

```ts
import { Component } from '@angular/core';
import { RiviniaSelect, type RiviniaSelectOption } from '@rivinia/select';

@Component({
  selector: 'app-invoice-filter',
  template: `
    <input
      type="search"
      [value]="controller.query()"
      (input)="controller.setQuery($any($event.target).value)"
      placeholder="Filter invoices…"
    />

    @if (controller.filtered().length === 0) {
      <p>No invoice matches "{{ controller.query() }}"</p>
    } @else {
      <ul>
        @for (invoice of controller.filtered(); track invoice.id) {
          <li>
            <button type="button" (click)="pick(invoice)">
              {{ invoice.label }}
              @if (invoice.hint) {
                <kbd>{{ invoice.hint }}</kbd>
              }
            </button>
          </li>
        }
      </ul>
    }

    @if (controller.selectedLabels().length > 0) {
      <p>Chosen: {{ controller.selectedLabels().join(', ') }}</p>
    }
  `,
})
export class InvoiceFilter {
  readonly controller = new RiviniaSelect('single');
  readonly options: readonly RiviniaSelectOption[] = [
    { id: 'inv-001', label: 'Invoice 001', hint: 'Ctrl+B' },
    { id: 'inv-002', label: 'Invoice 002', hint: 'Ctrl+I' },
    { id: 'inv-003', label: 'Invoice 003', disabled: true },
  ];

  constructor() {
    // One-shot registration. `syncOptions` is the reactive alternative.
    for (const option of this.options) this.controller.registerOption(option);
  }

  pick(invoice: RiviniaSelectOption): void {
    this.controller.select(invoice.id);
  }
}
```

Notes on that example:

- **The filter is accent- and case-insensitive.** `normalize()` lowercases and
  strips diacritics, so `releve` finds `Relevé`, and Arabic tashkeel, tatweel
  and alef forms are folded (verified in the unit suite).
- **`disabled` options stay in the list** but refuse a pick — `select()`
  returns `false`. That keeps the list stable while typing.
- **`hint` is display-only.** It never participates in the filter.
- **`selectedLabels` falls back to the raw id** when the option is not
  registered, so a value restored from storage before its options loaded still
  displays something meaningful instead of an empty trigger.

## Keeping the registry in sync with a signal

When the options come from an API, mirror them with `syncOptions` inside an
`effect`:

```ts
import { Component, effect, signal } from '@angular/core';
import { RiviniaSelect, type RiviniaSelectOption } from '@rivinia/select';
import { RiviniaSelectComponent, type SelectChange } from '@rivinia/select/ui';

@Component({
  selector: 'app-status-filter',
  imports: [RiviniaSelectComponent],
  template: `
    <rv-select
      label="Status"
      [select]="controller"
      [options]="statuses()"
      (selectionChange)="onSelection($event)"
    />
  `,
})
export class StatusFilter {
  readonly statuses = signal<readonly RiviniaSelectOption[]>([]);
  readonly chosen = signal<readonly string[]>([]);
  readonly controller = new RiviniaSelect('multi');

  constructor() {
    effect(() => this.controller.syncOptions(this.statuses()));
  }

  onSelection(value: SelectChange): void {
    this.chosen.set(Array.isArray(value) ? value : []);
  }
}
```

The `[select]` binding is what makes this work: without it the component owns
its own controller, the effect mirrors a registry nobody reads, and a
component-owned controller is fixed to the mode it was built with.

**Why this converges.** `syncOptions` _replaces_ the registry and never reads
the signal it writes, so the mirroring effect has exactly one tracked
dependency — your `options` signal. Measured: the effect runs **once** for a
static list, not once per render. (An effect that read the registry it
wrote would re-arm itself forever — an infinite change-detection loop, not a
slow one. `syncOptions` deliberately avoids that shape.)

**What gets dropped.** `syncOptions` is a replacement, not a merge: an id that
is not in the incoming list is removed, and the selection is pruned with it.
If you need to restore a value before its options have loaded, keep it in your
own state and apply it once the list arrives — or write it through `setValue`,
which bypasses the unknown-id guard on purpose.

## Building a custom dropdown UI

`rv-select` is one implementation. If your design needs more than the list the
component builds — group headers between rows, a nested submenu, your own scroll
container or virtualiser — drive the headless controller yourself and render the
list. Per-row content (an avatar, a badge, two lines) does not need this: it goes
through [`optionTemplate`](recipes.md#icons-avatars-and-custom-rows), which keeps
the row's ARIA and keyboard.

The contract the controller gives you:

| Signal / method    | What your UI does with it                                                                |
| ------------------ | ---------------------------------------------------------------------------------------- |
| `query`            | The filter box's value. Bind both ways with `setQuery`.                                  |
| `filtered`         | The rows to render, already filtered.                                                    |
| `value` / `values` | The current selection; render the check mark or radio from it.                           |
| `selectedLabels`   | The selected labels in pick order; the built-in trigger shows the first and a `+N` pill. |
| `isSelected(id)`   | Per-row selected state.                                                                  |
| `select(id)`       | Single-mode pick. Returns `false` when the row is disabled — respect that.               |
| `toggle(id)`       | Multi-mode pick.                                                                         |
| `clear()`          | The clear button.                                                                        |

A minimal custom dropdown, single mode, with a grouped list:

```ts
import { Component, signal } from '@angular/core';
import { RiviniaSelect, type RiviniaSelectOption } from '@rivinia/select';

interface Group {
  readonly label: string;
  readonly items: readonly RiviniaSelectOption[];
}

@Component({
  selector: 'app-grouped-select',
  template: `
    <button type="button" (click)="open.set(!open())" [attr.aria-expanded]="open()">
      {{ controller.selectedLabels()[0] ?? 'Pick one' }}
    </button>

    @if (open()) {
      <div class="menu" role="listbox">
        @for (group of groups; track group.label) {
          <p class="group">{{ group.label }}</p>
          @for (item of group.items; track item.id) {
            <button
              type="button"
              role="option"
              [attr.aria-selected]="controller.isSelected(item.id)"
              [disabled]="item.disabled ?? false"
              (click)="choose(item)"
            >
              {{ item.label }}
            </button>
          }
        }
      </div>
    }
  `,
})
export class GroupedSelect {
  readonly controller = new RiviniaSelect('single');
  readonly open = signal(false);

  readonly groups: readonly Group[] = [
    {
      label: 'Open',
      items: [
        { id: 'a', label: 'Alpha' },
        { id: 'b', label: 'Beta', disabled: true },
      ],
    },
    { label: 'Closed', items: [{ id: 'c', label: 'Gamma' }] },
  ];

  constructor() {
    for (const group of this.groups) {
      for (const item of group.items) this.controller.registerOption(item);
    }
  }

  choose(item: RiviniaSelectOption): void {
    if (this.controller.select(item.id)) this.open.set(false);
  }
}
```

**What the controller does NOT do for you**, so you can budget for it:

- **No positioning.** The built-in panel uses CSS anchor positioning where the
  engine supports the gate — see [browser support](../browser-support.md) and
  [theming](theming.md). Your own markup must place itself, either with the
  same `anchor-name` / `position-area` pair, or by not being a top-layer
  element.
- **No keyboard model.** Arrows, Home/End, Enter, Escape and Tab are yours.
  `@rivinia/menu` gives you a complete, audited menu-button implementation if
  you want to compose rather than write it.
- **No ARIA.** `role="listbox"` / `role="option"` / `aria-selected` above are
  yours to keep consistent; the built-in panel uses a `role="menu"` rows
  container with `menuitemradio` (single) and `menuitemcheckbox` (multi) rows —
  see [accessibility](accessibility.md).
- **No scroll or focus management.** The built-in panel moves focus into the
  option list and returns it to the trigger on close.

If you want the keyboard and ARIA for free but your own pixels, compose the
headless controller with `@rivinia/menu`'s UI, which is a separate package
with no dependency on this one.

## Further reading

- [The API](api.md) — the controller's members, and which of them the
  structural interface keeps.
- [Recipes](recipes.md) — paged data, a loader row, `reachEnd`, a virtualised
  list.
- [Accessibility](accessibility.md) — what the built-in panel's DOM is, so you
  can decide whether to copy it.
