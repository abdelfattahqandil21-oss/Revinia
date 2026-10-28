# @rivinia/i18n 0.6.0 — core split and the `/ui` entry point

Status: **proposed** (2026-10-28). Nothing in this document is implemented yet.
Baseline: `main` at `68dd312`. Workspace version `0.5.0`, tagged `i18n/v0.5.0`
(commit `23d5056`). npm `latest` is `0.4.0` (`npm view @rivinia/i18n`, 2026-10-28),
so 0.5.0 is tagged but **not published**.

## 1. Process first (read before touching code)

1. **Publish 0.5.0 before any refactor.** `AGENTS.md` says tags are immutable
   (D17) and a publish happens only from the tagged commit, from the exact
   inspected tarball. A refactor committed on top of `i18n/v0.5.0` would no
   longer match what that tag released. So:
   - Step A: release 0.5.0 from the tag with the `rivinia-release` skill and the
     explicit confirmation of gate 7 (name, version, access, tarball contents).
   - Verify the tarball comes from `23d5056`, not from HEAD. Check
     `git diff i18n/v0.5.0..HEAD --stat -- projects/i18n` is empty (the two later
     commits are expected to touch only the root README and `check:docs`).
   - Steps B and C below start only after 0.5.0 is on npm.
2. **Two branches, one release.** `pkg/i18n/core-split` (Part 1), then
   `pkg/i18n/ui` (Part 2), each merged with `--no-ff`. Release both together as
   `0.6.0` unless the owner prefers `0.5.1` for the refactor alone (open question 3).
3. **The `rv` prefix needs no migration.** `angular.json` already sets
   `prefix: "rv"` for every library project, and `@rivinia/i18n` today exports no
   component or directive with a selector. The only published name outside the
   convention is the pipe `rTranslate` (kept; open question 2). The prefix applies
   to the new `/ui` components: `rv-*` elements, `[rvXxx]` attributes.

## 2. Part 1 — split the `RiviniaI18n` God class (RIV-18)

### 2.1 Why

`src/lib/services/rivinia-i18n.ts` is 915 lines and owns eight unrelated
responsibilities. That is why races (RIV-02) and reactive-context bugs (RIV-05)
hid inside it. The spec-0.4 gate for this work was "after the test suite
exists"; that suite now exists (210 unit tests, 9 schematic tests, Chromium and
Firefox, CSR and SSR).

### 2.2 Responsibility map (approximate, from the member outline at `68dd312`)

Phase 0 must re-verify these ranges against the file.

| Responsibility | Approx. lines | State it owns |
|---|---|---|
| Config, flags, injected deps | 47-75 | config, doc, request, transfer, tasks |
| Language state, `dir`, `locale` | 76-78, 126-136, 493-497 | `_currentLanguageId`, `_languages` |
| Dictionary cache, in-flight, generations, loader | 78-120, 359-432, 602-619, 696-815 | cache, `_inflight`, `_generations`, `_loadedTranslations`, `_fallbackDict` |
| Loading status and readiness | 138-152, 238-283 | `_loadingState`, `_loadingError`, `_ready` |
| TransferState | 849-872 | none (reads/writes) |
| Missing key/param reporting | 158-195, 621-695 | reported sets, pending queues, `_missingKeys` |
| Translate, `t()`, ICU rendering, key lookup | 285-357, 556-596, 874-889 | none |
| Number/date formatters | 483-517 | `_formatters` (unbounded Map) |
| Storage and initial language | 550-554, 817-847, 891-915 | none |
| DOM `lang`/`dir`, view transition | 197-226, 519-548 | none |
| Switching API | 434-481 | none |

### 2.3 Target design (internal, zero behavior change)

All collaborators are plain classes in `src/lib/services/` (D50: classes that DO
something). They are **not** exported from `public-api.ts`. They take explicit
constructor arguments: no new DI tokens, no new injectables. `RiviniaI18n`
stays the single `@Service()` facade and constructs them in its own injection
context (where its `inject()` calls already run).

