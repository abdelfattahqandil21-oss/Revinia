# Merge record — `release/1.0-integration`

The owner's decision of 2026-11-01 removes pull requests from this program: `gh`
stays unauthenticated, feature branches keep being pushed to origin, and a branch
enters `release/1.0-integration` only after its gates are green **and** a
fresh-context review reports no blocking issue. The merge is a squash, so a
feature branch's internal history does not enter the integration branch; no
force-push, ever, and `main` is never touched.

There is no PR body to hold that evidence, so it lives in this table. One row per
merge: the branch, the squash commit, the gates that were run with their numbers,
and the reviewer's verdict.

## Recorded merges

| # | Step | Branch | Into integration | Method | Gates on the merged tree | Review verdict |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | S0 pre-flight (spec, D85–D88, audit) | — | `e992e8a`…`263da56`, three single-parent commits made directly on the branch | none | docs only; `pnpm check:docs` | n/a |
| 2 | S1 packaging + S6/S9 gates | `pkg/repo/1-0-packaging` | `56cc363` | `--no-ff` | recorded in that step's DECISIONS entry | not recorded |
| 3 | S2 select ARIA | `pkg/select/aria-radio` | `03f6664` | `--no-ff` | recorded in that step's DECISIONS entry | not recorded |
| 4 | S5a theme dark mode + contrast | `pkg/theme/1-0-dark` | `cc3789e` | `--no-ff` | recorded in that step's DECISIONS entry | not recorded |
| 5 | S5b component theme wiring | `pkg/repo/1-0-component-theme` | `fc13cfb` | `--no-ff` | recorded in that step's DECISIONS entry | not recorded |
| 6 | S3 conformance + S4 resize | `pkg/repo/1-0-conformance-resize` | `011bccf` | `--squash` | 2026-11-02, on the merged tree: builds `select`/`menu`/`menu-e2e` exit 0; `npx playwright test` **363 passed** (121 × chromium, firefox, webkit); `check:popup-ssr` **15 checks**; `check:popup-mutations` **18 of 18 killed exactly as expected**; `check:duplication` **8 clones, 196 lines (6.75%), 2,213 tokens (11.36%)** — unchanged from its baseline; `ng test menu` **63**, `ng test select` **161**; `test:scripts` **70**; `check:docs` 0 failures / 243 warnings; `check:readmes` 0 problems / 4 warnings (the temporary allowances). Every exit code 0 | no blocking issue — read the note below on who reviewed |

The branch column for rows 2–5 is the merged parent's `git name-rev` against
`refs/heads/*`, read off the merge commits themselves; row 1 has no branch because
the three S0 commits were made on the integration branch directly.

Rows 1–5 were merged before this file existed and before the squash rule, by
`--no-ff`, so their branch commits are inside the integration history. That is
visible and worth stating rather than rewriting: `169a710` and `8a47806` — the
two select commits the owner asked to keep out of integration — entered with row
5. Their *content* is what was gated and reviewed; only the commit boundaries are
now part of the branch. From row 6 on, the squash rule applies.

"not recorded" is the state of the evidence, not a claim that no review happened:
the reviews ran, but their verdicts were written into the conversation and into
`docs/DECISIONS.md` rather than into a per-merge record, so they cannot be
quoted here with a precision the repository does not hold.

Row 6's verdict needs the same honesty. The rule asks for a **fresh-context**
reviewer, and this step was reviewed by the agent that wrote it, at the owner's
instruction for that session. What that review found and fixed before the merge:
the mutation harness read the `list` reporter's glyphs and nothing else, a fact it
had never stated, so it does now (`scripts/check-popup-mutations.mjs`) with a test
per parsed shape (`scripts/tests/check-popup-mutations.spec.ts`); the height-only
exemption had no host that could exercise the menu's half of it, which is what
`/content`'s projected fields are for; and the projected fixture taught two
redundant ARIA declarations. What no self-review can do is see the code without
the author's assumptions — so the verdict above means "no blocking issue found by
the author", not "independently signed off".

## What "gates green" means for a popup step

Run in this order, on the tree being merged. Every number in a row above comes
from a run of these commands on that tree, not from a previous tree.

| Gate | Command | What it proves |
| --- | --- | --- |
| library builds | `pnpm build:select`, `pnpm build:menu`, `npx ng build menu-e2e` | the suite's target exists and is current — the suite never builds, so a stale `dist/` reports a fixed bug as a live one |
| conformance suite | `npx playwright test` | 121 cases × chromium, firefox, webkit |
| server render | `pnpm check:popup-ssr` | 15 checks, both open and closed states |
| mutation harness | `pnpm check:popup-mutations` | 18 documented rules, each broken in source and required to redden an exact case list |
| duplication | `pnpm check:duplication` | the clone count, against its recorded baseline |
| unit tests | `npx ng test menu`, `npx ng test select` | the components' own behavior |
| docs | `pnpm check:docs`, `pnpm check:readmes` | links, versions, README budget |
