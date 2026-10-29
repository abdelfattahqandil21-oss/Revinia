# @rivinia/i18n/ui — the language toggle and the trigger template

Status: **revision 5 (implementation fix), 2026-10-29**. Revision 4 changed §6, §7,
§11.1 and §13 only. Revision 5 changes §8 only: the border and font tokens are a
colour and a font family under a `1px solid var(--…)` / `font-family: var(--…)`
declaration (D42), not shorthands. Revision 3 was approved by the owner.
Target release: **0.7.0** (pre-1.0: a minor may break). Nothing here is published.
Baseline: `main` at `928300f`; `@rivinia/i18n` 0.6.0 published from tag `i18n/v0.6.0`
(`b976cc5`, untouched).

Supersedes:
- `SPEC-0.6.md` §3 wherever it differs. That section also describes
  `rv-language-select`, `rv-language-switcher` and menu/select popup recipes; none
  of those ship here (see §12).
- `RESEARCH-ui.md` where it differs from this file. The research stays committed as
  the evidence trail, not as a contract.

Decisions already taken by the owner:
- **D6 (§5.3 behaviour).** Three or more languages → dev warning + `aria-disabled`
  on the inner button. No silent cycling through the first two. `aria-disabled`, not
  the native `disabled` attribute: the control stays in the tab order and is
  discoverable. This deliberately differs from `RiviniaI18n.toggle()`, which flips
  the first two languages and only warns.
- **Emission (§5.2).** `languageChange` fires **only after** `setLanguageAsync` has
  resolved **and** `currentLanguage() === target`. Never at activation time. A
  failed load emits nothing, and the component shows no error state of its own.

Everything else in this file is a **proposal** and is listed in §13 for confirmation
before the first line of component code.

---

## 1. Scope

Ships in 0.7.0, from the secondary entry point `@rivinia/i18n/ui`:

| Export | Kind | Selector / shape |
| --- | --- | --- |
| `RiviniaLanguageToggle` | component | element `rv-language-toggle`; renders its own inner `<button>` |
| `RiviniaLanguageTrigger` | directive | attribute `[rvLanguageTrigger]` |
| `RiviniaLanguageManager` | type (interface) | structural, see §4.1 |
| `LanguageLike` | type (interface) | `@rivinia/i18n/ui`'s own language shape |

Does **not** ship: `rv-language-select`, `rv-language-switcher`,
`rvLanguageOption` (option template), any popup, any flags or icon assets, any
network/profile code, any axe wiring. §12 says where each of those went.

The entry point is a real npm boundary (`exports["./ui"]`, own FESM and types
chunk), not an automatic lazy chunk.

---

## 2. Why this shape

The three shapes in the research have very different costs:

- **Toggle** (two languages): one control, no popup, no focus management into a
  popup. The accessible name is the only thing to get right.
- **Select** (three or more): APG-correct for free via the native `<select>`, but
  the closed control and the option list are OS-styled, and rich option content is
  unreliable across browsers.
- **Custom listbox / menu popup**: full control, but it is a second popup
  implementation in this repo plus the whole APG listbox keyboard model
  (active descendant, typeahead, Escape, focus return) and tests in three browsers.

A toggle covers the two-language navbar — the common case — at the lowest
maintenance cost, and the trigger template is what makes it usable for an
icon-only or branded control without shipping any imagery. The many-language case
and the "inside the user's menu" case already have homes in `@rivinia/menu/ui` and
`@rivinia/select/ui`; §12 defers them rather than inventing a third.

---

## 3. Package layout (D50)

```
projects/i18n/ui/ng-package.json                     # {"lib": {"entryFile": "src/public-api.ts"}}
projects/i18n/ui/src/public-api.ts
projects/i18n/ui/src/lib/models/language-view.ts     # LanguageLike, RiviniaLanguageManager
projects/i18n/ui/src/lib/utils/language-name.ts      # nativeName → DisplayNames → id
projects/i18n/ui/src/lib/components/language-toggle/
    language-toggle.ts
    language-toggle.html
    language-toggle.css
    language-trigger.directive.ts                    # see §13 decision 7
projects/i18n/tests/language-toggle.spec.ts          # specs live outside the shipped source
projects/i18n/tests/language-toggle-manager.spec.ts
projects/i18n/tests/language-trigger.spec.ts
projects/i18n/tests/language-name.spec.ts
projects/i18n/tests/ui-surface.spec.ts
```

