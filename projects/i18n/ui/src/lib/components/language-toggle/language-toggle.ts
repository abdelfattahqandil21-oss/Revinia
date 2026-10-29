import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { LanguageLike, RiviniaLanguageManager } from '../../models/language-view';

/** Scaffold only: the inputs and the output the specs pin down. No behaviour yet. */
@Component({
  selector: 'rv-language-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
})
export class RiviniaLanguageToggle {
  readonly manager = input<RiviniaLanguageManager>();
  readonly languages = input<readonly LanguageLike[]>([]);
  readonly current = input<string>();
  readonly label = input<string>();
  readonly busy = input(false);
  readonly disabled = input(false);

  readonly languageChange = output<string>();
}
