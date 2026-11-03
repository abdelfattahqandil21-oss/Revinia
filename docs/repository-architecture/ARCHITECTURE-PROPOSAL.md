# Architecture Proposal

**Status:** Initial audit proposal; superseded for governance direction by [the engineering governance RFC](../engineering/RFC-ENGINEERING-GOVERNANCE.md). No package, test, or E2E tree moves have been applied; the later approved skill-source relocation is documented in the RFC.
**Branch:** `chore/repository-architecture` · **Base:** `75c50384d19fa98c7aadfa71d7c93bbe5d4026a`

## Goals

Keep the package graph explicit, make build/test evidence reproducible from a clean checkout, and avoid mixing publishable package boundaries with generated output. Preserve public exports, tarball contents, and currently documented release policy.

## Proposed shape

Keep `projects/<package>` as the source and packaging boundary for each publishable library. Keep E2E applications separate from packages. Keep `dist/` disposable and ignored. Keep shared scripts under `scripts/`, with each gate responsible for building the exact prerequisites it tests. Retain package-level public APIs and public-import-only cross-package dependencies.

This is a target description, not an instruction to move directories. The current layout largely already follows these boundaries; the immediate work is tightening evidence and generated-output handling.

## Staged proposal

1. **Gate determinism:** update popup mutation gate so it builds the clean demo before control; verify from empty dist and with stale dist. No test assertions are removed.
2. **Schematic output isolation:** separately design a controlled output path for schematic compilation, especially protected env schematics. Compare packed file lists and run schematic tests plus a clean consumer before accepting.
3. **API coverage:** propose snapshots for remaining packages only after owners approve their current public surfaces as baselines.
4. **Release documentation:** update root README registry-version references when release owner confirms the intended synchronization point; keep package README version gates unchanged.
5. **CI parity:** choose and document the CI provider/workflow, then run the same required local gates in CI. No CI provider is assumed by this proposal.

## Decisions required before implementation

- Which packages/scripts should be allowed to run install-time build scripts in `pnpm-workspace.yaml`?
- Should root README track the exact npm `latest` dist-tag, or the workspace’s prepared version?
- Who owns API snapshot approval for packages outside the four-package 1.0 scope?
- Which CI environment is authoritative?
- The runbook’s Select alias and `RiviniaMenuItem` naming questions remain **REQUIRES PRODUCT DECISION**.

## Compatibility and migration safeguards

Any later implementation must preserve all package exports and tarball file lists, avoid internal cross-package imports, avoid generated files in tracked source, and run package unit tests, docs/theme/contrast gates, popup conformance, pack checks, and clean consumer builds. Compare package manifests and public API snapshots before and after. No version, tag, publish, or merge action is included.
