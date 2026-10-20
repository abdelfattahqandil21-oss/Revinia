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
import type { ToastAnimation, ToastPosition } from '../../models/ui-toast-types';

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
  templateUrl: './toast-list.html',
  styleUrl: './toast-list.css',
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
