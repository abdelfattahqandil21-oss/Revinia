## 2026-11-03 — D92: `release/1.0-integration` is promoted onto `main`; the remaining rc tags are cut from `main`

**Context.** Every ground rule in this program said the agent never touches `main`,
and `docs/PUBLISH-RUNBOOK-1.0.md` step 1 said the merge is the owner's because
"tags are cut from `main`". Two rcs were then published from integration tips
(`3cb8b51`, `1e78c6c`) with `main` still at `6b51eba`, which made step 1 the one
precondition the branch was carrying debt against. The owner gave the merge OK on
2026-11-03 and, when it was done and gated, gave the push OK as a separate yes.

**Decision.** `release/1.0-integration` at `89bf4c0` merged into `main` with
`--no-ff` as `173f150` (parents `6b51eba` + `89bf4c0`), the record commit on top as
`9173de3`, and `origin/main` was fast-forwarded `6b51eba..9173de3` — no force, after
`git merge-base --is-ancestor origin/main main` confirmed the push could not
rewrite anything. `release/1.0-integration` was then fast-forwarded onto the same
tip rather than left behind, so both branches now point at one commit locally and on
origin. The merge ran in `../Revinia-select-summary`, the worktree that already
holds `main`, because git refuses to check out a branch another worktree has; that
worktree was clean before and clean after. One conflict, `README.md`, resolved to
the integration side — that side already contained `main`'s menu `0.5.0` and select
`0.7.1` npm flip and differed only in the `Workspace` column, which is the rc bump
the merge exists to carry; `git diff --name-only release/1.0-integration HEAD` after
the merge prints `CHANGELOG.md` alone. Gates re-run on the merged tree: the four
`ng build`s exit 0 at `1.0.0-rc.1`, `ng test menu` 65, `ng test select` 163, `ng
test i18n` 376, `pnpm test:theme` 11, `test:scripts` 95, `check:docs` 0 failures /
41 warnings, `check:readmes` ok / 0 — every number equal to row 9's, which is what a
tree differing by one root markdown file should print. Playwright, `check:popup-ssr`
and `check:duplication` were **not** re-run on `main`.

**Rejected.** Squashing the promotion into one commit — the 78 commits are the
audit trail rows 1–9 reference, and the squash rule was about keeping *feature*
history out of integration, not about hiding the program from `main`. Cutting
`menu/v1.0.0-rc.1` and `i18n/v1.0.0-rc.1` from integration anyway — possible, but
it would keep the debt step 1 exists to pay.

**Impact.** D91's "What this does not prove" says theme's tag "sits on a commit
`main` does not contain". That was true on the morning of 2026-11-03 and is not
true now; `3cb8b51` and `1e78c6c` are both ancestors of `origin/main`. The
published bytes do not change either way — tags are immutable and root files are in
no tarball — so D91 stands as a record of the state at publish time, and this entry
is the correction of the tense. The two remaining rc tags are cut from `main` at
`9173de3` or later. `docs/MERGES-1.0.md` gains row 10, and the runbook's step 1 is
closed.
