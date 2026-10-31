import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  APP_ID,
  Component,
  DestroyRef,
  ElementRef,
  Service,
  ViewEncapsulation,
  afterNextRender,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  model,
  output,
  signal,
  TemplateRef,
  untracked,
} from '@angular/core';
import { FormValueControl } from '@angular/forms/signals';
import { SelectPopupControllerImpl } from '../../services/select-popup';
import type {
  RiviniaSelectVariant,
  SelectPopupUiPlacement,
} from '../../models/select-popup.ui-types';
import { SelectPopupComponent, SelectPopupItem } from '../popup/select-popup';
import { RiviniaSelect } from '@rivinia/select';
import type { RiviniaSelectController, RiviniaSelectMode, RiviniaSelectOption } from '@rivinia/select';
import { formatSelectionList, resolveListLocale } from '../../utils/selection-summary';

/** Payload of RiviniaSelectComponent.selectionChange. Single: id (or null after clear). Multi: ids. */
export type SelectChange = string | readonly string[] | null;

/**
 * Combines Angular's application ID with an application-local counter. Angular
 * requires distinct APP_ID values when multiple application roots share a page.
 */
@Service()
class SelectLabelIdGenerator {
  private readonly appId = inject(APP_ID);
  private next = 0;

  allocate(): string {
    this.next += 1;
    return `rv-select-${this.appId}-label-${this.next}`;
  }
}

/**
 * Ready-made select built on rv-select-popup. Single mode picks one value and closes;
 * multi mode toggles with a check mark and stays open. Options come from the
 * `options` input (labels double as the search index); rich per-option custom
 * content stays the job of raw rv-select-popup.
 *
 * ```html
 * <rv-select [options]="invoices" [searchable]="true" placeholder="Status…" (selectionChange)="apply($event)" />
 * <rv-select [select]="tags" [options]="tagOptions" />
 * ```
 *
 * Search: typing filters (accent- and case-insensitive), Tab moves focus into
 * the list, Enter picks the top match. SSR renders the closed trigger.
 *
 * Semantics: the panel is exposed as `role="menu"` with `menuitem` options,
 * because focus physically moves into the option list. It is therefore a
 * filterable menu, NOT an ARIA combobox and not a native `<select>` — see
 * README -> Accessibility for the measured behaviour and the limitations a
 * future combobox mode would have to remove.
 */
@Component({
  selector: 'rv-select',
  imports: [NgTemplateOutlet, SelectPopupComponent, SelectPopupItem],
  // Same projection rule as rv-select-popup: option buttons belong to this template,
  // every rule below stays under .rv-select-* / rv-select.
  encapsulation: ViewEncapsulation.None,
  templateUrl: './select-panel.html',
  styleUrl: './select-panel.css',
  host: {
    '[attr.data-variant]': 'variant()',
  },
})
export class RiviniaSelectComponent implements FormValueControl<SelectChange> {
  /**
   * External controller (injected, shared or a test double). Omitted: the
   * component owns one matching `mode()`. When bound, the controller's own
   * `mode` wins and the `mode` input is ignored.
   */
  readonly select = input<RiviniaSelectController | null>(null);
  /**
   * Mode of the controller this component owns: 'single' closes on pick,
   * 'multi' toggles and stays open. Ignored when `select` is bound — an
   * external controller is authoritative for its own mode. @default 'single'
   */
  readonly mode = input<RiviniaSelectMode>('single');
  /**
   * Appearance skin. `simple` is the original look; `premium` adds the lifted
   * trigger, the longer origin-aware open, the styled scrollbar and the loading
   * skeleton. Reflected as `data-variant` on this host and passed to the panel,
   * so one flag skins both surfaces.
   * @default 'simple'
   */
  readonly variant = input<RiviniaSelectVariant>('simple');
  /** Option data; labels double as the search index. */
  readonly options = input<readonly RiviniaSelectOption[]>([]);
  /** Show the filter box. @default false */
  readonly searchable = input(false, {
    transform: (v: boolean | string) => v === '' || v === true,
  });
  /** Trigger text with no selection. @default 'Select…' */
  readonly placeholder = input('Select…');
  /**
   * Visible caption rendered above the trigger, and the trigger's accessible
   * name via `aria-labelledby`. Use it to tell users what the field IS; the
   * trigger's own text is the summary — one value, or the first pick plus `+N`
   * in multi mode.
   */
  readonly label = input<string | null>(null);
  /**
   * Explicit accessible name for the trigger, used when there is no visible
   * caption. Ignored when `label` is set (a visible caption is the better
   * name). Named `ariaLabel`, mirroring the vendored popup's `popupLabel`, so it
   * cannot be confused with an option's `label`.
   */
  readonly ariaLabel = input<string | null>(null);
  /**
   * Accessible name for the opened panel (`aria-label` on the listbox-shaped
   * menu). Defaults to the visible caption when one is set.
   */
  readonly popupLabel = input<string | null>(null);
  /** Accessible name for the filter box. @default 'Search options' */
  readonly searchLabel = input('Search options');
  /**
   * Custom markup for each option row.
   *
   * The default row is a label, an optional hint and a check mark. When a
   * consumer needs an icon, an avatar, a badge or a group header, they
   * supply a template and it replaces the default row entirely.
   *
   * The context is the option, typed loosely on purpose: a consumer's own
   * option shape (with an `icon`, say) is not the library's type, and the
   * template is theirs to narrow.
   *
   * ```html
   * <ng-template #row let-option>
   *   <img class="size-4" [src]="option.icon" alt="" />
   *   <span>{{ option.label }}</span>
   * </ng-template>
   *
   * <rv-select [options]="options" [optionTemplate]="row" />
   * ```
   */
  readonly optionTemplate = input<TemplateRef<unknown> | null>(null);

