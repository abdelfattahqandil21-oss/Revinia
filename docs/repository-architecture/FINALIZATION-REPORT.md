# Repository architecture finalization

**Date:** 2026-11-03
**Branch/base at start:** `chore/repository-architecture` / `75c50384d19fa98c7aadfa71d7c93bbe5d4026a`
**Scope:** governance, documentation, compatibility validation and safe local integration. No package API or package release changes.

## Architecture and scope

The package tree remains under `projects/`, shared browser tests remain under `e2e/`, and package-specific harnesses remain in their current locations. These boundaries already match the approved direction, so no package or test tree migration was justified. Repository skills now use the shared `.agents/skills/` location for Codex and OpenCode; no extra skill project or copied skill registry was added.

The durable sibling worktree was created with Git worktree registration. Tracked diffs and inventoried untracked and ignored content were compared with the historical source; no Git metadata was copied. The historical worktree remains preserved. See `GOVERNANCE-HARDENING-REPORT.md` for transfer evidence.

## Corrections made during finalization

- Restored the complete reusable i18n-egy patterns and an explicit applicable-gates completion rule in root `AGENTS.md`.
- Made the release rule explicitly cover version bumps as well as tags and publishing; theme validation now names the exact tarball argument.
- Made repository URL matching case-insensitive and fail-closed for malformed skill role metadata.
- Added strict CLI option validation for the versioned documentation checker, including unknown flags and conflicting tarball/package-directory inputs.
- Updated historical review language to distinguish its snapshot from later work, corrected stale worktree/skill-source descriptions, and removed machine-specific absolute paths from newly organized governance reports.
- Kept published rc.2 link/changelog debt historical; no package files, published artifacts, tags, or npm dist-tags were changed.

The skill validator verifies metadata syntax and traceability only. It does not establish semantic API compatibility or verify that package examples compile against each declared published version; those claims still require exact-tarball consumer builds and public-import tests. Skill tag-shaped references are format checks; immutable tag contents are checked by the versioned-doc snapshot mode.

## Verification matrix

| Gate | Result |
| --- | --- |
| `npm run test:scripts -- --reporter=dot` | Passed: 10 files, 128 tests |
| Angular library unit tests (`http`, `toast`, `i18n`, `modal`, `env`, `menu`, `select`, `datepicker`, `table`) | Passed: 1,408 tests total |
| `npm run test:theme` | Passed: 11 tests |
| `npm run test:schematics` | Passed: 5 files, 40 tests |
| `npm run check:governance` | Passed: 13 governance files; four release-group versions agree at rc.2 |
| `npm run check:skills` | Passed |
| `npm run check:docs` | Passed: 0 failures, 41 existing prose warnings |
| `npm run check:readmes` | Passed; each release README under 200 lines |
| `git diff --check` | Passed at the recorded check; repeat after the mutation gate restores files |
| `ng build menu`, `select`, `theme`, `i18n` | Passed; existing theme export-condition warnings only |
| `npm run check:pack -- theme select menu i18n` | Passed; packed dry-run lists 9/9/9/20 files |
| Theme package checker on `dist/theme` and exact rc.2 tarball | Passed, 9 files each |
| `npm run check:contrast` | Passed; decorative border ratios remain informational |
| `npm run check:theme-dark` | Passed in Chromium and Firefox |
| `npm run check:component-theme` | Passed in Chromium and Firefox |
| Clean packed-consumer `npm run build` | Passed against the exact four rc.2 local tarballs; Angular production build emitted the application bundles successfully |
| `npm run check:popup-mutations` | Passed: fresh clean control 24/24; 18/18 mutants killed exactly as expected. Exit code 0; harness restored its temporary source changes and rebuilt the affected outputs. |
| Other Playwright suites | Not run: no component runtime, package source, E2E specs, or harness config changed. |
| `pnpm install` / build-script approvals | Not run; unresolved approvals were not granted. |

The npm package versions and registry dist-tags were not changed. Existing rc.2 documentation checks are not used as a new-release gate because the published README links and changelog headings are known immutable historical debt.

## Integration boundary

The complete diff was reviewed and staged in two coherent local commits: `34a52c9` (governance verification gates) and `8c8675a` (architecture guidance). No generated/cache/private files were staged. The popup harness restored temporary source changes. Re-run governance/script/docs checks on the committed tree, confirm the primary `main` checkout is clean and non-divergent, merge locally with `--no-ff`, and verify the resulting `main`. No remote push, tag, release, publish, or worktree removal is authorized.
