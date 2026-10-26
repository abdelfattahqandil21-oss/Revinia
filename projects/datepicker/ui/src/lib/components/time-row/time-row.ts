import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import type {
  RiviniaDatepickerLabels,
  RiviniaHour12,
  RiviniaTime,
} from '@rivinia/datepicker';
import {
  addMinutes,
  addSeconds,
  dayPeriodsOf,
  displayHour,
  formatTime,
  formatTimeUnit,
  formatUnitValue,
  to24Hour,
  uses12HourClock,
} from '@rivinia/datepicker';

type TimeUnit = 'hour' | 'minute' | 'second';

interface TimeOption {
  /** The value the option writes: a display hour (1–12 or 0–23), minute or second. */
  readonly value: number;
  readonly label: string;
  readonly ariaLabel: string;
  /**
   * `label` + the spoken form. WCAG 2.5.3 (Label in Name) requires the visible
   * text to be part of the accessible name, and the visible row is `03` while
   * the spoken value is `3 PM` or `5 minutes` — neither contains `03`.
   */
  readonly accessibleLabel: string;
  readonly selected: boolean;
}

let nextTimeRowId = 0;

/**
 * The time row that lives INSIDE the date panel.
 *
 * It is a row, not a second step: the calendar stays mounted above it, so the
 * selected day and the visible month are never lost. The controls are
 * spinbuttons per the W3C APG pattern — Arrow Up/Down, Page Up/Down, Home/End,
 * direct typing and a visible day-period toggle — because a clock dial has no
 * keyboard or screen-reader equivalent and 60-option lists are unusable at
 * 12:59.
 *
 * The row owns no date and no timezone: it edits a `RiviniaTime` and emits the
 * new value. The picker above it owns the draft, the zone and the commit.
 */
