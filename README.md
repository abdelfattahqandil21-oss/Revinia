# Rivinia

Rivinia is a workspace of independently versioned Angular libraries for
application infrastructure and reusable UI behavior. Install and configure
only the package your application needs; each package README is the detailed
consumer reference for its public API.

Published packages target Angular 22. The versions below were checked on npm
on 2026-10-20. “Workspace” shows each package manifest's version and may be
unreleased. The authoritative version for a release is the package's published
npm metadata.

## Packages

| Package                                          | Latest on npm                                          | Workspace      | `ng add` | Use it for                                                                                |
| ------------------------------------------------ | ------------------------------------------------------ | -------------- | -------- | ----------------------------------------------------------------------------------------- |
| [`@rivinia/http`](./projects/http/README.md)     | [0.5.2](https://www.npmjs.com/package/@rivinia/http)   | 0.5.2          | Yes      | Typed `HttpClient` methods, response-envelope unwrapping, and `httpResource` integration. |
| [`@rivinia/toast`](./projects/toast/README.md)   | [0.5.0](https://www.npmjs.com/package/@rivinia/toast)  | 0.5.0          | Yes      | A headless signal-based notification queue with timers and actions.                       |
| [`@rivinia/modal`](./projects/modal/README.md)   | [0.6.0](https://www.npmjs.com/package/@rivinia/modal)  | 0.6.0          | Yes      | Headless modal coordination, stacking/queuing, and typed results.                         |
| [`@rivinia/i18n`](./projects/i18n/README.md)     | [0.3.2](https://www.npmjs.com/package/@rivinia/i18n)   | 0.3.2          | Yes      | Language state, direction, and translation utilities.                                     |
| [`@rivinia/env`](./projects/env/README.md)       | [0.3.2](https://www.npmjs.com/package/@rivinia/env)    | 0.3.2          | Yes      | Typed application environment configuration.                                              |
| [`@rivinia/menu`](./projects/menu/README.md)     | [0.3.5](https://www.npmjs.com/package/@rivinia/menu)   | 0.3.5          | No       | Headless menu behavior and its optional ready-made UI.                                    |
| [`@rivinia/select`](./projects/select/README.md) | [0.6.0](https://www.npmjs.com/package/@rivinia/select) | 0.6.0          | No       | Headless single/multi selection and optional UI at `@rivinia/select/ui`.                  |
| [`@rivinia/theme`](./projects/theme/README.md)   | [0.1.0](https://www.npmjs.com/package/@rivinia/theme)  | 0.1.0          | No       | Shared design tokens for Rivinia component colors, shapes, and typography.                |

The proof projects [`@rivinia/proof-core`](./projects/proof-core/README.md)
and [`@rivinia/proof-second`](./projects/proof-second/README.md) are internal
architecture experiments, not published consumer packages.

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

The `build:<package>` scripts build the library; HTTP, toast, modal, i18n, and
environment builds also compile their schematics. Menu and select can be built
with `pnpm build:menu` and `pnpm build:select`. Run a package's unit tests with
`pnpm exec ng test <project-name> --watch=false`, for example
`pnpm exec ng test select --watch=false`.

## Release safety

Building a workspace package is not the same as publishing it. Do not publish
without confirming the package name, version, access, and inspected tarball;
follow the release gates in [`AGENTS.md`](./AGENTS.md) and the decisions in
[`docs/DECISIONS.md`](./docs/DECISIONS.md).
