/**
 * One selectable option. The controller tracks identity, label (for search
 * + display) and enabled state — icons, badges and styling are UI-owned.
 */
export interface RiviniaSelectOption {
  readonly id: string;
  readonly label: string;
  /** Shown but not selectable. @default false */
  readonly disabled?: boolean;
  /**
   * Optional hint rendered right-aligned in muted monospace (e.g. a keyboard
   * shortcut). Typeahead matches on `label` only, never on the hint —
   * consistent with `@rivinia/menu`'s documented rule that an item's
   * accessible name should match its visible text.
   */
  readonly hint?: string;
}

/** `'single'` picks one value and closes; `'multi'` toggles and stays open. */
export type RiviniaSelectMode = 'single' | 'multi';

import type { Signal } from '@angular/core';

/**
 * Structural slice of RiviniaSelect a UI layer drives. The full controller
 * satisfies it from any module realm (same input-composition rule as
 * the vendored menu controller interface).
 */
export interface RiviniaSelectController {
  readonly mode: RiviniaSelectMode;
  readonly query: Signal<string>;
  readonly filtered: Signal<readonly RiviniaSelectOption[]>;
  readonly value: Signal<string | null>;
  readonly values: Signal<readonly string[]>;
  readonly selectedLabels: Signal<readonly string[]>;
  syncOptions(list: readonly RiviniaSelectOption[]): void;
  setQuery(query: string): void;
  clearQuery(): void;
  select(id: string): boolean;
  toggle(id: string): boolean;
  /**
   * Force a value, bypassing the unknown/disabled guards of `select`.
   *
   * A UI driving a form binding writes restored values through it, so an id
   * whose option has not loaded yet is preserved rather than silently
   * dropped. Optional on the interface: an implementation predating it keeps
   * working and falls back to `select`.
   */
  setValue?(id: string | null): void;
  /** Force the values, the array counterpart of `setValue`. */
  setValues?(ids: readonly string[]): void;
  clear(): void;
  isSelected(id: string): boolean;
}
