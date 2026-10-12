# Rivinia — Agent Rules

Production-ready Angular library ecosystem. Correctness over speed. Never sacrifice
dependency boundaries or publishing correctness for convenience.

## Baseline (verified 2026-10-12)

- Angular stable: **22.2.2** (released 2026-10-08). Sources: `npm view @angular/core`,
  https://angular.dev/reference/releases. Major 22 active until 2027-06, LTS until 2028-06.
- CLI / ng-packagr aligned on major 22 (`@angular/cli 22.2.1` installed, ng-packagr `22.2.4` latest).
- `@Service()` — CONFIRMED stable in `@angular/core` (exported, used by i18n-egy v2.2.0).
- `injectAsync` — CONFIRMED stable since v22.0 (`core.d.ts` exports it, `prefetch: onIdle` supported).
- Signal Forms — CONFIRMED stable: `@angular/forms@22.2.2` exports `./signals` + `./signals/compat`.
- Peer policy: `@angular/*` pinned exact within major (`@angular/compiler: 22.2.2`);
  libraries declare `peerDependencies: {"@angular/core": "^22.0.0"}`, `tslib` as runtime dep.
- Package manager: **pnpm** (matches i18n-egy precedent; `pnpm 12.8.1` available).

## Architecture boundaries (enforceable)

- Workspace (`Revinia/`) ≠ publishable package (`projects/<pkg>/package.json`) ≠
  entry point (`src/public-api.ts` + `ng-package.json` per secondary).
- Core NEVER imports UI. No circular deps. No cross-package internal imports —
  public API only (`@rivinia/<pkg>` or `@rivinia/<pkg>/<entry>`).
- `@angular/core` etc. are `peerDependencies`, never `dependencies`.
- `sideEffects: false` in every library `package.json`.
- Single-purpose secondary entry points only when proven necessary
  (e.g. `@rivinia/modal/core`, `@rivinia/modal/ui`). A secondary entry point is an
  npm export boundary, NOT an automatic lazy chunk — prove chunks with production builds.
- Async code-splitting inside a package uses the proven `LoaderDescriptor.resolve() →
  dynamic import()` pattern from i18n-egy, not speculative abstractions.

## Reusable patterns from i18n-egy v2.2.0 (do not duplicate its functionality)

- `provideX(config)` → `makeEnvironmentProviders([{provide: X_CONFIG, useValue}])`.
- `@Service()` root singletons + `injectX()` shorthand.
- Readonly signals/computed for public state; writes only via explicit methods.
- SSR-safe guards (`typeof window/document === 'undefined'` + try/catch).
- `TranslatePipe`-style impure pipe only when delegating to signals; document why.
- Pluggable async loaders via descriptor + `Map` cache + `Map` inflight dedupe +
  monotonic request token (last-wins). See `docs/DECISIONS.md`.

## Workflow gates (a change is NOT done until all pass)

1. `pnpm build <pkg>` (ng-packagr production) succeeds.
2. Unit tests pass (`ng test` / Karma+Jasmine baseline).
3. `npm pack` tarball inspected: `exports`, `types`, `peerDependencies`, files.
   Grep dist FESM for runtime imports — any import beyond declared
   peers/allowances (e.g. an actual `tslib` import) fails the release.
   (ng-packagr injects an unused `tslib` dep entry by default; see D20.)
4. Tarball installed in a clean consumer fixture; consumer production build succeeds.
5. Public imports tested exactly as consumer uses them.
6. Bundle sizes recorded (baseline → core-only → core+UI sync → UI lazy).
7. No credential/token ever committed. No publish without explicit user confirmation
   showing exact name, version, access, and tarball contents.
8. Never modify a published version — new version only.

## Decision discipline

- Never invent Angular APIs, CLI flags, schematics options, or npm behaviors.
  Verify against installed `node_modules` types + official docs, record source + date.
- Experimental APIs require a risk note before becoming a core dependency.
- Foundational rule changes need user approval + `docs/DECISIONS.md` entry.
- Report what succeeded, what failed, what remains unverified. Never claim an
  unexecuted build/test/publish/bundle measurement succeeded.

## Git workflow (trunk-based, per-package releases)

- `main` is always releasable. Work in short-lived branches:
  `pkg/<package>/<topic>` (e.g. `pkg/http/retry-policy`); merge with `--no-ff`.
- Conventional Commits, scope = package: `feat(http): …`, `fix(toast): …`,
  `chore(repo): …`, `docs(http): …`, `test(modal): …`, `build(repo): …`.
- One logical change per commit; never mix packages in one commit.
- Release with namespaced tags on `main`: `<pkg>/v<semver>` (e.g. `http/v0.2.0`).
  Tags are immutable — fixes ship as new versions. Pre-1.0: minor bump = breaking.
- Never commit `dist/`, `pack/`, `node_modules/`, credentials, or OTPs (ignored
  by `.gitignore`, but stay vigilant with `git add -A`).
- Publish only from a tagged commit, from the exact inspected tarball.
