# Migration plan and verification report

**Owner:** Repository maintainers
**Purpose:** sequence governance adoption and later structural work with measurable rollback points.
**Status:** governance and documentation organization are complete; the owner-authorized i18n testing colocation pilot is verified; broader ownership-based organization is underway.

## Phase A — baseline and specification

Completed from base `75c50384d19fa98c7aadfa71d7c93bbe5d4026a` on 2026-11-03. Read the architecture audit, root instructions, playbook/release skill, decisions, release runbooks, package manifests, docs, test layout and scripts. Verified current workspace versions and official npm registry state rather than carrying forward the prior audit snapshot. See [RFC](RFC-ENGINEERING-GOVERNANCE.md), [audit](../repository-architecture/REPOSITORY-AUDIT.md), and [verification](../repository-architecture/VERIFICATION-REPORT.md).

## Phase B — additive governance foundation

Implemented in this branch:

- concise root `AGENTS.md` with precedence, navigation, task lifecycle, boundaries and gates;
- narrow `projects/AGENTS.md`, `e2e/AGENTS.md`, and protected `projects/env/AGENTS.md` rules for schematics;
- governance docs for ownership, version groups, docs, skills, testing, memory, worktrees and changelogs;
- public-safe task/handoff templates and private-memory location/protocol;
- maintainer release skill updates and a local governance consistency command.

No public API, package version, runtime source, package export, release tag, registry dist-tag or package artifact is changed.

## Phase C — separately reviewed migrations

| Change | Dependency | Before/after proof | Rollback | Status |
| --- | --- | --- | --- | --- |
| Fix popup mutation prerequisite order | Build exact menu/select and menu-e2e outputs before baseline; preserve assertions | Empty-dist + stale-dist runs, clean control and full mutants | Revert gate-only change | Deferred separate change |
| Isolate schematic compiler output | Maintainer approval for protected env schematic path | Source-tree diff clean; schematic tests; package tarball file/byte comparison; clean consumer | Revert tooling/config change; restore exact tracked generated artifacts if needed | **REQUIRES PRODUCT DECISION** for env schematic edits |
| Release-tagged README docs links | Exact next release version/tag and current docs content | Link/path checker; example build against exact tarball; packed README inspection | Revert before release; published artifacts immutable | Planned for next unpublished releases |
| API snapshots beyond four current 1.0 packages | Owner-approved API baselines | Per-package export comparison and consumer imports | Revert snapshot/tooling change | Deferred |
| Hosted docs platform or directory reorganization | Platform/ownership decisions and configuration compatibility proof | Build/link/redirect checks on before/after snapshots | Keep tag source snapshots; restore previous routing | **REQUIRES PRODUCT DECISION** |
| Colocate the exclusive i18n harness | Preserve `i18n-e2e` as a separate Angular project and keep its build outputs and browser behavior | i18n unit suite, CSR/SSR builds, SSR runtime, configured browser matrix, package build/pack, docs and compatibility checks | Revert the path/config/docs commit; retain the old report bytes | **Verified 2026-11-03** |
| Colocate package-owned specifications | Keep package README/changelogs and published exports at their existing boundaries; preserve append-only decisions | Full local Markdown link check, `check:docs`, docs index review; pack configuration confirms specs are not package assets | Revert spec moves and restore compatibility pointers | **Verified 2026-11-03** |

The owner first authorized documentation-only organization on `main` on 2026-11-03. The execution groups release records under `docs/releases/1.0/`, verification material under `docs/testing/`, research under `docs/research/`, theme guidance under `docs/theme/`, and historical audits under `docs/repository-architecture/`. Old documentation paths remain short compatibility pointers; append-only `docs/DECISIONS.md` and the linked `docs/a11y-snapshots/` baseline remain in place. A later owner direction authorized ownership-based project moves, beginning with the verified i18n testing pilot. That does not authorize changes to published artifacts, package versions, registry state, tags, or protected `projects/env/schematics/`.

