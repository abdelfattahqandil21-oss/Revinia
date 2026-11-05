# Governance foundation review

**Owner:** Repository owner
**Purpose:** record the verification of the uncommitted governance foundation.
**Status:** reviewed on 2026-11-03; no migration or commit performed.

## State and preservation

- Worktree at review time: historical temporary worktree, branch `chore/repository-architecture`, HEAD `75c50384d19fa98c7aadfa71d7c93bbe5d4026a`.
- The primary checkout remains on `main`; no package manifests, exports, runtime source, tags, registry state, or package artifacts were changed by this review.
- The source and repository filesystems differ; `git worktree move` failed with `Invalid cross-device link`. The historical source remains untouched. Do not copy `.git` metadata.
- At this review snapshot, a durable-copy procedure was proposed. The later hardening report records the Git-native sibling-worktree transfer, inventory comparisons and source preservation.

## Root instruction preservation matrix

Original references are line numbers in `git show HEAD:AGENTS.md`; updated references are in root `AGENTS.md` and scoped files.

| Original rule | New location | Assessment | Evidence | Required correction |
| --- | --- | --- | --- | --- |
| Correctness, dependency boundaries and publishing correctness (3–4) | `AGENTS.md:3,15–18,28–30` | Preserved / strengthened | Explicit public export compatibility review and exact import tests | None |
| Angular/CLI/TypeScript versions and API facts dated 2026-10-28 (6–19) | `AGENTS.md:13,22`; current package manifests/lockfile | Intentionally replaced with current-source rule | Old facts were timestamped and drift-prone; root now directs readers to manifests/lockfiles and authoritative docs | None; refresh facts only when a task needs them |
| Playbook route, authority and unrun gates (21–33) | `AGENTS.md:7–9,22,28–30` | Preserved / strengthened | Policy hierarchy, startup reading, task record, passed/failed/not-run reporting and release skill | None |
| Workspace/package/entry-point boundaries, peers, side effects, secondary entry points, lazy loading (35–47) | `AGENTS.md:15–17`; `projects/AGENTS.md:5–6` | Preserved / clarified | Public imports only; CSS/SCSS side effects explicitly exempted from `false`; lazy chunk claims require production proof | None |
| i18n-egy reusable patterns (49–57) | `AGENTS.md:17` | Initially weakened by an incomplete D03 pointer; restored during finalization | Root policy now records provider, singleton, readonly signal, impure pipe, async dedupe/last-wins and SSR guard patterns | None |
| Production build, unit, tarball/FESM, theme/package checks, clean consumer production build, imports and bundle sizes (59–75) | `AGENTS.md:26,28`; release skill; `docs/engineering/TESTING-ARCHITECTURE.md:11–18` | Preserved / clarified | Exact harness build before browser gate; exact packed artifact and production consumer proof | None |
| Credentials, publish approval and immutable versions (76–78) | `AGENTS.md:30,36`; release skill gate 7 | Preserved / strengthened | Approval includes package/version/registry/access/tarball contents; publish from approved immutable tag | None |
| Verify APIs, experimental risk, owner approval/decision record, honest reporting (80–87) | `AGENTS.md:22` | Preserved | Same safeguards stated compactly | None |
| Releasable main, short branches, conventional commits, immutable tags, no generated files, exact tarball (89–100) | `AGENTS.md:34–36`; `docs/engineering/WORKTREES.md` | Preserved / strengthened | Worktree/path ownership and no automatic commit/merge/push; generated artifacts excluded | None |
| Protected env schematics (not explicit in original root) | `AGENTS.md:38`; `projects/AGENTS.md:9`; `projects/env/AGENTS.md:5–7` | New explicit safeguard | Source, config and generated `.cjs` protected; approval-gated comparison and consumer checks | None |
| Playwright real-browser and built-harness requirements (not explicit in original root) | `AGENTS.md:26`; `e2e/AGENTS.md:5–9`; `docs/engineering/TESTING-ARCHITECTURE.md:12–13,21–25` | New explicit safeguard | Build exact harness and packages first; Playwright/browser contracts; no stale `dist/` evidence | None |

## Governance tool coverage

### `check:governance`

Currently checks: required governance files and Owner/Purpose headers; local links from the engineering index; release-group JSON shape, group ids/policies/unique membership, exact approved core membership, matching exact SemVer package versions and non-private package manifests; admission decision reference for future groups; documentation of core group members in VERSIONING; scoped instruction files; task-record template fields.

Tests exercise passing input, version mismatch, malformed name/version, non-object package metadata, unsupported release policy, missing required docs, malformed JSON and missing future-group decision. It does **not** validate all packages' metadata, package exports/peer correctness, registry state, tags/hashes, semantic contents of every governance document, or skill frontmatter.

