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
