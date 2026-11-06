# Sizing and stacking

Tune modal sizing and understand stack ownership.

[Back to @rivinia/modal README](https://github.com/abdelfattahqandil21-oss/Revinia/blob/modal/v1.0.1/projects/modal/README.md)

## Sizing, stacking and who opened it

**A size per dialog.** The host's `size` is the default for every instance; a
dialog may override it when it is opened:

```ts
this.modal.openModal(this.confirmTpl, { ref: 'confirm', size: 'sm' });
```

```html
<rv-modal-host [modal]="modal" size="lg" />
```

The presets are **responsive** — each is a `clamp()`, so it scales with the
viewport between a floor and a ceiling instead of being a fixed width that
either overflows or gets capped:

| Preset | Width                       |
| ------ | --------------------------- |
| `sm`   | `clamp(16rem, 40vw, 24rem)` |
| `md`   | `clamp(20rem, 55vw, 32rem)` |
| `lg`   | `clamp(24rem, 70vw, 48rem)` |
| `xl`   | `clamp(28rem, 85vw, 64rem)` |
| `full` | `calc(100dvw - 2rem)`       |
| `auto` | sized to its content        |

Every one is a plain custom property, so the consumer overrides the preset in
CSS without touching the library:

```css
my-scope {
  --rv-modal-width-lg: clamp(30rem, 80vw, 60rem);
}
```

**One dialog can cover the ones below it.** A stack shows every dialog, so the
ones below stay visible behind the top one — right for a wizard, wrong for a
flow where the detail view REPLACES the list view:

```ts
this.modal.openModal(this.detailTpl, { ref: 'detail', coversOthers: true });
```

The dialogs below are not rendered while the cover is up, and they come back
when it closes. They stay in the manager the whole time.

**The opener is attributable.** `openModal` is normally called from an event
handler, which is not an injection context, so the manager cannot discover the
caller. Naming it puts `data-caller` on the dialog, which the DevTools
inspector shows — so a dialog that appears unexpectedly points at its source:

```ts
export class UsersScreen {
  open() {
    this.modal.openModal(this.detailTpl, { caller: UsersScreen });
  }
}
```

```html
<dialog class="rv-modal" data-caller="UsersScreen">…</dialog>
```

**Smoothness.** The dialog transitions its own box — width, height and the
offsets — so a size change or a dialog opening on top of another is a
movement rather than a jump. The stack change is additionally wrapped in a
**view transition** where the browser supports it, so the lower dialog is
painted continuously instead of flickering. During a viewport resize the
transition is switched off (`data-resizing="true"`): the dialog's size is
derived from the viewport, so animating towards a moving target lags behind
the pointer.
