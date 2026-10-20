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