| Collaborator | Takes over | Notes |
|---|---|---|
| `MessageFormatter` | ICU compile cache use, Intl number/date memo, `render` | replaces the unbounded `_formatters` Map with a bounded cache |
| `MissingKeyReporter` | dedupe sets, microtask flush, `onMissingKey`, `onMissingParam`, dev warnings, `missingKeys` signal | keeps the RIV-05 rule: user callbacks never run inside a computed |
| `LanguageStorage` | local/session/cookie read and write, persist-only-after-explicit-change, `persist:false`, initial language resolution | |
| `DocumentDirectionApplier` | the `lang`/`dir` effect and view-transition wrapper | SSR-safe, uses `locale ?? id` (RIV-11) |
| `DictionaryStore` | cache, shared in-flight promises, generations, transfer state, fetching, `loadingState` counter, fallback dictionary | riskiest; done last. Keeps RIV-02: fetch once, apply per caller by current state |

Rules:

- One collaborator per commit, in the table order. Run the full unit suite after
  each. Commit message: `refactor(i18n): extract <Name>`.
- Each signal has exactly one owner; everyone else reads a readonly view. No
  cycles between collaborators.
- Existing specs must pass **unchanged** (import-path edits only). If a spec has to
  change, stop and report why before continuing.
- Add direct unit tests per collaborator under `projects/i18n/tests/`; they are
  now constructible without TestBed.
- Move code with `git mv` or an explicit `git rm` (the D50 trap: checkout-based
  moves leave duplicate files behind).

### 2.4 Safety net (before the first extraction)

- Add the characterization test the spec-0.4 plan lists but the suite lacks: slow
  background fallback, then a language switch after hydration. Unit level, and an
  SSR case in `i18n-e2e` on both browsers.
- Save baselines: the public `.d.ts` surface (excluding `@internal`), the RIV-06
  benchmark number, FESM size raw and gzip.
- Stop at this checkpoint and suggest a commit to the owner.

### 2.5 Acceptance

Public `.d.ts` diff against the baseline is **empty**. All AGENTS gates 1-6 pass.
Benchmark is not regressed. Size delta reported. Chromium and Firefox suites pass,
CSR and SSR.

## 3. Part 2 — `@rivinia/i18n/ui`

### 3.1 Goal

Serve real navbar cases without owning popups or layout:

