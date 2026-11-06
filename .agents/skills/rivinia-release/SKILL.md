---
name: rivinia-release
description: Release a Rivinia package — build, test, inspect the tarball, prove it in a clean consumer, and publish. Use when the user asks to publish, release, ship, cut a version, or tag a package.
metadata:
  opencode/autoinvoke: false
  role: maintainer
  package_scope: repository-wide
  supported_ranges_ref: docs/engineering/VERSIONING.md
  verified_versions_ref: exact release evidence only
  documentation_refs: docs/engineering/VERSIONED-DOCUMENTATION.md
  verification_refs: docs/engineering/TESTING-ARCHITECTURE.md
---

# Releasing a Rivinia package

Invoke this skill explicitly for release work. It is hidden from automatic
selection in OpenCode and Codex; the repository playbook and root policy point
to it. Skill guidance never grants release approval.

The gates live in `AGENTS.md` ("Workflow gates"). This skill turns them into a
runnable sequence. **A release is not done until every gate below passes** —
and a gate that was not run is reported as _not run_, never as _passed_.

## Before anything

1. Read `AGENTS.md`, `docs/engineering/README.md`, the newest relevant
   `docs/DECISIONS.md` entry, and the version, documentation, changelog and
   testing policies under `docs/engineering/`.
2. Confirm the working tree state and the version in
   `projects/<pkg>/package.json`.
3. **Never modify a published version.** A published version is immutable; a
   fix ships as a new version.
4. Read `release-groups.json` and treat every listed package as one release
   set. The current `rivinia-1.0` group has eleven members at the same version;
   its package APIs and dependency boundaries remain independent.
   `pnpm check:governance` validates the approved membership and versions.
5. Distinguish maintainer-approved supported ranges from exact package
   versions actually verified. Read the exact consumer/package version before
   recommending version-specific APIs; minor features are not present across
   an entire major by assumption.

## 1 — Build (production)

```sh
pnpm build:<pkg>          # when the package has a build:<pkg> script
pnpm exec ng build <pkg>  # otherwise, Angular production package build
```

The build must succeed with no errors. Note the `dist/<pkg>` path it reports.

## 2 — Tests

```sh
pnpm test <pkg>           # or: npx ng test <pkg> --no-watch
```

Every test must pass. If a spec is not being executed (a glob that excludes
it — this has happened), say so explicitly rather than counting it as green.

Before packing, validate the built candidate README and changelog against the
exact version and tag reference:

```sh
node scripts/check-versioned-doc-links.mjs @rivinia/<pkg> <exact-version> --package-dir=dist/<pkg>
```

This checks the built package directory's manifest, README and CHANGELOG,
accepts only GitHub blob/tree file links pinned to `<pkg>/v<exact-version>`,
and verifies linked files exist in the candidate source tree. It does not prove
that the tag exists. After packing from the approved tagged commit, run the
same checker with `--tarball=<file.tgz> --verify-tag-snapshot` so it validates
the README, manifest and changelog bytes that will ship, verifies the tag
manifest matches the candidate, and checks linked paths in that immutable tag
tree. `check:pack` still verifies required archive metadata/files. In the clean
tag worktree, add `--require-tag`; it requires the tag to resolve to HEAD and
the worktree to be clean.

## 3 — Inspect the tarball

```sh
npm pack ./dist/<pkg>
node scripts/check-versioned-doc-links.mjs @rivinia/<pkg> <exact-version> --tarball=./<pkg>-<exact-version>.tgz --verify-tag-snapshot
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

## 8 — Publish from a tag through GitHub

Per the git workflow (D17): release from `main`, with all eleven namespaced
tags `<pkg>/v<semver>` resolving to the same reviewed commit. Tags are
immutable — a fix ships as a new version. After the exact package/version,
public access, dist-tag, and inspected file lists have explicit owner approval,
dispatch `.github/workflows/publish.yml` from `main`. The
`npm-production` Environment approval gates the OIDC publish job. Do not run
`npm publish` locally or create tags unless separately authorized. See
[`docs/releases/1.0/GITHUB-PUBLISHING.md`](../../../docs/releases/1.0/GITHUB-PUBLISHING.md)
for npm Trusted Publisher and GitHub settings.

## 9 — After publishing

```sh
npm view <pkg> version dist-tags
```

Confirm the registry state. A FIRST publish of a new name goes through npm's
staged review and needs manual approval in the browser (D22) — budget for
that, and tell the user to expect it.

Build each E2E app and its package prerequisites before running browser gates;
a stale `dist/` is not test evidence. Never point published package docs at
`main` or an unversioned site.

## Reporting

Report honestly:

- what passed, with the command that proved it;
- what failed;
- what was NOT verified, and why.

Never claim a build, test, publish or measurement succeeded without having run
it in this session.
