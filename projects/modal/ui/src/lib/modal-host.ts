import { Component, Injector, computed, input } from '@angular/core';
import type { Signal } from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { RIVINIA_MODAL_CONTEXT } from '@rivinia/modal';
import type {
  ModalContext,
  ModalDismissOrigin,
  ModalInstance,
  ModalTemplateContext,
} from '@rivinia/modal';
import { RiviniaModalDialog } from './modal-dialog';
import type { RiviniaModalSize } from './ui-types';

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
  standalone: true,
  imports: [RiviniaModalDialog, NgComponentOutlet, NgTemplateOutlet],
  template: `
    @for (instance of visible(); track instance.id) {
      <rv-modal-dialog
        [open]="true"
        [managed]="true"
        [closing]="instance.status === 'closing'"
        [title]="titleOfInstance(instance)"
        [size]="size()"
        [showCloseButton]="showCloseButton()"
        [closeOnEscape]="instance.dismiss.closeOnEscape ?? true"
        [backdrop]="instance.dismiss.backdrop ?? 'close'"
        (dismissRequested)="onIntent(instance.id, $event)"
        (exitDone)="onExitDone(instance.id)"
      >
        @if (instance.content.kind === 'template') {
          <ng-container
            *ngTemplateOutlet="instance.content.template; context: templateContext(instance)"
          ></ng-container>
        } @else {
          <ng-container
            *ngComponentOutlet="
              instance.content.component;
              inputs: instance.content.inputs;
              injector: contextInjector(instance)
            "
          ></ng-container>
        }
      </rv-modal-dialog>
    }
  `,
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

  protected readonly visible = computed(() => this.modal().visible());

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
