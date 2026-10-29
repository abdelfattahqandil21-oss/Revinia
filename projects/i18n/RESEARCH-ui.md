Superseded where it differs by SPEC-0.6-ui.md

# `@rivinia/i18n/ui` — research brief for the language-switcher entry point

Research date: 2026-10-29. Scope: the secondary entry point `@rivinia/i18n/ui`
(Part 2 of `SPEC-0.6.md`), expanded by the owner to cover several switcher
shapes, icons, multilingual labels, and content projection inside a dropdown.

This file is research, not a contract. Every recommendation marked
**proposal** needs an owner decision before it becomes public API.

---

## 0. What the repo already committed to

`projects/i18n/SPEC-0.6.md` §3 fixes the following for Part 2:

- selectors `rv-language-toggle`, `rv-language-select`, `rv-language-switcher`;
- two languages → a button showing the *other* language; three or more →
  native `<select>`; `variant='auto'` picks between them;
- **no custom popup in this release**, and menus are documented recipes over
  `@rivinia/menu/ui` and `@rivinia/select/ui`;
- **no new dependencies**: no CDK, no peers beyond `@angular/core`;
- UI imports only *types* from core plus a structural manager interface; the
  UI FESM must not import core runtime code;
- names: `nativeName` → `Intl.DisplayNames` → id; **no flags**;
- tokens `var(--rv-i18n-<x>, var(--rv-<semantic>, <default>))`, logical
  properties only, documented `data-*` hooks;
- accessible name configurable; `aria-busy` while loading; `data-state="error"`.

The owner's new request (multiple shapes, icons, multilingual content,
projection inside a dropdown) goes **beyond** "no custom popup". That tension is
the first decision in §7, not something this brief can silently resolve.

---

## 1. Which ARIA pattern fits a language switcher

There is no APG "language switcher" pattern; the choice is between three
existing ones:

| Pattern | Roles | Fits | Cost |
| --- | --- | --- | --- |
| Button (toggle) | `button` | exactly two languages; the label is the *target* language | lowest; one control, no popup |
| Menu button | `button[aria-haspopup=menu][aria-expanded]` + `role=menu`/`menuitem` | a short, non-searchable list; also "inside the user's own menu" | needs focus management into a popup |
| Listbox (with combobox trigger) | `combobox[aria-expanded][aria-controls][aria-activedescendant]` + `role=listbox`/`option[aria-selected]` | many languages, searchable, single selection | most code: typeahead, active descendant, focus return |

APG requirements to honour if a popup is built
([menu button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/),
[listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/),
[combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)):

- **Menu button:** `aria-haspopup="menu"`, `aria-expanded` on the button,
  `aria-controls`; Enter/Space open, Down/Up optional; Escape closes and
  returns focus; Tab closes.
- **Listbox:** `aria-selected` per option, `aria-activedescendant` **or**
  roving `tabindex` (pick one, never both), Home/End, Up/Down, Space selects,
  typeahead; single-select may move selection with focus, but a language
  switcher should **not** switch on arrow keys — change on explicit
  Enter/Space/click, because a language change re-renders the whole app.
- **Combobox:** Down opens the popup, Escape closes, Enter selects;
  `aria-activedescendant` points at the active option while DOM focus stays on
  the input.

**Recommendation (proposal):** the toggle is a plain `button`; the many-language
variant stays a **native `<select>`** (APG-correct for free, and it is the only
option that gets platform mobile pickers); a custom listbox is justified only if
the owner accepts the popup decision and the maintenance cost in §6.

---

## 2. Native `<select>` vs a custom listbox

Native `<select>`: correct roles/states, platform pickers on mobile, no
typeahead code, works with every screen reader. Limits: the closed control and
the option list are styled by the OS; rich content in `<option>` is dropped in
classic rendering; per-option `lang`/`dir` are valid global attributes but
screen-reader support is **not uniform** — verify with NVDA/VoiceOver before
claiming it works.

