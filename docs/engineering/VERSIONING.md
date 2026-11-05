# Version and release policy

**Owner:** Rivinia release maintainers
**Purpose:** define package compatibility boundaries and the synchronized release group.
**Status:** approved constraints plus explicitly open maintenance policy.

## Source of truth

A package's `projects/<name>/package.json` declares its workspace version. npm registry versions/dist-tags are separate external state. Before release work, inspect both from the official registry and the exact package manifest; record the timestamp and artifacts in the release record. The lockfile records dependency resolution, not support promises.

## Release groups

### Unified 1.0 group

The synchronized group contains:

- `@rivinia/menu`
- `@rivinia/select`
- `@rivinia/theme`
- `@rivinia/i18n`

Their workspace release versions must be identical at release. `@rivinia/popup` remains at `0.0.0` during development and is aligned only for a release. Any group release candidate or stable release is prepared and verified as a five-package set, with one shared version and coordinated release evidence. Package-specific immutable tags remain namespaced (`menu/v<version>`, etc.); the tags point to the same approved release commit unless the release owner records a justified exception. This policy does not authorize creating tags or publishing.

- `@rivinia/popup` joined by D95 and ships in the group at release.
- By explicit owner decision D97, the remaining six libraries also join `rivinia-1.0` for the all-library release line. The owner has requested local preparation of synchronized `1.0.0`; this does not assert that any stable package has been published. The independent packages retain their own API and dependency boundaries while their release versions are synchronized.

Introducing the shared popup runtime capability is a backward-compatible capability addition and uses a synchronized minor bump. SemVer's dependency FAQ classifies dependency updates without public API changes as compatible and says the bump level depends on whether the dependency update introduces functionality; dependency metadata alone without new capability may use patch. See [SemVer 2.0.0 FAQ](https://semver.org/#what-should-i-do-if-i-update-my-own-dependencies-without-changing-the-public-api).

The remaining six packages—datepicker, env, http, modal, table and toast—remain independently versioned. The release group is checked by `pnpm check:governance`; the registry is not contacted by that local gate.

## Current support and verification matrix

The table separates owner-declared lifecycle from what the audited source actually verified. D97 admitted the remaining six packages to the synchronized line. Current local work prepares the eleven-package `1.0.0` candidate; registry state remains the published versions shown in the left column until release. `Verified at base` means the prior audit ran those listed local gates at the exact base SHA; it is not a promise that the package is maintained for a range of versions.

| Package | npm `latest` published | Workspace version at base | Release policy / support claim | Exact source verification evidence |
| --- | --- | --- | --- | --- |
| `@rivinia/menu` | `1.0.0-rc.2` | `1.0.0-rc.2` | Group prerelease; 0.x deprecated; future stable-major maintenance policy open | Base `75c5038`; build, 65 unit tests, pack, clean tarball install; root Chromium E2E |
| `@rivinia/select` | `1.0.0-rc.2` | `1.0.0-rc.2` | Group prerelease; 0.x deprecated; future stable-major maintenance policy open | Base `75c5038`; build, 163 unit tests, pack, clean tarball install; root Chromium E2E |
| `@rivinia/theme` | `1.0.0-rc.2` | `1.0.0-rc.2` | Group prerelease; 0.x deprecated; future stable-major maintenance policy open | Base `75c5038`; build, 10 theme tests, package checker, pack, clean install; one wrapper test failed in symlinked worktree, see verification report |
| `@rivinia/i18n` | `1.0.0-rc.2` | `1.0.0-rc.2` | Group prerelease; 0.x deprecated; future stable-major maintenance policy open | Base `75c5038`; build, 376 unit tests, pack, clean tarball install; i18n Chromium E2E |
| `@rivinia/datepicker` | `0.1.0` | `0.1.0` | Independent versioning; no multi-version support range declared | Base `75c5038`; build, 468 unit tests, pack, clean tarball install |
| `@rivinia/env` | `0.3.3` | `0.3.4` | Independent versioning; no multi-version support range declared | Base `75c5038`; build, 2 unit tests, pack, clean tarball install; env schematic paths remain protected |
| `@rivinia/http` | `0.5.3` | `0.5.4` | Independent versioning; no multi-version support range declared | Base `75c5038`; build, 39 unit tests, pack, clean tarball install |
| `@rivinia/modal` | `0.6.1` | `0.6.2` | Independent versioning; no multi-version support range declared | Base `75c5038`; build, 53 unit tests, pack, clean tarball install |
| `@rivinia/table` | `0.1.0` | `0.1.0` | Independent versioning; no multi-version support range declared | Base `75c5038`; build, 207 unit tests, pack, clean tarball install |
| `@rivinia/toast` | `0.5.1` | `0.5.2` | Independent versioning; no multi-version support range declared | Base `75c5038`; build, 35 unit tests, pack, clean tarball install |