- two languages: a button;
- many languages: a select;
- inside a menu in the nav (including a logged-in user's menu): the app's own
  menu, fed by the library;
- a logged-in user whose choice must reach their profile.

### 3.2 Constraints taken from this repo

- **D21 / D06 / D30.** Headless core stays complete without UI. UI depends
  inward only. Follow the `@rivinia/toast/ui` precedent: `import type` from
  `@rivinia/i18n` plus a **structural manager interface**, so the core instance
  satisfies it and test doubles need a few members. No runtime import of core
  code in the UI FESM (verify by grep). No new dependencies: no CDK, no extra
  peers beyond `@angular/core`.
- **D50 layout.** `projects/i18n/ui/ng-package.json`, `ui/src/public-api.ts`,
  `ui/src/lib/components/<name>/<name>.{ts,html,css}`. Specs live in
  `projects/i18n/tests/` (like `toast-list.spec.ts`). Update the `test` target's
  `include` only if the glob does not already cover them.
- **D42 / D44 tokens.** CSS reads `var(--rv-i18n-<x>, var(--rv-<semantic>, <default>))`;
  sizes in rem; class names and `data-*` hooks are documented as the stable
  override surface; logical properties only (RTL).
- **Selectors.** `rv-language-toggle`, `rv-language-select`, `rv-language-switcher`.
- **Existing model.** `Language` already has `nativeName?`, `dir` and `locale?`;
  `RiviniaI18n` already exposes `languages`, `currentLanguage`, `loadingState`,
  `setLanguageAsync`. Nothing new is needed in core for this part; if Phase 0
  finds a missing member, propose it as a separate core change first.

### 3.3 Components

| Element | Use | Behavior |
|---|---|---|
| `rv-language-toggle` | exactly two languages | one button showing the **other** language's name; `lang` on the button; dev warning if the language count is not 2 |
| `rv-language-select` | three or more | native `<select>`; each option has `lang` and `dir`; no custom popup in this release |
| `rv-language-switcher` | `variant='auto'` (default) | 2 languages: toggle; 3 or more: select; it never chooses a menu |

Shared contract (all three):

- Inputs: `[manager]` (structural, below) or presentational `[languages]`,
  `[current]`, `[busy]`. When both are given, the manager wins (the toast rule: one
  source of truth).
- Output: `(languageChange)` with the chosen id. With a manager, the component
  calls `setLanguageAsync`; it never calls any backend.
- Structural manager (names are proposals):
  ```ts
  export interface RiviniaLanguageManager {
    readonly languages: () => readonly LanguageLike[];
    readonly currentLanguage: () => string;
    readonly loadingState: () => 'idle' | 'loading' | 'error';
    setLanguageAsync(id: string): Promise<void>;
  }
  ```
- Names shown: `nativeName`, then `Intl.DisplayNames` on the language's locale
  (guarded: SSR and unsupported runtimes), then the id. No flags.
- Busy and error: `aria-busy` while `loadingState() === 'loading'`; a
  `data-state` hook for `'error'`; no built-in error message.
- Accessibility: visible focus, keyboard operation, `lang` per option, accessible
  name configurable via input.

### 3.4 Menu and nav (recipes, not components)

Do not build a popup. `@rivinia/menu/ui` and `@rivinia/select/ui` already exist.
Document, with tests that mirror the README examples (as menu does with
`readme-example.spec.ts`):

1. a navbar button with `rv-language-toggle`;
2. a language list inside `rv-menu` using `rvMenuItem` over `i18n.languages()`;
3. `rv-select` from `@rivinia/select/ui` for a searchable list;
4. a logged-in user menu: language entries inside the user's own menu.

`i18n.languages()` with a plain `@for` is already short. Add a template-context
directive (`rvLanguageOptions`) **only** if Phase 0 shows the recipe is noisy
(open question 4).

### 3.5 Logged-in users

The library persists the language through core storage. A signed-in app that
keeps the language in a profile uses `(languageChange)` to save it and
`persist: false` in config if it does not want local persistence. Document the
recipe; add no network code.

### 3.6 Tests

- Unit: each variant; `auto` switching when the language count changes 2 to 3;
  manager wins over presentational inputs; busy and error hooks; keyboard;
  `lang` and `dir` attributes.
- SSR render of all three.
- An `i18n-e2e` page per variant, with `@axe-core/playwright` accessibility
  checks, Chromium and Firefox.
- README recipe tests (section 3.4).

### 3.7 Acceptance

AGENTS gates 1-6, with bundle sizes recorded as baseline, core-only, core+UI sync,
UI lazy. Core FESM contains no UI markers; UI FESM has no runtime import from
core. Public API tiers for every new export are added to the README table.

## 4. Decisions to log in `docs/DECISIONS.md` (next free number: D64)

- Publish-before-refactor ordering and the tag rule applied to 0.5.0.
- The collaborator split and the rule that specs stay unchanged.
- `/ui` contract: structural manager, native names, no popup, recipes for menus.

## 5. Open questions for the owner

1. Publish 0.5.0 from the existing tag first (recommended) or skip 0.5.0 and
   release everything as 0.6.0 under a new tag?
2. Keep the published pipe name `rTranslate`, or add an `rv`-style name later?
3. Ship the refactor alone as `0.5.1`, or fold it into `0.6.0`?
4. Add `rvLanguageOptions`, or keep menu support as recipes only?
5. `rv-language-toggle` with more than two languages: dev warning only, or fall
   back to a cycle?

## 6. Routing and workflow

- Load `rivinia-playbook` and state the route. Part 1: `diagnosing-bugs` for
  anything the new characterization test exposes, `tdd` for each new unit, then
  `code-review`. Part 2: `tdd`, then `impeccable` for the component styling.
  Release: `rivinia-release`, loaded by exact ID. API facts (`Intl.DisplayNames`,
  Angular 22 signal inputs): `research`, verified against installed types.
- Conventional Commits with scope `i18n`; never mix packages in one commit.
- No version bump, tag or publish without explicit owner confirmation.

## 7. Report format

For each item: a table row with executed evidence. Then an explicit "not run"
list (yarn was never tried; npm provenance needs CI). End with the version
decision for the owner.
