## 2026-11-02 — D90: a topic page is a consumer document; the hook ships a built page, not a screenshot

- Context: S9 moved the reference out of the four READMEs — 26 topic pages under
  `docs/<pkg>/`, 3,518 lines, with the READMEs left at 104, 172, 134 and 165
  lines. That emptied `ALLOW_OVER_BUDGET`, which was the finish line of the
  content move. Two things the move exposed had no rule yet. First, no gate read
  those pages: `check:docs` audited `projects/<pkg>/README.md` and `RECIPES.md`
  only, so a topic page could name a symbol its package no longer exports — the
  exact defect class S1 and S6 found in the READMEs — and nothing would say so.
  Second, the template asked every hook for "a screenshot or gif (or live demo
  link)", and the repository has neither: no tracked image asset, no hosted
  demo. The choice was to invent a URL or to record what was actually shipped.
- Decision: a consumer document is `projects/<pkg>/README.md`, `RECIPES.md` and
  every `docs/<pkg>/*.md`, derived from the directory layout by
  `consumerDocuments(pkg)` — a new page is audited without a list being updated,
  and the rule that governs it is the same rule 1 that governs the README.
  Everything else in `docs/` is repo-internal and out of scope **by directory,
  not by allowlist**: `DECISIONS.md`, the AUDITs, the SPECs and `MERGES-1.0.md`
  name removed and `@internal` symbols on purpose, which is precisely what a
  consumer document may not do.
- Decision: rule 2 now asks for the lowercase half of CamelCase. `ar-EG`,
  `::currency/XXX` and `T12:30Z` in `docs/i18n/` are a region subtag, a currency
  code and pattern letters; they can never be a Rivinia export, and a symbol typo
  (`RiviniaLanagugeSelect`) still has lowercase letters, so it is still reported.
  `PLATFORM_TERMS` carries the vocabulary that is true but not exported — `Intl`
  and its constructors, the forced-colours system colours, the `KeyboardEvent.key`
  names, engines and JS builtins — plus two entries each with its reason beside
  it: `injectI18n`, which `rivinia-i18n-keys init` writes into the application,
  and `L`, the language-id type parameter.
- Decision: the hook is proved by the page the suites already drive, not by an
  image. select, menu and i18n name `projects/menu-e2e/src/app/pages/…` or
  `projects/i18n-e2e/src/app` and the command that builds it; theme, which renders
  nothing, ends its hook with the observable result. `docs/README-TEMPLATE.md`
  says this in place of the screenshot line, together with the filing convention
  that actually shipped — `docs/<pkg>/<topic>.md`, with the three tiers labelled
  in the README's `## Go further` table rather than split into the
  `docs/guide.md`/`docs/reference.md` pair the template first proposed.
- Rejected: scanning all of `docs/**/*.md` — it hard-fails on the internal
  documents above, and allowlisting those files one by one would hide the real
  rule. Committing a screenshot: a binary in every tarball, with no gate to tell
  us it went stale, and the README budget is for prose. Pointing at the owner's
  live playgrounds (`rv-tailwind`, the governorate demo): those are not built from
  this repository's tags, so a link would be a promise about someone's machine.
- Impact: `check:docs` reports 0 failures and 41 warnings on the merged tree —
  down from 159 warnings while reading the READMEs alone, now reading 26 pages
  more — because the all-caps tokens and the platform vocabulary left the
  complainable set and the eight prose words that remain (`It`, `Don`, `En`,
  `English`, `Seats`) are English, not symbols.
  `scripts/tests/check-docs.spec.ts` proves both halves are killable — the
  topic-page scope by moving the directory it reads, the CamelCase refinement by
  dropping the lowercase requirement. The four READMEs now satisfy S9's acceptance
  line within budget. **What this does not prove:** a reader still cannot see the
  components without building something, which is the cost of shipping no image,
  and the tier naming for i18n departs from the spec's own file names — the owner
  can overrule either in the 1.0 review.
