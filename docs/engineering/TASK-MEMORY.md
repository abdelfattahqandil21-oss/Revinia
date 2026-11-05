# Task memory and lifecycle

**Owner:** Repository maintainers and each task owner
**Purpose:** provide a durable, auditable handoff without making private history public.
**Status:** private default with public-safe templates.

## Source-of-truth boundaries

Git is authoritative for commits, branches, tags, changed files and merge state. Task memory links to verified Git evidence; it never invents a commit or overrides instructions. Public ADRs in `docs/decisions/` hold long-lived architecture/product decisions; `docs/DECISIONS.md` is the stable pointer to their index. `docs/engineering/CHANGELOG.md` holds repository engineering outcomes. Package CHANGELOGs hold only consumer-visible package releases. Detailed agent steps, raw transcripts, credentials, personal data and operationally private notes stay outside the public repository.

## Local private memory location

Store private task records and timeline entries outside any checkout at:

```text
$HOME/.local/share/rivinia/tasks/YYYY/MM/week-NN/<task-id>.md
$HOME/.local/share/rivinia/timeline/YYYY/MM/week-NN.md
```

Create directories/files with user-only permissions (`umask 077`). Do not sync or commit them automatically. If a private store is unavailable, use the public-safe templates in `docs/engineering/templates/` only after removing private details; do not put session logs in the repository.

## Startup protocol

At task start, before edits:

1. Read root `AGENTS.md`, `docs/engineering/README.md`, applicable nested instructions, the routed skill and relevant decisions/runbook.
2. Record task ID, agent identity, goal/scope, branch, worktree, base SHA, allowed paths and owner.
3. Capture `git status --short --branch`, `git worktree list`, and active HEAD. Preserve existing work and identify another task's ownership before editing.
4. Write decisions, completed work, blockers and exact commands/results as they happen. Label planned or inferred facts; only mark executed verification as passed.
5. Before handoff, record actual changed paths and actual commit IDs (or “uncommitted”), final status, open decisions and next safe action.

## Task record fields

Use [the task-record template](templates/task-record.md). One task owns one branch/worktree. Shared-file ownership must be explicit. A task record is not a substitute for `git status` or a commit.

## Timeline

Append a short dated entry to the private month/week timeline when a task completes or hands off. Use an actual local/UTC timestamp and link the task ID. Record outcomes and blockers, not private agent reasoning. Never fill a date from the current environment when the underlying event time is uncertain; mark that timestamp unknown.

## Handoff and close

Use [the handoff template](templates/handoff.md). The task is complete only when requested work is done or an explicit product decision blocks it, all relevant checks are classified, the working tree state is reported, and no other owner's files were changed. Do not commit/merge/push/tag/publish unless the task explicitly authorizes that action.