`angular.json` needs no change: the `i18n` test target already includes
`../tests/**/*.spec.ts` relative to `sourceRoot` (`projects/i18n/src`), and the
project prefix is already `rv`. `tsconfig.json` gains one path mapping:

```json
"@rivinia/i18n/ui": ["./dist/i18n/ui"]
```

`scripts/check-docs.mjs` needs no change — `collectExports` already walks every
immediate subdirectory's `src/public-api.ts`, so the new exports are checked
against the README tier table automatically. The tier table and the
"single public entry point" line in `projects/i18n/README.md:15` do need editing.

---

## 4. API

### 4.1 Types

```ts
import type { Direction } from '@rivinia/i18n';

/** The slice of a language entry the toggle needs. Structurally satisfied by
 *  `Language` from @rivinia/i18n (which requires `dir`). */
export interface LanguageLike {
  readonly id: string;
  readonly nativeName?: string;
  readonly dir?: Direction;   // absent → rendered as dir="auto"
  readonly locale?: string;
}

/** The structural slice of `RiviniaI18n` the toggle drives (D30 shape).
 *  `RiviniaI18n` satisfies it with no import from core at runtime. */
export interface RiviniaLanguageManager {
  readonly languages: () => readonly LanguageLike[];
  readonly currentLanguage: () => string;
  readonly loadingState: () => 'idle' | 'loading' | 'error';
  setLanguageAsync(id: string): Promise<void>;
}
```

`LanguageLike` rather than `Language`: `Language.dir` is required and `Language<T>`
is generic over the id union. Requiring `Language` would force every test double
and every presentational consumer to declare `dir`.

The manager slice deliberately **excludes** `loadingError` and `onLoadError`. Those
exist on the concrete service — `RiviniaI18n.loadingError`
(`projects/i18n/src/lib/services/rivinia-i18n.ts:131`) and
`RiviniaI18nConfig.onLoadError`
(`projects/i18n/src/lib/models/i18n-config.ts:33`) — but they are not part of the
four-member contract, so §5.5 cannot promise behaviour through the interface.

### 4.2 Component

```ts
@Component({
  selector: 'rv-language-toggle',            // element selector
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiviniaLanguageToggle {
  readonly manager    = input<RiviniaLanguageManager>();
  readonly languages  = input<readonly LanguageLike[]>([]);
  readonly current    = input<string>();
  readonly label      = input<string>();       // "Switch language" fragment
  readonly busy       = input(false);          // presentational mode only
  readonly disabled   = input(false);          // §13 decision 5: closed, shipped

  readonly languageChange = output<string>();
}
```

Rules:

- **The host element is the API.** `<rv-language-toggle>` is the element a consumer
  writes; the component renders one inner `<button type="button">`, and every
  class/`data-*` hook except the host itself belongs to that button (§8).
- **Manager wins.** When `manager()` is set, its `languages()`,
  `currentLanguage()` and `loadingState()` are the source of truth and the
  presentational inputs are ignored (D30: managed mode wins, so the view never
  races the manager).
- **Presentational mode** (no manager): `languages()` + `current()` + `[busy]`
  describe the state, and `languageChange` is the only side effect.
- `label` is the *action* fragment ("Switch language"), not the language name.
  See §6 for how the full accessible name is composed.

### 4.3 Trigger directive

```ts
@Directive({ selector: '[rvLanguageTrigger]' })
export class RiviniaLanguageTrigger {}

export interface RiviniaLanguageTriggerContext {
  $implicit: LanguageLike;   // the language the button switches TO
  busy: boolean;
}
```

Captured with `contentChild(RiviniaLanguageTrigger, { read: TemplateRef })` and
rendered **inside the inner button**, in place of the default name span. It
receives a context, so a consumer writes:

