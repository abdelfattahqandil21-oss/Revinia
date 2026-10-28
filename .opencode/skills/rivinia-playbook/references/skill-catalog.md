# Skill catalogue — every skill this agent can load

Compiled 2026-10-28 from the advertised list plus the local files. Re-check it
when a skill is added or removed: `ls ~/.config/opencode/skills .opencode/skills`.

**Advertised** = appears in the model's available list (ID + name + description).
A skill with `opencode/autoinvoke: false` is **hidden**: it still loads, but only
by exact ID, and only a document like this one can point to it.

## Local to this repo

- **`rivinia-playbook`** — advertised. This index: route table, hard rules,
  verification ladder, and the two references. Load first when a task starts.

- **`rivinia-release`** — HIDDEN (`opencode/autoinvoke: false`).
  The 9-step release sequence: build → tests → inspect tarball (exports, types,
  peers, sideEffects, files, FESM imports) → clean consumer → public imports →
  bundle sizes → explicit confirmation → publish from a namespaced tag →
  verify the registry. Loads for: publish, release, tag, version bump, "ship".
  Never for a plain `pnpm build`.

## Global, installed on this machine

- **`desktop-browsers`** — the working adapter for real browsers: system
  Chrome 156 through Playwright, Playwright Firefox 157, bundled Chromium.
  WebKit cannot launch and system Firefox does not work with Playwright.
  Load when the proof needs a real engine, a headed measurement, or
  cross-browser evidence.

- **`computer-use`** — the upstream Hermes skill (MIT, v2.1.0), installed
  verbatim at the user's request. It drives a `computer_use` / `browser_exec`
  tool that this harness does **not** expose, so its action vocabulary is
  **inert here**. Use `desktop-browsers` instead; never claim desktop control.

## Built-in — engineering

- **`diagnosing-bugs`** — a diagnosis loop for hard bugs and performance
  regressions: reproduce, isolate, prove the cause, fix, re-prove.
  Load when: broken/throwing/failing/slow, or a report with no obvious cause.
  Not when: the stack trace names the typo.

- **`tdd`** — red-green-refactor, test-first, integration tests.
  Load when: new logic with a contract you can state before the code.
  Not when: the shape is still unknown (use `prototype`) or the change is CSS.

- **`test-verification`** — honest evidence: expectations derived by hand, an
  offline suite, a deterministic CLI mode, and a report of what was not
  verified. Its examples are Python; the rules are language-neutral.
  Load when: finishing anything, before a commit or a release claim.
  It does not replace the repo gates — it governs how they are reported.

- **`code-review`** — two parallel sub-agent reviews of the changes since a
  fixed point: **Standards** (this repo's documented rules) and **Spec** (what
  the originating issue asked). Returns them side by side.
  Load when: "review since X", a branch/PR/WIP review, before a merge.
  Not when: reviewing one file you just wrote (read it instead).

- **`codebase-design`** — the deep-module vocabulary: interface, seam,
  implementation, testability, AI-navigability.
  Load when: designing a module or entry point, deciding where a seam goes,
  "this is hard to test", "this API feels shallow".
  Pairs with `domain-modeling` when the names are new.

- **`domain-modeling`** — build and sharpen the domain model; write or edit
  `GLOSSARY.md` and ADRs; settle terminology.
  Load when: two names for one concept, a new bounded concept, or a D-entry
  that defines vocabulary. Rivinia's ADR is `docs/DECISIONS.md`.

- **`research`** — investigate against high-trust primary sources and capture
  the findings as Markdown in the repo.
  Load when: "does Angular support X", a library comparison, an API fact that
  will become a dependency or a DECISIONS entry.
  Required by `AGENTS.md` ("never invent APIs"): memory is not a source.

- **`grilling`** — adversarial, relentless questioning of a plan or decision.
  Load when: the user asks to be grilled, or a risky/irreversible plan needs a
  stress test. Not for routine implementation.

- **`prototype`** — a throwaway build that answers one design question (state
  model, interaction, look) and is then deleted or demoted.
  Load when: "is this model right", "what should this feel like", before an API
  is frozen. Not for code that ships.

- **`pr`** — write a PR body (what/why/evidence).
  Load when: opening or describing a PR. `code-review` judges, `pr` narrates.

## Built-in — frontend and design

- **`impeccable`** — design, redesign, critique, audit, polish of product UI:
  hierarchy, layout, type, colour, motion, UX copy, a11y, responsive, edge
  cases, empty states, DESIGN.md and tokens.
  Load when: any `*/ui` component, theming, RTL, a11y audit, "make it feel
  premium" on an app screen.
  Not for a marketing page (`design-taste-frontend`).

