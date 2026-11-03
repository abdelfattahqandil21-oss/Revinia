# Repository engineering changelog

**Owner:** Rivinia maintainers
**Purpose:** dated record of repository architecture and workflow changes, separate from npm package histories.

## 2026-11-03 — governance foundation

- Added version-aware package ownership, release group, documentation, AI skill, testing, task memory, worktree and changelog policies.
- Added root and directory-scoped agent instructions, a maintainer skill update, public-safe task templates and a consistency gate.
- Added release-group, version-aware skill compatibility and immutable documentation-link/snapshot checks with positive and negative fixtures.
- Rebuilt popup prerequisites before mutation verification: the clean control passed 24 tests and all 18 behavior mutants were killed.
- Refreshed the root package table to the verified `1.0.0-rc.2` npm `latest` state for the four-package release group.
- Organized repository documentation by responsibility and release lifecycle, retaining compatibility pointers for previous paths; strengthened the package README checker to fail on missing local links.
- Added a ten-library ownership map and colocated the i18n-owned app, Playwright suites, and SSR smoke under `projects/i18n/testing/` while retaining the independent `i18n-e2e` Angular project and its output paths.
- Verified the i18n move from an empty `dist/`: select/i18n production builds, 376 unit tests, CSR/SSR builds, 36 SSR checks, 96 browser tests (Chromium, Chrome, Firefox), API-surface test, docs/governance/skills/README checks, and a 20-file i18n pack with no harness files.
- No runtime, public API, package version, release tag or registry state changed.
- Evidence: `docs/engineering/MIGRATION-PLAN.md`; task details remain in the task owner's private journal.
