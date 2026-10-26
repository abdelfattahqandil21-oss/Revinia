import type {
  RiviniaCalendarView,
  RiviniaDate,
  RiviniaTextDirection,
  RiviniaWeekday,
} from './date-types';

/** One rendered day. `null` in a grid means "belongs to another month". */
export interface RiviniaCalendarCell {
  readonly date: RiviniaDate;
  readonly today: boolean;
  readonly selected: boolean;
  /** The roving-tabindex target. */
  readonly focused: boolean;
  readonly disabled: boolean;
}

/** Always seven cells; padding cells are `null`. */
export interface RiviniaCalendarWeek {
  readonly cells: readonly (RiviniaCalendarCell | null)[];
}

/** Always six weeks, so the panel never changes height between months. */
export interface RiviniaCalendarMonth {
  readonly year: number;
  readonly month: number;
  readonly weeks: readonly RiviniaCalendarWeek[];
}

export interface RiviniaWeekdayName {
  readonly weekday: RiviniaWeekday;
  /** Four letters and up — `EEEE`. */
  readonly long: string;
  /** Abbreviated — `EEE`. */
  readonly short: string;
  /** Single character — `EEEEE`. */
  readonly narrow: string;
}

export interface RiviniaWeekInfo {
  readonly firstDay: RiviniaWeekday;
  readonly weekend: readonly RiviniaWeekday[];
  readonly minimalDays?: number;
}

/** One button of the month view. */
export interface RiviniaCalendarMonthOption {
  readonly month: number;
  readonly label: string;
  readonly current: boolean;
  readonly disabled: boolean;
}

/** One button of the year view. */
export interface RiviniaCalendarYearOption {
  readonly year: number;
  readonly label: string;
  readonly current: boolean;
  readonly disabled: boolean;
}

/**
 * What a key press means, independent of the current view. The view decides
 * how far a "page" or a "row" is; the keymap only decides the intent.
 */
export type RiviniaCalendarAction =
  | 'move-previous'
  | 'move-next'
  | 'move-row-up'
  | 'move-row-down'
  | 'move-row-start'
  | 'move-row-end'
  | 'page-back'
  | 'page-forward'
  | 'page-back-year'
  | 'page-forward-year'
  | 'select'
  | 'close';

export interface RiviniaCalendarKeyInput {
  readonly key: string;
  readonly shiftKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly altKey?: boolean;
  readonly metaKey?: boolean;
  /** Defaults to `'ltr'`. */
  readonly direction?: RiviniaTextDirection;
}

/**
 * What `applyAction` did:
 * - `moved`  — the focus moved (or a month/year was chosen and the view changed);
 * - `commit` — a day was chosen; the caller should close and publish the value;
 * - `cancel` — the caller should close without publishing;
 * - `null`   — nothing happened (an action the view cannot perform).
 */
export type RiviniaCalendarResult = 'moved' | 'commit' | 'cancel' | null;

export interface RiviniaBuildMonthInput {
  readonly year: number;
  readonly month: number;
  readonly firstDay: RiviniaWeekday;
  readonly today?: RiviniaDate | null;
  readonly selected?: RiviniaDate | null;
  readonly focused?: RiviniaDate | null;
  readonly isDisabled?: (date: RiviniaDate) => boolean;
}

/** The reason `applyAction` was called; useful for logs and for tests. */
export type { RiviniaCalendarView };
