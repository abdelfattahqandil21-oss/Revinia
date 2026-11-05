# Contributing to Rivinia

Thanks for helping improve Rivinia. This guide covers the usual local workflow; package ownership and release rules are in the linked maintainer docs.

## Prerequisites

Use Node.js `22.22.3+` in the 22 line or `24.15.0+` in the 24 line, and pnpm `12.8.1`. These match the installed Angular CLI 22.2.4 engine range and the root `packageManager` field (checked 2026-11-05). See [Angular's compatibility table](https://angular.dev/reference/versions).

## Install, build, and test

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm build:theme && pnpm test:theme
pnpm build:select && pnpm exec ng test select --watch=false
pnpm build:menu && pnpm exec ng test menu --watch=false
pnpm build:i18n && pnpm exec ng test i18n --watch=false
pnpm test:scripts
pnpm check:docs
pnpm check:readmes
pnpm check:governance
pnpm check:skills
```

Run the relevant package and checks for your change. Browser suites need their exact harness built first; see [testing architecture](docs/engineering/TESTING-ARCHITECTURE.md). The [documentation map](docs/README.md) links package and maintainer guides.

## Changes and releases

Use a short-lived task branch and keep changes focused. Commits follow Conventional Commits with a package or repository scope, such as `docs(repo): clarify contributor setup`. Keep package source, tests, and consumer documentation with their owning `projects/<package>/` directory. Do not change public exports, versions, tags, or publish without the required compatibility and release review. Start with [repository rules](AGENTS.md), [versioning policy](docs/engineering/VERSIONING.md), and the [decision index](docs/decisions/README.md).
