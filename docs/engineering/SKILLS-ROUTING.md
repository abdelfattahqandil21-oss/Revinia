# Rivinia skill routing

Start with repository `AGENTS.md`, then explicitly invoke `rivinia-playbook`
(`$rivinia-playbook` in Codex; OpenCode's native `skill` tool with that ID) for
non-trivial work. Invoke only the additional skill that matches the current task. Global
skills below are optional: use them only if their ID appears in the active
agent's skills list. Missing skills fall back to the repository procedures and
gates; do not install or copy them automatically.

| Task | Route | Safety / fallback |
| --- | --- | --- |
| Architecture, public API, package seams | `rivinia-playbook` → `codebase-design` if available | Read package boundaries and decisions; test public imports; `domain-modeling` only when terminology or an ADR is changing |
| Specifications and planning | `rivinia-playbook`; use `grilling` only when asked to challenge a plan | `to-spec`, `to-tickets`, and `wayfinder` can write to an issue tracker; use only when explicitly requested and the target tracker is known |
| Angular / TypeScript implementation | `rivinia-playbook`; use `tdd` when test-first work is requested or fits the task | Check installed Angular/TypeScript versions and repository rules first. External `angular-developer` is not installed; its discovery is not approval to install |
| Accessibility, RTL, component UI | `rivinia-playbook` → `impeccable` if available and the task changes UI | Keep scope narrow; run the required build and real-browser checks when requested/required. Otherwise follow local component and accessibility conventions |
| Unit and integration tests | `rivinia-playbook` → `tdd` for test-first changes; `test-verification` for evidence | Tests are not added or run unless requested or required by applicable repository gates. Do not weaken assertions |
| Playwright / browser behavior | `playwright-cli` for repeatable automation; `desktop-browsers` for host engine verification | Build the correct harness first; use available engines only; report missing browsers as unverified |
| Failing behavior or regression | `diagnosing-bugs` | Reproduce and isolate before changing code; follow repo instructions if the skill asks for unavailable tools/delegation |
| Review a branch or WIP | `code-review` only with a fixed point and spec | The skill requires two parallel subagents; use only when delegation is authorized and available. Otherwise do a direct review and label it accordingly |
| Documentation, examples, agent rules | `writing-for-agents` for agent instructions; `research` for sourced API facts only when delegation is allowed | `research` requires a background agent; if delegation is not allowed, use primary docs directly and cite them |
| OpenCode configuration or behavior | Official OpenCode docs and `opencode --help`; use an `opencode` skill only if the active runtime lists it | This host snapshot had no `opencode` skill installed; verify current CLI/docs rather than assuming availability |
| Release, tag, version bump, npm | Explicitly invoke `rivinia-release` | Never publish without explicit owner approval; follow the immutable artifact and registry verification gates in root `AGENTS.md` |
| Git safety and worktrees | Root `AGENTS.md` plus `docs/engineering/WORKTREES.md` | Do not use `git-guardrails-claude-code` here; it configures Claude Code hooks, not Codex/OpenCode |
| Long task handoff / delegation | `handoff` for a requested fresh-session handoff; `chief-of-staff` only for an explicitly delegated long-running goal | Respect single-owner worktrees and the current no-delegation/no-write constraints |

## Version-aware skill use

- A consumer task starts with the exact installed `@rivinia/*` version from its
  lockfile or package manager. Never infer it from `latest`, a README range, or
  workspace state.
- Apply only APIs and capabilities introduced by that version. Link docs to the
  immutable package release, not `main`.
- A maintainer skill distinguishes support policy from versions with executed
  evidence. Check the current release group and record test, browser, and
  consumer-build evidence separately.
- A general-purpose skill stays package-version agnostic. A consumer skill must
  declare a supported range and verified exact versions as described by
  [`AI-SKILLS.md`](AI-SKILLS.md); this declaration does not prove semantic API
  compatibility.

For exact source ownership, runtime paths and verification status, see the
[reference matrix](SKILLS-REFERENCE-MATRIX.md). For evaluated sources and
rejected candidates, see the [inventory](SKILLS-INVENTORY.md).
