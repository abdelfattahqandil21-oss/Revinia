# Governance hardening and worktree preservation

**Owner:** Repository owner
**Purpose:** record safe worktree preservation, skill metadata validation and release-artifact checks.
**Status:** verification complete; no commit, merge, push, tag, publish or npm dist-tag change.
**Date:** 2026-11-03

## 1. Worktree preservation

- Source before transfer: historical temporary worktree, branch `chore/repository-architecture`, HEAD `75c50384d19fa98c7aadfa71d7c93bbe5d4026a2`.
- Durable destination: sibling worktree on the repository filesystem.
- Destination was absent and unregistered before creation. The active-agent inventory showed no other agent owning it.
- Destination was created with `git worktree add --detach ... HEAD`. Tracked changes were transferred with `git diff --binary HEAD` + `git apply`; untracked file contents were transferred from a null-delimited Git inventory. Ignored `dist/`, `node_modules/`, and `test-results/` were also copied as file content. No `.git` metadata was copied.
- At the transfer checkpoint, both worktrees had identical HEADs, identical tracked binary-diff SHA-256 `73613c37b271aa1e9ed743b29c5cf1cff5f17912605ffc573c45768e710ed994`, matching untracked path/content inventories (27 files), and matching ignored file trees.
- To preserve the requested branch on the durable worktree, the source checkout was detached at the same HEAD and the existing `chore/repository-architecture` branch was attached to the destination. Source files and uncommitted state remain present; the source worktree has not been removed. The destination now owns the branch. Both HEADs remain `75c50384d19fa98c7aadfa71d7c93bbe5d4026a2`.
- After transfer, package builds changed destination `dist/` and local test execution changed its ignored `node_modules/` cache. These are generated destination state; the source copy remains untouched. Do not delete the source until the owner explicitly approves.

## 2. Version-aware skill validator

Added `scripts/check-skill-compatibility.mjs`, exposed as `npm run check:skills` and included in `check:governance`. It scans existing `.opencode/skills/` and `.agents/skills/` conventions. Skills without a role are general-purpose; explicit `general` skills need no package metadata. Repository-wide maintainer skills also need no package versions unless they add a package compatibility sidecar. Consumer and package-scoped maintainer skills require adjacent `compatibility.json`.

The sidecar validator checks role consistency, package identity/manifest, strict exact SemVer, supported range syntax and bounded major compatibility, exact verified versions within the range, release-group membership, tag-shaped documentation references, existing canonical/evidence files, and capability introduction/verification versions. It does not prove that every referenced tag exists; the versioned-doc checker can verify an exact tag snapshot. Range syntax is intentionally limited to exact, caret, tilde, comparators, whitespace intersection and `||`; partial versions and wildcards fail closed.

It does not prove package API or example semantics. Example proof still requires a package build, exact published tarball installation in a clean Angular consumer, public-import compilation and a production consumer build. Browser examples require their separately named real-browser gate.

Tests cover consumer and prerelease success, general and repository-wide maintainer skills, missing/malformed consumer metadata, malformed identity/SemVer/ranges, range/boundary escape, wrong release group/tag, and missing evidence. Metadata validation does not establish semantic API compatibility.

## 3. Release artifact integrity

Registry reads on `https://registry.npmjs.org/` confirmed `latest` is `1.0.0-rc.2` for all four release-group packages. For each package, the downloaded registry tarball, built local `npm pack` tarball, registry `dist.shasum`, and package manifest version matched:

| Package | Version | Registry SHA-1 | Files |
| --- | --- | --- | ---: |
| `@rivinia/theme` | `1.0.0-rc.2` | `a91c52bff3b6ef9a676f57401e2518da6c8c6639` | 9 |
| `@rivinia/select` | `1.0.0-rc.2` | `3369111706bd75832ef73ae40da13c0bee871322` | 9 |
| `@rivinia/menu` | `1.0.0-rc.2` | `6e76ab582af21f1439b2142809bf83b156b76696` | 9 |
| `@rivinia/i18n` | `1.0.0-rc.2` | `20d0b7085a537023699ee5423750c9c5bc0f4c40` | 20 |

`check-versioned-doc-links.mjs` supports `--verify-tag-snapshot`: it compares the tarball manifest, README and CHANGELOG to the corresponding immutable tag tree, checks the tag manifest name/version, and confirms linked paths exist at that tag. Its URL matcher is case-insensitive for repository owner/name; CLI parsing rejects unknown flags and conflicting package-dir/tarball inputs. The fixture tests cover a correct snapshot, a mismatched tag manifest, packed README drift, and a valid pinned link alongside a moving link with alternate owner casing.

