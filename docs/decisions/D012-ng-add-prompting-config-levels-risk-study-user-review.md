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
