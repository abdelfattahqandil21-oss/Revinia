import {
  Component,
  Directive,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import type { RiviniaMenuController } from '@rivinia/menu';
import { RiviniaMenu } from '@rivinia/menu';
import type { RiviniaMenuUiPlacement } from './ui-menu-types';

/** Payload of {@link RiviniaMenuComponent.picked}. */
export interface MenuPick {
  readonly id: string;
}

/**
 * Marker + behavior for one navigable row. Registers itself with the
 * enclosing menu on init (unregisters on destroy), exposes `data-rv-id`
 * for focus targeting, and keeps `tabindex`/`aria-disabled` in sync.
 * Non-`rvMenuItem` content (headers, dividers, badges) is skipped by
 * keyboard navigation automatically.
 */
@Directive({
  selector: '[rvMenuItem]',
  standalone: true,
  host: {
    role: 'menuitem',
    '[attr.data-rv-id]': 'id()',
    '[attr.tabindex]': 'tab()',
    '[attr.aria-disabled]': 'disabled()',
    '[attr.data-active]': 'active()',
  },
})
export class RiviniaMenuItem {
  readonly id = input.required<string>();
  readonly disabled = input(false, {
    transform: (v: boolean | string) => v === '' || v === true,
  });

  private readonly menu = inject(RiviniaMenuComponent, { optional: true, skipSelf: true });
  private readonly active = computed(() => this.menu?.controller().activeId() === this.id());

  protected tab(): string {
    return this.active() ? '0' : '-1';
  }

  ngOnInit(): void {
    this.menu?.registerItem({ id: this.id(), disabled: this.disabled() });
  }

  ngOnDestroy(): void {
    this.menu?.unregisterItem(this.id());
  }
}

/**
 * Ready-made dropdown menu. Binds a {@link RiviniaMenu} controller (or owns
 * one when omitted) and projects trigger + panel:
 *
 * ```html
 * <rv-menu [menu]="menu" [placement]="'bottom-start'" (picked)="go($event)">
 *   <button rv-menu-trigger><img src="avatar.png" alt="Account" /></button>
 *   <div rv-menu-panel>
 *     <div class="head">Sophie · sophie@ui.live</div>
 *     <button rvMenuItem id="profile">Profile</button>
 *     <button rvMenuItem id="logout">Sign out</button>
 *   </div>
 * </rv-menu>
 * ```
 *
 * Keyboard: Enter/Space/ArrowDown opens; Escape closes and refocuses the
 * trigger; arrows/Home/End move through enabled items; Tab closes and moves
 * on (non-modal by design). Outside pointer-down closes. SSR renders closed.
 */
@Component({
  selector: 'rv-menu',
  standalone: true,
  template: `
    <div class="rv-menu-trigger" (click)="onTriggerClick()" (keydown)="onTriggerKey($event)">
      <ng-content select="[rv-menu-trigger]"></ng-content>
    </div>
    @if (controller().open()) {
      <div
        #panel
        class="rv-menu-panel"
        role="menu"
        [attr.data-placement]="placement()"
        (keydown)="onPanelKey($event)"
      >
        <ng-content select="[rv-menu-panel]"></ng-content>
      </div>
    }
  `,
  styles: [
    `
      .rv-menu-trigger {
        display: inline-flex;
        align-items: center;
      }
      .rv-menu-panel {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .rv-menu-panel hr {
        border: 0;
        border-top: 1px solid var(--rv-menu-border);
        margin: 6px 4px;
      }
      :host {
        position: relative;
        display: inline-block;
      }
      .rv-menu-panel {
        --rv-menu-bg: #ffffff;
        --rv-menu-fg: #111111;
        --rv-menu-muted: #555555;
        --rv-menu-border: #e0e0e0;
        --rv-menu-radius: 12px;
        --rv-menu-shadow: 0 16px 48px rgba(0, 0, 0, 0.22);
        --rv-menu-pad: 6px;
        --rv-menu-width: 16rem;
        position: absolute;
        z-index: var(--rv-menu-z, 500);
        min-width: var(--rv-menu-width);
        max-width: calc(100dvw - 2rem);
        background: var(--rv-menu-bg);
        color: var(--rv-menu-fg);
        border: 1px solid var(--rv-menu-border);
        border-radius: var(--rv-menu-radius);
        box-shadow: var(--rv-menu-shadow);
        padding: var(--rv-menu-pad);
      }
      @media (prefers-color-scheme: dark) {
        .rv-menu-panel {
          --rv-menu-bg: #161616;
          --rv-menu-fg: #f2f2f2;
          --rv-menu-muted: #a8a8a8;
          --rv-menu-border: #333333;
        }
      }
      .rv-menu-panel[data-placement='bottom-start'] {
        inset-block-start: calc(100% + 6px);
        inset-inline-start: 0;
      }
      .rv-menu-panel[data-placement='bottom-end'] {
        inset-block-start: calc(100% + 6px);
        inset-inline-end: 0;
      }
      .rv-menu-panel[data-placement='top-start'] {
        inset-block-end: calc(100% + 6px);
        inset-inline-start: 0;
      }
      .rv-menu-panel[data-placement='top-end'] {
        inset-block-end: calc(100% + 6px);
        inset-inline-end: 0;
      }
      .rv-menu-panel [rvMenuItem] {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        min-height: 40px;
        border: 0;
        border-radius: 8px;
        background: transparent;
        color: inherit;
        font: inherit;
        font-size: 14px;
        line-height: 1.4;
        text-align: start;
        padding: 8px 10px;
        cursor: pointer;
      }
      .rv-menu-panel [rvMenuItem][data-active='true'] {
        background: color-mix(in srgb, currentColor 10%, transparent);
      }
      .rv-menu-panel [rvMenuItem]:hover {
        background: color-mix(in srgb, currentColor 8%, transparent);
      }
      .rv-menu-panel [rvMenuItem]:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: -2px;
      }
      .rv-menu-panel [rvMenuItem][aria-disabled='true'] {
        opacity: 0.45;
        cursor: default;
      }
      @media (prefers-reduced-motion: reduce) {
        .rv-menu-panel {
          animation: none;
        }
      }
      .rv-menu-panel {
        animation: rv-menu-in 120ms ease-out;
      }
      @keyframes rv-menu-in {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
      }
    `,
  ],
})
export class RiviniaMenuComponent {
  /**
   * External controller (shared/test double). Omitted → the component owns
   * a private one (simplest embedding).
   */
  readonly menu = input<RiviniaMenuController | null>(null);
  /** Panel placement relative to the trigger. @default 'bottom-start' */
  readonly placement = input<RiviniaMenuUiPlacement>('bottom-start');

  /** Fired when the user picks an enabled item (id). Closes first. */
  readonly picked = output<MenuPick>();
  readonly opened = output<void>();
  readonly closed = output<void>();

  private readonly owned = new RiviniaMenu();
  private readonly self = inject(ElementRef<HTMLElement>);

  /** Effective controller: external input or the owned fallback. */
  controller(): RiviniaMenuController {
    return this.menu() ?? this.owned;
  }

  /** Called by {@link RiviniaMenuItem} directives. */
  registerItem(item: { id: string; disabled: boolean }): void {
    this.controller().register(item);
  }

  /** Called by {@link RiviniaMenuItem} directives. */
  unregisterItem(id: string): void {
    this.controller().unregister(id);
  }

  constructor() {
    effect((onCleanup) => {
      if (typeof window === 'undefined') return;
      if (!this.controller().open()) return;
      const onPointer = (event: PointerEvent) => {
        const host = this.self.nativeElement;
        if (host && !host.contains(event.target as Node)) this.doClose(true);
      };
      document.addEventListener('pointerdown', onPointer);
      onCleanup(() => document.removeEventListener('pointerdown', onPointer));
    });
  }

  protected onTriggerClick(): void {
    const c = this.controller();
    c.toggle();
    if (c.open()) {
      this.opened.emit();
      this.focusSoon();
    } else {
      // Focus never left the trigger on toggle-close — restore is a no-op.
      this.closed.emit();
    }
  }

  protected onTriggerKey(event: KeyboardEvent): void {
    const c = this.controller();
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        c.openMenu('first');
        this.opened.emit();
        this.focusSoon();
        break;
      case 'ArrowUp':
        event.preventDefault();
        c.openMenu('last');
        this.opened.emit();
        this.focusSoon();
        break;
      case 'Escape':
        if (c.open()) {
          event.preventDefault();
          this.doClose(true);
        }
        break;
      default:
        break;
    }
  }

  protected onPanelKey(event: KeyboardEvent): void {
    const c = this.controller();
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.doClose(true);
        break;
      case 'ArrowDown':
        event.preventDefault();
        c.activateNext();
        this.focusActive();
        break;
      case 'ArrowUp':
        event.preventDefault();
        c.activatePrevious();
        this.focusActive();
        break;
      case 'Home':
        event.preventDefault();
        c.activateFirst();
        this.focusActive();
        break;
      case 'End':
        event.preventDefault();
        c.activateLast();
        this.focusActive();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.pickFocused();
        break;
      case 'Tab':
        this.doClose(false);
        break;
      default:
        break;
    }
  }

  private pickFocused(): void {
    const c = this.controller();
    const id = c.pickActive();
    if (id === null) return;
    this.doClose(false);
    this.picked.emit({ id });
  }

  private doClose(restoreFocus: boolean): void {
    const was = this.controller().open();
    this.controller().closeMenu();
    if (was) this.closed.emit();
    if (restoreFocus) this.focusTrigger();
  }

  /**
   * Initial focus after open. The panel only exists in the DOM after the
   * opening change-detection pass, so focusing synchronously races rendering
   * (and always loses). A microtask runs right after the commit — in apps,
   * in tests (via `await`), and harmlessly on the server (nothing found,
   * focus guarded). Skips when focus already sits inside the panel, so
   * later renders never steal it back.
   */
  private focusSoon(): void {
    if (typeof queueMicrotask === 'undefined') {
      this.focusActive();
      return;
    }
    queueMicrotask(() => {
      if (!this.controller().open()) return;
      const root: HTMLElement | null = this.self.nativeElement.querySelector('.rv-menu-panel');
      const active = this.activeDocumentElement();
      if (root && (!active || !root.contains(active))) this.focusActive();
    });
  }

  private focusActive(): void {
    const id = this.controller().activeId();
    const root: HTMLElement | null = this.self.nativeElement.querySelector('.rv-menu-panel');
    if (!root) return;
    const target = id
      ? root.querySelector<HTMLElement>(`[data-rv-id="${CSS.escape(id)}"]`)
      : root.querySelector<HTMLElement>('[rvmenuitem]');
    try {
      target?.focus({ preventScroll: true });
    } catch {
      // Focus is best-effort.
    }
  }

  private activeDocumentElement(): Element | null {
    try {
      return typeof document === 'undefined' ? null : document.activeElement;
    } catch {
      return null;
    }
  }

  private focusTrigger(): void {
    try {
      const trigger = this.self.nativeElement.querySelector(
        '.rv-menu-trigger',
      ) as HTMLElement | null;
      const focusable = trigger?.querySelector('button, a, [tabindex]') as HTMLElement | null;
      (focusable ?? trigger)?.focus({ preventScroll: true });
    } catch {
      // Best-effort.
    }
  }
}
