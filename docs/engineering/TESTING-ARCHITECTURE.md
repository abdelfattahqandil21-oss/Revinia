# Version-aware testing architecture

**Owner:** Package and test-harness maintainers
**Purpose:** connect each compatibility claim to evidence for the exact package version.
**Status:** package-owned i18n testing is colocated; a reusable packed-consumer smoke runner is available.

## Test layers and owners

| Layer | Contract | Current location | Required evidence |
| --- | --- | --- | --- |
| Unit/component | Current implementation behavior and local accessibility/state contracts | Package tests under `projects/<package>` | Configured unit runner; record exact package and command |
| Browser E2E | Real browser interaction, focus, layout, ARIA and cross-component composition | Shared `e2e/menu`, `e2e/select`, `e2e/popup`; app in `projects/menu-e2e` | Build package dependencies and exact app first, then Playwright in named browser |
| i18n browser | Translation, direction, language selection and SSR/CSR integration | `projects/i18n/testing/e2e` and independent `i18n-e2e` app under `projects/i18n/testing/app` | Build i18n, build correct CSR/SSR target, then configured suite |
| Cross-package integration | Public package imports/optional peer composition | Current i18n/select integration and consumer fixtures | Import only documented package exports; test with/without optional peer when relevant |
| API compatibility | Exported symbols/types/entry points | `scripts/api-surface.mjs` currently snapshots four 1.0 packages | Review snapshots against the base/tag; do not auto-accept regenerated output |
| Packed consumer | What npm actually ships | `npm pack`, `scripts/consumer-smoke.mjs`, tracked template at `scripts/fixtures/consumer-smoke/` | Install exact tarball files (not workspace links), compile supplied public imports, run the production Angular build, record package versions and SHA-256, then clean the external temp consumer |
| Docs examples | Consumer snippets and links | Package READMEs and `docs/<topic>/` | Run against exact packed version and check exact-tag links |
| Skill examples | Agent advice against package APIs | Skill metadata and examples | Verify each example at its declared exact package version |
| Historical release | Reproducibility for supported older lines | immutable source tags and archived artifacts | Use pinned toolchain; record unavailable historical dependencies as a limitation |

## Build before dependent gates

Never let a browser gate consume accidental `dist/` state. Build the exact harness and package prerequisites before its clean control run. The audit found `scripts/check-popup-mutations.mjs` executes a clean control before building its demo, while Playwright serves `dist/menu-e2e/browser`. Rebuilding menu-e2e changed four red control cases to 24/24 green. This is a gate-determinism issue, not proof of a popup defect. Track the fix independently and validate from both empty and stale `dist`.

Workspace path aliases point at `dist/`; do not use one package's old build to claim another version passed. Record the build commit, package version, toolchain and exact `dist` producer for dependent E2E runs.

## Packed consumer smoke

Build and pack the package first, then pass the exact resulting tarball and every public entry point used by the consumer example. Use `--style` for public CSS exports and `--absent-package` to prove an optional peer stays absent:

```sh
npm pack ./dist/i18n --pack-destination /tmp/rivinia-packs
node scripts/consumer-smoke.mjs \
  --tarball /tmp/rivinia-packs/rivinia-i18n-1.0.0-rc.2.tgz \
  --specifier @rivinia/i18n \
  --specifier @rivinia/i18n/ui \
  --absent-package @rivinia/select
```

The runner copies only the tracked Angular template to the system temp directory, installs the exact `.tgz` path with npm, verifies the lockfile resolves that same tarball and requested optional absences, and runs the template's production build. `finally` removes the generated app on success or failure. It prints Node/npm versions, installed package versions and tarball SHA-256; failures include captured npm output. It does not publish or modify registry state. Add only the specifiers required by the documented consumer path; the API-surface test separately checks the frozen name list.

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
- The packed-consumer runner has been exercised for `@rivinia/i18n@1.0.0-rc.2` core/UI entry points without optional `@rivinia/select`; other packages still need their own exact-tarball runs before a release claim.
- Full `check:popup-mutations` was not run in the audit; its prerequisite fix needs its own reviewable change.

See `docs/archive/repository-architecture/VERIFICATION-REPORT.md` for the timestamped audit evidence and limitations.