- **`design-taste-frontend`** — art direction for public-facing pages:
  researched directions, a strict no-slop house style, a real-browser
  inspector, and a screenshot look-and-fix loop.
  Load when: landing/marketing/portfolio/product page, "looks generic",
  "looks AI-made", an award-level redesign.
  Not for library internals or app screens.

- **`extract-design`** — pull a site's design language into 8 artefacts (AI
  markdown, HTML preview, Tailwind config, React theme, shadcn theme, Figma
  variables, W3C tokens, CSS variables) plus a WCAG score.
  Load when: "make it look like this URL", "what tokens does this site use".
  Not for inventing a direction — that is `design-taste-frontend`.

- **`transitions-dev`** — a catalogue of production CSS transitions (badges,
  dropdowns, modals, toasts, tabs, tooltips, counters, skeletons, shakes,
  morphs, staggers).
  Load when: adding motion to a component.

- **`transitions-polish`** — tune existing motion against a token scale
  (duration, distance, scale, blur, easing) and the rules for when each
  applies (open/close asymmetry, hover in/out, stagger offsets, intent
  delays).
  Load when: "too slow/fast", "the animation feels off", "audit the motion".
  Use one of the two, not both in the same pass.

## Built-in — browser

- **`browser`** — the in-app browser: tabs, read a page, click, fill, screenshot,
  console and network logs, performance and memory traces.
  Load **before the first browser tool call** — the tools are unavailable until
  the skill is loaded. Use it for one-off inspection and proof.

- **`playwright-cli`** — automate a browser, drive repeatable flows, write and
  run Playwright tests and fixtures.
  Load when: the proof must be a committed suite, or a multi-step flow has to
  run the same way twice.
  One-off look → `browser`; repeatable → `playwright-cli`.

## Built-in — OpenCode itself

- **`opencode`** — OpenCode V2: config, agents, commands, skills, tools,
  permissions, MCP servers, providers, plugins, SDK, client, CLI, TUI.
  Load when: editing `.opencode/*` or `opencode.json(c)`, or answering "does
  OpenCode support X". It insists on the V2 docs as the source of truth.

- **`report`** — file an OpenCode issue with standard diagnostics and `gh`.
  Load when: the defect is in OpenCode. A Rivinia defect is not an OpenCode
  issue.

- **`writing-for-agents`** — how to write documents for agents: `SKILL.md`,
  `AGENTS.md`, `CLAUDE.md`, progressive disclosure, unambiguous instructions.
  Load when: editing this playbook, any skill, or the repo's agent rules.

## Built-in — repo hygiene

- **`setup-pre-commit`** — Husky + lint-staged (Prettier) + type check + tests.
  Load when: asked to add pre-commit hooks. Rivinia does not have them yet.

- **`wizard`** — generate an interactive bash wizard for steps only a human can
  perform (provisioning, credentials, a third-party dashboard, a cutover).
  Load when: the remaining work is human-only. The agent does everything else
  itself.

- **`migrate-to-shoehorn`** — replace `as` assertions in test files with
  `@total-typescript/shoehorn`.
  Load only when asked. It is a test-only refactor with a new dependency.

## Built-in — not for this repo

- **`enr-attendance`** — ENR (Egyptian Energy Authority) attendance analysis:
  grace cutoff 08:15, late after 09:00, required checkout, early-checkout
  deficit, "عدم توقيع", the Arabic monthly report. The authoritative code is
  `~/enr-attendance` (`attendance_rules.py`, `api_client.py`, `reporting.py`,
  `attendance.py`, `tests/`). Different project, different language, no
  overlap with Rivinia.

- **`scaffold-exercises`** — exercise directory structures for a course.
  Nothing in this repo is a course.

- **`git-guardrails-claude-code`** — Claude Code hooks that block dangerous git
  commands. This harness is OpenCode; the hooks do not exist here. The repo's
  git rules live in `AGENTS.md` and `DECISIONS.md` (D17).

## Selection cheatsheet

| Question | Answer |
| --- | --- |
| Is the cause unknown? | `diagnosing-bugs` |
| Is the contract clear but the code missing? | `tdd` |
| Is the design question open? | `prototype` |
| Is the surface a public page? | `design-taste-frontend` |
| Is the surface a product screen? | `impeccable` |
| Does it need layout measurement? | `browser` |
| Does it need a repeatable suite? | `playwright-cli` |
| Does it touch a version, a tag, or the registry? | `rivinia-release` |
| Is it a fact about Angular or npm? | `research` |
| Is it a fact about OpenCode? | `opencode` |
| Is it a decision that changes the architecture? | `domain-modeling` + a D-entry |
