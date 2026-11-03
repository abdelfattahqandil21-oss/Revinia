# Worktree and parallel-agent workflow

**Owner:** Repository maintainers and task owners
**Purpose:** isolate concurrent work and prevent cross-task file loss.
**Status:** required for multi-step work; no automatic integration.

## Ownership model

One task owner controls one branch and one worktree. Before editing, declare owned paths; shared files (root instructions, package scripts/config, release docs) require one named task owner and coordination. Agents do not edit another task's worktree. A review agent reads a fixed commit/range and does not repair the branch it reviews. Handoffs use `docs/engineering/templates/handoff.md`.

## Create and inspect

Use a durable sibling of the primary checkout on the same filesystem where possible:

```sh
git worktree list --porcelain
git status --short --branch
BASE=$(git -C /path/to/primary rev-parse HEAD)
git -C /path/to/primary worktree add -b codex/<task-slug> /path/to/Revinia-<task-slug> "$BASE"
```

Confirm the branch, exact base SHA, destination and clean status before edits. For an existing branch, use `git worktree add <path> <branch>` only after confirming it is not checked out elsewhere. Do not make the primary checkout the task worktree unless explicitly requested.

Inspect with `git worktree list --porcelain`, `git -C <path> status --short --branch`, and `git -C <path> rev-parse HEAD`. Revalidate ownership/status after rebase or integration; repeat affected verification after changing base.

## Move, cleanup and storage

`git worktree move <old> <new>` is preferred only when it can move safely (same filesystem and an unused destination). If it fails, stop and preserve the source; do not improvise a recursive copy/delete while uncommitted work exists. Report the blocker and keep working there or arrange a deliberate, verified copy procedure with the owner.

Before cleanup, inspect status, untracked and ignored task outputs, active processes, worktree path and branch. Never use `git worktree remove --force`, `git clean`, or delete another task's directory to make progress. Remove only the task owner's clean worktree after the owner requests cleanup or the task close procedure explicitly authorizes it.

## Dependencies and build outputs

A worktree is not an isolated dependency environment if it symlinks `node_modules`, caches or `dist`. Prefer a reproducible `pnpm install --frozen-lockfile` in a per-worktree install. Do not silently symlink another checkout's `node_modules`; package-manager workspace metadata and native build outputs can bind to the source checkout. If installation is unavailable, report the exact limitation and do not treat tests that invoke pnpm as reliable. Build prerequisites in the active worktree; ignored `dist/` is disposable and can be stale.

## Integration and release boundaries

No automatic merge or push. Rebase/integrate only when requested; record old/new base SHAs and re-run affected gates. Never create/move release tags or publish without explicit owner approval naming the packages, versions, registry/access and exact artifacts. A task handoff states review status and leaves merge/cleanup to its owner.
