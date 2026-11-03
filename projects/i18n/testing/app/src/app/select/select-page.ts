import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RiviniaI18n } from '@rivinia/i18n';
import { RiviniaLanguageSelect, type LanguageLike } from '@rivinia/i18n/select';

/**
 * The `@rivinia/i18n/select` proof page, routed at `/select`.
 *
 * The two instances sit in ordinary block flow, not as grid or flex items: a
 * shrink-to-fit host is what makes the panel collapse, so the page must not
 * stretch it. That is the layout the geometry assertions measure.
 *
 * - **managed**: the app's `RiviniaI18n` is the manager, so a pick switches the
 *   document language and direction;
 * - **presentational**: `Français` has no `dir`, so its row falls back to
 *   `dir="auto"`, and its pick must not touch the manager.
 */
@Component({
  selector: 'app-select-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RiviniaLanguageSelect],
  templateUrl: './select-page.html',
})
export class SelectPage {
  readonly i18n = inject(RiviniaI18n<'ar' | 'en'>);

  readonly title = this.i18n.t('select.title');
  readonly label = this.i18n.t('select.label');

  readonly presentationalLanguages: readonly LanguageLike[] = [
    { id: 'en', nativeName: 'English', dir: 'ltr' },
    { id: 'fr', nativeName: 'Français' },
  ];

  readonly presentationalCurrent = signal('en');
  readonly presentationalEvent = signal<string | null>(null);

  onPresentationalChange(id: string): void {
    this.presentationalEvent.set(id);
    this.presentationalCurrent.set(id);
  }
}
