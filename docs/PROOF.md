# Phase 3 — Packaging Proof (2026-10-12)

## What was built

- `@rivinia/proof-core@0.0.1` — primary entry = headless `ProofStore` (`@Service()` +
  readonly `count` signal + `provideProofCore()` + `injectProofStore()`); secondary
  `./ui` = `ProofBadge` component (input-based, zero imports from Core).
- `@rivinia/proof-second@0.0.1` — independent `SecondStore`, no coupling to proof-core.
- External consumer `/tmp/opencode/rv-consumer` (Angular 22, npm, tarballs via `file:` —
  no workspace aliases): Core + Second eager in `App`, UI behind lazy route `/badge`.

## Verified results

| Check | Result |
|---|---|
| `ng build proof-core` (primary + `./ui`) | ✅ |
| `ng build proof-second` | ✅ |
| `ng test proof-core` (vitest) | ✅ 4/4 |
| `exports` map (`.`, `./ui`), `types`, `sideEffects:false`, peers | ✅ inspected in `dist/*/package.json` |
| Core FESM has zero UI code (`ProofBadge` absent) | ✅ grep |
| UI FESM has zero store code | ✅ grep |
| `PROOF_CONFIG` declared but NOT exported from public types | ✅ (matches i18n-egy `I18N_CONFIG` discipline) |
| `npm pack` tarballs (`pack/*.tgz`), `ui/package.json` correctly excluded per ng-packagr `.npmignore` | ✅ |
| External consumer `npm install <tarball>` + `ng build` (production) | ✅ |
| `rv-proof-badge` present ONLY in lazy `badge-page` chunk (1.08 kB raw / 509 B transfer) | ✅ grep |
| Initial total with Core+Second eager: 209.13 kB raw / 58.81 kB transfer | ✅ measured |

## Honestly unverified (belongs to demo Phase 5)

- Empty-app baseline (no Rivinia) for delta math.
- Runtime click/interaction behavior in a browser (build + chunking proven, not clicks).
- Any public npm publish (0.0.1 proof versions intentionally unpublished).
