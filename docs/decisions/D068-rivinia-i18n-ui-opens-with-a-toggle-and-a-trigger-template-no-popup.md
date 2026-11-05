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
