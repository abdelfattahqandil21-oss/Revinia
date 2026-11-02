# README template (S9)

Every package README in 1.0 scope follows the same order and the same headings.
Target length: **150 lines**. Hard cap: **200 lines**, enforced by
`pnpm check:readmes` with a temporary per-package allowance that the S9 content
move removes.

## Sections, in order

| #   | Heading                 | What belongs here                                                                                                               | Budget   |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | `# @rivinia/<pkg>`      | badges (npm version, license) and one-sentence pitch                                                                            | 5 lines  |
| 2   | — (no heading)          | the hook: an 8–12 line working example of the **ready-made UI**, plus what proves it renders — see "The hook, as shipped" below | 25 lines |
| 3   | `## Why <pkg>`          | three reasons to use it; "headless first" is one bullet, never the headline                                                     | 15 lines |
| 4   | `## Install`            | the exact install command(s), peer notes                                                                                        | 10 lines |
| 5   | `## Quick start`        | three numbered steps, ending in a working screen                                                                                | 40 lines |
| 6   | `## Two ways to use it` | table: ready-made UI (`.../ui`), headless controller (root entry), or both; one sentence that the parts are independent         | 12 lines |
| 7   | `## Compatibility`      | Angular, Node, browsers (S7 table)                                                                                              | 12 lines |
| 8   | `## Go further`         | table of absolute GitHub links to `docs/` pages                                                                                 | 15 lines |

## The hook, as shipped

This template asked for "a screenshot/gif or a live demo link" under the hook.
**No 1.0 package has either**, and none was added for S9: there is no tracked
image asset in the repository and there is no hosted demo, so a link would have
been invented. What ships instead, in all four READMEs:

- select, menu and i18n name the in-repo page that renders the hook and the
  command that builds it — `projects/menu-e2e/src/app/pages/select.ts` with
  `npx ng build menu-e2e`, `projects/menu-e2e/src/app/pages` for the menu,
  `projects/i18n-e2e/src/app` for i18n. Each is the same code the Playwright and
  conformance suites drive, so it cannot be a mockup.
- theme renders nothing on its own, so its hook ends with the observable result
  instead: a `rv-select` on that page takes the palette. Its `## Quick start`
  step 3 says to add a component and look at it.

A binary asset costs more in the tarball than it buys in understanding, and a
demo URL goes stale with no gate to catch it. If a screenshot is ever wanted, it
belongs in the repository as a tracked file with a rebuild command, not in the
README as a hotlink.

Everything else moves to `docs/`, one topic per page, filed under the package:
`docs/<pkg>/<topic>.md`. That is what S9 produced — `docs/theme/`,
`docs/select/`, `docs/menu/` and nine pages in `docs/i18n/` (`api.md`,
`translating.md`, `icu.md`, `switching.md`, `resilience.md`, `dictionaries.md`,
`cli.md`, `toggle.md`, `select.md`). Names like `forms.md` and `headless.md` from
the first draft of this template were not needed; the pages are named after what
a reader is doing. Theming is **one shared page** owned by `@rivinia/theme`; each
package keeps only its own token table and links to it. Migration notes live in
`CHANGELOG.md`.

For `@rivinia/i18n` the three tiers keep their meaning, not the file names this
template first proposed (`docs/guide.md`, `docs/reference.md`): the _Start here_
tier is the README, _Everyday use_ and _Reference_ are topic pages inside
`docs/i18n/`, and the README's `## Go further` table labels each row with its
tier. One directory per package beat two names per package because it matches
what theme, select and menu already did.

## Rules

- No hand-written version numbers in prose; badges only. The one allowed
  exception is a `Package version: **x.y.z**` line, and
  `pnpm check:readmes` fails if it disagrees with `package.json`.
- Absolute GitHub links until npm's rendering of relative links is verified.
- Every section removed from a README must exist in `docs/` and be linked from
  the new README.
- A topic page in `docs/<pkg>/` is a consumer document: `pnpm check:docs` audits
  it against that package's public entry points, exactly as it audits the
  README — an API table naming a symbol the package does not export fails the
  gate. Documents elsewhere in `docs/` (`DECISIONS.md`, the AUDITs, the SPECs,
  `MERGES-1.0.md`) are repo-internal: they name removed and `@internal` symbols
  on purpose, so they are out of that audit's scope by directory, not by
  allowlist.
- Quick start and hook snippets must compile in the consumer smoke test (S8).
- A README that needs more than 200 lines is a docs page waiting to be written.

## Gate configuration

`scripts/check-readmes.mjs`:

- `LINE_BUDGET = 200`;
- `PACKAGES = ['theme', 'select', 'menu', 'i18n']` — extend when another package
  enters 1.0 scope;
- `ALLOW_OVER_BUDGET` — the temporary allowance map. **It is empty**: with the
  i18n move, each package measured 104, 172, 134 and 165 lines under its own
  weight (2026-11-02).
- Relative links are reported as warnings (non-blocking) until the docs pages
  exist; they exist now, and every README link resolves against the working
  tree.
- `scripts/check-docs.mjs` takes the same scope from the directory layout:
  `consumerDocuments(pkg)` returns `projects/<pkg>/README.md`, `RECIPES.md` and
  `docs/<pkg>/*.md`, so a new topic page is audited without touching a list.
  `PLATFORM_TERMS` holds the vocabulary that is not a package export — `Intl` and
  its constructors, the forced-colours system colours, the `KeyboardEvent.key`
  names, browser and engine names — and an all-caps token (`EG`, `XXX`, `Z`) is
  read as a locale, currency or pattern letter rather than as a symbol.