  /**
   * Replaces the whole option list.
   *
   * `optionTemplate` replaces a ROW's content; this replaces the LIST. It is
   * the escape hatch for a virtualised list: the consumer renders only the
   * visible rows and positions them.
   *
   * ```html
   * <ng-template #list let-options>
   *   <div [style.height.px]="virtualizer.getTotalSize()" style="position: relative">
   *     @for (row of virtualizer.getVirtualItems(); track row.index) {
   *       <div [style.transform]="'translateY(' + row.start + 'px)'">…</div>
   *     }
   *   </div>
   * </ng-template>
   *
   * <rv-select [options]="options" [listTemplate]="list" (panelReady)="panel = $event" />
   * ```
   *
   * The consumer owns the scroll container then, so `reachEnd` is theirs to
   * detect (the virtualizer's own last-row check is the usual way).
   */
  readonly listTemplate = input<TemplateRef<unknown> | null>(null);

  /**
   * A request for more rows is in flight.
   *
   * Renders a loader row under the list, so the panel shows the state instead
   * of looking finished.
   */
  readonly loading = input(false);

  /** Text of the loader row. @default 'Loading…' */
  readonly loadingLabel = input('Loading…');

  /**
   * The panel scrolled close to its end.
   *
   * The offset is a LENGTH (`--rv-select-popup-reach-end-offset`), not a
   * percentage: the panel's scrollable height changes as rows arrive, so a
   * percentage would fire at a different row each time.
   */
  readonly reachEnd = output<void>();

  /**
   * The panel element, once it exists.
   *
   * A virtualised list needs the panel as its scroll element.
   */
  readonly panelReady = output<HTMLElement>();
  /** Filter box hint. @default 'Search…' */
  readonly searchPlaceholder = input('Search…');
  /** Shown when the filter matches nothing. @default 'No results' */
  readonly emptyLabel = input('No results');
  /** Panel placement relative to the trigger. @default 'bottom-start' */
  readonly placement = input<SelectPopupUiPlacement>('bottom-start');

  /** Current selection. Single: id (or null). Multi: ids in pick order. */
  readonly selectionChange = output<SelectChange>();
  readonly opened = output<void>();
  readonly closed = output<void>();

  // ── FormValueControl contract (Angular 22 Signal Forms) ──
  // The `value` model is the form-bound signal. Angular's Field directive
  // (or formControlName via interop) keeps it in sync with the form model.
  // All properties below are optional — implement only what we need.
  /** Form-bound value. Single: id or null. Multi: ids in pick order. */
  readonly value = model<SelectChange>(null);
  /** Disabled state from the form system. Prevents opening and interaction. */
  readonly disabled = input<boolean>(false);
  /** Touched state from the form system (read-only, set by Angular). */
  readonly touched = input<boolean>(false);
  /** Emit when focus leaves the whole Select interaction (trigger + panel). */
  readonly touch = output<void>();
  /** Validation errors from the form system. */
  readonly errors = input<readonly { kind: string; message?: string }[]>([]);
  /** Whether the field is in an invalid state. */
  readonly invalid = input<boolean>(false);

