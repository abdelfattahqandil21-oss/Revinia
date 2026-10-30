# Rivinia — Architecture Decision Log

Append-only. Newest entries at the bottom. Each entry: date, context, decision,
alternatives rejected, impact.

## 2026-10-12 — D01: Angular baseline 22.2.2

- Context: need a production baseline, not RC/nightly.
- Decision: Angular `^22.0.0`, verified stable `22.2.2` (npm `latest`, released 2026-10-08).
- Sources: `npm view @angular/core`, https://angular.dev/reference/releases (checked 2026-10-12).
- Impact: all packages peer-depend on `@angular/core ^22.0.0`; `@angular/*` kept on same major/minor.

## 2026-10-12 — D02: Confirmed stable APIs usable in libraries

- `@Service()` — stable, exported from `@angular/core` (verified in installed `core.d.ts`).
  Default for root singletons; `@Injectable` retained for ctor-DI / non-root scopes.
- `injectAsync` — stable since v22.0, with `prefetch: onIdle`. For async DI boundaries.
- Signal Forms — stable via `@angular/forms/signals` + `/compat` (verified exports
  in `@angular/forms@22.2.2`). Classic Reactive Forms remain supported, not deprecated.
- Impact: libraries may depend on these without an experimental-risk note.

## 2026-10-12 — D03: i18n-egy is knowledge source, not to duplicate

- Context: inspected `i18n-egy` v2.2.0 (`/media/abdelfattahqandi/OWN/projects/i18n-egy-main/i18n-egy`).
  Single entry point, `peerDependencies: {@angular/core ^22.0.0}`, `sideEffects: false`,
  `provideI18n` + `I18nService(@Service())` + `injectLanguage()` + `TranslatePipe(pure:false)` +
  `LoaderDescriptor.resolve()->dynamic import()` + signals + SSR-safe storage + RTL via
  `document.documentElement`.
- Decision: reuse its patterns (D02 + descriptor/dedupe/token, SSR guards, peer/sideEffects
  discipline). Do NOT reimplement i18n, pluralization, or locale formatting here until a
  documented gap requires a new `@rivinia/*` wrapper.
- Impact: Phase 5 language integration = thin optional UI selectors over `i18n-egy`,
  never a fork.

## 2026-10-12 — D04: pnpm + ng-packagr + APF

- Context: i18n-egy precedent uses pnpm + `@angular/build:ng-packagr`, partial compilation,
  FESM2022 output with per-loader chunks.
- Decision: Rivinia workspace uses pnpm workspaces, one `projects/<pkg>` per publishable
  package, `ng-package.json` per primary + per secondary entry point. APF compliance verified
  via `npm pack` + consumer install, not assumed.
- Impact: secondary entry points are explicit npm export boundaries; lazy chunks must be
  proven with production builds.

## 2026-10-12 — D05: Publish validation is architectural, not final

- Decision: manual per-package flow first (`build → test → npm pack → inspect →
clean-consumer install → prod build → confirm name/access/version`), user confirms each
  public publish. Automation only after the manual flow is proven and recorded.
- Impact: blocks Phase 5 until Phase 3 experiment + Phase 4 first-package flow succeed.

## 2026-10-12 — D06: UI secondaries stay import-free from Core (proof finding)

- Context: cross-entry relative imports (`primary → ../core/...`) fail ng-packagr with
  TS6059 (`rootDir` locked to the entry dir); TS6 deprecates `baseUrl`, so source-mapped
  `paths` need migration care. Proven in `proof-core` build attempts.
- Decision: primary entry IS the headless core; `ui` secondary receives data via
  `input()`/templates and imports nothing from Core. Consumers compose in their own
  templates (`<rv-proof-badge [count]="store.count()">`). Chunk grep proves full
  decoupling: core FESM has no UI code, UI FESM has no store code, badge lands only in
  the lazy route chunk. Revisit package-specifier cross-imports only with a measured need.
- Impact: all future `*/ui` entries follow input-composition unless an exception is
  proposed, measured, and logged here.

## 2026-10-12 — D07: @rivinia/http design (learned from BRT, verified APIs)

- Context: BRT `http-generic.service.ts` pattern — typed get/post/put/patch/delete/getBlob
  over `HttpClient`, `joinUrl` base joining, recursive `{ data }` unwrap, per-request
  options + `HttpContext` escape hatches, auth/error interceptors app-owned. User required:
  global unwrap key + per-call key + unwrap on/off flag, plus `resource` support.
- Verified: `httpResource` stable since v22.0 (angular.dev, installed `http.d.ts` has
  `parse` hook + full `HttpResourceRequest` shape); `resource`/`rxResource` stable.
- Decision: `provideHttp({ baseUrl?, unwrap?=true, unwrapKey?='data' })` (BRT-compatible
  defaults); per call `options.unwrap ?? config.unwrap ?? true`,
  `options.unwrapKey ?? config.unwrapKey ?? 'data'`. Plain Observables for all verbs +
  `getBlob` (never unwrapped) + `getResource()` via `httpResource` with
  `parse = raw -> unwrap -> userParse`. `HttpContext` passed through for app interceptors.
- Peer deps: `@angular/common` + `@angular/core` `^22.0.0`, `rxjs` (Angular's own range).
  The app MUST call `provideHttpClient()` itself; interceptors stay app-owned (BRT
  `auth/error.interceptor.ts` NOT copied — app-specific: tokens, toasts).
- Deferred (additive, semver-minor): `postText`, dedicated `rxResource` mutation helper
  (mutations stay Observable + `resource.reload()`; documented, not implemented).
- Verified 2026-10-12: 15/15 vitest (`HttpTestingController`), ng-packagr build, tarball
  `pack/rivinia-http-0.1.0.tgz`, external consumer install + prod build (initial
  245.29 kB raw / 69.02 transfer; badge lazy chunk unchanged at 1.08 kB).

## 2026-10-12 — D08: http scope verdict (research) + reportProgress finding

- Research (TanStack Angular overview: `@tanstack/angular-query-experimental`, breaking
  changes possible; angular.dev `http-resource` guide; community HTTP-lib thread):
  caching/SWR/dedup belong to TanStack — Rivinia MUST NOT rebuild them; interop recipe
  is `injectQuery(() => ({ queryFn: () => lastValueFrom(api.get(...)) }))`. Retry/timeout
  stay app-side (interceptor or RxJS; retrying non-idempotent POSTs duplicates charges).
  Mutations stay plain Observables + `resource.reload()` per official guidance.
- Decision: v1 transport scope stands (CRUD + unwrap key/flag + getResource). Only
  micro-addition: `reportProgress` passthrough on `getResource` + `projects/http/RECIPES.md`
  (TanStack interop, polling via `rxResource`, retry, mutations, envelopes, progress).
- Finding: `httpResource` does NOT forward `reportProgress` onto the outgoing
  `HttpRequest` (probed 2026-10-12: `rp=false` on the wire object); the `progress`
  signal is the supported surface. Test asserts our surface only, with a NOTE comment.
- Verified: 16/16 vitest, rebuild + repack, external consumer reinstall + prod build
  (initial 245.36 kB raw / 69.05 transfer; lazy badge chunk still 1.08 kB).

## 2026-10-12 — D09: ng-add for @rivinia/http (trial findings)

- Scope: schematic ONLY inserts 2 imports + 2 providers into `app.config.ts`;
  idempotent, warns-and-skips when config/workspace is unrecognized, never throws
  (a throwing schematic would break `ng add` installs). No file generation.
- Finding 1: compiled schematic MUST use `.cjs` extension. The published package
  carries `"type": "module"` (APF), so Node parses `.js` schematics as ESM and the
  CJS factory breaks (`exports is not defined` → CLI reports "no ng add actions").
  Pipeline: `tsc` (nodenext) → rename `index.js` → `index.cjs`; collection factory
  `./ng-add/index.cjs#ngAdd`; shipped via `ng-package.json` `assets`.
- Finding 2: TS6 deprecates `moduleResolution: node10` — schematics tsconfig uses
  `nodenext/nodenext`. Runtime `require('@angular-devkit/schematics')` resolves via
  the CLI's hoisted copy (verified under npm; pnpm-consumer check still open).
- Verified 2026-10-12: 4/4 schematic unit tests (virtual FS, incl. idempotency +
  missing-config skip); tarball (8 files incl. schematics + README); real
  `ng add <tarball> --baseUrl …` in fresh app wired config correctly; second run
  no-op; wired app production build succeeded (209.59 kB raw initial).
- Open: pnpm-consumer devkit resolution; publish itself (needs user `npm login` +
  `@rivinia` scope availability at publish time).

## 2026-10-12 — D10: provideHttpClient is default-available; wrap via opt-in httpFeatures

- Research (angular.dev setup guide: "HttpClient is available for injection by
  default in Angular v21+"; `withFetch` deprecated, fetch is the default backend;
  source `_module-chunk.mjs:2035`: every `provideHttpClient()` call re-registers
  `xsrfInterceptorFn` in the multi-token with no cross-call dedup; default chain is
  fully root-provided: HttpClient → HttpHandler → FetchBackend, WITHOUT XSRF).
- Decision: `provideHttp()` NEVER calls `provideHttpClient()` unless the caller
  passes `httpFeatures: [...]` (typed `HttpFeature<HttpFeatureKind>[]`), applied
  once internally. Three documented styles: bare `provideHttp()` (v21+ default),
  single-call with `httpFeatures` (do NOT also call `provideHttpClient()` — double
  XSRF registration), or separate explicit calls (what `ng add` generates, matching
  the official guide; single registration, XSRF on).
- ng-add schematic unchanged (still inserts both calls — official-guide parity).
- Verified: 17/17 vitest (incl. interceptor-applied-through-httpFeatures test;
  testing rule: `provideHttpClientTesting()` must come last so its mock backend wins).

## 2026-10-12 — D11: Branded wrap names (provideRiviniaHttp / injectRiviniaHttp)

- Context: bare `provideHttp` is confusable with Angular's `provideHttpClient`
  (compounded by our `httpFeatures` single-call style). Nothing published yet, so
  a clean rename has zero migration cost. Decision: `provideRiviniaHttp()` +
  `injectRiviniaHttp()` (service stays `RiviniaHttp`); 75 occurrences renamed
  mechanically with word-boundary guards for `provideHttpClient`.
- ng-add extended with `--unwrap-key` (composed with `--baseUrl` into one call arg).
- Verified: schematics 5/5, lib 17/17, rebuild + repack, consumer rebuild
  (245.43 kB), fresh `ng add --baseUrl … --unwrap-key result` wires
  `provideRiviniaHttp({ baseUrl, unwrapKey })` + builds.

## 2026-10-12 — D12: ng-add prompting, config levels, risk study (user review)

- Prompting: YES — `ng add` asks. `x-prompt` added to `baseUrl` ("API base URL…?
  Enter to skip") and `unwrapKey` ("…Enter for the 'data' default"). Interactive
  runs prompt; `--defaults`/CI/non-TTY skip silently with defaults (verified: pnpm
  trial with `--defaults` wired bare `provideRiviniaHttp()` + `provideHttpClient()`).
- Levels: project-level key via `provideRiviniaHttp({ unwrapKey })` (or ng-add
  `--unwrap-key`), per-call override `{ unwrapKey }`, per-call kill-switch
  `{ unwrap: false }`. Composition proven by new test (global + override + off in
  one injector, 18/18 lib tests green).
- Risk study:
  - R1 double-provideHttpClient (double XSRF): only if user combines
    `httpFeatures` with their own call. Mitigated by 3 documented styles + JSDoc
    warning. Residual: LOW (visible duplication in one config file).
  - R2 schematic blind edits: only inserts imports/providers, idempotent,
    throws actionable error without `providers: [`; unknown layouts warn-skip
    (never crash installs). 5/5 schematic tests. Residual: LOW.
  - R3 non-standard configs (`app.server.config.ts`, multi-project): schematic
    targets `src/app/app.config.ts` of default/first project (`--project`
    override). Misses warn-skip with manual instructions. Residual: LOW, documented.
  - R4 wrong unwrapKey = silent raw-body passthrough typed as T (type lie).
    Mitigated by `parse` validation recipe (Zod) + passthrough-is-safe default.
    Residual: MEDIUM for untyped backends — accepted, documented.
  - R5 renames post-publish are breaking: pre-publish window used for
    `provideRiviniaHttp` rename (D11). After 0.1.0: semver discipline. Residual: NONE yet.
  - R6 pnpm schematic runtime (devkit resolution under isolation): VERIFIED —
    real `ng add <tarball>` in a fresh pnpm app wired config correctly and the
    wired app builds (209.79 kB). No dependency changes needed. CLOSED.

## 2026-10-12 — D13: first publish attempt (@rivinia/http@0.1.0) — BLOCKED, no state changed

- Pre-publish standards applied (researched docs.npmjs.com scoped-publish guide):
  logged in as `abdelfattahqandil21`, registry reachable, `license: MIT` + `keywords`
  added (repository/homepage omitted — no repo URL provided, never invent URLs),
  README badges + API + testing sections, `npm publish --dry-run` clean
  (8 files, 10.4 kB, tag latest, public access).
- Real attempt: `npm publish ./pack/rivinia-http-0.1.0.tgz --access public` →
  `404 PUT /@rivinia/http (not found or no permission)`, exit 1. Pre-proven causes:
  npm org `rivinia` does not exist (npmjs.com/org/rivinia → 404) and the account
  holds no such scope. No OTP stage reached; nothing published; tarball untouched.
- Unblocks (user actions only): 1) create org `rivinia` (or name an owned scope to
  rename to), 2) say the word — rerun is one command on the already-inspected
  tarball. Provenance deferred (no git/CI yet; automation only after manual flow
  succeeds per D05). 2FA/OTP, if enforced, will surface at that rerun.

## 2026-10-12 — D14: @rivinia/http@0.1.0 LIVE (first real publish)

- Flow: `npm login` refresh (old stored token lacked org scope) → publish tarball →
  package entered npm STAGED publishing (`0.0.0-stage` placeholder, README empty) →
  user approved the staged `0.1.0` in browser (2FA) → registry live
  (`npm view`: `0.1.0`, `latest: 0.1.0`).
- Interactive proof (user TTY, fresh tailwind app `/media/.../OWN/libs/s`):
  `ng add @rivinia/http` resolved `0.1.0` from the registry and asked all three
  questions (baseUrl skipped, key typed `d`, unwrapping Yes) → wired
  `provideRiviniaHttp({ unwrapKey: 'd' })`. NOTE flagged to user: key is literally
  `'d'` — correct only if their backend envelope uses `d`, else change to `data`.
- Lesson: first-time scoped publishes go through staging + manual approval; budget
  for it (D05 release workflow updated in practice, automation later).

## 2026-10-12 — D15: baseUrl removed from the provider (user directive)