@Component({
  selector: 'rv-time-row',
  templateUrl: './time-row.html',
  styleUrl: './time-row.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiviniaTimeRowComponent {
  readonly value = input.required<RiviniaTime>();
  readonly locale = input.required<string>();
  readonly labels = input.required<RiviniaDatepickerLabels>();
  readonly hour12 = input<RiviniaHour12>('auto');
  readonly showSeconds = input(false);
  readonly minuteStep = input(1);
  readonly disabled = input(false);

  readonly valueChange = output<RiviniaTime>();
  readonly commit = output<void>();
  readonly now = output<void>();

  /**
   * The pointer-friendly tray is optional and starts closed. Typing and the
   * spinbutton keys remain the primary path: the tray is a shortcut, not a
   * second mode, and it edits the same draft.
   */
  protected readonly optionsOpen = signal(false);
  protected readonly optionsId = `rv-time-options-${++nextTimeRowId}`;

  private readonly toggleRef = viewChild<ElementRef<HTMLButtonElement>>('timeToggle');
  private readonly optionsRef = viewChild<ElementRef<HTMLElement>>('timeOptions');
  /** Focus the selected option once, after the tray exists. */
  private focusOptionsAfterRender = false;

  protected readonly effectiveHour12 = computed(() => {
    const configured = this.hour12();
    return configured === 'auto' ? uses12HourClock(this.locale()) : configured;
  });

  protected readonly effectiveMinuteStep = computed(() => {
    const step = Math.trunc(this.minuteStep());
    return Number.isFinite(step) && step > 0 ? step : 1;
  });

  protected readonly displayHourValue = computed(() =>
    displayHour(this.value().hour, this.effectiveHour12()),
  );

  protected readonly hourText = computed(() =>
    formatTimeUnit(this.locale(), this.displayHourValue(), 2),
  );
  protected readonly minuteText = computed(() =>
    formatTimeUnit(this.locale(), this.value().minute, 2),
  );
  protected readonly secondText = computed(() =>
    formatTimeUnit(this.locale(), this.value().second, 2),
  );

  protected readonly periods = computed(() => dayPeriodsOf(this.locale()));
  protected readonly meridiem = computed(() => (this.value().hour < 12 ? 'am' : 'pm'));

  protected readonly hourOptions = computed<readonly TimeOption[]>(() => {
    const locale = this.locale();
    const hour12 = this.effectiveHour12();
    const selected = displayHour(this.value().hour, hour12);
    const values = hour12
      ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      : Array.from({ length: 24 }, (_, hour) => hour);
    return values.map((display) => {
      const hour24 = hour12 ? to24Hour(display, this.meridiem() === 'pm') : display;
      const label = formatTimeUnit(locale, display, 2);
      const ariaLabel = formatTime(
        locale,
        { hour: hour24, minute: 0, second: 0 },
        hour12 ? 'h a' : 'H',
      );
      return {
        value: display,
        label,
        ariaLabel,
        accessibleLabel: `${label}, ${ariaLabel}`,
        selected: display === selected,
      };
    });
  });

  protected readonly minuteOptions = computed<readonly TimeOption[]>(() =>
    this.unitOptions('minute', this.value().minute, this.effectiveMinuteStep()),
  );
  protected readonly secondOptions = computed<readonly TimeOption[]>(() =>
    this.unitOptions('second', this.value().second, this.effectiveMinuteStep()),
  );

  protected readonly hourAriaValueText = computed(() =>
    formatTime(
      this.locale(),
      { hour: this.value().hour, minute: 0, second: 0 },
      this.effectiveHour12() ? 'h a' : 'H',
    ),
  );
  protected readonly minuteAriaValueText = computed(() =>
    formatUnitValue(this.locale(), this.value().minute, 'minute'),
  );
  protected readonly secondAriaValueText = computed(() =>
    formatUnitValue(this.locale(), this.value().second, 'second'),
  );

  constructor() {
    // Focus the selected option once, after the tray has been rendered. An
    // effect that runs on every render would steal focus from the inputs.
    afterRenderEffect(() => {
      this.optionsOpen();
      if (!this.focusOptionsAfterRender) return;
      this.focusOptionsAfterRender = false;
      const root = this.optionsRef()?.nativeElement;
      const selected = root?.querySelector<HTMLElement>(
        '[role="option"][aria-selected="true"]',
      );
      const first = root?.querySelector<HTMLElement>('[role="option"]');
      (selected ?? first)?.focus();
    });

    // Every column opens on its own selected value, not just the focused one:
    // a 15:30 draft must not show the hour at 15 and the minutes still at 00.
    afterRenderEffect(() => {
      this.optionsOpen();
      this.value();
      this.effectiveHour12();
      if (!this.optionsOpen()) return;
      this.scrollSelectedOptions();
    });

    // A click anywhere outside the tray (or its toggle) closes the tray; the
    // panel itself owns the outside click that closes the whole panel.
    effect((onCleanup) => {
      if (!this.optionsOpen() || typeof document === 'undefined') return;
      const onPointerDown = (event: Event): void => {
        const target = event.target as Node | null;
        if (!target) return;
        const tray = this.optionsRef()?.nativeElement;
        const toggle = this.toggleRef()?.nativeElement;
        if (tray?.contains(target) || toggle?.contains(target)) return;
        this.optionsOpen.set(false);
      };
      document.addEventListener('pointerdown', onPointerDown, true);
      onCleanup(() => document.removeEventListener('pointerdown', onPointerDown, true));
    });
  }

  // ── Pointer-friendly time tray ───────────────────────────────────────────

  protected toggleOptions(): void {
    if (this.disabled()) return;
    if (this.optionsOpen()) {
      this.closeOptions(true);
      return;
    }
    this.focusOptionsAfterRender = true;
    this.optionsOpen.set(true);
  }

  protected closeOptions(focusToggle = true): void {
    if (!this.optionsOpen()) return;
    this.optionsOpen.set(false);
    if (focusToggle) this.toggleRef()?.nativeElement.focus();
  }

  protected chooseHour(display: number): void {
    const next = this.withUnit('hour', display);
    if (sameTime(next, this.value())) return;
    this.valueChange.emit(next);
  }

  protected chooseUnit(unit: 'minute' | 'second', value: number): void {
    const next = this.withUnit(unit, value);
    if (sameTime(next, this.value())) return;
    this.valueChange.emit(next);
  }

  protected onRowKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Escape' || !this.optionsOpen()) return;
    event.preventDefault();
    event.stopPropagation();
    this.closeOptions(true);
  }

  protected onListKeydown(unit: 'hour' | 'minute' | 'second', event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.closeOptions(true);
      return;
    }
    if (event.key === 'Tab') return;

    const list = event.currentTarget as HTMLElement;
    const options = [
      ...list.querySelectorAll<HTMLButtonElement>('[role="option"]'),
    ];
    if (!options.length) return;

    const current = options.indexOf(document.activeElement as HTMLButtonElement);
    const selected = options.findIndex(
      (option) => option.getAttribute('aria-selected') === 'true',
    );
    let next = current >= 0 ? current : selected >= 0 ? selected : 0;

    switch (event.key) {
      case 'ArrowDown':
        next = Math.min(options.length - 1, next + 1);
        break;
      case 'ArrowUp':
        next = Math.max(0, next - 1);
        break;
      case 'PageDown':
        next = Math.min(options.length - 1, next + 5);
        break;
      case 'PageUp':
        next = Math.max(0, next - 5);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = options.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    options[next]?.focus();
  }

  protected onOptionsFocusOut(event: FocusEvent): void {
    const related = event.relatedTarget as Node | null;
    const tray = this.optionsRef()?.nativeElement;
    const toggle = this.toggleRef()?.nativeElement;
    if (related && (tray?.contains(related) || related === toggle)) return;
    this.optionsOpen.set(false);
  }

  protected onToggleFocusOut(event: FocusEvent): void {
    if (!this.optionsOpen()) return;
    const related = event.relatedTarget as Node | null;
    if (related && this.optionsRef()?.nativeElement.contains(related)) return;
    this.optionsOpen.set(false);
  }

  private scrollSelectedOptions(): void {
    const root = this.optionsRef()?.nativeElement;
    if (!root) return;
    for (const list of root.querySelectorAll<HTMLElement>('[role="listbox"]')) {
      const selected = list.querySelector<HTMLElement>(
        '[role="option"][aria-selected="true"]',
      );
      if (!selected) continue;
      const target =
        selected.offsetTop - (list.clientHeight - selected.offsetHeight) / 2;
      list.scrollTop = Math.max(
        0,
        Math.min(target, list.scrollHeight - list.clientHeight),
      );
    }
  }

  protected onUnitInput(unit: TimeUnit, event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = normalizeDigits(input.value).replace(/\D/g, '');
    if (!digits) return;

    const clipped = digits.length > 2 ? digits.slice(-2) : digits;
    const numeric = Number(clipped);
    if (!Number.isFinite(numeric)) return;

    const next = this.withUnit(unit, numeric);
    input.value = this.unitText(unit, next);
    if (sameTime(next, this.value())) return;
    this.valueChange.emit(next);
  }

  protected onUnitBlur(unit: TimeUnit, event: Event): void {
    const input = event.target as HTMLInputElement;
    input.value = this.unitText(unit, this.value());
  }

  protected onUnitFocus(event: Event): void {
    (event.target as HTMLInputElement).select();
  }

  protected onUnitKeydown(unit: TimeUnit, event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.commit.emit();
      return;
    }

    let next: RiviniaTime | null = null;
    switch (event.key) {
      case 'ArrowUp':
        next = this.step(unit, 1, false);
        break;
      case 'ArrowDown':
        next = this.step(unit, -1, false);
        break;
      case 'PageUp':
        next = this.step(unit, 1, true);
        break;
      case 'PageDown':
        next = this.step(unit, -1, true);
        break;
      case 'Home':
        next = unit === 'hour' ? { ...this.value(), hour: 0 } : this.withUnit(unit, 0);
        break;
      case 'End':
        next = unit === 'hour' ? { ...this.value(), hour: 23 } : this.withUnit(unit, 59);
        break;
      default:
        return;
    }

    event.preventDefault();
    if (next && !sameTime(next, this.value())) this.valueChange.emit(next);
  }

  protected setMeridiem(period: 'am' | 'pm'): void {
    const next = to24Hour(this.displayHourValue(), period === 'pm');
    if (next === this.value().hour) return;
    this.valueChange.emit({ ...this.value(), hour: next });
  }

  protected selectAll(event: Event): void {
    (event.target as HTMLInputElement).select();
  }

  private step(unit: TimeUnit, direction: 1 | -1, page: boolean): RiviniaTime {
    const value = this.value();
    if (unit === 'hour') {
      const hour = clamp(value.hour + direction, 0, 23);
      return { ...value, hour };
    }
    const amount = (page ? this.effectiveMinuteStep() : 1) * direction;
    return unit === 'minute' ? addMinutes(value, amount) : addSeconds(value, amount);
  }

  private unitOptions(
    unit: 'minute' | 'second',
    selected: number,
    step: number,
  ): readonly TimeOption[] {
    const values = new Set<number>();
    for (let value = 0; value < 60; value += step) values.add(value);
    // A typed value can be off the step grid (59 with a 5-minute step); it
    // must still be visible and selected in the tray.
    values.add(selected);
    return [...values]
      .sort((a, b) => a - b)
      .map((value) => {
        const label = formatTimeUnit(this.locale(), value, 2);
        const ariaLabel = formatUnitValue(this.locale(), value, unit);
        return {
          value,
          label,
          ariaLabel,
          accessibleLabel: `${label}, ${ariaLabel}`,
          selected: value === selected,
        };
      });
  }

  private withUnit(unit: TimeUnit, numeric: number): RiviniaTime {
    const value = this.value();
    if (unit === 'hour') {
      if (this.effectiveHour12()) {
        const display = clamp(numeric, 1, 12);
        return { ...value, hour: to24Hour(display, this.meridiem() === 'pm') };
      }
      return { ...value, hour: clamp(numeric, 0, 23) };
    }
    if (unit === 'minute') return { ...value, minute: clamp(numeric, 0, 59) };
    return { ...value, second: clamp(numeric, 0, 59) };
  }

  private unitText(unit: TimeUnit, value: RiviniaTime): string {
    if (unit === 'hour') {
      return formatTimeUnit(
        this.locale(),
        displayHour(value.hour, this.effectiveHour12()),
        2,
      );
    }
    return formatTimeUnit(
      this.locale(),
      unit === 'minute' ? value.minute : value.second,
      2,
    );
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function sameTime(a: RiviniaTime, b: RiviniaTime): boolean {
  return a.hour === b.hour && a.minute === b.minute && a.second === b.second;
}

/** Arabic-Indic and Extended Arabic-Indic digits → ASCII, for typed input. */
function normalizeDigits(value: string): string {
  return value
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}
