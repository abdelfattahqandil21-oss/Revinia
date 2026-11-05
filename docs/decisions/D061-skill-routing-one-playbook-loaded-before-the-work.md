## 2026-10-28 — D61: skill routing — one playbook, loaded before the work

- Context: 28 skills are registered — 24 built-in, 2 global local
  (`enr-attendance`, `test-verification`) and 2 repo-local (`rivinia-release`,
  hidden, and this new playbook) — and choosing between them was implicit: a
  release could start without `rivinia-release`, a CSS defect could be "fixed"
  from jsdom, a decision could land without a D-entry, and the hidden skill was
  reachable only by someone who already knew its ID.
- Decision: `.opencode/skills/rivinia-playbook/` is the single routing index —
  a decision table (task → skill order → skills to avoid), six hard rules, a
  verification ladder per change type, an Arabic trigger table, and two
  references: `skill-catalog.md` (every skill: what it does, when it fires,
  when it must not, advertised or hidden) and `known-traps.md` (symptom →
  D-entry, so a recorded defect is not re-investigated from scratch).
  `AGENTS.md` gains a "Skill routing" section, so the pointer is in every
  prompt.
- Mechanism (verified 2026-10-28 against
  <https://opencode.ai/v2/docs/skills/>): OpenCode advertises only ID, name and
  description at each step; the body loads on an explicit `skill` call; and
  `opencode/autoinvoke: false` hides a skill from the advertised list while
  keeping it loadable by ID. So "automatic" = an always-present pointer in
  `AGENTS.md` + a description written in task language + the table. There is
  no per-turn hook, and the playbook says so instead of pretending otherwise.
- Rejected: one wrapper skill per built-in skill (duplicates the catalogue and
  doubles the advertised list); editing built-in descriptions (not ours); a
  plugin that force-loads a skill every turn (a plugin for a documentation
  problem); making `rivinia-release` advertised again (a release must be
  asked for, never volunteered — D43).
- Impact: every non-trivial task states one route line; `rivinia-release` stays
  hidden and is reachable only through the playbook; `enr-attendance`,
  `scaffold-exercises` and `git-guardrails-claude-code` are marked out of scope
  for this repo; the verification ladder makes "jsdom proved the layout" a
  process error, not a judgement call.
