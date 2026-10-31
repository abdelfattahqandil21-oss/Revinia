# Accessibility verification — 1.0

What a machine proved, and what still needs a person. Every cell that needs a
person says **not tested**; nothing in this file was inferred.

## Automated: what actually ran

| Check                                         | Where                                                                  | Result                                     |
| --------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------ |
| axe, closed trigger                           | `e2e/select/a11y.spec.ts`                                              | 0 violations                               |
| axe, single + searchable, open                | `e2e/select/a11y.spec.ts`                                              | 0 violations                               |
| axe, multi, open                              | `e2e/select/a11y.spec.ts`                                              | 0 violations                               |
| axe, RTL, open                                | `e2e/select/a11y.spec.ts`                                              | 0 violations                               |
| axe, custom `listTemplate`, open              | `e2e/select/a11y.spec.ts`                                              | 0 violations                               |
| axe, empty state                              | `e2e/select/a11y.spec.ts`                                              | 0 violations                               |
| Menu owns rows only, searchbox outside it     | `e2e/select/a11y.spec.ts`                                              | asserted                                   |
| `menuitemradio` + `aria-checked` after a pick | `e2e/select/a11y.spec.ts`                                              | asserted                                   |
| `menuitemcheckbox` per-row state (multi)      | `e2e/select/a11y.spec.ts`                                              | asserted                                   |
| Disabled row announced, never checked         | `e2e/select/a11y.spec.ts`                                              | asserted                                   |
| Trigger name contains the visible value       | `e2e/select/a11y.spec.ts` (WCAG 2.5.3)                                 | asserted                                   |
| RTL roles and reading order                   | `e2e/select/a11y.spec.ts`                                              | asserted                                   |
| Keyboard: arrows, Home/End, Enter, Escape     | `e2e/select/a11y.spec.ts`                                              | asserted                                   |
| Keyboard: Space picks the focused row         | `e2e/select/a11y.spec.ts`                                              | asserted                                   |
| Keyboard: typing jumps to the matching row    | `e2e/select/a11y.spec.ts`                                              | asserted                                   |
| Keyboard: typeahead, Tab moves into the rows  | `projects/select/tests/select-aria.spec.ts`, `select-contract.spec.ts` | asserted (jsdom)                           |
| Chromium accessibility tree, six states       | `docs/a11y-snapshots/*.json`                                           | captured 2026-10-31, Chromium 156.0.8078.4 |

Automated tooling cannot hear the result. axe checks rules, the DOM assertions
check structure, and the accessibility-tree snapshots show the shape an
assistive technology receives — none of them prove what a screen reader says or
what the user understands.

## Manual matrix — every cell starts "not tested"

| Combination              | Windows    | macOS      | Android    | iOS        |
| ------------------------ | ---------- | ---------- | ---------- | ---------- |
| NVDA + Firefox           | not tested | —          | —          | —          |
| NVDA + Chrome            | not tested | —          | —          | —          |
| JAWS + Chrome (optional) | not tested | —          | —          | —          |
| VoiceOver + Safari       | —          | not tested | —          | not tested |
| TalkBack + Chrome        | —          | —          | not tested | —          |

For each combination, the steps and the pass criteria are in
[`HUMAN-CHECKS-1.0.md`](./HUMAN-CHECKS-1.0.md) (written at the end of the 1.0
work, S8). In short: open the single select, arrow through the rows, pick one
and reopen; repeat for multi, for the filter box, for the disabled row and in
RTL.

## Known limits recorded in the README

- No keyboard navigation **inside** a custom `listTemplate` (post-1.0): arrows
  move between the select's own rows, not between consumer-rendered ones.
- No forced-colors/high-contrast pass.
- Safari proper (not just WebKit) is not tested.
