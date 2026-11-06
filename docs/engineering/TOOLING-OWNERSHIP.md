# Shared tooling ownership

**Status:** audited 2026-11-03; no script was proven obsolete or duplicated.
**Purpose:** explain which root tool owns each gate, what it reads or writes, and where its test evidence lives.

## Root scripts

| Tool | Package command / caller | Responsibility | Inputs and output behavior | Classification |
| --- | --- | --- | --- | --- |
| `scripts/api-surface.mjs` + `scripts/api-surface.snapshot.json` | `scripts/tests/api-surface.spec.ts` | Compare named public exports for the eleven 1.0 packages | Reads package `public-api.ts`; test-only snapshot, no generated output | Active shared API gate |
| `scripts/capture-a11y-tree.mjs` | Manual command documented in file; tested by `capture-a11y-tree.spec.ts` | Capture real Chromium accessibility trees for Select states | Reads built `dist/menu-e2e/browser`; writes JSON under requested output directory, normally `docs/a11y-snapshots/` | Active evidence capture; output is deliberately tracked |
| `scripts/check-component-theme.mjs` | `pnpm check:component-theme` | Verify shipped Menu/Select/i18n components use theme tokens in real browsers | Reads built `dist/menu-e2e` and `dist/i18n-e2e-csr`, port 4322, and `scripts/fixtures/component-theme/*.json`; normal run is read-only, `--update` rewrites snapshots | Active browser gate; update mode is explicit |
| `scripts/check-contrast.mjs` | `pnpm check:contrast` | Verify shipped palette values and contrast thresholds | Reads theme CSS and package source; no persistent output | Active deterministic gate |
| `scripts/check-docs.mjs` | `pnpm check:docs` | Check consumer docs/API symbols and root package table versions | Reads package public APIs, READMEs, topic docs and manifests; warnings are reported | Active docs gate |
| `scripts/check-duplication.mjs` | `pnpm check:duplication` | Measure source duplication; report-only under decision D86 | Uses `pnpm dlx jscpd@4.0.8`; requires network/cache, emits a terminal report and does not rewrite source | Active advisory measurement; not a pass/fail release gate |
| `scripts/check-governance.mjs` | `pnpm check:governance` | Validate required governance files and synchronized release-group manifests | Reads docs, instructions, package manifests and skill metadata; no persistent output | Active governance gate |
| `scripts/check-pack.mjs` | `pnpm check:pack <package>` | Check `npm pack --dry-run` metadata and required shipped files | Reads `dist/<package>` and npm's dry-run JSON; no tarball is retained | Active pack preflight |
| `scripts/check-popup-mutations.mjs` | `pnpm check:popup-mutations` | Prove popup conformance assertions detect behavior mutations | Temporarily edits Menu/Select source, rebuilds exact `dist` targets, runs Playwright, and restores source in `finally` | Active mutation gate; use only with the worktree's build state understood |
| `scripts/check-popup-ssr.mjs` + `scripts/popup-ssr-resolver.mjs` | `pnpm check:popup-ssr`; resolver is a Node module hook | Exercise popup server rendering without DOM globals | Imports built `dist/menu` and `dist/select`; emits terminal results, no persistent artifacts | Active SSR gate plus required loader helper |
| `scripts/check-readmes.mjs` | `pnpm check:readmes` | Enforce package README length, manifest version and local links | Reads all release-group READMEs/manifests; no persistent output | Active package-doc gate |
| `scripts/check-skill-compatibility.mjs` | `pnpm check:skills`, also invoked by governance | Validate roles, package ranges, and repository-local skill references | Scans `.agents/skills/` and `.opencode/skills/` when present; no persistent output | Active compatibility gate |
| `scripts/check-theme-dark.mjs` | `pnpm check:theme-dark` | Render the theme cascade in Chromium and Firefox | Reads theme CSS and browser binaries; serves from an OS temp directory and removes it in `finally` | Active browser gate |
| `scripts/check-theme-package.mjs` + `scripts/check-theme-package.d.mts` | `pnpm check:theme` | Validate CSS package exports and shipped files | Reads `projects/theme` or an explicitly supplied tarball; no persistent output | Active package gate; `.d.mts` describes the module API |
| `scripts/check-versioned-doc-links.mjs` | Direct node command with package name and exact version | Validate candidate README/changelog links against an exact release tag | Reads package/tarball and Git tree; no persistent output | Active release-candidate gate |
| `scripts/consumer-smoke.mjs` | `pnpm consumer:smoke` | Install exact tarballs and production-build an external Angular consumer | Reads a tracked template and packed `.tgz` files; creates an OS temp consumer, records versions/hashes, removes it in `finally` | Active consumer gate |

## Tests and fixtures

- `scripts/tests/` contains unit tests for parsers and validation rules. Run all with `pnpm test:scripts`; these tests do not require browser services.
- `scripts/fixtures/component-theme/` contains expected render values for Chromium and Firefox. Updates use the explicit `check-component-theme --update` option and need review with the resulting browser evidence.
- `scripts/fixtures/consumer-smoke/` is the only persistent consumer project: it is a small tracked Angular template, not a generated install. The runner copies it outside the repository; generated `node_modules`, lockfile and `dist` are removed after each run.
- `.github/workflows/ci.yml` runs `pnpm validate:ci`, which invokes the required docs, governance, build, package, unit, and Chromium checks in one shared local/CI sequence.

## Generated and ignored state

Angular builds write package and harness output to ignored `dist/`; Angular caches and compiler output stay in ignored `.angular/` and `out-tsc/`. Playwright reports, traces, test results, coverage, and the release `pack/` directory are ignored. Keep them when they contain evidence needed by an active task; do not clean them as a general repository tidy-up.

Root `schematics:<package>` commands compile generated JavaScript into package schematics directories. The env schematic tree is protected; this audit did not change or remove those outputs. There is no evidence-backed cleanup of generated schematic files in this task.

## Organization decision

The scripts are already grouped by responsibility at the top level, with tests and reusable fixture data in dedicated subdirectories. Splitting each narrow executable into more folders would add navigation cost without changing ownership. The named tools above have distinct callers or output contracts; none was deleted or consolidated. Menu/Select popup duplication is retained per decision D86 and its dedicated conformance/mutation checks.