All four registry and built candidate README checks identify historical rc.2 debt: README links still point to `main` and each changelog lacks a `1.0.0-rc.2` heading. Other version/manifest checks passed, and the published README/CHANGELOG bytes match their release tag. This report preserves that debt as historical; it does not alter published artifacts or registry state.

## 4. Verification

- `npm run test:scripts -- --reporter=dot`: **125 tests passed** (10 files).
- `npm run check:skills`: passed.
- `npm run check:governance`: passed; four synchronized group manifests at rc.2.
- `npm run check:docs`: 0 failures, 41 existing prose warnings.
- `npm run check:readmes`: passed; theme/select/menu/i18n are 106/174/136/168 lines.
- Direct production builds `ng build menu`, `select`, `theme`, `i18n`: passed. Theme build emitted two existing conflicting export-condition warnings.
- `npm run check:pack -- dist/menu dist/select dist/theme dist/i18n`: passed; 9/9/9/20 files.
- `npm run check:theme -- dist/theme` and against the published theme tarball: passed.
- Local `npm pack` hashes exactly matched registry tarballs for all four packages.
- Clean temporary consumer installed those exact tarballs and production-built an Angular 22 app importing documented root and secondary entry points and `@rivinia/theme` CSS: passed.
- `node --check` for governance scripts and `git diff --check`: passed.
- Browser suites were **not run**; no runtime or E2E behavior changed. No pnpm command or build-script approval was used.

## 5. Unresolved decisions and limits

- The 0.x deprecation and rc.2 `latest` policy remain owner decisions; no registry mutation occurred.
- Stable 1.x maintenance after a future major, support/EOL for future majors, CI provider and named package-owner assignments remain product/maintainer decisions in the governance RFC.
- Skill metadata validation is syntactic/traceability evidence only. API snapshots currently cover the four 1.0 packages; old-version semantic compatibility still needs version-specific consumer evidence.
- `npm view` is a point-in-time read. No registry hash is enforced by the local offline governance check.

## 6. Full changed-file inventory

Modified tracked files:

- `.opencode/skills/rivinia-playbook/SKILL.md`
- `.opencode/skills/rivinia-release/SKILL.md`
- `AGENTS.md`
- `README.md`
- `package.json`

Untracked files:

- `docs/engineering/AI-SKILLS.md`
- `docs/engineering/CHANGELOG-POLICY.md`
- `docs/engineering/CHANGELOG.md`
- `docs/engineering/MIGRATION-PLAN.md`
- `docs/engineering/README.md`
- `docs/engineering/RFC-ENGINEERING-GOVERNANCE.md`
- `docs/engineering/TASK-MEMORY.md`
- `docs/engineering/TESTING-ARCHITECTURE.md`
- `docs/engineering/VERSIONED-DOCUMENTATION.md`
- `docs/engineering/VERSIONING.md`
- `docs/engineering/WORKTREES.md`
- `docs/engineering/templates/handoff.md`
- `docs/engineering/templates/task-record.md`
- `docs/repository-architecture/ARCHITECTURE-PROPOSAL.md`
- `docs/repository-architecture/CHANGE-REPORT.md`
- `docs/repository-architecture/FUTURE-WORK.md`
- `docs/repository-architecture/GOVERNANCE-HARDENING-REPORT.md`
- `docs/repository-architecture/GOVERNANCE-REVIEW.md`
- `docs/repository-architecture/REPOSITORY-AUDIT.md`
- `docs/repository-architecture/VERIFICATION-REPORT.md`
- `e2e/AGENTS.md`
- `projects/AGENTS.md`
- `projects/env/AGENTS.md`
- `release-groups.json`
- `scripts/check-governance.mjs`
- `scripts/check-skill-compatibility.mjs`
- `scripts/check-versioned-doc-links.mjs`
- `scripts/tests/check-governance.spec.ts`
- `scripts/tests/check-skill-compatibility.spec.ts`
- `scripts/tests/check-versioned-doc-links.spec.ts`

Package manifests under `projects/`, package exports, runtime sources, tags and release versions remain unchanged. No files were staged or committed.

## 7. Suggested commit boundaries (not created)

1. Skill compatibility validator, tests, `check:governance` integration, `check:skills` script and AI skills policy.
2. Release snapshot verification option, tests and release/documentation instructions.
3. Existing governance foundation files (root/scoped instructions, release group, policy docs and original audits).
4. This verification report as a separate review record.

At this report's original checkpoint, commits and merges had not been performed. See `FINALIZATION-REPORT.md` for later corrections and final verification. The historical source worktree remains preserved; no release action is included.
