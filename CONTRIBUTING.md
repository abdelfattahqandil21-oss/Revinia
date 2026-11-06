# Contributing to Rivinia

Thanks for helping improve Rivinia. This guide covers the usual local workflow; package ownership and release rules are in the linked maintainer docs.

## Prerequisites

The CI baseline is the exact Node version in [`.node-version`](.node-version) and pnpm `12.8.1` from the root `packageManager` field. Node.js `22.22.3+` and `24.15.0+` satisfy the installed Angular CLI 22.2.4 engine range; only the Node 24 baseline currently runs in CI. See [Angular's compatibility table](https://angular.dev/reference/versions).

## Install, build, and test

From the repository root, run the same required validation used by GitHub Actions:

```sh
pnpm install --frozen-lockfile
pnpm validate:ci
```

`pnpm validate:ci` checks documentation and governance, builds and tests every package in dependency order, inspects package metadata, builds the shared browser harness, installs Chromium, and runs its E2E suite. On Linux, CI installs the required system libraries; locally, install those once if Playwright reports a missing library. The [testing architecture](docs/engineering/TESTING-ARCHITECTURE.md) documents the i18n browser suite and release-only gates.

## Changes and releases

Use a short-lived branch and open a pull request against `main`; fork pull requests run with read-only CI permissions. Commits follow Conventional Commits with a package or repository scope, such as `docs(repo): clarify contributor setup`. Keep package source, tests, and consumer documentation with their owning `projects/<package>/` directory. Contributors cannot publish or create release tags. Do not change public exports, versions, tags, or publish without the required compatibility and release review. Start with [repository rules](AGENTS.md), [versioning policy](docs/engineering/VERSIONING.md), and the [decision index](docs/decisions/README.md).
