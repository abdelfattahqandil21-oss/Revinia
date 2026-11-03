# @rivinia/menu — keyboard and interaction

Back to [the README](../../projects/menu/README.md) ·
[ready-made component](ready-made.md) · [the API](api.md)

The menu follows the WAI-ARIA menu-button pattern. It is for **actions**, not
for a menubar or a general-purpose listbox.

## Pointer and keyboard open differently, on purpose

A click opens the panel and leaves focus on the trigger with no row selected —
a glance is not a choice. Enter, Space, or ArrowDown opens on the first enabled
item; ArrowUp opens on the last. After a click, the first ArrowDown (or Up,
End, Home) enters the rows at the expected end.

Arrow keys wrap through enabled items; Home and End jump to the first and last.
Printable characters perform typeahead matching.

**Exactly one row is ever highlighted.** Hover moves the active row through the
controller rather than painting a second `:hover` wash, so the row the pointer
is over and the row the keyboard is on can never both look chosen.

## Closing

Escape closes and returns focus to the trigger. Selecting an item closes first,
then emits `picked`. Outside pointer-down closes without stealing focus from the
clicked target.

Tab closes and moves focus onward — including right after a pointer open, where
focus never left the trigger. The menu is non-modal.

## Opening, closing and the viewport

Scrolling or resizing the page closes the menu so the panel does not drift from
its trigger. One exception: a resize that changes only the **height**, with the
caret in an editable element **you projected into the panel**, keeps it open —
that is the on-screen keyboard, and closing would drop the field mid-word. A
built-in menu has nothing editable, so for it every resize closes; a width
change always closes, since width is the axis the panel is anchored on.

The automated half lives in
[`e2e/popup/conformance.spec.ts`](../../e2e/popup/conformance.spec.ts), run
against the select, the built-in menu, and a menu with a consumer field
projected into its panel. The real-device half is **not tested** and is listed
in [`docs/releases/1.0/HUMAN-CHECKS.md`](../HUMAN-CHECKS-1.0.md) (S4).

Placement is measured on the client and flipped to fit the viewport when needed.
Where supported, the panel uses the browser popover top layer to avoid clipping
ancestors; engines without that support use the positioned-panel fallback, which
is a tested path rather than an untested hope — see
[browser support](../browser-support.md) for the two floors.

## Edge cases and limitations

- An empty or all-disabled menu can open, but has no active item to select.
- The default controller starts closed during server rendering.
- Submenus, menubars, virtualization, form-control binding, and option-group
  behavior are not provided. This component does not implement a persistent
  multi-select menu.
- Projected content keeps its own keys: the row keys only act when they come
  from the panel or from a registered row. See
  [projected content](ready-made.md#projected-content-is-a-safe-host-not-a-second-menu).