Customizable select is now real but **not Baseline**: `appearance: base-select`
(plus `::picker(select)`) lets a `<select>` render
`<button><selectedcontent></selectedcontent></button>` and options containing
non-interactive markup such as `<span>` and icons
([MDN](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select)).
Support: Chrome/Edge 134+, Firefox and Safari still implementing as of early
2026 ([browser round-up](https://modern-css.com/articles/build-a-styled-select-dropdown/),
[caniuse](https://caniuse.com/?search=base-select)). Where unsupported it
degrades to a classic text-only select — exactly the fallback we already ship.

**Recommendation (proposal):** use native `<select>` as the semantic base and
opt into `base-select` in CSS as progressive enhancement. Icons appear where the
browser supports rich options; elsewhere the option text is `nativeName`. This
gives icons **without** owning a popup and without a second interaction model.

Custom listbox (popup): only reason to build it is richer layout — grouped
sections, descriptions, avatars, two-line options, search. The repo already has
a proven implementation to copy from, not to invent (see §4).

---

## 3. Language names, `lang`, `dir`, and flags

- `Intl.DisplayNames` (`type: 'language'`) is widely available since April 2021
  ([MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames)).
  Guard it: SSR/old runtimes and unsupported tags can return the input code or
  throw. Resolution order stays `nativeName` → `DisplayNames` → id.
- Every option and the trigger label must carry `lang="<id>"` (and `dir` from
  the language entry) so the name is pronounced in its own language. Changing
  the document language at runtime also changes screen-reader pronunciation —
  the core service already sets `<html lang>`.
- **No flags.** W3C i18n guidance is explicit: "Do not use flag icons to
  indicate languages"
  ([W3C i18n-html-tech-lang](https://www.w3.org/TR/i18n-html-tech-lang/)).
  Flags map to countries, not languages, and are politically loaded. If the
  owner still wants them, make it app-provided content through projection, not
  a shipped asset set, and document the trade-off.

Chrome strings inside the component ("Choose language", "Switch to {language}")
are a real i18n problem: the UI entry point cannot import core runtime code, so
the component cannot call `translate()` itself. Two clean options:

1. **Required accessible-name input** (`label`) that the app passes already
   translated, plus a dev warning when missing; visible text is optional and
   also app-provided. Zero new manager members.
2. **Extend the structural manager** with
   `translate?(key: string, params?: object): string` and fall back to the key.
   Convenient, but every test double and the "four members" promise grow, and
   the UI starts to depend on core's dictionary semantics.

**Recommendation (proposal):** option 1 for this release; revisit if apps keep
duplicating label strings.

---

## 4. Popup mechanics on the 2026 baseline

| Mechanism | Status | Why / why not |
| --- | --- | --- |
| Native Popover API (`popover="auto"`/`"manual"`, `showPopover()`, top layer, `:popover-open`) | Baseline 2025 ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Popover_API)) | already used by this repo; `auto` gives light dismiss, `manual` leaves dismissal to code; non-modal, no focus trap |
| `<dialog>` | established | modal semantics are wrong for a language list; overkill |
| CDK Overlay | mature | adds `@angular/cdk` as a peer and a whole positioning/scroll strategy stack; CLAUDE/AGENTS forbid it here |
| CSS anchor positioning | newer than popover | useful for placement once supported; never the only positioning path |

The repo's own precedents (verified in source):

- `projects/toast/ui/src/lib/components/toast-list/toast-list.ts:24` — the
  structural manager pattern (`RiviniaToastListManager`, five members).
- same file `:64` — feature-detect `'showPopover' in HTMLElement.prototype`;
  sets `popover="manual"` on the panel, with a `z-index` fallback documented.
- `projects/select/ui/src/lib/components/popup/select-popup.html:2,33` — the
  popup already projects both the trigger and the panel through
  `<ng-content select="[rv-select-popup-trigger]">` and
  `[rv-select-popup-panel]`; the panel is `role="menu"` with
  `[attr.popover]="topLayerSupported ? 'manual' : null"`.
- `projects/select/ui/src/lib/components/popup/select-popup.ts:149` — documented
  keyboard contract (Enter/Space/ArrowDown open, Escape closes and refocuses)
  and a deliberate "close without restoring focus" path when the pointer is
  heading elsewhere (`:322`).
- No package in the workspace depends on `@angular/cdk`.

**Consequence:** if a popup is approved, it should be the same *manual popover +
feature detection + explicit focus contract* used by toast/select — no CDK, no
new dependency. Copying select's popup wholesale is not free: it would make
`@rivinia/i18n/ui` depend on `@rivinia/select/ui` (a new peer) or duplicate it.

---

## 5. Content projection in Angular 22

Available tools ([angular.dev content projection](https://angular.dev/guide/components/content-projection),
[queries](https://angular.dev/guide/components/queries),
[ng-template](https://angular.dev/guide/templates/ng-template)):

- `<ng-content>` slots are compiled at build time; they render whatever is in
  the consumer's template **immediately**, even when the component hides the
  surrounding element with `@if`. Never use `ng-content` for popup content:
  it would instantiate projectors (and their signals/HTTP calls) eagerly.
- The correct primitive is `<ng-template>` + `TemplateRef` rendered with
  `*ngTemplateOutlet="tpl; context: {$implicit: language, selected: …}"`; the
  consumer declares `let-language` / `let-selected="selected"`.
- Angular 22 queries: `contentChild` / `contentChildren` (signal-based), with
  `{ descendants: true }` to search nested nodes; values are available after
  content init. A directive such as `[rvLanguageOption]` can inject `TemplateRef`
  and expose a typed context instead of a bare `TemplateRef`.

Two projection shapes worth offering:

1. **Option template** — `<ng-template rvLanguageOption let-lang let-selected="selected">`
   renders the *inside* of one option (icon + name + optional description). It
   works for the native `base-select` path (inside `<option>`) and for a custom
   listbox (inside `role="option"`). This is the piece that gives "icons and
   multilingual names" without a popup.
2. **Trigger template** — `<ng-template rvLanguageTrigger let-lang>` for an
   icon-only or branded button. It must receive the accessible name through the
   `label` input: an icon-only trigger with no text is an a11y failure.

Projected content is consumer-owned: the library must not assume it is plain
text. When a custom option template is present, `aria-label`/text fallbacks are
still computed from `nativeName` so an empty template never yields an unnamed
option.

---

## 6. Icons

- Keep the library icon-agnostic: no icon font, no SVG sprite, no Material
  Icons dependency. Icons arrive through projection (option template / trigger
  template) or as consumer markup.
- Decorative icons inside an option get `aria-hidden="true"` plus
  `focusable="false"` (the library cannot add these to projected nodes — the
  docs and the example must show it).
- An icon-only trigger needs `aria-label` (or `label` input rendered as
  visually-hidden text). Do not rely on `title`.
- If a "flag" mode is ever requested, treat it as consumer-provided imagery with
  an explicit warning, never a bundled flag set (§3).
- Theme integration: icons inherit `currentColor`; document it so
  `var(--rv-i18n-…)` tokens keep working.

---

## 7. Options for the dropdown (the decision)

| Option | A11y | Bundle / deps | RTL / SSR | Rich content | Maintenance |
| --- | --- | --- | --- | --- | --- |
| **A. Native `<select>` (+ `base-select` enhancement)** — current spec | Best; platform pickers | Zero new deps | Native; SSR trivial | Text always; icons where `base-select` is supported | Low |
| **B. Own listbox in a manual popover** (copy toast/select pattern) | Good *if* APG listbox is implemented exactly (activedescendant, typeahead, Escape, focus return) | Zero deps, but ~300–500 lines + tests ×3 browsers | Must measure placement and logical-property flipping; SSR renders closed | Full: icons, descriptions, groups, search | High; becomes a second popup implementation in the repo |
| **C. Recipe only** — `rvLanguageSwitcher` renders a button that opens the app's own `rv-menu`/`rv-select` | Inherits those packages' a11y | Zero new code; docs + tests only | Inherits | Full, via the host's slots | Lowest; no new surface |

**Recommendation:**

1. Ship A now (`rv-language-toggle`, `rv-language-select`,
   `rv-language-switcher`) plus the two projection templates from §5; this
   covers icons and multilingual labels with no popup and no new dependency.
2. Keep C as the documented answer for "inside a dropdown / user menu" — it
   already exists in `@rivinia/menu/ui` and `@rivinia/select/ui`.
3. Build B only if the owner explicitly supersedes the "no custom popup" rule
   (new D-entry). If so, reuse the toast/select manual-popover contract and
   implement the APG listbox keyboard model, not the menu model: arrow keys move
   the active option, **Enter/Space commits**, Escape closes and restores focus,
   typeahead uses `Intl.Collator` over the *rendered* names.

---

## 8. Proposed API (all names are proposals)

```ts
// Structural slice of RiviniaI18n the components drive (same idea as toast).
export interface RiviniaLanguageManager {
  readonly languages: () => readonly LanguageLike[];
  readonly currentLanguage: () => string;
  readonly loadingState: () => 'idle' | 'loading' | 'error';
  setLanguageAsync(id: string): Promise<void>;
}

export interface LanguageLike {
  readonly id: string;
  readonly nativeName?: string;
  readonly locale?: string;
  readonly dir?: 'ltr' | 'rtl';
}

// rv-language-toggle | rv-language-select | rv-language-switcher
@Component({ selector: 'rv-language-switcher' })
export class RiviniaLanguageSwitcher {
  // one source of truth: manager wins over the presentational inputs
  readonly manager = input<RiviniaLanguageManager>();
  readonly languages = input<readonly LanguageLike[]>([]);
  readonly current = input<string>();
  readonly label = input<string>();            // required accessible name, already translated
  readonly variant = input<'auto' | 'toggle' | 'select'>('auto');
  readonly disabled = input(false);

  readonly languageChange = output<string>();  // emitted for presentational mode too
}

// Templates captured with contentChild/contentChildren + TemplateRef
@Directive({ selector: '[rvLanguageOption]' })   // context: { $implicit: LanguageLike; selected: boolean }
@Directive({ selector: '[rvLanguageTrigger]' })  // context: { $implicit: LanguageLike }
```

Open details to settle before coding: `LanguageLike` vs importing `Language`
as a type; whether `variant` also accepts `'list'` (custom listbox) or that is a
separate component; whether `languageChange` fires before or after
`setLanguageAsync` resolves; `aria-live` announcement of the switch (silent by
default — the `<html lang>` change is the announcement, per core behaviour).

---

## 9. Testing plan

- Unit (TestBed, in `projects/i18n/tests/` per D50): a five-member test double
  for the manager; toggle picks the other language; switcher picks toggle for 2
  and select for 3+; `aria-busy` while loading; `data-state="error"`; projected
  option template receives `language` and `selected`; empty `nativeName` falls
  back to `DisplayNames` then id; SSR render is closed and inert.
- Playwright (i18n-e2e, chromium + firefox at minimum): keyboard-only switch on
  the native select, RTL layout flip for `dir="rtl"`, hydration with no console
  errors, and (if option B) Escape/focus-return/typeahead.
- a11y: axe-core run is nice-to-have, not a substitute for the APG keyboard
  matrix; VoiceOver/NVDA manual check for per-option `lang` remains unverified
  in this research.

---

## 10. Sources

- APG Menu Button — https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
- APG Listbox — https://www.w3.org/WAI/ARIA/apg/patterns/listbox/
- APG Combobox — https://www.w3.org/WAI/ARIA/apg/patterns/combobox/
- Popover API (MDN) — https://developer.mozilla.org/en-US/docs/Web/API/Popover_API
- Customizable `<select>` (MDN) — https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Forms/Customizable_select
- `base-select` support round-up — https://modern-css.com/articles/build-a-styled-select-dropdown/
- `Intl.DisplayNames` (MDN) — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DisplayNames
- W3C i18n: do not use flags for languages — https://www.w3.org/TR/i18n-html-tech-lang/
- Angular content projection — https://angular.dev/guide/components/content-projection
- Angular queries (contentChild/contentChildren) — https://angular.dev/guide/components/queries
- Angular `ng-template` / `ngTemplateOutlet` — https://angular.dev/guide/templates/ng-template
- CDK Overlay (for the comparison only) — https://material.angular.dev/cdk/overlay
- Repo: `projects/i18n/SPEC-0.6.md` §3; `projects/toast/ui/src/lib/components/toast-list/toast-list.ts`; `projects/select/ui/src/lib/components/popup/select-popup.{ts,html}`.

### Not verified
- Exact screen-reader behaviour for `lang`/`dir` on `<option>` across NVDA,
  JAWS and VoiceOver (platform-dependent; needs a manual matrix).
- Whether `base-select` reaches Baseline during 2026; Firefox/Safari status
  changes quickly.
- CDK overlay's current API surface (the docs page returned only the Material
  shell in this session) — irrelevant while the no-CDK rule stands.
