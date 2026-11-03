# @rivinia/select — keyboard, focus and accessibility

Back to [the README](../../projects/select/README.md) ·
[the API](api.md) · [recipes](recipes.md) ·
[theming](theming.md)

## Keyboard and focus

Single/multi share the same model:

- **Open:** Enter / Space on the trigger, or click.
- **Filter box (when `searchable`):** typing filters; the box owns its keystrokes
  (spaces never leak to the typeahead). Tab moves focus **into the list**; Enter
  picks the active option; Escape closes.
- **List:** ArrowDown / ArrowUp move the active option (disabled options are
  skipped); Home / End jump to the first / last enabled option; Enter / Space
  picks; Escape closes.
- **Typeahead:** typing in the list moves the active option to the next row whose
  **label** starts with what you typed. The `hint` is deliberately not part of the
  index, so a keyboard-shortcut hint never causes a match.
- **Single mode** closes on pick; **multi mode** toggles with a check mark and
  stays open.
- Opening focuses the filter box (when searchable) or the first enabled option.
  Closing resets the filter and returns focus to the trigger.
- **An outside scroll closes the panel** (`select-popup.ts:369-378`). Scrolling
  inside the panel is exempt. This is the same reasoning as the resize rule
  below: the alternative is a panel that drifts off its trigger.
- **A resize closes the panel** — except one that changes only the height, with
  the caret in the filter box: that is the on-screen keyboard, and taking the
  filter away mid-word is worse than a panel that keeps its placement. Any width
  change closes, because width is the axis the panel is anchored on. This is the
  policy recorded as PROVISIONAL in
  [`docs/releases/1.0/HUMAN-CHECKS.md`](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/docs/releases/1.0/HUMAN-CHECKS.md)
  (S4) — it still needs a real device.

## Accessibility

Select is a **button + menu**, not an ARIA combobox and not a native `<select>`.
The shipped DOM (measured in Chromium; the accessibility tree is committed under
[`docs/a11y-snapshots`](https://github.com/abdelfattahqandil21-oss/Revinia/tree/main/docs/a11y-snapshots)):

- the trigger is a `<button>` carrying `aria-haspopup="menu"`, `aria-expanded`
  and `aria-controls` pointing at the menu;
- inside the panel, a rows-only container is `role="menu"` and carries the
  panel's accessible name (`popupLabel`, else `label`);
- single rows are `role="menuitemradio"` with `aria-checked`; multi rows are
  `role="menuitemcheckbox"` with `aria-checked`. There is no
  `aria-multiselectable` — the rows carry the state;
- the filter box (`role="searchbox"`), the empty state, the loader row and your
  footer are **siblings of the menu inside the panel**, never its children:
  `role="menu"` may only own `menuitem*`/`group`/`separator`, and a searchbox
  child fails axe's `aria-required-children` (measured critical). They still
  scroll with the rows and the filter box still sticks to the top edge;
- focus physically moves into the list, so there is no `aria-activedescendant`.

Consequences to be aware of:

- Screen readers announce a menu, not a listbox and not a native `<select>`. If
  you need native-select or listbox semantics, use a native `<select>` or build
  the markup yourself on the [headless controller](headless.md); Select does not
  pretend to be one.
- Give the field an accessible name: a visible `label` (preferred) or `ariaLabel`.
  The opened panel should be named too, via `popupLabel` or by letting it fall
  back to `label`. The trigger's accessible name composes that field name with
  the visible value (`aria-labelledby`), so the name always contains the text on
  screen — a button named only "Invoice status" while showing "Paid" fails WCAG
  2.5.3. With neither a `label` nor an `ariaLabel` the name stays content-based,
  which already contains the value.
- `role="searchbox"` is used on the filter input; its name defaults to
  `'Search options'` and is configurable through `searchLabel`.
- **A custom `listTemplate` must render menu items.** Give every row a
  `menuitem`/`menuitemradio`/`menuitemcheckbox` role and `tabindex="-1"`;
  otherwise the menu owns elements it may not own (axe `aria-required-children`,
  critical) and the scrollport is not focusable
  (`scrollable-region-focusable`, serious). The row directive is internal, so
  write the attributes — see the [virtual-list recipe](recipes.md).

## What the multi trigger announces

The visible trigger shows only the first pick plus `+N`, so the rest of the
selection is carried by `aria-describedby` on the trigger:

| Name source             | Picks | Accessible description          |
| ----------------------- | ----- | ------------------------------- |
| `label`                 | ≥ 1   | every selected label            |
| `ariaLabel`, no `label` | ≥ 1   | every selected label            |
| neither                 | 1     | none — the label is the value   |
| neither                 | ≥ 2   | every label after the first     |
| any                     | 0     | none — no attribute, no element |

The text lives in a visually hidden sibling of the trigger (`.rv-select-sr-only`,
clipped — not `display: none`, so the IDREF target stays in the accessibility
tree), is formatted with `Intl.ListFormat` (`"TypeScript, Angular, and Signals"`
in `en`, `"TypeScript وAngular وSignals"` in `ar`) and carries no English prefix.
The locale is `document.documentElement.lang`: changing it re-renders the
description live, with no reload and no extra input. An invalid locale falls back
to `en`; a runtime without `Intl.ListFormat` joins with `', '`. The `+N` pill is
`aria-hidden`, so it appears in neither the name nor the description, and
clearing every pick removes the attribute and the hidden element together.

## Known verification gaps

The machine-checked half of this section — which axe runs, which assertions,
which accessibility trees — is recorded in
[`docs/testing/a11y-verification.md`](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/docs/testing/a11y-verification.md).

- **No real screen reader testing** — automated axe checks and committed
  accessibility-tree snapshots only. NVDA, JAWS, VoiceOver and TalkBack are still
  "not tested"; the matrix and the steps are in that document and in
  [`docs/releases/1.0/HUMAN-CHECKS.md`](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/docs/releases/1.0/HUMAN-CHECKS.md)
  (S2).
- **Custom `listTemplate` rows are not keyboard-navigable.** Arrows move between
  the select's own rows; a consumer-rendered window has no row directive, so
  arrow keys do not step through it (post-1.0). Pointers and the filter box still
  work, and `panelReady` gives you the scrollport.
- **Safari proper is not tested** — WebKit is the engine, not the browser chrome
  (Safari's own top-layer and anchor support can lag the engine). The engines
  actually run here, their versions, and what WebKit needs on this machine are in
  [`docs/testing/browser-support.md`](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/docs/testing/browser-support.md).
- **No Tailwind project** in the test suite.
- **Forced colors** ships system-colour defaults for the panel, rows, trigger and
  search (see [Accent and forced colors](theming.md#accent-and-forced-colors)).
  The UA forces author colours in that mode, so a brand palette is intentionally
  not applied; overriding a `--rv-select-*` token there does not bring it back.
- **No explicit `ControlValueAccessor` implementation.** In Angular 22,
  `rv-select` implements `FormValueControl`; Signal Forms use `[formField]`, and
  Reactive Forms and template-driven forms are covered by the package's
  integration tests (see [Forms](forms.md)).

## Further reading

- [The API](api.md) — every input, output and controller member.
- [Forms](forms.md) — `[formField]`, `formControlName`, `ngModel`, and the form
  state the component exposes.
- [Recipes](recipes.md) — the virtual-list markup that keeps `role="menu"` legal.
- [Browser support](https://github.com/abdelfattahqandil21-oss/Revinia/blob/main/docs/testing/browser-support.md)
  — the two floors, and which feature does what.
