import {
  Component,
  OnDestroy,
  Directive,
  DOCUMENT,
  ElementRef,
  ViewEncapsulation,
  computed,
  contentChild,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { RiviniaModalScrollLock } from '../modal-scroll-lock/modal-scroll-lock';
import type {
  RiviniaModalAnimation,
  RiviniaModalBackdrop,
  RiviniaModalPosition,
  RiviniaModalSize,
} from '../../models/ui-types';

const EXIT_FALLBACK_MS = 200;

/**
 * Marker for custom header content. Put it on the element carrying
 * `rv-modal-header` — its presence (not just the attribute) tells the
 * dialog to hide the default title + close button:
 *
 * ```html
 * <div rv-modal-header rvModalHeader>My header</div>
 * ```
 */
@Directive({ selector: '[rvModalHeader]', standalone: true })
export class RvModalHeader {}

/**
 * Marker for custom footer content. Put it on the element carrying
 * `rv-modal-footer`. Without it the footer region never renders.
 */
@Directive({ selector: '[rvModalFooter]', standalone: true })
export class RvModalFooter {}

/**
 * Ready-made modal dialog on the native `<dialog>` element (top layer,
 * `::backdrop`, inert background, Escape `cancel` event — all platform
 * behavior, zero overlay dependencies).
 *
 * UI-only by design: it owns its own `open` state and never imports the
 * headless controller. Pair it with `@rivinia/modal` through
 * {@link RiviniaModalHost} (or your own adapter) when you want managed
 * lifecycle, guards and typed results.
 *
 * Projection: `[rv-modal-header]` replaces the default header (title +
 * close button); default `<ng-content>` is the body; `[rv-modal-footer]`
 * is optional and renders nothing when absent.
 */
@Component({
  selector: 'rv-modal-dialog',
  // Unencapsulated like rv-menu: custom projected headers/footers belong to
  // the consumer's template, which emulated selectors cannot reach. Every
  // rule is scoped under `.rv-modal`, so nothing leaks.
  encapsulation: ViewEncapsulation.None,
  templateUrl: './modal-dialog.html',
  styleUrl: './modal-dialog.css',
})
export class RiviniaModalDialog {
  /** Two-way open state. UI-only mode owns this; the host drives it in managed mode. */
  readonly open = model<boolean>(false);

  readonly title = input<string>('');
  /**
   * Supporting text under the title (shadcn-style description). Rendered in
   * the default header only, and wired as the dialog's `aria-describedby`
   * for free accessible naming. Empty = no description element at all.
   */
  readonly description = input<string>('');
  /** Explicit accessible name. When set, `aria-label` wins over the title reference. */
  readonly ariaLabel = input<string>('');
  readonly size = input<RiviniaModalSize>('md');
  readonly position = input<RiviniaModalPosition>('center');
  readonly animation = input<RiviniaModalAnimation>('scale');
  readonly closeOnEscape = input<boolean>(true);
  readonly backdrop = input<RiviniaModalBackdrop>('close');

  /**
   * True while the viewport is being resized.
   *
   * The dialog's size is derived from the viewport, so during a resize every
   * frame is a new target; animating towards a moving target lags behind the
   * pointer. The transition is switched off for the duration, and the dialog
   * snaps — which is what the eye expects from a resize.
   */
  protected readonly resizing = signal(false);

  /**
   * Track the viewport resize.
   *
   * matchMedia('(resolution: …)') is the reliable signal: a plain
   * resize listener fires for every scroll-driven layout change too, and
   * the resolution query only changes when the device pixel ratio or the
   * viewport size really changed.
   */
  private readonly viewportQuery = signal<MediaQueryList | null>(null);

  private readonly stopResizeWatch = (() => {
    if (typeof window === 'undefined') return () => undefined;
    let query: MediaQueryList | null = null;
    const onChange = () => {
      // A short settle window: the transition is switched off for the
      // duration of the gesture and switched back on once it stops.
      this.resizing.set(true);
      if (this.settleTimer !== null) clearTimeout(this.settleTimer);
      this.settleTimer = setTimeout(() => this.resizing.set(false), 120);
    };
    const attach = () => {
      query?.removeEventListener('change', onChange);
      // matchMedia is not everywhere (jsdom has no implementation), and the
      // dialog must not fail to construct because of a nicety.
      if (typeof window.matchMedia !== 'function') return;
      const ratio = window.devicePixelRatio ?? 1;
      query = window.matchMedia(`(resolution: ${ratio}dppx)`);
      query.addEventListener('change', onChange, { once: true });
      this.viewportQuery.set(query);
    };
    attach();
    return () => query?.removeEventListener('change', onChange);
  })();

  private settleTimer: ReturnType<typeof setTimeout> | null = null;

  ngOnDestroy(): void {
    // The viewport listener outlives the component otherwise.
    this.stopResizeWatch();
    if (this.settleTimer !== null) clearTimeout(this.settleTimer);
  }
  readonly showCloseButton = input<boolean>(true);
  /**
   * Managed mode (for {@link RiviniaModalHost}): UI intents (X button,
   * Escape, backdrop) emit `dismissRequested` INSTEAD of dismissing, so the
   * manager runs guards first and settles results. Drive the exit with the
   * `closing` input; acknowledge teardown with `exitDone`.
   * UI-only mode (`false`, default) dismisses locally.
   */
  readonly managed = input<boolean>(false);
  /**
   * Managed-mode exit trigger. Set `true` when the manager reports this
   * instance `closing`: the dialog plays its exit animation, then emits
   * `exitDone` (call `confirmClosed()` there). Ignored in UI-only mode.
   */
  readonly closing = input<boolean>(false);

  /** Settled with a value (primary/confirm actions call `close(value)`). */
  readonly confirmed = output<unknown>();
  /** Settled without a value (X button, backdrop, Escape, `dismiss()`). */
  readonly dismissed = output<string | undefined>();
  /** Explicit cancellation (`cancel()`). Kept distinct from dismissal. */
  readonly cancelled = output<string | undefined>();
  /**
   * Managed-mode intent (X button / Escape / backdrop). Emitted INSTEAD of
   * dismissing — the host routes it to the manager first. Never emitted in
   * UI-only mode.
   */
  readonly dismissRequested = output<'button' | 'escape' | 'backdrop'>();
  /** Managed-mode exit completion. Acknowledge with `confirmClosed()`. */
  readonly exitDone = output<void>();

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly headerSlot = contentChild(RvModalHeader);
  private readonly footerSlot = contentChild(RvModalFooter);
  private readonly doc = inject(DOCUMENT, { optional: true });
  private readonly scrollLock = inject(RiviniaModalScrollLock, { optional: true });
  private readonly titleId = `rv-modal-${++dialogSeq}`;
  private readonly descriptionId = `rv-modal-desc-${dialogSeq}`;
  private readonly phase = signal<'closed' | 'open' | 'closing'>('closed');
  private readonly invoker: { current: Element | null } = { current: null };
  private exitTimer: ReturnType<typeof setTimeout> | null = null;

  /** Template state for animation styling. Never rendered open on the server. */
  readonly state = computed(() => this.phase());
  readonly hasCustomHeader = computed(() => this.headerSlot() !== undefined);
  readonly hasCustomFooter = computed(() => this.footerSlot() !== undefined);
  readonly computedLabel = computed(() => this.ariaLabel() || null);

  constructor() {
    effect(() => {
      if (this.open()) this.show();
      // External close acts only while fully open: during 'closing' the
      // exit animation owns teardown (its timer finalizes). This guard is
      // what keeps `finish()` from cutting the animation via `open.set(false)`.
      else if (this.phase() === 'open') this.hide();
    });
    effect(() => {
      // Managed exit: the manager moved this instance to `closing`.
      if (this.managed() && this.closing() && this.phase() === 'open') {
        this.playExit(() => this.exitDone.emit());
      }
    });
  }

  /** Confirm with a value. No-op while closing/closed. */
  confirm(value?: unknown): boolean {
    if (this.phase() !== 'open') return false;
    this.finish('confirmed', value);
    return true;
  }

  /** Backwards-compatible close: confirms when given a value, dismisses otherwise. */
  close(value?: unknown): boolean {
    return value === undefined ? this.dismiss() : this.confirm(value);
  }

  /** Dismiss without a value (X button, backdrop, Escape route here). */
  dismiss(reason?: string): boolean {
    if (this.phase() !== 'open') return false;
    this.finish('dismissed', undefined, reason);
    return true;
  }

  /** Explicit cancellation. */
  cancel(reason?: string): boolean {
    if (this.phase() !== 'open') return false;
    this.finish('cancelled', undefined, reason);
    return true;
  }

  protected onCloseButton(): void {
    if (this.managed()) {
      if (this.phase() === 'open') this.dismissRequested.emit('button');
      return;
    }
    this.dismiss('close-button');
  }

  protected onCancel(event: Event): void {
    if (!this.closeOnEscape()) {
      event.preventDefault();
      return;
    }
    // Native `cancel` already closed nothing yet — route through our pipeline
    // so scroll-lock, focus restore and outputs stay consistent.
    event.preventDefault();
    if (this.managed()) {
      if (this.phase() === 'open') this.dismissRequested.emit('escape');
      return;
    }
    this.dismiss('escape');
  }

  protected onBackdropClick(event: MouseEvent): void {
    const el = this.dialog()?.nativeElement;
    if (!el || event.target !== el) return; // inside clicks never count
    if (this.backdrop() !== 'close') return;
    if (this.managed()) {
      if (this.phase() === 'open') this.dismissRequested.emit('backdrop');
      return;
    }
    this.dismiss('backdrop');
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const el = this.dialog()?.nativeElement;
    if (!el) return;
    const items = focusables(el);
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = (this.doc ?? document).activeElement;
    if (event.shiftKey && (active === first || !el.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private get live(): boolean {
    return typeof window !== 'undefined' && !!this.doc;
  }

  private show(): void {
    if (!this.live) return; // SSR: stay closed until client hydration opens us
    const el = this.dialog()?.nativeElement;
    if (!el || this.phase() !== 'closed') return;
    try {
      this.invoker.current = this.doc?.activeElement ?? null;
    } catch {
      this.invoker.current = null;
    }
    this.scrollLock?.acquire();
    this.phase.set('open');
    if (!el.open) {
      try {
        el.showModal();
      } catch {
        // Already open (e.g. double effect run): continue — state is ours.
      }
    }
    focusFirst(el, this.showCloseButton());
  }

  private hide(): void {
    if (this.phase() === 'closed') return;
    this.teardown(false);
  }

  private finish(
    kind: 'confirmed' | 'dismissed' | 'cancelled',
    value?: unknown,
    reason?: string,
  ): void {
    this.teardown(true);
    if (kind === 'confirmed') this.confirmed.emit(value);
    else if (kind === 'dismissed') this.dismissed.emit(reason);
    else this.cancelled.emit(reason);
    if (this.open()) this.open.set(false);
  }

  private teardown(animate: boolean): void {
    if (!animate) {
      if (this.exitTimer) {
        clearTimeout(this.exitTimer);
        this.exitTimer = null;
      }
      this.finalize(this.dialog()?.nativeElement ?? null);
      return;
    }
    this.playExit(() => {});
  }

  /** Plays the exit animation (when warranted), then runs `done`. Idempotent. */
  private playExit(done: () => void): void {
    if (this.phase() !== 'open') {
      done();
      return;
    }
    if (this.exitTimer) {
      clearTimeout(this.exitTimer);
      this.exitTimer = null;
    }
    const el = this.dialog()?.nativeElement ?? null;
    const animated = this.animation() !== 'none' && this.prefersMotion() && !!el?.open;
    this.phase.set(animated ? 'closing' : 'closed');
    if (!animated) {
      this.finalize(el);
      done();
      return;
    }
    // Honor consumer-overridden durations instead of a fixed fallback, so a
    // longer `--rv-modal-duration-out` is never cut short.
    this.exitTimer = setTimeout(() => {
      this.finalize(el);
      done();
    }, this.exitDurationMs(el));
  }

  private exitDurationMs(el: HTMLDialogElement | null): number {
    try {
      const raw = el ? getComputedStyle(el).animationDuration : '';
      const seconds = raw
        .split(',')
        .map((part) => parseFloat(part))
        .filter((n) => Number.isFinite(n));
      if (seconds.length > 0) return Math.max(0, Math.max(...seconds) * 1000) + 50;
    } catch {
      // Non-CSS environments (tests): fall through to the fallback.
    }
    return EXIT_FALLBACK_MS;
  }

  private finalize(el: HTMLDialogElement | null): void {
    this.exitTimer = null;
    try {
      el?.close();
    } catch {
      // Already closed natively — ours to reconcile, not to throw.
    }
    this.phase.set('closed');
    this.scrollLock?.release();
    const invoker = this.invoker.current as HTMLElement | null;
    this.invoker.current = null;
    try {
      invoker?.focus?.();
    } catch {
      // Invoker gone (navigated away) — nothing to restore to.
    }
  }

  private prefersMotion(): boolean {
    try {
      return (
        typeof window !== 'undefined' &&
        !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    } catch {
      return true;
    }
  }
}

let dialogSeq = 0;

function focusables(root: HTMLElement): HTMLElement[] {
  // No visibility filtering on purpose: jsdom reports zero rects (unit
  // tests), and `disabled` is already excluded by the selector. Hidden
  // focusables inside a visible dialog are a consumer edge, not ours.
  const selector =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
    'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll<HTMLElement>(selector));
}

function focusFirst(dialog: HTMLDialogElement, closeVisible: boolean): void {
  try {
    const auto = dialog.querySelector<HTMLElement>('[autofocus]');
    if (auto) {
      auto.focus({ preventScroll: true });
      return;
    }
    // Atlassian rule: no close button → focus the title; otherwise the
    // dialog itself (its tabindex="-1" makes it focusable).
    if (!closeVisible) {
      const title = dialog.querySelector<HTMLElement>('.rv-modal-title');
      if (title) {
        title.setAttribute('tabindex', '-1');
        title.focus({ preventScroll: true });
        return;
      }
    }
    dialog.focus({ preventScroll: true });
  } catch {
    // Focus is best-effort (e.g. during teardown races).
  }
}
