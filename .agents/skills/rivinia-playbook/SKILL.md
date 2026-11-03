---
name: rivinia-playbook
description: Route Rivinia repository work to the smallest applicable skill and repository procedure. Use at task start or when choosing among architecture, implementation, UI, tests, docs, review, or release workflows.
---

# Rivinia playbook — pick the skill before the work

Codex and OpenCode discover this repository skill from `.agents/skills/` and
load its body on demand. Discovery does not guarantee invocation: use the
runtime's skill selector or explicit invocation when routing is unclear. The
reference matrix and task routes live in `docs/engineering/SKILLS-*.md`.

## How "automatic" works

The root `AGENTS.md` points to this skill, and its description supports
automatic selection. If the runtime does not select it, invoke it explicitly.
State the selected route once, then continue with the task.

Only `rivinia-playbook` and `rivinia-release` are repository-owned. Other IDs
below are optional host skills: use one only if the active agent lists it, and
otherwise follow the repository procedure. A name in this table does not
install or grant access to a skill.

## Hard rules

1. **Load before acting.** A skill body beats memory. Release work loads
   `rivinia-release` before the first `pnpm build`.
2. **Repo rules win.** `AGENTS.md` and `docs/DECISIONS.md` override any skill;
   the user overrides both.
3. **Two skills per phase, maximum.** A third means the task is not
   decomposed yet.
4. **Release is explicit-only.** `rivinia-release` opts out of automatic
   selection in OpenCode and Codex; the root policy and this route table point
   to its explicit invocation.
5. **One route line, then work.** `route: diagnosing-bugs → playwright-cli`. No
   skill theatre: loading a skill is not doing the work.
6. **Not run ≠ passed.** A gate that was not executed is reported as not run,
   never as green.

## Routing table

| The request looks like | Load, in this order | Do not load |
| --- | --- | --- |
| Any non-trivial task | `rivinia-playbook` (this) | — |
| Bug, regression, "مش شغال", failing test, slow render | `diagnosing-bugs` → `playwright-cli` or an available browser tool when needed | `impeccable` before the cause is known |
| New logic with a clear contract | `tdd` → `test-verification` when available | `prototype` |
| New module, entry point, or public API shape | `codebase-design` (+ `domain-modeling` when the vocabulary is new) | `tdd` first |
| UI component, tokens, RTL, a11y, "make it feel premium" (app screens) | `impeccable` | `design-taste-frontend` |
| Landing / marketing / portfolio / demo page, "looks AI-made" | `design-taste-frontend` | `impeccable` |
| Copy a site's design language into tokens | `extract-design` | `design-taste-frontend` |
| Motion: add or tune transitions | `transitions-dev` (add) / `transitions-polish` (tune) | both at once |
| Throwaway experiment to answer a design question | `prototype` | `tdd` |
| Review a branch, PR, or WIP since X | `code-review` | `pr` |
| Write a PR body | `pr` | `code-review` |
| Release, publish, tag, version bump, "انشر" | explicitly invoke `rivinia-release` | nothing else; it owns the sequence |
| Architecture decision, breaking change, new package | `domain-modeling` + a `docs/DECISIONS.md` entry (next D-number) | `rivinia-release` |
| Repository governance, `AGENTS.md`, task memory, worktrees or compatibility policy | `writing-for-agents` for instruction files; consult `docs/engineering/` | — |
| Stress-test a plan or a risky decision | `grilling` | — |
| API/library/standard facts, "does Angular support X" | `research` (+ `opencode` if the subject is OpenCode) | memory |
| Edit `AGENTS.md`, a `SKILL.md`, or agent docs | `writing-for-agents` | — |
| OpenCode config, skills, permissions, plugins, CLI | `opencode` only if listed; otherwise official OpenCode docs and CLI help | — |
| An OpenCode bug (not a Rivinia bug) | OpenCode issue tracker/docs if available | — |
| Pre-commit hooks (Husky, lint-staged) | `setup-pre-commit` | — |
| Steps only a human can perform (provisioning, credentials) | `wizard` | — |
| One-off browser inspection, screenshot, console/network, focus | an available browser tool/skill | `playwright-cli` unless the flow must be repeated |
| A repeatable browser suite or fixture | `playwright-cli` when available | — |
| Cross-browser proof on the machine's real engines | `desktop-browsers` when available | claiming an unavailable engine |
| Replace `as` with shoehorn in test files | `migrate-to-shoehorn` | — |

## Never in this repo

| Skill | Why |
| --- | --- |
| `enr-attendance` | ENR HR attendance (Python, `~/enr-attendance`). Different project. |
| `scaffold-exercises` | Course exercise scaffolding. Nothing here is a course. |
| `git-guardrails-claude-code` | Claude Code hooks. This is OpenCode. |
| `migrate-to-shoehorn` | Only when asked; never a drive-by refactor. |
| `wizard` | Only for human-only steps; the agent does everything else itself. |

## A build is not a release

`pnpm build`, `ng test` and `npm pack` are **development gates** — run them
freely. `npm publish`, a version bump, a tag, or "ship it" is a **release**:
load `rivinia-release` and get explicit confirmation (name, version, access,
file list) before the registry is touched.

## Verification ladder

| The change touches | Prove it with | Never accept |
| --- | --- | --- |
| Pure TS logic, date math, reducers | `ng test <pkg>`, expectations derived by hand | the implementation as its own oracle |
| Component state, ARIA, DOM order | `ng test <pkg>` | — |
| CSS layout, RTL, top layer, focus, animation | `browser` against a real build | a jsdom assertion (it has no layout) |
| Packaging (`exports`, peers, FESM) | `ng build` + `npm pack` + grep the FESM + a clean consumer | a `file:` link |
| A public API | import every symbol from its documented path | "it type-checks here" |
| A release | the full `rivinia-release` sequence | a green test run alone |

## Ambiguity

- **"The panel is in the wrong place"** → `diagnosing-bugs` first, `browser`
  second. `impeccable` only after the cause is known.
- **"Make it look better"** → app screen: `impeccable`; public page:
  `design-taste-frontend`. If the answer is "both", split the task.
- **New package** → `codebase-design` for the shape, `rivinia-release` for the
  gates, `tdd` only inside the first.
- **"Review this"** → `code-review` for the verdict, `pr` for the text.

## Triggers in Arabic

| Phrase | Route |
| --- | --- |
| "مش شغال" / "بيقف" / "بطيء" | `diagnosing-bugs` |
| "اعمل فيتشر" / "أضف" | `tdd` → `test-verification` |
| "الشكل وحش" / "ظبّط الـUI" | `impeccable` |
| "صفحة/لاندنج" | `design-taste-frontend` |
| "انشر" / "إصدار" / "نسخة جديدة" | `rivinia-release` |
| "راجع" / "review" | `code-review` |
| "ابحث" / "إيه رأي Angular في" | `research` |
| "جرّب فكرة" / "بروتوتايب" | `prototype` |
| "اختبرني" / "فتّت الخطة" | `grilling` |

## Reporting

State, in one line, the route taken and the skills loaded. Then report what
passed (with the command), what failed, and what was not run. That is the
`test-verification` contract applied to the whole task.

## References

- `references/known-traps.md` — symptom → `DECISIONS.md` entry, for the defects
  this repo has already paid for.
- `docs/engineering/SKILLS-ROUTING.md` — task-to-skill map and safe fallback.
