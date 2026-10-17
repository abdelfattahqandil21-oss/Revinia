import { Component, computed, effect, input, output, signal } from '@angular/core';
import type { Toast, ToastKind, ToastOptions } from '@rivinia/toast';
import { resolveToastText } from '@rivinia/toast';
import type { ToastAnimation, ToastPosition } from './ui-toast-types';

const LEAVE_MS = 150;

/**
 * The structural slice of `RiviniaToast` the list actually drives. The full
 * manager satisfies it from any module realm; test doubles need five methods.
 * When both `manager` and `toasts` are given, the manager wins (single
 * source of truth — the UI never races Core).
 */
export interface RiviniaToastListManager {
  readonly active: () => readonly Toast[];
  show(options: ToastOptions): number | null;
  dismiss(id: number): boolean;
  pause(id: number): boolean;
  resume(id: number): boolean;
  runAction(id: number): boolean;
}

/** A toast snapshot kept rendering while its 150 ms exit plays. */
interface LeavingToast {
  readonly toast: Toast;
}

/**
 * Ready-made toast stack. Two modes (manager wins when both are given):
 *
 * - Managed: `[manager]="injectRiviniaToast()"` — renders `active()`,
 *   hover pauses, action button runs `runAction` (throws propagate to the
 *   app's `ErrorHandler`), X dismisses. Dismissed items play a 150 ms exit
 *   from their last snapshot, then vanish (browser only — SSR drops them).
 * - Presentational: `[toasts]="[...]"` + `(dismissed)/(actionPressed)` —
 *   no manager needed. Timer/pause state is yours.
 *
 * Each item is `role="status"` (polite by default; `error` kind asserts).
 * Stack order is `active()` order (oldest first), anchored at `position`.
 */
