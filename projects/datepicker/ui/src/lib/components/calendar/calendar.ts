import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import {
  formatDayNumber,
  formatFullDate,
  resolveCalendarKey,
  toIso,
} from '@rivinia/datepicker';
import type {
  RiviniaCalendar,
  RiviniaCalendarCell,
  RiviniaCalendarMonthOption,
  RiviniaCalendarView,
  RiviniaCalendarYearOption,
  RiviniaDate,
  RiviniaTextDirection,
  RiviniaWeekdayName,
} from '@rivinia/datepicker';

let nextId = 0;

/**
 * The rendered calendar: a `table[role=grid]` for the day view and a 3 × 4
 * button grid for the month and year views.
 *
 * It owns NO state. The `RiviniaCalendar` service is passed in, which is what
 * lets the same rendering work inside `rv-datepicker` and inside a consumer's
 * own popover. (Input composition, same rule as the modal host — D29.)
 *
 * Accessibility decisions worth stating:
 *  - the day cell itself is the `gridcell` and the tab stop, so the roving
 *    tabindex is real and the number does not hide behind a nested button;
 *  - a disabled day uses `aria-disabled`, never the `disabled` attribute: it
 *    must stay focusable, as the APG date-picker grid requires;
 *  - one, and only one, cell has `tabindex="0"`.
 */
@Component({
  selector: 'rv-calendar',
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RiviniaCalendarComponent {
  readonly calendar = input.required<RiviniaCalendar>();
  /** Shared with the dialog that hosts the calendar (`aria-labelledby`). */
  readonly headingId = input<string | undefined>(undefined);
  /** Focus the active cell on first render (the datepicker opens this way). */
  readonly autofocus = input(false);

  readonly picked = output<RiviniaDate>();
  readonly dismissed = output<void>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly uid = ++nextId;
  private pendingFocus = false;
  private autofocused = false;
  private previousView: RiviniaCalendarView | null = null;

  protected readonly instructionsId = `rv-calendar-instructions-${this.uid}`;
  protected readonly resolvedHeadingId = computed(
    () => this.headingId() ?? `rv-calendar-heading-${this.uid}`,
  );

  protected readonly view = computed(() => this.calendar().view());
  protected readonly labels = computed(() => this.calendar().labels());
  protected readonly weekdays = computed(() => this.calendar().weekdays());
  protected readonly grid = computed(() => this.calendar().monthGrid());
  protected readonly months = computed(() => this.calendar().months());
  protected readonly years = computed(() => this.calendar().years());
  protected readonly heading = computed(() => this.calendar().heading());
  protected readonly focusedMonth = computed(() => this.calendar().focused().month);
  protected readonly focusedYear = computed(() => this.calendar().focused().year);

  constructor() {
    afterRenderEffect(() => {
      const view = this.calendar().view();
      // Touch the focus signal so a move re-runs this effect.
      this.calendar().focused();

      const viewChanged = this.previousView !== null && this.previousView !== view;
      this.previousView = view;

      if (this.autofocus() && !this.autofocused) {
        this.autofocused = true;
        this.focusActiveCell();
        return;
      }
      if (this.pendingFocus || viewChanged) {
        this.pendingFocus = false;
        this.focusActiveCell();
      }
    });
  }

  /** Focus the cell that carries `tabindex="0"` in the current view. */
  focusActiveCell(): void {
    const root = this.host.nativeElement;
    const calendar = this.calendar();
    const view = calendar.view();
    const focused = calendar.focused();

    const selector =
      view === 'day'
        ? `td[role="gridcell"][data-date="${toIso(focused)}"]`
        : view === 'month'
          ? `[data-month="${focused.month}"]`
          : `[data-year="${focused.year}"]`;

    root.querySelector<HTMLElement>(selector)?.focus();
  }

  protected iso(date: RiviniaDate): string {
    return toIso(date);
  }

  protected dayNumber(cell: RiviniaCalendarCell): string {
    return formatDayNumber(this.calendar().locale(), cell.date);
  }

  protected dayLabel(cell: RiviniaCalendarCell): string {
    return formatFullDate(this.calendar().locale(), cell.date);
  }

  protected weekdayAbbr(day: RiviniaWeekdayName): string {
    return day.long;
  }

  protected trackWeekday(_: number, day: RiviniaWeekdayName): number {
    return day.weekday;
  }

  protected trackCell(index: number, cell: RiviniaCalendarCell | null): string {
    return cell ? toIso(cell.date) : `blank-${index}`;
  }

  protected onKeydown(event: KeyboardEvent): void {
    const action = resolveCalendarKey({
      key: event.key,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      direction: this.direction(),
    });
    if (!action) return;

    event.preventDefault();
    const result = this.calendar().applyAction(action);
    if (result === 'commit') {
      this.picked.emit(this.calendar().focused());
    } else if (result === 'cancel') {
      this.dismissed.emit();
    } else if (result === 'moved') {
      this.pendingFocus = true;
    }
  }

  protected pick(cell: RiviniaCalendarCell): void {
    if (cell.disabled) {
      // Focus is allowed on a disabled day; selection is not.
      this.calendar().focus(cell.date);
      this.pendingFocus = true;
      return;
    }
    this.calendar().focus(cell.date);
    const result = this.calendar().applyAction('select');
    if (result === 'commit') {
      this.picked.emit(cell.date);
    }
  }

  protected chooseMonth(option: RiviniaCalendarMonthOption): void {
    if (this.calendar().chooseMonth(option.month)) {
      this.pendingFocus = true;
    }
  }

  protected chooseYear(option: RiviniaCalendarYearOption): void {
    if (this.calendar().chooseYear(option.year)) {
      this.pendingFocus = true;
    }
  }

  protected openBiggerView(): void {
    const view = this.calendar().view();
    if (view === 'day') {
      this.calendar().setView('month');
      this.pendingFocus = true;
    } else if (view === 'month') {
      this.calendar().setView('year');
      this.pendingFocus = true;
    }
  }

  protected page(direction: -1 | 1): void {
    this.calendar().applyAction(direction === -1 ? 'page-back' : 'page-forward');
    this.pendingFocus = true;
  }

  protected navLabel(): string {
    const labels = this.labels();
    return this.calendar().view() === 'day' ? '' : labels.previousYear;
  }

  private direction(): RiviniaTextDirection {
    if (typeof document === 'undefined') return 'ltr';
    const root = this.host.nativeElement;

    // `<html dir="rtl">` (or any ancestor) is the normal way to set the
    // direction, and it is authoritative. Checking it explicitly also keeps
    // the behaviour observable in jsdom, which does not inherit the computed
    // `direction` property.
    const declared = root.closest('[dir]')?.getAttribute('dir')?.toLowerCase();
    if (declared === 'rtl' || declared === 'ltr') return declared;

    if (typeof getComputedStyle === 'undefined') return 'ltr';
    return getComputedStyle(root).direction === 'rtl' ? 'rtl' : 'ltr';
  }
}
