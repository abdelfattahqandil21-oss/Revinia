import type { Signal } from '@angular/core';

/**
 * One navigable menu entry. The controller only tracks identity and
 * enabled state — labels, icons, badges and actions are UI-owned.
 */
export interface RiviniaMenuItem {
  readonly id: string;
  /** Skipped by keyboard navigation and reported as disabled. @default false */
  readonly disabled?: boolean;
}

/** Panel placement relative to the trigger. Logical (RTL-aware). */
export type RiviniaMenuPlacement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end';

/** Which item takes focus when the menu opens. @default 'first' */
export type RiviniaMenuFocus = 'first' | 'last' | 'none';

/**
 * Structural slice of {@link RiviniaMenu} a UI layer drives. The full
 * controller satisfies it from any module realm (same input-composition
 * rule as `@rivinia/modal`'s host manager interface).
 */
export interface RiviniaMenuController {
  readonly open: Signal<boolean>;
  readonly activeId: Signal<string | null>;
  readonly items: Signal<readonly RiviniaMenuItem[]>;
  register(item: RiviniaMenuItem): void;
  unregister(id: string): void;
  openMenu(focus?: RiviniaMenuFocus): void;
  closeMenu(): void;
  toggle(focus?: RiviniaMenuFocus): void;
  pickActive(): string | null;
  activateFirst(): void;
  activateLast(): void;
  activateNext(): void;
  activatePrevious(): void;
  activate(id: string): boolean;
}