@Component({
  selector: 'rv-toast-list',
  standalone: true,
  template: `
    <div
      class="rv-toasts"
      role="region"
      aria-label="Notifications"
      [attr.data-position]="position()"
      [attr.data-animation]="animation()"
      [attr.data-rich-colors]="richColors()"
    >
      @for (item of rendered(); track item.toast.id) {
        <div
          class="rv-toast"
          [attr.data-kind]="item.toast.kind"
          [attr.data-state]="item.leaving ? 'leaving' : item.toast.paused ? 'paused' : 'active'"
          role="status"
          [attr.aria-live]="item.toast.kind === 'error' ? 'assertive' : 'polite'"
          (mouseenter)="pause(item.toast.id)"
          (mouseleave)="resume(item.toast.id)"
          (focusin)="pause(item.toast.id)"
          (focusout)="resume(item.toast.id)"
        >
          <span class="rv-toast-icon" aria-hidden="true">{{ iconFor(item.toast.kind) }}</span>
          <p class="rv-toast-message">{{ textOf(item.toast) }}</p>
          @if (item.toast.action) {
            <button type="button" class="rv-toast-action" (click)="act(item.toast.id)">
              {{ textOfAction(item.toast) }}
            </button>
          }
          @if (showCloseButton()) {
            <button
              type="button"
              class="rv-toast-close"
              (click)="close(item.toast.id)"
              aria-label="Dismiss notification"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .rv-toasts {
        --rv-toast-bg: #1c1c1e;
        --rv-toast-fg: #f5f5f7;
        --rv-toast-muted: #a8a8a8;
        --rv-toast-border: #38383a;
        --rv-toast-radius: 12px;
        --rv-toast-shadow: 0 12px 32px rgba(0, 0, 0, 0.32);
        --rv-toast-gap: 8px;
        --rv-toast-width: 22rem;
        --rv-toast-duration: 180ms;
        --rv-toast-easing: cubic-bezier(0.21, 1.02, 0.73, 1);
        --rv-toast-success: #34c759;
        --rv-toast-error: #ff453a;
        --rv-toast-info: #0a84ff;
        --rv-toast-warning: #ff9f0a;
        position: fixed;
        z-index: var(--rv-toast-z, 1000);
        display: flex;
        flex-direction: column;
        gap: var(--rv-toast-gap);
        width: var(--rv-toast-width);
        max-width: calc(100dvw - 2rem);
        pointer-events: none;
      }
      .rv-toasts > * {
        pointer-events: auto;
      }
      @media (prefers-color-scheme: light) {
        .rv-toasts {
          --rv-toast-bg: #ffffff;
          --rv-toast-fg: #111111;
          --rv-toast-muted: #555555;
          --rv-toast-border: #e0e0e0;
          --rv-toast-shadow: 0 12px 32px rgba(0, 0, 0, 0.18);
        }
      }
      .rv-toasts[data-position='top-start'],
      .rv-toasts[data-position='bottom-start'] {
        inset-inline-start: 1rem;
      }
      .rv-toasts[data-position='top-end'],
      .rv-toasts[data-position='bottom-end'] {
        inset-inline-end: 1rem;
      }
      .rv-toasts[data-position='top-center'],
      .rv-toasts[data-position='bottom-center'] {
        inset-inline: 0;
        margin-inline: auto;
      }
      .rv-toasts[data-position^='top'] {
        inset-block-start: 1rem;
      }
      .rv-toasts[data-position^='bottom'] {
        inset-block-end: 1rem;
      }
      .rv-toast {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        background: var(--rv-toast-bg);
        color: var(--rv-toast-fg);
        border: 1px solid var(--rv-toast-border);
        border-inline-start: 3px solid var(--rv-toast-muted);
        border-radius: var(--rv-toast-radius);
        box-shadow: var(--rv-toast-shadow);
        padding: 12px 14px;
      }
      .rv-toast[data-kind='success'] {
        border-inline-start-color: var(--rv-toast-success);
      }
      .rv-toast[data-kind='error'] {
        border-inline-start-color: var(--rv-toast-error);
      }
      .rv-toast[data-kind='info'] {
        border-inline-start-color: var(--rv-toast-info);
      }
      .rv-toast[data-kind='warning'] {
        border-inline-start-color: var(--rv-toast-warning);
      }
      .rv-toasts[data-rich-colors='true'] .rv-toast[data-kind='success'] {
        background: var(--rv-toast-success);
        color: #06130a;
      }
      .rv-toasts[data-rich-colors='true'] .rv-toast[data-kind='error'] {
        background: var(--rv-toast-error);
        color: #1c0605;
      }
      .rv-toasts[data-rich-colors='true'] .rv-toast[data-kind='info'] {
        background: var(--rv-toast-info);
        color: #04121f;
      }
      .rv-toasts[data-rich-colors='true'] .rv-toast[data-kind='warning'] {
        background: var(--rv-toast-warning);
        color: #1d1204;
      }
      .rv-toast-icon {
        flex: none;
        font-weight: 700;
      }
      .rv-toast[data-kind='success'] .rv-toast-icon::before {
        content: '✓';
      }
      .rv-toast[data-kind='error'] .rv-toast-icon::before {
        content: '!';
      }
      .rv-toast[data-kind='info'] .rv-toast-icon::before {
        content: 'i';
      }
      .rv-toast[data-kind='warning'] .rv-toast-icon::before {
        content: '⚠';
      }
      .rv-toast-message {
        margin: 0;
        flex: 1;
        font-size: 14px;
        line-height: 1.45;
      }
      .rv-toast-action,
      .rv-toast-close {
        flex: none;
        cursor: pointer;
        border-radius: 8px;
        border: 1px solid var(--rv-toast-border);
        background: transparent;
        color: inherit;
        padding: 4px 10px;
        font-size: 13px;
      }
      .rv-toast-action:focus-visible,
      .rv-toast-close:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }
      .rv-toasts[data-animation='slide'] .rv-toast[data-state='active'] {
        animation: rv-toast-in var(--rv-toast-duration) var(--rv-toast-easing);
      }
      .rv-toasts[data-animation='fade'] .rv-toast[data-state='active'] {
        animation: rv-toast-in-fade var(--rv-toast-duration) ease-out;
      }
      .rv-toast[data-state='leaving'] {
        animation: rv-toast-out 150ms ease-in forwards;
      }
      @keyframes rv-toast-in {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
      }
      @keyframes rv-toast-in-fade {
        from {
          opacity: 0;
        }
      }
      @keyframes rv-toast-out {
        to {
          opacity: 0;
          transform: translateY(8px);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .rv-toasts .rv-toast {
          animation: none;
        }
      }
    `,
  ],
})
export class RiviniaToastList {
  /** Managed mode: the service (or a structural test double). Wins over `toasts`. */
  readonly manager = input<RiviniaToastListManager | null>(null);
  /** Presentational mode: snapshots you own (timers/pause are yours). */
  readonly toasts = input<readonly Toast[]>([]);
  /** Stack anchor. @default 'bottom-end' */
  readonly position = input<ToastPosition>('bottom-end');
  /** Entrance animation. @default 'slide' */
  readonly animation = input<ToastAnimation>('slide');
  /** Kind-tinted rail (default) vs full-bleed kind colors. @default false */
  readonly richColors = input<boolean>(false);
  /** Render the X button. @default true */
  readonly showCloseButton = input<boolean>(true);

