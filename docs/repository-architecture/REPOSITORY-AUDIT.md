# Repository Architecture Audit

**Snapshot date:** 2026-11-03
**Branch:** `chore/repository-architecture`
**Worktree:** historical temporary worktree (preserved)
**Base:** `75c50384d19fa98c7aadfa71d7c93bbe5d4026a`

This is an evidence-based audit of the current repository. “Risk” means a workflow can produce misleading evidence or cause accidental source/output changes; it does not imply a currently broken published package. No runtime source was changed during this audit.

## Findings

### High — popup mutation control can consume stale E2E output

- **Evidence:** [`scripts/check-popup-mutations.mjs`](../../scripts/check-popup-mutations.mjs#L325) runs the clean Playwright control before mutation builds. [`playwright.config.ts`](../../playwright.config.ts#L20) serves `dist/menu-e2e/browser` and expects build output to exist separately. Workspace aliases resolve package imports through `dist` ([`tsconfig.json`](../../tsconfig.json#L15)).
- **Observed:** In the earlier rc.2 diagnosis, rebuilding select/menu did not clear four clean-control failures; rebuilding `menu-e2e` did, and popup conformance then passed 24/24. This points to stale/missing demo output, not a confirmed popup implementation regression.
- **Impact:** A gate can abort before mutations and falsely implicate current source, depending on leftover ignored build artifacts.
- **Proposal:** Make the gate build its exact demo/package prerequisites before the control run, or fail with a specific “required dist missing/stale” diagnostic. Test from an empty `dist` directory and with pre-existing stale output.
- **Migration risk:** Low; gate-only change. Do not weaken conformance assertions.

### Medium — schematic build emits into protected source directories

- **Evidence:** Root scripts compile schematics and rename emitted files in place ([`package.json`](../../package.json#L10)); env schematic config sets both `outDir` and `rootDir` to `./` ([`projects/env/schematics/tsconfig.schematics.json`](../../projects/env/schematics/tsconfig.schematics.json#L9)).
- **Impact:** Build commands can write generated files alongside authored sources and replace the tracked `.cjs` output. This increases risk of accidental source-tree churn.
- **Proposal:** Emit to an ignored temporary build directory, validate output, then copy only the intended artifact in a controlled step. Preserve current package tarball contents and verify with pack/consumer checks.
- **Migration risk:** Medium; schematics paths and package exports must remain byte-for-byte compatible in the tarball. Env schematics are protected; do not edit without explicit review.

### Medium — public API snapshot intentionally covers only four 1.0 packages

- **Evidence:** [`scripts/api-surface.mjs`](../../scripts/api-surface.mjs#L1) describes its scope as four packages; its [`ENTRY_POINTS`](../../scripts/api-surface.mjs#L22) list includes theme, select, menu and i18n. The workspace contains ten publishable package manifests and 18 `public-api.ts` files.
- **Impact:** The six other packages do not receive the same centralized API snapshot comparison. This is a coverage gap, not evidence of an API break.
- **Proposal:** Expand snapshots package-by-package when each package has a reviewed baseline and an owner for intentional changes. Avoid generating snapshots that bless unreviewed APIs.
- **Migration risk:** Low to medium; snapshot churn requires human review.

### Medium — registry README version claims lag the published rc.2 state

- **Evidence:** At the audit snapshot, root `README.md` says the four 1.0 libraries are at `1.0.0-rc.1` (lines 16–20 and package table); npmjs.org views returned rc.2 for theme, select, menu and i18n. Workspace manifests also declare rc.2. This is a point-in-time registry observation and can drift.
- **Impact:** Repository overview may direct consumers to an older prerelease. The README gate checks workspace versions, not the current registry dist-tag.
- **Proposal:** Update the root overview to the intentional current release only when the owner wants that documentation synchronized; consider a read-only release report that compares registry and workspace versions.
- **Migration risk:** Low; documentation only. `latest` is intentionally used for these prereleases per owner decision.

### Low — dependency build allowlist still has owner decisions pending

- **Evidence:** [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml) contains literal “set this to true or false” entries for four native/build packages. pnpm documents the `allowBuilds` / approval workflow in [approve-builds](https://pnpm.io/cli/approve-builds).
- **Impact:** Install/build behavior depends on the package manager’s undecided-script policy; this is not a source architecture defect.
- **Proposal:** Have the maintainer decide each package explicitly, then validate clean install and production builds. Do not guess approvals in an architecture cleanup.
- **Migration risk:** Low, but approval broadens install-time script execution and should be deliberate.

## Confirmed boundaries and intentional deferrals

- There are ten publishable packages and two E2E applications. Production-source scan found only one cross-package Rivinia import: i18n’s optional `@rivinia/select/ui` integration, documented in i18n’s package peer metadata and implementation.
- `docs/DECISIONS.md` D86 records duplicated Menu/Select popup logic as an accepted pre-1.0 deferral. The current duplication check is report-only; do not refactor this as part of repository organization.
- `docs/PUBLISH-RUNBOOK-1.0.md` records Select alias/type naming questions as product decisions for 1.0.0. Keep these marked **REQUIRES PRODUCT DECISION**.
- No tracked CI workflow files were found. Existing local gates therefore do not establish that CI runs the same checks.
- No tracked generated outputs or credential-like patterns were found in tracked text files during the scan. These are bounded scan results, not a security certification.
