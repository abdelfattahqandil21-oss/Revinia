import {
  Component,
  ElementRef,
  ViewEncapsulation,
  afterRenderEffect,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RiviniaMenu } from './rivinia-menu';
import type { RiviniaMenuUiPlacement } from './ui-menu-types';
import { RiviniaMenuComponent, RiviniaMenuItem } from './menu-panel';
import { RiviniaSelect } from '@rivinia/select';
import type { RiviniaSelectController, RiviniaSelectOption } from '@rivinia/select';

/** Payload of RiviniaSelectComponent.selectionChange. Single: id (or null after clear). Multi: ids. */
export type SelectChange = string | readonly string[] | null;

/**
 * Ready-made select built on rv-menu. Single mode picks one value and closes;
 * multi mode toggles with a check mark and stays open. Options come from the
 * `options` input (labels double as the search index); rich per-option custom
 * content stays the job of raw rv-menu.
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
  standalone: true,
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  // Same projection rule as rv-menu: option buttons belong to this template,
  // every rule below stays under .rv-select-* / rv-select.
  encapsulation: ViewEncapsulation.None,
  template: `
    @if (label(); as text) {
      <span class="rv-select-caption" [id]="labelId">{{ text }}</span>
    }
    <div class="rv-select">
      <rv-menu
        [menu]="nav"
        [placement]="placement()"
        [menuLabel]="panelLabel()"
        (picked)="onPick($event.id)"
        (opened)="onOpened()"
        (closed)="onClosed()"
      >
        <button
          rv-menu-trigger
          type="button"
          class="rv-select-trigger"
          aria-haspopup="menu"
          [attr.aria-label]="ariaLabel()"
          [attr.aria-labelledby]="label() ? labelId : null"
          [attr.aria-expanded]="nav.open()"
          [attr.data-open]="nav.open()"
        >
          <span class="rv-select-value">{{ display() }}</span>
          <svg
            class="rv-select-chevron"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            aria-hidden="true"
          >
            <path d="M4 6.5 8 10.5 12 6.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <div rv-menu-panel class="rv-select-panel">
          @if (searchable()) {
            <input
              class="rv-select-search"
              type="text"
              role="searchbox"
              [attr.aria-label]="searchLabel()"
              autocomplete="off"
              [value]="controller().query()"
              [placeholder]="searchPlaceholder()"
              (input)="controller().setQuery($any($event.target).value)"
              (keydown)="onSearchKey($event)"
            />
          }
          @for (o of controller().filtered(); track o.id) {
            <button
              rvMenuItem
              [id]="o.id"
              [disabled]="o.disabled ?? false"
              [checked]="controller().mode === 'multi' ? controller().isSelected(o.id) : null"
            >
              <span class="rv-select-label">{{ o.label }}</span>
              @if (controller().isSelected(o.id)) {
                <svg
                  class="rv-select-check"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  aria-hidden="true"
                >
                  <path d="M3 8.5 6.5 12 13 4.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              }
            </button>
          } @empty {
            <div class="rv-select-empty">{{ emptyLabel() }}</div>
          }
        </div>
      </rv-menu>
    </div>
  `,
  styles: [
    `
      rv-select {
        display: inline-block;
      }
      /*
       * Theming boundary.
       *
       * The opened panel is rendered by the vendored menu primitives, whose surface paints
       * itself from the --rv-menu-* tokens. Mapping select's own namespace
       * onto those tokens HERE, on the panel element only, is what keeps the
       * two components themeable independently: a --rv-select-* value
       * inherited from an ancestor reaches this panel, and a consumer's
       * --rv-menu-* value can no longer bleed into a select. Nothing outside
       * .rv-select-panel sees these declarations.
       *
       * Every value is var(--rv-select-*, fallback), never a literal, so an
       * ancestor theme always wins. No forced dark mode: opting in is the
       * consumer's decision (see README -> Theming).
       */
      .rv-select .rv-menu-panel {
        --rv-menu-bg: var(--rv-select-bg, #ffffff);
        --rv-menu-fg: var(--rv-select-fg, #111111);
        --rv-menu-border: var(--rv-select-border, #e0e0e0);
        --rv-menu-muted: var(--rv-select-muted, #555555);
        --rv-menu-radius: var(--rv-select-radius, 12px);
        --rv-menu-shadow: var(--rv-select-shadow, 0 16px 48px rgba(0, 0, 0, 0.22));
        --rv-menu-width: var(--rv-select-width, 16rem);
      }
      .rv-select-caption {
        display: block;
        margin-bottom: 4px;
        font-size: 13px;
        color: var(--rv-select-muted, #555555);
      }
      .rv-select-trigger {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: var(--rv-select-width, 14rem);
        max-width: 100%;
        padding: 8px 12px;
        border-radius: var(--rv-select-radius, 10px);
        border: 1px solid var(--rv-select-border, #e0e0e0);
        background: var(--rv-select-bg, #ffffff);
        color: var(--rv-select-fg, #111111);
        font: inherit;
        font-size: 14px;
        cursor: pointer;
      }
      .rv-select-value {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        text-align: start;
      }
      .rv-select-chevron {
        width: 16px;
        height: 16px;
        flex: none;
        color: var(--rv-select-muted, #555555);
        transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1);
      }
      .rv-select-trigger[data-open='true'] .rv-select-chevron {
        transform: rotate(180deg);
      }
      .rv-select-search {
        width: 100%;
        box-sizing: border-box;
        margin-bottom: 4px;
        padding: 8px 10px;
        border-radius: 8px;
        border: 1px solid var(--rv-select-border, #e0e0e0);
        background: transparent;
        color: inherit;
        font: inherit;
        font-size: 14px;
      }
      .rv-select-search:focus {
        outline: 2px solid currentColor;
        outline-offset: -1px;
      }
      .rv-select-search::placeholder {
        color: var(--rv-select-muted, #555555);
      }
      .rv-select-check {
        width: 16px;
        height: 16px;
        flex: none;
        margin-inline-start: auto;
      }
      .rv-select-empty {
        padding: 12px 10px;
        text-align: center;
        font-size: 13px;
        color: var(--rv-select-muted, #555555);
      }
      @media (prefers-reduced-motion: reduce) {
        .rv-select-chevron {
          transition: none;
        }
      }
    `,
  ],
})
export class RiviniaSelectComponent {
  /**
   * External controller (shared/test double). Omitted: the component owns one
   * matching `mode()` (simplest embedding).
   */
  readonly select = input<RiviniaSelectController | null>(null);
  /** 'single' closes on pick; 'multi' toggles and stays open. @default 'single' */
  readonly mode = input<'single' | 'multi'>('single');
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
   * name via `aria-labelledby`. Use it to tell users what the field IS — the
   * trigger's own text is the selected value, which changes as they pick.
   */
  readonly label = input<string | null>(null);
  /**
   * Explicit accessible name for the trigger, used when there is no visible
   * caption. Ignored when `label` is set (a visible caption is the better
   * name). Named `ariaLabel`, mirroring the vendored menu's `menuLabel`, so it
   * cannot be confused with an option's `label`.
   */
  readonly ariaLabel = input<string | null>(null);
  /**
   * Accessible name for the opened panel (`aria-label` on the listbox-shaped
   * menu). Defaults to the visible caption when one is set.
   */
  readonly menuLabel = input<string | null>(null);
  /** Accessible name for the filter box. @default 'Search options' */
  readonly searchLabel = input('Search options');
  /** Filter box hint. @default 'Search…' */
  readonly searchPlaceholder = input('Search…');
  /** Shown when the filter matches nothing. @default 'No results' */
  readonly emptyLabel = input('No results');
  /** Panel placement relative to the trigger. @default 'bottom-start' */
  readonly placement = input<RiviniaMenuUiPlacement>('bottom-start');

  /** Current selection. Single: id (or null). Multi: ids in pick order. */
  readonly selectionChange = output<SelectChange>();
  readonly opened = output<void>();
  readonly closed = output<void>();

  private readonly ownedSingle = new RiviniaSelect('single');
  private readonly ownedMulti = new RiviniaSelect('multi');
  /** Inner navigation controller driving the rv-menu panel. */
  protected readonly nav = new RiviniaMenu();
  private readonly self = inject(ElementRef<HTMLElement>);
  /** Set on trigger-open; consumed after render to land focus in search. */
  private readonly justOpened = signal(false);
  /** Id of the rendered caption element, referenced by the trigger. */
  protected readonly labelId = 'rv-select-label';

  /**
   * Accessible name for the opened panel: an explicit `menuLabel`, else the
   * visible caption, else none. Without any of these the panel is unnamed.
   */
  protected panelLabel(): string | null {
    return this.menuLabel() ?? this.label();
  }

  /**
   * Clear the current selection and announce it through `selectionChange`
   * (`null` in single mode, `[]` in multi) — the same payload shape `picked`
   * emits, so one consumer handler covers picking and clearing.
   */
  clear(): void {
    const c = this.controller();
    c.clear();
    this.selectionChange.emit(c.mode === 'multi' ? c.values() : c.value());
  }

  /** Effective controller: external input or the owned one matching mode. */
  protected controller(): RiviniaSelectController {
    return this.select() ?? (this.mode() === 'multi' ? this.ownedMulti : this.ownedSingle);
  }

  protected display(): string {
    const labels = this.controller().selectedLabels();
    return labels.length > 0 ? labels.join(', ') : this.placeholder();
  }

  constructor() {
    // Mirror the options input into the controller registry (stale ids drop,
    // dangling values prune — same rule as unregisterOption).
    effect(() => {
      this.controller().syncOptions(this.options());
    });
    // Typing re-aims keyboard focus at the top match, so Enter just works.
    effect(() => {
      this.controller().query();
      this.nav.activateFirst();
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
      if (!this.justOpened() || !this.nav.open() || !this.searchable()) return;
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
  }

  protected onOpened(): void {
    this.justOpened.set(true);
    this.opened.emit();
  }

  protected onClosed(): void {
    // A stale filter on reopen hides options confusingly — reset it.
    this.controller().clearQuery();
    this.closed.emit();
  }

  protected onPick(id: string): void {
    const c = this.controller();
    if (c.mode === 'single') {
      if (!c.select(id)) return;
      this.selectionChange.emit(c.value());
      // The inner menu closed without restoring focus (its item vanished).
      this.focusTrigger();
    } else {
      if (!c.toggle(id)) return;
      // The inner menu closed synchronously on click; reopen in the same
      // pass so the panel never visually drops.
      this.nav.openMenu();
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
    const id = this.nav.activeId();
    const root = this.self.nativeElement.querySelector('.rv-menu-panel') as HTMLElement | null;
    const byId = id
      ? (root?.querySelector(`[data-rv-id="${CSS.escape(id)}"]`) as HTMLElement | null)
      : null;
    const target = byId ?? (root?.querySelector('[rvmenuitem]') as HTMLElement | null);
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
