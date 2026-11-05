# @rivinia/theme — the tokens

Back to [the README](../../projects/theme/README.md) ·
[how the tokens cascade](README.md)

Every colour ships in two schemes.

| Token          | Paints             | Light                         | Dark                         |
| -------------- | ------------------ | ----------------------------- | ---------------------------- |
| `--rv-bg`      | surface background | `#ffffff`                     | `#161616`                    |
| `--rv-fg`      | text               | `#111111`                     | `#f2f2f2`                    |
| `--rv-muted`   | secondary text     | `#555555`                     | `#a1a1aa`                    |
| `--rv-border`  | borders            | `#e0e0e0`                     | `#3f3f46`                    |
| `--rv-radius`  | corner radius      | `0.625rem`                    | same                         |
| `--rv-shadow`  | elevation          | `0 16px 48px rgba(0,0,0,.22)` | `0 16px 48px rgba(0,0,0,.6)` |
| `--rv-font`    | font stack         | system stack                  | same                         |
| `--rv-accent`  | brand / primary    | `#5b5bd6`                     | `#8b8bf0`                    |
| `--rv-danger`  | destructive        | `#dc2626`                     | `#f87171`                    |
| `--rv-ok`      | success            | `#16a34a`                     | `#4ade80`                    |
| `--rv-info`    | informational      | `#2563eb`                     | `#60a5fa`                    |
| `--rv-warning` | caution            | `#d97706`                     | `#fbbf24`                    |

These twelve names are the public contract: they are what every Rivinia
component reads, and what you are meant to set. Renaming one is a breaking
change; adding one is not.

Each package also owns tokens of its own, and they resolve through this layer.
The four surface tokens named in the cascade above — `--rv-select-bg`,
`--rv-menu-bg`, `--rv-modal-bg`, `--rv-toast-bg` — each fall back to `--rv-bg`.
The full table for a component's own names lives in that package's docs —
[select](../select/theming.md), [menu](../menu/theming.md).
