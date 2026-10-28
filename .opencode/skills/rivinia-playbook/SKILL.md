---
name: rivinia-playbook
description: Route any task in the Rivinia repo to the right skill before acting — bug, feature, UI/CSS, packaging, release, review, research, docs, OpenCode config. Holds the per-skill catalogue, the skills that must NOT be used here, the verification ladder, and the known-trap index (symptom → D-entry). Load this first when a task starts, or when unsure which skill applies.
---

# Rivinia playbook — pick the skill before the work

OpenCode advertises a skill by ID, name and description only; the body is read
when the skill is loaded. This skill is the index that turns a request into a
route.

## How "automatic" works

There is no per-turn hook in OpenCode V2 (verified 2026-10-28 against
<https://opencode.ai/v2/docs/skills/>). Three things make this fire by itself:

1. `AGENTS.md` names this skill in its first section, so the pointer is in
   every prompt.
2. The description above matches ordinary task language.
3. This file states the route for each kind of work, so the first action is
   already the right one.

If a task starts without a route line, stop and choose one.

## Hard rules

1. **Load before acting.** A skill body beats memory. Release work loads
   `rivinia-release` before the first `pnpm build`.
2. **Repo rules win.** `AGENTS.md` and `docs/DECISIONS.md` override any skill;
   the user overrides both.
3. **Two skills per phase, maximum.** A third means the task is not
   decomposed yet.
4. **Hidden skills are loaded by exact ID.** `rivinia-release` sets
   `opencode/autoinvoke: false`, so it appears in no advertised list — this
   table is its only pointer.
5. **One route line, then work.** `route: diagnosing-bugs → browser`. No
   skill theatre: loading a skill is not doing the work.
6. **Not run ≠ passed.** A gate that was not executed is reported as not run,
   never as green.

## Routing table

| The request looks like | Load, in this order | Do not load |
| --- | --- | --- |
| Any non-trivial task | `rivinia-playbook` (this) | — |
| Bug, regression, "مش شغال", failing test, slow render | `diagnosing-bugs` → `browser` when the symptom is visual | `impeccable` before the cause is known |
| New logic with a clear contract | `tdd` → `test-verification` | `prototype` |
| New module, entry point, or public API shape | `codebase-design` (+ `domain-modeling` when the vocabulary is new) | `tdd` first |
| UI component, tokens, RTL, a11y, "make it feel premium" (app screens) | `impeccable` | `design-taste-frontend` |
| Landing / marketing / portfolio / demo page, "looks AI-made" | `design-taste-frontend` | `impeccable` |
| Copy a site's design language into tokens | `extract-design` | `design-taste-frontend` |
| Motion: add or tune transitions | `transitions-dev` (add) / `transitions-polish` (tune) | both at once |
| Throwaway experiment to answer a design question | `prototype` | `tdd` |
| Review a branch, PR, or WIP since X | `code-review` | `pr` |
| Write a PR body | `pr` | `code-review` |
| Release, publish, tag, version bump, "انشر" | `rivinia-release` (hidden, exact ID) | nothing else; it owns the sequence |
| Architecture decision, breaking change, new package | `domain-modeling` + a `docs/DECISIONS.md` entry (next D-number) | `rivinia-release` |
| Stress-test a plan or a risky decision | `grilling` | — |
| API/library/standard facts, "does Angular support X" | `research` (+ `opencode` if the subject is OpenCode) | memory |
| Edit `AGENTS.md`, a `SKILL.md`, or agent docs | `writing-for-agents` | — |
| OpenCode config, skills, permissions, plugins, CLI | `opencode` | `report` |
| An OpenCode bug (not a Rivinia bug) | `report` | — |
| Pre-commit hooks (Husky, lint-staged) | `setup-pre-commit` | — |
| Steps only a human can perform (provisioning, credentials) | `wizard` | — |
| Browser inspection, screenshot, console/network, focus | `browser` (required before the first browser tool call) | `playwright-cli` |
| A repeatable browser suite or fixture | `playwright-cli` | `browser` |
| Cross-browser proof on the machine's real engines | `desktop-browsers` (+ `playwright-cli`) | claiming WebKit or system Firefox |
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

- `references/skill-catalog.md` — every available skill: what it does, when it
  fires, when it must not, advertised or hidden.
- `references/known-traps.md` — symptom → `DECISIONS.md` entry, for the defects
  this repo has already paid for.