  private readonly ownedSingle = new RiviniaSelect('single');
  private readonly ownedMulti = new RiviniaSelect('multi');
  /** Inner navigation controller driving the rv-select-popup panel. */
  protected readonly popup = new SelectPopupControllerImpl();
  private readonly self = inject(ElementRef<HTMLElement>);
  private readonly labelIdGenerator = inject(SelectLabelIdGenerator);
  /** Set on trigger-open; consumed after render to land focus in search. */
  private readonly justOpened = signal(false);
  /** Id of the rendered caption element, referenced by the trigger. */
  protected readonly labelId = this.labelIdGenerator.allocate();
  /** Id of the hidden description element, referenced by the trigger. */
  protected readonly selectionId = this.labelIdGenerator.allocate();
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  /** Page locale for the description; reseeded when `<html lang>` changes. */
  private readonly pageLang = signal(resolveListLocale(this.document));

  /**
   * Accessible name for the opened panel: an explicit `popupLabel`, else the
   * visible caption, else none. Without any of these the panel is unnamed.
   */
  protected panelLabel(): string | null {
    return this.popupLabel() ?? this.label();
  }

  /**
   * Clear the current selection and announce it through `selectionChange`
   * (`null` in single mode, `[]` in multi) — the same payload shape `picked`
   * emits, so one consumer handler covers picking and clearing.
   */
  clear(): void {
    const c = this.controller();
    c.clear();
    // FormValueControl: update the model signal so the form sees the clear.
    this.value.set(c.mode === 'multi' ? c.values() : c.value());
    this.selectionChange.emit(c.mode === 'multi' ? c.values() : c.value());
  }

  /** Effective controller: external input or the owned one matching mode. */
  protected controller(): RiviniaSelectController {
    return this.select() ?? (this.mode() === 'multi' ? this.ownedMulti : this.ownedSingle);
  }

  /**
   * Trigger text: the placeholder, the single value, or the first pick in
   * multi mode. Pick order is the controller's contract, so this needs no
   * sorting or registry lookup.
   */
  protected readonly visibleValue = computed(() => {
    const labels = this.controller().selectedLabels();
    return labels.length > 0 ? labels[0] : this.placeholder();
  });

  /** Selected values beyond the one shown; always 0 in single mode. */
  protected readonly overflowCount = computed(() => {
    const c = this.controller();
    if (c.mode !== 'multi') return 0;
    const count = c.selectedLabels().length;
    return count > 1 ? count - 1 : 0;
  });

  /**
   * The full selection for assistive technology.
   *
   * A caption or `ariaLabel` already names the field, so the description
   * completes it with every label. Without either, the visible text IS the
   * name, so only the labels not already spoken belong here. No caption and a
   * single pick means the name says everything — no description at all.
   */
  protected readonly selectionDescription = computed(() => {
    const c = this.controller();
    if (c.mode !== 'multi') return null;
    const labels = c.selectedLabels();
    if (labels.length === 0) return null;
    const named = this.label() !== null || this.ariaLabel() !== null;
    const described = named ? labels : labels.slice(1);
    if (described.length === 0) return null;
    return formatSelectionList(described, this.pageLang());
  });

  constructor() {
    // Mirror the options input into the controller registry (stale ids drop,
    // dangling values prune — same rule as unregisterOption).
    effect(() => {
      this.controller().syncOptions(this.options());
    });
    // Typing re-aims keyboard focus at the top match, so Enter just works.
    // Untracked: only a QUERY change resets the active row. Letting this
    // depend on the registry made every row registration re-run it, and the
    // reopen's requested value was overwritten by the first row.
    effect(() => {
      this.controller().query();
      untracked(() => this.popup.activateFirst());
    });

    // ── FormValueControl sync: form value → controller ──
    // When the form writes a value (external change or initial binding),
    // sync it into the controller. Guard: only act when the value actually
    // differs, to avoid feedback loops and redundant writes.
    effect(() => {
      const v = this.value();
      const c = this.controller();
      if (c.mode === 'single') {
        if (typeof v === 'string' && v !== c.value()) {
          c.select(v);
        } else if (v === null && c.value() !== null) {
          c.clear();
        }
      } else {
        // Multi: sync the id array.
        const current = c.values();
        const incoming = Array.isArray(v) ? v : [];
        if (incoming.length !== current.length || incoming.some((id, i) => id !== current[i])) {
          c.clear();
          for (const id of incoming) c.toggle(id);
        }
      }
    });
    // Searchable open lands focus in the filter box. The inner menu already
    // focused the first item in its own hook, so this runs in a microtask —
    // deterministically after every render hook — and only on the opening
    // transition, never while navigating or typing.
    //
    // NOTE: this is deliberately NOT the ARIA combobox pattern, where focus
    // stays in the text input and the active option is pointed at with
    // aria-activedescendant. Here focus physically moves into the option
    // list (see onSearchKey -> Tab -> focusItem), so the exposed semantics are
    // menu/menuitem. See README -> Accessibility for the full rationale.
    afterRenderEffect(() => {
      if (!this.justOpened() || !this.popup.open() || !this.searchable()) return;
      this.justOpened.set(false);
      const search = this.self.nativeElement.querySelector(
        '.rv-select-search',
      ) as HTMLElement | null;
      if (!search) return;
      queueMicrotask(() => {
        try {
          search.focus({ preventScroll: true });
        } catch {
          // Focus is best-effort.
        }
      });
    });

    // A language switch changes the description format without a reload. The
    // observer is created after the first render, so SSR never builds one.
    afterNextRender(() => this.watchPageLanguage());
  }

