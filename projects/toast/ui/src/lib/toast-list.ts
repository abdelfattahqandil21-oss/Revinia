import {
  AfterViewInit,
  Component,
  computed,
  effect,
  ElementRef,
  viewChild,
  input,
  output,
  signal,
} from '@angular/core';
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
  template: `
    <div
      #panel
      class="rv-toasts"
      role="region"
      aria-label="Notifications"
      [attr.popover]="topLayerSupported ? 'manual' : null"
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
        /*
         * The PALETTE tokens are NOT declared here — see the same note in
         * @rivinia/modal. A declaration on the element out-ranks an
         * ancestor's value, so the shared semantic layer would never reach
         * the toast. They are read as
         * var(--rv-toast-*, var(--rv-<semantic>, <default>)) instead.
         *
         * The LAYOUT tokens (gap, width, duration) stay here: they are
         * component-specific and have no semantic counterpart.
         */
        --rv-toast-gap: 0.5rem;
        --rv-toast-width: 22rem;
        --rv-toast-duration: 180ms;
        --rv-toast-easing: cubic-bezier(0.21, 1.02, 0.73, 1);
        --rv-toast-success: #34c759;
        --rv-toast-error: #ff453a;
        --rv-toast-info: #0a84ff;
        --rv-toast-warning: #ff9f0a;
        position: fixed;
        z-index: var(--rv-toast-z, 1000);
        /*
         * Reset the POPOVER's UA styles.
         *
         * A popover gets a background, a border, padding and overflow: auto
         * from the user agent — which puts a shared canvas and a scrollbar
         * around the stack, so the toasts read as one block instead of
         * separate cards. The list is a transparent, borderless column.
         */
        background: transparent;
        border: 0;
        padding: 0;
        color: inherit;
        overflow: visible;
        height: auto;

        /*
         * The list is a manual popover, so it lives in the browser's TOP
         * LAYER — the same layer a modal <dialog> uses. A top layer stacks
         * in the order elements are shown, so a toast shown while a dialog is
         * open lands ABOVE it. A z-index cannot do this: a dialog in the top
         * layer is above every z-index in the document.
         *
         * The popover UA style sets inset: 0 and margin: auto, which would
         * over-constrain the box. Reset it, so the per-position rules below
         * have the last word.
         */
        inset: auto;
        margin: 0;
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
        gap: 0.625rem;
        background: var(--rv-toast-bg, var(--rv-bg, #ffffff));
        color: var(--rv-toast-fg, var(--rv-fg, #111111));
        border: 1px solid var(--rv-toast-border, var(--rv-border, #e0e0e0));
        border-inline-start: 3px solid var(--rv-toast-muted, var(--rv-muted, #555555));
        border-radius: var(--rv-toast-radius, var(--rv-radius, 12px));
        box-shadow: var(--rv-toast-shadow, var(--rv-shadow, 0 12px 32px rgba(0, 0, 0, 0.32)));
        padding: 12px 14px;
      }
      .rv-toast[data-kind='success'] {
        border-inline-start-color: var(--rv-toast-success, var(--rv-ok, #16a34a));
      }
      .rv-toast[data-kind='error'] {
        border-inline-start-color: var(--rv-toast-error, var(--rv-danger, #dc2626));
      }
      .rv-toast[data-kind='info'] {
        border-inline-start-color: var(--rv-toast-info, var(--rv-info, #2563eb));
      }
      .rv-toast[data-kind='warning'] {
        border-inline-start-color: var(--rv-toast-warning, var(--rv-warning, #d97706));
      }
      .rv-toasts[data-rich-colors='true'] .rv-toast[data-kind='success'] {
        background: var(--rv-toast-success, var(--rv-ok, #16a34a));
        color: #06130a;
      }
      .rv-toasts[data-rich-colors='true'] .rv-toast[data-kind='error'] {
        background: var(--rv-toast-error, var(--rv-danger, #dc2626));
        color: #1c0605;
      }
      .rv-toasts[data-rich-colors='true'] .rv-toast[data-kind='info'] {
        background: var(--rv-toast-info, var(--rv-info, #2563eb));
        color: #04121f;
      }
      .rv-toasts[data-rich-colors='true'] .rv-toast[data-kind='warning'] {
        background: var(--rv-toast-warning, var(--rv-warning, #d97706));
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
        font-size: 0.875rem;
        line-height: 1.45;
      }
      .rv-toast-action,
      .rv-toast-close {
        flex: none;
        cursor: pointer;
        border-radius: 0.5rem;
        border: 1px solid var(--rv-toast-border, var(--rv-border, #e0e0e0));
        background: transparent;
        color: inherit;
        padding: 0.25rem 0.625rem;
        font-size: 0.8125rem;
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
export class RiviniaToastList implements AfterViewInit {
  /**
   * Whether the browser can put the list in the top layer.
   *
   * Where it cannot, the list stays in the document and a `z-index` decides
   * its order — which puts it BELOW a modal dialog, because a dialog in the
   * top layer is above every z-index. The limitation is documented.
   */
  protected readonly topLayerSupported =
    typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;

  /**
   * Put the list in the top layer.
   *
   * The top layer stacks in the order elements are shown, so a toast shown
   * while a dialog is open lands above it. A `z-index` cannot do this.
   *
   * A manual popover is not modal: it does not trap focus, does not make the
   * page inert, and does not close on an outside click — so it behaves like
   * the list it replaces.
   */
  /** The panel — the element that becomes the popover. */
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  /**
   * Put the list in the top layer.
   *
   * `ngAfterViewInit` rather than `afterNextRender`: the callback has to run
   * with the view in the DOM and the `popover` attribute already applied, and
   * `showPopover()` on an element that is not a popover yet throws
   * NotSupportedError — measured, not assumed.
   */
  ngAfterViewInit(): void {
    this.promote();
  }

  /**
   * Put the list at the TOP of the top layer.
   *
   * The top layer stacks in the order elements are SHOWN, so a list that was
   * shown when the app started sits BELOW a dialog opened later. Re-showing it
   * moves it back to the top — which is what "a toast appears above the
   * dialog" means.
   *
   * `showPopover()` on an open popover throws, so it is hidden first.
   */
  private promote(): void {
    if (!this.topLayerSupported) return;
    // The POPOVER is the panel, not the component host: the host is the
    // `<rv-toast-list>` element, and showing THAT would put the wrong box in
    // the top layer.
    const el = this.panel()?.nativeElement as
      | (HTMLElement & { showPopover?: () => void; hidePopover?: () => void })
      | undefined;
    if (!el || typeof el.showPopover !== 'function') return;
    // Set imperatively as well as by the template binding: the binding can
    // land after this hook, and the imperative set makes the order irrelevant.
    el.setAttribute('popover', 'manual');
    try {
      if (el.matches(':popover-open')) el.hidePopover?.();
      el.showPopover();
    } catch {
      // The browser refused. The list still works — it is just not in the top
      // layer.
    }
  }

  /**
   * Re-promote the list whenever its contents change.
   *
   * A toast that appears while a dialog is open must be ABOVE it, and a
   * dialog opened after the list was shown pushes the list down in the top
   * layer. Promoting on every change puts the list back on top each time.
   */
  private readonly keepOnTop = effect(() => {
    // Track the rendered items, so the effect runs when the list changes.
    this.rendered();
    this.promote();
  });

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
