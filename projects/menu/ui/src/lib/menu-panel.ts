import {
  Component,
  Directive,
  ElementRef,
  ViewEncapsulation,
  afterRenderEffect,
  computed,
  contentChildren,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { RiviniaMenuController, RiviniaMenuItemData } from '@rivinia/menu';
import { RiviniaMenu } from '@rivinia/menu';
import type { RiviniaMenuUiPlacement } from './ui-menu-types';
import { computeMenuPosition } from './menu-position';

/** Payload of {@link RiviniaMenuComponent.picked}. */
export interface MenuPick {
  readonly id: string;
}

/** Per-instance panel id counter (client-side; SSR renders closed). */
let nextPanelId = 0;

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
    '[attr.role]': 'computedRole()',
    '[attr.data-rv-id]': 'id()',
    '[attr.tabindex]': 'tab()',
    '[attr.aria-disabled]': 'isDisabled()',
    '[attr.data-active]': 'active()',
    '[attr.aria-checked]': 'checkedAttr()',
    '(click)': 'pick()',
    '(pointerenter)': 'hover()',
  },
})
export class RiviniaMenuItem {
  readonly id = input.required<string>();
  readonly disabled = input(false, {
    transform: (v: boolean | string) => v === '' || v === true,
  });
  /**
   * Tri-state selection (e.g. multi-select options). `null` (default) renders
   * a plain `menuitem`; a boolean renders `menuitemcheckbox` + `aria-checked`
   * so screen readers announce the state (the visual check alone is silent).
   */
  readonly checked = input<boolean | null>(null);

  private readonly host = inject(ElementRef<HTMLElement>, { optional: true });
  private readonly menu = inject(RiviniaMenuComponent, { optional: true, skipSelf: true });
  private readonly active = computed(() => this.menu?.controller().activeId() === this.id());

  protected tab(): string {
    return this.active() ? '0' : '-1';
  }

  protected computedRole(): string {
    return this.checked() === null ? 'menuitem' : 'menuitemcheckbox';
  }

  protected checkedAttr(): string | null {
    const checked = this.checked();
    return checked === null ? null : String(checked);
  }

  /**
   * `disabled` collides with the native `<button disabled>` property, so a
   * static attribute on a native button element can land on the DOM instead
   * of this input (measured: `<button rvMenuItem disabled>` reported
   * `aria-disabled="false"`). Accept both so the two spellings agree.
   */
  private isDisabled(): boolean {
    if (this.disabled()) return true;
    return this.host?.nativeElement?.disabled === true;
  }

  /** Mouse pick: disabled items are ignored (controller refuses them). */
  protected pick(): void {
    this.menu?.pickItem(this.id());
  }

  /** Mouse hover follows keyboard focus so highlight tracks the pointer. */
  protected hover(): void {
    this.menu?.hoverItem(this.id());
  }

  /** Id currently present in the registry, so renames can be de-registered. */
  private registeredId: string | null = null;

  constructor() {
    // `[disabled]` and `id` are ordinary bindings that change at runtime.
    // Registering once in ngOnInit left the registry stale — measured:
    // toggling `[disabled]` on a focused row still let Enter activate it.
    //
    // The initial registration stays in ngOnInit (synchronous) because an
    // effect-based first pass lands after the opening change-detection tick,
    // which raced the menu's own open and produced intermittently empty
    // panels. The effect only handles SUBSEQUENT changes.
    effect(() => {
      const id = this.id();
      const menu = this.menu;
      if (this.registeredId === null) return;
      if (this.registeredId !== id) menu?.unregisterItem(this.registeredId);
      // Re-register unconditionally: covers a `disabled` flip as well as an
      // id rename (register is idempotent by id).
      menu?.registerItem({ id, disabled: this.isDisabled() });
      this.registeredId = id;
    });
  }

  ngOnInit(): void {
    this.registeredId = this.id();
    this.menu?.registerItem({ id: this.id(), disabled: this.isDisabled() });
  }

