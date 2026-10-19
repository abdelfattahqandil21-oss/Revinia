import { computed, signal } from '@angular/core';
import type {
  RiviniaSelectController,
  RiviniaSelectMode,
  RiviniaSelectOption,
} from './select-types';

/**
 * Headless per-select controller. Owns the option registry, the search query
 * and the value — no DOM, no styling. Filtering is label-contains, case- and
 * accent-insensitive. Instantiate one per select (`new RiviniaSelect('multi')`);
 * navigation/open state stays in the composed {@link RiviniaMenu} inside
 * `@rivinia/select/ui` (or your own UI).
 */
export class RiviniaSelect implements RiviniaSelectController {
  /** Selection mode, fixed at construction. */
  readonly mode: RiviniaSelectMode;

  private readonly _options = signal<readonly RiviniaSelectOption[]>([]);
  /** Registered options, in registration order. */
  readonly options = this._options.asReadonly();

  /** Raw search text; `filtered` derives from it. */
  readonly query = signal('');

  /** Options matching the query (disabled ones stay visible, unpickable). */
  readonly filtered = computed(() => {
    const q = normalize(this.query());
    if (!q) return this._options();
    return this._options().filter((o) => normalize(o.label).includes(q));
  });

  /** Single-mode value (`null` = nothing picked). */
  readonly value = signal<string | null>(null);
  /** Multi-mode values, in pick order. */
  readonly values = signal<readonly string[]>([]);

  /** Labels of the current selection, for trigger display. */
  readonly selectedLabels = computed(() => {
    const byId = new Map(this._options().map((o) => [o.id, o.label]));
    if (this.mode === 'single') {
      const v = this.value();
      return v === null ? [] : [byId.get(v) ?? v];
    }
    return this.values().map((id) => byId.get(id) ?? id);
  });

  constructor(mode: RiviniaSelectMode = 'single') {
    this.mode = mode;
  }

  /** Register an option (idempotent by id — re-register updates it). */
  registerOption(option: RiviniaSelectOption): void {
    this._options.update((list) => {
      const at = list.findIndex((o) => o.id === option.id);
      if (at === -1) return [...list, RiviniaSelect.freeze(option)];
      return list.map((o, index) => (index === at ? RiviniaSelect.freeze({ ...o, ...option }) : o));
    });
  }

  /**
   * A frozen copy of an option.
   *
   * The registry is the controller's own state, and an option that can be
   * mutated after registration would make the filtered list and the selection
   * disagree. `readonly` in the type is a compile-time promise only; freezing
   * keeps it at runtime too.
   */
  private static freeze(option: RiviniaSelectOption): RiviniaSelectOption {
    return Object.freeze({ ...option });
  }

  /**
   * Force a value, bypassing the unknown/disabled guards of {@link select}.
   *
   * This is the write a form restore needs: a stored id is authoritative even
   * when its option has not loaded yet (or is currently disabled). The
   * controller keeps it, `selectedLabels` renders the raw id, and the label
   * replaces it the moment the option is registered — instead of `select`
   * silently refusing and leaving the trigger on the placeholder while the
   * form still held the value.
   */
  setValue(id: string | null): void {
    this.value.set(id);
  }

  /**
   * Force the values, the array counterpart of {@link setValue}. Same
   * contract: ids are stored as given, in the given order, whether or not they
   * resolve to an option yet.
   */
  setValues(ids: readonly string[]): void {
    this.values.set([...ids]);
  }

  /** Remove an option; also drops it from the value(s). */
  unregisterOption(id: string): void {
    this._options.update((list) => list.filter((o) => o.id !== id));
    if (this.value() === id) this.value.set(null);
    this.values.update((list) => list.filter((v) => v !== id));
  }

  setQuery(query: string): void {
    this.query.set(query);
  }

  clearQuery(): void {
    this.query.set('');
  }

  /**
   * Single-mode pick. Returns false (and keeps the old value) for
   * unknown/disabled ids.
   */
  select(id: string): boolean {
    if (!pickable(this._options(), id)) return false;
    this.value.set(id);
    return true;
  }

  /**
   * Multi-mode toggle. Returns false for unknown/disabled ids **and for any
   * single-mode controller** — toggling has no meaning there, and letting it
   * through would write to `values` while `isSelected` reads `value`, leaving
   * the two signals disagreeing. Single mode uses {@link select} instead.
   */
  toggle(id: string): boolean {
    if (this.mode !== 'multi') return false;
    if (!pickable(this._options(), id)) return false;
    this.values.update((list) =>
      list.includes(id) ? list.filter((v) => v !== id) : [...list, id],
    );
    return true;
  }

  /**
   * Clear the value (single) or all values (multi).
   *
   * Headless and therefore silent: there is no callback, because this is not a
   * component. `rv-select` wraps it in a `clear()` method that also emits
   * `selectionChange`. If you drive the controller yourself, watch `value()` /
   * `values()` to react to a clear you initiate.
   */
  clear(): void {
    this.value.set(null);
    this.values.set([]);
  }

  /**
   * Replace the registry with exactly `list`; drops values whose ids
   * disappeared. Used by `@rivinia/select/ui` to mirror its `options` input.
   */
  syncOptions(list: readonly RiviniaSelectOption[]): void {
    const ids = new Set(list.map((o) => o.id));
    this._options.set(list.map((o) => RiviniaSelect.freeze(o)));
    const current = this.value();
    if (current !== null && !ids.has(current)) this.value.set(null);
    this.values.update((vals) => vals.filter((v) => ids.has(v)));
  }

  /** True when the id is currently selected (either mode). */
  isSelected(id: string): boolean {
    return this.mode === 'single' ? this.value() === id : this.values().includes(id);
  }
}

function pickable(options: readonly RiviniaSelectOption[], id: string): boolean {
  const found = options.find((o) => o.id === id);
  return !!found && !found.disabled;
}

function normalize(text: string): string {
  return text
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u064b-\u065f\u0670]/g, '')
    .replace(/\u0640/g, '')
    .replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627');
}
