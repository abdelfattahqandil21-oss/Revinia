# Rivinia — Agent Rules

Production-ready Angular library ecosystem. Correctness over speed; never sacrifice dependency boundaries or publishing correctness for convenience.

## Authority and startup

Within higher-level instructions, repository precedence is: (1) explicit current task and owner-approved decisions, (2) this root policy, (3) nearest directory `AGENTS.md`, (4) invoked maintainer skill, (5) task memory/history. Memory never overrides policy. If authoritative rules conflict, stop the affected action and report both sources.

For non-trivial work, explicitly invoke repository skill `rivinia-playbook` from `.agents/skills/`: use `$rivinia-playbook` in Codex or the native `skill` tool with ID `rivinia-playbook` in OpenCode, then state the route. Read `docs/engineering/README.md`, relevant `docs/DECISIONS.md` entries/runbooks, and applicable directory instructions. Start and update a task record per `docs/engineering/TASK-MEMORY.md`; report branch, worktree, base/HEAD, paths, actual checks, blockers and next safe action. Skill files are discoverable instructions, not a substitute for this policy.

## Ownership and boundaries

- Use the package manager version pinned in root `package.json`; read toolchain/API versions from current manifests and lockfiles rather than cached baseline prose.
- `projects/<library>/` owns that publishable package's manifest, API entry points, source, unit tests, README and package CHANGELOG. `projects/*-e2e/` are harness apps, not libraries; shared menu/select/popup suites live under `e2e/`.
- Keep workspace, package and entry-point boundaries distinct. Core never imports UI; no cycles or cross-package source imports. Use public package exports only.
- Angular framework packages are peers, never runtime dependencies. Preserve `sideEffects: false` for side-effect-free libraries; packages shipping CSS/SCSS must explicitly retain their style side-effect patterns (currently theme).
- Add only single-purpose secondary entry points with demonstrated need. An entry point is an export boundary, not a lazy chunk; prove chunks in production builds. For async splitting, follow the established `LoaderDescriptor.resolve() → dynamic import()` pattern. Reuse these i18n-egy patterns: `provideX(config)` with `makeEnvironmentProviders`; root `@Service()` singletons and `injectX()`; readonly signals/computed state with explicit write methods; impure pipes only when delegating to signals and with a documented reason; async loader descriptors with Map cache/inflight deduplication and monotonic last-wins request tokens; SSR-safe browser guards.
- Do not change public exports/contracts without compatibility review, exact public-import tests, and release documentation.

## Skills, facts and decisions

Use the playbook's task-to-skill route. A skill cannot override this file or `docs/DECISIONS.md`; explicit current owner instructions can. Verify Angular/npm/tool APIs against installed types and authoritative docs, recording source/date. Experimental APIs need a risk note before becoming core dependencies. Foundational policy changes require owner approval and a `docs/DECISIONS.md` entry. Report passed, failed and not-run checks separately.

## Verification gates

Run every applicable verification gate before calling a change done. For package changes, run a production package build and relevant unit tests. Build the exact harness before browser tests; layout, focus, RTL and geometry require a real browser, not jsdom. Keep assertions intact and treat `dist/` as disposable/stale until rebuilt.

Before release approval, explicitly invoke `rivinia-release` (`$rivinia-release` in Codex; OpenCode native `skill` tool ID `rivinia-release`) and inspect the exact packed tarball: exports, types, peers, file list and FESM runtime imports. Also run `node scripts/check-theme-package.mjs <exact-theme.tgz>` for theme, `check:pack` for theme/select/menu/i18n, and `check:readmes`. Install the exact tarball in a clean consumer, production-build it, test documented imports and record required bundle sizes. A workspace build or pack alone is not consumer proof.

Never commit credentials, tokens/OTPs, `dist/`, `pack/` or `node_modules/`. Never alter a published version. A version bump, tag, or publish is a release action and requires the release skill plus explicit owner approval; publishing approval must state package(s), exact version(s), registry/access and inspected tarball contents. Publish only from the approved immutable tag and exact inspected tarball.

## Git and worktrees

Keep `main` releasable. Use a short-lived task-owned branch/worktree (`pkg/<package>/<topic>` for package work); one owner per worktree, explicit shared-path ownership, no cross-worktree edits. Preserve existing work; no destructive cleanup of another task. Revalidate after rebase/integration and rerun affected gates. Human integration uses `--no-ff`; no automatic commit, merge or push.

Use Conventional Commits with package/repo scope and one logical change per commit. Release tags are immutable and namespaced `<package>/v<semver>` on `main`; a fix ships as a new version. Before 1.0, a minor bump is breaking. Never commit generated artifacts, credentials or OTPs; publish only from the tagged commit and exact inspected tarball.

The current synchronized `rivinia-1.0` release group contains all eleven packages in `release-groups.json`, as admitted by D97; its initial four members were menu, select, theme, and i18n. All eleven share one release version while retaining their package and dependency boundaries. See `docs/engineering/VERSIONING.md`. Do not modify protected `projects/env/schematics/` without explicit owner approval.
