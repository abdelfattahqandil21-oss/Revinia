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
      if (at === -1) return [...list, { ...option }];
      return list.map((o, index) => (index === at ? { ...o, ...option } : o));
    });
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
   * Multi-mode toggle. Returns false for unknown/disabled ids;
   * otherwise adds (or removes) the id and returns true.
   */
  toggle(id: string): boolean {
    if (!pickable(this._options(), id)) return false;
    this.values.update((list) =>
      list.includes(id) ? list.filter((v) => v !== id) : [...list, id],
    );
    return true;
  }

  /** Clear the value (single) or all values (multi). */
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
    this._options.set(list.map((o) => ({ ...o })));
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
    .replace(/[\u0300-\u036f]/g, '');
}
