# Engineering governance

**Owner:** Rivinia maintainers
**Purpose:** entry point for repository ownership, compatibility, agent work, and release policy.
**Status:** active; policy changes that affect compatibility or releases require a reviewed decision record.

This is the navigation index. `AGENTS.md` is the concise, always-loaded instruction source; these documents contain detailed procedures.

| Need | Canonical document |
| --- | --- |
| Overall architecture, ownership, migration sequence and rollback | [Architecture RFC](RFC-ENGINEERING-GOVERNANCE.md) |
| Per-library code, test, harness and documentation ownership | [Library ownership map](LIBRARY-OWNERSHIP.md) |
| Package versions, release group, support claims and admission | [Version and release policy](VERSIONING.md) |
| Package documentation snapshots and links | [Versioned documentation](VERSIONED-DOCUMENTATION.md) |
| Maintainer/consumer skill metadata and compatibility | [AI skill compatibility](AI-SKILLS.md) |
| Skill discovery, source inventory and task routing | [Skills inventory](SKILLS-INVENTORY.md), [reference matrix](SKILLS-REFERENCE-MATRIX.md), [routing guide](SKILLS-ROUTING.md) |
| Unit, browser, integration and consumer verification | [Testing architecture](TESTING-ARCHITECTURE.md) |
| Private task memory, templates and session start/handoff | [Task memory and lifecycle](TASK-MEMORY.md) |
| Worktree safety and parallel work | [Worktree workflow](WORKTREES.md) |
| Package, engineering and task journal boundaries | [Changelog policy](CHANGELOG-POLICY.md) |
| Ordered migration, gates and verification status | [Migration and verification](MIGRATION-PLAN.md) |
| Public-safe task record template | [Task record](templates/task-record.md) |
| Public-safe handoff template | [Handoff](templates/handoff.md) |
| Engineering-only change timeline | [Engineering changelog](CHANGELOG.md) |
| Machine-readable synchronized release membership | [`release-groups.json`](../../release-groups.json) |

## Current state snapshot

As checked on 2026-11-03, the unified release group is `menu`, `select`, `theme`, and `i18n`; their workspace manifests and npm `latest` versions are all `1.0.0-rc.2`. npm `next` is `rc.1` for menu/select and `rc.2` for theme/i18n. This is an observed snapshot, not an instruction to change registry tags. Refresh it when release evidence is next updated.