### `check-versioned-doc-links`

Validates exact SemVer and package name, manifest/README/changelog version agreement, recognized repository file URLs pinned to the exact package tag, linked source paths, and at least one canonical docs link. It accepts exact-tag raw assets. `--tarball` reads the actual packed manifest/README/changelog; `--require-tag` separately checks the tag resolves to clean HEAD. Tests cover moving `main`, wrong package tag/version, malformed release version, missing changelog heading, and a packed README pointing to `main`.

It does not inspect arbitrary external hosts or verify registry contents/hashes. Tag existence is optional. Existing published rc.2 README debt remains historical: source candidates report 12 menu, 14 select, 12 theme and 17 i18n issues, led by missing rc.2 changelog headings and moving links. Policy correctly defers repair to a future unpublished release; this is not a reason to mutate published artifacts.

### Automation status at review time

At this review snapshot, AI skill compatibility metadata lacked a parser. The later hardening implementation and finalization corrections are documented in `GOVERNANCE-HARDENING-REPORT.md` and `FINALIZATION-REPORT.md`. Tag-shaped metadata checks do not establish API compatibility.

## Version-aware model

| Concept | Current representation | Assessment |
| --- | --- | --- |
| Exact package version | Per-package manifest and dated registry/workspace matrix | **SEMANTICS VERIFIED**; workspace and npm state kept distinct |
| Major compatibility boundary | VERSIONING policy, peer ranges, API snapshots | **PARTIALLY VERIFIED**; policy exists, API snapshot coverage is only four packages |
| Minor feature availability | `introduced` version in policy/skill template | **PARTIALLY VERIFIED**; no automated feature registry or example gate |
| Git release tag | Namespaced `<pkg>/v<version>` convention; optional checker | **PARTIALLY VERIFIED**; tag is not required by default |
| Documentation snapshot | Immutable tag tree and exact-tag links; tarball README checker | **SEMANTICS VERIFIED** for local link checks; external hosts not checked |
| AI skill range | `compatibility.json` and validator | **PARTIALLY VERIFIED**; syntax and traceability checked, API compatibility is not |
| Unit/E2E evidence | Versioning matrix and test architecture records | **PARTIALLY VERIFIED**; not machine-bound to immutable package artifact hashes |
| Consumer production build | Required by policy and release workflow | **PARTIALLY VERIFIED** at this review snapshot; see later hardening evidence and final rerun in `FINALIZATION-REPORT.md` |

Concrete next improvements: add a validated per-release evidence record binding commit, tag, tarball filename/hashes, packed file list, exact unit/E2E commands, docs snapshot and consumer production build; add skill metadata schema/range tests; expand API snapshot coverage only as supported promises require. Keep one source/test tree and immutable snapshots; do not create artificial per-version copies. Stable-major support/EOL beyond current owner decisions remains **REQUIRES PRODUCT DECISION**.

## Verification and risk

- `npm run test:scripts -- --reporter=dot`: 9 files, 114 tests passed.
- `npm run check:governance`: passed, 13 required governance files and four synchronized rc.2 packages.
- `npm run check:docs`: passed with 0 failures and 41 existing prose warnings.
- `npm run check:readmes`: passed; four READMEs are 106/174/136/168 lines.
- `node --check` for both new checkers and `git diff --check`: passed.
- Package `package.json` and `ng-package.json` diff: empty. No package build, pack, browser suite or pnpm-backed command was run for this documentation/tooling review; unresolved pnpm build approvals remain a limitation.

High risk: the old README rule said `sideEffects: false` for every library; the updated CSS/SCSS exception is necessary for theme styles and is explicitly documented. New root authority/task-record rules are broad process changes but additive. Published rc.2 README links are known debt. Skill ranges and release evidence are not machine enforced.

## Suggested commit boundaries (not created)

1. Root/scoped instruction corrections: `AGENTS.md`, `projects/AGENTS.md`, `projects/env/AGENTS.md`, `e2e/AGENTS.md`.
2. Governance checks and tests: `package.json`, `release-groups.json`, `scripts/check-governance.mjs`, `scripts/check-versioned-doc-links.mjs`, matching `scripts/tests/*`.
3. Governance policy and release workflow docs: `docs/engineering/**`, `.opencode/skills/rivinia-playbook/SKILL.md`, `.opencode/skills/rivinia-release/SKILL.md`.
4. Audit/review reports: `docs/archive/repository-architecture/**` and root README edits, if owner wants the historical audit updates committed.

At this review snapshot, no commit boundary had been staged or created. Later owner authorization and completion evidence are recorded in `FINALIZATION-REPORT.md`.
