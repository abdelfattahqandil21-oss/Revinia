# README template (S9)

Every package README in 1.0 scope follows the same order and the same headings.
Target length: **150 lines**. Hard cap: **200 lines**, enforced by
`pnpm check:readmes` with a temporary per-package allowance that the S9 content
move removes.

## Sections, in order

| # | Heading | What belongs here | Budget |
| --- | --- | --- | --- |
| 1 | `# @rivinia/<pkg>` | badges (npm version, license) and one-sentence pitch | 5 lines |
| 2 | — (no heading) | the hook: an 8–12 line working example of the **ready-made UI**, plus a screenshot/gif or a live demo link | 25 lines |
| 3 | `## Why <pkg>` | three reasons to use it; "headless first" is one bullet, never the headline | 15 lines |
| 4 | `## Install` | the exact install command(s), peer notes | 10 lines |
| 5 | `## Quick start` | three numbered steps, ending in a working screen | 40 lines |
| 6 | `## Two ways to use it` | table: ready-made UI (`.../ui`), headless controller (root entry), or both; one sentence that the parts are independent | 12 lines |
| 7 | `## Compatibility` | Angular, Node, browsers (S7 table) | 12 lines |
| 8 | `## Go further` | table of absolute GitHub links to `docs/` pages | 15 lines |

Everything else moves to `docs/`, one topic per page: `api.md`, `forms.md`,
`headless.md`, `recipes.md`, `customization.md`, `accessibility.md`. Theming is
**one shared page** owned by `@rivinia/theme`; each package keeps only its own
token table and links to it. Migration notes live in `CHANGELOG.md`.

For `@rivinia/i18n` the three tiers keep their names: *Start here* (README),
*Everyday use* (`docs/guide.md`, split by topic), *Reference*
(`docs/reference.md`, split by topic).

## Rules

- No hand-written version numbers in prose; badges only. The one allowed
  exception is a `Package version: **x.y.z**` line, and
  `pnpm check:readmes` fails if it disagrees with `package.json`.
- Absolute GitHub links until npm's rendering of relative links is verified.
- Every section removed from a README must exist in `docs/` and be linked from
  the new README.
- Quick start and hook snippets must compile in the consumer smoke test (S8).
- A README that needs more than 200 lines is a docs page waiting to be written.

## Gate configuration

`scripts/check-readmes.mjs`:

- `LINE_BUDGET = 200`;
- `PACKAGES = ['theme', 'select', 'menu', 'i18n']` — extend when another package
  enters 1.0 scope;
- `ALLOW_OVER_BUDGET` — the temporary allowance map. It currently lists all
  four packages; each entry is deleted as its README lands under budget. An
  empty map is the finish line.
- Relative links are reported as warnings (non-blocking) until the docs pages
  exist.
