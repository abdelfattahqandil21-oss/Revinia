# RFC: Engineering governance and repository organization

**Owner:** Rivinia maintainers
**Purpose:** specify version-aware ownership and safe agent workflows without moving package or test trees.
**Status:** approved direction; implementation is additive and limited to governance foundation.
**Base audited:** `75c50384d19fa98c7aadfa71d7c93bbe5d4026a` (`main`, 2026-11-03).
**Task branch:** `chore/repository-architecture`.

## Decision summary

### Owner-approved constraints

- The synchronized release group contains exactly `@rivinia/menu`, `@rivinia/select`, `@rivinia/theme`, and `@rivinia/i18n`. Every member uses the same release version.
- All other publishable packages remain independently versioned unless explicitly admitted through the policy in [VERSIONING.md](VERSIONING.md).
- Major versions are compatibility boundaries. Compatibility information spans source/API, tests, consumer docs, skills, changelogs and release evidence.
- Keep `projects/` and the current E2E layout. Do not copy all source or test suites per major.
- Keep public API, package manifests/versions, release tags, registry state and runtime code unchanged in this governance task.
- Preserve historical ADRs. New durable architectural/product decisions go in `docs/DECISIONS.md`; do not rewrite old entries.
- Never let task memory override current owner instructions, repository policy or directory instructions.

### Proposed operating rules

- Use `docs/engineering/` as the navigation point for governance. Keep the existing package docs, `docs/DECISIONS.md`, and release runbooks authoritative for their own subjects; link them rather than copy their history.
- Treat exact tagged source as the immutable documentation and source snapshot for a release. A future hosted documentation platform is an open decision, not an assumed service.
- Keep actual task journals private by default. Commit only sanitized, public-safe engineering outcomes.
- Add directory instructions only where ownership/operations differ from the root rules.

## Current ownership matrix

| Path | Responsibility | Owner boundary | Verification/record |
| --- | --- | --- | --- |
| `projects/<library>/src`, `ui/`, `package.json`, `ng-package.json` | Publishable source, exports, package metadata | Maintainers of that library; changes stay inside public package boundaries | Package unit/build/pack/consumer gates; package README and CHANGELOG |
| `projects/<library>/tests` or colocated specs | Unit/component contract for that library | Same library owner | `ng test <package>` or its configured test runner |
| `projects/menu-e2e`, `projects/i18n-e2e` | Angular browser harness applications; not packages | Harness owner, coordinated with affected package owners | Production harness build before dependent Playwright suite |
| `e2e/menu`, `e2e/select`, `e2e/popup` | Cross-component browser behavior and popup conformance | E2E suite owner; package owners review contract changes | Root Playwright config and current built harness |
| `projects/i18n-e2e/e2e` | i18n consumer/browser workflows | i18n + harness owners | i18n production build, CSR harness build, configured Playwright suite |
| `docs/<topic>`, `projects/<library>/README.md` | Consumer documentation and examples | Relevant package owner; shared docs have maintainer review | `check:docs`, exact-version link check at release, example build where applicable |
| `projects/<library>/CHANGELOG.md` | User-visible package release history | Package/release owner | Entry matches actual released version and release evidence |
| `.agents/skills/` | Agent procedures shared by Codex and OpenCode | Maintainers | Skill role/version metadata checks; examples against declared versions |
| `scripts/`, root config and `package.json` | Shared developer/release tooling | Repository maintainers | Script-specific tests and relevant package gates |
| `docs/DECISIONS.md` | Long-lived architecture/product decisions | Maintainers + owner approval for foundational policy | D-numbered ADR; preserve prior records |
| `docs/engineering/` | Governance procedures and public-safe templates | Repository maintainers | `pnpm check:governance` |
| `$HOME/.local/share/rivinia/tasks/` | Private task records and timeline | Local user/agent; outside repository | Private permissions; Git remains evidence for commit/ref facts |

Package-level maintainers have not been assigned to named people; ownership above is by responsibility, not an invented org chart.

## Current dependency and test topology

