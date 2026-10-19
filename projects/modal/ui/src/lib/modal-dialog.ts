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
import { RiviniaModalScrollLock } from './modal-scroll-lock';
import type {
  RiviniaModalAnimation,
  RiviniaModalBackdrop,
  RiviniaModalPosition,
  RiviniaModalSize,
} from './ui-types';

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
  template: `
    <dialog
      #dialog
      tabindex="-1"
      class="rv-modal"
      [attr.data-size]="size()"
      [attr.data-position]="position()"
      [attr.data-animation]="animation()"
      [attr.data-state]="state()"
      [attr.data-resizing]="resizing()"
      [attr.aria-label]="computedLabel()"
      [attr.aria-labelledby]="title() && !ariaLabel() ? titleId : null"
      [attr.aria-describedby]="description() ? descriptionId : null"
      (cancel)="onCancel($event)"
      (click)="onBackdropClick($event)"
      (keydown)="onKeydown($event)"
    >
      @if (hasCustomHeader()) {
        <div class="rv-modal-header rv-modal-header-custom">
          <ng-content select="[rv-modal-header]"></ng-content>
        </div>
      } @else if (title() || showCloseButton()) {
        <div class="rv-modal-header">
          <div class="rv-modal-heading">
            @if (title()) {
              <h2 class="rv-modal-title" [id]="titleId">{{ title() }}</h2>
            }
            @if (description()) {
              <p class="rv-modal-description" [id]="descriptionId">{{ description() }}</p>
            }
          </div>
          @if (showCloseButton()) {
            <button
              type="button"
              class="rv-modal-close"
              (click)="onCloseButton()"
              aria-label="Close dialog"
            >
              <span aria-hidden="true">&times;</span>
            </button>
          }
        </div>
      }
      <div class="rv-modal-body">
        <ng-content></ng-content>
      </div>
      @if (hasCustomFooter()) {
        <div class="rv-modal-footer">
          <ng-content select="[rv-modal-footer]"></ng-content>
        </div>
      }
    </dialog>
  `,
  styles: [
    `
      .rv-modal {
        color-scheme: light dark;
        /*
         * The PALETTE tokens are NOT declared here.
         *
         * A declaration on the component element out-ranks any value an
         * ancestor sets, so declaring them here would make the shared
         * semantic layer unreachable. They are read as
         * var(--rv-modal-*, var(--rv-<semantic>, <default>)) at each read
         * site instead — so a consumer's --rv-bg reaches the dialog, and
         * --rv-modal-bg still wins for the dialog alone.
         *
         * The LAYOUT tokens (widths, padding, durations) stay here: they are
         * genuinely component-specific and have no semantic counterpart.
         */
        --rv-modal-pad: 20px;
        --rv-modal-gap: 12px;
        /*
         * Responsive widths.
         *
         * A fixed rem width does not survive a small screen: the dialog
         * either overflows or is capped by max-width and the PRESET loses its
         * meaning — an 'sm' dialog and an 'xl' dialog end up the same width.
         * clamp() scales the preset with the viewport between a floor and a
         * ceiling, so the presets stay distinct AND the dialog fits.
         *
         * Every one of them is a plain custom property, so a consumer
         * overrides the preset in CSS without touching the library.
         */
        --rv-modal-width-sm: clamp(16rem, 40vw, 24rem);
        --rv-modal-width-md: clamp(20rem, 55vw, 32rem);
        --rv-modal-width-lg: clamp(24rem, 70vw, 48rem);
        --rv-modal-width-xl: clamp(28rem, 85vw, 64rem);
        --rv-modal-max-height: min(86dvh, 100%);
        --rv-modal-duration: 150ms;
        --rv-modal-duration-in: var(--rv-modal-duration);
        --rv-modal-duration-out: 120ms;
        --rv-modal-easing: ease-out;
        --rv-modal-easing-in: var(--rv-modal-easing);
        --rv-modal-easing-out: ease-in;
        --rv-modal-radius-sheet: 1.25rem;
        --rv-modal-width-panel: 24rem;
        padding: 0;
        border: 1px solid var(--rv-modal-border, var(--rv-border, #e0e0e0));
        border-radius: var(--rv-modal-radius, var(--rv-radius, 12px));
        background: var(--rv-modal-bg, var(--rv-bg, #ffffff));
        color: var(--rv-modal-fg, var(--rv-fg, #111111));
        box-shadow: var(--rv-modal-shadow, var(--rv-shadow, 0 24px 64px rgba(0, 0, 0, 0.28)));
        max-height: var(--rv-modal-max-height);
        width: var(--rv-modal-width-md);
        max-width: calc(100dvw - 2rem);
        /*
         * Smooth when the dialog's box changes.
         *
         * A dialog that opens on top of another one, or that changes size,
         * used to JUMP: the box changed in a single frame while the content
         * reflowed, which reads as a flicker. Transitioning width, height and
         * the offsets makes the change a movement.
         *
         * Only the box is transitioned — never all, which would also
         * animate the content's own layout and produce lag.
         */
        transition:
          width var(--rv-modal-size-duration, 180ms) var(--rv-modal-easing, ease-out),
          height var(--rv-modal-size-duration, 180ms) var(--rv-modal-easing, ease-out),
          max-height var(--rv-modal-size-duration, 180ms) var(--rv-modal-easing, ease-out),
          inset var(--rv-modal-size-duration, 180ms) var(--rv-modal-easing, ease-out),
          margin var(--rv-modal-size-duration, 180ms) var(--rv-modal-easing, ease-out);
      }
      /*
       * While the viewport is being resized, the transition is OFF.
       *
       * The dialog's size is derived from the viewport, so during a resize
       * every frame is a new target. Animating towards a moving target lags
       * behind the pointer and looks worse than the jump it replaced. The
       * dialog snaps instead, which is what the eye expects from a resize.
       */
      .rv-modal[data-resizing='true'] {
        transition: none !important;
      }
      /*
       * The loader shown while a dialog's data is still in flight.
       *
       * role="status" with a polite live region: the change is announced
       * without stealing focus from whatever the user was doing.
       */
      .rv-modal-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--rv-modal-loading-gap, 0.625rem);
        padding: var(--rv-modal-loading-padding, 2rem);
        min-height: var(--rv-modal-loading-min-height, 6rem);
        color: var(--rv-modal-muted, var(--rv-muted, #555555));
        font-size: var(--rv-modal-loading-size, 0.875rem);
      }
      /*
       * A ring that spins. currentColor so it follows the theme, and
       * prefers-reduced-motion stops it — a spinner that will not stop is
       * exactly the kind of thing that makes a page unusable for some people.
       */
      .rv-modal-spinner {
        inline-size: var(--rv-modal-spinner-size, 1.125rem);
        block-size: var(--rv-modal-spinner-size, 1.125rem);
        border: 2px solid currentColor;
        border-block-start-color: transparent;
        border-radius: 50%;
        animation: rv-modal-spin var(--rv-modal-spinner-duration, 700ms) linear infinite;
      }
      @keyframes rv-modal-spin {
        to {
          transform: rotate(360deg);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .rv-modal-spinner {
          animation: none;
        }
      }
      .rv-modal::backdrop {
        background: var(--rv-modal-backdrop, rgba(0, 0, 0, 0.5));
      }
      .rv-modal[data-size='sm'] {
        width: var(--rv-modal-width-sm);
      }
      .rv-modal[data-size='lg'] {
        width: var(--rv-modal-width-lg);
      }
      .rv-modal[data-size='xl'] {
        width: var(--rv-modal-width-xl);
      }
      .rv-modal[data-size='full'] {
        width: calc(100dvw - 2rem);
      }
      .rv-modal[data-size='auto'] {
        width: auto;
      }
      .rv-modal[data-position='top'] {
        margin-block-start: 8dvh;
      }
      .rv-modal[data-position='bottom'] {
        margin-block-start: auto;
        margin-block-end: 8dvh;
      }
      .rv-modal[data-position='top-start'],
      .rv-modal[data-position='center-start'] {
        margin-inline-start: 1rem;
        margin-inline-end: auto;
      }
      .rv-modal[data-position='top-end'],
      .rv-modal[data-position='center-end'] {
        margin-inline-start: auto;
        margin-inline-end: 1rem;
      }
      .rv-modal[data-position='bottom-start'] {
        margin-block-start: auto;
        margin-inline-start: 1rem;
      }
      .rv-modal[data-position='bottom-end'] {
        margin-block-start: auto;
        margin-inline-end: 1rem;
      }
      .rv-modal[data-position='fullscreen'] {
        inset: 0;
        width: 100dvw;
        height: 100dvh;
        height: 100dvh;
        max-width: none;
        max-height: none;
        border-radius: 0;
      }
      .rv-modal[data-position='side-start'],
      .rv-modal[data-position='side-end'] {
        height: 100dvh;
        max-height: none;
        width: var(--rv-modal-width-panel);
        margin-block: 0;
      }
      .rv-modal[data-position='side-start'] {
        margin-inline-start: 0;
        margin-inline-end: auto;
        border-start-start-radius: 0;
        border-end-start-radius: 0;
      }
      .rv-modal[data-position='side-end'] {
        margin-inline-start: auto;
        margin-inline-end: 0;
        border-start-end-radius: 0;
        border-end-end-radius: 0;
      }
      @media (max-width: 640px) {
        .rv-modal[data-position='center'],
        .rv-modal[data-position='top'],
        .rv-modal[data-position='bottom'],
        .rv-modal[data-position='bottom-start'],
        .rv-modal[data-position='bottom-end'] {
          margin-block-start: auto;
          margin-block-end: 0;
          margin-inline: 0;
          width: 100dvw;
          max-width: none;
          border-end-end-radius: 0;
          border-end-start-radius: 0;
          border-start-start-radius: var(--rv-modal-radius-sheet);
          border-start-end-radius: var(--rv-modal-radius-sheet);
        }
        .rv-modal[data-position='center'][data-state='open'],
        .rv-modal[data-position='top'][data-state='open'],
        .rv-modal[data-position='bottom'][data-state='open'],
        .rv-modal[data-position='bottom-start'][data-state='open'],
        .rv-modal[data-position='bottom-end'][data-state='open'] {
          animation-name: rv-modal-in-bottom;
        }
      }
      .rv-modal[data-animation]:not([data-animation='none'])[data-state='open'] {
        animation: var(--rv-modal-animation-in, rv-modal-in) var(--rv-modal-duration-in)
          var(--rv-modal-easing-in);
      }
      .rv-modal[data-animation='scale'][data-state='open'] {
        --rv-modal-animation-in: rv-modal-in-scale;
      }
      .rv-modal[data-animation='slide-top'][data-state='open'] {
        --rv-modal-animation-in: rv-modal-in-top;
      }
      .rv-modal[data-animation='slide-bottom'][data-state='open'] {
        --rv-modal-animation-in: rv-modal-in-bottom;
      }
      .rv-modal[data-animation='slide-start'][data-state='open'] {
        --rv-modal-animation-in: rv-modal-in-start;
      }
      .rv-modal[data-animation='slide-end'][data-state='open'] {
        --rv-modal-animation-in: rv-modal-in-end;
      }
      [dir='rtl'] .rv-modal[data-animation='slide-start'][data-state='open'] {
        --rv-modal-animation-in: rv-modal-in-end;
      }
      [dir='rtl'] .rv-modal[data-animation='slide-end'][data-state='open'] {
        --rv-modal-animation-in: rv-modal-in-start;
      }
      .rv-modal[data-state='closing'] {
        animation: rv-modal-out var(--rv-modal-duration-out) var(--rv-modal-easing-out) forwards;
      }
      @keyframes rv-modal-in {
        from {
          opacity: 0;
        }
      }
      @keyframes rv-modal-in-scale {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.98);
        }
      }
      @keyframes rv-modal-in-top {
        from {
          opacity: 0;
          transform: translateY(-24px);
        }
      }
      @keyframes rv-modal-in-bottom {
        from {
          opacity: 0;
          transform: translateY(24px);
        }
      }
      @keyframes rv-modal-in-start {
        from {
          opacity: 0;
          transform: translateX(-24px);
        }
      }
      @keyframes rv-modal-in-end {
        from {
          opacity: 0;
          transform: translateX(24px);
        }
      }
      @keyframes rv-modal-out {
        to {
          opacity: 0;
          transform: translateY(8px) scale(0.98);
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .rv-modal[data-animation] {
          animation: none;
        }
      }
      .rv-modal-header {
        display: flex;
        align-items: flex-start;
        gap: var(--rv-modal-gap);
        padding: var(--rv-modal-pad) var(--rv-modal-pad) 0;
      }
      .rv-modal-header-custom > :first-child {
        flex: 1;
        min-width: 0;
      }
      .rv-modal-heading:empty {
        display: none;
      }
      .rv-modal-title {
        margin: 0;
        font-size: 1.125rem;
        flex: 1;
      }
      .rv-modal-heading {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .rv-modal-description {
        margin: 0;
        font-size: 0.875rem;
        color: var(--rv-modal-muted, var(--rv-muted, #555555));
      }
      .rv-modal-close {
        margin-inline-start: auto;
        flex: none;
        border: 1px solid var(--rv-modal-border, var(--rv-border, #e0e0e0));
        border-radius: 0.5rem;
        background: transparent;
        color: inherit;
        font-size: 1.25rem;
        line-height: 1;
        padding: 0.25rem 0.625rem;
        cursor: pointer;
      }
      .rv-modal-close:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: 2px;
      }
      .rv-modal-body {
        padding: var(--rv-modal-pad);
        overflow: auto;
        max-height: inherit;
      }
      .rv-modal-footer {
        display: flex;
        gap: var(--rv-modal-gap);
        justify-content: flex-end;
        padding: 0 var(--rv-modal-pad) var(--rv-modal-pad);
      }
      .rv-modal-footer:empty {
        display: none;
      }
    `,
  ],
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
