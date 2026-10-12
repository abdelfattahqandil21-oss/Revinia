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