  /**
   * Re-resolve the page locale whenever `<html lang>` changes.
   *
   * Exactly one observer per instance: created once after the first browser
   * render, its callback only writes the signal. It is never recreated, and it
   * is disconnected once, on destroy.
   */
  private watchPageLanguage(): void {
    const root = this.document.documentElement;
    if (!root || typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(() => {
      this.pageLang.set(resolveListLocale(this.document));
    });
    observer.observe(root, { attributes: true, attributeFilter: ['lang'] });
    this.destroyRef.onDestroy(() => observer.disconnect());
  }

  protected onOpened(): void {
    // FormValueControl: a disabled control must not open.
    if (this.disabled()) {
      this.popup.closePopup();
      return;
    }
    this.justOpened.set(true);
    /*
     * Reopening lands on the CURRENT selection, not on the first row.
     *
     * `openMenu('first')` activates the first enabled option, which is right
     * for an empty select and wrong for a filled one: arrowing from the top
     * every time makes a long list unusable, and the user has to walk past
     * everything to reach the value they already chose.
     *
     * Multi mode already had this right — it never closes on a pick, so the
     * active row stayed where it was (see `onPick`).
     */
    const c = this.controller();
    if (c.mode === 'single') {
      const selected = c.value();
      if (selected !== null) this.popup.activate(selected);
    }
    this.opened.emit();
  }

  protected onClosed(): void {
    // A stale filter on reopen hides options confusingly — reset it.
    this.controller().clearQuery();
    this.closed.emit();
  }

  /**
   * FormValueControl touched contract: emit `touch` when focus leaves the
   * whole Select interaction (trigger + panel). Internal focus transitions
   * (trigger → search → items) do NOT emit — only leaving the host element.
   */
  protected onFocusOut(event: FocusEvent): void {
    const host = this.self.nativeElement;
    const related = event.relatedTarget as Node | null;
    if (!related || !host.contains(related)) {
      this.touch.emit();
    }
  }

  protected onPick(id: string): void {
    const c = this.controller();
    if (c.mode === 'single') {
      if (!c.select(id)) return;
      // FormValueControl: update the model signal so the form sees the pick.
      this.value.set(c.value());
      this.selectionChange.emit(c.value());
      // The inner menu closed without restoring focus (its item vanished).
      this.focusTrigger();
    } else {
      if (!c.toggle(id)) return;
      // The inner menu closed synchronously; reopen in the same pass.
      // doClose() cleared activeId, so restore it to the picked item —
      // otherwise the next arrow-key navigation starts from the first item.
      this.popup.openMenu('current');
      this.popup.activate(id);
      this.value.set(c.values());
      this.selectionChange.emit(c.values());
    }
  }

  /**
   * The filter box owns its keystrokes: typing, caret movement and space must
   * never reach the panel handler — otherwise the menu typeahead would steal
   * focus mid-word (measured: typed text lost). Only keys the panel must own
   * bubble: Enter accepts the top match, Escape dismisses, arrows move focus
   * within the list, Tab moves focus from the box into the list.
   */
  protected onSearchKey(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Tab':
        event.preventDefault();
        event.stopPropagation();
        this.focusItem();
        return;
      case 'Enter':
      case 'Escape':
      case 'ArrowDown':
      case 'ArrowUp':
        return;
      default:
        event.stopPropagation();
    }
  }

  private focusItem(): void {
    const id = this.popup.activeId();
    const root = this.self.nativeElement.querySelector(
      '.rv-select-popup-panel',
    ) as HTMLElement | null;
    const byId = id
      ? (root?.querySelector(`[data-rv-id="${CSS.escape(id)}"]`) as HTMLElement | null)
      : null;
    const target = byId ?? (root?.querySelector('[rvselectpopupitem]') as HTMLElement | null);
    try {
      target?.focus({ preventScroll: true });
    } catch {
      // Focus is best-effort.
    }
  }

  private focusTrigger(): void {
    try {
      const trigger = this.self.nativeElement.querySelector(
        '.rv-select-trigger',
      ) as HTMLElement | null;
      trigger?.focus({
        preventScroll: true,
      });
    } catch {
      // Best-effort.
    }
  }
}
