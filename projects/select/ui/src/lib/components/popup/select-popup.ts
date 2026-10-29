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
import type { SelectPopupController, SelectPopupItemData } from '../../models/select-popup.types';
import type { SelectPopupUiPlacement } from '../../models/select-popup.ui-types';
import { SelectPopupControllerImpl } from '../../services/select-popup';
import { computeSelectPopupPosition } from '../../utils/select-popup-position';

/** Payload of {@link RiviniaSelectPopup.picked}. */
export interface SelectPopupPick {
  readonly id: string;
}

/** Per-instance panel id counter (client-side; SSR renders closed). */
let nextPanelId = 0;

/**
 * Marker + behavior for one navigable row. Registers itself with the
 * enclosing menu on init (unregisters on destroy), exposes `data-rv-id`
 * for focus targeting, and keeps `tabindex`/`aria-disabled` in sync.
 * Non-`rvSelectPopupItem` content (headers, dividers, badges) is skipped by
 * keyboard navigation automatically.
 */
@Directive({
  selector: '[rvSelectPopupItem]',
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
export class SelectPopupItem {
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
  private readonly host_ = inject(SelectPopupComponent, { optional: true });
  private readonly active = computed(() => this.host_?.controller().activeId() === this.id());

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
   * of this input (measured: `<button rvSelectPopupItem disabled>` reported
   * `aria-disabled="false"`). Accept both so the two spellings agree.
   */
  private isDisabled(): boolean {
    if (this.disabled()) return true;
    return this.host?.nativeElement?.disabled === true;
  }

  /** Mouse pick: disabled items are ignored (controller refuses them). */
  protected pick(): void {
    this.host_?.pickItem(this.id());
  }

  /** Mouse hover follows keyboard focus so highlight tracks the pointer. */
  protected hover(): void {
    this.host_?.hoverItem(this.id());
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
      const menu = this.host_;
      if (this.registeredId === null) return;
      if (this.registeredId !== id) this.host_?.unregisterItem(this.registeredId);
      // Re-register unconditionally: covers a `disabled` flip as well as an
      // id rename (register is idempotent by id).
      this.host_?.registerItem({ id, disabled: this.isDisabled() });
      this.registeredId = id;
    });
  }

  ngOnInit(): void {
    this.registeredId = this.id();
    this.host_?.registerItem({ id: this.id(), disabled: this.isDisabled() });
  }

  ngOnDestroy(): void {
    if (this.registeredId === null) return;
    this.host_?.unregisterItem(this.registeredId);
    this.registeredId = null;
  }
}

/**
 * Ready-made dropdown menu. Binds a {@link RiviniaSelectPopup} controller (or owns
 * one when omitted) and projects trigger + panel:
 *
 * ```html
 * <rv-select-popup [menu]="menu" [placement]="'bottom-start'" (picked)="go($event)">
 *   <button rv-select-popup-trigger><img src="avatar.png" alt="Account" /></button>
 *   <div rv-select-popup-panel>
 *     <div class="head">Sophie · sophie@ui.live</div>
 *     <button rvSelectPopupItem id="profile">Profile</button>
 *     <button rvSelectPopupItem id="logout">Sign out</button>
 *   </div>
 * </rv-select-popup>
 * ```
 *
 * Keyboard: Enter/Space/ArrowDown opens; Escape closes and refocuses the
 * trigger; arrows/Home/End move through enabled items; Tab closes and moves
 * on (non-modal by design). Outside pointer-down closes. SSR renders closed.
 */
