<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="./assets/rivinia-abstract-mark.svg" />
    <source media="(prefers-color-scheme: light)" srcset="./assets/rivinia-abstract-mark-light.svg" />
    <img src="./assets/rivinia-abstract-mark-light.svg" alt="Rivinia" width="390" />
  </picture>
</p>

# Rivinia

Rivinia is a workspace of Angular libraries for application infrastructure and
reusable UI behavior. The eleven packages below release together as one
synchronized `1.x` line (group `rivinia-1.0`). Install and configure only the
package your application needs; each package README is the detailed consumer
reference for its public API.

Published packages target Angular 22. All eleven packages are published at
`1.0.1` on npm (registry versions checked on 2026-11-06). “Workspace” shows each
package manifest version; the authoritative version for a release is the
package's published npm metadata.

## Start here (humans)

New contributors: see [Contributing](./CONTRIBUTING.md) for setup and the usual
checks. For package documentation, engineering policy, and historical records,
use the [documentation map](./docs/README.md). To report a vulnerability, see
[Security](./SECURITY.md).

## Packages

The workspace column shows each package manifest version. `Latest on npm` is the
version published to the registry.

| Package                                                  | Latest on npm                                              | Workspace | `ng add` | Use it for                                                                                      |
| -------------------------------------------------------- | ---------------------------------------------------------- | --------- | -------- | ----------------------------------------------------------------------------------------------- |
| [`@rivinia/http`](./projects/http/README.md)             | [1.0.1](https://www.npmjs.com/package/@rivinia/http)       | 1.0.3 | Yes      | Typed `HttpClient` methods, response-envelope unwrapping, and `httpResource` integration.       |
| [`@rivinia/toast`](./projects/toast/README.md)           | [1.0.1](https://www.npmjs.com/package/@rivinia/toast)      | 1.0.3 | Yes      | A headless signal-based notification queue with timers and actions.                             |
| [`@rivinia/modal`](./projects/modal/README.md)           | [1.0.1](https://www.npmjs.com/package/@rivinia/modal)      | 1.0.3 | Yes      | Headless modal coordination, stacking/queuing, and typed results.                               |
| [`@rivinia/i18n`](./projects/i18n/README.md)             | [1.0.1](https://www.npmjs.com/package/@rivinia/i18n)       | 1.0.3 | Yes      | Language state, direction, SSR-safe loaders, ICU plurals, and typed keys.                       |
| [`@rivinia/env`](./projects/env/README.md)               | [1.0.1](https://www.npmjs.com/package/@rivinia/env)        | 1.0.3 | Yes      | Typed application environment configuration (dev/staging/prod).                                 |
| [`@rivinia/menu`](./projects/menu/README.md)             | [1.0.1](https://www.npmjs.com/package/@rivinia/menu)       | 1.0.3 | No       | Headless menu behavior, keyboard navigation, and its optional ready-made UI.                    |
| [`@rivinia/popup`](./projects/popup/README.md)           | [1.0.1](https://www.npmjs.com/package/@rivinia/popup)      | 1.0.3 | No       | Internal headless positioning and dismissal mechanics shared by Rivinia popups.                 |
| [`@rivinia/select`](./projects/select/README.md)         | [1.0.1](https://www.npmjs.com/package/@rivinia/select)     | 1.0.3 | No       | Headless single/multi selection, search filtering, and optional UI at `@rivinia/select/ui`.     |
| [`@rivinia/theme`](./projects/theme/README.md)           | [1.0.1](https://www.npmjs.com/package/@rivinia/theme)      | 1.0.3 | No       | Shared design tokens for Rivinia component colors, shapes, and typography.                      |
| [`@rivinia/datepicker`](./projects/datepicker/README.md) | [1.0.1](https://www.npmjs.com/package/@rivinia/datepicker) | 1.0.3 | No       | Headless Gregorian date/time picker: month grid, time zones and DST, keyboard navigation, RTL.  |
| [`@rivinia/table`](./projects/table/README.md)           | [1.0.1](https://www.npmjs.com/package/@rivinia/table)      | 1.0.3 | No       | Headless table: typed columns, sorting, filtering, pagination, selection, and row/column spans. |

The `i18n-e2e` and `menu-e2e` projects are test harness applications that
serve the Playwright suites; they are not packages and are never published.
`pnpm check:docs` fails when a package is missing from this table or when the
version column drifts from its manifest.

For architecture, feature specifications, testing, release workflows, and
historical reports, start at the [documentation map](./docs/README.md).

## Install and configure

Install only the package(s) you plan to use. For example:

```bash
npm install @rivinia/http
ng add @rivinia/http
```

`ng add` applies that package's documented project setup. For packages without
an `ng add` schematic, follow the manual setup in that package's README.
Package-specific guides cover imports, providers, options, value types, and
common behavior.

## Work in this repository

This monorepo uses pnpm. From its root:

```bash
pnpm install
pnpm build:http
pnpm exec ng test http --watch=false
pnpm check:docs
```

Build aliases exist for http, toast, i18n, modal, env, menu, select, theme, and
datepicker. Table has no alias; build it with `pnpm exec ng build table`.
HTTP, toast, modal, i18n, and env builds also compile their `ng add`
schematics; `pnpm test:schematics` runs those suites. Run Angular package unit
tests with `pnpm exec ng test <project-name> --watch=false`, for example
`pnpm exec ng test select --watch=false`. Theme uses `pnpm test:theme`.
The browser suites build first:
`npx ng build i18n && npx ng build i18n-e2e --configuration csr`, then
`npx playwright test --config projects/i18n/testing/playwright.config.ts`.

## Release safety

Building a workspace package is not the same as publishing it. Do not publish
without confirming the package name, version, access, and inspected tarball;
follow the release gates in [`AGENTS.md`](./AGENTS.md) and the decisions in
[`docs/decisions/README.md`](./docs/decisions/README.md); the stable entry point is
[`docs/DECISIONS.md`](./docs/DECISIONS.md). Releases are tagged on `main` as
`<package>/v<semver>` (for example `i18n/v1.0.1`); tags are immutable.
