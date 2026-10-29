import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RiviniaI18n } from '@rivinia/i18n';
import {
  RiviniaLanguageToggle,
  RiviniaLanguageTrigger,
  type LanguageLike,
} from '@rivinia/i18n/ui';

/**
 * The `@rivinia/i18n/ui` proof page, routed at `/toggle`. Two instances on
 * purpose:
 *
 * - **managed**: the app's real `RiviniaI18n` is the manager, so the button
 *   switches the document and the page `dir` with it;
 * - **presentational**: two static entries and a `current` signal the page
 *   updates from `(languageChange)`, plus a consumer `rvLanguageTrigger`
 *   template. The entries are asymmetric on purpose — Arabic carries `dir`,
 *   French does not — so one instance shows both an Arabic target and the
 *   `dir="auto"` case as `current` flips.
 */
@Component({
  selector: 'app-toggle-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RiviniaLanguageToggle, RiviniaLanguageTrigger],
  templateUrl: './toggle-page.html',
})
export class TogglePage {
  readonly i18n = inject(RiviniaI18n<'ar' | 'en'>);

  readonly title = this.i18n.t('toggle.title');
  readonly label = this.i18n.t('toggle.label');

  readonly presentationalLanguages: readonly LanguageLike[] = [
    { id: 'ar', nativeName: 'العربية', dir: 'rtl' },
    // No `dir`: the toggle renders `dir="auto"` and the button then follows its
    // own text. `nativeName` is present so the trigger template has a name; the
    // DisplayNames path is covered by the unit suite and by `languageName` on
    // the managed side.
    { id: 'fr', nativeName: 'Français' },
  ];

  readonly presentationalCurrent = signal('ar');
  readonly presentationalEvent = signal<string | null>(null);
  readonly managedEvent = signal<string | null>(null);

  onPresentationalChange(id: string): void {
    this.presentationalEvent.set(id);
    this.presentationalCurrent.set(id);
  }

  onManagedChange(id: string): void {
    this.managedEvent.set(id);
  }
}