@Component({
  selector: 'rv-select-popup',
  // Deliberately unencapsulated: projected item buttons belong to the
  // consumer's template, and emulated descendant selectors never match
  // projected content (measured in Chrome: `display` stayed `inline-block`).
  // Every rule below is scoped under `.rv-select-popup-panel` / `.rv-select-popup-trigger`,
  // so nothing leaks into application styles.
  encapsulation: ViewEncapsulation.None,
  // The declarative `[items]` mode renders its own rows through the SAME
  // directive consumers use, so registration, keyboard and click handling have
  // exactly one implementation.
  imports: [SelectPopupItem],
  templateUrl: './select-popup.html',
  styleUrl: './select-popup.css',
})
export class SelectPopupComponent {
  /**
   * External controller (shared/test double). Omitted → the component owns
   * a private one (simplest embedding).
   */
  readonly popup = input<SelectPopupController | null>(null);
  /** Panel placement relative to the trigger. @default 'bottom-start' */
  readonly placement = input<SelectPopupUiPlacement>('bottom-start');
  /**
   * Accessible name for the menu panel (`aria-label`). Menus should be named
   * so screen-reader users know what they chose from; omitted → no label.
   *
   * Named `popupLabel` (not `label`) so it cannot be confused with the
   * per-item `label` in {@link SelectPopupItemData}.
   */
  readonly popupLabel = input<string | null>(null);
  /**
   * Declarative items. When provided, the panel renders these rows itself —
   * no `rvSelectPopupItem` markup and no controller needed. Mutually exclusive with
   * projected `rvSelectPopupItem` children (see `ambiguous`).
   */
  readonly items = input<readonly SelectPopupItemData[] | null>(null);
  /** Extra class(es) on the panel, alongside `.rv-select-popup-panel`. */
  readonly panelClass = input<string | null>(null);
  /** Extra class(es) on data-driven rows only (projected rows use your markup). */
  readonly itemClass = input<string | null>(null);

  /** Fired when the user picks an enabled item (id). Closes first. */
  readonly picked = output<SelectPopupPick>();
  readonly opened = output<void>();
  readonly closed = output<void>();

  /**
   * The panel element, once it exists.
   *
   * The panel is the scroll container, so a consumer virtualising the list
   * needs it as the virtualizer's scroll element:
   *
   * ```ts
   * virtualizer = injectVirtualizer(() => ({
   *   scrollElement: this.panel(),
   *   count: this.options().length,
   *   estimateSize: () => 36,
   * }));
   * ```
   *
   * Emitted after the panel is committed, so the element is in the document
   * when it arrives.
   */
  readonly panelReady = output<HTMLElement>();

  /**
   * The panel was scrolled close to its end.
   *
   * The threshold is a token (`--rv-select-popup-reach-end-offset`), because
   * "close to the end" is a distance, not a percentage — a percentage of a
   * list that is still loading changes meaning as rows arrive.
   */
  readonly reachEnd = output<void>();

  private readonly owned = new SelectPopupControllerImpl();
  private readonly self = inject(ElementRef<HTMLElement>);
  /** Item directives the consumer projected (not the ones we render). */
  private readonly projectedItems = contentChildren(SelectPopupItem, { descendants: true });
  /**
   * Stable panel id for `aria-controls`. Instance-unique via module counter;
   * SSR-safe because the panel (and its id) only renders client-side on open.
   */
  protected readonly panelId = `rv-select-popup-panel-${++nextPanelId}`;
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
  /** Whether the panel element has already been handed over. */
  private panelEmitted = false;
  /** Whether the panel flipped to the opposite vertical side. */
  protected readonly flipped = signal(false);
  /** Printable-character search buffer; reset by timer after 500ms quiet. */
  private typeBuffer = '';
  private typeTimer: ReturnType<typeof setTimeout> | null = null;

  /** Effective controller: external input or the owned fallback. */
  controller(): SelectPopupController {
    return this.popup() ?? this.owned;
  }

  /** Data-driven rows to render, or empty when the consumer projects markup. */
  protected dataItems(): readonly SelectPopupItemData[] {
    return this.ambiguous() ? [] : (this.items() ?? []);
  }

  /**
   * Checkbox semantics only when a consumer supplied an external controller
   * with `multi`-style values; a single-select menu keeps plain `menuitem`
   * roles. Kept a method (not a computed) so it stays cheap and reactive via
   * template reads.
   */
  protected checkedFor(id: string): boolean | null {
    const c = this.controller() as SelectPopupController & {
      isSelected?: (id: string) => boolean;
    };
    return typeof c.isSelected === 'function' ? c.isSelected(id) : null;
  }

  /**
   * `[items]` and projected `rvSelectPopupItem` children are two ways to populate the
   * same panel. Supplying both is ambiguous: we throw instead of silently
   * picking a winner, because a silently-ignored list is a data-loss bug.
   */
  protected ambiguous(): boolean {
    return this.items() !== null && this.projectedItems().length > 0;
  }

