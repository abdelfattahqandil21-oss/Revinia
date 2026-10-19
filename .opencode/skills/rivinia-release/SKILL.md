---
name: Rivinia release
description: Release a Rivinia package — build, test, inspect the tarball, prove it in a clean consumer, and publish. Use when the user asks to publish, release, ship, cut a version, or tag a package.
metadata:
  opencode/autoinvoke: false
---

# Releasing a Rivinia package

The gates live in `AGENTS.md` ("Workflow gates"). This skill turns them into a
runnable sequence. **A release is not done until every gate below passes** —
and a gate that was not run is reported as _not run_, never as _passed_.

## Before anything

1. Read `AGENTS.md` and the newest `docs/DECISIONS.md` entry for the package.
2. Confirm the working tree state and the version in
   `projects/<pkg>/package.json`.
3. **Never modify a published version.** A published version is immutable; a
   fix ships as a NEW version (AGENTS.md gate 8).

## 1 — Build (production)

```sh
pnpm build <pkg>          # ng-packagr, production configuration
```

The build must succeed with no errors. Note the `dist/<pkg>` path it reports.

## 2 — Tests

```sh
pnpm test <pkg>           # or: npx ng test <pkg> --no-watch
```

Every test must pass. If a spec is not being executed (a glob that excludes
it — this has happened), say so explicitly rather than counting it as green.

## 3 — Inspect the tarball

```sh
npm pack ./dist/<pkg>
```

Then inspect the tarball's `package.json`:

- `exports` — the subpaths and their `types`/`default` targets.
- `types` — the `.d.ts` entry points.
- `peerDependencies` — must match the published API surface. An `@angular/*`
  peer is never a `dependency`.
- `sideEffects` — `false` for code; a list including `**/*.css` when the
  package ships stylesheets (a CSS import is a side effect and must survive
  tree-shaking).
- the file list — nothing unexpected (no `dist/`, no `pack/`, no credentials).

**Grep the dist FESM for runtime imports.** Any import beyond the declared
peers fails the release:

```sh
grep -oE "from ['\"][^'\"]+['\"]" dist/<pkg>/fesm2022/*.mjs | sort -u
```

An actual `tslib` import fails the release even though ng-packagr injects an
unused `tslib` dependency entry by default (see D20).

**Grep for the vocabulary the package just moved away from.** A rename that
leaks into the bundle is a release blocker.

## 4 — Prove it in a clean consumer

Install the tarball into a clean consumer project (not the workspace, not a
linked `file:` path) and run a production build. A `file:` dependency proves
nothing about what npm will serve.

## 5 — Public imports, as a consumer uses them

Import each public symbol from its documented path and build. A consumer
importing the wrong path must get a compile error, not a silent undefined.

## 6 — Record bundle sizes

Baseline → core-only → core+UI sync → UI lazy. Report the numbers, not a
feeling that it got smaller.

## 7 — Confirm before publishing

**Never publish without explicit user confirmation** showing:

- the exact package name,
- the exact version,
- the access level (`public`),
- the tarball's file list.

State what the version contains in one sentence, so the user can tell whether
it is the version they meant.

## 8 — Publish from a tag

Per the git workflow (D17): release from `main`, with a namespaced tag
`<pkg>/v<semver>`. Tags are immutable — a fix ships as a new version.

## 9 — After publishing

```sh
npm view <pkg> version dist-tags
```

Confirm the registry state. A FIRST publish of a new name goes through npm's
staged review and needs manual approval in the browser (D22) — budget for
that, and tell the user to expect it.

## Reporting

Report honestly:

- what passed, with the command that proved it;
- what failed;
- what was NOT verified, and why.

Never claim a build, test, publish or measurement succeeded without having run
it in this session.