## Current-state verification

At the initial audit checkpoint, branch `chore/repository-architecture` was at the audited base SHA and the source worktree was under `/tmp`. A cross-filesystem `git worktree move` failed with `Invalid cross-device link`. The later preservation procedure created a durable sibling worktree using Git-native registration, transferred tracked diffs and inventoried untracked/ignored content without copying Git metadata, and verified the inventories. The original source worktree remains intact and must not be removed without owner approval. The primary checkout remained untouched during that review. The owner subsequently authorized direct-main organization; the validated governance/docs commits have been integrated and pushed to `origin/main`.

On 2026-11-03, all four release-group manifests were `1.0.0-rc.2`; npm `latest` was rc.2 for all four. npm `next` was rc.1 for menu/select and rc.2 for theme/i18n. Package READMEs currently point many docs links at moving `main`; the versioned-doc gate is for future versions and is not claimed to pass against already-published rc.2.

The i18n pilot moved its exclusive app, assets, Playwright suite/config and SSR smoke under `projects/i18n/testing/`; Angular project name `i18n-e2e`, CSR/SSR output paths, and package entry points remain unchanged. The pre-existing ignored Playwright report was moved, byte-compared, and restored after browser verification; the new run's report was kept outside the checkout. Verification from an empty `dist/` rebuilt select and i18n before running the 376 i18n unit tests, 9 i18n schematic tests, 96 Playwright tests in configured Chromium/Chrome/Firefox projects, 36 SSR checks, CSR and SSR app builds, i18n package build and 20-file pack. The packed i18n artifact contains no testing harness. Public API snapshot checks passed. The source README link now points at the new app path; the already-published rc.2 tarball and registry metadata were not changed. The rc.2 versioned-doc check reports 17 issues involving moving `main` links and the absent rc.2 changelog heading; this check fails and remains a release-readiness item, not a passing gate.

Package-owned designs/specifications are now under `projects/{i18n,menu,select,table,theme}/specifications/`; `docs/specifications/README.md` remains the cross-package status index. The former `docs/specifications/<file>.md` and package-root `SPEC-*` paths are short pointers to preserve append-only decision links. Specification contents were not duplicated, package assets/exports remain unchanged, and the link/docs gates passed after the move.

Executed for this governance follow-up:

| Command | Result |
| --- | --- |
| `npm run test:scripts` | Passed, 98 tests in 8 files |
| `npm run check:governance` | Passed, 13 governance files and four synchronized manifests |
| `npm run check:docs` | Passed with 0 failures and 41 existing warnings |
| `node --check scripts/check-governance.mjs` and `node --check scripts/check-versioned-doc-links.mjs` | Passed |
| `git diff --check` | Passed |
| `node scripts/check-versioned-doc-links.mjs @rivinia/<pkg> 1.0.0-rc.2` | Expected legacy failures: 9/12/10/14 issues across menu/select/theme/i18n; moving `main` links and absent rc.2 changelog headings |

`pnpm install --frozen-lockfile --offline` could not finish because build-script approvals are unresolved. The package-manager gate was run via `npm run` against the same package scripts; no approval decision was made.

## Verification for this governance change

Run and record:

- `npm run check:governance` — verifies required governance documents/metadata and that the exact four group members have synchronized workspace versions. `pnpm check:governance` is equivalent after pnpm's workspace install/build-script policy is resolved.
- `pnpm check:docs` — ensures existing package docs/API symbol references still pass after added governance docs.
- `git diff --check` and `git status --short --branch` — whitespace and ownership boundary.

Do not claim prior package/browser gates were rerun; refer to the timestamped prior audit report. Any check not executed in this task remains **not run**.

## Rollback

The additive governance foundation can be reverted as one or more documentation/tooling commits. No release artifact or runtime migration is involved. Preserve the previous audit reports. For later structural changes, use the per-row rollback above and keep old tree/artifacts until all after-checks pass.
