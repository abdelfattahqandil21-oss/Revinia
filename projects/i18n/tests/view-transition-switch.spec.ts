import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { customLoader } from '../src/lib/models/loaders';
import { provideRiviniaI18n } from '../src/lib/providers/provide-i18n';
import { RiviniaI18n } from '../src/lib/services/rivinia-i18n';
import { ViewTransitionService } from '../src/lib/services/view-transition.service';

/**
 * A real View Transition runs its callback AFTER the browser captures the old
 * state, i.e. asynchronously. `skipInitialTransition` makes the first switch
 * synchronous and every later one deferred, which is the shape that exposed
 * the 0.7.1 defect: the dictionary was loaded before `currentLanguage`
 * changed, so `DictionaryStore._apply()` discarded it and the UI kept the old
 * language.
 */
const AR = { id: 'ar', nativeName: 'العربية', dir: 'rtl' } as const;
const EN = { id: 'en', nativeName: 'English', dir: 'ltr' } as const;

/** Holds transition callbacks until the test releases them. */
class DeferredViewTransition {
  private readonly _callbacks: Array<() => void> = [];

  run(callback: () => void): void {
    this._callbacks.push(callback);
  }

  flush(): void {
    const callback = this._callbacks.shift();
    if (!callback) throw new Error('no view transition is pending');
    callback();
  }

  get pending(): number {
    return this._callbacks.length;
  }
}

const flushMicrotasks = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function setup(viewTransition: DeferredViewTransition): RiviniaI18n<'ar' | 'en'> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRiviniaI18n({
        defaultLanguage: 'ar',
        languages: [AR, EN],
        storageStrategy: 'none',
        preload: false,
        warnOnMissingKey: false,
        loader: customLoader(async (language) =>
          language === 'ar' ? { greeting: 'مرحبا' } : { greeting: 'Hello' },
        ),
        viewTransition: { enabled: true, skipInitialTransition: true },
      }),
      { provide: ViewTransitionService, useValue: viewTransition },
    ],
  });
  return TestBed.inject(RiviniaI18n<'ar' | 'en'>);
}

beforeEach(() => {
  TestBed.resetTestingModule();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('view transitions and dictionary application', () => {
  it('applies the dictionary of every switch once its deferred callback runs', async () => {
    const viewTransition = new DeferredViewTransition();
    const i18n = setup(viewTransition);

    // Both dictionaries are cached, as they are after the first visit/switch:
    // a cached load applies synchronously, which is the path that exposed the
    // defect (a fresh fetch could resolve after the deferred callback).
    await i18n.loadTranslations('ar');
    await i18n.loadTranslations('en');
    expect(i18n.translate('greeting')).toBe('مرحبا');

    // First switch: skipInitialTransition runs the callback synchronously.
    i18n.setLanguage('en');
    await flushMicrotasks();
    expect(i18n.currentLanguage()).toBe('en');
    expect(i18n.translate('greeting')).toBe('Hello');

    // Second switch: the callback is deferred. Until it runs, the old
    // language is still current and visible.
    i18n.setLanguage('ar');
    expect(viewTransition.pending).toBe(1);
    expect(i18n.currentLanguage()).toBe('en');
    expect(i18n.translate('greeting')).toBe('Hello');

    viewTransition.flush();
    expect(i18n.currentLanguage()).toBe('ar');
    await flushMicrotasks();
    expect(i18n.translate('greeting')).toBe('مرحبا');

    // The next deferred switch must apply its dictionary too.
    i18n.setLanguage('en');
    viewTransition.flush();
    await flushMicrotasks();
    expect(i18n.currentLanguage()).toBe('en');
    expect(i18n.translate('greeting')).toBe('Hello');
  });

  it('applies the preloaded dictionary of a deferred setLanguageAsync switch', async () => {
    const viewTransition = new DeferredViewTransition();
    const i18n = setup(viewTransition);
    await i18n.loadTranslations('ar');
    await i18n.loadTranslations('en');

    // First switch is synchronous (skipInitialTransition).
    await i18n.setLanguageAsync('en');
    expect(i18n.currentLanguage()).toBe('en');
    expect(i18n.translate('greeting')).toBe('Hello');

    // The preload is cached, so only the apply step is deferred.
    const switching = i18n.setLanguageAsync('ar');
    await flushMicrotasks();
    expect(viewTransition.pending).toBe(1);
    expect(i18n.currentLanguage()).toBe('en');

    viewTransition.flush();
    expect(i18n.currentLanguage()).toBe('ar');
    await switching;
    await flushMicrotasks();
    expect(i18n.translate('greeting')).toBe('مرحبا');
  });
});