  /** Called by {@link SelectPopupItem} directives. */
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

  /** Called by {@link SelectPopupItem} directives. */
  unregisterItem(id: string): void {
    this.controller().unregister(id);
  }

  constructor() {
    effect(() => {
      if (!this.ambiguous()) return;
      throw new Error(
        'rv-select-popup: `[items]` cannot be combined with projected `rvSelectPopupItem` ' +
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
        const panel = this.self.nativeElement.querySelector('.rv-select-popup-panel');
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
      this.emitPanelReady();
      this.consumePendingFocus();
    });
  }

  /**
   * Top-layer presentation: show the manual popover, measure trigger +
   * panel, and pin fixed coordinates (flipping when needed). Runs inside
   * afterRender — before paint, so no flash. Falls back to the absolute CSS
   * placement when popover is unsupported (jsdom included).
   */
  /**
   * Hand the panel element to the consumer, once.
   *
   * A virtualised list needs the panel as its scroll element, and the panel
   * only exists while the popup is open — so it is emitted on open and the
   * consumer keeps the reference.
   */
  private emitPanelReady(): void {
    if (this.panelEmitted) return;
    const root = this.self.nativeElement.querySelector(
      '.rv-select-popup-panel',
    ) as HTMLElement | null;
    if (!root) return;
    this.panelEmitted = true;
    this.panelReady.emit(root);
  }

  /**
   * The panel scrolled close to its end.
   *
   * A DISTANCE, not a percentage: the panel's scrollable height changes as
   * rows arrive, so a percentage would fire at a different row every time.
   */
  protected onPanelScroll(event: Event): void {
    const el = event.target as HTMLElement | null;
    if (!el) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    const offset = this.reachEndOffset();
    if (remaining <= offset) this.reachEnd.emit();
  }

  /** How close to the end counts as "the end". A length, so it is stable. */
  protected reachEndOffset(): number {
    const raw = getComputedStyle(this.self.nativeElement).getPropertyValue(
      '--rv-select-popup-reach-end-offset',
    );
    const parsed = Number.parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : 48;
  }

  private showAndPosition(): void {
    const root = this.self.nativeElement.querySelector(
      '.rv-select-popup-panel',
    ) as HTMLElement | null;
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
      // The JS positioning path is used where CSS anchor placement is not
      // enabled. Keep the select popup trigger-sized in that path as well.
      root.style.width = `${trigger.width}px`;
      root.style.minWidth = '0';
      const at = computeSelectPopupPosition(
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
    const root: HTMLElement | null = this.self.nativeElement.querySelector('.rv-select-popup-panel');
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
   * Mouse pick of a concrete item. Called by {@link SelectPopupItem}.
   * Disabled/unknown ids are ignored via `activate` (returns false).
   */
  pickItem(id: string): void {
    if (!this.controller().activate(id)) return;
    this.doClose(false);
    this.picked.emit({ id });
  }

  /** Mouse hover tracks keyboard focus. Called by {@link SelectPopupItem}. */
  hoverItem(id: string): void {
    this.controller().activate(id);
  }

  private doClose(restoreFocus: boolean): void {
    const was = this.controller().open();
    // APG: the typeahead buffer is per-open. Keeping it across a close made
    // the next open start mid-word (measured: `due` + `d` matched nothing).
    this.resetTypeahead();
    this.controller().closePopup();
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
    const root: HTMLElement | null = this.self.nativeElement.querySelector('.rv-select-popup-panel');
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
    const root: HTMLElement | null = this.self.nativeElement.querySelector('.rv-select-popup-panel');
    if (!root) return;
    const target = id
      ? root.querySelector<HTMLElement>(`[data-rv-id="${CSS.escape(id)}"]`)
      : root.querySelector<HTMLElement>('[rvselectpopupitem]');
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
    const wrap = this.self.nativeElement.querySelector(
      '.rv-select-popup-trigger',
    ) as HTMLElement | null;
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
        if (el.closest('.rv-select-popup-panel')) return false;
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