```html
<rv-language-toggle [manager]="i18n" label="Switch language">
  <ng-template rvLanguageTrigger let-lang let-busy="busy">
    <img [src]="'flags/' + lang.id + '.svg'" alt="" aria-hidden="true" focusable="false">
    <span [lang]="lang.id">{{ lang.nativeName }}</span>
  </ng-template>
</rv-language-toggle>
```

Templates, not `ng-content`: projected `<ng-content>` is instantiated even while
the surrounding element is hidden by `@if`, so a conditional trigger would run its
bindings eagerly.

Rendering uses `ViewContainerRef.createEmbeddedView(tpl, ctx)` in the component,
which keeps `@angular/common` out of the peer list (decision 1 in §13).

---

## 5. Behaviour

### 5.1 Which language is shown

Exactly two languages: the button shows **the other one** — the language that
activating it switches to. That is the whole point of a toggle: the label is the
destination, and a screen reader announces where the user is going.

The default rendering is (the inner button owns the name, so `lang`/`dir` sit on
it, not on the host):

```html
<rv-language-toggle data-languages="2">
  <button type="button" class="rv-language-toggle__button" lang="ar" dir="rtl">
    <span class="rv-language-toggle__name">العربية</span>
  </button>
</rv-language-toggle>
```

### 5.2 Activation — the emission contract

```
activate(target):
  if disabled()            → return          # the app disabled the control (§13.5)
  if languageCount() !== 2 → return          # 0/1 render nothing; ≥3 is aria-disabled (§5.3)
  if isBusy()              → return          # ignore, never queue (§5.4)
  if target.id === current → return          # already there, nothing to announce
  emit = () => languageChange.emit(target.id)

  managed:
    await manager.setLanguageAsync(target.id)
    if manager.currentLanguage() === target.id  → emit()
    # otherwise: no emit. No loadingState write, no error UI. (§5.5)

  presentational:
    emit()                                   # nothing to await
```

Three consequences worth stating in the README, because they are easy to
misread:

1. **Emission is a confirmation, not an intention.** A consumer that persists the
   choice to a profile can treat `(languageChange)` as "the switch happened" —
   there is no need to re-check `currentLanguage()`.
2. **A lost race emits nothing.** The core has no supersede token: when two
   switches overlap, the one whose load resolves last applies, and the earlier call
   may be applied and then overridden. Because the emit is gated on
   `currentLanguage() === target` *after* the await, an outvoted call is silent
   rather than announcing a switch that did not stick.
3. **Presentational mode is synchronous.** With no manager there is nothing to
   await, so the event fires on activation. The asymmetry is documented; a consumer
   that needs the managed semantics supplies a manager.

`setLanguageAsync` never rejects, so no `try`/`catch` is needed and none is added.
It also resolves without applying for an unknown id or the current id; both are
guarded before the call, so the post-check is the only place that can fail.

### 5.3 Language count — decided

| `languages().length` | Behaviour |
| --- | --- |
| 0 or 1 | **nothing renders**: the host stays empty and carries no `data-*` attribute (§8) |
| 2 | normal toggle |
| ≥ 3 | dev warning + **`aria-disabled="true"` on the inner button**; the button keeps its label and its accessible name |

≥ 3 is the owner's decision (recorded in D68, §14), and it uses `aria-disabled`,
**not** the native `disabled` attribute: the control remains in the tab order and
a keyboard or screen-reader user can reach it and hear *why* it is unavailable
(through its name plus the dev-facing reason in the docs). A native `disabled`
button would silently vanish from the tab order.

Rationale for not cycling: `toggle()` in core flips the first two languages and
warns; copying that into the UI would silently promote `languages[0]`/`languages[1]`
to a privileged pair and hide the other languages from a user who cannot see them.
Disabling is honest — the app should use a select, a menu, or a custom control for
three or more.

The dev warning fires once per component instance when the count crosses into ≥ 3
(not on every change detection), and is silent in production builds.

**`≥ 3` wins over busy.** With three or more languages the component never
activates, **even while the manager is loading** (`isBusy()` true). The count guard
runs before the busy guard in §5.2, so the "wrong shape" verdict is stable instead
of alternating with a transient busy state — a control that sometimes ignores a
click because it is loading and sometimes because the data is wrong is impossible
to diagnose from the outside.

