# Rivinia skills inventory

**Reviewed:** 2026-11-03. This is a discovery snapshot for this host, not a
portable promise that every contributor has the same personal or plugin skills.

## Integration decision

Keep two repository-owned skills in `.agents/skills/`: `rivinia-playbook` for
task routing and `rivinia-release` for release procedure. This is the shared
project path documented by Codex and OpenCode, so the skill bodies and their
references have one canonical copy. No external skill was installed or copied.

The playbook description permits automatic selection, but a Codex no-explicit-
skill probe did not load it; root `AGENTS.md` therefore requires explicit
invocation. OpenCode explicit invocation succeeded. The release skill is
explicitly invocable but excluded from automatic selection in both runtimes.
Release approval still comes from the owner, not skill selection.

## Relevant installed skills

The host has user-level general skills in `~/.agents/skills/`, OpenCode-level
skills in `~/.config/opencode/skills/`, Codex system skills under
`~/.codex/skills/`, and plugin-managed skills in Codex plugin caches. OpenCode
and Codex do not promise access to every one of these sources in every setup.
Use only an ID shown by the current agent; no repository workflow depends on a
personal skill being installed.

The scan found 46 user-level skill manifests, five OpenCode-global manifests,
five Codex system manifests, and 49 plugin-cache manifests (one bundled and 48
curated). Counts are a host snapshot; some paths overlap or are linked.

Relevant user-level candidates reviewed:

- `codebase-design`, `domain-modeling`: architecture vocabulary and ADR/glossary
  workflows; useful for design tasks, not routine implementation.
- `tdd`, `test-verification`, `diagnosing-bugs`: test-first work, evidence
  reporting, and diagnosis; use only when the current request and repo gates fit.
- `code-review`: two-axis branch review; requires a fixed point/spec and parallel
  subagents, so invoke only when that process is authorized and appropriate.
- `writing-for-agents`: agent instructions and skills; has additional
  `SKILL-MECHANICS.md` guidance that should be read before authoring skills.
- `impeccable`: frontend UI design and a local launcher/reference bundle; use
  only for a scoped UI task and follow its setup and project-context steps.
- `playwright-cli`, `desktop-browsers`: browser automation and real-engine
  verification. Their command/browser prerequisites are host-specific; follow
  Rivinia's built browser gates and never claim an unavailable engine.
- `find-skills`: Vercel ecosystem search using `npx skills find`; its own
  instructions require quality/source review. Search does not authorize install.

The global `research` skill asks for a background agent, while many task
instructions prohibit delegation. Treat it as unavailable unless the user or
applicable task instructions authorize that workflow. `implement` and
`implement-spec` include commit/subagent behavior that conflicts with Rivinia's
human-controlled integration policy; do not invoke them as generic routers.

Codex system skills `openai-docs`, `skill-creator`, and `skill-installer` are
available in the current host. Official docs were used to verify runtime paths;
the creator was unnecessary because existing skills were relocated, and the
installer is outside scope because no skill install was authorized. Plugin
skills such as Figma, Notion, Sites, and visualization are connector or product
workflows and are not needed for package maintenance.

## External discovery result

`npx skills find angular` identified `angular/skills`'s `angular-developer`
skill as the strongest Angular-specific candidate. Its source instructs agents
to inspect the project's Angular version and links to detailed references, but
it is external, version-sensitive guidance and is not pinned or installed here.
The result also identified `analogjs/angular-skills@angular-component`; its
published skill file explicitly says it is deprecated and points to the Angular
team's skill. It is rejected.

Accessibility and Playwright searches returned broad third-party skills. The
existing host skills and Rivinia's own browser policy already cover these jobs;
adding another copy would increase review and maintenance cost without a
demonstrated gap. Search results alone are not an endorsement.

## Excluded sources

- Plugin-managed skills are available only when their owning plugin is present;
  cache paths and plugin versions are not stable repository references. No
  plugin-only skill is required for ordinary Rivinia library work.
- `git-guardrails-claude-code` targets Claude Code hooks and is not an OpenCode
  or Codex integration. Use repository git policy and the active runtime's
  controls instead.
- Unrelated skills (attendance reporting, course scaffolding, Figma, pets,
  connector workflows) are not Rivinia routes.

See the [reference matrix](SKILLS-REFERENCE-MATRIX.md) for source, compatibility
and verification details, and the [routing guide](SKILLS-ROUTING.md) for task
selection.
