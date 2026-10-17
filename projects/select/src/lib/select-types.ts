/**
 * One selectable option. The controller tracks identity, label (for search
 * + display) and enabled state — icons, badges and styling are UI-owned.
 */
export interface RiviniaSelectOption {
  readonly id: string;
  readonly label: string;
  /** Shown but not selectable. @default false */
  readonly disabled?: boolean;
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
  clear(): void;
  isSelected(id: string): boolean;
}