The contrast with the `[disabled]` input (§13 decision 5, closed) is deliberate:
`[disabled]` is the app saying "this control is unavailable" and sets the real
`disabled` attribute (out of the tab order); ≥ 3 is the component saying "this
shape is wrong for your data" and keeps the control reachable.

### 5.4 Busy

```ts
readonly isBusy = computed(() => {
  const manager = this.manager();
  return manager ? manager.loadingState() === 'loading' : this.busy();
});
```

(`isBusy`, not `busy`: the presentational input is already named `busy`, and a
member of the same name would shadow it.)

- While busy the button carries **`aria-busy="true"` and nothing else**. No
  `aria-disabled`, and the native `disabled` attribute is never set for busy: the
  user just activated this control, so dropping it out of the tab order (or
  announcing it as unavailable) would be the worst possible moment.
- Activation is **ignored in the handler**, not queued. A queue would replay a
  click after an arbitrary delay and, because the core has no supersede token, could
  stack overlapping switches.
- Focus stays on the button; the component never moves focus.
- `isBusy` is derived state: the component never writes it back to the manager.

### 5.5 Failure

The UI has no error state. A failed load leaves the visible language unchanged
(the core only applies after a successful load, and its `'error'` branch requires
the target to already be current, so a switch to another language settles back to
`'idle'`). The toggle therefore:

- emits nothing,
- renders no message,
- keeps the previous label.

Any error surface is the manager's own. On the concrete service that means
`RiviniaI18n.loadingError`
(`projects/i18n/src/lib/services/rivinia-i18n.ts:131`) and the
`onLoadError` config callback
(`projects/i18n/src/lib/models/i18n-config.ts:33`); neither is part of
`RiviniaLanguageManager`, so the toggle cannot and does not read them. Apps that
need a failure surface render their own message next to the toggle.

---

## 6. Accessible name (D57 / WCAG 2.5.3)

The rule from D57: a control's accessible name must **start with** its visible
text, otherwise voice-control users cannot say what they see.

- The visible text is the target language's name.
- Default rendering: name = `${visibleName}` when no `label` is given, or
  `${visibleName}, ${label}` when it is — e.g. `العربية, Switch language`.
  `lang`/`dir` sit on the inner button, so the whole name is pronounced in the
  target language.
- `label` is never auto-translated. The UI entry point cannot call `translate()`
  without importing core runtime code (D06), so the app passes an already
  translated string. This is the research's option 1.
- No `aria-live`. The switch is announced by the `<html lang>` change the core
  already performs, plus the button's own name flipping to the new target.
- No `title` attribute is used for naming.

> **WARNING — trigger template and the accessible name.**
> With `rvLanguageTrigger`, the accessible name is computed from the **target
> language**, not from what the template renders. The library cannot see the
> projected DOM, so it cannot verify what the user reads.
> Any visible text inside the template **must remain a prefix of the accessible
> name** (WCAG 2.5.3 / D57). A template that renders a flag and the text
> `العربية` under an accessible name of `English, Switch language` is a voice-control
> failure: the user says "العربية" and nothing matches.
> Consequences the README must state:
> 1. `label` is required with a custom template (a dev warning fires without it).
> 2. The composed name is set as `aria-label` on the **inner button**, the element
>    that owns the name (§7) — never on the host, and there is no `aria-label`
>    input. It is `${targetName}` or `${targetName}, ${label}`. Visible text a
>    template renders must therefore be a prefix of that string: render the target
>    language's own name and pass `label` only for the action words that follow it.
>    `label` is appended, so it cannot repair a template whose visible text
>    precedes the target name — such a template must be changed, not the name.
> 3. Icon-only triggers are safe: with no visible text there is no prefix to
>    violate, and the name is still non-empty.

---

## 7. Names, `lang` and `dir`

Resolution order, once per (locale, id) pair:

1. `nativeName` — consumer-supplied, authoritative and cheap.
2. `Intl.DisplayNames([locale ?? id], { type: 'language' })`.
3. `id` — the raw code, never an empty string.

Guards: `typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'`,
inside `try`/`catch` (unsupported tags throw `RangeError`). SSR in Node 24 has full
ICU, so step 2 normally succeeds on the server too.

The computed name is rendered with `lang="<id>"` and the entry's `dir`
(`dir="auto"` when the entry omits it) on the **inner button** — the element that
owns the accessible name.

The lookup lives in `ui/src/lib/utils/language-name.ts` as
`languageName(entry: LanguageLike): string`. It is **internal**: neither entry point
exports it. Its cache is keyed per (locale, id), and the unit suite measures it by
counting `Intl.DisplayNames` constructions — two calls for the same pair construct
one, a new locale constructs another.

**Design, to be confirmed by the e2e matrix: `lang`/`dir` live on the inner
`<button>`, not on the host `<rv-language-toggle>` and never on `<html>`.** The host
inherits the page's language and direction, which is what layout should follow; the
button carries the target language, which is what the name's pronunciation and
bidi layout should follow. If the matrix finds a browser that disagrees, the fix is
a new decision entry — **not** a silent move of the attributes to the host.

The inner span inherits from the button and is not given a second `lang`. A trigger
template **inherits the button's `lang`/`dir`** for free, so text it renders in the
target language needs nothing extra. The README must tell consumers to set `lang`
explicitly on any text that is **not** in the target language — a "current
language" label, a hint, a flag's alt text — because such text would otherwise be
pronounced and laid out as the target language.

In a custom trigger template the consumer's markup owns its own `lang`, as the
§4.3 example shows.

**No flags.** The W3C i18n guidance against flag icons is explicit, and
`RESEARCH-ui.md` §3 records it. If an app wants imagery (the §4.3 example does,
purely as a consumer-side illustration), it supplies it through
`rvLanguageTrigger`; the library ships no assets.

---

## 8. Styling (D42 / D44 / D67)

The token chain is `var(--rv-i18n-toggle-<x>, var(--rv-<semantic>, <default>))`, with one
type rule from D42: **a semantic token must be the same value kind as the package token.**
`--rv-border` is a colour and `--rv-font` is a font family, so the border and font
declarations supply the shorthand themselves —
`border: 1px solid var(--rv-i18n-toggle-border, var(--rv-border, currentColor))` and
`font-family: var(--rv-i18n-toggle-font, var(--rv-font, inherit))` — instead of passing a
colour where a shorthand is expected (which drops the border entirely) or a family stack
where `font` is expected (which drops the declaration). All sizes in `rem`, logical
properties only.

| Token | Falls back to | Default |
| --- | --- | --- |
| `--rv-i18n-toggle-bg` | `--rv-bg` | `transparent` |
| `--rv-i18n-toggle-fg` | `--rv-fg` | `currentColor` |
| `--rv-i18n-toggle-border` | `--rv-border` | `currentColor` (with `1px solid` from the declaration) |
| `--rv-i18n-toggle-radius` | `--rv-radius` | `0.5rem` |
| `--rv-i18n-toggle-shadow` | `--rv-shadow` | `none` |
| `--rv-i18n-toggle-font` | `--rv-font` | `inherit` |
| `--rv-i18n-toggle-padding` | — | `0.5rem 0.75rem` |
| `--rv-i18n-toggle-gap` | — | `0.5rem` |
| `--rv-i18n-toggle-size` | — | `0.875rem` |
| `--rv-i18n-toggle-hover-bg` | — | `color-mix(in srgb, currentColor 8%, transparent)` |
| `--rv-i18n-toggle-active-bg` | — | `color-mix(in srgb, currentColor 10%, transparent)` |
| `--rv-i18n-toggle-focus-ring` | — | `2px solid currentColor` |
| `--rv-i18n-toggle-focus-offset` | — | `0.125rem` |
| `--rv-i18n-toggle-disabled-opacity` | — | `0.45` |