```text
publishable libraries (projects/<library>)
  └─ primary/secondary entry points → package exports

@rivinia/i18n/select ── public optional import ──> @rivinia/select/ui

menu/select popup behavior
  ├─ browser app: projects/menu-e2e
  └─ suites: e2e/menu, e2e/select, e2e/popup

i18n browser behavior
  ├─ browser app: projects/i18n-e2e
  └─ suites: projects/i18n-e2e/e2e

consumer-facing docs: projects/<library>/README.md + docs/<topic>/
shared checks: scripts/ + root package scripts
```

The repository has ten publishable Angular libraries, two E2E Angular applications, and no cross-library integration app beyond the optional i18n/select composition. Root `e2e/` is already the shared menu/select/popup suite; i18n keeps its own harness and suite beside its app. Keep this hybrid: it follows executable ownership today, avoids duplicated browser infrastructure, and does not warrant a disruptive move. Extract one shared runner only if multiple suites demonstrably need the same runner lifecycle and a before/after proof preserves Angular/Playwright configuration.

## Instruction precedence and discovery

Within applicable system/developer/user instructions, resolve repository guidance in this order:

1. Explicit current task and owner-approved decisions.
2. Root `AGENTS.md` safety/release policy.
3. The nearest applicable directory `AGENTS.md`.
4. The invoked maintainer skill.
5. Task records, audits and other historical context.

A higher-level source wins; task memory never changes a policy. If two authoritative sources conflict, stop the affected action, cite both sources and record the conflict for maintainer resolution. Do not delete contradictory historical ADRs; add a current decision and mark superseded entries with a link only when maintainers approve that edit.

Codex discovers root-to-working-directory `AGENTS.md` instructions and merges deeper guidance later. OpenCode uses `AGENTS.md` too; nested files are discovered as it reads/explores those directories, and it combines instructions rather than resolving conflicts. Therefore nested instructions must narrow or point to root rules, never restate a competing policy. Sources checked 2026-11-03: [Codex AGENTS.md guidance](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide) and [OpenCode instructions](https://dev.opencode.ai/v2/docs/instructions/).

## Alternatives considered

- **One E2E tree per package and major:** rejected; it duplicates harnesses/suites and ignores the current shared popup coverage.
- **Move all browser specs under `projects/`:** rejected; root `e2e/` currently owns menu/select cross-component behavior, while i18n tests correctly live beside the i18n app.
- **Copy docs and skills into each package/major:** rejected; use exact tagged release snapshots and compatibility metadata to avoid source duplication.
- **Treat every package as one release group:** rejected; only four packages have approved synchronized release semantics.
- **Assume a hosted docs site:** rejected; platform and URL contract remain open.

## Migration dependency graph

```text
root instructions + ownership map
  ├─ task memory + worktree protocol
  ├─ release/version policy ──> package README/changelog/doc-link release gates
  ├─ skill compatibility metadata ──> version-aware consumer/maintainer instructions
  ├─ test architecture ──> deterministic popup build prerequisite
  └─ versioned docs policy ──> tag snapshot + link/example validation

Disruptive E2E/doc/package moves depend on: design review → baseline capture →
side-by-side compatibility proof → explicit approval → migration → rollback-ready verification.
```

## Open questions

- What support/end-of-life and security-fix policy applies to older 1.x and future major versions? The existing 0.x line was intentionally deprecated; that does not define future-major maintenance.
- Should npm `next` always move in lockstep for all release-group members? Current registry snapshot has menu/select at rc.1 and theme/i18n at rc.2 while `latest` is rc.2 for all. No registry state is changed here.
- What hosted documentation platform, if any, should serve immutable release snapshots?
- Who approves public API baselines for the six independently versioned packages?
- Which CI provider/environment is authoritative? No tracked workflow was found in the audit.
- Which package owners are assigned to named maintainers?

## Rollback

Governance files and the validator are additive. Revert the task's governance commit(s) to restore the prior instruction/docs state; no migration of runtime files is involved. Do not roll back or rewrite historical package tags/artifacts. A later structural migration must have its own rollback instructions before it starts.
