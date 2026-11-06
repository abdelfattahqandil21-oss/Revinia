# Ready-made UI

Render a modal with the optional UI entry point.

[Back to @rivinia/modal README](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/modal/v1.0.1/projects/modal/README.md)

## Ready-made UI

`@rivinia/modal/ui` is optional. It provides a native `<dialog>` component
(`RiviniaModalDialog`) for UI-only use and `RiviniaModalHost` to render
manager-owned modals. The host passes dismissal intents to the manager before
closing, so guards and promise results remain coordinated.

For a UI-only dialog, import the standalone component and bind its `open`
model. This mode has no manager, guards, or `ModalHandle` promise:

```ts
import { Component } from '@angular/core';
import { RiviniaModalDialog } from '@rivinia/modal/ui';

@Component({
  imports: [RiviniaModalDialog],
  templateUrl: './preview-dialog.component.html',
})
export class PreviewDialog {
  open = false;
}
```

```html
<!-- src/app/preview-dialog.component.html -->
<button type="button" (click)="open = true">Preview</button>
<rv-modal-dialog #dialog [(open)]="open" title="Preview">
  <p>Dialog content.</p>
  <button type="button" (click)="dialog.confirm(true)">Continue</button>
  <button type="button" (click)="dialog.cancel('cancelled')">Cancel</button>
</rv-modal-dialog>
```

`RiviniaModalDialog` accepts `open`, `title`, `description`, `ariaLabel`,
`size`, `position`, `animation`, `closeOnEscape`, `backdrop`, and
`showCloseButton`; its `open` model supports `[(open)]`. In UI-only mode it
emits `confirmed`, `dismissed`, and `cancelled`. In managed use, the host
accepts the required `modal` manager input plus `size`, `showCloseButton`,
and `titleOf` overrides; observe the manager's `ModalHandle.result` instead
of the dialog outputs.
`RvModalHeader` and `RvModalFooter` are marker directives for custom header
and footer projection; import the marker used by the template and apply it
alongside `rv-modal-header` or `rv-modal-footer`. A custom header replaces the
default title and close button. Without a footer slot, no footer region is
rendered.

The native dialog provides focus containment and restores focus to its
invoker. The UI includes scroll locking, reduced-motion support, RTL-aware
logical positions, and responsive bottom-sheet styling below 640px for
center/top/bottom placements. The UI exposes size, position, animation,
backdrop, Escape, and close-button inputs. During server rendering it remains
closed and opens on the client after hydration. Theme it with CSS custom
properties such as `--rv-modal-bg`, `--rv-modal-fg`, `--rv-modal-border`,
`--rv-modal-radius`, and `--rv-modal-width-md`.
