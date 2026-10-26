import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import {
  DEFAULT_DATE_FORMAT,
  RiviniaCalendar,
  formatDate,
  isSameDay,
  parseDate,
} from '@rivinia/datepicker';
import type {
  RiviniaDateFormat,
  RiviniaDate,
  RiviniaDatepickerConfig,
  RiviniaDatepickerLabels,
  RiviniaDatepickerTheme,
  RiviniaWeekday,
} from '@rivinia/datepicker';
import { DATE_PICKER_CONFIG } from '@rivinia/datepicker';
import { RiviniaCalendarComponent } from '../calendar/calendar';
import { DatepickerPanelRegistry } from '../../services/datepicker-panel-registry';
import {
  PANEL_EXIT_FALLBACK_MS,
  panelExitMotionEnabled,
  panelViewportShift,
} from '../../utils/panel-motion';

let nextId = 0;

/**
 * `<rv-datepicker>` — a button that opens a calendar panel.
 *
 * Deliberate choices:
 *  - the panel is NON-modal: a date picker is a popover, not a dialog that
 *    blocks the page. It does not trap focus, it closes on Escape or an
 *    outside click, and it returns focus to the trigger as the APG dialog
 *    pattern requires for keyboard users;
 *  - the value is a `RiviniaDate` (or `null`), never a `Date` and never a
 *    formatted string, so a form or a payload can rely on it;
 *  - the value is a `model()`, i.e. the documented Angular 22
 *    `FormValueControl` contract (the same one `@rivinia/select` follows), so
 *    Signal Forms, Reactive Forms and `ngModel` all bind it with no custom
 *    accessor;
 *  - the calendar service is provided AT THIS COMPONENT, so two pickers on the
 *    same page never share a focused day.
 */
