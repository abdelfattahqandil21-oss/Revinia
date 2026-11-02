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
| 7 | S7 browser support matrix | `pkg/repo/1-0-browser-support` | `25c4cc1` | `--squash` | 2026-11-02, on the merged tree: builds `select`/`menu`/`menu-e2e` exit 0; `npx playwright test` **374 passed, 1 skipped** (125 cases × chromium, firefox, webkit; the skip is the firefox branch of the anchor-feature case, which would prove nothing there); `check:popup-ssr` **15 checks**; `check:popup-mutations` **18 of 18 killed exactly as expected**, run on the same library source the merge carries; `check:duplication` **8 clones, 196 lines (6.64%), 2,213 tokens (11.36%)** — the clones did not move, the percentage did, and the baseline comment says why; `ng test menu` **65**, `ng test select` **163**; `test:scripts` **70**; `check:docs` 0 failures / 243 warnings; `check:readmes` 0 problems / 4 warnings (the temporary allowances). Every exit code 0 | no blocking issue — the same self-review caveat as row 6 |
| 8 | S9 README content move | `pkg/repo/1-0-readmes` | `21d9be7` | `--squash` | 2026-11-02, on the merged tree — which is byte-identical to the branch tip (`git diff --stat pkg/repo/1-0-readmes 21d9be7` prints nothing), so every number in this cell is that tree's: builds `theme`/`select`/`menu`/`i18n`/`menu-e2e` exit 0; `check:readmes` **ok, 0 warnings** — READMEs at 104 / 172 / 134 / 165 lines and `ALLOW_OVER_BUDGET` now empty; `check:docs` **0 failures / 41 warnings**, reading the 26 topic pages for the first time; `test:scripts` **83 passed** (6 files); `ng test menu` **65**, `ng test select` **163**, `ng test i18n` **376**, `pnpm test:theme` **11**; `npx playwright test` **374 passed, 1 skipped** (125 cases × chromium, firefox, webkit); `check:popup-ssr` **15 checks**; `check:popup-mutations` **18 of 18 killed exactly as expected**; `check:duplication` **8 clones, 196 lines (6.64%), 2,213 tokens (11.36%)** — the clones did not move. Every exit code 0 | no blocking issue — the same self-review substitution as rows 6 and 7; read the two notes below it |

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

Row 7 carries the same substitution: the owner's instruction for these sessions is
that no subagent runs unless he asks, so the review again came from the agent that
wrote the change. What it caught and fixed before the merge: the support dates in
the two CSS comments were asserted from a Baseline badge rather than from
browser-compat-data, `select-popup.css` line references in the new docs page had
drifted by a line after the comment edits, and the CHANGELOG bullets claimed the
prelude "probes every property the block sets" when the rule it enforces is
weaker and different — probe the newest property per engine, so nothing inside is
newer than a probe.

Row 7 also ships two acceptance lines it does not meet, which belongs here rather
than in the cell. S7 asks for the browser table "in each README": the table is in
`docs/browser-support.md`, and each README links it when its content moves in S9.
S7 asks for "CI runs three engines": this repository has no CI configuration at
all, so it ships as `playwright.config.ts` — chromium, firefox, webkit — run by a
person, which is where every number in this table comes from. And the band between
the two floors (Chrome 114–130, Safari 17–26.1) has never been run, because this
machine has one version of each engine; `docs/browser-support.md` derives its
behavior from `@supports` conditions and says so.

## Row 8 — what the self-review caught, and what it did not

Row 8 carries the same substitution as rows 6 and 7: the owner's instruction for
these sessions is that no subagent runs unless he asks, so the review came from
the agent that wrote the change. What it found and fixed before the merge:

- Two `@rivinia/i18n` specs read the README's export tables — and S9 moved those
  tables. Both were re-pointed at `docs/i18n/api.md` rather than loosened, then
  mutation-proved: delete one row there and exactly those two cases go red. The
  first run after the move did fail with `LanguageLike has no README table row`,
  which is the sound outcome for a spec that still reads the old location.
- The move exposed a hole in the gate itself: nothing at all read
  `docs/<pkg>/`, so a topic page could name a symbol its package no longer
  exports — the same defect class S1 and S6 found in the READMEs. D90 makes a
  topic page a consumer document by directory rather than by allowlist, and
  separates platform vocabulary (`Intl`, `CanvasText`, `ar-EG`, `KeyboardEvent.key`)
  from API claims so the warning count means something: **159 warnings reading
  four READMEs, 41 reading those READMEs plus 26 pages**.
- An allowlist entry was not accepted until it was proved. `injectI18n` is not a
  package export; it is a line the generator writes into the consumer's app, at
  `projects/i18n/cli/rivinia-i18n-keys.mjs:486`. That reason is in the comment
  next to the entry, not just in the list.
- `@rivinia/theme` has no `ng test` target: `ng test theme` exits with "Project
  target does not exist", and the suite is `pnpm test:theme`. Rows 6 and 7 never
  ran it because their gate table names `ng test` for menu and select only. This
  row does, and it is 11/11.
- The theme suite failed once on its first run in this window — the spec that
  spawns `pnpm check:theme <tarball>` — and passed on the four runs that followed.
  Its stderr had already scrolled past the log before it could be read, and the
  failure has not been reproduced. It is recorded rather than dropped: 11/11 four
  times running is not the same as "this spec cannot be flaky".
- One CHANGELOG sentence called 0.5.0 "unusable" in a right-to-left layout. That
  is an inference resting on a measurement the repository already has, so the
  sentence now carries the measurement (trigger at x=11..232, panel at
  x=708..929 in a 929px viewport) and drops the adjective.

Two template deviations ship with this row, and one commit-message error is
corrected here rather than in history the squash already dropped. The deviations:
no 1.0 README has the screenshot or live demo link the template's hook asks for,
because the repository has no tracked image and no hosted demo — the hook names
the e2e page and the build command that proves it renders instead (D90); and
`@rivinia/i18n` keeps its three tier names in its Go-further table rather than the
template's flat list, because that package's docs are split by reader, not by
topic. The error: commit `cc1c0c7`'s fifth bullet describes a `@rivinia/menu`
finding — the menu has no configurable backdrop click — that was actually
corrected in `ad4f6b8`, whose message names it. The squash keeps the content and
loses the boundary, so this sentence is the record.

What this row does not prove: no gate compiled the snippets in the new READMEs and
topic pages. That is S8, and S8 is the next row.

## What "gates green" means for a popup step

Run in this order, on the tree being merged. Every number in a row above comes
from a run of these commands on that tree, not from a previous tree.

| Gate | Command | What it proves |
| --- | --- | --- |
| library builds | `pnpm build:select`, `pnpm build:menu`, `npx ng build menu-e2e` | the suite's target exists and is current — the suite never builds, so a stale `dist/` reports a fixed bug as a live one |
| conformance suite | `npx playwright test` | 125 cases × chromium, firefox, webkit |
| server render | `pnpm check:popup-ssr` | 15 checks, both open and closed states |
| mutation harness | `pnpm check:popup-mutations` | 18 documented rules, each broken in source and required to redden an exact case list |
| duplication | `pnpm check:duplication` | the clone count, against its recorded baseline |
| unit tests | `npx ng test menu`, `npx ng test select` | the components' own behavior |
| docs | `pnpm check:docs`, `pnpm check:readmes` | links, versions, README budget |
