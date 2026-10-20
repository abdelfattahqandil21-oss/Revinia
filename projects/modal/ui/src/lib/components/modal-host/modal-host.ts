import { Component, Injector, computed, effect, input, output, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { RIVINIA_MODAL_CONTEXT } from '@rivinia/modal';
import type {
  ModalContext,
  ModalDismissOrigin,
  ModalInstance,
  ModalTemplateContext,
} from '@rivinia/modal';
import { RiviniaModalDialog } from '../modal-dialog/modal-dialog';
import type { RiviniaModalSize } from '../../models/ui-types';
import { covers } from '../../utils/modal-covers';

/**
 * Managed adapter: renders every `visible()` instance of the headless
 * `RiviniaModal` inside a {@link RiviniaModalDialog} and routes all UI
 * intents through the manager first (guards run; results settle in Core —
 * the single source of truth). The dialog never settles anything itself in
 * this mode; listen to `ModalHandle.result`, not dialog outputs.
 *
 * Exit coordination: when Core reports an instance `closing`, the dialog
 * plays its exit animation and the host acknowledges with `confirmClosed()`
 * (idempotent — safe if `closingTimeout` auto-finalized first). Match
 * `closingTimeout` to the animation duration so exits stay visible.
 *
 * Title resolution: `titleOf` per instance (default: `metadata.title` →
 * `ref` → `''`). Content descriptors render as-is: templates via
 * `ngTemplateOutlet` with `{$implicit: data, modal}`, components via
 * `NgComponentOutlet` with `inputs` + a per-instance
 * `RIVINIA_MODAL_CONTEXT` injector (the lab-proven pattern).
 *
 * The manager arrives via `[modal]` input (D06 input-composition: the UI
 * entry never instantiates Core itself, so UI-only consumers pay nothing).
 * The input is typed as {@link RiviniaModalHostManager} — the structural
 * slice the host actually drives — so the full manager (or a test double)
 * satisfies it from any module realm:
 *
 * ```html
 * <rv-modal-host [modal]="injectRiviniaModal()" />
 * ```
 */
export interface RiviniaModalHostManager {
  readonly visible: Signal<readonly ModalInstance<unknown>[]>;
  requestDismiss(id: string, origin: ModalDismissOrigin): Promise<boolean>;
  confirmClosed(id: string): boolean;
  close(id: string, value?: unknown): boolean;
  dismiss(id: string, reason?: string): boolean;
}

@Component({
  selector: 'rv-modal-host',
  imports: [RiviniaModalDialog, NgComponentOutlet, NgTemplateOutlet],
  templateUrl: './modal-host.html',
})
export class RiviniaModalHost {
  /**
   * The headless manager to render. Typed as {@link RiviniaModalHostManager}
   * (structural) — pass `injectRiviniaModal()` from your app code.
   */
  readonly modal = input.required<RiviniaModalHostManager>();

  /** Dialog size for every managed instance. @default 'md' */
  readonly size = input<RiviniaModalSize>('md');
  /** Render the header close button on every managed instance. @default true */
  readonly showCloseButton = input<boolean>(true);
  /** Resolve a title per instance. Default: `metadata.title` → `ref` → `''`. */
  readonly titleOf = input<(instance: ModalInstance<unknown>) => string | undefined>();

  /**
   * Whether an instance is still loading.
   *
   * A dialog that opens before its data arrives has nothing to show yet, and
   * an empty box reads as a broken dialog. While this returns true for an
   * instance, the host renders a loader INSTEAD of the instance's content.
   *
   * It is per instance, because a host can have several dialogs open and
   * they load independently.
   *
   * ```html
   * <rv-modal-host
   *   [modal]="modal"
   *   [loadingOf]="(instance) => instance.data?.loading === true"
   * />
   * ```
   */
  readonly loadingOf = input<(instance: ModalInstance<unknown>) => boolean>();

  /** Text of the loader. @default 'Loading…' */
  readonly loadingLabel = input('Loading…');

  /**
   * The rendered stack.
   *
   * It is a signal the host owns rather than a computed over the manager, so
   * the update can be wrapped in a view transition: the browser then paints
   * the old stack and the new one as one continuous move instead of
   * flickering between them.
   */
  protected readonly visible = signal<readonly ModalInstance[]>([]);

  /** Push the manager's current stack into the rendered one. */
  private readonly syncStack = effect(() => {
    const next = this.modal().visible();
    this.withTransition(() => this.visible.set(next));
  });

  /**
   * Smooth the stack change with a view transition.
   *
   * Opening a dialog on top of another one used to FLICKER: the top layer
   * re-promotes the lower dialog, and the browser paints the change in
   * separate frames. A view transition makes it one continuous move.
   *
   * It is optional by design: where the API is missing, the change simply
   * happens without it — a missing nicety must not break the dialog.
   */
  private readonly transition = (() => {
    if (typeof document === 'undefined') return false;
    return typeof (document as Document & { startViewTransition?: unknown }).startViewTransition === 'function';
  })();

  /** The last stack signature, so a change can be detected. */
  private lastStackKey = '';

  /**
   * Run a view transition when the visible stack changed.
   */
  protected withTransition(change: () => void): void {
    const key = this.modal()
      .visible()
      .map((i) => `${i.id}:${i.status}`)
      .join('|');
    if (!this.transition || key === this.lastStackKey) {
      change();
      this.lastStackKey = key;
      return;
    }
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    try {
      doc.startViewTransition?.(() => {
        change();
        this.lastStackKey = key;
      });
    } catch {
      change();
      this.lastStackKey = key;
    }
  }

  /** Whether an instance hides the ones below it. */
  protected readonly covering = computed(() => {
    const list = this.visible();
    // The topmost covering instance hides everything under it.
    let coverId: string | null = null;
    for (const instance of list) {
      if (covers(instance)) coverId = instance.id;
    }
    return coverId;
  });

  /**
   * Whether this instance is loading.
   *
   * A throwing resolver must not break the dialog, so it falls back to "not
   * loading" — the content renders, which is the safe default.
   */
  protected isLoading(instance: ModalInstance<unknown>): boolean {
    try {
      return this.loadingOf()?.(instance) === true;
    } catch {
      return false;
    }
  }

  /**
   * The name of the component that opened this dialog.
   *
   * Rendered as `data-caller` on the dialog, so the DevTools inspector shows
   * WHICH component opened it — the thing you want when a dialog appears and
   * you need to find its source.
   */
  protected callerName(instance: ModalInstance<unknown>): string | null {
    return instance.caller ?? null;
  }

  /**
   * The size of an instance.
   *
   * The host's `size` is the default; an instance may override it, so a small
   * confirm can sit on top of a wide form without a second host.
   */
  protected sizeOf(instance: ModalInstance<unknown>): RiviniaModalSize {
    const own = (instance.metadata?.['size'] as RiviniaModalSize | undefined) ?? undefined;
    return own ?? this.size();
  }

  /**
   * Whether an instance hides the ones below it.
   *
   * A stack renders every dialog, so the ones below stay visible behind the
   * top one. When the top one covers the others, the ones below are not
   * rendered at all — and they come back when it closes.
   */
  protected isCovered(instance: ModalInstance<unknown>): boolean {
    return this.visible().some((other) => other.id !== instance.id && covers(other));
  }

  protected titleOfInstance(instance: ModalInstance<unknown>): string {
    try {
      const custom = this.titleOf()?.(instance);
      if (custom !== undefined) return custom;
    } catch {
      // A throwing resolver must never break rendering — fall through.
    }
    const meta = instance.metadata?.['title'];
    if (typeof meta === 'string' && meta.length > 0) return meta;
    return instance.ref ?? '';
  }

  protected templateContext(instance: ModalInstance<unknown>): ModalTemplateContext<unknown> {
    return { $implicit: instance.data, modal: this.modalContext(instance) };
  }

  protected contextInjector(instance: ModalInstance<unknown>): Injector {
    const modal = this.modal();
    return Injector.create({
      providers: [
        {
          provide: RIVINIA_MODAL_CONTEXT,
          useValue: {
            id: instance.id,
            data: instance.data,
            parentId: instance.parentId,
            close: (result?: unknown) => modal.close(instance.id, result),
            dismiss: (reason?: string) => modal.dismiss(instance.id, reason),
          } satisfies ModalContext<unknown>,
        },
      ],
    });
  }

  protected async onIntent(id: string, origin: 'button' | 'escape' | 'backdrop'): Promise<void> {
    try {
      await this.modal().requestDismiss(id, origin);
    } catch {
      // requestDismiss never rejects (deny-safe by contract) — defensive only.
    }
    // Granted → status flips to `closing` → dialog exit → `exitDone`.
    // Denied → nothing moves; the dialog never left `open`. No manual toggle.
  }

  protected onExitDone(id: string): void {
    this.modal().confirmClosed(id);
  }

  private modalContext(instance: ModalInstance<unknown>): ModalContext<unknown> {
    const modal = this.modal();
    const id = instance.id;
    return {
      id,
      data: instance.data,
      parentId: instance.parentId,
      close: (result?: unknown) => modal.close(id, result),
      dismiss: (reason?: string) => modal.dismiss(id, reason),
    };
  }
}
