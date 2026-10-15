import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Optional presentational badge for a numeric value.
 *
 * Deliberately decoupled from `@rivinia/proof-core`: it receives data via
 * `input()` instead of injecting `ProofStore`. Consumers compose both in
 * their own template:
 *
 * ```html
 * <rv-proof-badge [count]="store.count()">Items</rv-proof-badge>
 * ```
 *
 * This keeps the `ui` entry point physically independent of the `core`
 * entry point — importing Core never pulls UI code, and the UI chunk
 * contains no store logic. No styling framework required: plain host
 * element, projected label, and a `data-count` attribute hook for
 * consumer CSS.
 */
@Component({
  selector: 'rv-proof-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-count]': 'count()',
  },
  template: `
    <span class="rv-proof-badge__label">
      <ng-content>{{ label() }}</ng-content>
    </span>
    <span class="rv-proof-badge__count">{{ count() }}</span>
  `,
})
export class ProofBadge {
  /** Value to display. Bind to `store.count()` at the call site. */
  readonly count = input.required<number>();
  /** Fallback label when no content is projected. */
  readonly label = input('count');
}
