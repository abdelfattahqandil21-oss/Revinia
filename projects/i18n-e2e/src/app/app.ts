import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { RiviniaI18n } from '@rivinia/i18n';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  readonly i18n = inject(RiviniaI18n<'ar' | 'en'>);

  constructor() {
    // Test observability only: `afterNextRender` never runs on the server, so
    // this attribute means "the browser has rendered and is interactive".
    // The SSR smoke test waits for it instead of sleeping, which is the
    // difference between proving hydration and proving a timer.
    afterNextRender(() => {
      document.documentElement.dataset['hydrated'] = 'true';
    });
  }

  /** `t()` — a signal, so a language switch re-renders without a pipe. */
  readonly title = this.i18n.t('app.title');
  readonly hero = this.i18n.t('home.hero');
  readonly switchLabel = this.i18n.t('home.switch');

  readonly counts = [0, 1, 2, 3, 11, 100] as const;
  readonly ordinals = [1, 2, 3, 4, 11, 21] as const;
  readonly guests = [0, 1, 2, 3] as const;

  /** `translate()` inside a computed is reactive for the same reason. */
  readonly pluralRows = computed(() =>
    this.counts.map((count) => ({ count, text: this.i18n.translate('icu.items', { count }) })),
  );
  /** RIV-01: translation-tool output with no space before `{`. */
  readonly compactRows = computed(() =>
    this.counts.map((count) => ({ count, text: this.i18n.translate('icu.compact', { count }) })),
  );
  readonly ordinalRows = computed(() =>
    this.ordinals.map((rank) => ({ rank, text: this.i18n.translate('icu.ordinal', { rank }) })),
  );
  readonly guestRows = computed(() =>
    this.guests.map((n) => ({ n, text: this.i18n.translate('icu.guests', { n }) })),
  );

  readonly amount = computed(() =>
    this.i18n.translate('icu.amount', { value: 1234.5 }),
  );
  readonly ratio = computed(() => this.i18n.translate('icu.ratio', { value: 0.256 }));
  readonly day = computed(() =>
    this.i18n.translate('icu.day', { value: new Date(2026, 9, 25) }),
  );

  /** Present only in `en`: resolves through the fallback dictionary. */
  readonly fallbackText = computed(() => this.i18n.translate('fallback.onlyEnglish'));
  /** Present in neither: renders the key and is reported once. */
  readonly missingText = computed(() => this.i18n.translate('missing.nowhere'));

  /** RIV-12: a literal dotted key with no nested counterpart. */
  readonly flatKey = computed(() => this.i18n.translate('flat.dotted'));
  /** RIV-08: ICU apostrophe quoting. */
  readonly quoted = computed(() => this.i18n.translate('hardening.quoted'));
  /** RIV-10: a strict ISO-8601 date argument. */
  readonly isoDay = computed(() =>
    this.i18n.translate('hardening.iso', { value: '2026-10-28' }),
  );
  /** RIV-09: a needed argument is absent — the placeholder must stay. */
  readonly missingParam = computed(() => this.i18n.translate('hardening.missing', {}));

  readonly live = signal(1);
  /** A `params` FUNCTION, so the signal it reads is tracked. */
  readonly liveText = this.i18n.t('signal.count', () => ({ count: this.live() }));

  use(id: 'ar' | 'en'): void {
    this.i18n.setLanguage(id);
  }

  bump(): void {
    this.live.update((n) => (n >= 3 ? 1 : n + 1));
  }
}
