# @rivinia/menu — the API

Back to [the README](../../projects/menu/README.md) ·
[ready-made component](ready-made.md) · [headless usage](headless.md)

## What each entry point exports

| Entry point        | Exports                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@rivinia/menu`    | `RiviniaMenu` (the controller class), `RiviniaMenuController`, `RiviniaMenuItem`, `RiviniaMenuItemData`, `RiviniaMenuFocus`, `RiviniaMenuPlacement` (types)                                                   |
| `@rivinia/menu/ui` | `RiviniaMenuComponent`, `RiviniaMenuItem` (the row directive), `computeMenuPosition`, `MENU_GAP`, `RiviniaMenuUiPlacement`, `MenuPick`, `MenuCoordinates`, `MenuPanelSize`, `MenuTriggerRect`, `MenuViewport` |

`RiviniaMenuItem` is deliberately spelled the same in both entries: in the
headless one it is the shape a registered row must have, in `/ui` it is the
directive that registers one. Nothing else crosses the boundary — `/ui` depends
on the headless package through its public API only, and the headless entry has
no DOM and no styles.

## `rv-menu` inputs and outputs

| API                       | Type                                                 | Behavior                                                                                   |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `menu`                    | `RiviniaMenuController \| null`                      | Optional external controller; omitted means the component owns one.                        |
| `items`                   | `readonly RiviniaMenuItemData[] \| null`             | Declarative rows (`id`, `label`, optional `disabled`).                                     |
| `placement`               | `bottom-start \| bottom-end \| top-start \| top-end` | Logical, RTL-aware placement; defaults to `bottom-start` and flips vertically when needed. |
| `menuLabel`               | `string \| null`                                     | Accessible name of the menu panel.                                                         |
| `panelClass`, `itemClass` | `string \| null`                                     | Additional classes on the panel, or on generated data rows.                                |
| `picked`                  | `MenuPick` (`{ id: string }`)                        | Emits after an enabled item is activated and the menu closes.                              |
| `opened`, `closed`        | `void`                                               | Notify when the panel opens or closes, for any close reason.                               |

## `rvMenuItem` options

For projected rows the directive also accepts:

- `id` (required), `disabled` (defaults to `false`)
- `checked: boolean | null` (defaults to `null`; a boolean sets `aria-checked`)
- `radio: boolean` (defaults to `false`; makes a checked row a radio)
- `label: string | null` (optional explicit typeahead text; otherwise visible
  text is used)

| `checked` | `radio` | Role               |
| --------- | ------- | ------------------ |
| `null`    | —       | `menuitem`         |
| boolean   | `false` | `menuitemcheckbox` |
| boolean   | `true`  | `menuitemradio`    |

Disabled rows remain visible but cannot be activated. For a native disabled
`button`, the directive also recognizes the element's native disabled state.

## The shapes

| Name                   | Fields                             | Used by                          |
| ---------------------- | ---------------------------------- | -------------------------------- |
| `RiviniaMenuItemData`  | `id`, `label`, optional `disabled` | `[items]` data rows              |
| `MenuPick`             | `id`                               | the `(picked)` output            |
| `RiviniaMenuItem`      | `id`, optional `disabled`          | the controller's registry        |
| `RiviniaMenuFocus`     | `'first' \| 'last' \| 'none'`      | `openMenu()` / `toggle()`        |
| `RiviniaMenuPlacement` | the four logical sides             | the controller's placement state |

Data-driven rows are rendered as `<button type="button">` — an implicit
`submit` inside a form would navigate away on every pick — and use the `id`,
`label`, and `disabled` fields.

## The controller

`RiviniaMenu` is the headless surface: `open`, `activeId` and `items` as
signals, plus `register`, `unregister`, `openMenu`, `closeMenu`, `toggle`,
`pickActive`, `activateFirst`, `activateLast`, `activateNext`,
`activatePrevious` and `activate`. Its full member table, and what you still
own when you drive it yourself, are in
[headless usage](headless.md).

`RiviniaMenuController` is the **structural** subset of that surface, so a UI
layer can depend on the interface instead of the class — the same dual-realm
rule the other Rivinia packages follow.

## Not provided

Submenus, menubars, virtualization, form-control binding, and option-group
behavior. This component does not implement a persistent multi-select menu.
[Keyboard and interaction](interaction.md) lists the rest of the limitations
next to the behavior they belong to.
