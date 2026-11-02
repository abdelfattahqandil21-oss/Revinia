# @rivinia/theme — contrast

Back to [the README](../../projects/theme/README.md) ·
[the token table](tokens.md)

The two palettes are checked, not assumed. `pnpm check:contrast` measures every
documented pair in both schemes and fails when one drops below its threshold:

| Group      | Pairs                                                              | Threshold |
| ---------- | ------------------------------------------------------------------ | --------- |
| text       | `--rv-fg`, `--rv-muted`, `--rv-accent` on `--rv-bg`                | 4.5:1     |
| indicator  | `--rv-danger`, `--rv-ok`, `--rv-info`, `--rv-warning` on `--rv-bg` | 3:1       |
| decorative | `--rv-border` on `--rv-bg`                                         | reported  |

Measured today: text is 18.88, 7.46 and 5.37 in light and 16.16, 7.06 and 6.07
in dark; the indicators are 3.19 to 5.17 in light and 6.54 to 10.84 in dark.

Two limits worth knowing:

- `--rv-border` is a hairline around surfaces, not the only boundary of a
  control, and it measures 1.32:1 on white (1.73:1 on `#161616`). It is printed
  by the check but never fails it. If you rely on the border alone to identify
  a control, raise it yourself — WCAG 1.4.11 wants 3:1.
- The status tokens are guaranteed as **indicators**. On white, `--rv-ok` and
  `--rv-warning` are 3.30 and 3.19 — enough for a border or a dot, not for text.
  Use `--rv-fg` or `--rv-muted` for words.

The Bootstrap and Tailwind adapters replace these values with your stack's, so
the guarantee covers the palette this package ships, not the colours your
framework supplies.
