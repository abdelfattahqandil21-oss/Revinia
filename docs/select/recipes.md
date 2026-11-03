# @rivinia/select — recipes

Back to [the README](../../projects/select/README.md) ·
[the API](api.md) · [headless usage](headless.md)

## Icons, avatars and custom rows

The default option row is a label, an optional hint and a check mark. When you
need an icon, an avatar or a badge, supply a template — it replaces the row's
content and nothing else:

```html
<ng-template #row let-option>
  <img class="size-4 shrink-0" [src]="option.icon" alt="" />
  <span>{{ option.label }}</span>
  @if (option.badge) {
  <span class="badge">{{ option.badge }}</span>
  }
</ng-template>

<rv-select label="Icon picker" [options]="options" [optionTemplate]="row" />
```

The `<button>` wrapper stays, so the ARIA, the keyboard handling, the
disabled state and the multi-mode check keep working. What changes is the
content inside it — which means the hint and the check mark become yours to
render too.

The template context is the option, and it is typed **loosely on purpose**:
your option shape (with an `icon`, say) is not the library's type, and the
template is yours to narrow:

```ts
interface IconOption {
  readonly id: string;
  readonly label: string;
  readonly icon: string;
  readonly badge?: string;
  readonly disabled?: boolean;
}

readonly options: readonly IconOption[] = [
  { id: 'a', label: 'Alpha', icon: '/a.svg' },
];
```

**Why a template and not an `icon` field.** An icon field would put raw markup
(or a URL the library has to fetch) into the component's hands, and every
consumer's icons are different — a URL, an inline SVG, an icon font, an
`<img>`. A template keeps that decision with you.

A two-line row is still one row, so it belongs here too — put the label and the
description inside the template. What `optionTemplate` cannot do is add markup
_between_ rows: group headers, a nested submenu, or your own scroll container
need the headless controller
(see [building a custom dropdown UI](headless.md#building-a-custom-dropdown-ui)).

## Paged data: loading, virtual lists, "load more"

A select whose options come from a paged API needs three things, and the
component provides all three.

**A loader row**, while a request is in flight:

```html
<rv-select [options]="options()" [loading]="loading()" (reachEnd)="loadMore()" />
```

**`reachEnd`**, emitted when the panel scrolls close to its end — so the
consumer fetches the next page:

```ts
loadMore() {
  this.api.nextPage().then((page) => this.options.update((all) => [...all, ...page]));
}
```

The threshold is a **length**, not a percentage: the panel's scrollable height
changes as rows arrive, so a percentage would fire at a different row every
time.

```css
rv-select {
  --rv-select-popup-reach-end-offset: 3rem;
}
```

**A footer slot**, for a "Load more" button or anything else under the list:

```html
<rv-select [options]="options()">
  <button rv-select-popup-footer type="button" (click)="loadMore()">Load more</button>
</rv-select>
```

`[rvSelectPopupFooter]` is the camelCase spelling; both are accepted. The
footer is a sibling of the rows container inside the panel, never a child of
the `role="menu"` — see [accessibility](accessibility.md).

### A virtualised list

For a long list, render only the visible rows. `listTemplate` replaces the
whole list, and `panelReady` hands you the panel element — which is the scroll
container the virtualizer needs:

```html
<ng-template #list let-options>
  <div [style.height.px]="virtualizer.getTotalSize()" style="position: relative">
    @for (row of virtualizer.getVirtualItems(); track row.index) {
    <div
      role="menuitem"
      tabindex="-1"
      [style.transform]="'translateY(' + row.start + 'px)'"
      style="position: absolute; top: 0; left: 0; width: 100%"
    >
      {{ options[row.index].label }}
    </div>
    }
  </div>
</ng-template>

<rv-select [options]="options()" [listTemplate]="list" (panelReady)="panel.set($event)" />
```

The template context is the **filtered** list — `$implicit`, also named
`options` — so a `count` built from your own source array only matches while the
filter box is empty. Feed the virtualizer the length of what it is being handed,
or keep the two signals in step.

The `role` and `tabindex` are not decoration: the rows sit inside the panel's
`role="menu"`, which may only own `menuitem*`/`group`/`separator`, and the
scrollport needs a focusable descendant. Without them axe reports
`aria-required-children` (critical) and `scrollable-region-focusable` (serious).
Row directives are internal, so you write the attributes yourself.

```ts
readonly panel = signal<HTMLElement | null>(null);

readonly virtualizer = injectVirtualizer(() => ({
  scrollElement: this.panel(),
  count: this.options().length,
  estimateSize: () => 36,
  overscan: 5,
}));
```

With a virtual list you own the scroll, so `reachEnd` is yours to detect —
the usual way is the virtualizer's own last-row check:

```ts
const items = this.virtualizer.getVirtualItems();
const last = items[items.length - 1];
if (last && last.index >= this.options().length - 1) this.loadMore();
```

`@tanstack/angular-virtual` is the usual choice, but any virtualizer works —
it only needs the scroll element and the row count.

Keyboard navigation reveals the active row with
`scrollIntoView({ block: 'nearest' })`. A virtualiser owns the other half: when
the active row is not mounted (it is outside the rendered window), there is no
element to reveal, so scroll to it yourself — `virtualizer.scrollToIndex()` in
an effect keyed on your selected value — and let the component reveal rows
within the rendered window.

The panel is destroyed on close and built again on the next open, so
`panelReady` fires **once per open with a new element**. Keep it in a signal
and rebind your scroll listener when it changes; caching the first element
leaves the list scrolling a detached node after the first reopen.

A consumer `listTemplate` also suppresses the built-in empty state: the
component cannot know that your list rendered nothing.

### A custom entrance animation

The whole animation is **one token**, so you never fight the cascade:

```css
my-scope {
  --rv-select-popup-animation: my-slide-in 200ms cubic-bezier(0.2, 0, 0, 1);
}
```

A token rather than an `animation` override on purpose: Angular injects a
component's styles into `<head>` at runtime, which is _after_ your stylesheet,
so at equal specificity the library's declaration would win.

The two halves are still separate if you only want one of them:

```css
my-scope {
  --rv-select-popup-duration: 240ms;
  --rv-select-popup-easing: cubic-bezier(0.2, 0, 0, 1);
}
```

## Further reading

- [Variants](variants.md) — what `variant="premium"` adds to the entrance, the
  rows and the loading row.
- [Accessibility](accessibility.md) — the rules a custom list has to keep.
- [Theming](theming.md) — the tokens these recipes touch.