  ngOnDestroy(): void {
    if (this.registeredId === null) return;
    this.menu?.unregisterItem(this.registeredId);
    this.registeredId = null;
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
  // Deliberately unencapsulated: projected item buttons belong to the
  // consumer's template, and emulated descendant selectors never match
  // projected content (measured in Chrome: `display` stayed `inline-block`).
  // Every rule below is scoped under `.rv-menu-panel` / `.rv-menu-trigger`,
  // so nothing leaks into application styles.
  encapsulation: ViewEncapsulation.None,
  // The declarative `[items]` mode renders its own rows through the SAME
  // directive consumers use, so registration, keyboard and click handling have
  // exactly one implementation.
  imports: [RiviniaMenuItem],
  template: `
    <div class="rv-menu-trigger" (click)="onTriggerClick()" (keydown)="onTriggerKey($event)">
      <ng-content select="[rv-menu-trigger], [rvMenuTrigger]"></ng-content>
    </div>
    @if (controller().open()) {
      <div
        #panel
        class="rv-menu-panel"
        [class]="panelClass()"
        role="menu"
        [attr.id]="panelId"
        [attr.aria-label]="menuLabel()"
        [attr.popover]="topLayerSupported ? 'manual' : null"
        [attr.data-placement]="placement()"
        [attr.data-flipped]="flipped()"
        [attr.data-positioned]="positioned()"
        [attr.data-top-layer]="topLayerSupported"
        (keydown)="onPanelKey($event)"
      >
        @if (dataItems().length > 0) {
          @for (item of dataItems(); track item.id) {
            <button
              rvMenuItem
              [id]="item.id"
              [disabled]="item.disabled ?? false"
              [checked]="checkedFor(item.id)"
              [class]="itemClass()"
            >
              {{ item.label }}
            </button>
          }
        }
        <ng-content select="[rv-menu-panel], [rvMenuPanel]"></ng-content>
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
        border-top: 1px solid var(--rv-menu-border, #e0e0e0);
        margin: 6px 4px;
      }
      /* NOTE: the :host pseudo-class does not exist without encapsulation,
         so the host element is styled directly (still rv-prefixed).
         Relative positioning anchors the no-popover fallback panel. */
      rv-menu {
        position: relative;
        display: inline-block;
      }
      /* Top-layer mode (popover-capable browsers): the panel escapes every
         clipping ancestor and stacking context. Coordinates come from the
         component (fixed + measured + flipped); the absolute placement
         classes below stay as the no-popover fallback. */
      .rv-menu-panel[data-top-layer='true'] {
        position: fixed;
        inset: auto;
        margin: 0;
      }
      .rv-menu-panel[data-positioned='false'] {
        animation: none;
      }
      /* Flipped panels grow out of the opposite edge (matches coordinates). */
      .rv-menu-panel[data-top-layer='true'][data-placement^='bottom'][data-flipped='true'] {
        transform-origin: bottom center;
      }
      .rv-menu-panel[data-top-layer='true'][data-placement^='top'][data-flipped='true'] {
        transform-origin: top center;
      }
      .rv-menu-panel {
        position: absolute;
        z-index: var(--rv-menu-z, 500);
        min-width: var(--rv-menu-width, 16rem);
        max-width: calc(100dvw - 2rem);
        /* Long lists scroll inside the panel instead of leaving the viewport. */
        max-height: min(20rem, calc(100dvh - 2rem));
        overflow-y: auto;
        background: var(--rv-menu-bg, #ffffff);
        color: var(--rv-menu-fg, #111111);
        font-family: var(--rv-menu-font, system-ui, -apple-system, 'Segoe UI', sans-serif);
        border: 1px solid var(--rv-menu-border, #e0e0e0);
        border-radius: var(--rv-menu-radius, 12px);
        box-shadow: var(--rv-menu-shadow, 0 16px 48px rgba(0, 0, 0, 0.22));
        padding: var(--rv-menu-pad, 6px);
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
      .rv-menu-panel [rvmenuitem] {
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
      .rv-menu-panel [rvmenuitem][data-active='true'] {
        background: color-mix(in srgb, currentColor 10%, transparent);
      }
      .rv-menu-panel [rvmenuitem]:hover {
        background: color-mix(in srgb, currentColor 8%, transparent);
      }
      .rv-menu-panel [rvmenuitem]:focus-visible {
        outline: 2px solid currentColor;
        outline-offset: -2px;
      }
      .rv-menu-panel [rvmenuitem][aria-disabled='true'] {
        opacity: 0.45;
        cursor: default;
      }
      /* Optional icons: consumer projects any svg/icon content; the UI only
         owns sizing, alignment and tone so rows stay consistent. */
      .rv-menu-panel [rvmenuitem] svg,
      .rv-menu-panel [rvmenuitem] [data-icon] {
        width: 16px;
        height: 16px;
        flex: none;
        color: var(--rv-menu-muted);
      }
      .rv-menu-panel [rvmenuitem][data-active='true'] svg,
      .rv-menu-panel [rvmenuitem][data-active='true'] [data-icon] {
        color: inherit;
      }
      /* Opening motion (researched: Radix/shadcn/HeadlessUI pattern):
         fade + scale from the trigger edge + a small slide toward rest.
         Origin follows the vertical side so the panel grows out of the
         trigger; duration/easing stay overridable via vars. */
      .rv-menu-panel {
        transform-origin: top center;
        animation: rv-menu-in var(--rv-menu-duration, 160ms)
          var(--rv-menu-easing, cubic-bezier(0.16, 1, 0.3, 1));
      }
      .rv-menu-panel[data-placement='top-start'],
      .rv-menu-panel[data-placement='top-end'] {
        --rv-menu-from-y: 6px;
        transform-origin: bottom center;
      }
      @media (prefers-reduced-motion: reduce) {
        .rv-menu-panel {
          animation: none;
        }
      }
      @keyframes rv-menu-in {
        from {
          opacity: 0;
          transform: translateY(var(--rv-menu-from-y, -6px)) scale(0.96);
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
  /**
   * Accessible name for the menu panel (`aria-label`). Menus should be named
   * so screen-reader users know what they chose from; omitted → no label.
   *
   * Named `menuLabel` (not `label`) so it cannot be confused with the
   * per-item `label` in {@link RiviniaMenuItemData}.
   */
  readonly menuLabel = input<string | null>(null);
  /**
   * Declarative items. When provided, the panel renders these rows itself —
   * no `rvMenuItem` markup and no controller needed. Mutually exclusive with
   * projected `rvMenuItem` children (see `ambiguous`).
   */
  readonly items = input<readonly RiviniaMenuItemData[] | null>(null);
  /** Extra class(es) on the panel, alongside `.rv-menu-panel`. */
  readonly panelClass = input<string | null>(null);
  /** Extra class(es) on data-driven rows only (projected rows use your markup). */
  readonly itemClass = input<string | null>(null);

  /** Fired when the user picks an enabled item (id). Closes first. */
  readonly picked = output<MenuPick>();
  readonly opened = output<void>();
  readonly closed = output<void>();

  private readonly owned = new RiviniaMenu();
  private readonly self = inject(ElementRef<HTMLElement>);
  /** Item directives the consumer projected (not the ones we render). */
  private readonly projectedItems = contentChildren(RiviniaMenuItem, { descendants: true });
  /**
   * Stable panel id for `aria-controls`. Instance-unique via module counter;
   * SSR-safe because the panel (and its id) only renders client-side on open.
   */
  protected readonly panelId = `rv-menu-panel-${++nextPanelId}`;
  /** Deferred initial focus: set on open paths, consumed after render. */
  private focusPending = false;
  /** True between an open and the first row registered for it. */
  private pendingActivation = false;
  /**
   * Manual popover support (top-layer). Feature-detected: modern browsers
   * escape clipping ancestors; older ones keep the absolute fallback.
   */
  protected readonly topLayerSupported =
    typeof HTMLElement !== 'undefined' && 'showPopover' in HTMLElement.prototype;
  /** Coordinates applied (gates the enter animation until measured). */
  protected readonly positioned = signal(false);
  /** Whether the panel flipped to the opposite vertical side. */
  protected readonly flipped = signal(false);
  /** Printable-character search buffer; reset by timer after 500ms quiet. */
  private typeBuffer = '';
  private typeTimer: ReturnType<typeof setTimeout> | null = null;

  /** Effective controller: external input or the owned fallback. */
  controller(): RiviniaMenuController {
    return this.menu() ?? this.owned;
  }

  /** Data-driven rows to render, or empty when the consumer projects markup. */
  protected dataItems(): readonly RiviniaMenuItemData[] {
    return this.ambiguous() ? [] : (this.items() ?? []);
  }

  /**
   * Checkbox semantics only when a consumer supplied an external controller
   * with `multi`-style values; a single-select menu keeps plain `menuitem`
   * roles. Kept a method (not a computed) so it stays cheap and reactive via
   * template reads.
   */
  protected checkedFor(id: string): boolean | null {
    const c = this.controller() as RiviniaMenuController & {
      isSelected?: (id: string) => boolean;
    };
    return typeof c.isSelected === 'function' ? c.isSelected(id) : null;
  }

  /**
   * `[items]` and projected `rvMenuItem` children are two ways to populate the
   * same panel. Supplying both is ambiguous: we throw instead of silently
   * picking a winner, because a silently-ignored list is a data-loss bug.
   */
  protected ambiguous(): boolean {
    return this.items() !== null && this.projectedItems().length > 0;
  }

  /** Called by {@link RiviniaMenuItem} directives. */
  registerItem(item: { id: string; disabled: boolean }): void {
    const c = this.controller();
    c.register(item);
    // Rows can register AFTER the panel opened — the declarative `[items]`
    // path only renders them once `open()` is true, so at open time the
    // registry was still empty and `openMenu('first')` had nothing to
    // activate (measured: `activeId` stayed null, ArrowDown could not move,
    // and the highlight never appeared).
    if (this.pendingActivation && c.open() && c.activeId() === null && !item.disabled) {
      c.activateFirst();
      this.pendingActivation = false;
    }
  }

  /** Called by {@link RiviniaMenuItem} directives. */
  unregisterItem(id: string): void {
    this.controller().unregister(id);
  }

  constructor() {
    effect(() => {
      if (!this.ambiguous()) return;
      throw new Error(
        'rv-menu: `[items]` cannot be combined with projected `rvMenuItem` ' +
          'children — pick one way to populate the panel.',
      );
    });
    effect((onCleanup) => {
      if (typeof window === 'undefined') return;
      if (!this.controller().open()) return;
      const onPointer = (event: PointerEvent) => {
        const host = this.self.nativeElement;
        // Close WITHOUT restoring focus: the pointer is heading somewhere the
        // browser will focus naturally (or nowhere focusable). Stealing it
        // back to the trigger would break that (APG + WCAG focus-visible).
        if (host && !host.contains(event.target as Node)) this.doClose(false);
      };
      document.addEventListener('pointerdown', onPointer);
      // Coordinates go stale on outside scroll/resize — close instead of
      // drifting (native-select-like; scrolling inside the panel is exempt).
      // Like Tab-close, this is APG-consistent non-modal behavior.
      const onScroll = (event: Event) => {
        const panel = this.self.nativeElement.querySelector('.rv-menu-panel');
        if (panel && event.target instanceof Node && panel.contains(event.target)) return;
        this.doClose(false);
      };
      window.addEventListener('scroll', onScroll, true);
      window.addEventListener('resize', onScroll);
      onCleanup(() => {
        document.removeEventListener('pointerdown', onPointer);
        window.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onScroll);
      });
    });
    // APG menu-button: the trigger exposes haspopup + expanded. The trigger
    // element is consumer-owned, so the attributes sync onto its focusable
    // child (or the wrapper itself as a fallback). aria-controls references
    // the stable panel id (valid while hidden per ARIA).
    effect(() => {
      if (typeof document === 'undefined') return;
      const open = this.controller().open();
      const trigger = this.triggerEl();
      trigger?.setAttribute('aria-haspopup', 'menu');
      trigger?.setAttribute('aria-expanded', String(open));
      trigger?.setAttribute('aria-controls', this.panelId);
    });
    afterRenderEffect(() => {
      if (this.controller().open() && !this.positioned()) this.showAndPosition();
      this.consumePendingFocus();
    });
  }

  /**
   * Top-layer presentation: show the manual popover, measure trigger +
   * panel, and pin fixed coordinates (flipping when needed). Runs inside
   * afterRender — before paint, so no flash. Falls back to the absolute CSS
   * placement when popover is unsupported (jsdom included).
   */
  private showAndPosition(): void {
    const root = this.self.nativeElement.querySelector('.rv-menu-panel') as HTMLElement | null;
    if (!root) return;
    if (typeof window === 'undefined' || !this.topLayerSupported) {
      this.positioned.set(true);
      return;
    }
    try {
      const popover = root as HTMLElement & { showPopover?: () => void };
      if (typeof popover.showPopover !== 'function') {
        this.positioned.set(true);
        return;
      }
      popover.showPopover();
      const trigger = this.triggerEl()?.getBoundingClientRect();
      if (!trigger) {
        this.positioned.set(true);
        return;
      }
      const at = computeMenuPosition(
        { left: trigger.left, top: trigger.top, width: trigger.width, height: trigger.height },
        { width: root.offsetWidth, height: root.offsetHeight },
        this.placement(),
        { width: window.innerWidth, height: window.innerHeight },
        this.isRtl(),
      );
      root.style.left = `${at.left}px`;
      root.style.top = `${at.top}px`;
      this.flipped.set(at.flipped);
      this.positioned.set(true);
    } catch {
      this.positioned.set(true);
    }
  }

  private isRtl(): boolean {
    try {
      const doc = typeof document === 'undefined' ? null : document.documentElement;
      if (doc?.dir === 'rtl') return true;
      if (doc?.dir === 'ltr') return false;
      return getComputedStyle(this.self.nativeElement).direction === 'rtl';
    } catch {
      return false;
    }
  }

  /**
   * Mark an opening pass: deferred focus + re-measurement.
   *
   * `positioned` is reset unconditionally (not only in top-layer mode) so the
   * afterRenderEffect always gets a second pass: once with the panel measured,
   * then again after `positioned` flips back to true — that second pass is what
   * guarantees focus lands even if the first one raced the panel's insertion.
   */
  private markOpening(): void {
    this.focusPending = true;
    // Set on every open so rows that register after the panel rendered can
    // claim the initial activation exactly once.
    this.pendingActivation = true;
    this.flipped.set(false);
    this.positioned.set(false);
  }

  protected onTriggerClick(): void {
    const c = this.controller();
    c.toggle();
    if (c.open()) {
      this.opened.emit();
      this.markOpening();
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
        this.markOpening();
        break;
      case 'ArrowUp':
        event.preventDefault();
        c.openMenu('last');
        this.opened.emit();
        this.markOpening();
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
      case 'Tab': {
        // Non-modal Tab must not trap focus. The panel is still in the DOM
        // when this event is handled (Angular removes it on the next CD), so
        // the browser's own Tab step would re-enter the panel and then lose
        // focus to <body> when it unmounted (measured on both Chromium and
        // Firefox). So we close, and step focus explicitly from the trigger.
        event.preventDefault();
        const backwards = event.shiftKey;
        this.doClose(false);
        this.focusAdjacentToTrigger(backwards);
        break;
      }
      default:
        this.onTypeahead(event);
        break;
    }
  }

  /**
   * APG printable-character search: typing moves focus to the next enabled
   * item whose visible text starts with the buffer. Repeating one character
   * cycles through its matches; the buffer resets after 500ms of quiet.
   * Labels are UI-owned (read from the DOM), so this lives in the component,
   * not the headless controller.
   */
  private resetTypeahead(): void {
    this.typeBuffer = '';
    if (this.typeTimer !== null) {
      clearTimeout(this.typeTimer);
      this.typeTimer = null;
    }
  }

  private onTypeahead(event: KeyboardEvent): void {
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return;
    const ch = event.key.toLocaleLowerCase();
    // Repeating one character cycles its matches instead of growing the buffer.
    const cycling = this.typeBuffer !== '' && [...this.typeBuffer].every((c) => c === ch);
    if (!cycling) this.typeBuffer += ch;
    if (this.typeTimer !== null) clearTimeout(this.typeTimer);
    this.typeTimer = setTimeout(() => {
      this.typeBuffer = '';
      this.typeTimer = null;
    }, 500);
    const id = this.matchTypeahead(this.typeBuffer);
    if (id !== null && this.controller().activate(id)) this.focusActive();
  }

  private matchTypeahead(buffer: string): string | null {
    const root: HTMLElement | null = this.self.nativeElement.querySelector('.rv-menu-panel');
    if (!root) return null;
    const enabled = new Set(
      this.controller()
        .items()
        .filter((i) => !i.disabled)
        .map((i) => i.id),
    );
    const rows = [...root.querySelectorAll('[data-rv-id]')]
      .map((el) => ({
        id: el.getAttribute('data-rv-id') ?? '',
        text: (el.textContent ?? '').trim().toLocaleLowerCase(),
      }))
      .filter((r) => enabled.has(r.id) && r.text.startsWith(buffer));
    if (rows.length === 0) return null;
    if (new Set(buffer).size === 1) {
      // Repeated character: cycle from after the current item.
      const ids = rows.map((r) => r.id);
      const at = ids.indexOf(this.controller().activeId() ?? '');
      return ids[(at + 1) % ids.length];
    }
    return rows[0].id;
  }

  private pickFocused(): void {
    const c = this.controller();
    const id = c.pickActive();
    if (id === null) return;
    // Re-validate before emitting: the active item may have been disabled
    // after it received focus (dynamic `[disabled]`), and Enter must never
    // activate a disabled row (measured: all-disabled menu emitted `picked=one`).
    const item = c.items().find((i) => i.id === id);
    if (!item || item.disabled) return;
    this.doClose(false);
    this.picked.emit({ id });
  }

  /**
   * Mouse pick of a concrete item. Called by {@link RiviniaMenuItem}.
   * Disabled/unknown ids are ignored via `activate` (returns false).
   */
  pickItem(id: string): void {
    if (!this.controller().activate(id)) return;
    this.doClose(false);
    this.picked.emit({ id });
  }

  /** Mouse hover tracks keyboard focus. Called by {@link RiviniaMenuItem}. */
  hoverItem(id: string): void {
    this.controller().activate(id);
  }

  private doClose(restoreFocus: boolean): void {
    const was = this.controller().open();
    // APG: the typeahead buffer is per-open. Keeping it across a close made
    // the next open start mid-word (measured: `due` + `d` matched nothing).
    this.resetTypeahead();
    this.controller().closeMenu();
    if (was) this.closed.emit();
    if (restoreFocus) this.focusTrigger();
  }

  /**
   * Initial focus after open. The panel only exists in the DOM after the
   * opening change-detection pass, so focusing synchronously races rendering.
   * afterRenderEffect re-runs when `open` flips (reactive read) and executes
   * after the commit — panel present, in apps and in tests. Never runs on the
   * server (SSR-safe by construction). Skips when focus already sits inside
   * the panel, so later renders never steal it back.
   */
  private consumePendingFocus(): void {
    // `positioned` is read so the effect re-runs after measurement even when
    // `open` never changes again — the second pass is the retry.
    const ready = this.positioned();
    if (!ready || !this.controller().open() || !this.focusPending) return;
    const root: HTMLElement | null = this.self.nativeElement.querySelector('.rv-menu-panel');
    // Panel not committed yet: keep the flag so the next pass retries. Clearing
    // it here is what used to strand focus on <body> (measured: Playwright
    // "received: inactive" on every arrow assertion).
    if (!root) return;
    const active = this.activeDocumentElement();
    if (active && root.contains(active)) {
      this.focusPending = false;
      return;
    }
    // No enabled item to focus (empty/all-disabled menu): done, nothing to retry.
    this.focusPending = false;
    this.focusActive();
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

  /** Focusable trigger child (APG target) or the wrapper as fallback. */
  private triggerEl(): HTMLElement | null {
    const wrap = this.self.nativeElement.querySelector('.rv-menu-trigger') as HTMLElement | null;
    if (!wrap) return null;
    return (wrap.querySelector('button, a, [tabindex]') as HTMLElement | null) ?? wrap;
  }

  /**
   * Move focus to the element before/after the trigger in document tab order.
   *
   * Explicit rather than delegating to the browser: the panel is still
   * mounted when Tab is handled, so the browser's own step re-enters the panel
   * and focus is then lost to <body> when it unmounts (measured on Chromium
   * and Firefox). Leaves focus on the document when nothing is left in that
   * direction.
   */
  private focusAdjacentToTrigger(backwards: boolean): void {
    try {
      const trigger = this.triggerEl();
      const doc = trigger?.ownerDocument;
      if (!trigger || !doc) return;
      const selector =
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      const stops = [...doc.querySelectorAll<HTMLElement>(selector)].filter((el) => {
        if (el.hasAttribute('disabled') || el.getAttribute('aria-hidden') === 'true') return false;
        // Rows inside any open panel are part of that menu, not this page flow.
        if (el.closest('.rv-menu-panel')) return false;
        return el.getClientRects().length > 0;
      });
      stops.sort((a, b) =>
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
      );
      const at = stops.indexOf(trigger);
      if (at === -1) return;
      stops[backwards ? at - 1 : at + 1]?.focus({ preventScroll: true });
    } catch {
      // Focus stepping is best-effort; never break the close path.
    }
  }

  private focusTrigger(): void {
    try {
      this.triggerEl()?.focus({ preventScroll: true });
    } catch {
      // Best-effort.
    }
  }
}