- Rationale: Angular itself ships no baseUrl (verified: zero matches in
  `http.d.ts`, open issue angular#23139); but imposing ours in the provider was
  still the library dictating URL ownership. Decision: provider holds NO URL —
  `RiviniaHttp` passes endpoints through untouched; call sites compose via the
  still-exported `joinUrl(environment.apiUrl, path)` (BRT pattern, documented).
- Breaking vs 0.1.0 (unpublished→published 0.1.0 is live!): removal ships as
  **0.2.0**. ng-add drops to two questions (unwrap confirm + key); schema
  defaults removed so prompts always appear interactively (verified mechanism;
  `--defaults`/CI skip silently).
- Verified: lib 18/18, schematics 6/6, build+pack, consumer rebuild on 0.2.0
  tarball (245.22 kB), fresh pnpm `ng add --unwrap-key payload` wires
  `provideRiviniaHttp({ unwrapKey: 'payload' })` with no baseUrl trace.
- Pending: user publishes 0.2.0 from their terminal (same one-liner).

## 2026-10-12 — D17: git workflow (trunk-based + per-package tags)

- Research (trunkbaseddevelopment.com, release-tag practices): main always
  releasable, short-lived branches, releases cut from trunk via tags. Resolves the
  "tags are repo-wide" concern with namespaced tags `<pkg>/vX.Y.Z`.
- Decision: branches `pkg/<package>/<topic>`, merges `--no-ff` with
  `merge(pkg): …` messages; Conventional Commits scoped by package; immutable
  per-package tags; `dist/`/`pack/`/`node_modules/` ignored (compiled schematic
  `.cjs` IS committed — required at pack time, regenerated by
  `pnpm schematics:http`); publish only from tagged commits. No `develop` branch,
  no git-flow. Changesets/automation deferred per D05.

## 2026-10-12 — D18: @rivinia/toast Core (headless, no Router peer)

- Research applied: WCAG aria-live roles + 2.2.1 timing control (pause/focus,
  persistent, configurable durations — Core exposes the mechanics, UI must bind
  them); industry cap precedent (shadcn limit 3 / BRT 5 → maxVisible 5,
  dismiss-oldest default); update-in-place over flicker (dedupe = update).
- Decisions: peers = `@angular/core` only (Router dropped after proving unneeded —
  3-line app recipe instead); messages are `string | Signal<string>` (reactive
  re-translation without i18n coupling); stale-timer generation guard (i18n-egy
  token pattern family); monotonic never-reused ids; queue timers start at
  promotion; `number | null` on reject; booleans for ambiguous ops; key alone
  never enables.
- Verified: 21/21 vitest (fake timers, incl. timer-count teardown assert),
  ng-packagr build, tarball (5 files), extern consumer install + prod build
  (+0.11 kB). Unverified: browser interaction (demo phase). NOT published
  (awaiting explicit approval).

## 2026-10-12 — D19: @rivinia/modal Core (Stage B complete, UI deferred)

- Architecture: manager owns registry/results/disposal; Stack/Queue strategies
  own ordering/admission width (pure w.r.t. lifecycle — no mode if/else).
  Primary entry IS Core (D06 precedent); `/ui` comes in Stage C.
- Result contract: Promise-only; 6 settled variants + promise rejection for
  infrastructure failures; results settle at dismissal initiation (animations
  never delay callers); `closing`→`closed` handshake for exit animations
  (confirmClosed/timeout). `close/dismiss/cancel` guard-free primitives with
  booleans; `requestDismiss` runs async guards (deny-safe, stale-safe).
- Notable fixes during validation: overflow-eviction must promote newcomer to
  active; teardown must not promote queued (changes settlement); teardown of
  queued uses queued-cancelled; `debugState` separates active/closing/queued
  buckets (closing still rendered — the earlier test failures were bucket
  semantics, not logic bugs; proven by isolated replication).
- Verified: 24/24 vitest (fake timers), ng-packagr build, tarball (5 files,
  0 DOM markers), external consumer install + prod build (+0.11 kB).
  Peers: `@angular/core` only. NOT published (awaiting explicit approval).

## 2026-10-12 — D20: zero declared dependencies vs ng-packagr tslib injection

- Verified: no Rivinia FESM imports `tslib` (ES2022 output needs no helpers).
  Source `package.json` files declare zero `dependencies` (tslib entry removed).
- ng-packagr 22 unconditionally injects `dependencies.tslib` into dist
  (`write-package.transform.js:178` — unless already peer/dependency).
  Fighting the packager (post-strip) is fragile; every ng-packagr library ships
  it and Angular always provides it. Accepted as standard, not a defect.
- Gate (added to AGENTS.md): before every pack, grep dist FESM — any `tslib`
  (or other undeclared runtime) import fails the release. Published http 0.2.0
  needs no change (identical effective metadata).

## 2026-10-12 — D21: headless-first like TanStack Table (product philosophy)

- Core packages sell complex logic, never pixels. The consumer owns rendering:
  use a future `@rivinia/*/ui` entry point or build their own UI — both are
  first-class, and Core releases never wait for UI. No `/ui` secondary is
  required for a Core publish; secondaries are added only with a real,
  validated UI behind them (proof-core/ui stays the packaging experiment).
- Consequence: Core APIs must be fully usable and documented without any UI
  (state signals, handles, recipes for app-owned rendering), and UI entries
  may only depend inward on Core — never the reverse.

## 2026-10-12 — D22: staged publishing applies to first publish only (verified)

- User-verified registry behavior: a package name's FIRST publish goes through
  staged review (placeholder + manual 2FA approval, minutes of propagation).
  Later versions on the same name publish instantly (`http@0.2.0`,
  `toast@0.2.0` went live without staging). Budget staging only for new names.

## 2026-10-12 — D23: @rivinia/i18n built fresh despite i18n-egy (user directive)

- Override of D03's no-duplicate rule, documented reason: unified `@rivinia`
  scope/ownership, branded `provide/injectRivinia*` API consistency across the
  ecosystem, single release process, and native improvements i18n-egy lacks
  (ICU plural subset with Arabic six forms, browser detection, Intl formatting,
  `rTranslate` collision-safe pipe name). i18n-egy stays untouched and live;
  no fork, no re-export wrapper, no shared code — independent implementation
  that learned its proven patterns (descriptor code-splitting, request token,
  SSR guards, peer discipline).

## 2026-10-12 — D24: default JSON loader convention (user directive)

- `RiviniaI18nConfig.loader` omitted → `jsonLoader()` reading
  `assets/i18n/{language}.json` (ar.json, en.json, …). The descriptor still
  code-splits; dictionaries load on switch/`loadTranslations`, never at
  construction. Escape hatch for inline-only apps: `customLoader(async () => ({}))`.
- Trade-off accepted: convention-following apps get zero-config key lookups;
  apps without JSON files see failed fetches surface on `loadingState`/`onLoadError`
  (safe fallbacks preserved). Test hygiene rule learned: every spec that calls
  `setLanguage` without caring about dictionaries must neutralize the loader,
  or fire-and-forget fetches leak across tests (observed 5 stray fetches).

## 2026-10-12 — D25: ng-add asks for a language LIST, validates strictly (live bug)

- Live failure: user typed `'ar' , 'en' , 'fr'` at a "default language" prompt;
  the schematic interpolated it raw → `defaultLanguage: ''ar' , 'en' , 'fr''`
  (invalid TS, broken app.config). Two faults: wrong question + zero validation.
- Fix: schematic asks ONE list question (comma-separated, first = default),
  parses defensively (strip quotes/whitespace/case, dedupe, BCP-47 validation,
  known RTL map + native names), and THROWS a clear error on invalid ids instead
  of emitting code. Proven with the exact messy input (valid config + build).
  Demo app config repaired by hand to the same shape.

## 2026-10-12 — D26: consumer-driven http 0.3.0 (reactive function endpoints)

- Consumer pain (Desktop demo): `getResource(() => url)` — the natural
  `httpResource` style — failed typing (wrapper demanded `Signal`). Real gap,
  not workaround material. Fix: accept `string | Signal | (() => string)` and
  normalize functions via `computed()` (needs injection context, which
  `getResource` already requires like `httpResource` itself).
- Verified: new spec (function endpoint + refetch on signal change), 21/21,
  rebuilt + repacked as 0.3.0 (feature, pre-1.0 minor), Desktop demo builds
  against the tarball; i18n loader impls split into real lazy chunks there.

## 2026-10-15 — D27: i18n default loader path `assets/i18n` → `i18n` (breaking)

- Context: the default `jsonLoader()` fetched `assets/i18n/{language}.json`,
  but modern Angular app templates serve `public/` at the site root —
  evidence (installed `@schematics/angular@22.2.2`, checked 2026-10-15):
  `application/index.js:253`
  `assets: [{ 'glob': '**/*', 'input': \`${projectRoot}public\` }]`and template dir`application/files/common-files/public/`(favicon only).
Files in`public/i18n/{lang}.json`are served at`i18n/{lang}.json`, so the
  old default 404s in convention-following apps.
- Decision: `DEFAULT_BASE_PATH = 'i18n'` (relative, site-root). Breaking
  default change → ships as **i18n 0.3.0** (pre-1.0 minor; PROPOSED, not
  bumped in this pass). Migration: move `src/assets/i18n/*.json` →
  `public/i18n/*.json`, or pin the old layout with
  `jsonLoader({ path: 'assets/i18n' })`. Synced: `ng-add` starter comment +
  schema `languages` description + tests, README + JSDoc, specs.
- Alternatives rejected: keep `assets/i18n` + document the `public/` mapping
  (leaves the zero-config path broken); an HttpClient-based loader
  (interceptors) and renaming/aliasing `httpLoader` — NOT approved in this
  pass, report only. Any SSR absolute-URL/base-href fix: NOT implemented;
  SSR proof reported separately, options proposed on failure.
- Verified: i18n lib 49/49, schematics 7/7, `ng build i18n`, 14-file tarball.
  NOT published (no explicit user confirmation).

## 2026-10-15 — D28: correcting entry — D07 unwrap default is `false`, not `true`

- Drift: D07 (2026-10-12) records `provideHttp({…, unwrap?=true…})` and
  "per call `options.unwrap ?? config.unwrap ?? true`", but the shipped code
  has always been opt-in: `DEFAULT_UNWRAP = false` (`http-config.ts:52`),
  resolver `options?.unwrap ?? config?.unwrap ?? DEFAULT_UNWRAP`
  (`rivinia-http.ts`), JSDoc `@default false`, README "opt-in, default off".
  D07's text is wrong; the code is right. This append-only entry corrects the
  log — D07 itself is untouched.
- Decision: the documented-and-shipped default is `unwrap: false` (library
  assumes nothing about the backend; a key alone never enables unwrapping).
  No code change, no version bump (docs-follow-code).
- Numbering note: minted as D27 on its branch; renumbered to D28 on the
  `integration/audit-2026-10` branch where D27 was already taken by the i18n
  loader-path entry (merged first).

## 2026-10-16 — D29: `@rivinia/modal/ui` on native `<dialog>`, no CDK

- Context: the headless Core already owns ordering, lifecycle, guards and
  typed results (the hard parts). The UI layer needed rendering + focus +
  scroll-lock + animations only. Evaluated: (A) native `<dialog>`, (B) CDK
  Dialog/Overlay, (C) custom overlay. Sources: MDN `showModal` (top layer,
  `::backdrop`, inert background, widely available), Angular Package Format
  (secondary-entrypoint `exports`), TS handbook (discriminated unions for
  option contracts, overload guidance).
- Decision: (A) native `<dialog>` + thin custom logic, ZERO new runtime
  dependencies. CDK rejected: it would duplicate Core lifecycle state (two
  sources of truth) and add bundle weight for positioning machinery we
  replace with plain CSS. Proof: core FESM has zero UI markers, UI FESM has
  zero store internals; UI imports are `@angular/common` + `@angular/core`
  - `@rivinia/modal` only.
- Consequences: exit animations ride the existing `closing` →
  `confirmClosed` handshake (default 300 ms covers the 150 ms default);
  toasts can neither `z-index` nor `popover` above a modal dialog (measured
  in Chrome via `elementFromPoint`) — documented limitation, no
  modal→toast dependency; host takes the manager via `[modal]` input typed
  as the structural `RiviniaModalHostManager` (D06 input-composition, immune
  to cross-realm singleton splits between source and `dist` typings).
- Verified: 47/47 modal tests (37 headless + 10 UI), CSR + SSR production
  integration with zero framework errors, lazy chunk 16.72 kB raw
  (4.93 kB transfer). NOT published; proposed `modal 0.5.0` (feature,
  pre-1.0 minor).

## 2026-10-16 — D30: `@rivinia/toast/ui` list component, no new deps

- Context: same shape as D29 — Core owns timers/ordering/dedupe, UI renders.
  Race analysis ("who wins"): Core already settles every race
  (per-toast generations, monotonic ids, update-in-place dedupe, dismiss
  beating stale fires); the UI adds one rule — managed mode wins over
  owned snapshots, so the view never races the manager either.
- Decision: `RiviniaToastList` (managed `[manager]` + presentational
  `[toasts]`), six logical positions defaulting to `bottom-end`, kind rail
  vs `richColors`, `role="status"` (assertive on errors), hover/focus pause,
  150 ms exit snapshots (browser only; SSR drops), reduced-motion support.
  Zero new runtime dependencies; core FESM has zero UI markers.
- Verified: 33/33 toast tests (28 headless + 5 UI), CSR + SSR production
  integration (positions, rich, pause, actions) with zero framework errors.
  NOT published; proposed `toast 0.4.0` (feature, pre-1.0 minor).

## 2026-10-16 — D31: `@rivinia/menu` headless + dropdown UI, no new deps

- Context: nav bar and select/multi designs need a dropdown primitive first.
  APG menu-button + HeadlessUI patterns researched (roving tabindex, Escape,
  arrows/Home/End, Tab closes non-modally, outside pointer closes).
- Decision: per-instance `RiviniaMenu` controller (open/active/registry,
  disabled-skip with wrap) + `@rivinia/menu/ui` (`rv-menu`, `rvMenuItem`;
  trigger/panel projection, placement classes, roving focus, focus return).
  Non-modal Tab behavior is deliberate. Structural `RiviniaMenuController`
  interface (same dual-realm lesson as modal's host manager). SSR renders
  closed. Zero new runtime dependencies.
- Verified: 9/9 menu tests, CSR headed run (profile + select styles,
  keyboard, pick) with zero errors. NOT published (new package 0.1.0).

## 2026-10-16 — D32: `@rivinia/select` searchable single/multi on rv-menu

- Context: invoice-filter (searchable single) and tag-picker (multi) designs
  need one select primitive, not two components.
- Decision: headless `RiviniaSelect` (option registry, accent-insensitive
  label filter, single value / multi values, `syncOptions` mirroring) plus
  `rv-select` composed on the inner `rv-menu` (owns a private `RiviniaMenu`
  for nav; reopen-in-same-pass for multi so the panel never drops; Tab in the
  search box jumps into the list instead of closing; structural
  `RiviniaSelectController` per the dual-realm rule). Options come from an
  `options` input; rich custom rows stay with raw `rv-menu`. Peer-depends on
  `@rivinia/menu` (declared; FESM grep gate applies).
- Verified: 10/10 select tests, CSR headed run with zero errors.
  NOT published (new package 0.1.0).

## 2026-10-16 — D33: dropdown APG gaps closed (trigger aria + typeahead)

- Context: APG menu-button/combobox audit of `rv-menu`/`rv-select` found the
  trigger exposing no `aria-haspopup`/`aria-expanded` (screen readers could
  not tell a menu exists) and no printable-character typeahead.
- Decision: `rv-menu` syncs both attributes onto the consumer's trigger
  element via effect; `rv-select` binds them on its own button. Typeahead
  lives in the menu component (labels are UI-owned DOM text, not headless
  state): prefix buffer, same-character cycling, 500ms reset, disabled-skip.
- Open (not started): selected-state semantics for select (visual check only;
  needs a menuitemcheckbox/menuitemradio vs listbox/option role decision),
  viewport-edge auto-flip, form binding, option groups.
- Verified: menu 12/12, select 10/10 tests. NOT published.

## 2026-10-16 — D34: select search-box owns its keystrokes + autofocus

- Context: lab report — typing in `rv-select` search typed nothing (panel
  menu-typeahead stole focus mid-word), no autofocus on open, stale filter on
  reopen. Measured in headed Chrome: search value `''`, 5 unfiltered rows.
- Decision: search keydown stops propagation except Enter (accept top match),
  Escape (dismiss), arrows (move into list per APG), Tab (jump in manually).
  Opening autofocuses search via select-owned afterRenderEffect + `justOpened`
  signal + microtask (deterministic over the inner menu's item focus); closing
  clears the query. Long panels capped (`min(20rem, 100dvh-2rem)`, scroll).
- Verified: headed run — autofocus lands in search (single + multi), `pai`
  filters to 1 row, Enter/multi picks clean, zero errors. Menu 12/12,
  select 12/12 tests. NOT published.

## 2026-10-16 — D35: top-layer menu positioning (popover + flip), no new deps

- Context: absolute panels overflowed near viewport edges and clipped under
  `overflow:hidden` ancestors; long lists had no height cap.
- Decision: manual `popover` (declared only when `showPopover` exists — an
  unshown popover is unfocusable, which broke jsdom focus until conditional)
  - measured `fixed` coordinates via pure `computeMenuPosition` (RTL-aware,
    flips the fitting side, clamps; unit-tested with fake rects) + outside
    scroll/resize closes (panel scroll exempt). Enter animation gated on
    `data-positioned`. Absolute classes stay as the no-popover fallback.
- Also closed: Arabic search normalization (tashkeel/tatweel/alef forms,
  tested), `menuitemcheckbox`+`aria-checked` for multi options (single stays
  `menuitem`), modal managed-exit UI test + back-button non-goal doc,
  select form-wiring recipe. Toast timers verified timestamp-based (no fix
  needed); toast-in-modal pattern re-verified live (`onTop:true`).
- Deferred (explicit): full ControlValueAccessor, option groups, huge-list
  virtualization — roadmap, not publish blockers.
- Verified: menu 19/19, select 13/13, modal 51/51 tests; headed flip/clip/
  no-stuck-layer/toast-in-modal runs, zero errors. NOT published.

## 2026-10-16 — D36: `@rivinia/menu` production audit (P0 fixes + Playwright suite)

- Context: APG audit of rv-menu. Verified gaps: outside click stole focus to trigger; trigger had no aria-controls (menu lacked stable id); empty/all-disabled menus never exercised (tested); RTL/flip aliases; scroll-close reflow path fixed; panel now names itself.
- Decisions:
  - outside pointer clicks do NOT restore focus (browser keeps natural target). Escape and Tab-close still restore.
  - panel gets a stable unique `rv-menu-panel-N` id; trigger gets `aria-controls`. `label` input maps to panel `aria-label`. Tested cross-instance uniqueness.
  - CSS is layered-flat (no `@layer`) by choice: reported-but-unverified layer-vs-consumer specificity caused a concrete regression risk. Override API is CSS vars (`--rv-menu-*`) plus documented classes and `data-*` hooks (active, flipped, disabled, placement).
  - forced-colors left to host; `prefers-reduced-motion` zeroes the enter animation.
- Playwright 1.64 Chromium + fixture (basic/dynamic/two/rtl/edge/styled). Headed verification landed during audit; suite runs on Chromium only (WebKit/firefox browsers cached — reported, not claimed). Axe-core audit lands the day after (browser 1248 tools); dependency declared.
- Tests: 21 Vitest unit (menu) + 20-ish Playwright scenarios + position pure helper 8.

## 2026-10-17 — D37: menu audit — real defects vs bad test expectations

- Context: full APG/ARIA audit of `rv-menu` with a new Playwright suite
  (Chromium fixture built from a real production Angular app).
- Method note (kept, because it wasted a full cycle): most "failures" were
  **my own test expectations**, not product bugs. The documented contract is
  "opening focuses the first enabled item", and several tests wrongly assumed
  an extra ArrowDown was needed to get there. Two infrastructure traps also
  masqueraded as defects: `reuseExistingServer` served a stale bundle, and
  key presses sent before the panel opened landed on the trigger.
- Real defects found and fixed (each with a regression test):
  1. `pickFocused()` trusted a stale `activeId`, so Enter activated an item
     that had been disabled after receiving focus (negative control confirmed
     the test catches it).
  2. Deferred focus cleared its flag before the panel existed, stranding focus
     on `<body>`; measurement state was only reset on the popover path.
  3. Outside pointer-down restored focus to the trigger.
  4. The typeahead buffer persisted across close/reopen.
- Decisions: `label` is opt-in (no forced naming); panel id is a module
  counter, stable per instance and safe for SSR because the panel only renders
  client-side; `checked` renders `menuitemcheckbox` while plain rows stay
  `menuitem` (single-select semantics unchanged); no `@layer` (cascade-layer
  vs consumer-utility ordering is not something we could verify here).
- Verified: 23 unit tests; 33/33 Playwright on Chromium; packed 0.2.0 tarball
  inspected (exports/types/peers/files/FESM imports) and built in a clean
  consumer app. Firefox 31/33 with two failures whose cause was not isolated
  (manual Firefox run shows correct focus/active/top-layer); WebKit cannot
  launch in this environment. NOT published.

## 2026-10-17 — D38: two usage levels, one implementation

- Context: DX task — verify whether `[items]` + `(picked)` and composable
  `rvMenuItem` markup both exist, and remove manual setup from normal usage.
- Verified first: manual `new RiviniaMenu()` / `register()` were already
  optional (the component owns a controller, directives self-register), so the
  gap was the declarative API and the styling hooks, not DI.
- Decision: support both levels because they serve different needs, but route
  the declarative path through the **same** `rvMenuItem` directive, so
  keyboard, focus, registration and click handling exist once. `[items]` +
  projected items throws: a silently dropped list is a data-loss bug.
  `label` renamed to `menuLabel` because the item data also has a `label`.
  Projection accepts both `rvMenuTrigger` and `rv-menu-trigger`.
- Design-tokens: switched to `var(--token, fallback)` and dropped the forced
  dark-mode defaults, because a declaration on the panel out-ranked consumer
  values set on an ancestor. Dark mode is opt-in (also what the brief asks for).
- Defects found by the new consumer-level tests (not by the internal ones):
  late registration could not claim initial activation; `[disabled]` changes
  never synced; static `disabled` attribute collided with the native property.
- Verified: 32 unit tests, 41/41 Playwright on Chromium, packed 0.3.0 tarball
  installed and built in a clean consumer app using both levels. NOT published.

## 2026-10-17 — D39: explicit Tab stepping (focus contract)

- Context: release gate. Adding a Shift+Tab regression test exposed that focus
  ended up on `<body>`: the panel is still mounted when the keydown is handled,
  so the browser's own tab step re-entered the panel, and focus was dropped
  when Angular unmounted it.
- Decision: on Tab/Shift+Tab, prevent default, close, and step focus
  explicitly to the tab stop before/after the trigger (skipping rows inside any
  panel). Deterministic in both directions and on both engines, and it matches
  where the user would have landed anyway. End-of-document behaviour stays
  whatever the browser does — documented, not second-guessed.
- Also corrected two of my own weak assertions while adding coverage: the
  theming spec accepted either the override or the default value (now asserts
  the exact tokens), and a "repeated Tab" test asserted an end-of-document
  behaviour that Firefox legitimately does not implement.
- Verified: 32 unit, 98/98 Playwright (Chromium + Firefox), packed 0.3.0
  rebuilt and installed into a clean consumer build. WebKit cannot launch here
  (missing libWPEWebKit-2.0, libbacktrace, libjxl.so.0.8, libavif.so.16) and
  is NOT claimed. NOT published.

## 2026-10-19 — D40: select's vendored popup leaves the `menu` namespace; CSS anchor positioning

- Context: a consumer app (`brand-page`, not published) upgraded
  `@rivinia/select` 0.4.2 → 0.5.0 and hit two failures, both reproduced and
  measured in headed Chromium (viewport 900×912, RTL and LTR):
  1. The app rendered `NG0912: Component ID generation collision detected.
     Components 'RiviniaMenuComponent' and 'RiviniaMenuComponent' with selector
     'rv-menu'`. `select` shipped a private copy of the menu component using the
     SAME selector as `@rivinia/menu`. Angular registers one definition per
     colliding id, so the loser's `styles` were never injected — the select's
     panel was silently rendered with the other package's CSS.
  2. With that CSS in place the panel flew away from its trigger: trigger at
     `x=11..232`, panel at `x=708..929` (929 − 221 = 708, to the pixel).
- Root causes, both verified rather than assumed:
  - **Cascade leak.** `[data-top-layer='true'] { inset: auto }` and the
    `[data-placement=…]` inset rules share specificity `(0,2,0)`, and the
    top-layer rule came FIRST, so it lost. In LTR the leak was invisible
    (`inset-inline-start: 0` → `left: 0`, the same property the component
    writes inline, so the inline value won). In RTL it resolved to `right: 0`,
    which the component never writes — the box became over-constrained and
    CSS 2.1 §10.3.7 dropped `left`, pinning the panel to the viewport edge.
  - **The collision**, which meant the fix could not even be applied: the
    library's own styles were absent from the document (proved by enumerating
    `document.styleSheets` — only the consumer's rules matched `rv-menu`).
- Decisions:
  - **The vendored copy is renamed out of the `menu` namespace**: selector
    `rv-select-menu`, classes `.rv-select-menu-*`, tokens `--rv-select-menu-*`,
    types `SelectPopup*`. `menu` no longer appears in the package's own
    vocabulary. Renaming the SELECTOR is what breaks the id hash —
    `componentDef.type.name` is not part of `getComponentId`, but
    `componentDef.selectors` is (verified in the installed
    `@angular/core` source). The `--rv-select-*` → `--rv-select-menu-*` token
    bridge is kept, so ancestor theming still reaches the panel.
  - **CSS anchor positioning places the panel**, inside `@supports`
    (`anchor-name` / `position-anchor` / `position-area` with LOGICAL keywords,
    `width: anchor-size(inline)`, `position-try-fallbacks`). Logical keywords
    make RTL correctness structural rather than a JS branch. Baseline
    widely-available since 2026-01, so the JS coordinate path stays as the
    fallback and is direction-correct for both directions after the cascade fix.
  - **`anchor-scope: all` on the component host is required**: without it every
    panel resolves its anchor to the LAST trigger in the document (the spec's
    tie-break for a duplicate `anchor-name`) — measured, all three panels of a
    three-select page landed on the third trigger, up to 431px away.
  - **ARIA is left alone**: `role="menu"`, `menuitem`, `aria-haspopup="menu"`
    are W3C values, not package vocabulary; renaming them would change the
    accessibility contract, not the code's naming.
  - **Package layout follows Angular convention**: `components/<name>/` holds
    the `.ts` + `.html` + `.css` triple; `models/`, `services/`, `utils/` hold
    types, the headless controller and pure math. Templates and styles are
    external files, not inline.
- Alternatives rejected: fixing the JS position math alone (the math was
  correct — the leak was the defect); dropping the top layer (loses clipping
  and stacking escape); `role="listbox"` (a semantics change, out of scope);
  renaming the class only (does not change the id hash).
- Verified: 44/44 select unit tests (specs updated to the new selectors),
  ng-packagr build, dist FESM grep shows zero `menu` vocabulary outside the
  ARIA values, and a consumer app measured 0px offset / equal width / correct
  inline-start alignment for all three selects in BOTH LTR and RTL.
  NOT published.

## 2026-10-19 — D41: `@rivinia/menu` had the same RTL defect; fixed with the same mechanism

- Context: D40 fixed the select's popup. The same consumer app then exposed
  the **identical** defect in `@rivinia/menu`, which had never been reported
  because the app's only menu used a placement that hides it.
- Verified from source (not inferred): `projects/menu/ui/src/lib/menu-panel.ts`
  had the same rule order as the select's pre-fix CSS — the
  `[data-top-layer='true'] { inset: auto }` rule sat **before** the four
  `[data-placement=…]` inset rules, both at specificity `(0,2,0)`, so the
  placement rules won and `inset-inline-start/end` leaked into the fixed
  top-layer box.
- **Why it was never seen:** the default placement is `bottom-start`, but the
  consumer's menu used `bottom-end`. In LTR, `inset-inline-end: 0` resolves to
  `left: 0` — the same physical property the component writes inline, so the
  inline value won and the panel looked correct. In RTL the two swap:
  `inset-inline-start: 0` resolves to `right: 0`, which the component never
  writes, and CSS 2.1 §10.3.7 drops `left` in RTL, pinning the panel to the
  viewport edge. Measured in the consumer app with `placement="bottom-start"`:
  trigger at `x=19..74`, panel at `x=636..1010` — **617px away**.
- Decision: **the same fix as D40**, applied to the menu's CSS:
  - the top-layer rule moves after the placement rules;
  - CSS anchor positioning places the panel (`anchor-name` /
    `position-anchor` / `position-area` with logical keywords,
    `position-try-fallbacks`, `position-visibility`);
  - `anchor-scope: all` on the `rv-menu` host, which is required for the
    same measured reason as the select.
- **One deliberate difference from the select:** a menu sizes to its
  **content**, a select matches its trigger. The select uses
  `width: anchor-size(inline)`; the menu uses `width: max-content` plus its
  `min-width`, and `justify-self` picks the edge inside a
  `span-inline-*` area. Using `anchor-size(inline)` on the menu would squeeze
  a 55px avatar button into a 55px menu. A bare `block-end` area was also
  measured and rejected: it spans the whole inline axis, so `justify-self`
  aligns to the viewport rather than the trigger (measured: panel at `x=0`,
  19px from its trigger).
- Verified: 32/32 menu unit tests, ng-packagr build, and a consumer app
  measured `distance: 0` and the panel's end edge aligned with its trigger's
  in **both** LTR and RTL, with the panel keeping its content width (320px
  beside a 55px trigger).
- Version: **0.3.5** (patch; a bug fix, not a feature).
- Open, from the same audit — the theme work is NOT started:
  - `modal` and `toast` declare their token defaults **on the component
    element**, so a global `--rv-*` layer cannot reach them at all today; the
    read sites need two-level chains (`var(--rv-modal-bg, var(--rv-bg, …))`)
    and the element-local default blocks have to go.
  - `modal` forces a dark scheme and `toast` forces a light one via
    `prefers-color-scheme`, which contradicts the documented "no forced dark
    mode" contract the other packages keep.
  - the e2e suite only asserts the placements where the leak is invisible
    (RTL `bottom-end`, LTR `bottom-*`); the dangerous combinations
    (RTL + `bottom-start`, LTR + `bottom-end`, any `top-*`) are asserted
    nowhere.
  - the toast README documents no theming surface at all.
  NOT published.

## 2026-10-19 — D42: one global token layer, and the surface a consumer can actually change

- Context: after D40/D41 the select and the menu both behave correctly, but a
  consumer asked the sharp question: *the component carries too much style; I
  cannot change the radius, the border, the panel background.* Measured in the
  consumer app, the truth was more precise than the complaint:
  - the **palette and shape** tokens (`--rv-select-bg`, `--rv-select-radius`,
    `--rv-select-shadow`, …) DID work, and they reached the trigger and the
    panel together (measured: `oklch(0.21 0.03 265)` → `rgb(1,2,3)` on both);
  - the **metrics** were hard-coded (row padding `8px 10px`, row radius
    `8px`, row min-height `40px`, trigger padding `8px 12px`, focus ring,
    hover/active tints, search and empty-state padding);
  - and the **CSS class names** already worked as an override surface, because
    the component styles are unencapsulated — but nothing documented that, so
    a consumer could not rely on it.
- Decisions:
  - **A shared semantic layer**, `--rv-bg` / `--rv-fg` / `--rv-muted` /
    `--rv-border` / `--rv-radius` / `--rv-shadow` / `--rv-font` / status
    colours, read by every package as
    `var(--rv-<pkg>-<x>, var(--rv-<semantic>, <default>))`. Three levels of
    control, each beating the next: per-package token → semantic token →
    built-in default. Measured on the consumer app: `--rv-select-bg` (blue)
    won over `--rv-bg` (magenta), which won over the default.
  - **A new `@rivinia/theme` package** carrying that layer, so ONE import
    does it — the shape `tailwindcss` uses: `@import '@rivinia/theme';`.
    It also ships `tailwind.css` and `bootstrap.css` adapters and an SCSS
    entry. The layer's defaults live inside `@layer rivinia-theme`, because
    unlayered declarations beat layered ones: a consumer's own
    `:root { --rv-bg: … }` must win wherever it appears. (Measured: with the
    defaults unlayered, the shipped file beat the app's mapping and the
    override did nothing.)
    - The layer must be mapped on `:root`, never on a component element —
      an element-level declaration shadows the root value and the override
      silently stops working. Measured.
  - **The metric hard-codings became tokens** — ~22 for the select and ~12 for
    the menu (row padding/radius/min-height/size/gap, hover and active tints,
    disabled opacity, focus ring and offset, search and empty-state metrics,
    text alignment, trigger justification). Measured end to end: row padding
    `8px 10px` → `18px 22px`, row radius `8px` → `2px`, trigger padding
    `8px 12px` → `16px 20px`.
  - **The class names are documented as a stable override API**, with the
    `data-*` hooks. They were always global; they are now contract.
  - **`optionTemplate`** — a new input on `rv-select` that replaces an option
    row's content with the consumer's markup, which is the answer to icons,
    avatars, badges and group headers. The `<button>` wrapper stays, so the
    ARIA, the keyboard handling, the disabled state and the multi-mode check
    keep working. An `icon` FIELD was rejected: it would put raw markup (or a
    URL the library must fetch) in the component's hands, and every consumer's
    icons differ. Verified by a test: 59/59 select tests.
- **Framework support** — all of these work, because the components read CSS
  custom properties and every stack can produce or consume them: plain CSS
  (`@import '@rivinia/theme'`), Tailwind v4 (`@theme` / `@theme inline`),
  Bootstrap 5.3 (`--bs-*` + `data-bs-theme`), Sass (`@use '@rivinia/theme/scss'`
  — Dart Sass loads a plain `.css` file as a module when the extension is
  omitted, so the SCSS entry exists for that reason), and Less (custom
  properties pass through untouched; Less VARIABLES are a different mechanism
  and do not interoperate). The library's CSS uses `@supports` and `@media`
  only — no Sass or Less syntax — so it compiles as plain CSS anywhere.
- Verified: 59/59 select, 32/32 menu, all three packages build, the dist
  greps are clean, and a consumer app measures the override surface working
  (tokens, alignment tokens, the global layer reaching both the select and
  the menu, and the panel still attached to its trigger at 0px offset).
  NOT published.

## 2026-10-19 — D43: README convention, and a release skill

- Context: the user pointed at `@tanstack/angular-virtual`'s README as the
  model and asked for the Rivinia READMEs to follow that order, and for
  reliable "skills".
- **README convention** (adopted from the TanStack shape, which is a good
  model for an npm library page):
  1. title, badges, one-paragraph description, then the facts (version,
     Angular requirement, entry points, side effects);
  2. **Quick features** — a bulleted list of what the package does;
  3. **Install** — the command for EVERY package manager (npm / pnpm / yarn /
     bun), not just npm;
  4. the rest of the documentation, in the order a reader needs it:
     imports → package layout → quick start → API → forms → headless usage →
     custom UI → override surface → theming → keyboard → accessibility →
     migration notes.
  - The ordering rule that mattered: **API before the deep dives.** A reader
    who wants the input names should not have to scroll past the headless
    chapter to find them.
- **`@rivinia/theme` README** — written from scratch in the same shape; it is
  also shipped in the tarball (an `assets` entry), because the npm page IS
  the README.
- **A release skill** at `.opencode/skills/rivinia-release/SKILL.md`:
  - The gates in `AGENTS.md` were already written, but they were prose an
    agent had to re-interpret on every release. The skill turns them into a
    runnable sequence — build → test → **inspect the tarball** (exports,
    types, peers, sideEffects, file list, and a grep of the dist FESM for
    runtime imports beyond the declared peers) → prove it in a CLEAN consumer
    (a `file:` link proves nothing about what npm will serve) → test the
    public imports as a consumer uses them → record bundle sizes → **get
    explicit user confirmation** (name, version, access, file list) → publish
    from a namespaced tag → verify the registry state.
  - It also encodes the two traps this repo has actually hit: a spec glob
    that silently excludes a suite (the `ui/src/**` gap that left the
    regression specs unrun), and a rename leaking into the bundle.
  - `opencode/autoinvoke: false` — a release must be asked for, never
    volunteered. The skill's ID is the path (`rivinia-release`), not the
    frontmatter `name`.
- Verified: 59/59 select, 32/32 menu, all three packages build, and
  `npm pack --dry-run` on the theme tarball shows 8 files / 4.5 kB with the
  README included.
  NOT published.

## 2026-10-19 — D44: sizes in rem, `standalone` dropped, and migration notes written for the consumer

- Context: three sharp corrections from a consumer reading the packages as a
  user, not as an author of them.
- **Sizes are now `rem`, not `px`.** Every type and spacing token moved:
  `13px → 0.8125rem`, `14px → 0.875rem`, `8px 12px → 0.5rem 0.75rem`,
  `40px → 2.5rem`, and so on. Measured in the consumer app: at a 17px root
  the trigger is 14.875px with `8.5px 12.75px` padding; at a 24px root it is
  21px with `12px 18px` padding. In `px` nothing would have moved. This is
  what makes the components follow the browser's text-size preference, a
  user-set accessibility default, and the app's own `html { font-size }` —
  the levers that matter on the 2026 device range, where the root font size
  varies far more than the viewport width does.
  - What deliberately stayed in `px`: hairline borders (`1px`), focus-ring
    widths (`2px`), SVG icon boxes (`16px`, which carry a `viewBox`), and
    shadow offsets/blur. None of them is type or spacing, and a hairline must
    stay a hairline.
- **`standalone: true` removed** from every component, directive and spec in
  the workspace, and from every README example. Verified in the installed
  Angular: `standalone: metadata.standalone === undefined ? true : …` — it is
  the default since Angular 19, so writing it says nothing, and the README
  was teaching consumers to write it.
- **Migration notes rewritten for the reader, not the author.** The previous
  notes explained how the bugs were fixed — cascade leaks, CSS specificity,
  over-constrained boxes. That is a `DECISIONS.md` entry, not a migration
  note; a consumer needs to know what to change, if anything.
  - `@rivinia/menu` 0.3.4 → 0.3.5 is now: **"Nothing to do."** No API
    changed, no token was renamed, no class was renamed; the panel just stays
    attached to its trigger in RTL now. The selectors a consumer might have
    targeted are listed, unchanged, so they can confirm.
  - `@rivinia/select` 0.4.x → 0.5.1 is now two mechanical steps: the
    markup rename table (only if you targeted the markup) and `[menuLabel]`
    → `[popupLabel]` (only if you bound it), plus a line saying everything
    else is additive.
- **The "Package layout" section was removed** from the select README and
  from its migration notes. The internal file tree is an implementation
  detail; a consumer needs the public entry points, and the public exports
  did not change — so there was no migration to document.
- Verified: all five packages build; 59/59 select, 32/32 menu, 51/51 modal,
  33/33 toast; and the rem scaling measured in the consumer app.
  NOT published.

## 2026-10-19 — D45: reopening a single-mode select, and the paged-data features

- Context: a consumer reported that after picking a value with the arrow keys
  and reopening the panel, the active row started at the FIRST option instead
  of the chosen one — and noted that multi mode was already right.
- **Cause.** `openMenu('first')` calls `activateFirst()` unconditionally, and
  the select's own query effect calls `activateFirst()` on every query change.
  Neither consulted the current selection. Multi mode was right for a
  different reason: it never closes on a pick, so the active row simply stayed
  where it was.
- **Fix.** On open, in single mode, the select activates the option that is
  already selected (if it is still in the filtered list). The popup service
  has no knowledge of the selection — that lives in the headless controller —
  so the select is the right place to make the decision.
- **The regression test is real**: with the fix reverted, two cases fail
  ("reopens on the option that was picked" and the open-close cycle); with it
  in place, all pass. Verified by actually reverting and re-running, not by
  asserting the test exists. 70/70 select tests.
- **Paged data.** A select whose options come from a paged API now has:
  - `[loading]` — a loader row under the list, `role="status"` so it is
    announced without stealing focus;
  - `(reachEnd)` — emitted when the panel scrolls near its end. The threshold
    is a **length** (`--rv-select-popup-reach-end-offset`), not a percentage:
    the panel's scrollable height changes as rows arrive, so a percentage
    would fire at a different row every time;
  - a **footer slot** (`[rv-select-popup-footer]`) for a "Load more" button;
  - `[listTemplate]` — replaces the whole list, for a virtualised one;
  - `(panelReady)` — hands over the panel element, which is the scroll
    container a virtualizer needs (`injectVirtualizer`'s `scrollElement`).
- **Custom animation.** The entrance is now ONE token,
  `--rv-select-popup-animation`, not three separate ones. A token rather than
  an `animation` override on purpose: Angular injects a component's styles
  into `<head>` at runtime, which is AFTER the app's stylesheet, so at equal
  specificity the library's declaration wins and a consumer's override would
  silently do nothing. The duration and easing are still separate tokens for
  the common case.
- Verified: 70/70 select, 32/32 menu, 51/51 modal, 33/33 toast; all five
  packages build; and the reopen fix measured in the consumer app (the active
  row after reopening is the picked option, not the first one).
  NOT published.

## 2026-10-19 — D46: modal and toast join the shared layer; the forced schemes go

- Context: D42 introduced the shared semantic layer and applied it to the
  select and the menu. The modal and the toast were left out, and they had a
  structural problem the other two did not: they declared their token defaults
  **on the component element**.
- **Why that blocked everything.** A declaration on the element out-ranks any
  value an ancestor sets, so `--rv-modal-bg` declared on `.rv-modal` made the
  semantic layer unreachable for the dialog — not "harder to theme", but
  impossible. The select and the menu read their tokens at the read site, so
  an ancestor's value won there.
- **Decisions:**
  - The modal and the toast now read their palette at the READ SITE, as
    two-level chains: `var(--rv-modal-bg, var(--rv-bg, #ffffff))`. The
    per-package token still wins for that component alone; the semantic layer
    is next; the built-in default is last.
  - The element keeps only the LAYOUT tokens (widths, padding, durations) —
    they are component-specific and have no semantic counterpart.
  - **The forced scheme blocks are gone**: the modal forced a dark palette
    under `prefers-color-scheme: dark` and the toast forced a light one. Both
    contradicted the "no forced dark mode" contract the other packages
    document, and both overrode a consumer's explicit choice. The components
    now follow the consumer's scheme, like everything else.
  - The toast's kind colours chain too: `--rv-toast-success` →
    `--rv-ok`, `--rv-toast-error` → `--rv-danger`, and so on.
  - The remaining type and spacing values in the modal and the toast moved to
    `rem`, like the select and the menu (D44).
- **The consumer app was cleaned up too**: `brand-page` no longer sets
  `--rv-modal-bg` / `--rv-toast-bg` / `--rv-toast-fg` etc. per package. With
  the semantic layer mapped once on `:root` next to the `--app-*` values it
  derives from, those rules were redundant — and they were what had been
  masking the global layer.
- **Verified in the consumer app**, with one variable overridden on `:root`:
  the select's trigger, the menu's panel and the modal's surface all turned
  `rgb(255, 0, 255)`, the modal's text turned `rgb(0, 255, 255)`, and the
  dialog's font scaled from 17px to 24px with the root font size. The toast's
  chain was verified in the built artefact
  (`.rv-toast { background: var(--rv-toast-bg, var(--rv-bg, #ffffff)) }`) —
  the app did not produce a toast during the run, so that one is verified in
  the build rather than on screen, and is reported as such.
- Also added: a **Theming** section to the toast README (it documented no
  theming surface at all) and to the modal README, both example-first.
- 70/70 select, 32/32 menu, 51/51 modal, 33/33 toast; all five packages
  build. NOT published.

## 2026-10-19 — D47: a select cannot overflow its row; unexpected errors are not masked; the dialog gets a loader

Three defects, all found by a consumer using the packages.

### 1. A select could overflow its cell and land on its neighbour

- **Measured.** A grid cell was 207px; the trigger was **357px** — overflowing by
  150px and overlapping the next select. The cause: `min-width:
  var(--rv-select-width)` on the trigger, with `--rv-select-width` set to 21rem
  (357px at a 17px root). In CSS **`min-width` beats `max-width`**, so the
  trigger's `max-width: 100%` could not cap it. A plain `max-width` was
  powerless, and a `width: 100%` on the trigger would have fought the
  `min-width` instead of resolving it.
- **Fix, in three parts:**
  - `min-width: min(var(--rv-select-width, 14rem), 100%)` on the trigger —
    `min()` is the only way to cap a `min-width`, because the cascade gives
    `min-width` priority over `max-width`.
  - the width has to reach the trigger, and the chain is host → wrapper →
    popup host → trigger wrapper → trigger. Two links in it were
    `inline-block`/`inline-flex` and therefore shrink-to-fit, so the cap
    resolved against a narrow width. Both now carry `width: 100%`, which
    resolves to `auto` when nothing upstream has a definite width — so a select
    with no size constraint still shrink-wraps to its content, as before.
  - the panel's own `min-width` is capped the same way, so the popup can never
    be wider than the button that opened it.
- **Verified in the consumer app**: the triggers are now 207/207/207 in 207px
  cells (no overflow), the panel is 207px — exactly the trigger's width — and
  it stays 0px from it. Before: 357px, overflowing.

### 2. Unexpected runtime errors were masked as network failures

- The consumer's `ApiService.toApiError` turned **every** thrown value into an
  `ApiError`, so a `TypeError` from a response shape that did not match the
  model surfaced as *"Could not reach the lab backend. Is it running on port
  4010?"* — sending every hunt for the cause to the wrong place. This is
  exactly the class of failure that passes TypeScript and breaks at runtime.
- **Fix.** Only an `HttpErrorResponse` is an expected failure and becomes an
  `ApiError`. Anything else is **logged and rethrown**, so the app's global
  handler sees it too. A `rethrowIfUnexpected(error, context)` helper applies
  the same rule at every screen-level catch: an `ApiError` is shown, anything
  else is reported and rethrown. The screen still finishes its work — the
  world continues — but the defect is never silent.
- The library's own `catch` blocks were reviewed and left alone: they are
  best-effort DOM calls (focus, scroll lock) and one known condition
  (NG0205, an owner destroyed before the dialog opened). Rethrowing those
  would break the app for a non-problem.

### 3. The dialog had no loading state

- A dialog that opens before its data arrives showed an empty box, which
  reads as a broken dialog.
- **Fix.** `loadingOf` on the host — the same shape as the existing `titleOf`
  — decides PER INSTANCE whether it is loading, because one host can have
  several dialogs open and they load independently. While it is true the host
  renders a loader instead of the instance's content: a `role="status"`
  polite live region (announced without stealing focus) with a spinner that
  `prefers-reduced-motion` stops. A throwing resolver falls back to "not
  loading", so the content renders — the safe default.
- Verified: 51/51 → 53/53 modal tests, the new cases covering both the
  loading and the not-loading paths.

## 2026-10-19 — D48: DI for the select controller, frozen options, and errors the consumer can see

- **The controller can be injected.** `new RiviniaSelect('multi')` in a component
  is opaque to Angular: it cannot be overridden in a test and it is invisible
  to the injector graph. A root singleton would be wrong — the controller is
  per-select state — so the provider form is used instead:
  `provideRiviniaSelect(mode)` + `injectRiviniaSelect()`, over a
  `RIVINIA_SELECT` token typed as the structural
  `RiviniaSelectController`. A test replaces the controller by providing the
  token, without touching the component. `injectRiviniaSelect()` throws when
  nothing is provided, rather than returning `undefined` and failing much
  later somewhere unrelated.
- **Registered options are frozen.** `readonly` on `RiviniaSelectOption` is a
  compile-time promise only. An option that could be mutated after
  registration would let the filtered list and the selection disagree, so the
  registry now holds `Object.freeze`d copies.
- **The item radius follows the semantic layer**, like every other shape:
  `--rv-select-item-radius` → `--rv-radius` → `0.5rem`, and the same for the
  menu's item radius.
- **An unexpected error now reaches the consumer.**
  - The library throws; the app decides what "unexpected" means.
  - The consumer app replaced Angular's `ErrorHandler` with one that logs
    WITH the cause and shows a toast. Angular's default only logs, so a defect
    that passes TypeScript and breaks at runtime used to vanish into the
    console while the screen quietly stopped working.
  - `rethrowIfUnexpected(error, context)` reports through the `ErrorHandler`
    (so the app can show it) and then rethrows (so it is never silent). An
    `ApiError` is still just handled.
  - **Verified on screen**: an unhandled `TypeError` produced a toast reading
    *"Cannot read properties of undefined (reading 'data')"*.
  - **A second defect fell out of that work**: the app's `<rv-toast-list>` had
    no `[manager]`, so the list was in presentational mode with an empty
    array — **no toast had ever appeared in this app**. Every toast the app
    had been showing was going nowhere. The list is now managed, and the
    app's own "Signed in as …" toast appears for the first time.

## 2026-10-19 — D49: the release set — what changed, what the versions are, and what is still open

- **The version set**, chosen by what actually changed, not by convenience:
  | Package  | From  | To     | Why                                                             |
  | -------- | ----- | ------ | --------------------------------------------------------------- |
  | `select` | 0.5.0 | 0.6.0  | The popup rename and `[menuLabel]` → `[popupLabel]` are breaking. |
  | `modal`  | 0.5.3 | 0.6.0  | The forced scheme blocks are gone, and `size`/`coversOthers` are new. Behaviour changed. |
  | `toast`  | 0.4.2 | 0.5.0  | The list became a top-layer popover. Behaviour changed.            |
  | `menu`   | 0.3.4 | 0.3.5  | The RTL panel fix. A bug fix, so a patch.                            |
  | `theme`  | —     | 0.1.0  | New package.                                                      |
  Pre-1.0 rule from `AGENTS.md`: a minor bump is a breaking change, a patch is
  a bug fix.
- **The published 0.5.0 of `@rivinia/select` had MORE public API than the
  local source** — it was built from the 0.5.0 branch, while the work
  continued on the 0.4.2 base. Publishing the local source as-is would have
  REMOVED `computeSelectPosition`, `SELECT_GAP`, the position types and
  `setValue`/`setValues` from the public surface. They were restored before
  the release, and the position helper is exported under its 0.5.0 name
  (`computeSelectPosition`, `SELECT_GAP`, `PanelCoordinates`, `PanelSize`,
  `SelectPlacement`, `TriggerRect`, `ViewportSize`), so 0.6.0 is a strict
  superset of 0.5.0 rather than a regression.
- **A toast now floats above a modal dialog.** The list is a manual popover,
  so it is in the browser's top layer — the layer a `<dialog>` uses — and it is
  re-shown whenever its contents change, because the top layer stacks in the
  order elements are SHOWN. Measured: the element at the toast's position is
  the toast, not the dialog.
  - The popover's **user-agent styles are reset** (background, border, padding,
    `overflow`). Left alone they put a shared canvas and a scrollbar around the
    stack, so five toasts read as one block.
  - Two traps found by measuring, not by reading: `showPopover()` on an
    element that is not a popover yet throws `NotSupportedError`, so the
    attribute is set imperatively as well as by the binding; and
    `inject(ElementRef)` in a component yields the HOST element, so the
    popover has to be the panel — a `viewChild` — not the host.
- **The dialog** gained a per-instance `size`, a `coversOthers` flag, a
  `loadingOf` loader, responsive `clamp()` presets, a `data-caller` attribute
  naming the component that opened it, a box transition, and a view transition
  for the stack change.
- **The select** gained the DI helpers (`provideRiviniaSelect` /
  `injectRiviniaSelect`), frozen registered options, `optionTemplate`,
  `listTemplate`, `loading`, `reachEnd`, a footer slot, and a single
  `--rv-select-popup-animation` token.
- **The consumer app** stopped masking unexpected errors: only an
  `HttpErrorResponse` becomes an `ApiError`; anything else is reported
  through Angular's `ErrorHandler` — which the app replaced with one that
  logs AND shows a toast — and then rethrown. Its `<rv-toast-list>` also had
  no `[manager]`, so **no toast had ever appeared in that app**; that was
  found while wiring the error handler, and fixed.
- Gates: all eight packages build; 70/70 select, 32/32 menu, 53/53 modal,
  35/35 toast; every tarball inspected (exports, types, peers, sideEffects,
  file list) with **zero runtime imports** beyond the declared peers; the
  tarballs installed into a consumer as real npm packages and built.
- **Not published** — the tarballs are in `pack/` and await the user's
  explicit confirmation (name, version, access, file list), per `AGENTS.md`
  gate 7 and D05.

## 2026-10-20 — D50: one layout for every package, and a `tests/` folder outside the source

- Context: `@rivinia/select/ui` and `@rivinia/menu/ui` had been organised into
  `components/ models/ services/ utils/` (D40), while every other package —
  and every CORE entry point — kept its types, its controller, its helpers, its
  provider and its pipe side by side in one flat `src/lib/`. The UI entry
  points of `@rivinia/modal` and `@rivinia/toast` also carried their template
  and their CSS inline, while select and menu used `.html` / `.css` files. A
  reader who knew one package did not know the others, and the specs of a
  package were scattered across `src/lib/`, `src/ui/` and `ui/src/`.
- Decision: **every package follows the same layers**, and **the specs live in
  a `tests/` folder outside the source the package ships**:

  ```
  src/lib/models/       the types and the contracts — no behaviour
  src/lib/services/     the classes that DO something (the headless controller,
                        a loader, a strategy, a view-transition helper)
  src/lib/utils/        pure functions and pure math
  src/lib/providers/    provide*() and inject*()
  src/lib/pipes/        the pipes
  ui/src/lib/components/<name>/   the .ts, the .html and the .css together
  tests/                the specs
  ```

  - The classification rule is by BEHAVIOUR, not by file name: an interface or
    a type is a model; a class that does something is a service; a function
    with no state is a utility.
  - The specs moved OUT of `src/` on purpose: `src/` now holds only what the
    package ships, which is what makes the boundary reviewable. The unit-test
    builder globs from the project's `sourceRoot`, so the test target's
    `include` in `angular.json` now points at `../tests/**/*.spec.ts` — the
    glob has to leave the source root to reach them. The `tsconfig.spec.json`
    compiles them.
  - `@rivinia/modal` and `@rivinia/toast` moved their inline template and CSS
    into `templateUrl` / `styleUrl`, matching select and menu. The content
    moved VERBATIM: the extracted blocks were diffed against the originals
    before the change.
- **The public API is unchanged.** The same symbols are exported from the same
  entry points; the `exports` map only ever exposed `.` and `./package.json`,
  so no consumer could reach an internal path. Verified by comparing the
  exported symbol sets of every `public-api.ts` against `HEAD`: identical for
  all eleven entry points.
- Alternatives rejected: leaving the specs beside their subject (the Angular
  default) — it would have kept test code inside the shipped tree; splitting
  a file across layers (e.g. `i18n-config.ts` holds both a config type and a
  DI token) — the churn would have bought nothing; renaming the files to match
  their layer — a move alone already gives the structure, and renames would
  have doubled the diff.
- Also removed: the workspace root referenced two `proof-*` projects that no
  longer exist. The dangling references broke the build of every package that
  loaded the root tsconfig, and the error named a file that was not there.
- Verified: 8/8 packages build; http 39 · i18n 52 · modal 53 · toast 35 ·
  menu 40 · select 71 tests pass, the same counts as before the move; the
  schematic suite passes; the packed tarballs and a clean consumer are
  verified separately.
- **A trap worth recording:** `git checkout <commit> -- <path>` ADDS the
  files of that path and never removes the ones the path no longer holds. The
  per-package branches were built with it, so the old flat files came back
  with the merge and every package carried two copies of the same module.
  The bundle was never affected — the duplicates are unreachable from the
  entry point, so the tree-shaker dropped them — and the packed tarballs came
  out byte-identical before and after the cleanup. Only the source tree was
  wrong, and only a human reading the tree could tell. A move must be done
  with `git mv`, or with an explicit `git rm` of the old path.

## 2026-10-25 — D51: `@rivinia/datepicker` — headless Gregorian calendar + themed picker

- Context: the ecosystem had no date primitive. The brief: Arabic and English,
  LTR and RTL, Gregorian dates, configurable output formats, the Rivinia theme,
  headless core plus ready-made UI — specs first, then implementation.
- **The core is `Date`-free**, except the two functions that must cross the
  local-time boundary (`todayDate()`, `toLocalDate()`). Days are integer
  `{year, month, day}` values and all movement is civil-calendar arithmetic
  (Hinnant's days-from-civil), so no timezone or DST can shift a date.
  - `toLocalDate` builds `new Date(2000, m - 1, d, 12)` and then
    `setFullYear(year)`: a two-digit year passed to the constructor maps to
    1900+ (`formatYear(locale, 5)` returned `1905`, measured), and noon keeps
    a ±12h zone shift from changing the day.
- **Formatting**: one `format` input, two modes.
  - A style keyword (`short|medium|long|full`) maps to `Intl.DateTimeFormat`'s
    `dateStyle` — date only. Measured: en-US short `10/25/26`, medium
    `Oct 25, 2026`; ar-EG medium `٢٥‏/١٠‏/٢٠٢٦`, long `٢٥ أكتوبر ٢٠٢٦`.
  - A pattern (`MM-dd-yyyy`, `dd/MM/yy`, …) is parsed and formatted per token
    through `Intl` parts. **Case-insensitive, width is the letter count**;
    `mm` is month. Time letters (`h,H,k,K,s,S,a,A,X,Z,z,O,v,V,b,B`) throw a
    date-only error instead of being silently dropped; `ddd` throws with an
    "use EEEE" hint. Non-ASCII letters are literals; `''` escapes a quote.
  - **`DatePipe` rejected, measured reasons**: its four presets all include
    time; its pattern letters include time (so `dd/MM/yyyy` is ambiguous);
    it does not produce Arabic-Indic digits; its bidi marks vary by locale.
    The library inserts no invisible marks the formatter did not emit —
    `Intl`'s output is authoritative.
  - The calendar is pinned to `-u-ca-gregory` by rewriting the locale's
    Unicode extension key/value pairs (a regex broke
    `ar-SA-u-ca-islamic-umalqura`, whose calendar value spans two subtags).
    **Measured: `ar-SA` formats as Gregorian here** (no default Hijri), so the
    Hijri seam test pins the opposite direction explicitly:
    `ar-SA-u-ca-islamic-umalqura` renders ١٤٤٨ unpinned and ٢٠٢٦ pinned.
    A Hijri GRID is out of scope for 0.1.0; the formatting seam is the hook.
  - Formatters are cached (bounded Map, 40 entries): a day view asks for 42
    day labels plus 7 weekday names per render.
- **Week start** comes from CLDR via `Intl.Locale.getWeekInfo()`, then the
  legacy `weekInfo`, then ISO Monday. Measured: `en-US` 7/[6,7], `en-GB` 1,
  `ar-EG` 6/[5,6], `ar-SA` 7/[5,6], `he` 7/[5,6], `fa` 6/[5], `fr` 1.
- **RTL mirrors the horizontal arrows and nothing else.** In a right-to-left
  grid the next day is drawn to the left, so `ArrowLeft` moves FORWARD and
  `ArrowRight` moves BACK; Up/Down, Home/End, PageUp/Down and Shift+Page are
  never mirrored. Direction is read at keydown from the nearest `[dir]`
  attribute first, then `getComputedStyle(...).direction` (jsdom does not
  inherit computed direction).
- **The component follows the ecosystem's form contract**: `value` is a
  `model()`, so it satisfies `FormValueControl` (the documented Angular 22
  interface `@rivinia/select` already implements) and `touch` is the touched
  protocol. A `ControlValueAccessor` was tried first and removed: Angular 22
  auto-detects any component with a `value` input + `valueChange` output as a
  custom control (measured in `initializeCustomControlStatus`), so with a plain
  input the CVA was dead code and `touched` never fired; with
  `NG_VALUE_ACCESSOR` the classic path won but Signal Forms' `[formField]`
  would have had no model signal. `valueChange` belongs to the model and emits
  only when the value really changes; a form writing the value in does not echo
  (model input writes go through `inputSignalSetFn`, verified in core).
  `touch` fires when the panel closes (a pick returns focus to the trigger, so
  a focusout would never happen) and when focus leaves the host.
  `@angular/forms` stays a peer because the published `.d.ts` imports
  `FormValueControl` from `@angular/forms/signals`; the FESM imports no forms
  code at all.
- **State**: `rv-datepicker` provides its own `RiviniaCalendar`, so two pickers
  never share a focused day; `rv-calendar` owns no state and takes the service
  as an input (D06 input composition). The panel is non-modal, uses the top
  layer where available (`popover="manual"` + CSS anchor positioning with
  logical keywords) and an absolute fallback elsewhere; Escape closes and
  restores focus, an outside pointerdown closes without stealing focus (D36).
- **Packaging, and a D06 exception**: the UI entry imports the core through the
  **package specifier** `@rivinia/datepicker`, not a relative path, because the
  UI genuinely needs the service and the pure helpers. ng-packagr accepted it
  (D06's TS6059 problem was relative cross-entry imports). Exports map: `.`
  and `./ui` only. Dist FESM imports: core → `@angular/core`; UI →
  `@angular/core` + `@rivinia/datepicker`. Zero `tslib` imports. Tarball:
  8 files (the D20 injected dependency entry is expected).
- **Three defects that only a real browser exposed** (jsdom has no layout and
  does not forward label clicks):
  1. **The panel filled its anchor area.** `position-area: block-end
     span-inline-end` makes an auto-width box span from the anchor's
     inline-start to the containing block's inline-end — measured 1006px for a
     290px trigger. `width: max-content` is not an escape hatch: the day grid
     is `inline-size: 100%`, so max-content is cyclic (measured 1,000,018px).
     Fixed with an explicit token width (`--rv-datepicker-panel-width`,
     19.25rem = 7 × 2.5rem cells + gaps + panel padding) capped by
     `max-inline-size`. Measured after: 308px, 0px offset from the trigger in
     LTR and RTL, 4px gap.
  2. **A `<label>` around the picker re-opened the panel after every pick.**
     Clicking inside a label makes the browser forward a synthetic click to
     the label's control — the trigger — so `toggle()` ran right after
     `closePanel()` (measured with a click-event trace: two clicks, the second
     targeting the button). The panel now cancels the default action of its own
     clicks; measured fix: inside a label, picking closes the panel and updates
     the value. The README documents the sibling-label markup as the clean
     option, and a new `label` input puts the field name into the trigger's
     accessible name ("Departure: ٢٥/١٠/٢٠٢٦").
  3. **The popover margin reset killed the gap.** `.rv-datepicker-panel[popover]
     { margin: 0 }` and the placement rule have the same specificity, so the
     gap was restored in a later `@supports` rule of the same specificity.
     Measured 4px below and 4px above after flipping.
- **A repo-level lesson, recorded because it cost a cycle**: in Angular 22's
  zoneless test host, mutating a PLAIN field and calling
  `fixture.detectChanges()` does not update a binding — a signal does. Four
  "RTL is behaving like LTR" failures were the test host, not the library.
- Verified: **380/380 unit tests (11 files)** — core date math, week info,
  styles, patterns, month grid, key intents, the service, calendar UI,
  datepicker UI, reactive + template-driven forms, and the published export
  surface; `ng build datepicker` (both entry points); tarball inspected
  (exports/types/peers/sideEffects/files/FESM imports); installed into a fresh
  Angular 22 app created for this check and built in production
  (**215.32 kB raw / 59.73 kB transfer**); and the real-browser run (Chromium,
  production and dev builds) covering the popover path, the 308px panel,
  the 4px gap, RTL alignment and arrow direction, flipping above at the
  viewport edge, picking inside a `<label>`, and focus returning to the trigger.
- NOT published. Version **0.1.0** (new package). Deliberately out of scope,
  each additive: a typed input with segments, range selection, presets, time,
  a Hijri grid, pattern PARSING, year-view virtualisation.

## 2026-10-25 — D52: datepicker second pass — clear, per-picker isolation, three form APIs, a theme input, and one width

- Context: after D51 the user tested the package and reported four concrete
  things: a date cannot be cleared; two adjacent pickers behave as ONE (opening
  a second must not leave two panels); only one form system was demonstrated;
  and the light/dark theme must be reachable from the public API. The panel also
  had to respect the parent's width and keep a minimum width.

- **Two pickers, one panel — reproduced, then fixed.** Before the fix, opening
  the second picker by KEYBOARD (Enter on its trigger) left both panels open in
  Chromium. A pointer-only fix would have missed it: keyboard activation emits
  no pointer event, so the outside-pointer close never runs.
  - Fix: `DatepickerPanelRegistry`, a root service in the UI entry (internal —
    no export, no public name), with `claim(handle)` / `release(handle)`; the
    opening picker claims, the loser is closed with `closeForAnotherPanel()`,
    `DestroyRef` always releases.
  - Measured after: keyboard-open the second → one panel, the second; pointer
    open the third → one panel, the third; Escape → focus returns to the third
    trigger; `panels: 1` at every step in both dev and production builds.
  - Auto-close emits `touch` (the user's interaction with the first field did
    end) but never restores focus (the user is now in another field).

- **Clear.** Opt-in, because a required date must not present a button that
  makes it look optional: `clearable` in `provideRiviniaDatepicker(...)` and as
  an input; an unbound input takes the config. A real `<button>` inside the
  field, after the trigger, visible only while a value exists and the picker is
  enabled.
  - Clearing sets `null`, emits `valueChange(null)`, emits `touch`, closes an
    open panel, and returns focus to the trigger — the button disappears with
    the value, so focus must not stay on a removed node.
  - Accessible name includes the field: `Departure: Clear date`;
    `المغادرة: مسح التاريخ` in Arabic (measured in the browser).
  - One focus ring for the whole field: `:focus-within` on the wrapper; the
    trigger and the clear button draw none of their own, so keyboard and mouse
    produce the same visual and there is no box-in-a-box.

- **Signal Forms join reactive and template-driven.** The component already
  satisfied `FormValueControl` (`value` model + `touch` output, D51); this pass
  proved all three in the same consumer application: a reactive
  `FormControl<RiviniaDate | null>`, `[(ngModel)]`, and the new
  `form()` + `[formField]` API. Picking a day in the Signal Forms demo wrote
  `Monday, 12 October 2026`; `ngModel` wrote `2026-10-20`; the reactive clear
  set `null` and `touched: true`. No second code path exists for forms.

- **A theme input, not a stylesheet swap.** `theme: 'auto' | 'light' | 'dark'`
  in the provider config and as an input (input wins; an unbound input keeps the
  config). The host mirrors it as `data-theme`, so a theme layer that maps
  `[data-theme='dark']` reaches the picker.
  - `light`/`dark` set `color-scheme` on the host; `auto` declares NOTHING and
    inherits the page's scheme — no forced scheme, the D46 rule.
  - The built-in palette is `light-dark()` read at the use site, never declared
    on the host, so `--rv-*` tokens still win. Measured in the browser:
    auto/light `rgb(255,255,255)` / `rgb(17,17,17)`; dark `rgb(24,24,27)` /
    `rgb(244,244,245)` with the selected day `rgb(139,139,240)`; and a custom
    token pair produced `rgb(240,253,250)` / `rgb(15,61,58)` with
    `data-theme="auto"`.

- **One width, measured rather than reasoned.** The first implementation put
  `min-inline-size: min(11rem, 100%)` on the field inside a shrink-to-fit
  inline-block host; Chrome collapsed it to the content width — measured
  **132px**, not 176px. A `min-width` plus `max-width: 100%` cannot both hold
  (the minimum wins and overflows — the D47 lesson), so the field takes ONE
  definite width and lets the cap win:
  - host: `inline-size: var(--rv-datepicker-width, 11rem)`,
    `max-inline-size: 100%`;
  - field: `inline-size: 100%` of that width.
  Measured in Chromium: default field **176px**, panel **308px** (the floor);
  a 25rem block field **400px** → panel **400px** with the calendar still
  **308px**, centred (x=302 inside a 256–656 panel); a 7rem cell → field
  **112px**, overflow **0**; RTL field **224px** (a 14rem override), panel
  **308px**, end-aligned, **4px** gap; a 380px viewport → panel **308px** at
  x=32..340, inside the viewport.
  - Panel rules are unchanged in shape: `max(100%, 19.25rem)` on the absolute
    fallback, `max(anchor-size(inline), 19.25rem)` when anchored, capped by
    `--rv-datepicker-panel-max-width` (`100vw - 1rem`).
  - Not one of those numbers is a unit test: jsdom has no layout. They come
    from the probe.

- Verified: **395/395 unit tests (11 files)**, including the new isolation,
  clear (two-way, reactive, label), theme, Signal Forms, and public-export
  specs; `ng build datepicker`; tarball **8 files / 61.0 kB**; the consumer app
  built in **production** (**266.21 kB raw / 71.24 kB transfer** for that demo
  page — it now imports reactive forms, Signal Forms, and 21 pickers, so this
  is not comparable to D51's 215 kB figure); and the full Playwright probe in
  production: isolation by keyboard and pointer, clear (two-way، reactive,
  inside a `<label>`), Signal Forms and `ngModel`, the four theme cases, the
  four width cases, RTL alignment/gap/arrows and the Arabic clear name — zero
  console errors.
- NOT published, NOT committed. Version remains **0.1.0** (the new surface is
  additive to an unpublished package).

## 2026-10-25 — D53: date + time — research and design, NOT implemented

- Context: the user asked whether the picker will support date + time, and
  required that time be an extension of the SAME panel ("لا تكسره وتعيده"),
  that the panel respect the parent width, and that it keep a minimum width.
  This entry records the research and the design. **No time code exists in
  `projects/datepicker/`.**

- Sources consulted (2026-10-25):
  - PrimeNG 22.1.4 `DatePicker` — `showTime`, `hourFormat`, `timeOnly`,
    per-unit spinner buttons with `aria-label`s (`prevHour`, `nextMinute`,
    `am`/`pm`), popup `role="dialog"`, grid roles, `selectionMode`.
  - ng-zorro 22.1.2 `DatePicker` — `nzShowTime`, `nzOnOk`, `nzShowNow`,
    `nzDisabledTime`, the "Now"/"Today" footer.
  - Ant Design 6 `TimePicker` — `needConfirm` (commit only on confirm),
    `hourStep` / `minuteStep` / `secondStep`, `use12Hours`, `showNow`,
    `renderExtraFooter`.
  - MDN `<input type="datetime-local">` — value is always `YYYY-MM-DDTHH:mm`,
    no time-zone/locale control, browser-owned UI, `size` does not apply.
  - W3C APG **Spinbutton** pattern — the keyboard/ARIA model for a time field.
  (MUI X and the Material 3 spec did not load in this environment; nothing in
  this entry is attributed to them.)

- **Native input rejected** for the same reasons the date half already rejects
  it: the displayed format and the UI belong to the browser, so it cannot follow
  the package's tokens, its RTL rules, or the panel rules above.

- **Design: the time is a row inside the existing panel.**
  ```
  ┌────────────────────────────────────────────┐
  │  ‹        October 2026        ›   [Today]  │
  │  Mo Tu We Th Fr Sa Su                      │
  │  …              day grid …                 │   never unmounted
  ├────────────────────────────────────────────┤
  │  [ 09 ] : [ 30 ]  [AM|PM]   [Now]   [OK]   │   the time row
  └────────────────────────────────────────────┘
  ```
  - Same panel element, same popover/anchor, same border/shadow/tokens — the
    row is added, the panel is not rebuilt or replaced by a second step.
  - The day grid stays mounted while the time row is used, so focus and the
    visible month are preserved.

- **Commit is explicit.** A time makes the value incomplete, so a day click
  updates a DRAFT; `OK` commits date and time together and closes; Escape or an
  outside click discards. (`needConfirm` in Ant Design is the same rule.)
  `Now` fills the draft and does not commit.

- **Typed API.** A separate `rv-datetimepicker`, not a `showTime` flag on
  `rv-datepicker`: `RiviniaDate` and `RiviniaDateTime = { date, time }` are
  different types, and a union-typed model would push a narrowing check into
  every consumer. The UI guarantee is unaffected because the panel parts
  (`rv-calendar`, a new `rv-time-row`) are shared inside the same shell.
  - `RiviniaTime { hour: 0–23; minute: 0–59; second: 0–59 }` always carries
    seconds; `showTime: 'minutes' | 'seconds'` decides what is editable and
    formatted.

- **Time controls are spinbuttons, not dials or 60-row lists.** Per APG:
  `role="spinbutton"`, `aria-valuenow/min/max`, localized `aria-valuetext`,
  Up/Down ±1, PageUp/PageDown ±step, Home/End, and a digit buffer for direct
  entry. A clock dial has no APG pattern, mirrors awkwardly in RTL, and is
  pointer-heavy; two 60-option listboxes add 120 nodes and long scrolling.
  The meridiem is a two-button `aria-pressed` group; 12/24h comes from the
  locale's `Intl` `hourCycle` (`hour12: 'auto'`), never hardcoded.

- **Width — the explicit rules, unchanged where they already exist.**
  - Panel: `max(field, 19.25rem)`, capped by `100vw - 1rem`, 4px gap, logical
    anchor alignment — exactly D51/D52.
  - Time row: `display: flex; flex-wrap: wrap; min-inline-size: 0`, every child
    shrinkable. Its natural width is below the 19.25rem floor, so time never
    widens the panel; at large text or 320px it wraps and the panel grows in
    BLOCK size only, never beyond the parent/viewport inline size.
  - The day grid keeps `--rv-calendar-width` and stays centred.

- **Formatting.** `format` stays the date; `timeFormat` accepts `'short'` /
  `'medium'` or a pattern (`HH:mm`, `hh:mm a`). The trigger joins both through
  `Intl.DateTimeFormat({ dateStyle, timeStyle })` so the locale's separator,
  digits and bidi marks are used; `formatTime(locale, time, …)` is exported from
  the headless entry. The date-only picker keeps REJECTING time tokens.

- **Timezone/DST seam.** The core stores civil date + time and never constructs
  a `Date`; a spring-forward gap cannot be validated here. The app converts to
  an instant (`Temporal.ZonedDateTime` where available) — the same seam D51
  documents, not a new one.

- Planned tests are listed in the README (core arithmetic/formatting,
  spinbutton keys, draft/commit/discard, RTL, width with the row wrapped, and
  the browser pass). Status: **designed, not started**; no version is promised
  for it.

## 2026-10-25 — D54: consumer playground, the RTL anchor defect it exposed, and Angular 22's `ngModel` validator gap

- Context: after D52 the package needed to be exercised the way a consumer uses
  it, not only by the unit suite. A playground was built in `tmp/consumer`
  (gitignored, outside the workspace, installed from the packed tarball, public
  entry points only): one shared value across **eight formats**
  (`short|medium|long|full`, `dd/MM/yyyy`, `yyyy-MM-dd`, `dd.MM.yy`,
  `EEEE, d MMMM yyyy`), a Reactive Forms card (`FormGroup`,
  `Validators.required`, submit/reset/disable), a Template-Driven card
  (`ngModel`, touched/dirty, reset), a Signal Forms card (`form()` +
  `[formField]`, `required()`), plus min/max bounds, a disabled picker, a
  pinned-dark picker, a default-vs-full-width pair, and a toolbar that switches
  **English/العربية** and **Light/Dark/Auto**.

- Verified in Chromium against the consumer's **production** build (`ng build`,
  292.82 kB raw / 76.36 kB transfer for the playground): en-GB renders
  `25/10/2026`, `25 Oct 2026`, `25 October 2026`, `Sunday, 25 October 2026`,
  `25/10/2026`, `2026-10-25`, `25.10.26`, `Sunday, 25 October 2026`; ar-EG
  renders `٢٥‏/١٠‏/٢٠٢٦`, `٢٥‏/١٠‏/٢٠٢٦`, `٢٥ أكتوبر ٢٠٢٦`,
  `الأحد، ٢٥ أكتوبر ٢٠٢٦`, `٢٥/١٠/٢٠٢٦`, `٢٠٢٦-١٠-٢٥`, `٢٥.١٠.٢٦`,
  `الأحد, ٢٥ أكتوبر ٢٠٢٦` (the ASCII comma in the last row is the pattern's
  literal, not Intl's). The Arabic panel weekdays are `س ح ن ث ر خ ج`
  (week starts Saturday), one panel is open at a time, Escape closes it, and
  clearing one picker clears all eight (shared `[(value)]`). Dark applies to
  field `rgb(24, 24, 27)`, text `rgb(244, 244, 245)`, panel and selected day
  `rgb(139, 139, 240)` while the page is light. Widths: default field 176px →
  panel 308px (the 19.25rem floor); a full-width field 367px → panel 367px.
  Reactive `required` keeps submit disabled until a pick, submit shows the
  submitted state, and `control.disable()` reaches the picker
  (`data-disabled="true"`); Signal Forms `required` reports `valid no` before
  and `valid yes` after; Template-Driven reset clears the control, the value
  and the submitted flag. Zero console errors.

- **A real defect the playground exposed (fixed before this entry):** in an
  RTL page the anchored panel grew toward the page's **inline-start** and sat
  over its own row's label. Measured: field `x=940…1179`, panel
  `x=940…1248` — the panel's **left** edge matched the field's left edge (its
  inline-end), while the LTR case put the panel's left edge at the field's
  left (inline-start). The cause is Chromium resolving
  `position-area: block-end span-inline-end` **physically**: the computed
  value is `span-end` in both directions, so the position area became
  `[anchor inline-end → containing block inline-start]`, an LTR-shaped area.
  The absolute fallback was already correct because
  `inset-inline-start: 0` is logical. Fix: one direction-scoped rule —
  `:host(:dir(rtl)) .rv-datepicker-panel { position-area: block-end
  span-inline-start; }` — which puts the panel's inline-start edge on the
  field's inline-start edge, extending toward the inline-end. Measured after:
  field `940…1179`, panel `871…1179`, gap **4px**, inside the viewport; LTR
  unchanged (`260…568`, gap 4). The 4px gap is a real margin once the entrance
  animation settles; measuring immediately after `waitForSelector` catches the
  animation mid-flight and reads ~0–1px.

- **Angular 22.2.2 finding, documented rather than worked around:**
  `NG_VALIDATORS` do not run for a value-model custom control bound with
  `[(ngModel)]`. In the installed `@angular/forms` FESM, `NgControl` sets
  `isCustomControlBased` and `_setupWithForm()` calls `setupCustomControl()`,
  which never calls `setUpValidators()`; only `setUpControlValueAccessor()`
  does. Measured in the playground: a plain `<input required>` in the same
  form reports `errors: { required: true }` while the picker's `NgModel`
  reports `errors: null` even though `_rawValidators` contains
  `_RequiredValidator`. Reactive Forms and Signal Forms validate normally.
  Decision: do not add a `ControlValueAccessor` (D51 removed one deliberately;
  it would break the value-model/Signal Forms path). The README's Forms
  section now states the limitation and the two supported options (validate in
  the submit handler, or use a reactive control carrying the validators); the
  playground's template card does exactly that.

- Version stays **0.1.0** (unpublished). After the CSS fix: `ng build
  datepicker`, 395/395 tests, tarball rebuilt and installed into the consumer;
  the README note required one more build + pack. Final tarball: 8 files,
  65.7 kB, npm shasum `d55769ff64726329601ad61718c337b7e8a65a18`, sha256
  `c7d3b35b04f51e4386ed9955fe31108a84d1075fab336e8d8eb6bf1a1ecf8462`.
  The consumer build and the browser run are the evidence for the RTL
  placement — jsdom has no layout, so it cannot be a unit test.

## 2026-10-25 — D55: date + time in the same panel, and time zones made explicit

- Context: D53 designed date + time and time-zone handling but shipped nothing.
  The user chose to finish both before the first publish. The panel had to stay
  one panel (not a second step), respect its parent width, keep a minimum
  width, and remain usable from Reactive Forms, `ngModel` and Signal Forms.
- **The value model.** `RiviniaDateTime = { date: RiviniaDate; time:
  RiviniaTime }` is civil: no zone, no offset, no implicit instant.
  `RiviniaTime` always carries `second` (0–59), even when the row does not edit
  it; two shapes for the same fact would be a compatibility trap. A separate
  `<rv-datetimepicker>` (not a `showTime` flag) keeps `RiviniaDate` and
  `RiviniaDateTime` distinct, so no consumer needs a narrowing check. The
  panel parts are shared: the same `<rv-calendar>` and panel shell, with
  `<rv-time-row>` below the grid.
- **One panel, draft + explicit commit.** A day click or a time edit updates a
  draft; `OK` commits both halves and closes. Escape or an outside click
  discards. The calendar is never unmounted while the time is used, so the
  visible month, the focused day and the selected date survive. `Now` fills the
  draft (in the selected zone when one is set) and does not commit. This is the
  Ant Design `needConfirm` rule: a date + time is incomplete until time is
  confirmed.
- **The time controls are APG spinbuttons**, not a clock dial: Arrow ±1,
  PageUp/PageDown ±`minuteStep` on minute/second (±1 on hour), Home/End,
  direct typing with clamping and padding, Enter commits. A two-button
  `aria-pressed` group is the meridiem. The locale's `Intl` `hourCycle` and
  day periods decide 12/24h and `AM`/`م`; `hour12` overrides. Digits are
  localized (`٠٩:٣٠`).
- **Formatting is two independent halves.** `format` remains date-only and
  still rejects time tokens; `timeFormat` accepts `short`, `medium` or a
  case-sensitive time pattern (`HH:mm`, `hh:mm a`, `HH:mm:ss`). Mixing a
  24-hour token with `a` (or with `h`) throws instead of guessing; `M`, `S`,
  `A`, `k`, `K`, date and zone letters throw with an actionable message.
  `formatDateTime` uses one `Intl.DateTimeFormat({dateStyle,timeStyle})` when
  both halves are styles; otherwise it joins with the locale's date-time
  connector (` في ` in Arabic, a comma elsewhere).
- **Time zones are a resolver, not a dependency.** `resolveWallTime(value,
  zone, disambiguation?)` uses `Intl` only; there is no Temporal dependency and
  no bundled tzdata. It returns `unique`, `ambiguous` or `nonexistent`, with
  every candidate's `instant`, `offsetMinutes` and actual wall time.
  `compatible` (default) takes the earlier instant for an overlap and the later
  wall time for a gap; `earlier`/`later` are explicit; `reject` throws.
  `wallTimeInTimeZone`, `getTimeZoneOffsetMinutes`, `nowInTimeZone`,
  `todayInTimeZone`, `isValidTimeZone` and `listTimeZones` complete the
  surface. The picker never stores an instant: it shows the zone's offset and
  name, warns on a gap or overlap, offers the overlap offsets and the real
  post-gap wall time as an explicit `Use …` action, and emits
  `{ value, timeZone, resolution }` on commit **only when the zone is valid**.
  An invalid zone warns and emits nothing. A time that crosses a gap is still
  civil until the user adopts the suggestion; if they press `OK` anyway the
  resolution is reported as `nonexistent`, never silently moved.
- **Width.** The datetime field defaults to `15rem` (`--rv-datetimepicker-
  width`) with the same parent cap as the date field. The panel keeps the
  date picker's `19.25rem` floor, follows a wider field, and is capped by
  `100vw - 1rem`. The time row is a wrapping flex row; it is below the floor's
  width and cannot widen the panel; if forced it wraps in the block direction.
- **`FormValueControl` and bounds.** The datetime picker implements
  `FormValueControl<RiviniaDateTime | null>` with `value` + `touch`, like the
  date picker. Its `min`/`max` inputs are therefore typed
  `RiviniaDateTime | undefined` (a `RiviniaDate` bound would not satisfy the
  interface); the calendar uses their `.date`, and the time half is not
  bounded. All three form APIs bind the whole value; a form write while the
  panel is open updates the calendar and the draft, while a draft edit does not
  echo into the form. The Angular 22 template-driven validator gap documented
  in D54 applies unchanged.
- **`config.today` on open.** The date/time opener reads
  `provideRiviniaDatepicker({ today })` before the zone/local clock, so the
  visible month and today marker are deterministic under SSR pinning. Added a
  regression test with a zone set (`today: 2026-03-09` opens March 2026).
- Deliberately out of 0.1.0: a time-zone picker, time bounds, a time-only
  picker, range/presets, typed date segments, date-pattern parsing, a Hijri
  grid, year-view virtualisation, and Firefox/WebKit/SSR proof.
- Verified in this session (2026-10-25):
  - **444/444 unit tests in 14 files** (up from 395/395 before the time work),
    including the 15 core time/zone cases, the 21 datetime UI cases, and the
    three datetime form APIs.
  - `ng build datepicker` (both entry points); tarball **8 files / 111.2 kB**,
    shasum `3bc37e8d8b67ee6c6cf6a9dee650ff93c48931fb`, SHA-256
    `98f244d5098d98f7a39f3bb00a3c0910c63842058d0edb573a5cfe40cf0147b5`.
    Dist FESM imports only `@angular/core` (core) and
    `@angular/core` + `@rivinia/datepicker` (UI); no `tslib` import;
    `@angular/forms` is a type-only peer import for `FormValueControl`.
  - Installed the tarball into the consumer playground, production build
    **357.63 kB raw / 86.65 kB transfer** (the demo now carries date, datetime,
    zones, DST presets and forms, so this is not comparable to D54's date-only
    figure).
  - Chromium against that production build, zero console errors:
    - four shared datetime formats rendered `25 Oct 2026, 15:30`,
      `25/10/2026, 15:30`, `Sunday, 25 October 2026, 03:30 pm` and
      `2026-10-25, 15:30:00`; editing the first to `16:45` left all triggers
      unchanged until `OK`, then all four changed; the calendar stayed mounted
      and the heading was unchanged while typing; Escape discarded.
    - date and datetime pickers share the one-panel registry (opening a
      datetime closed a date; one panel).
    - Reactive datetime showed `12 Oct 2026, 09:45` with touched/valid yes;
      `ngModel` showed `2026-10-20T09:45:00`; Signal Forms showed a valid,
      touched value on 15 Oct.
    - `Africa/Cairo` line `Africa/Cairo · EEST · GMT+3`; New York resolved
      `-240` at `2026-10-25T19:00:00.000Z`. The Cairo overlap offered
      `EEST GMT+3` / `EET GMT+2`, choosing the second resolved
      `ambiguous`, offset `120`, `2026-10-29T21:30:00.000Z`. The Cairo gap
      warned about 24 Apr 2026 01:30; `OK` reported `nonexistent`, offset
      `180`, `2026-04-23T22:30:00.000Z`; `Use 01:30` removed the warning and
      committed `unique` with the same instant.
    - widths, measured: default field **240px**, panel **308px**, time row
      **290px** with no overflow (panel client/scroll 306/306); full-width
      field and panel **1211px**; at a **320px viewport** the panel was
      **304px** starting at x=16, the field 235px, and neither the panel nor
      the time row overflowed (302/302 and 286/286). The first narrow run
      exposed a **demo-only** 21rem grid track; the demo was fixed, not the
      library.
    - Arabic: `dir=rtl`, Arabic digits/names, time fields computed `ltr`,
      meridiem `ص`/`م`, `OK` = `موافق`; the panel opened **above** the field
      with a **4px** gap, start-aligned, inside the viewport, 308px wide.
    - Dark: scheme `dark`; field, panel and time input `rgb(24,24,27)`, text
      `rgb(244,244,245)`, selected day `rgb(139,139,240)`.
    - axe-core on `#datetime`, `#zones` and `#datetime-forms`: **zero**
      violations; the old date-only playground pass also stayed green.
  - The package is **not published**. Version remains **0.1.0** (the name is
    new; the registry returns 404). Firefox/WebKit and SSR were not run and are
    not claimed. npm auth is currently absent on npmjs (the default registry is
    the mirror), so a publish requires a login and explicit user confirmation.

## 2026-10-25 — D56: pointer time tray, panel exit motion, fixed UTC offsets

- Context: D55 shipped date + time in one panel. Three follow-ups were
  reported: a pointer/touch user should not have to type or use arrow keys;
  the panel should open AND close with motion, and dismiss the way a
  non-modal popover does; and a developer must be able to fix a GMT offset in
  code without exposing a time-zone selector to the end user.

- **The time tray is an overlay, not a second step.** The clock button (a real
  button with `aria-expanded` / `aria-controls`) opens one
  `role="listbox"` per unit — hour, minute, and second only with
  `showSeconds` — above the time row, over the day grid, inside the same
  panel. It is `position: absolute`, so it changes neither the panel's width
  nor its height. Each column scrolls independently, opens centred on its
  selected value, and each row is a `role="option"` with `aria-selected`.
  Picking a row writes the **draft** and leaves everything open; `OK` is still
  the only commit. `Escape` closes the tray first (panel stays open, focus
  returns to the clock button); an outside pointer or leaving the tray closes
  only the tray. The tray is the clock button's immediate sibling in the DOM,
  so the tab order is clock → selected hour → selected minute → [second] →
  meridiem → Now → OK; only the selected row of each column has
  `tabindex="0"`, and the rest are `-1` (APG roving tabindex).

- **Panel exit motion uses the existing `closing` state.** On dismissal the
  panel gets `.rv-datepicker-panel--closing`, `inert`, `aria-hidden="true"` and
  `pointer-events: none`, and plays a 100 ms exit animation. Completion comes
  from `animationend`, with a 500 ms fallback, and then the panel is removed.
  - Angular scopes CSS animation names (`_ngcontent-…_rv-datepicker-exit`), so
    the completion check uses `event.animationName.endsWith('rv-datepicker-exit')`
    rather than equality — the first implementation compared exactly and the
    panel stayed until the 500 ms fallback (measured: `animationend` fired at
    ~100 ms, panel still present).
  - `prefers-reduced-motion: reduce`, or an environment without `matchMedia`
    (jsdom), closes instantly; another picker taking over
    (`closeForAnotherPanel()`) skips the exit so two panels never coexist.
  - During the exit the panel is inert, so a second click cannot re-enter a
    control that is on its way out.

- **Fixed UTC offsets are first-class `timeZone` values.** `+03:00` and
  `-05:30` resolve through the same `Intl` path as an IANA id: offset `180`
  minutes, `kind: 'unique'`, no gap and no overlap, in January and July alike.
  `Etc/GMT-3` is the IANA zone with the same offset (POSIX signs are
  inverted); `GMT+3` is rejected because it is a display name, not an offset.
  `isValidTimeZone()` accepts the fixed form; `listTimeZones()` does not list
  it (it enumerates IANA ids). There is **no end-user time-zone selector**:
  the developer chooses `timeZone` in code, as required.

- Verified in this session (2026-10-25):
  - **462/462 unit tests in 14 files**, including a new DOM-order test that
    pins the tray directly after the clock button, one tab stop per column,
    and the actions after the tray; plus the `+03:00` / `Etc/GMT-3` / `GMT+3`
    core test and the scoped-animation-completion test.
  - `ng build datepicker` (both entry points); tarball **8 files**
    (`package.json`, README, two FESM bundles + maps, two `.d.ts`); dist FESM
    imports only `@angular/core` (core) and `@angular/core` +
    `@rivinia/datepicker` (UI); zero `tslib` imports; the D20-injected
    `tslib` dependency entry is expected.
  - Tarball reinstalled into the consumer playground; production build
    **371.50 kB raw / 88.64 kB transfer**.
  - Chromium against that production build, zero console errors:
    - exit: `animationstart` → `animationend` for
      `…_rv-datepicker-exit` at ~100 ms, panel gone by the 150 ms sample;
      closing class, `inert` and `aria-hidden` present immediately.
    - tab order: clock → selected hour → selected minute → Now → OK, with
      the tray closing on the step out; picking an hour left the tray and the
      panel open.
    - fixed offset: `+03:00` at 16:00 resolved `offset 180 min`,
      `instant 2026-10-25T13:00:00.000Z`, `kind unique`; the trigger showed
      `GMT+3`.
    - narrow 320 × 568: panel 304 × 336.8 at x = 16, `Now`/`OK` bottom
      566.6, panel bottom 577.1 — **9.1 px of the panel's bottom padding is
      below the viewport**; no control is clipped and the page scrolls. This
      is documented in the README as a measured limitation; the panel is
      clamped in width, not shifted vertically.
- Not published. Version remains **0.1.0**. Firefox/WebKit and SSR are still
  unverified and are not claimed.

## 2026-10-26 — D57: tray accessible names fixed (WCAG 2.5.3), final audit

- The scoped axe run (the three picker sections) found **20 serious
  `label-content-name-mismatch`** nodes in the pointer tray: the visible text
  is `03` / `05`, while the accessible name was `3 PM` / `5 minutes`. The
  visible text was not a substring (leading zero, 12-hour form, plural unit),
  so voice-control users could not say what they see.
- Fix: the row's accessible name now **starts with its visible text** —
  `03, 3 PM`, `٠٣, ٣ م`, `05, 5 minutes`. It is composed once in the component
  (`accessibleLabel`), not in the template. A regression test asserts, for
  `en-US` and `ar-EG` and for hour/minute/second, that every row's visible text
  is contained in its accessible name.
- Verified on the final build (2026-10-26):
  - **463/463 unit tests in 14 files**; `ng build datepicker`; tarball
    **8 files**; dist FESM imports unchanged (`@angular/core`; UI adds
    `@rivinia/datepicker`), no `tslib` import.
  - Tarball reinstalled in the consumer; production build
    **371.60 kB raw / 88.72 kB transfer**.
  - Chromium, zero console errors: exit `animationstart` → `animationend` at
    ~100 ms and panel gone by the 150 ms sample; `prefers-reduced-motion:
    reduce` closes instantly; keyboard takeover leaves **1 panel, 0 closing**;
    RTL panel 308 × 413.8 with a 290-wide tray, no overflow, tray labels
    `الساعة` / `الدقيقة`, selected row `٠٣, ٣ م`; `+03:00` resolved offset 180,
    instant `2026-10-25T13:00:00.000Z`, kind `unique`; **axe: 0 violations**
    in `#datetime`, `#zones`, `#datetime-forms`.
- The pointer-takeover path is different and stays as designed: clicking
  another picker is an outside pointer for the open one, so the first closes
  with its 100 ms exit (measured 2 panels with 1 closing for <100 ms); the
  immediate close belongs to the keyboard/registry takeover.
- Not published; version remains **0.1.0**.

## 2026-10-26 — D58: the panel clamps to the viewport height (supersedes the D56 limit)

- Context: D56 measured a 9.1px bottom overflow at 320×568 (panel bottom 577.1
  on a 568 viewport). The user asked for it to be fixed before the release.
- CSS could not express it: the panel is 336.8px tall, the viewport is 568px,
  and neither the space below (319.7px) nor above (228px) fits, so
  `position-try-fallbacks: flip-block` correctly keeps it below. `max-block-size`
  cannot help either — the panel is shorter than the viewport; its POSITION is
  the problem, not its size.
- Decision: a **measured vertical clamp**, in the shared
  `panelViewportShift()` (`utils/panel-motion.ts`):
  - space below = `innerHeight - 8 - trigger.bottom - gap` (gap read from the
    computed `margin-block-start`, so a consumer's `--rv-datepicker-panel-gap`
    is respected);
  - if the panel's `offsetHeight` fits below, or fits above (the CSS flip owns
    that case), the shift is `0`;
  - otherwise the shift is `-(height - spaceBelow)`, applied with a negative
    `translate` via `--rv-datepicker-panel-shift`. `translate` is used, not
    `transform`: the enter/exit keyframes animate `transform` and would
    overwrite an inline transform.
  - `offsetHeight` is layout height and ignores transforms, so the measurement
    is correct during the entrance animation; jsdom/SSR report 0 and shift
    nothing.
  - a `ResizeObserver` on the panel (and `window.resize` while open) recomputes
    it when the panel grows — a DST warning or a wrapped action row.
- Verified (2026-10-26): 468/468 tests in **15 files** (new
  `tests/panel-motion.spec.ts`: fits below, flip above, neither side, custom
  gap, no-layout). Chromium production build: narrow 320×568 panel bottom
  **560.1** (7.9px inside the edge, shift -28px), `Now`/`OK` at 549.6; desktop
  973×912 unchanged (shift 0, panel 134.7, gap 5); RTL 973×912 unchanged
  (shift 0, panel 308 wide, bottom 892.5). Tarball and consumer rebuild
  re-run after the README edit; not published.

## 2026-10-26 — D59: @rivinia/datepicker@0.1.0 LIVE

- The user logged in on npmjs (`abdelfattahqandil21`; the old token problem from
  D14 was not present) and published the inspected tarball:
  `npm publish ./pack/rivinia-datepicker-0.1.0.tgz --access public --registry
  https://registry.npmjs.org/`.
- The publish went through **staged publishing** for the new name: the registry
  now carries `0.0.0-stage` **and** `0.1.0`, with `dist-tags.latest = 0.1.0`.
  The live `dist.shasum` is `c26a80285c71bb33c3a7e09d05848f12259e4dd4` — the
  exact tarball that was built, inspected and installed into the consumer
  (8 files, 126,524 bytes, readable README included).
- `npm view @rivinia/datepicker version --registry https://registry.npmjs.org/`
  returns `0.1.0`.
- Repository finalisation after the publish (the user published from
  `pkg-datepicker/specs-first`; the tag is added to the same tree): commit,
  `--no-ff` merge into `main`, tag `datepicker/v0.1.0`.

## 2026-10-27 — D60: `@rivinia/table` — spans inside the core, and the defects a consumer build found

- Context: the ecosystem had no table. The brief: a headless controller plus a
  ready-made grid, with REAL row and column spans (not CSS tricks), an actions
  column the consumer writes end to end, and a playground the user could run.
- **Spans live in the core, not in a `@rivinia/table/spans` entry.** Pinning,
  keyboard navigation and selection all need the grid's real geometry; a second
  entry could only exist by importing the first, so it would be the same package
  with a worse boundary. `table.spans` is a resolved `SpanModel` over
  `pageRows × visibleColumns`, built once per pair, with `at` / `owner` / `move`.
  - Three declarations, enforced at `createTable()`: `merge: 'equal'` (row-span
    by equal consecutive values), `colSpan: n` (or a function), and `span(ctx)`
    (both axes, per cell). `span` + (`merge` | `colSpan`) throws; `merge`
    without an accessor warns; overlaps shrink so the anchor wins, and the
    overlap is reported through `warn`.
- **The grid is divs with explicit ARIA, never `<table>`.** `display: contents`
  rows make the cells items of ONE body grid, so `grid-row: span N` really
  crosses rows — a `<table>` cannot do that with sticky headers, a shared column
  template and virtualized row heights. `role="grid"` / `rowgroup` / `row` /
  `columnheader` / `gridcell`, `aria-rowcount` / `colcount`, `aria-sort`,
  `aria-selected`, `aria-rowspan` / `colspan` on the anchor only.
- **The actions column is consumer markup.** `tableColumn<T>().display('actions')`
  reserves the column; `<ng-template rvTableCell="actions">` fills it. The grid
  ships no icons, no menu, no permission concept — five inline buttons and a
  kebab are both just the template. The UI never reads a row's "actions".
- **Packaging follows D06/D21**: primary entry IS the core, `./ui` depends
  inward, zero new runtime dependencies. Dist FESM imports: core → `@angular/core`;
  UI → `@angular/core` + `@angular/common`. Zero `tslib` imports (D20).
- **Defects found by using it as a consumer, each fixed with a test:**
  1. `TableColumn<T, V = unknown>` made the documented array
     (`TableColumn<Invoice>[]`) reject every `accessor('amount', …)`, because a
     `format(value: number)` cannot accept an `unknown` parameter. Default is now
     `any` — inference at the call site is unchanged, and the array annotation
     erases it.
  2. `pageSize` was read only from `initialState`, so the `pageSize: 25` in the
     README was silently ignored and every table rendered the default 25 rows.
     It is now an option; a restored `initialState.pageSize` still wins.
  3. `selectable` toggled `aria-selected` but drew nothing, so a consumer who
     set it saw no affordance. Each row now gets one DECORATIVE box in its first
     cell (`aria-hidden`): `aria-selected` is the semantics, and a real checkbox
     there would announce the state twice and add a tab stop.
  4. `<rv-table aria-label="…">` — the attribute every consumer writes — stopped
     at the host, so the grid kept the name "Data grid". The component now reads
     the host attribute as a fallback under the `[ariaLabel]` input.
  5. In an Arabic page, an English client name rendered as `.Nile Trading Co`:
     bidi applied the RTL paragraph to the Latin run. Every text span is now
     `dir="auto"`, so the VALUE's direction comes from the value.
  6. A cell whose content is wider than its column painted over its neighbour
     (measured: an actions cell with five text buttons over the amount). The
     grid does not clip a cell by default — a floating menu inside a cell must be
     able to leave it — so the fix is documented (size the column, let it wrap,
     or `overflow: clip` if nothing floats) and the example was resized.
- **Two consumer-only traps, recorded because they will bite again:**
  - `@rivinia/table` resolves from `dist/` for `ng test`, so a fresh checkout
    must `ng build table` first (same as the other UI entries).
  - Replacing a `file:` tarball by extraction does NOT invalidate Vite's
    prebundled deps: `.angular/cache/**/vite/deps/` keeps serving the previous
    build until the cache is cleared. A real `pnpm add` changes the lockfile and
    invalidates it by itself.
- Verified in this session (2026-10-27):
  - **207/207 unit tests in 4 files** (core 148 = 46 controller + 50 spans +
    52 pipeline · UI 59), `ng test table`.
  - `ng build table` → both entry points, 1.3–1.5 s. FESM: core 26,953 B raw /
    **6,775 B gzip**; UI 65,914 B raw / **11,599 B gzip**.
  - Tarball `pack/rivinia-table-0.1.0.tgz`: **8 files, 78.2 kB**, shasum
    `9f36248db1b5d06c3217dc2cebd9509909dc509c`; `exports` `.` + `./ui` only,
    peers `@angular/common` + `@angular/core ^22.0.0`, `sideEffects: false`.
    (The FESM and `.d.ts` files were byte-identical to the previous pack; the
    last repack exists because the README gained its Install and Quick-features
    sections per the D43 convention.)
  - Consumer playground (`tmp/consumer`, public entry points only, tarball
    extracted into `node_modules`): production build **282.54 kB raw / 77.24 kB
    transfer** initial, shared table chunk 43.68 kB / 12.30 kB, pages lazy
    (basic 5.69, spans 3.59, actions 6.64, states 5.48 kB).
  - Chromium against the dev server AND against the production build served by a
    plain static server (`dist/rv-consumer/browser`, no Vite, no HMR), all four
    tabs:
    selection (box + row tint + pill + Space), row spans (`aria-rowspan="4"`,
    48 cells instead of 60 on the spans page, 107 instead of 125 on the full
    page), the actions template (role switch admin → 4 controls, accountant → 2,
    viewer → 1; menu opens, picks, closes, reports
    `copy → INV-1001 (row id 1)`), states (6 skeletons with `aria-busy`, empty
    message, `role="alert"`, densities 32 / 40 / 48 px), Arabic (`dir=rtl`,
    mirrored columns, `dir="auto"` on every value, Arabic loading and empty
    labels), and a 390 px body where the grid scrolls inside its own scroller
    (640 px of content in a 309 px scroller) with the header moving exactly with
    the body (120 px each) and no page overflow. The datepicker playground from
    the previous round still opens its panel (308 px wide, one at a time) in the
    same production build.
  - Not verified and not claimed: screen-reader behaviour, Firefox/WebKit,
    SSR, virtualization (not implemented), server mode (not implemented), and a
    clean `npm install` of the tarball (both npm and pnpm refused it in this
    environment; the files were extracted instead — the packaging itself is
    proven by the same tarball format as the other packages).
- NOT published, NOT committed. Version stays **0.1.0**.

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

## 2026-10-28 — D62: Angular 22.2.3 baseline (patch upgrade, all suites green)

- Context: the user asked to raise the workspace to the latest Angular before the
  `@rivinia/i18n` hardening work. Registry state checked on 2026-10-28:
  `@angular/core` latest **22.2.3** (2026-10-14), `@angular/cli` / `@angular/build` /
  `@angular-devkit/*` **22.2.4**, `ng-packagr` **22.2.5**. There is no Angular 23:
  the `next` tag is `22.3.0-next.2`, a pre-release, so "latest stable" is 22.2.3.
  TypeScript is bounded by `@angular/compiler-cli@22.2.3` peers to `>=6.0 <6.1`;
  6.0.3 was already installed and was not changed.
- Decision: upgrade every `@angular/*` runtime package to **22.2.3** exactly and the
  build toolchain to the versions above. No API or peer-range change: libraries keep
  `peerDependencies: {"@angular/core": "^22.0.0"}`.
- Verified: all **10 packages build** (`ng build` per package: http, i18n, toast,
  modal, menu, select, table, datepicker, theme, env), all unit suites pass — http 39, i18n 52, toast 35,
  modal 53, menu 40, select 71, table 207, datepicker 468, env 2 = **967 tests** —
  and the schematic suite passes **40/40** (`pnpm test:schematics`).
- Impact: `AGENTS.md` baseline updated; no consumer migration is needed (patch).
  Unverified: nothing from this change; the upgrade touched no package source.

## 2026-10-28 — D63: `@rivinia/i18n` 0.4.0 — the production-hardening set

- Context: 0.3.3 is live and works in a browser, but it has seven gaps that a
  production app hits: the default loader fetched a RELATIVE url that Node's
  `fetch` rejects, so SSR rendered raw keys; no fallback language; no way to
  see which keys are untranslated; no way to refresh a dictionary without a
  page reload; an ICU subset that lacked `selectordinal`/`offset:`/number and
  date formatting; `t()` returning a `string` instead of a signal; and no
  compile-time protection against a key typo. The user asked for all seven,
  with strict business-logic unit tests and a cross-browser e2e pass, and
  deferred the `ui` (switcher) entry point.

- **SSR.** Loaders receive a `LoaderContext { baseUrl, isServer }` built from
  `REQUEST` + `<base href>` on the server and `document.baseURI` in the
  browser; the built-in loaders absolutize ONLY when `isServer`, so a browser
  keeps the same relative fetch it always made. `isServer` means "there is a
  server request context", not "the platform is server" — that is what makes a
  relative url fetchable. A custom SSR host must provide `REQUEST`; without it
  the library cannot know the origin, and that is documented rather than
  guessed from a global.
- **Fallback language.** Lookup is current → fallback → `defaultValue` → key.
  The fallback text is rendered with the FALLBACK locale's plural rules: an
  English plural template borrowed by an Arabic UI must keep English's two
  categories, not Arabic's six. The fallback dictionary loads in parallel and
  SILENTLY (it never drives `loadingState`) and is transferred to the client.
- **Missing keys.** A key is missing only when it is absent from the current
  dictionary, absent from the fallback, and no `defaultValue` was given — an
  explicit `defaultValue` is a declared inline fallback, not a defect. Reported
  once per key per session, and only once the current language actually HAS a
  dictionary, so a slow load cannot produce false positives. `missingKeys` is
  written from a microtask, because Angular forbids a signal write inside a
  `computed` (NG0600) and `t()` must stay a pure `computed`.
- **`reload(language?)`.** Stale-while-revalidate with a per-language
  generation counter: the visible dictionary stays on screen until the fresh
  one arrives, and a response that was in flight when `reload()` ran is
  discarded instead of overwriting the newer one. It never rejects; failures
  land on `loadingState` / `loadingError` / `onLoadError`.
- **ICU.** Added `selectordinal`, `offset:`, `{n, number}` (`percent`,
  `integer`, `::currency/XXX`), `{d, date}` (`short|medium|long|full`) and
  `Date` in `TranslateParams`. `offset:` follows ICU4J `PluralFormat`: an
  explicit `=N` matches the RAW value, the category is selected with
  `value - offset`, and `#` renders `value - offset` in the locale's digits.
- **`t()` returns `Signal<string>`.** A function `params` is invoked inside the
  computation, so the signals it reads are tracked and a counter change
  re-renders the text without a language switch.
- **Typed keys.** `RiviniaI18nKeyRegistry` is an empty augmentable interface, so
  `RegisteredI18nKey` resolves to `string` and nothing breaks by default; the
  shipped `rivinia-i18n-keys` CLI generates the `.d.ts` that narrows it, with
  `--check` for CI. A genuinely dynamic key is asserted explicitly
  (`as RegisteredI18nKey`), which keeps the escape hatch visible in review.

- **One behaviour change:** `#` inside a plural is now formatted with
  `Intl.NumberFormat(locale)`, so `ar-EG` renders `٣` where it rendered `3`.
  `en` and `ar` are unchanged. The second: an unresolved key warns once per
  session in dev mode (`warnOnMissingKey` / `onMissingKey` control it).

### What only a real build could find (five, all measured)

1. **Domino does not implement `baseURI` — the property read THROWS**
   (`NotYetImplemented`). `createLoaderContext` read it unguarded in a field
   initializer, so constructing the service threw before the first byte and
   the entire server render failed. No browser test could see it: jsdom
   implements `baseURI`. Fixed with a guard + `/` fallback (`c7b5cf1`), proven
   by two specs that simulate the throwing property; both fail without the
   guard (negative control run).
2. **`renderApplication` requires an explicit `allowedHosts`** (NG05706).
   There is no implicit default, and an open list would turn the host into a
   request-forgery relay, so the proof host names its own hosts.
3. **The platform injector is not the app injector.** `renderApplication`
   serializes the PLATFORM `TransferState`, but `bootstrapApplication` gives the
   app its own root injector, so the dictionaries the service loaded landed in a
   different instance and were silently dropped — the client refetched both.
   The app injector now registers `BEFORE_APP_SERIALIZED` itself.
   `provideServerRendering()` also works, but registering it TWICE (platform +
   app) emits two scripts with the same id and `getElementById` finds the empty
   one first — measured, not reasoned.
4. **`outputMode: 'server'` forces prerendering**, so `browser/index.html`
   already contains a rendered app AND its own `ng-state` script. Serving that
   file as the SSR template produced two `ng-state` scripts and the client read
   the prerendered one, which has no dictionaries. The host serves
   `browser/index.csr.html`, the clean shell.
5. **The clean CSR shell carries no `ng-event-dispatch-contract` script**, so a
   click that lands before hydration is dropped instead of replayed. The smoke
   test waits for a real hydration marker (`afterNextRender` sets
   `html[data-hydrated]`) and polls for the rendered text; a fixed sleep made a
   working app look broken (measured both ways).

### Verified

- **153/153 unit tests in 11 files**; `ng build i18n`.
- **39/39 Playwright** (12 scenarios × chromium + system Chrome 156 +
  Playwright Firefox 157) against the **CSR production build**, each test
  asserting zero console errors so a failed dictionary fetch cannot pass.
  Negative control: removing `fallbackLanguage` fails both fallback scenarios.
- **16/16 SSR checks** against a real `node:http` + `renderApplication` host:
  Arabic HTML, `lang`/`dir`, all six plural forms, no raw key, no
  `[object Object]`, transfer payload present, no server fetch failure, no
  render error, hydration keeps the text, no client dictionary refetch, and the
  hydrated app switches language and flips `dir`.
- **Tarball** `pack/rivinia-i18n-0.4.0.tgz`: 17 files, 51,911 bytes; `exports`
  `.` + `./package.json` only; peers `@angular/core` + `@angular-devkit/schematics`
  `^22.0.0`; `sideEffects: false`; `bin` mode 755; FESM imports only
  `@angular/core` plus one internal relative chunk; **zero `tslib` imports**.
  shasum `a6b6bd1447e70d140ac89742872f423e6f0156a8`, SHA-256
  `3314ab9dce86c52123172e4cd701310bfaeab0bd4018ac91a936bfc3d6332671`.
- **Clean consumer** (`tmp/i18n-consumer`, the tarball extracted into
  `node_modules`, public entry points only): every public symbol used in
  `public-api-check.ts`; production build **232.25 kB raw / 63.29 kB
  transfer**; browser smoke in Chromium shows the Arabic default, `t()`, the
  pipe, the pipe with params (`عنصران`, the Arabic dual), an inline translation
  map, `formatIcu`, the English switch, and zero console errors.
- **Typed keys in the consumer:** the shipped CLI wrote 12 keys; with the
  generated registry the typo `'app.titel'` is a compile error (TS2769) and
  without it the same file compiles (negative control); `--check` exits 1 on a
  stale source and 0 when current.
- **Size, measured as a delta** (empty Angular app → same app +
  `provideRiviniaI18n` + one `t()`): **93.01 → 116.63 kB raw**,
  **27.97 → 34.26 kB transfer** = **+23.62 kB raw / +6.29 kB transfer**, with
  the three loaders in separate lazy chunks (392 / 377 / 344 bytes).

- Version **0.4.0** (pre-1.0 minor). 0.3.4 was never published, so its source
  layout move ships inside 0.4.0 and 0.3.4 is skipped on the registry.
- **NOT published** — the tarball awaits explicit confirmation (name, version,
  access, file list) per gate 7.
- Not run, therefore not claimed: WebKit (cannot launch in this environment),
  system Firefox 158 (Playwright does not drive it), screen-reader behaviour,
  and SSR in any engine other than Chromium.

## 2026-10-28 — D64: `@rivinia/i18n@0.5.0` LIVE — publish from the tag, and npm "Validating"

- **Order (owner correction).** `i18n/v0.5.0` was already tagged and merged
  (`23d5056`) while npm `latest` was still 0.4.0. Tags are immutable (D17), so
  the refactor cannot land on top of the tag: 0.5.0 had to be published first.
  RIV-18 (core split) and `/ui` start only after this publish.
- **Artifact.** Built in a worktree at the tag (`git worktree add --detach …
  i18n/v0.5.0`, `pnpm install --frozen-lockfile`, `pnpm build:i18n`), not from
  `HEAD`: `git diff i18n/v0.5.0..HEAD -- projects/i18n` is empty, but the
  published bytes still come from the tag's own build. 14 files, 67,151 B,
  `shasum cea589a8c28f3d164d2980563e8eb4e14693f28e`, sha256
  `3d0a77d05dda6cc6fbc8043d3a25ea97e9623569a5f43095edd8316570aa3c6b`.
  Compared file-by-file with the earlier `pack/rivinia-i18n-0.5.0.tgz`:
  identical except one TypeScript declaration-emit union-order line in
  `types/rivinia-i18n.d.ts` (`loadingState`) — same union, not a source change.
- **2FA.** npm answered `EOTP`; a 2FA-bypass token cannot publish, so the
  web-auth flow runs: open the printed URL, approve, npm exchanges it through
  `GET /-/v1/done?authId=…`. It needs a TTY — non-interactively npm exits
  `EOTP` without polling, and at "Press ENTER to open in the browser…" it waits
  forever, so the newline has to be fed.
- **202 is not a failure.** The final `PUT` returned `202 Accepted` and npm
  printed success, yet the registry answered 404 for a while: the npm UI showed
  `0.5.0 Validating`. A 202 plus "Validating" means the upload landed and is
  being processed — do not re-publish, and do not call a version live until
  `dist-tags` says so (the owner's UI flipped to Published, then
  `dist-tags = { latest: '0.5.0' }`).
- **Registry proof.** `dist.shasum` matches the artifact, `dist.fileCount` 14,
  `dist.unpackedSize` 238,082; `npm pack @rivinia/i18n@0.5.0` from the registry
  is byte-identical (sha256 above) to the inspected build. FESM imports
  `@angular/core` only.
- **Gate 4 on the registry version** (clean directory, no `file:` link, `npm
  install` from the registry): `tsc -p tsconfig.app.json --noEmit` exit 0,
  production build 239.26 kB raw / 65.96 kB transfer, lazy loader chunks
  400 / 352 B, `node_modules/.bin/rivinia-i18n-keys` linked, and `--parity`
  over the e2e dictionaries exits 1 with exactly the one real report
  (`MISSING ar key "fallback.onlyEnglish"`).
- npm normalizes `bin` on publish (`./cli/…` → `cli/…`) and prints a misleading
  "invalid and removed" warning; the entry survives (packument, same as 0.4.0).
  Tag, source and `.d.ts` surface untouched.
- Not run: npm provenance (no CI), yarn, WebKit.

## 2026-10-28 — D65: `@rivinia/i18n` RIV-18 core split on `pkg/i18n/core-split`

- **Shape.** `RiviniaI18n` (915 lines, eight responsibilities) is a facade over five
  plain collaborators in `src/lib/services/`: `MessageFormatter`, `MissingKeyReporter`,
  `LanguageStorage`, `DocumentDirectionApplier`, `DictionaryStore`. They are **not**
  exported, take constructor deps instead of DI tokens, and the facade keeps every
  `inject()` call — so no provider or token changed for consumers.
- **Why plain classes, not services.** The public `.d.ts` stays still, each collaborator
  is constructible in a unit test without `TestBed` (except `DocumentDirectionApplier.
  install`, which needs an injection context for `effect()`), and the wiring order is
  visible in one constructor instead of being resolved by the injector.
- **Specs stay unchanged.** The characterization test (`fallback-after-init`, unit +
  SSR) was written and green *before* the first extraction; the 0.4/0.5 specs were not
  touched. Each extraction adds a direct spec for the extracted class. Evidence:
  274 unit tests, Playwright 51/51 on chromium/chrome/firefox, SSR smoke 21/21 on
  chromium and firefox.
- **Pipe rename (open question 2).** `RvTranslatePipe` (`rvTranslate`) is the documented
  name — the package prefix is already `rv` in `angular.json`. `RTranslatePipe`
  (`rTranslate`) keeps rendering as a deprecated empty subclass until 1.0. This is the
  only `.d.ts` delta (one added declaration, verified by diffing the filtered public
  surface against the tag). **(Superseded by D66: the alias was removed before release.)**
- **Size.** FESM 44,234 B raw / 10,685 B gzip vs 40,551 / 10,026 at 0.5.0 (measured
  before the D66 cleanup; after it the FESM is 43,350 B / 10,612 B). A consumer
  production build went 239.26 kB → 242.01 kB raw (65.96 → 66.68 kB transfer); the
  delta includes the two extra pipe usages in the check component. The `Intl` memo is
  now a 40-entry LRU, so peak memory is bounded where it used to grow.
- **Benchmark.** Median 20.1 ms vs 15.8 ms baseline, with overlapping spreads
  (baseline 15.0–23.6 ms) — the split adds a call hop, no algorithmic change; not
  claimed as a regression-free win.
- **Not done.** No version bump, no tag, no publish: 0.6.0 stays unreleased until the
  owner approves gate 7. Part 2 (`@rivinia/i18n/ui`) has not started.

## 2026-10-28 — D66: `@rivinia/i18n` pre-release cleanup — no compatibility aliases

- **Rule.** `@rivinia/i18n` has no official release: the npm versions are experimental
  and carry no backward-compatibility commitment. Transitional names are therefore
  removed before 0.6.0 ships, not carried to 1.0. This supersedes the deprecation
  window D65 planned for the pipe.
- **Removed.** `RTranslatePipe` and the `rTranslate` selector (the alias had existed for
  one unreleased commit); `RiviniaI18n.languageChanged` (the same signal as
  `currentLanguage`); the `silent` option on `loadTranslations()` (declared, never read
  — `background` is the internal flag that suppresses loading state).
- **Kept, deliberately.** The `Translation<L>` object overload of `translate()`; all
  three `t()` overloads; `defineRiviniaI18n()`; `toggle()`/`next()`/`previous()`;
  `getLanguage()`; `clearMissingKeys()`/`clearMissingParams()`; the `formatIcu` caches;
  the `@experimental` view-transition surface; the `@internal` helpers
  (`ViewTransitionService`, cookie helpers, browser-language helpers) — internal is an
  entry-point tier, not a deprecated one.
- **Behaviour preserved.** `RvTranslatePipe` stays impure (`pure: false`): it must
  re-evaluate when the language signal changes, and a pure pipe would freeze the text.
  Fallback resolution, missing-key isolation, ICU rendering and transfer reuse are
  untouched.
- **Evidence.** Public `.d.ts` diffed against the 0.5.0 tag: `RTranslatePipe` →
  `RvTranslatePipe`, `languageChanged` gone, `loadTranslations` lost its dead `opts`
  parameter; no other declaration moved. Unit 276, schematics 40, Playwright 51 on
  chromium/chrome/firefox, SSR smoke 21/21 on chromium and firefox, and a consumer
  production build against the packed tarball that renders `rvTranslate` (key, ICU
  params, translation object) in Chromium with zero page errors.
- **Not done.** No version bump, tag or publish (gate 7); no change outside
  `projects/i18n` except this decision entry.

## 2026-10-29 — D67: `@rivinia/theme` is a bundled-CSS contract, and its silent failures are checked

- **Context.** SPEC-0.1.1 (`projects/theme/SPEC-0.1.1.md`) and the executed
  research in `docs/RESEARCH-theme-stacks.md`. Five stacks were measured against
  the 0.1.0 tarball — `@angular/core` 22.2.3 with `@angular/build` and
  `@angular/cli` 22.2.5 in the consumer fixture, Sass 1.97.0, Less 4.4.2,
  Tailwind 4.1.16, Bootstrap 5.3.8, Chromium and Firefox. (The research runs
  before §8 did not record which binary built them; the fixture versions above
  were read from its `node_modules` afterwards.) All five work, and three of
  them fail **silently**:
  - without `exports["."].style`, the build stays green and Angular emits a
    188-byte stylesheet: no tokens, no warning;
  - `@import (less) '@rivinia/theme';` compiles to 34 B — Less ignores
    `exports` and inlines the empty ESM entry;
  - with plain `@theme`, a subtree `--rv-bg` override never reaches
    `bg-rv-bg` (measured: the utility stays `rgb(255,255,255)`).
- **The theme is a bundled-CSS contract.** The bare specifier resolves only
  through a bundler's `style` export condition (Angular's stylesheet resolver
  passes `style`/`sass`/`less`). That makes the condition load-bearing, so it is
  checked by a script instead of trusted: `scripts/check-theme-package.mjs`
  (`pnpm check:theme` checks `dist/theme`; `pnpm check:theme <tarball>` checks
  the tarball — the target is the script's own default, never baked into the
  npm script, because pnpm appends arguments to the script's command line and a
  hardcoded default silently swallowed them) asserts the `style` target, every
  other export target, the exact file list and the `@layer rivinia-theme` block
  in `styles/theme.css`. The one file this adds outside the planned set is
  `scripts/check-theme-package.d.mts`, the hand-written types for the ESM
  script's exports. `pnpm test:theme` runs its 11 tests (D50: specs in
  `projects/theme/tests/`) against synthetic packages in temp dirs — no build
  needed, no new `angular.json` target; plain `vitest run projects/theme/tests`
  from the root works, the same way `test:schematics` does. One test spawns
  `pnpm check:theme <tarball>` and asserts the tarball is what gets checked, so
  the argument-passing path is covered too. The release checklist carries the
  gate explicitly — AGENTS gate 3 now ends with one added line: "For
  @rivinia/theme, also run `node scripts/check-theme-package.mjs <tarball>`; it
  must exit 0." That is the only AGENTS.md edit in this change.
- **The Tailwind palette block is `@theme inline`.** Both adapter blocks now
  reference other variables, and `inline` is what makes the reference resolve at
  use-site. Measured before/after on the same fixture: subtree `--rv-bg` →
  `rgb(1,2,3)` instead of `255,255,255`; root overrides and the default colours
  unchanged; `bg-rv-bg` and `text-rv-accent` still generated; `--color-rv-bg`
  still emitted at `:root` as `var(--rv-bg)`. The cost, measured and documented:
  an element-level `--color-rv-bg` no longer repaints the utility, and a later
  consumer `@theme { --color-rv-bg: … }` replaces the alias, so that token stops
  following `--rv-bg` and subtree overrides stop reaching it.
- **Overrides are global and unlayered.** Not `@layer base` (the `rivinia-theme`
  layer is declared later and wins between layers), not Tailwind `@theme`
  (`--rv-bg` is not a theme key), never inside a component stylesheet (Angular
  rewrites `:root` to `[_ngcontent-…]:root`). The README states this with the
  measured consequence of each wrong placement.
- **Docs prescribe the spelling that works, per stack:** Less imports
  `@rivinia/theme/theme.css` and nothing else; the `sass` CLI uses
  `pkg:@rivinia/theme/scss` with `--pkg-importer=node` (Dart Sass 1.71+);
  bundlers keep the bare specifier; an adapter replaces the base import (both
  together emit the theme twice, 1,019 B vs 613 B). `_index.scss`'s comment was
  wrong about the extension and is rewritten. `sideEffects` in the README now
  matches the manifest (`["**/*.css", "**/*.scss"]`).
- **Version.** The `@theme inline` switch is a behaviour change, so the release
  is a minor: **0.2.0**, decided by the owner on 2026-10-29. `CHANGELOG.md` ships
  in the package and carries the migration note: change `--rv-*`, not
  `--color-rv-*`. No manifest version is bumped, tagged or published here —
  gate 7 still needs explicit confirmation.
- **Executed evidence (2026-10-29).** `pnpm build:theme` (workspace
  `@angular/build` 22.2.4, `@angular/compiler-cli` 22.2.3, ng-packagr 22.2.5)
  produces the 9-file `dist/theme`; `pnpm check:theme` passes on it and on the
  tarball. Two tarballs exist in this change: the one the §9 matrix ran on
  (`/tmp/pack-theme-020/rivinia-theme-0.1.0.tgz`, 6,687 B), and the final one
  after the review fixes (`/tmp/pack-theme-final/rivinia-theme-0.1.0.tgz`,
  6,763 B, 9 files, shasum `66e778e5f8c89dccd2eb92f3361e83da54730ab9`), which
  `pnpm check:theme <path>` also passes. The 6,687 B tarball, installed into a
  consumer fixture (`@angular/core` 22.2.3, `@angular/build`
  and `@angular/cli` 22.2.5) and built as five entries, measured in
  Chromium and Firefox: plain CSS 613 B, Sass 566 B, Less 547 B, Tailwind
  5,261 B, Bootstrap 280,705 B of built `styles.css`; every stack paints
  `--rv-bg` and follows a `:root { --rv-bg: rgb(10,20,30) }` override to
  `rgb(10, 20, 30)`. The silent failures reproduce on the new tarball too: the
  Less package root compiles to 104 B with no token, and the `sass` CLI exits 65
  on the bare specifier while `pkg:` with `--pkg-importer=node` emits 1,870 B
  (Sass 1.97.0). Details in `docs/RESEARCH-theme-stacks.md` §8–§9.
- **Not verified.** WebKit/Safari; webpack, Vite and Parcel; Angular versions
  before 22; Bootstrap with a customized Sass palette; npm provenance.
- **Not done — on purpose.** No merge, no tag, no version bump, no publish
  (gate 7); `package.json` still says 0.1.0 and the CHANGELOG says 0.2.0 for
  whoever cuts the release. The five-stack matrix above was measured on the
  pre-fix control flow **before** the final fixes in this change (checker
  default, `tailwind.css` comment, docs). At release time it must be re-run on
  the **final** tarball — all five stacks, including Bootstrap light **and**
  dark, and Tailwind's subtree override, `:root` override and consumer
  `@theme { --color-rv-bg }` cases. Two review items were skipped and are
  **not** done: refactoring `load()` in the checker to return a typed result
  instead of `Map | string`, and a theme `tsconfig.spec.json` (the tests run
  through the root `vitest` config, the same as `test:schematics`).
  `docs/DECISIONS.md` and `docs/RESEARCH-theme-stacks.md` are not
  Prettier-formatted: they already fail `prettier --check` at `main`, and the
  rewrite would reflow prose and list continuations. The files added or changed
  under `projects/theme/` and `scripts/` do pass.

## 2026-10-29 — D68: `@rivinia/i18n/ui` opens with a toggle and a trigger template, no popup

- **Scope.** `rv-language-toggle` (exactly two languages, an element that renders its
  own inner `<button>`) plus the `rvLanguageTrigger` template directive, exported
  from `@rivinia/i18n/ui`. No select, no switcher, no option template, no popup.
  `SPEC-0.6.md` §3 is superseded by `SPEC-0.6-ui.md` for everything this release
  ships, and `RESEARCH-ui.md` is superseded where the two differ.
- **Three or more languages: a dev warning and an `aria-disabled` button.** No
  silent cycling through the first two, and no native `disabled` attribute: the
  control stays in the tab order so the problem is discoverable. This deliberately
  differs from `RiviniaI18n.toggle()`, which flips `languages[0]`/`languages[1]`
  and only warns: a UI that copied that would make two of the app's languages
  privileged and invisible. With three or more, the app should use a select, a
  menu, or a custom control. The count guard runs before the busy guard, so the
  "wrong shape" verdict is stable even while the manager is loading.
- **`languageChange` confirms, it does not intend.** The event fires only after
  `setLanguageAsync(target)` resolves **and** `currentLanguage() === target`. Never
  on activation. A failed load emits nothing, shows nothing, and writes no state:
  the core's `'error'` branch in `DictionaryStore.load` requires the target to
  already be current, so a failed switch settles back to `'idle'` and the UI must
  not invent a failure surface. Because the event is gated after the await, an
  overlapping switch that loses the core's last-resolved-wins race is silent
  instead of announcing a switch that did not stick.
- **Busy is announced, not asserted away.** While loading the button carries
  `aria-busy="true"` only — no `aria-disabled`, never the native `disabled` — and
  activation is ignored in the handler rather than queued. The user just activated
  the control; removing it from the tab order at that moment is the worst case for
  keyboard and screen-reader users.
- **Contract.** Types only from `@rivinia/i18n` plus a structural
  `RiviniaLanguageManager` (D30 shape, four members); no runtime import of core
  code in the UI FESM; no new peers (D06). Manager wins over presentational inputs.
  The trigger template is rendered through `ViewContainerRef`, so `@angular/common`
  is not a peer, and `<ng-content>` is never used for it (projected content is
  instantiated even when the host is hidden). Because the accessible name is
  computed from the target language and not from the template's DOM, any visible
  text a template renders must remain a prefix of the accessible name (WCAG 2.5.3 /
  D57).
- **Bidi placement is a design claim, not a measurement.** `lang`/`dir` live on the
  inner `<button>`, not on the host `<rv-language-toggle>` and never on `<html>`:
  layout follows the page, the name's pronunciation and bidi layout follow the
  target language. The e2e matrix on chromium and firefox confirms the computed
  `direction`, the side `padding-inline-start` resolves on, and the `dir="auto"`
  case; a browser that disagrees reopens the decision rather than moving the
  attributes silently.
- **Names, the mark and flags.** `nativeName` → `Intl.DisplayNames` → `id`, guarded.
  The name carries its own `lang`/`dir`, and a trigger template inherits them — the
  README tells consumers to set `lang` on any text that is not in the target language.
  Each button leads with a decorative `currentColor` globe (`aria-hidden`,
  `focusable="false"`) that contributes nothing to the name; the `[icon]` input replaces
  it with a consumer `TemplateRef`, rendered through the same `ViewContainerRef` path as
  the trigger. The mark is sized **by layout, not by a descendant rule**: view
  encapsulation cannot apply `.icon[_ngcontent] > *[_ngcontent]` to consumer nodes, and
  a bare outer `<svg>` in a flex item measures 0×0 in WebKit while Chrome and Firefox
  stretch it by UA behaviour (measured 2026-10-29 on all three engines; the box is a
  stretched grid, 21×21 at the default `1.5em`). No flags: W3C i18n guidance, and a globe
  names no language it cannot represent.
- **API tier.** Every export of `@rivinia/i18n/ui` is **Experimental** in 0.7.0
  (SPEC-0.6-ui.md decision 2, closed 2026-10-29). The five symbols may change —
  or lose members — without a deprecation cycle until the entry point is promoted
  to Stable, which requires the e2e matrix and one release of consumer use first.
  The core entry point keeps its own tiers; this decision does not move any of them.
- **Versioning.** 0.7.0 — a pre-1.0 minor.
- **Not done.** No version bump, tag or publish; no change outside `projects/i18n`
  except the `@rivinia/i18n/ui` path mapping in `tsconfig.json` and this entry.

## 2026-10-29 — D69: a failed dictionary load is loud in dev, once per language

- **The gap.** `warnOnMissingKey` and `warnOnMissingParam` both default to
  `isDevMode() && !handler`, but a *dictionary* load failure — the case that leaves every
  key unresolved and paints raw key names — had no default output at all: the error
  reached `onLoadError` only when the consumer had configured it. The quietest failure was
  the most severe one.
- **Default.** New `warnOnLoadError?: boolean`, `@default isDevMode() && !onLoadError`.
  `false` silences it, `true` keeps it in production. It mirrors the two existing flags
  rather than introducing a third pattern; if the package ever prefers silence by default,
  all three move together.
- **Deduped per language, not per failure.** The warning is keyed on the language id in a
  `Set` for the lifetime of the service, so `reload()` and retry loops cannot flood the
  console. `onLoadError` keeps firing on every failure — telemetry wants the count, the
  warning does not.
- **Not a rejection.** `initialize()` still never rejects and an `'instant'` switch is
  still not rolled back: the warning reports a failure, it does not change behaviour.
- **The JSDoc example.** The hoisted `const AR`/`const EN` example on
  `provideRiviniaI18n` did not type-check (unannotated literals widen to `string` and fail
  `Language`). It now uses `as const`, the form `projects/i18n/tests` already uses.
- **Versioning.** 0.7.1 — a patch: additive, optional, dev-only by default. 0.7.0 was
  never published, so its `/ui` work ships inside this release.

## 2026-10-29 — D70: `defaultLanguage` defaults to the first language

- **Default.** `defaultLanguage?: T` — omitted, it resolves to `languages[0].id`. A config
  that only lists languages is now complete; the initial language is the first one
  declared, which is also the order the toggle/`next()`/`previous()` already walk.
- **Loud resolution, once.** `resolveDefaultLanguage()` runs as a field initializer above
  `LanguageStorage` and throws a named message for an empty `languages` array, a first
  entry without a non-empty `id`, and an explicit `defaultLanguage` that is `''`,
  whitespace, `null`, a non-string, or an id not in `languages`. The alternative — falling
  back silently — turned a typo into `currentLanguage() === undefined` and a `dir`/locale
  read against the wrong entry, which only surfaces much later. Only `undefined` means
  "use the default"; JS/JSON callers that pass `null` get the error, not a guess.
- **Already defaults, nothing to change.** `storageStrategy` (`'local'`) and `loader`
  (`jsonLoader()` with `i18n/{language}.json`) were defaults before this entry; the README
  now names the loader path explicitly so the "customize the folder" hop is one option
  away.
- **`fallbackLanguage` stays explicit.** Defaulting it to the last language id would make
  array order load-bearing for correctness, not just ordering: a key counts as missing
  only when absent from the current *and* the fallback dictionary, so a silent fallback
  suppresses `missingKeys`/warnings for every language that happens to share keys with the
  last one. That is a behaviour change, not a convenience default — it would need its own
  minor.
- **Versioning.** 0.7.1 — additive; every config that passed a valid id behaves identically.

## 2026-10-29 — D71: language ids are asserted once and must be unique

- **The gap.** The only checks were "at least one language" and "`defaultLanguage` is one
  of the ids". `languages: [AR, EN, AR]` passed validation, and every consumer of the list
  then resolves the duplicate to the **first** entry — `currentLanguageObject()`,
  `getLanguage()`, dictionary lookup by id — while `next()`/`previous()`/`toggle()` walk
  three entries and land on the same language twice. The `/ui` toggle counted three
  languages as "many" although there were two. Nothing said a word.
- **Unique, non-empty, every entry.** The same construction-time pass validates each entry
  (`language[i] needs a non-empty \`id\``) and rejects a repeated id
  (`Duplicate language id "ar" in the languages array.`). It runs for every config — not
  only when `defaultLanguage` is derived — because a duplicate breaks switching regardless
  of which language starts.
- **Throws in production too.** Like the other config checks, this is a programming error,
  not a load failure: it fails at bootstrap with a named message instead of degrading at
  runtime.
- **Not covered here.** Ids are compared exactly, so `ar` and `ar ` remain two ids; id
  shape (BCP-47), `dir` presence, and unknown keys in `translations` are separate
  questions.
- **Versioning.** 0.7.1 — a config that was already valid is untouched.

## 2026-10-29 — D72: a duplicate language id is also rejected at compile time

- **Why both.** D71 throws at bootstrap, but the mistake is written at the call site and
  the owner asked for the error while typing, not at runtime. The runtime check stays: it
  is the only guarantee for JS callers, for hoisted lists and for anything built at runtime.
- **Mechanism.** `DuplicateLanguageId<T>` walks the `languages` tuple recursively and
  yields the repeated id (or `never`); `AssertUniqueLanguageIds` turns that into either
  `unknown` or `{ readonly duplicateLanguageId: Duplicate }`, and both
  `provideRiviniaI18n` and `defineRiviniaI18n` take
  `C & AssertUniqueLanguageIds<C['languages']> & RiviniaI18nConfig<L>`. A duplicate then
  fails with `Property 'duplicateLanguageId' is missing …`, and the required type names
  the offending id (`{ readonly duplicateLanguageId: "ar"; }`).
- **`const C`, not overloads.** The scan needs the literal type, so the config parameter
  gained `const C extends RiviniaI18nConfig<L> = RiviniaI18nConfig<L>`. Overloads were
  tried first and did not work: TypeScript picked the permissive second overload
  (`<L extends string>`) and the duplicate compiled — the spec proved code 0, not 2. A
  single defaulted-`const` signature rejects it.
- **The trailing `& RiviniaI18nConfig<L>` is load-bearing.** Without it, `L` cannot be
  inferred when the config object is assembled with a spread
  (`{ options, ...partial }`): `C` falls back to its default and `L` to its constraint,
  `string`, so every such call became a `TS2345` on `onLoadError`'s contravariance. The
  extra conjunct gives `L` an independent inference site without weakening the guard —
  the same spread form with a duplicate still errors.
- **What it does not see.** Two forms widen the argument before the scan, so `C` takes its
  default and `DuplicateLanguageId` resolves to `never`: passing the union explicitly
  (`provideRiviniaI18n<'ar' | 'en'>(…)`) and hoisting the list
  (`const LANGS: readonly Language<L>[] = […]`). Both still hit D71's runtime error at
  bootstrap, and both are pinned by tests (`language-ids-types.spec.ts`) rather than left
  as folklore.
- **Public surface.** No new export: the helper types stay module-private, so the check is
  a compiler constraint on the existing signatures, not API consumers must name. The
  `const` parameter and the extra property are erased; declaration output keeps the same
  call shape.
- **Versioning.** 0.7.1 — additive. Valid configs that compiled before still compile; the
  new parameter is defaulted so inference is unchanged.

## 2026-10-29 — D73: `init` collects languages in the terminal and writes the module

- **The gap.** `provideRiviniaI18n` needs `id`, `nativeName` and `dir` per language, so
  every app re-types the same object list. The owner asked for the terminal to collect it
  and for the files to be generated: "نشيل من عليه التعريفات الكتابية الكتيرة".
- **Prompts live in the CLI, not in `ng add`.** A schematic's `x-prompt` entries are a
  fixed list evaluated once by the CLI's prompt provider
  (`@angular/cli/.../json-schema.js`), so a variable number of per-language questions is
  not expressible without depending on CLI internals. `rivinia-i18n-keys init` already
  ships as the package's own binary and can loop, validate and re-ask with
  `node:readline` — no new dependency, no internals.
- **One writer, no drift.** The generator lives in the binary. The schematic is not
  taught to generate the same module from a second copy of the rules; the module is
  emitted once, by `init`, and `app.config.ts` only imports it.
- **Generated shape.** `languages.ts` holds `defineRiviniaI18n` with the list and the
  default, plus `export const injectI18n = i18n.inject`. `defaultLanguage` is written
  explicitly rather than left to the first-entry default: the file is generated, and
  reordering the list must not silently change the starting language. The `injectI18n`
  alias is what components import — `i18n.inject()` keeps working and is the primitive
  (`inject()` cannot infer `L` at the call site, see D70); the alias is just a name users
  are used to (`injectRouter()`), not a second DI mechanism.
- **`dir` is asked, not derived.** The prompt offers the known direction for the id as
  the default, but the value is written literally, so an Urdu/Hebrew/… dictionary cannot
  end up left-to-right by guess.
- **Nothing is half-written.** Ids (shape, duplicates), the direction and the default id
  are validated before the first `writeFileSync`. An existing dictionary is kept, a
  `languages.ts` without the generated banner is only replaced with `--force`, and
  `--dry-run` prints the plan.
- **Pipes are a second adapter.** A TTY answers through `readline.question`; a pipe
  cannot, because all lines arrive before the next question is asked — those answers are
  queued from the `line` event instead. Non-interactive runs and the tests use
  `--languages <list>`; an empty stdin exits 1 with a message naming the flag instead of
  looping on EOF.
- **No `lang.json` source of truth.** A JSON language list read at runtime would type `L`
  as `string`, losing the compile-time checks (D72) and letting `dir` go unverified;
  dictionaries stay JSON, the language list stays TypeScript.
- **Versioning.** 0.7.1 — additive command; `--source`/`--out`/`--check`/`--parity` are
  unchanged.

## 2026-10-30 — D75: select panel metrics, and `position-area` resolves against the ICB

- **What shipped.** `@rivinia/select` 0.6.2 (prepared, unpublished): the panel
  no longer scrolls horizontally, the panel and its trigger are one width,
  `*-end` placements sit on the trigger button, RTL panels align in a
  mixed-direction page, and the README's ARIA section was rewritten from the
  measured DOM.
- **Panel metrics.** Rows were `width: 100%` in a content box, so padding pushed
  every row past the panel: `scrollWidth` 105–118 against `clientWidth` 101, and
  `overflow-y: auto` turned that into a horizontal scrollbar. Rows are
  `border-box` with `min-width: 0` and `overflow-wrap: anywhere`; the panel is
  `overflow-x: hidden` with a `border-box` of its own. Everything measured
  identical in Chromium 156, Firefox 157 and WebKit 27.2 after the fix.
- **One control, one width.** The first pass fixed a 103px trigger opening a
  103px panel by giving the panel its own floor — but the popup primitive's
  floor (16rem) and the trigger's (14rem) then disagreed, so with no consumer
  opt-in the panel sat 32px wider than the button (measured 256 over 224). The
  owner's call: the panel must read as the same box. One floor now lives on the
  `rv-select` host, `min(var(--rv-select-width, 14rem), 100%)`; the trigger is
  `width: 100%` of it, the select scopes the panel to `min-width: 0` so
  `anchor-size(inline)` / `root.style.width` decide, and a standalone
  `rv-select-popup` keeps its own floor because it has no trigger to follow.
  The host is where the floor has to be: on the trigger the containing block is
  a chain of shrink-to-fit boxes, so the `100%` inside `min()` resolved against
  an indefinite width and collapsed to 0 — measured 103px where 14rem was
  documented, and only a select in a grid cell (a definite width) honoured it.
  The host's containing block is the consumer's layout, where the percentage is
  a real width. The trigger is `border-box`: `width: 100%` with content-box
  borders made it 2px wider than the select, and the panel followed. A
  container narrower than the floor shrinks both together and the labels wrap
  — the "narrow panel" is now intended behaviour, which is why the e2e asserts
  equality instead of a minimum.
- **Design minimum: 10rem.** Measured on the packed tarball, rows stay on one
  line down to a 160px container (40px rows) and start wrapping below it —
  55px at 128, 94px at 112, 114px at 96 — while the trigger value truncates
  with an ellipsis. So 160px is the width where the shape holds; below it the
  container wins. Deliberately no hard floor: a fixed minimum would overflow a
  narrower cell and bring back the page-level horizontal scroll this release
  removed. The control's own intrinsic minimum is ~103px (padding, gap and
  chevron), and even there the panel matches it and the page does not scroll.
- **The platform finding: `position-area` is ICB-relative.** Span keywords
  (`span-inline-start`/`-end`) resolve against the containing block, and a
  top-layer popover's containing block is the ICB — `<html>`'s direction, not
  the panel's. A `dir="rtl"` select inside an LTR document opened at 649..905
  (left edges aligned to a 649..752 trigger) where 496..752 is correct;
  `flip-inline` does not help because nothing overflows. The component compares
  its own computed direction with `document.documentElement`'s and sets
  `data-inline-mirror`, which swaps a pair of custom properties the four
  placement rules read. `:dir()` cannot do this: it follows the HTML `dir`
  attribute, so a `direction: rtl` wrapper leaves `:dir()` reporting `ltr`
  (measured in Chromium and WebKit). Physical keywords would sidestep it but
  `CSS.supports('position-area', 'block-end span-right')` is false in both
  engines, and an unsupported value is dropped silently.
- **Same finding in the JS path.** `isRtl()` preferred `document.documentElement.dir`
  over computed direction, so an LTR document with an RTL section was placed as
  LTR there too. It reads the component's computed direction now.
- **Coverage.** 78 unit tests (the new contracts in `tests/panel-metrics.spec.ts`
  pin the width ownership, the span-variable swap and the placement wiring);
  13/13 repo e2e cases × Chromium 156, Firefox 157, WebKit 27.2 (39/39) —
  including three new sizing cases at 480px, 160px and 120px; and the tarball
  matrix, 138/138 (46 cases × 3 engines), installed in the consumer fixture on
  a scratch port. WebKit runs headed here: the headless WPE build in the local
  Playwright cache fails to load `libavif.so.16`, while the GTK build used
  headed starts fine. That is an environment limitation, surfaced as not-green
  rather than hidden.

## 2026-10-30 — D74: `@rivinia/i18n@0.7.1` LIVE — 0.7.0 folded in, and web auth instead of `--otp`

- **What shipped.** 0.7.0 was merged (`70b1ad6`) but never published; with no users
  yet the owner folded it into a patch and added `warnOnLoadError`, the
  `defaultLanguage` default, duplicate-id rejection at runtime and compile time, the
  `init` generator and the three-tier README. The registry will never see 0.7.0
  (precedent: 0.3.4 shipped inside 0.4.0).
- **Preconditions.** The branch was merged with `--no-ff` (`e9cebfd`) and its tree is
  the branch tip's tree (`17fe756`, the same as `e508683`). The release commit
  (`b7a18f4`) already carried the version, the CHANGELOG heading and the root README
  Workspace column; the "Latest on npm" column moved only after the publish.
- **Artifact.** Built in a fresh worktree at `i18n/v0.7.1`, not from `HEAD`:
  `pnpm install --frozen-lockfile` with `PNPM_CONFIG_ALLOW_BUILDS` (see the pnpm-12
  note), `pnpm build i18n` exit 0, 345/345 tests in 32 files. 17 files, 99,464 B,
  shasum `eabda8068056598874e8bcf42831aba42b6389ee`, sha256
  `97525973a4f0bc5392e9336fabfa6a8514c0f6fb406f710452cbdcec2353f654`. `diff -r`
  against the tarball inspected before the tag is empty — the two builds are the same
  bytes, so the browser checks already run on the earlier copy apply unchanged.
  README, CHANGELOG and the CLI asset are byte-identical to the tagged sources; the
  FESM imports `@angular/core` only.
- **Web auth replaced `--otp`.** The 40-character token in `~/.npmrc` had stopped
  authenticating: `npm whoami --registry=https://registry.npmjs.org/` and a direct
  `GET /-/whoami` both answered 401 while `/-/ping` answered 200. The owner published
  without `--otp`; npm printed `https://www.npmjs.com/auth/cli/<uuid>`, the browser
  approved the request, and `+ @rivinia/i18n@0.7.1` followed ~40 s later. Owner
  decision: publish without OTP from now on and let the web flow authenticate.
- **Propagation, again.** `GET /@rivinia/i18n/0.7.1` answered 404 for about a minute
  before 200, and `dist-tags` reported `latest: 0.7.1` only after that — the same
  202/"Validating" gap as D64. Do not re-publish during it.
- **Registry proof.** `dist.shasum` and `dist.integrity` match the artifact,
  `dist.fileCount` is 17, `dist.unpackedSize` is 354,387, and the tarball downloaded
  from the registry is byte-identical (same sha256). Peers, `bin` and `exports` are
  unchanged.
- **Gate 4 on the registry version.** A fresh copy of the consumer with
  `"@rivinia/i18n": "0.7.1"` and `pnpm install --registry=https://registry.npmjs.org/`:
  the installed tree is `diff -r`-identical to the inspected tarball, `ng build` exits
  0 at 156.90 kB raw / 46.17 kB transfer plus the two lazy loader chunks, the
  installed `rivinia-i18n-keys init --help` exits 0, and a Chromium smoke switches
  en-GB/ltr → ar-EG/rtl with 0 console errors.
- **Not run:** npm provenance (no CI), yarn and npm-package-manager consumers, and
  Firefox/WebKit against these bytes — the published tarball was exercised in
  Chromium only; the repo's Playwright suites ran against the branch build.
- **Still local at the time of writing:** `main` (31 commits ahead of `origin/main`)
  and the tag `i18n/v0.7.1` had not been pushed.