Names follow the menu/select trigger vocabulary (`bg/fg/border/radius/shadow/font`,
`-hover-bg`, `-active-bg`, `-focus-ring`, `-focus-offset`, `-disabled-opacity`,
`-padding`, `-gap`, `-size`) so a consumer who themed the menu trigger recognises
this one. All `--rv-i18n-toggle-*` names are new — no `--rv-i18n` token exists
today.

Stable override surface, documented in the README:

- host element `rv-language-toggle` — the only element a consumer writes;
- class `rv-language-toggle__button` on the inner `<button>`, and
  `rv-language-toggle__name` on the default name span;
- on the **host**: `[data-busy]`, `[data-disabled]`,
  `[data-languages="2" | "many"]`.

`data-busy` mirrors `isBusy`; `data-disabled` mirrors **only** the `[disabled]`
input (the real `disabled` attribute). The ≥ 3 state is **never** signalled by
`data-disabled`: it is `data-languages="many"` plus `aria-disabled="true"`, so a
stylesheet can always tell "the app disabled this" apart from "this shape is wrong
for the data". `data-languages` reports `"2"` or `"many"`.

**With 0 or 1 languages nothing renders, so the host carries no `data-*` attribute
at all** — it is an empty `<rv-language-toggle>` element. Any `[data-languages]`
based selector therefore has nothing to match, by design.

The ≥ 3 state uses `aria-disabled`, so it is styled off
`[data-languages="many"] [aria-disabled="true"]`, not `:disabled`. There is no
`data-state="error"`: the component has no error state (§5.5).

---

## 9. SSR and hydration

- The component renders identically on the server: same markup, `aria-busy` from
  `isBusy()`, `type="button"`, no `window`/`document` access.
- Names come from `nativeName` (inline, server-safe) or `Intl.DisplayNames` (Node
  24 ICU).
- **Risk, not measured:** if the server's CLDR data differs from the browser's, the
  displayed language name can differ between the SSR HTML and the first client
  render. The mitigation documented in the README is to supply `nativeName`, which
  short-circuits the lookup. Not verified in this round — no CLDR skew was
  reproduced.

---

## 10. Boundaries (D06 / D30)

- `@rivinia/i18n/ui` imports **types only** from `@rivinia/i18n`
  (`import type { Direction }`). No runtime import of core code.
- Verified by grepping the built FESM: the UI chunk must reference only
  `@angular/core` (`ɵɵdefineComponent` and friends).
- No new peer dependencies. `@angular/common` stays out of the peer list because
  the trigger template is rendered through `ViewContainerRef` (§4.3, §13 decision 1).
- No cross-package internal imports; the UI never reaches into
  `projects/i18n/src/lib/**`.

---

## 11. Tests

### 11.1 Unit (`projects/i18n/tests/`)

| File | Asserts |
| --- | --- |
| `language-toggle.spec.ts` | two languages → the visible name is the *other* one; `lang`/`dir` on the inner button; `aria-busy` while loading; activation ignored while busy; `[disabled]` sets the native attribute and blocks activation; 0/1 languages → host empty and no `data-*` attribute; 3 → `aria-disabled="true"` on the inner button, **no** native `disabled`, still focusable, one dev warning per instance; 3 languages **while `loadingState() === 'loading'`** → still no `setLanguageAsync` call (≥3 wins over busy) |
| `language-toggle-manager.spec.ts` | `FakeManager implements RiviniaLanguageManager`; manager beats `[languages]`/`[current]`; `setLanguageAsync` called exactly once with the target id; activation on the current language calls nothing; **emit only when `currentLanguage()` became the target after the await**; no emit when the manager leaves the language unchanged (simulated failure); no emit for an outvoted overlapping call |
| `language-trigger.spec.ts` | `[rvLanguageTrigger]` receives `{ $implicit: target, busy }`; the template is not instantiated before first render and not at all when the button is not rendered; without a template the default name span renders; missing `label` with a template → dev warning, name still non-empty |
| `language-name.spec.ts` | `nativeName` wins; `DisplayNames` used when absent; `id` when `Intl.DisplayNames` is absent or throws; result cached per (locale, id) |
| `ui-surface.spec.ts` | every export in `ui/src/public-api.ts` appears in the README tier table; source grep finds no `from '@rivinia/i18n'` other than `import type` |

