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
  untracked,
  viewChild,
} from '@angular/core';
import type { FormValueControl } from '@angular/forms/signals';
import {
  DATE_PICKER_CONFIG,
  DEFAULT_DATE_FORMAT,
  DEFAULT_TIME_FORMAT,
  RiviniaCalendar,
  formatDateTime,
  formatTime,
  formatTimeZoneName,
  isSameDateTime,
  isValidDateTime,
  isValidTimeZone,
  nowDateTime,
  nowInTimeZone,
  parseDate,
  parseDateTime,
  resolveWallTime,
  todayDate,
  todayInTimeZone,
} from '@rivinia/datepicker';
import type {
  RiviniaDate,
  RiviniaDateFormat,
  RiviniaDateTime,
  RiviniaDateTimeResolution,
  RiviniaDatepickerConfig,
  RiviniaDatepickerLabels,
  RiviniaDatepickerTheme,
  RiviniaHour12,
  RiviniaTime,
  RiviniaTimeFormat,
  RiviniaTimeZoneAlternative,
  RiviniaTimeZoneResolution,
  RiviniaWeekday,
} from '@rivinia/datepicker';
import { RiviniaCalendarComponent } from '../calendar/calendar';
import { RiviniaTimeRowComponent } from '../time-row/time-row';
import { DatepickerPanelRegistry } from '../../services/datepicker-panel-registry';
import {
  PANEL_EXIT_FALLBACK_MS,
  panelExitMotionEnabled,
  panelViewportShift,
} from '../../utils/panel-motion';

let nextId = 0;

/**
 * `<rv-datetimepicker>` — the date panel with a time row inside it.
 *
 * The panel is the same one `rv-datepicker` uses: the calendar is never
 * unmounted while the time row is used, so the visible month, the focused day
 * and the selected date survive editing the time. The time is a DRAFT until
 * OK; Escape or an outside click discards it (a time alone is incomplete).
 *
 * The value is civil on purpose: `{ date, time }` and no zone. The `resolved`
 * output carries the instant the chosen zone gives that wall time, including
 * the user's choice when the clock falls back. That keeps the package usable
 * for a form (civil) and for an API (instant) without storing two shapes.
 */
