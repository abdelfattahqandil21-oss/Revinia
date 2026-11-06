# Top layer and managed list

Understand top-layer rendering and list management.

[Back to @rivinia/toast README](https://github.com/abdelfattahqandil21-oss/Revinia/blob/toast/v1.0.1/projects/toast/README.md)

## The list is in the top layer

A `position: fixed` list with a `z-index` is still in the DOCUMENT, so it is
clipped by an `overflow: hidden` ancestor and loses to any stacking context
above it — including the one a modal `<dialog>` creates.

The list is therefore a **manual popover**, which puts it in the browser's top
layer: the same layer a modal `<dialog>` uses. The top layer stacks in the
order elements are shown, and the list is re-shown whenever its contents
change, so a toast raised while a dialog is open lands above it. Measured: the
element at the toast's position is the toast, not the dialog.

A manual popover is not modal: it does not trap focus, does not make the page
inert, and does not close on an outside click — so it behaves exactly like
the list it replaces.

**The popover's user-agent styles are reset.** A popover gets a background, a
border, padding and `overflow: auto` from the UA, which puts a shared canvas
and a scrollbar around the stack — so the toasts read as one block instead of
separate cards. The list is a transparent, borderless column.

Where the browser has no `showPopover` the list stays in the document and a
`z-index` decides its order. The feature is detected, not assumed.


## The list must be MANAGED

`rv-toast-list` renders what it is given. Without a manager it has an empty
list and **no toast ever appears**:

```html
<!-- nothing shows: the list is presentational and empty -->
<rv-toast-list position="bottom-end" />

<!-- the manager drives it -->
<rv-toast-list [manager]="toast" position="bottom-end" />
```