The "outvoted overlapping call" row covers an **edge case, not the normal path**:
§5.4 ignores activation while busy, so a second activation only exists when the
manager reports a state other than `'loading'` while a request is pending (a
preload-first manager). The spec pins the post-await check; it does not ask for a
queue.

### 11.2 Browser (`projects/i18n-e2e/`)

- New route rendering the toggle twice: managed, and presentational with a
  trigger template.
- Keyboard: Tab reaches the button, Enter and Space activate it, focus stays on the
  button after the switch.
- `dir` flips on `<html>` and the visible name is the new target.
- **Direction matrix, on chromium *and* firefox**, each case with the page set to
  the *opposite* direction of the target language:
  - the inner button's computed `direction` equals the target language's `dir` —
    §7's design, which puts the attribute on the button, not on the host and not
    on `<html>`;
  - `padding-inline-start` resolves on the visually correct side: compare against
    the host's computed value and assert the rendered edge, never a hard-coded
    `left`/`right`;
  - an entry with no `dir` renders `dir="auto"`, and the button's computed
    direction follows its own text;
  - a trigger template rendering text in a **third** language (e.g. English inside
    an Arabic target) keeps its own `lang`, and that text's computed direction
    follows its `lang`, not the button's.

  A browser that disagrees with §7 reopens the decision; it does **not** silently
  move the attributes to the host.
- No console errors after hydration.
- Chromium and Firefox (`playwright.config.ts`); Chrome when the local binary
  exists. **No WebKit** — D39, and the config does not include it.

### 11.3 SSR

Extend `projects/i18n-e2e/e2e/ssr-smoke.mjs` with the toggle route: server HTML
contains the button with the target language's name and its `lang`/`dir`, and
hydration produces zero console errors.

Not included: `@axe-core/playwright`. It is a devDependency with zero imports
today; wiring it is its own change, and it does not replace the keyboard matrix
above.

---

## 12. Deferred (with where each went)

| Deferred | Why | Home |
| --- | --- | --- |
| `rv-language-select` | native `<select>` + optional `base-select`; OS-styled, rich options unreliable | next UI release |
| `rv-language-switcher` (`variant="auto"`) | only meaningful once both shapes exist | same release as the select |
| `rvLanguageOption` template | no option list ships in 0.7.0 | with the select |
| Any custom popup | second popup implementation + full APG listbox model | needs its own decision entry |
| Menu / user-menu recipes | `@rivinia/menu/ui` and `@rivinia/select/ui` already ship the primitives | README recipes, no code |
| Flags / icon assets | W3C guidance; political ambiguity | never; consumer-provided via the trigger template |
| `axe` in e2e | new infrastructure | separate change |

---

## 13. Open decisions (confirm before code)

| # | Question | A (proposed) | B |
| --- | --- | --- | --- |
| 1 | Trigger rendering | `ViewContainerRef.createEmbeddedView` — no new peer | `NgTemplateOutlet` + `@angular/common` peer |
| 2 | API tier | **closed 2026-10-29 — A: every `/ui` export is Experimental** | — |
| 3 | `label` | optional; required-with-warning only with a trigger template | always required |
| 4 | Busy activation | ignore (no queue) | queue the last activation |
| 5 | `disabled` input | **closed 2026-10-29 — A: ship it** (native `disabled`) | — |
| 7 | Directive location | inside `components/language-toggle/` (no new D50 layer) | new `ui/src/lib/directives/` layer + D50 amendment |
| 8 | Switch call | `setLanguageAsync` only | add optional `setLanguage(id): void` to the manager and prefer it |

Decision 6 (language count) is **closed** by the owner (§5.3).

Decision 8 deserves its own note: the manager interface exposes only
`setLanguageAsync`, so the toggle always takes the preload-first path even in an
app configured with the default switch strategy. Option B respects the app's
configuration but grows the D30-shaped interface to five members.

---

## 14. D68 draft (to be written to `docs/DECISIONS.md` in the docs commit)

