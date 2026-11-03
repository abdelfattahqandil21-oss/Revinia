# @rivinia/i18n/ui — the language toggle

Back to [the README](../../projects/i18n/README.md) ·
[the language select](select.md) · [switching the language](switching.md) ·
[the API](api.md)

```ts
import { RiviniaLanguageToggle, RiviniaLanguageTrigger } from '@rivinia/i18n/ui';
```

The control flips between exactly two languages. The button shows the language it
switches **to** — the label is the destination — and the inner `<button>` owns the
accessible name, `lang` and `dir`, so the name is pronounced and laid out in its
own language even when the page runs the other direction. The host element is the
API: write `<rv-language-toggle>`, style through the hooks below, and never reach
for the button.

**Every export of this entry point is Experimental** (D68):
`RiviniaLanguageToggle`, `RiviniaLanguageTrigger`, `RiviniaLanguageTriggerContext`,
`RiviniaLanguageManager` and `LanguageLike`. They were first published in 0.7.1 and
may change — or lose members — without a deprecation cycle until the entry point is
promoted to Stable, which needs the browser matrix and one release of consumer use
first. The core entry point keeps its own tiers; this one moves none of them. The
tiers are in [the stability table](api.md#api-stability).

## Managed, with `RiviniaI18n`

`RiviniaI18n` satisfies `RiviniaLanguageManager` structurally, so pass the service
directly. Managed state wins: `[languages]`, `[current]` and `[busy]` are ignored
while `manager` is set.

```ts
import { Component, inject } from '@angular/core';
import { RiviniaI18n } from '@rivinia/i18n';
import { RiviniaLanguageToggle } from '@rivinia/i18n/ui';

@Component({
  selector: 'app-header',
  imports: [RiviniaLanguageToggle],
  template: `<rv-language-toggle [manager]="i18n" [label]="switchLabel()" />`,
})
export class Header {
  readonly i18n = inject(RiviniaI18n<'ar' | 'en'>);
  readonly switchLabel = this.i18n.t('common.switchLanguage');
}
```

`label` is the _action_ fragment, appended after the language name. The button
above is rendered as:

```html
<button
  type="button"
  class="rv-language-toggle__button"
  lang="ar"
  dir="rtl"
  aria-label="العربية, Switch language"
>
  <span class="rv-language-toggle__icon">
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><!-- globe --></svg>
  </span>
  <span class="rv-language-toggle__name">العربية</span>
</button>
```

`label` is never translated for you — the UI entry point imports core types only,
so the app passes an already translated string (a `t()` signal re-renders on a
language switch).

## Presentational, without a manager

```html
<rv-language-toggle
  [languages]="languages"
  [current]="language()"
  [busy]="switching()"
  label="Switch language"
  (languageChange)="language.set($event)"
/>
```

With no manager, `languages` + `current` describe the state, `busy` supplies the
loading state, and `languageChange` is the only side effect. Presentational mode is
synchronous: there is nothing to await, so the event fires on activation.

## Inputs and output

| Input       | Type                      | Default | Meaning                                                                     |
| ----------- | ------------------------- | ------- | --------------------------------------------------------------------------- |
| `manager`   | `RiviniaLanguageManager`  | none    | Managed mode: the source of truth for languages, current and busy.          |
| `languages` | `readonly LanguageLike[]` | `[]`    | Presentational languages; the button shows the entry that is not `current`. |
| `current`   | `string`                  | none    | Presentational current language id.                                         |
| `label`     | `string`                  | none    | Action fragment appended to the name; required with a template.             |
| `busy`      | `boolean`                 | `false` | Presentational loading state; ignored with a manager.                       |
| `disabled`  | `boolean`                 | `false` | The app's own switch: sets the native `disabled` attribute.                 |
| `icon`      | `TemplateRef \| null`     | `null`  | Replaces the default globe; the template fills the icon box.                |

`languageChange` emits the id that is now current — see the
[emission contract](#busy-failure-and-the-emission-contract).

`LanguageLike` is `{ id, nativeName?, dir?, locale? }`: `dir` absent renders
`dir="auto"`, and `locale` is what `Intl.DisplayNames` uses when `nativeName` is
missing.

## Two languages exactly

| `languages().length` | Renders                                                          |
| -------------------- | ---------------------------------------------------------------- |
| 0 or 1               | nothing: an empty host with no `data-*` attribute                |
| 2                    | the toggle                                                       |
| 3 or more            | one button with `aria-disabled="true"` plus one dev-mode warning |

Three or more never cycles through the first two. The button keeps its name and
stays in the tab order (`aria-disabled`, not the native attribute) so a keyboard or
screen-reader user can reach it and learn that the shape is wrong for the data; the
count guard also wins over a transient busy state, so the verdict does not
alternate. Use [a select](select.md), a menu, or your own control for three or more
languages.

## Busy, failure and the emission contract

- **Busy is announced, not asserted away.** While the manager reports
  `loadingState() === 'loading'` (or `[busy]` is true, presentational) the button
  carries `aria-busy="true"` and nothing else, its cursor turns to `progress`, and
  activation is ignored in the handler rather than queued. The label, the fill and
  the colours do not move: a switch is a plain wait, and the spinner belongs to the
  product's template. Focus stays where it is; the component never moves it.
- **`languageChange` confirms, it does not intend.** In managed mode the event fires
  only after `setLanguageAsync(target)` resolves **and** `currentLanguage() === target`.
  Activating the current language emits nothing. An overlapping switch that loses the
  core's last-resolved-wins race is silent, because the check runs after the await.
- **A failure emits nothing and shows nothing.** `setLanguageAsync` aborts on a
  failed load, so the visible language, the direction and the label stay as they
  were. `RiviniaLanguageManager` is four members and includes neither `loadingError`
  nor `onLoadError`: read `RiviniaI18n.loadingError` or pass `onLoadError` in the
  config, and render your own message next to the toggle.
- **`switchStrategy` caveat.** The toggle always calls `setLanguageAsync()`, which
  waits for the dictionary and then applies, regardless of `switchStrategy`. An app
  configured with `'instant'` still gets the preload-first path through this control
  — that is what makes the confirmation above meaningful.

## The icon

The button leads with a mark: a globe drawn in `currentColor`, so it inherits the
button's colour, hover, active and disabled states without extra styling. It is
`aria-hidden` and `focusable="false"`, and it contributes nothing to the accessible
name — `aria-label` on the button supplies that (D57).

`[icon]` replaces it with a template. The template is rendered as-is inside a
`1.5em` square box that stretches it on both axes, so an `<svg>` needs no `width` or
`height` of its own:

```ts
@Component({
  imports: [RiviniaLanguageToggle],
  template: `
    <ng-template #swapIcon>
      <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" aria-hidden="true">
        <path d="M10 24h36M38 16l8 8-8 8M54 40H18M26 32l-8 8 8 8" />
      </svg>
    </ng-template>
    <rv-language-toggle [manager]="i18n" [icon]="swapIcon" [label]="switchLabel()" />
  `,
})
export class Header {
  readonly i18n = inject(RiviniaI18n<'ar' | 'en'>);
  readonly switchLabel = this.i18n.t('common.switchLanguage');
}
```

Two constraints come from that box:

- **Draw in `currentColor`.** A hard-coded fill ignores the hover and disabled
  states.
- **Design at the painted size.** The default is `1.5em` — 21px at the shipped
  `0.875rem` type — and the mark is drawn at `stroke-width="4.4"` on a 64-unit
  viewBox so it lands at ~1.4px. Artwork authored for a 16px or 24px grid is usually
  too dense here: fine latitudes and extra meridians fill in below roughly 22px. The
  shipped globe drops the latitudes of its source artwork for exactly that reason.
  Resize with `--rv-i18n-toggle-icon-size` rather than by hand, and a consumer icon
  follows the same token.

A consumer icon drawn inside `rvLanguageTrigger` instead of `[icon]` sits after the
button's own mark, so pass `[icon]` when replacing it.

## With a trigger template

`rvLanguageTrigger` replaces the default name span inside the button. The template
receives the target entry as `$implicit` and `busy`, and inherits the button's
`lang` and `dir`:

```html
<rv-language-toggle [manager]="i18n" label="Switch language">
  <ng-template rvLanguageTrigger let-language let-busy="busy">
    <svg aria-hidden="true" focusable="false"><!-- consumer-provided icon --></svg>
    <span [lang]="language.id">{{ language.nativeName }}</span>
    @if (busy) {
    <span class="spinner" aria-hidden="true"></span>
    }
  </ng-template>
</rv-language-toggle>
```

Set `lang` explicitly on any text inside the template that is **not** in the target
language — a "current language" hint, an English action word, a flag's alt text —
because it would otherwise inherit the target's `lang` and be pronounced and laid
out as that language.

> **WARNING — the template's visible text must be a prefix of the accessible name.**
> The name is computed from the target language, not read from the template's DOM,
> so the library cannot see what the template renders. Whatever text the template
> shows the user must remain a prefix of that name (WCAG 2.5.3 / D57). `label` is
> appended after the language name, so it cannot repair a template whose visible
> text comes first: such a template must be changed, not the name. A template that
> renders العربية under an accessible name of English, Switch language is a
> voice-control failure — the user says what they see and nothing matches. Icon-only
> triggers are safe: no visible text, no prefix to violate, and the name is still
> non-empty. `label` is required with a custom template; a dev-mode warning fires
> without it, and the name then falls back to the language name alone.

A text suffix is bidi-fragile, so it belongs to the name's run. When the template
adds words after the name — ", Switch language", a count, a code — put the
punctuation inside the element that holds the name and keep the whole label in one
element. As the first character of an LTR fragment a comma is pushed to the far edge
of an RTL button, far from the name it closes, and the button's `gap` then separates
it from that name in both directions. The proof page under
[`projects/i18n/testing/app/src`](https://github.com/abdelfattahqandil21-oss/Revinia/tree/main/projects/i18n/testing/app/src/app/toggle)
renders exactly this case.

## SSR and the language name

The component renders the same markup on the server and touches no browser global.
The name resolves as `nativeName` → `Intl.DisplayNames` → the raw id, cached per
(locale, id). Supply `nativeName` when the server's CLDR data might differ from the
browser's: it short-circuits the lookup, so the server HTML and the first client
render cannot disagree.

## Styling

Sizes are `rem`/`em`, and every token falls back to a `--rv-*` semantic value from
[`@rivinia/theme`](../theming.md). Override the custom property, not the
declaration:

| Token                               | Falls back to | Default                                                                                                       |
| ----------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------- |
| `--rv-i18n-toggle-bg`               | `--rv-bg`     | `transparent`                                                                                                 |
| `--rv-i18n-toggle-fg`               | `--rv-fg`     | `currentColor`                                                                                                |
| `--rv-i18n-toggle-border`           | `--rv-border` | `currentColor`                                                                                                |
| `--rv-i18n-toggle-radius`           | `--rv-radius` | `0.5rem`                                                                                                      |
| `--rv-i18n-toggle-shadow`           | `--rv-shadow` | `none`                                                                                                        |
| `--rv-i18n-toggle-font`             | `--rv-font`   | `inherit`                                                                                                     |
| `--rv-i18n-toggle-padding`          | —             | `0.5rem 0.75rem`                                                                                              |
| `--rv-i18n-toggle-gap`              | —             | `0.5rem`                                                                                                      |
| `--rv-i18n-toggle-size`             | —             | `0.875rem`                                                                                                    |
| `--rv-i18n-toggle-icon-size`        | —             | `1.5em`                                                                                                       |
| `--rv-i18n-toggle-hover-bg`         | —             | `color-mix(in srgb, currentColor 8%, var(--rv-i18n-toggle-bg, var(--rv-bg, transparent)))`                    |
| `--rv-i18n-toggle-active-bg`        | —             | `color-mix(in srgb, var(--rv-accent, currentColor) 16%, var(--rv-i18n-toggle-bg, var(--rv-bg, transparent)))` |
| `--rv-i18n-toggle-focus-ring`       | —             | `2px solid var(--rv-accent, currentColor)`                                                                    |
| `--rv-i18n-toggle-focus-offset`     | —             | `0.125rem`                                                                                                    |
| `--rv-i18n-toggle-disabled-opacity` | —             | `0.45`                                                                                                        |

The border and font tokens are a **colour** and a **font family**, not shorthands:
the declaration supplies `1px solid` and `font-family`, so `--rv-border` and
`--rv-font` from `@rivinia/theme` flow through unchanged instead of producing an
invalid shorthand.

Hover defaults to 8% of `currentColor` and active to 16% of the accent, each mixed
**over** the button's own background, so a dark `--rv-bg` keeps its fill instead of
turning see-through. A value you set for `--rv-i18n-toggle-hover-bg` or
`--rv-i18n-toggle-active-bg` replaces the whole fill, not just the tint. The hover
and active rules set `background-color`, never the `background` shorthand, so
changing the tint cannot reset the rest of the button.

The active tint and the focus ring read `--rv-accent` when the theme is present and
fall back to `currentColor` when it is not, so a page without `@rivinia/theme` looks
exactly as it did before (snapshot-proved in the theme browser matrix). In
forced-colours mode (`@media (forced-colors: active)`) the button switches to system
colours — `Canvas`/`CanvasText` at rest, `Highlight`/`HighlightText` while held,
`GrayText` at full opacity when disabled. The `box-shadow` is dropped there, because
Chromium forces author shadows to `none` on its own (measured) and the explicit
declaration backstops engines this suite cannot emulate. Held down, the focus ring
turns `CanvasText` so it is not a `Highlight` ring on a `Highlight` fill. The toggle
has no transition or animation today, so `prefers-reduced-motion` has nothing to
switch off.

The icon box is a CSS grid with `place-items: stretch`, not a flex box: the single
child is stretched on both axes by layout alone, because a descendant rule cannot
reach a consumer template (its nodes carry no `_ngcontent` attribute) and a bare
outer `<svg>` inside a stretched flex item resolves to 0×0 in WebKit.

The hooks that are safe to depend on:

- the host `rv-language-toggle` — with `[data-busy]`, `[data-disabled]` and
  `[data-languages="2" | "many"]`; `data-disabled` mirrors the `[disabled]` input
  only, so a stylesheet can tell "the app disabled this" apart from "this shape is
  wrong for the data" (which is `data-languages="many"` plus
  `aria-disabled="true"`). Both attributes are written only from 2 languages up, so
  an empty host carries neither;
- `rv-language-toggle__button`, `rv-language-toggle__icon` and
  `rv-language-toggle__name` on the inner elements.

With 0 or 1 languages the host is empty and carries no `data-*` attribute at all, so
a `[data-languages]` selector has nothing to match by design. There is no error state
to style.

## Recipes: inside a menu or beside a select (Experimental, untested)

Neither recipe is covered by this release's test matrix; the select in particular is
the supported shape for three or more languages, not something the toggle turns into.

- **Inside a menu.** The toggle is a plain `<button>` in normal flow, so it can sit
  in a panel that already exists — [`@rivinia/menu/ui`](https://github.com/abdelfattahqandil21-oss/Revinia/tree/main/projects/menu)
  ships the menu primitives. The menu's focus trap and keyboard model with this
  control inside it have **not** been tested.
- **Beside a native `<select>`.** For three or more languages, prefer the ready-made
  [language select](select.md) and leave the toggle out. If you need a native
  element instead, bind it to the service:

  ```html
  <select (change)="i18n.setLanguage($any($event.target).value)">
    @for (lang of i18n.languages(); track lang.id) {
    <option [value]="lang.id" [selected]="lang.id === i18n.currentLanguage()" [lang]="lang.id">
      {{ lang.nativeName }}
    </option>
    }
  </select>
  ```

  `@rivinia/select/ui` ships a richer popup if the native control is not enough;
  using it with this service is **untested**.

## No flags

The library ships one neutral mark — a globe — and no flag imagery. Flag icons for
languages are politically ambiguous and the W3C i18n guidance recommends against
them. A globe does not name a language it cannot represent, and it says "switch
language" without saying which. An app that wants its own mark passes `[icon]`, or
draws one inside `rvLanguageTrigger`; either way the accessible name is unaffected.