The npm column is the exact `latest` dist-tag version read from `https://registry.npmjs.org/` on 2026-11-03; the workspace column is the manifest version at base. These are separate facts and neither implies the other. The matrix is a dated snapshot, not a live registry guarantee. Full evidence, failed test context and not-run gates are in `../archive/repository-architecture/VERIFICATION-REPORT.md`. The long-term support/end-of-life schedule for future stable majors remains **REQUIRES PRODUCT DECISION**.

### Admission rules for a future group member

A package joins only after a reviewed decision record states: (1) owner and public API, (2) concrete runtime/API dependency that makes independent release unsafe or costly, or an explicit owner-approved synchronization exception with its operational benefit, (3) coordinated semver and peer-range behavior, (4) migration and rollback plan, (5) required contract/unit/E2E/consumer gates, and (6) explicit owner approval. Add it to the group with an admission decision reference and synchronized manifest/checker validation in the same reviewed change. Shared branding or folder layout alone is insufficient.

## Major-aware compatibility

- **Major:** compatibility boundary for supported public imports, types, runtime behavior, package docs, skills and verification contracts. A new major gets an explicit migration guide and compatibility contract.
- **Minor:** may add capability without promising it exists in every version of the same major. Mark each capability with its `introduced` version and gate examples/skills against that exact version.
- **Patch:** preserve exact traceability to source commit, package tarball hash, changelog entry, verification results and docs snapshot. Never mutate a published version.
- **Prerelease:** identify the exact candidate version. Do not infer stable support from an RC. Existing owner policy intentionally places the current 1.0 RC on npm `latest` and deprecates the 0.x line; keep that as a historical explicit decision (D93), not a general prerelease default.

Do not copy entire source trees or E2E suites per major. Use immutable tags/artifacts, public API snapshots, migration contracts and a support matrix. Reproduce historical builds when their pinned toolchain and dependencies remain obtainable; otherwise state the missing dependency/toolchain and mark the result `PARTIALLY VERIFIED`.

## Support versus verification

These are different statements:

- **Supported:** a maintainer-approved compatibility promise over a version range, with a stated maintenance/EOL policy.
- **Verified:** an exact package version, commit or tarball was exercised by named commands on a dated environment.

A green test on one exact version proves only that version and those gates. Never widen a support range from test evidence alone. Current package peer ranges constrain install compatibility, but they do not define a complete product support or security maintenance policy.

The support/EOL policy for older and future major lines is **REQUIRES PRODUCT DECISION**. In particular, D93 closes the old 0.x line; it does not decide whether 1.x receives backports after a future major ships.

## Release evidence and changelog relation

A release record binds package name, exact version, tag/commit, exact tarball filename and hashes, packed file list, API compatibility result, tests, docs snapshot, consumer build and registry readback. See [testing architecture](TESTING-ARCHITECTURE.md), [versioned documentation](VERSIONED-DOCUMENTATION.md), and [changelog policy](CHANGELOG-POLICY.md).

Current verified snapshot (2026-11-03): all four workspace manifests are `1.0.0-rc.2`; official npm `latest` is `1.0.0-rc.2` for all four. npm `next` is `rc.1` for menu/select and `rc.2` for theme/i18n. The `next` drift is recorded, not changed here. Refresh before any release decision.