@Component({
  selector: 'rv-datetimepicker',
  imports: [RiviniaCalendarComponent, RiviniaTimeRowComponent],
  templateUrl: './datetimepicker.html',
  styleUrls: ['../datepicker/datepicker.css', './datetimepicker.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [RiviniaCalendar],
  host: {
    class: 'rv-datetimepicker',
    '[attr.data-open]': 'open() ? "true" : null',
    '[attr.data-disabled]': 'isDisabled() ? "true" : null',
    '[attr.data-theme]': 'effectiveTheme()',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class RiviniaDatetimepickerComponent implements FormValueControl<RiviniaDateTime | null> {
  private readonly config = inject<RiviniaDatepickerConfig>(DATE_PICKER_CONFIG);
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly panels = inject(DatepickerPanelRegistry);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly calendar = inject(RiviniaCalendar);

  readonly value = model<RiviniaDateTime | null>(null);

  readonly locale = input<string | undefined>(undefined);
  readonly format = input<RiviniaDateFormat | undefined>(undefined);
  readonly timeFormat = input<RiviniaTimeFormat | undefined>(undefined);
  readonly showSeconds = input<boolean | undefined>(undefined);
  readonly minuteStep = input<number | undefined>(undefined);
  readonly hour12 = input<RiviniaHour12 | undefined>(undefined);
  readonly timeZone = input<string | undefined>(undefined);
  readonly firstDay = input<RiviniaWeekday | undefined>(undefined);
  /** Lower bound of the value. The time half is kept for type parity; the grid uses its date. */
  readonly min = input<RiviniaDateTime | undefined>(undefined);
  /** Upper bound of the value. The time half is kept for type parity; the grid uses its date. */
  readonly max = input<RiviniaDateTime | undefined>(undefined);
  readonly labels = input<Partial<RiviniaDatepickerLabels>>({});
  readonly disabled = input(false);
  readonly placeholder = input<string | undefined>(undefined);
  readonly label = input<string | undefined>(undefined);
  readonly theme = input<RiviniaDatepickerTheme | undefined>(undefined);
  readonly clearable = input<boolean | undefined>(undefined);

  readonly touch = output<void>();
  /** Emitted on commit when a zone is configured: the civil value + its instant. */
  readonly resolved = output<RiviniaDateTimeResolution>();

  protected readonly open = signal(false);
  /** The panel stays in the DOM for the short exit animation, then leaves. */
  protected readonly closing = signal(false);
  /** Viewport clamp for a short screen; see `panelViewportShift()`. */
  protected readonly panelShift = signal(0);
  protected readonly isDisabled = computed(() => this.disabled());

  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  protected readonly draft = signal<RiviniaDateTime>(
    parseDateTime(this.value()) ?? nowDateTime(),
  );
  protected readonly selectedOffset = signal<number | null>(null);

  private readonly uid = ++nextId;
  protected readonly panelId = `rv-datetimepicker-panel-${this.uid}`;
  protected readonly headingId = `rv-datetimepicker-heading-${this.uid}`;

  private readonly triggerRef = viewChild<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panelRef = viewChild<ElementRef<HTMLElement>>('panel');

  protected readonly normalized = computed(() => parseDateTime(this.value()));

  protected readonly effectiveLocale = computed(
    () => this.locale() ?? this.config.locale ?? 'en-US',
  );
  protected readonly effectiveDateFormat = computed(
    () => this.format() ?? this.config.format ?? DEFAULT_DATE_FORMAT,
  );
  protected readonly effectiveTimeFormat = computed(
    () => this.timeFormat() ?? this.config.timeFormat ?? DEFAULT_TIME_FORMAT,
  );
  protected readonly effectiveShowSeconds = computed(
    () => this.showSeconds() ?? this.config.showSeconds ?? false,
  );
  protected readonly effectiveMinuteStep = computed(() => {
    const value = Math.trunc(this.minuteStep() ?? this.config.minuteStep ?? 1);
    return Number.isFinite(value) && value > 0 ? value : 1;
  });
  protected readonly effectiveHour12 = computed<RiviniaHour12>(
    () => this.hour12() ?? this.config.hour12 ?? 'auto',
  );
  private readonly hour12Option = computed<boolean | undefined>(() => {
    const value = this.effectiveHour12();
    return value === 'auto' ? undefined : value;
  });

  protected readonly effectiveTheme = computed<RiviniaDatepickerTheme>(
    () => this.theme() ?? this.config.theme ?? 'auto',
  );

  protected readonly rawTimeZone = computed<string | null>(
    () => this.timeZone() ?? this.config.timeZone ?? null,
  );
  protected readonly effectiveTimeZone = computed<string | undefined>(() => {
    const zone = this.rawTimeZone();
    return zone && isValidTimeZone(zone) ? zone : undefined;
  });
  protected readonly invalidTimeZone = computed<string | null>(() => {
    const zone = this.rawTimeZone();
    return zone && !isValidTimeZone(zone) ? zone : null;
  });

  /** The rule the picker shows: compatible (overlap earlier, gap later). */
  protected readonly zoneResolution = computed<RiviniaTimeZoneResolution | null>(() => {
    const zone = this.effectiveTimeZone();
    return zone ? resolveWallTime(this.draft(), zone, 'compatible') : null;
  });

  /** The user's chosen offset wins for an overlap; everything else is the base. */
  protected readonly effectiveResolution = computed<RiviniaTimeZoneResolution | null>(() => {
    const base = this.zoneResolution();
    if (!base || base.kind !== 'ambiguous') return base;
    const chosen = base.alternatives.find(
      (alternative) => alternative.offsetMinutes === this.selectedOffset(),
    );
    if (!chosen) return base;
    return {
      ...base,
      instant: chosen.instant,
      offsetMinutes: chosen.offsetMinutes,
      dateTime: base.requested,
    };
  });

  protected readonly gapResolution = computed(() => {
    const resolution = this.zoneResolution();
    return resolution?.kind === 'nonexistent' ? resolution : null;
  });
  protected readonly overlapResolution = computed(() => {
    const resolution = this.zoneResolution();
    return resolution?.kind === 'ambiguous' ? resolution : null;
  });

  protected readonly zoneName = computed(() => {
    const zone = this.effectiveTimeZone();
    const resolution = this.effectiveResolution();
    if (!zone || !resolution) return '';
    const name = formatTimeZoneName(
      this.effectiveLocale(),
      zone,
      resolution.instant,
      'short',
    );
    const offset = formatTimeZoneName(
      this.effectiveLocale(),
      zone,
      resolution.instant,
      'shortOffset',
    );
    return name && offset && name !== offset ? `${name} · ${offset}` : name || offset;
  });

  protected readonly canClear = computed(
    () =>
      (this.clearable() ?? this.config.clearable ?? false) &&
      this.normalized() !== null &&
      !this.isDisabled(),
  );

  protected readonly triggerText = computed(() => {
    const value = this.normalized();
    if (!value) return this.placeholder() ?? this.calendar.labels().chooseDateTime;
    const text = formatDateTime(
      this.effectiveLocale(),
      value,
      this.effectiveDateFormat(),
      this.effectiveTimeFormat(),
      { hour12: this.hour12Option() },
    );
    const zone = this.effectiveTimeZone();
    if (!zone) return text;
    const resolution = resolveWallTime(value, zone);
    const offset = resolution
      ? formatTimeZoneName(this.effectiveLocale(), zone, resolution.instant, 'shortOffset')
      : '';
    return offset ? `${text} · ${offset}` : text;
  });

  protected readonly triggerLabel = computed(() => {
    const choose = this.calendar.labels().chooseDateTime;
    const field = this.label();
    const value = this.normalized();
    if (field) return `${field}: ${value ? this.triggerText() : choose}`;
    return value ? `${choose}: ${this.triggerText()}` : choose;
  });

  protected readonly clearLabel = computed(() => {
    const clear = this.calendar.labels().clearDateTime;
    const field = this.label();
    return field ? `${field}: ${clear}` : clear;
  });

  protected readonly gapText = computed(() => {
    const gap = this.gapResolution();
    if (!gap) return '';
    return formatDateTime(
      this.effectiveLocale(),
      gap.dateTime,
      this.effectiveDateFormat(),
      this.effectiveTimeFormat(),
      { hour12: this.hour12Option() },
    );
  });

  protected readonly suggestedLabel = computed(() => {
    const gap = this.gapResolution();
    if (!gap) return '';
    const time = formatTime(
      this.effectiveLocale(),
      gap.dateTime.time,
      this.effectiveTimeFormat(),
      { hour12: this.hour12Option() },
    );
    return `${this.calendar.labels().useSuggestedTime} ${time}`;
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.panels.release(this);
      this.clearCloseTimer();
    });

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
      if (min === undefined && max === undefined) return;
      this.calendar.setBounds(min?.date ?? null, max?.date ?? null);
    });

    effect(() => this.calendar.setLabels(this.labels()));

    // The wall date's "today" follows the configured zone, unless the
    // application pinned a today for SSR determinism.
    effect(() => {
      const configured = parseDate(this.config.today);
      if (configured) return;
      const zone = this.effectiveTimeZone();
      this.calendar.setToday(zone ? todayInTimeZone(zone) : todayDate());
    });

    // A form write updates the draft and the grid; a draft edit does not feed
    // back into itself because `draft` is read untracked here.
    effect(() => {
      const value = this.normalized();
      if (!value) {
        this.calendar.setSelected(null);
        return;
      }
      this.calendar.setSelected(value.date);
      untracked(() => {
        if (!isSameDateTime(value, this.draft())) this.draft.set(value);
      });
    });

    // Any change to the wall time or zone invalidates a previous overlap
    // choice; the new resolution must be chosen (or defaulted) again.
    effect(() => {
      this.draft();
      this.effectiveTimeZone();
      untracked(() => this.selectedOffset.set(null));
    });

    afterRenderEffect(() => {
      const panel = this.panelRef()?.nativeElement;
      this.open();
      if (this.open() && panel) this.applyPopover(panel);
    });

    // A short viewport can leave the panel's bottom past the edge. CSS cannot
    // express "clamp", so the deficit is measured here and applied with
    // `translate`; ResizeObserver keeps it right when the panel grows (a DST
    // warning, a wrapped action row).
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
    // A day updates the DRAFT only. The calendar stays mounted; the time row
    // keeps its value; nothing is committed until OK.
    this.draft.update((value) => ({ date: { ...date }, time: { ...value.time } }));
  }

  protected onTimeChanged(time: RiviniaTime): void {
    this.draft.update((value) => ({ date: { ...value.date }, time: { ...time } }));
  }

  protected onNow(): void {
    const zone = this.effectiveTimeZone();
    const now = zone ? nowInTimeZone(zone) : nowDateTime();
    this.draft.set(now);
    this.calendar.setSelected(now.date);
  }

  protected useSuggested(): void {
    const gap = this.gapResolution();
    if (!gap) return;
    this.draft.set({
      date: { ...gap.dateTime.date },
      time: { ...gap.dateTime.time },
    });
    this.calendar.setSelected(gap.dateTime.date);
  }

  protected chooseOffset(offsetMinutes: number): void {
    this.selectedOffset.set(offsetMinutes);
  }

  protected isChosenOffset(alternative: RiviniaTimeZoneAlternative): boolean {
    return this.effectiveResolution()?.instant === alternative.instant;
  }

  protected offsetLabel(alternative: RiviniaTimeZoneAlternative): string {
    const zone = this.effectiveTimeZone();
    if (!zone) return '';
    const locale = this.effectiveLocale();
    const name = formatTimeZoneName(locale, zone, alternative.instant, 'short');
    const offset = formatTimeZoneName(locale, zone, alternative.instant, 'shortOffset');
    return name && offset && name !== offset ? `${name} ${offset}` : name || offset;
  }

  protected commit(): void {
    if (this.isDisabled()) return;
    const draft = this.draft();
    if (!isValidDateTime(draft)) return;
    const value: RiviniaDateTime = {
      date: { ...draft.date },
      time: { ...draft.time },
    };
    this.value.set(value);

    const zone = this.effectiveTimeZone();
    const resolution = this.effectiveResolution();
    if (zone && resolution) {
      this.resolved.emit({ value, timeZone: zone, resolution });
    }
    this.closePanel(true);
  }

  protected clearDateTime(): void {
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

  closeForAnotherPanel(): void {
    // One panel at a time wins over the exit animation.
    this.closePanel(false, true);
  }

  protected onPanelClick(event: MouseEvent): void {
    event.preventDefault();
  }

  protected onPanelKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    this.dismiss();
  }

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
    const value = this.normalized();
    const zone = this.effectiveTimeZone();
    const fallback = zone ? nowInTimeZone(zone) : nowDateTime();
    this.draft.set(value ?? fallback);
    const configuredToday = parseDate(this.config.today);
    this.calendar.setToday(
      configuredToday ?? (zone ? todayInTimeZone(zone) : todayDate()),
    );

    if (value) {
      this.calendar.setSelected(value.date);
    } else {
      this.calendar.setSelected(null);
      this.calendar.goToToday();
    }

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
    this.touch.emit();
    if (restoreFocus) this.triggerRef()?.nativeElement.focus();
    this.startExit(immediate);
  }

  private startExit(immediate: boolean): void {
    this.clearCloseTimer();
    if (immediate || !panelExitMotionEnabled()) {
      this.finishClose();
      return;
    }
    this.closing.set(true);
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
    if (typeof api.showPopover !== 'function') return;
    if (!panel.hasAttribute('popover')) panel.setAttribute('popover', 'manual');
    try {
      if (!panel.matches(':popover-open')) api.showPopover();
    } catch {
      // A layer hint must never break picking a date.
    }
  }
}