> **2026-10-29 — D68: `@rivinia/i18n/ui` opens with a toggle and a trigger
> template, no popup**
>
> - **Scope.** `rv-language-toggle` (exactly two languages, an element that renders
>   its own inner `<button>`) plus the `rvLanguageTrigger` template directive,
>   exported from `@rivinia/i18n/ui`. No select, no switcher, no option template,
>   no popup. `SPEC-0.6.md` §3 is superseded by `SPEC-0.6-ui.md` for everything
>   this release ships, and `RESEARCH-ui.md` is superseded where the two differ.
> - **Three or more languages: a dev warning and an `aria-disabled` button.** No
>   silent cycling through the first two, and no native `disabled` attribute: the
>   control stays in the tab order so the problem is discoverable. This
>   deliberately differs from `RiviniaI18n.toggle()`, which flips
>   `languages[0]`/`languages[1]` and only warns: a UI that copied that would make
>   two of the app's languages privileged and invisible. With three or more, the
>   app should use a select, a menu, or a custom control.
> - **`languageChange` confirms, it does not intend.** The event fires only after
>   `setLanguageAsync(target)` resolves **and** `currentLanguage() === target`.
>   Never on activation. A failed load emits nothing, shows nothing, and writes no
>   state: the core's `'error'` branch in `DictionaryStore.load` requires the
>   target to already be current, so a failed switch settles back to `'idle'` and
>   the UI must not invent a failure surface. Because the event is gated after the
>   await, an overlapping switch that loses the core's last-resolved-wins race is
>   silent instead of announcing a switch that did not stick.
> - **Busy is announced, not asserted away.** While loading the button carries
>   `aria-busy="true"` only — no `aria-disabled`, never the native `disabled` — and
>   activation is ignored in the handler rather than queued. The user just
>   activated the control; removing it from the tab order at that moment is the
>   worst case for keyboard and screen-reader users.
> - **Contract.** Types only from `@rivinia/i18n` plus a structural
>   `RiviniaLanguageManager` (D30 shape, four members); no runtime import of core
>   code in the UI FESM; no new peers (D06). Manager wins over presentational
>   inputs. The trigger template is rendered through `ViewContainerRef`, so
>   `@angular/common` is not a peer, and `<ng-content>` is never used for it
>   (projected content is instantiated even when the host is hidden). Because the
>   accessible name is computed from the target language and not from the
>   template's DOM, any visible text a template renders must remain a prefix of the
>   accessible name (WCAG 2.5.3 / D57).
> - **Names and flags.** `nativeName` → `Intl.DisplayNames` → `id`, guarded.
>   The name carries its own `lang`/`dir`. No flags: W3C i18n guidance, and
>   imagery is consumer-provided through the trigger template.
> - **Versioning.** 0.7.0 — a pre-1.0 minor.
> - **Not done.** No version bump, tag or publish; no change outside
>   `projects/i18n` except the `@rivinia/i18n/ui` path mapping in `tsconfig.json`
>   and this entry.

---

## 15. Acceptance

AGENTS gates 1–6, plus:

1. `pnpm build i18n` produces `fesm2022/rivinia-i18n-ui.mjs`,
   `types/rivinia-i18n-ui.d.ts` and `dist/i18n/ui/package.json`; the generated
   `exports` map gains `./ui`.
2. Tarball inspection: `@angular/core` is the only peer; `sideEffects: false`
   intact; no `*.spec.ts`, no `src/`, no schematic changes.
3. Grep the UI FESM for `@rivinia/i18n` — zero runtime imports, types only in the
   `.d.ts`.
4. Bundle sizes recorded baseline → core-only → core+UI sync → UI lazy.
5. Unit suite green against the 0.6.0 baseline recorded in D66, which says:
   "Unit 276, schematics 40, Playwright 51 on chromium/chrome/firefox, SSR smoke
   21/21 on chromium and firefox" (`docs/DECISIONS.md:2183-2185`) — **276, not
   274** — plus the new UI specs; Playwright on chromium and firefox, SSR smoke
   including the new route.
6. README: entry points (replace "single public entry point"), tier table rows for
   the four new exports, usage example with and without a trigger template.