@Component({
  selector: 'rv-datepicker',
  imports: [RiviniaCalendarComponent],
  templateUrl: './datepicker.html',
  styleUrl: './datepicker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RiviniaCalendar],
  host: {
    class: 'rv-datepicker',
    '[attr.data-open]': 'open() ? "true" : null',
    '[attr.data-disabled]': 'isDisabled() ? "true" : null',
    '[attr.data-theme]': 'effectiveTheme()',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class RiviniaDatepickerComponent implements FormValueControl<RiviniaDate | null> {
  private readonly config = inject<RiviniaDatepickerConfig>(DATE_PICKER_CONFIG);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly panels = inject(DatepickerPanelRegistry);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly calendar = inject(RiviniaCalendar);

  /**
   * The value. It starts at `provideRiviniaDatepicker({ selected })` and a
   * binding (or a form) takes over from there. Programmatic writes do not
   * echo through `valueChange`; only `set()` does.
   */
  readonly value = model<RiviniaDate | null>(parseDate(this.config.selected));

  readonly locale = input<string | undefined>(undefined);
  /** A style keyword (`short|medium|long|full`) or a date-only pattern. */
  readonly format = input<RiviniaDateFormat | undefined>(undefined);
  readonly firstDay = input<RiviniaWeekday | undefined>(undefined);
  /** Lower bound. Unbound (`undefined`) keeps the configuration's bound. */
  readonly min = input<RiviniaDate | undefined>(undefined);
  /** Upper bound. Unbound (`undefined`) keeps the configuration's bound. */
  readonly max = input<RiviniaDate | undefined>(undefined);
  readonly labels = input<Partial<RiviniaDatepickerLabels>>({});
  /** Disabled state, bound by a form or by the consumer. */
  readonly disabled = input(false);
  /** Overrides the trigger text when there is no value. */
  readonly placeholder = input<string | undefined>(undefined);
  /**
   * The field's label ("Departure"), used for the trigger's accessible name.
   * A visual `<label>` around the picker is NOT advised: a click anywhere in a
   * label is forwarded to its control, which would re-open the panel right
   * after a pick. The panel cancels that forwarding (see `onPanelClick`) and
   * this input gives screen readers the field name the visual label carries.
   */
  readonly label = input<string | undefined>(undefined);
  /**
   * The colour scheme of this picker. `auto` inherits the page's
   * `color-scheme`; `light` / `dark` pin it. Your `--rv-*` tokens still win.
   */
  readonly theme = input<RiviniaDatepickerTheme | undefined>(undefined);
  /**
   * Shows a clear (×) button when the picker holds a value. Opt-in: a date that
   * a form requires should not look optional. Defaults to the configuration's
   * value, then `false`.
   */
  readonly clearable = input<boolean | undefined>(undefined);

  /**
   * `FormValueControl` touched protocol: the user has finished interacting
   * with the control. Emitted when the panel closes (a pick, Escape or an
   * outside click) and when focus leaves the whole host.
   */
  readonly touch = output<void>();

  protected readonly open = signal(false);
  /** The panel stays in the DOM for the short exit animation, then leaves. */
  protected readonly closing = signal(false);
  /** Viewport clamp for a short screen; see `panelViewportShift()`. */
  protected readonly panelShift = signal(0);
  protected readonly isDisabled = computed(() => this.disabled());

  private closeTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly uid = ++nextId;
  protected readonly panelId = `rv-datepicker-panel-${this.uid}`;
  protected readonly headingId = `rv-datepicker-heading-${this.uid}`;

  private readonly triggerRef = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');
  private readonly calendarComponent = viewChild(RiviniaCalendarComponent);
  private focusGridAfterValueChange = false;

  /**
   * The value as a date. A form may write an ISO string at runtime (a payload,
   * a query parameter), so the public model is normalized for display, for the
   * grid and for comparisons without changing what the form holds.
   */
  protected readonly normalized = computed(() => parseDate(this.value()));

  protected readonly effectiveLocale = computed(
    () => this.locale() ?? this.config.locale ?? 'en-US',
  );
  protected readonly effectiveFormat = computed(
    () => this.format() ?? this.config.format ?? DEFAULT_DATE_FORMAT,
  );
  protected readonly effectiveTheme = computed<RiviniaDatepickerTheme>(
    () => this.theme() ?? this.config.theme ?? 'auto',
  );
  /** The clear button exists only when it can actually do something. */
  protected readonly canClear = computed(
    () =>
      (this.clearable() ?? this.config.clearable ?? false) &&
      this.normalized() !== null &&
      !this.isDisabled(),
  );

  protected readonly triggerText = computed(() => {
    const value = this.normalized();
    if (!value) {
      return this.placeholder() ?? this.calendar.labels().chooseDate;
    }
    return formatDate(this.effectiveLocale(), value, this.effectiveFormat());
  });

  protected readonly triggerLabel = computed(() => {
    const choose = this.calendar.labels().chooseDate;
    const field = this.label();
    const value = this.normalized();
    if (field) return `${field}: ${value ? this.triggerText() : choose}`;
    return value ? `${choose}: ${this.triggerText()}` : choose;
  });

  /** "Departure: Clear date" — the field name stays attached to the action. */
  protected readonly clearLabel = computed(() => {
    const clear = this.calendar.labels().clearDate;
    const field = this.label();
    return field ? `${field}: ${clear}` : clear;
  });

  constructor() {
    // A picker removed from the DOM while open must not stay the registry's
    // "active" picker: the next one would try to close a dead component.
    this.destroyRef.onDestroy(() => {
      this.panels.release(this);
      this.clearCloseTimer();
    });

    // Locale-derived behaviour (week start, weekday names, digits) follows the
    // input without a rebuild. Only a DEFINED input wins, so the config value
    // is never wiped by an unbound input.
    effect(() => {
      const locale = this.locale();
      if (locale) this.calendar.setLocale(locale);
    });

    effect(() => {
      const firstDay = this.firstDay();
      if (firstDay !== undefined) this.calendar.setFirstDay(firstDay);
    });

    effect(() => {
      const min = this.min();
      const max = this.max();
      // Both unbound → keep whatever the configuration provided.
      if (min === undefined && max === undefined) return;
      this.calendar.setBounds(min ?? null, max ?? null);
    });

    effect(() => this.calendar.setLabels(this.labels()));

    // Value → calendar (a form write brings the grid to that month).
    effect(() => {
      const value = this.normalized();
      if (isSameDay(value, this.calendar.selected())) return;

      // Capture whether the user's focus is inside the panel BEFORE the grid
      // re-renders: afterwards the old cell is gone and focus has fallen to
      // `<body>`, so the question can no longer be answered.
      const panel = this.panelRef()?.nativeElement;
      this.focusGridAfterValueChange =
        typeof document !== 'undefined' &&
        !!panel &&
        panel.contains(document.activeElement as Node | null);

      this.calendar.setSelected(value);
    });

    afterRenderEffect(() => {
      this.normalized();
      if (!this.focusGridAfterValueChange) return;
      this.focusGridAfterValueChange = false;
      this.calendarComponent()?.focusActiveCell();
    });

    // The native top layer where it exists; a plain absolute panel elsewhere.
    afterRenderEffect(() => {
      const panel = this.panelRef()?.nativeElement;
      this.open();
      if (this.open() && panel) this.applyPopover(panel);
    });

    // A short viewport can leave the panel's bottom past the edge. CSS cannot
    // express "clamp", so the deficit is measured here and applied with
    // `translate`; ResizeObserver keeps it right when the panel grows (a
    // warning line, a wrapped action row).
    afterRenderEffect((onCleanup) => {
      const panel = this.panelRef()?.nativeElement;
      this.open();
      if (!this.open() || !panel) {
        this.panelShift.set(0);
        return;
      }
      const update = (): void => {
        this.panelShift.set(
          panelViewportShift(panel, this.triggerRef()?.nativeElement),
        );
      };
      update();
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(update);
      observer.observe(panel);
      const onResize = (): void => update();
      window.addEventListener('resize', onResize);
      onCleanup(() => {
        observer.disconnect();
        window.removeEventListener('resize', onResize);
      });
    });

    // Outside pointerdown closes WITHOUT stealing focus back: the user chose
    // where to click (same rule as the menu, D36).
    effect((onCleanup) => {
      if (!this.open() || typeof document === 'undefined') return;
      const onPointerDown = (event: Event): void => {
        const target = event.target as Node | null;
        if (target && this.hostRef.nativeElement.contains(target)) return;
        this.closePanel(false);
      };
      document.addEventListener('pointerdown', onPointerDown, true);
      onCleanup(() => document.removeEventListener('pointerdown', onPointerDown, true));
    });
  }

  /** `FormUiControl.focus()`: Signal Forms can ask the control to take focus. */
  focus(options?: FocusOptions): void {
    this.triggerRef()?.nativeElement.focus(options);
  }

  // ── Template actions ───────────────────────────────────────────────────────

  protected toggle(): void {
    if (this.isDisabled()) return;
    if (this.open()) this.closePanel(true);
    else this.openPanel();
  }

  protected onPicked(date: RiviniaDate): void {
    // Setting the model is what notifies the form AND a `[(value)]` parent:
    // `valueChange` belongs to the model. It emits only when the value really
    // changes, so re-picking the same day is silent.
    this.value.set(date);
    this.closePanel(true);
  }

  /**
   * Clears the value. Focus returns to the trigger because the button that was
   * clicked disappears with the value, and an open panel has nothing left to
   * show. `touch` fires because clearing is a finished interaction.
   */
  protected clearDate(): void {
    if (!this.canClear()) return;
    const wasOpen = this.open();
    this.value.set(null);
    if (wasOpen) this.closePanel(false);
    else this.touch.emit();
    this.triggerRef()?.nativeElement.focus();
  }

  protected dismiss(): void {
    this.closePanel(true);
  }

  /**
   * The panel registry calls this when ANOTHER picker opens, so two panels are
   * never open at once (measured: keyboard activation used to leave both open).
   * Restoring focus here would steal it from the picker the user just opened.
   */
  closeForAnotherPanel(): void {
    // No exit animation when another picker takes over: one panel at a time
    // is a stronger contract than a pretty cross-fade.
    this.closePanel(false, true);
  }

  /**
   * A consumer may still wrap the picker in a `<label>` — common for form
   * fields. A click anywhere in a label is forwarded by the browser to the
   * label's control (here: the trigger button), which would re-open the panel
   * immediately after a pick. Measured in Chrome. Cancelling the default
   * action stops that forwarding; our own click handlers have already run and
   * focus (a mousedown behaviour) is unaffected.
   */
  protected onPanelClick(event: MouseEvent): void {
    event.preventDefault();
  }

  /** Touch when focus leaves the whole control (trigger + panel). */
  protected onFocusOut(event: FocusEvent): void {
    const related = event.relatedTarget as Node | null;
    if (!related || !this.hostRef.nativeElement.contains(related)) {
      this.touch.emit();
    }
  }

  private openPanel(): void {
    // Reopening during the exit animation cancels the exit and reuses the
    // panel that is still in the DOM.
    this.finishClose();
    // Claim BEFORE opening: the previously open picker closes while this one
    // mounts, and never pulls focus back to itself.
    this.panels.claim(this);
    this.open.set(true);
  }

  private closePanel(restoreFocus: boolean, immediate = false): void {
    this.panels.release(this);
    if (!this.open()) {
      if (immediate) this.finishClose();
      return;
    }
    this.open.set(false);
    // A closed picker is a finished interaction. Focus usually stays on the
    // trigger (which is inside the host), so a focusout would never fire.
    this.touch.emit();
    if (restoreFocus) {
      // Focus the trigger before the panel unmounts, so focus never falls to
      // `<body>` for a frame (or forever, if nothing else is focusable).
      this.triggerRef()?.nativeElement.focus();
    }
    this.startExit(immediate);
  }

  private startExit(immediate: boolean): void {
    this.clearCloseTimer();
    if (immediate || !panelExitMotionEnabled()) {
      this.finishClose();
      return;
    }
    this.closing.set(true);
    // `animationend` normally finishes this; the timer is the safety net for
    // a consumer stylesheet that removes the animation.
    this.closeTimer = setTimeout(
      () => this.finishClose(),
      PANEL_EXIT_FALLBACK_MS,
    );
  }

  /** The panel's exit animation ended; remove the panel now. */
  protected onPanelAnimationEnd(event: AnimationEvent): void {
    if (!this.closing()) return;
    if (event.target !== this.panelRef()?.nativeElement) return;
    // Angular scopes CSS animation names (`_ngcontent-…_rv-datepicker-exit`).
    if (!event.animationName.endsWith('rv-datepicker-exit')) return;
    this.finishClose();
  }

  private finishClose(): void {
    this.clearCloseTimer();
    this.closing.set(false);
  }

  private clearCloseTimer(): void {
    if (this.closeTimer === null) return;
    clearTimeout(this.closeTimer);
    this.closeTimer = null;
  }

  private applyPopover(panel: HTMLElement): void {
    const api = panel as HTMLElement & {
      showPopover?: () => void;
      hidePopover?: () => void;
    };
    // jsdom and pre-popover browsers: the absolute fallback is already fine.
    if (typeof api.showPopover !== 'function') return;
    if (!panel.hasAttribute('popover')) {
      panel.setAttribute('popover', 'manual');
    }
    try {
      if (!panel.matches(':popover-open')) api.showPopover();
    } catch {
      // A layer hint must never break picking a date.
    }
  }
}