  /** Presentational-mode dismiss (id). Managed mode settles via the manager. */
  readonly dismissed = output<number>();
  /** Presentational-mode action press (id). */
  readonly actionPressed = output<number>();

  private readonly leaving = signal<readonly LeavingToast[]>([]);
  private seen = new Set<number>();
  private readonly known = new Map<number, Toast>();

  /** Rendered rows: live items plus exit-playing snapshots (browser only). */
  protected readonly rendered = computed(() => {
    const manager = this.manager();
    const live: readonly Toast[] = manager ? manager.active() : this.toasts();
    const liveIds = new Set(live.map((t) => t.id));
    const gone = this.leaving().filter((l) => !liveIds.has(l.toast.id));
    return [
      ...live.map((toast) => ({ toast, leaving: false })),
      ...gone.map((l) => ({ ...l, leaving: true })),
    ];
  });

  constructor() {
    effect(() => {
      // Track removals: anything that was live and isn't anymore plays exit.
      // Every run also refreshes the last-known snapshots the exit needs.
      const manager = this.manager();
      const live = manager ? manager.active() : this.toasts();
      const ids = new Set<number>();
      for (const toast of live) {
        ids.add(toast.id);
        this.known.set(toast.id, toast);
      }
      for (const id of this.seen) {
        if (!ids.has(id)) this.beginLeave(id);
      }
      this.seen = ids;
    });
  }

  protected textOf(toast: Toast): string {
    try {
      return resolveToastText(toast.message);
    } catch {
      return '';
    }
  }

  protected textOfAction(toast: Toast): string {
    const action = toast.action;
    if (!action) return '';
    try {
      return resolveToastText(action.label);
    } catch {
      return '';
    }
  }

  protected iconFor(_kind: ToastKind): string {
    // Glyph comes from CSS ::before per kind (the span stays empty for AT).
    return '';
  }

  protected pause(id: number): void {
    this.manager()?.pause(id);
  }

  protected resume(id: number): void {
    this.manager()?.resume(id);
  }

  protected close(id: number): void {
    const manager = this.manager();
    if (manager) manager.dismiss(id);
    else this.dismissed.emit(id);
  }

  protected act(id: number): void {
    const manager = this.manager();
    if (manager) manager.runAction(id);
    else this.actionPressed.emit(id);
  }

  private beginLeave(id: number): void {
    if (typeof window === 'undefined') return; // SSR: drop, never hang render
    const current = this.snapshot(id);
    if (!current) return;
    const entry: LeavingToast = { toast: current };
    this.leaving.update((list) => [...list.filter((l) => l.toast.id !== id), entry]);
    setTimeout(() => {
      this.leaving.update((list) => list.filter((l) => l.toast.id !== id));
    }, LEAVE_MS);
  }

  private snapshot(id: number): Toast | null {
    return this.known.get(id) ?? null;
  }
}
