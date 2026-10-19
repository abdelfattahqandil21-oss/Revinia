/**
 * `@rivinia/theme` ships no TypeScript.
 *
 * It is a token layer: a stylesheet you import once, so the whole Rivinia
 * component ecosystem reads one palette. The CSS is published as package
 * assets and reached through the `exports` map:
 *
 *   @import '@rivinia/theme';           the semantic layer
 *   @import '@rivinia/theme/tailwind.css';
 *   @import '@rivinia/theme/bootstrap.css';
 *
 * This entry point exists because ng-packagr needs a TypeScript root; it
 * exports nothing on purpose.
 */
export {};
