# Migration plan and verification report

**Owner:** Repository maintainers
**Purpose:** sequence governance adoption and later structural work with measurable rollback points.
**Status:** Phases A and B completed; owner-authorized documentation organization is in progress; source/configuration migrations remain separately gated.

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

The repository owner explicitly authorized a documentation-only organization on `main` on 2026-11-03. The execution groups release records under `docs/releases/1.0/`, verification material under `docs/testing/`, research under `docs/research/`, theme guidance under `docs/theme/`, and historical audits under `docs/repository-architecture/`. Old documentation paths remain short compatibility pointers; append-only `docs/DECISIONS.md` and the linked `docs/a11y-snapshots/` baseline remain in place. This authorization does not include package/source/test topology, Angular or Playwright configuration, release scripts, published package artifacts, or protected schematics. Those changes still require their own impact review and gate matrix.

## Current-state verification

At the initial audit checkpoint, branch `chore/repository-architecture` was at the audited base SHA and the source worktree was under `/tmp`. A cross-filesystem `git worktree move` failed with `Invalid cross-device link`. The later preservation procedure created a durable sibling worktree using Git-native registration, transferred tracked diffs and inventoried untracked/ignored content without copying Git metadata, and verified the inventories. The original source worktree remains intact and must not be removed without owner approval. The primary checkout remained untouched during that review. The owner subsequently authorized direct-main organization; the validated governance/docs commits have been integrated and pushed to `origin/main`.

On 2026-11-03, all four release-group manifests were `1.0.0-rc.2`; npm `latest` was rc.2 for all four. npm `next` was rc.1 for menu/select and rc.2 for theme/i18n. Package READMEs currently point many docs links at moving `main`; the versioned-doc gate is for future versions and is not claimed to pass against already-published rc.2.

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
