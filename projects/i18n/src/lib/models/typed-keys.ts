/**
 * Typed-key registry. Empty by default, so `RegisteredI18nKey` resolves to
 * `string` and nothing breaks.
 *
 * Augment it (usually with the generated file from `rivinia-i18n-keys`) to
 * make every key-taking API type-checked:
 *
 * ```ts
 * declare module '@rivinia/i18n' {
 *   interface RiviniaI18nKeyRegistry {
 *     readonly keys: 'app.title' | 'app.save';
 *   }
 * }
 * ```
 *
 * A genuinely dynamic key is asserted explicitly:
 * ``i18n.translate(`status.${code}` as RegisteredI18nKey)``.
 */
export interface RiviniaI18nKeyRegistry {}

/** Every key accepted by `translate()`, `t()` and the `rvTranslate` pipe. */
export type RegisteredI18nKey = RiviniaI18nKeyRegistry extends {
  keys: infer K extends string;
}
  ? K
  : string;
