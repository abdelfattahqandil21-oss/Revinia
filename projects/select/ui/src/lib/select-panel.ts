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
import { RiviniaMenu } from '@rivinia/menu';
import type { RiviniaMenuUiPlacement } from '@rivinia/menu/ui';
import { RiviniaMenuComponent, RiviniaMenuItem } from '@rivinia/menu/ui';
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
 * Search: typing filters (accent-insensitive), Tab jumps into the list,
 * Enter picks the top match. SSR renders the closed trigger.
 */
@Component({
  selector: 'rv-select',
  standalone: true,
  imports: [RiviniaMenuComponent, RiviniaMenuItem],
  // Same projection rule as rv-menu: option buttons belong to this template,
  // every rule below stays under .rv-select-* / rv-select.
  encapsulation: ViewEncapsulation.None,
  template: `
    <rv-menu
      [menu]="nav"
      [placement]="placement()"
      (picked)="onPick($event.id)"
      (opened)="onOpened()"
      (closed)="onClosed()"
    >
      <button
        rv-menu-trigger
        type="button"
        class="rv-select-trigger"
        aria-haspopup="menu"
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
            aria-label="Search options"
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
  `,
  styles: [
    `
      rv-select {
        display: inline-block;
      }
      .rv-select-trigger {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: var(--rv-select-width, 14rem);
        max-width: 100%;
        padding: 8px 12px;
        border-radius: 10px;
        border: 1px solid var(--rv-menu-border, #e0e0e0);
        background: var(--rv-menu-bg, #ffffff);
        color: var(--rv-menu-fg, #111111);
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
        color: var(--rv-menu-muted, #555555);
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
        border: 1px solid var(--rv-menu-border, #e0e0e0);
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
        color: var(--rv-menu-muted, #555555);
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
        color: var(--rv-menu-muted, #555555);
      }
      @media (prefers-color-scheme: dark) {
        .rv-select-trigger {
          --rv-menu-bg: #161616;
          --rv-menu-fg: #f2f2f2;
          --rv-menu-muted: #a8a8a8;
          --rv-menu-border: #333333;
        }
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
    // Searchable open lands focus in the search box (combobox pattern). The
    // inner menu already focused the first item in its own hook, so this runs
    // in a microtask — deterministically after every render hook — and only
    // on the opening transition, never while navigating or typing.
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
   * The search box owns its keystrokes (combobox pattern): typing, caret
   * movement and space must never reach the panel handler — otherwise the
   * menu typeahead would steal focus mid-word (measured: typed text lost).
   * Only keys the panel must own bubble: Enter accepts the top match,
   * Escape dismisses, arrows move focus into the list, Tab jumps in manually.
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
