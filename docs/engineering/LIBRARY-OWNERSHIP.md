# Library ownership map

**Status:** current layout inventory recorded 2026-11-03; i18n testing colocation is the first approved migration.
**Purpose:** show who owns implementation, tests, harnesses, documentation, and verification before moving files.

## Package boundaries

Every publishable library is an Angular project under `projects/<name>/`, with its manifest, package README, source, and unit tests owned by that package. Secondary entry points remain inside the same package boundary. Schematics are package-owned except that `projects/env/schematics/` is protected from edits without separate owner approval.

| Library | Entry points and implementation | Unit tests | Integration / browser ownership | Specs and consumer docs | Build and verification |
| --- | --- | --- | --- | --- | --- |
| `http` | `projects/http/src`; one entry point | `projects/http/tests` (3 files) | No dedicated browser harness; shared consumer checks are infrastructure-owned | `projects/http/README.md` | `ng build http`; schematic tests are package-owned |
| `toast` | `projects/toast/src`, `projects/toast/ui` (2 entry points) | `projects/toast/tests` (3 files) | No dedicated browser suite; component behavior is covered by unit tests | `projects/toast/README.md` | `ng build toast`; package schematics |
| `modal` | `projects/modal/src`, `projects/modal/ui` (2) | `projects/modal/tests` (6 files) | No dedicated browser harness currently | `projects/modal/README.md` | `ng build modal`; package schematics |
| `i18n` | `projects/i18n/src`, `ui`, and `select` (3) | `projects/i18n/tests` (36 files) | Exclusive app and browser/SSR suite currently live in `projects/i18n-e2e`; migrate this Angular project under `projects/i18n/testing/` while keeping it independent | `projects/i18n/README.md`, `CHANGELOG.md`, package `SPEC-*`, `docs/i18n/`, and `docs/specifications/i18n-select.md` | `ng build i18n`; independent `i18n-e2e` app, CSR/SSR builds, Playwright config and SSR smoke |
| `env` | `projects/env/src`; one entry point | `projects/env/tests` (1 file) | Schematics integration tests are package-owned | `projects/env/README.md` | `ng build env`; `projects/env/schematics/` is protected |
| `menu` | `projects/menu/src`, `projects/menu/ui` (2) | `projects/menu/tests` (7 files) | Shares `projects/menu-e2e` with Select and root `e2e/menu` + `e2e/popup`; no exclusive ownership is implied by the harness name | `projects/menu/README.md`, `CHANGELOG.md`, `docs/menu/`, `docs/specifications/menu-*` | `ng build menu`; shared browser build precedes Playwright |
| `select` | `projects/select/src`, `projects/select/ui` (2) | `projects/select/tests` (20 files) | Shares the Menu harness and root `e2e/select` + `e2e/popup` contracts | `projects/select/README.md`, `CHANGELOG.md`, `docs/select/`, `docs/specifications/select-*` | `ng build select`; shared browser build precedes Playwright |
| `theme` | `projects/theme/src` and `styles`; one package entry | `projects/theme/tests` (1 file) | Browser theme/contrast/component checks are shared verification infrastructure in `scripts/` and `scripts/fixtures/` | `projects/theme/README.md`, `CHANGELOG.md`, `SPEC-*`, `docs/theme/` | `ng build theme`, package-content, contrast, dark-mode and component-theme gates |
| `datepicker` | `projects/datepicker/src`, `ui` (2) | `projects/datepicker/tests` (15 files) | No dedicated browser harness currently | `projects/datepicker/README.md` | `ng build datepicker`; unit coverage owns calendar/date/time behavior |
| `table` | `projects/table/src`, `ui` (2) | `projects/table/tests` (4 files) | No dedicated browser harness currently | `projects/table/README.md`, `docs/specifications/table-*` | `ng build table`; unit coverage owns pipeline, spans and UI behavior |

Counts are a navigation aid, not a measure of coverage. The Angular project files, package manifests, public entry points, and actual suite references are authoritative.

## Shared ownership and infrastructure

- `projects/menu-e2e` is one browser app shared by Menu, Select, and popup contract suites. Keep it single and shared until an evidence-backed change shows its runtime or ownership has diverged.
- Root `e2e/menu`, `e2e/select`, and `e2e/popup` are cross-component browser contracts. The `e2e/` instructions and root Playwright configuration own their execution; package owners own the behavior under test.
- `projects/i18n-e2e` currently has only i18n-owned routes, assets, browser tests, and SSR proof. Unlike the shared popup harness, it is exclusive and is the pilot for physical colocation.
- `scripts/`, `scripts/tests/`, and `scripts/fixtures/` hold repository-wide verification tooling and evidence, not copies owned by individual packages.
- Maintainer routing and release skills live in `.agents/skills/`; package consumer guidance lives in package READMEs and topic docs. There is no package-specific consumer skill today.
- Current topic documentation lives under `docs/i18n/`, `docs/menu/`, `docs/select/`, and `docs/theme/`. Package-oriented specifications are in `docs/specifications/` or beside the package when historical/version-specific. This is a navigation split to review separately; do not move specification history as part of the i18n harness pilot.

## i18n pilot path map

The pilot changes physical ownership while preserving the Angular project name `i18n-e2e`, its independent build/test behavior, and output path:

| Before | After |
| --- | --- |
| `projects/i18n-e2e/src/` | `projects/i18n/testing/app/src/` |
| `projects/i18n-e2e/public/` | `projects/i18n/testing/app/public/` |
| `projects/i18n-e2e/tsconfig.app.json` | `projects/i18n/testing/app/tsconfig.app.json` |
| `projects/i18n-e2e/e2e/` | `projects/i18n/testing/e2e/` |
| `projects/i18n-e2e/playwright.config.ts` | `projects/i18n/testing/playwright.config.ts` |
| Angular project root `projects/i18n-e2e` | Angular project root `projects/i18n/testing`; project name remains `i18n-e2e` |
| `dist/i18n-e2e-csr` and `dist/i18n-e2e` | unchanged |

No package entry point, source file, manifest, package README/changelog, package version, or published file is part of this migration. Preserve any ignored/generated reports already under the old path; do not delete them as part of the tracked-file move.
