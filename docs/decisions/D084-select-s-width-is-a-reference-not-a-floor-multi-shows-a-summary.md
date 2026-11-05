## 2026-10-31 — D84: select's width is a reference, not a floor; multi shows a summary

Evidence and plan in `docs/SPEC-select-multi-summary.md` (frozen before code).

- **Evidence.** A multi select with 8 picks measured 272px → 637.3px inside a
  544px cell, and its open panel stayed at 272px. The host was `inline-block`
  with only a `min-width` floor and a `nowrap` value, so content drove the
  width and the panel/trigger pair diverged. A floor cannot cap a control whose
  width is content-driven; that is why the previous one-width model (D78/D82)
  held only until the third or fourth pick.
- **Decision: `--rv-select-width` is a reference width.** On the host:
  `width: min(var(--rv-select-width, 14rem), 100%)`, `max-width: 100%`,
  `min-width: 0`. The trigger fills the select and the panel follows the
  trigger, so the two keep reading as one control. `min-width: 0` is
  load-bearing in flex/grid, where the automatic minimum size of a nowrap item
  would otherwise push the control past its container. Proved as separate
  browser cases: a 272px reference stable across 0 → 8 picks inside 544px; a
  flex row wider than the reference with zero sibling shift; a narrower row that
  shrinks and ellipsizes; exactly 192px in a 12rem container, 96px in a 96px
  container, and a full cell under `--rv-select-width: 100%`.
- **Decision: multi shows the first label plus `+N`.** The pill is
  `aria-hidden`, `<bdi dir="ltr">` (so `+7` never mirrors in RTL), tabular,
  `flex: none`, and does not change the trigger height. The full list, in pick
  order, is the trigger's **description** via `aria-describedby` on a clipped
  sibling — not part of the name, so a labelled trigger announces "Skills" once
  and the list once. Removing the first pick promotes the next label; clearing
  all removes the pill, the hidden element and the attribute. This satisfies
  D82's Q4 intent ("the name reflects every selection") without duplicating the
  visible name.
- **Locale is a reactive internal signal, not a DOM read inside a computed.**
  A browser-only `MutationObserver` on `documentElement`'s `lang` (created in
  `afterNextRender`, exactly one per instance, disconnected on destroy, never
  created during SSR) feeds `pageLang`; `computed`s derive the description. The
  formatter is memoised per locale in the internal helper (`formatterFor`, a
  module-level `Map`), so `ar → en → ar` returns the identical instance and no
  formatter is built per change-detection tick. Invalid locales fall back to
  `en`; a missing `Intl.ListFormat` falls back to `join(', ')`; no document
  resolves to `en`. These helpers are called "deterministic", never "pure" —
  the cache is state.
- **Hydration is safe and proved, not assumed.** Angular 22.2.3 validates a text
  node's type, not its content, so text that differs between server and client
  hydrates without `NG05xx`. Proved on a **non-empty** select in a tarball
  consumer: the server renders `lang="en"` and the English list; `main.ts` sets
  `doc lang="ar"` before bootstrap; after hydration the description is Arabic,
  the summary unchanged, and the console shows no `NG05xx`.
- **Rejected.** Wrapping/chips (layout shift per pick, JS measurement for the
  remainder, and per-chip remove is impossible inside one `<button>`); a
  `maxVisible` input in a patch release.
- **Consequences.** Supersedes the floor half of D82 and the README's "floor"
  wording; `panel-metrics` expectations change from `min-width` to `width` /
  `max-width` / `min-width: 0`. `@rivinia/i18n@0.8.0` is unaffected: its picker
  owns `min-inline-size: 14rem` on `inline-block`, and with the select's own
  floor gone the percentage width still resolves against that host — measured
  224px host, 224px select and panel, 19.6px label line. Gate evidence: 135 unit
  tests in 17 files; 54 browser tests (18 × Chromium, Firefox, WebKit 27.2) from
  an SSR consumer on the packed tarball; core FESM byte-identical, `/ui` +4,523
  B raw / +1,063 B gzip / +803 B brotli; tarball 70,904 B, 9 files.
- **Verification note (harness, not product).** A Playwright click dispatched
  while the panel's entrance animation is still running makes Playwright scroll
  the document (~189px) before clicking; a page scroll closes a fixed-position
  panel by design, so the panel closes. A real pointer click at the same moment
  keeps it open (proved with `page.mouse.click`), and a click after the
  animation (the panel's `getAnimations()` is empty) never scrolls. The gate
  opens panels by scrolling the trigger into view first and waiting for the
  animation, which is both realistic and deterministic.
