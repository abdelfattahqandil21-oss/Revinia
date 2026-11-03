# Version-aware testing architecture

**Owner:** Package and test-harness maintainers
**Purpose:** connect each compatibility claim to evidence for the exact package version.
**Status:** current layout retained; known gate work is staged separately.

## Test layers and owners

| Layer | Contract | Current location | Required evidence |
| --- | --- | --- | --- |
| Unit/component | Current implementation behavior and local accessibility/state contracts | Package tests under `projects/<package>` | Configured unit runner; record exact package and command |
| Browser E2E | Real browser interaction, focus, layout, ARIA and cross-component composition | Shared `e2e/menu`, `e2e/select`, `e2e/popup`; app in `projects/menu-e2e` | Build package dependencies and exact app first, then Playwright in named browser |
| i18n browser | Translation, direction, language selection and SSR/CSR integration | `projects/i18n/testing/e2e` and independent `i18n-e2e` app under `projects/i18n/testing/app` | Build i18n, build correct CSR/SSR target, then configured suite |
| Cross-package integration | Public package imports/optional peer composition | Current i18n/select integration and consumer fixtures | Import only documented package exports; test with/without optional peer when relevant |
| API compatibility | Exported symbols/types/entry points | `scripts/api-surface.mjs` currently snapshots four 1.0 packages | Review snapshots against the base/tag; do not auto-accept regenerated output |
| Packed consumer | What npm actually ships | `npm pack`, package check scripts, clean fixtures | Install exact tarball (not workspace/file link), resolve imports, production build |
| Docs examples | Consumer snippets and links | Package READMEs and `docs/<topic>/` | Run against exact packed version and check exact-tag links |
| Skill examples | Agent advice against package APIs | Skill metadata and examples | Verify each example at its declared exact package version |
| Historical release | Reproducibility for supported older lines | immutable source tags and archived artifacts | Use pinned toolchain; record unavailable historical dependencies as a limitation |

## Build before dependent gates

Never let a browser gate consume accidental `dist/` state. Build the exact harness and package prerequisites before its clean control run. The audit found `scripts/check-popup-mutations.mjs` executes a clean control before building its demo, while Playwright serves `dist/menu-e2e/browser`. Rebuilding menu-e2e changed four red control cases to 24/24 green. This is a gate-determinism issue, not proof of a popup defect. Track the fix independently and validate from both empty and stale `dist`.

Workspace path aliases point at `dist/`; do not use one package's old build to claim another version passed. Record the build commit, package version, toolchain and exact `dist` producer for dependent E2E runs.

## Version compatibility matrix

For each supported package major, maintain a compact contract containing:

- exact supported package ranges and support/EOL status;
- public entry points and compatibility-sensitive exports;
- feature introduction versions and migration notes;
- unit, browser, integration and consumer gates required;
- verified exact package versions and evidence links;
- Angular/Node/toolchain versions used for verification.

Keep source and test suites singular where possible. Use fixtures/configuration for supported versions; add a separate historical lane only when it proves a real compatibility promise. Do not clone all source or E2E files for every major.

## Known coverage gaps

- `scripts/api-surface.mjs` covers the four-package 1.0 scope, not all ten libraries.
- No tracked CI workflow was found in the audited tree; local green does not imply CI parity.
- Root E2E was Chromium-only in the audit snapshot; WebKit/full cross-browser support is not implied.
- Clean consumer installation was verified in the audit, but a production Angular build in that exact consumer remained unverified.
- Full `check:popup-mutations` was not run in the audit; its prerequisite fix needs its own reviewable change.

See `docs/repository-architecture/VERIFICATION-REPORT.md` for the timestamped audit evidence and limitations.
