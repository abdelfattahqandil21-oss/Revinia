import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
  output,
} from '@angular/core';
import type { LanguageLike, RiviniaLanguageManager } from '@rivinia/i18n/ui';
import { RiviniaSelectComponent } from '@rivinia/select/ui';
import type { RiviniaSelectVariant, SelectChange } from '@rivinia/select/ui';
import type { LanguageSelectOption } from '../../models/language-select-option';
import { languageSelectOptions } from '../../utils/language-select-options';

/**
 * Multi-language picker: `rv-select` with every language as one row.
 *
 * The i18n core and `/ui` entry point do not know this component exists. It is
 * the only chunk that imports `@rivinia/select/ui`, which is why the peer stays
 * optional for consumers that never import `@rivinia/i18n/select`.
 *
 * ```html
 * <rv-language-select [manager]="i18n" label="Language" />
 * <rv-language-select [languages]="languages" [current]="current()" (languageChange)="set($event)" />
 * ```
 *
 * Managed mode wins over `[languages]` / `[current]` / `[busy]`. The event is
 * emitted only after `setLanguageAsync` confirms the id, matching the toggle's
 * contract; a manager that leaves the language unchanged emits nothing and the
 * trigger returns to the real current language.
 */
@Component({
  selector: 'rv-language-select',
  imports: [RiviniaSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './language-select.html',
  styleUrl: './language-select.css',
  host: {
    '[attr.data-busy]': 'isBusy() ? "" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
  },
})
export class RiviniaLanguageSelect {
  readonly manager = input<RiviniaLanguageManager>();
  readonly languages = input<readonly LanguageLike[]>([]);
  readonly current = input<string>();
  readonly label = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null);
  readonly popupLabel = input<string | null>(null);
  readonly placeholder = input('Select…');
  readonly searchable = input(false);
  readonly searchLabel = input('Search options');
  readonly searchPlaceholder = input('Search…');
  readonly emptyLabel = input('No results');
  readonly variant = input<RiviniaSelectVariant>('simple');
  readonly disabled = input(false);
  readonly busy = input(false);

  readonly languageChange = output<string>();

  protected readonly sourceLanguages = computed<readonly LanguageLike[]>(
    () => this.manager()?.languages() ?? this.languages(),
  );

  protected readonly options = computed<readonly LanguageSelectOption[]>(() =>
    languageSelectOptions(this.sourceLanguages()),
  );

  protected readonly currentId = computed(
    () => this.manager()?.currentLanguage() ?? this.current() ?? '',
  );

  protected readonly isBusy = computed(() => {
    const manager = this.manager();
    return manager ? manager.loadingState() === 'loading' : this.busy();
  });

  protected readonly isDisabled = computed(() => this.disabled() || this.isBusy());

  protected readonly panelLabel = computed(
    () => this.popupLabel() ?? this.label() ?? this.ariaLabel(),
  );

  /**
   * The select's single value. Linked to the current language, but writable so
   * a pick paints immediately while a managed switch is in flight. When the
   * manager confirms (or refuses), the linked computation re-syncs it.
   */
  protected readonly selected = linkedSignal<SelectChange>(() => this.currentId() || null);

  /** Discards the confirmation of a switch that a later pick superseded. */
  private request = 0;

  protected onSelectionChange(value: SelectChange): void {
    if (typeof value !== 'string' || value.length === 0) {
      this.selected.set(this.currentId() || null);
      return;
    }
    if (value === this.currentId()) {
      // Re-picking the language that is already current is still a newer
      // intent: it outvotes a switch still in flight, whose confirmation must
      // not surface as a change the user never asked for.
      this.request += 1;
      this.selected.set(this.currentId() || null);
      return;
    }
    if (this.isDisabled()) {
      this.selected.set(this.currentId() || null);
      return;
    }

    const manager = this.manager();
    if (!manager) {
      this.languageChange.emit(value);
      return;
    }

    const request = ++this.request;
    void manager
      .setLanguageAsync(value)
      .then(() => {
        if (request !== this.request) {
          return;
        }
        if (manager.currentLanguage() === value) {
          this.languageChange.emit(value);
        } else {
          this.selected.set(this.currentId() || null);
        }
      })
      .catch(() => {
        if (request === this.request) {
          this.selected.set(this.currentId() || null);
        }
      });
  }
}
