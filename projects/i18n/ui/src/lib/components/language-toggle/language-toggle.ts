import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  ViewContainerRef,
  computed,
  contentChild,
  input,
  isDevMode,
  output,
  viewChild,
} from '@angular/core';
import type { LanguageLike, RiviniaLanguageManager } from '../../models/language-view';
import { languageName } from '../../utils/language-name';
import { RiviniaLanguageTrigger } from './language-trigger.directive';
import type { RiviniaLanguageTriggerContext } from './language-trigger.directive';

/**
 * The language toggle: one inner `<button>` that switches to the other language
 * of a two-language manager (or presentational pair). The host is the API; the
 * button owns the name, `lang` and `dir`.
 */
@Component({
  selector: 'rv-language-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './language-toggle.html',
  styleUrl: './language-toggle.css',
  host: {
    '[attr.data-languages]': 'dataLanguages()',
    '[attr.data-busy]': 'languageCount() >= 2 && isBusy() ? "" : null',
    '[attr.data-disabled]': 'languageCount() >= 2 && disabled() ? "" : null',
  },
})
export class RiviniaLanguageToggle {
  readonly manager = input<RiviniaLanguageManager>();
  readonly languages = input<readonly LanguageLike[]>([]);
  readonly current = input<string>();
  readonly label = input<string>();
  readonly busy = input(false);
  readonly disabled = input(false);

  readonly languageChange = output<string>();

  readonly template = contentChild(RiviniaLanguageTrigger, { read: TemplateRef });

  private readonly slot = viewChild('slot', { read: ViewContainerRef });

  private readonly sourceLanguages = computed<readonly LanguageLike[]>(
    () => this.manager()?.languages() ?? this.languages(),
  );

  readonly languageCount = computed(() => this.sourceLanguages().length);

  readonly manyLanguages = computed(() => this.languageCount() >= 3);

  private readonly currentId = computed(
    () => this.manager()?.currentLanguage() ?? this.current() ?? '',
  );

  /** The language activating the button switches to; `undefined` when nothing renders. */
  readonly target = computed<LanguageLike | undefined>(() => {
    const languages = this.sourceLanguages();
    if (languages.length < 2) {
      return undefined;
    }
    const current = this.currentId();
    return languages.find((language) => language.id !== current);
  });

  readonly isBusy = computed(() => {
    const manager = this.manager();
    return manager ? manager.loadingState() === 'loading' : this.busy();
  });

  readonly visibleName = computed(() => {
    const target = this.target();
    return target ? languageName(target) : '';
  });

  readonly accessibleName = computed(() => {
    const name = this.visibleName();
    const label = this.label();
    return label ? `${name}, ${label}` : name;
  });

  readonly dataLanguages = computed(() => {
    const count = this.languageCount();
    if (count === 2) {
      return '2';
    }
    return count >= 3 ? 'many' : null;
  });

  private rendered:
    | { template: TemplateRef<unknown>; target: LanguageLike; busy: boolean }
    | undefined;
  private warnedMany = false;
  private warnedLabel = false;

  ngAfterViewChecked(): void {
    this.warn();
    this.renderTrigger();
  }

  async activate(targetId: string): Promise<void> {
    if (this.disabled() || this.languageCount() !== 2 || this.isBusy()) {
      return;
    }
    if (targetId === this.currentId()) {
      return;
    }

    const manager = this.manager();
    if (!manager) {
      this.languageChange.emit(targetId);
      return;
    }

    await manager.setLanguageAsync(targetId);
    if (manager.currentLanguage() === targetId) {
      this.languageChange.emit(targetId);
    }
  }

  private warn(): void {
    if (!isDevMode()) {
      return;
    }
    if (!this.warnedMany && this.manyLanguages()) {
      this.warnedMany = true;
      console.warn(
        'rv-language-toggle: 3 or more languages. The toggle switches between exactly two; use a select or a menu. The button is aria-disabled, not disabled.',
      );
    }
    if (!this.warnedLabel && this.template() && !this.label()) {
      this.warnedLabel = true;
      console.warn(
        'rv-language-toggle: label is missing while rvLanguageTrigger is used. The accessible name falls back to the language name alone.',
      );
    }
  }

  /*
   * The embedded view is created in a view hook, not in an effect, so the
   * template is in the DOM by the end of the same change-detection pass
   * (and during server rendering, where render hooks never run).
   */
  private renderTrigger(): void {
    const slot = this.slot();
    const template = this.template();
    const target = this.target();
    const busy = this.isBusy();

    if (!slot || !template || !target) {
      this.rendered = undefined;
      return;
    }
    const rendered = this.rendered;
    if (rendered && rendered.template === template && rendered.target === target && rendered.busy === busy) {
      return;
    }

    slot.clear();
    slot.createEmbeddedView<RiviniaLanguageTriggerContext>(template, { $implicit: target, busy });
    this.rendered = { template, target, busy };
  }
}
