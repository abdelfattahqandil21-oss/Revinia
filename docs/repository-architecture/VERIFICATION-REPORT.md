# Verification Report

**Date:** 2026-11-03 · **Base:** `75c50384d19fa98c7aadfa71d7c93bbe5d4026a`

## Passed

- Production builds from empty `dist` for all ten libraries using direct Angular CLI builds: theme, select, menu, table, datepicker, modal, toast, http, env, i18n.
- Unit tests: 1,408 Angular unit tests passed across nine packages; scripts Vitest 95 passed; schematic Vitest 40 passed; theme Vitest 10 passed. One additional theme test failed only because this isolated worktree uses a symlinked `node_modules` and pnpm reported `workspace hoist directory is not a real directory` while the test invoked `pnpm check:theme`. Direct `node scripts/check-theme-package.mjs dist/theme` passed.
- `check:docs`: 0 failures, 41 existing prose warnings.
- `check:readmes`: passed; theme 106 lines, select 174, menu 136, i18n 168.
- `check:pack` for theme, select, menu and i18n: passed; shipped file counts 9, 9, 9 and 20.
- Theme tarball checker, contrast, dark-mode (Chromium and Firefox), component-theme (Chromium and Firefox), and popup SSR: passed.
- Root Playwright Chromium suite: 125 passed. i18n Playwright Chromium suite: 32 passed.
- Popup conformance suite after rebuilding the `menu-e2e` app: 24/24 passed. Prior clean control failed with four cases until E2E output was rebuilt, supporting the stale/missing E2E artifact diagnosis.
- `npm pack --dry-run --json` for all ten packages: passed. Shipped file counts: datepicker 8, env 7, http 8, i18n 20, menu 9, modal 11, select 9, table 8, theme 9, toast 11.
- Custom check of all ten packages’ export targets: zero dangling targets.
- Clean npm consumer fixture installed local packed tarballs for all ten packages; `npm ls --depth=0` reported ten direct dependencies and no problems.

## Not run / limitations

- Full `check:popup-mutations` was not run in this audit. Its control failure was diagnosed from its script order and reproduced by rebuilding the E2E app before conformance; the mutation cases themselves remain unverified here.
- Root Playwright full suite ran only on Chromium. No full Firefox or WebKit root suite was run.
- The clean consumer fixture was installed and dependency tree checked; a production Angular build inside that clean consumer was not completed.
- `check:docs` warnings are existing prose warnings, not failures.
- The theme test failure above is attributed to isolated worktree symlink setup; this diagnosis does not convert that test to a pass.

## Result

**PARTIALLY VERIFIED** — source builds, package archives, local browser suites, and consumer installation pass with the noted limits. Mutation coverage and consumer production build remain unverified. No source changes were made.

## Governance follow-up — 2026-11-03

- `npm run test:scripts`: **98 passed** (8 files), including three new exact-version documentation-link gate cases.
- `npm run check:governance`: passed; 13 governance files, local index links/task fields, and four synchronized `1.0.0-rc.2` manifests checked.
- `npm run check:docs`: 0 failures, 41 existing prose warnings; root README package versions match manifests.
- `node --check` for both new checker scripts: passed. `git diff --check`: passed.
- The exact-version link checker was run against the already-published rc.2 source READMEs as a baseline audit and correctly failed: menu 9 issues, select 12, theme 10, i18n 14. All four are expected legacy: README links target moving `main` and there is no rc.2 package changelog heading. Do not retrofit published tarballs; the gate is for future versions.
- A per-worktree frozen/offline install populated an independent `node_modules`, but pnpm returned `ERR_PNPM_IGNORED_BUILDS` because four build-script approvals in `pnpm-workspace.yaml` remain undecided. No approvals were guessed. `npm run` was used for dependency-free governance/docs/script checks.
- Not run in this follow-up: library builds, package unit suites, browser suites, pack/consumer build, and full `check:popup-mutations`; the governance changes do not alter runtime source. See the prior audit section for dated evidence and limitations.

**Governance result: PARTIALLY VERIFIED.** The new static policy gate and script suite pass. The release-mode docs gate correctly identifies existing rc.2 debt. pnpm's install approval state and the prior audit's mutation/consumer-build gaps remain open.
