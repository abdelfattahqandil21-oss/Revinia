## 2026-10-29 — D72: a duplicate language id is also rejected at compile time

- **Why both.** D71 throws at bootstrap, but the mistake is written at the call site and
  the owner asked for the error while typing, not at runtime. The runtime check stays: it
  is the only guarantee for JS callers, for hoisted lists and for anything built at runtime.
- **Mechanism.** `DuplicateLanguageId<T>` walks the `languages` tuple recursively and
  yields the repeated id (or `never`); `AssertUniqueLanguageIds` turns that into either
  `unknown` or `{ readonly duplicateLanguageId: Duplicate }`, and both
  `provideRiviniaI18n` and `defineRiviniaI18n` take
  `C & AssertUniqueLanguageIds<C['languages']> & RiviniaI18nConfig<L>`. A duplicate then
  fails with `Property 'duplicateLanguageId' is missing …`, and the required type names
  the offending id (`{ readonly duplicateLanguageId: "ar"; }`).
- **`const C`, not overloads.** The scan needs the literal type, so the config parameter
  gained `const C extends RiviniaI18nConfig<L> = RiviniaI18nConfig<L>`. Overloads were
  tried first and did not work: TypeScript picked the permissive second overload
  (`<L extends string>`) and the duplicate compiled — the spec proved code 0, not 2. A
  single defaulted-`const` signature rejects it.
- **The trailing `& RiviniaI18nConfig<L>` is load-bearing.** Without it, `L` cannot be
  inferred when the config object is assembled with a spread
  (`{ options, ...partial }`): `C` falls back to its default and `L` to its constraint,
  `string`, so every such call became a `TS2345` on `onLoadError`'s contravariance. The
  extra conjunct gives `L` an independent inference site without weakening the guard —
  the same spread form with a duplicate still errors.
- **What it does not see.** Two forms widen the argument before the scan, so `C` takes its
  default and `DuplicateLanguageId` resolves to `never`: passing the union explicitly
  (`provideRiviniaI18n<'ar' | 'en'>(…)`) and hoisting the list
  (`const LANGS: readonly Language<L>[] = […]`). Both still hit D71's runtime error at
  bootstrap, and both are pinned by tests (`language-ids-types.spec.ts`) rather than left
  as folklore.
- **Public surface.** No new export: the helper types stay module-private, so the check is
  a compiler constraint on the existing signatures, not API consumers must name. The
  `const` parameter and the extra property are erased; declaration output keeps the same
  call shape.
- **Versioning.** 0.7.1 — additive. Valid configs that compiled before still compile; the
  new parameter is defaulted so inference is unchanged.
