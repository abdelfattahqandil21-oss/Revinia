import type { Signal } from '@angular/core';

/**
 * One navigable popup entry, as the controller tracks it: identity and
 * enabled state only. Labels, icons, badges and actions are UI-owned.
 */
export interface SelectPopupItem {
  readonly id: string;
  /** Skipped by keyboard navigation and refused on pick. @default false */
  readonly disabled?: boolean;
}

/** Panel placement relative to the trigger. Logical (RTL-aware). */
export type SelectPopupPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

/** Which item takes focus when the menu opens. @default 'first' */
export type SelectPopupFocus = 'first' | 'last' | 'none' | 'current';

/**
 * Structural slice of {@link RiviniaSelectPopup} a UI layer drives. The full
 * controller satisfies it from any module realm (same input-composition
 * rule as `@rivinia/modal`'s host manager interface).
 */
export interface SelectPopupController {
  readonly open: Signal<boolean>;
  readonly activeId: Signal<string | null>;
  readonly items: Signal<readonly SelectPopupItem[]>;
  register(item: SelectPopupItem): void;
  unregister(id: string): void;
  openMenu(focus?: SelectPopupFocus): void;
  closePopup(): void;
  toggle(focus?: SelectPopupFocus): void;
  pickActive(): string | null;
  activateFirst(): void;
  activateLast(): void;
  activateNext(): void;
  activatePrevious(): void;
  activate(id: string): boolean;
}

/**
 * Data-driven item, for the declarative `[items]` API of the vendored popup UI.
 * Headless consumers of the registry use {@link SelectPopupItemData} instead.
 */
export interface SelectPopupItemData {
  /** Identity, emitted in the `picked` payload. */
  readonly id: string;
  /** Visible text. Also the accessible name and the typeahead search text. */
  readonly label: string;
  /** Rendered but not selectable. @default false */
  readonly disabled?: boolean;
}
