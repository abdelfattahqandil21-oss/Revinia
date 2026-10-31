import type { Type } from '@angular/core';
import { Component, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RiviniaLanguageSelect } from '../select/src/lib/components/language-select/language-select';
import { languageSelectOptions } from '../select/src/lib/utils/language-select-options';
import type { LanguageLike, RiviniaLanguageManager } from '../ui/src/lib/models/language-view';

const AR: LanguageLike = { id: 'ar', nativeName: 'العربية', dir: 'rtl' };
const EN: LanguageLike = { id: 'en', nativeName: 'English', dir: 'ltr' };
const DE: LanguageLike = { id: 'de', nativeName: 'Deutsch', dir: 'ltr' };
const FR: LanguageLike = { id: 'fr', nativeName: 'Français', dir: 'ltr' };

/**
 * Every switch stays pending until the test settles it, so the post-await
 * confirmation (the toggle's contract) is observable here too.
 */
class ManualManager implements RiviniaLanguageManager {
  readonly languages = signal<readonly LanguageLike[]>([AR, EN, DE]);
  readonly currentLanguage = signal('ar');
  readonly loadingState = signal<'idle' | 'loading' | 'error'>('idle');
  readonly calls: string[] = [];
  private readonly pending: Array<(apply?: string) => void> = [];

  setLanguageAsync(id: string): Promise<void> {
    this.calls.push(id);
    return new Promise<void>((resolve) => {
      this.pending.push((apply) => {
        if (apply !== undefined) {
          this.currentLanguage.set(apply);
        }
        resolve();
      });
    });
  }

  settle(apply?: string): void {
    this.pending.shift()?.(apply);
  }
}

@Component({
  imports: [RiviniaLanguageSelect],
  template: `<rv-language-select
    [manager]="manager"
    [languages]="decoy"
    [current]="decoyCurrent"
    label="Language"
    (languageChange)="onChange($event)"
  />`,
})
class ManagedHost {
  readonly manager = new ManualManager();
  readonly decoy: readonly LanguageLike[] = [FR];
  readonly decoyCurrent = 'fr';
  readonly got: string[] = [];

  onChange(id: string): void {
    this.got.push(id);
  }
}

@Component({
  imports: [RiviniaLanguageSelect],
  template: `<rv-language-select
    [languages]="languages"
    [current]="current()"
    [disabled]="disabled"
    (languageChange)="onChange($event)"
  />`,
})
class PresentationalHost {
  languages: readonly LanguageLike[] = [AR, EN, DE];
  readonly current = signal('ar');
  disabled = false;
  readonly got: string[] = [];

  onChange(id: string): void {
    this.got.push(id);
  }
}

@Component({
  imports: [RiviniaLanguageSelect],
  template: `<rv-language-select
    [languages]="languages"
    [current]="'en'"
    [searchable]="true"
    label="Language"
    popupLabel="Choose a language"
    searchLabel="Filter languages"
    searchPlaceholder="Type a language"
    emptyLabel="Nothing here"
    variant="premium"
  />`,
})
class ConfiguredHost {
  readonly languages: readonly LanguageLike[] = [AR, EN, DE];
}

const attached: HTMLElement[] = [];

function attach<T>(type: Type<T>): ComponentFixture<T> {
  const fixture = TestBed.createComponent(type);
  document.body.appendChild(fixture.nativeElement);
  attached.push(fixture.nativeElement);
  return fixture;
}

function root(fixture: ComponentFixture<unknown>): HTMLElement {
  return fixture.nativeElement as HTMLElement;
}

function trigger(fixture: ComponentFixture<unknown>): HTMLButtonElement {
  const button = root(fixture).querySelector<HTMLButtonElement>('.rv-select-trigger');
  if (button === null) {
    throw new Error('fixture has no .rv-select-trigger');
  }
  return button;
}

function valueText(fixture: ComponentFixture<unknown>): string {
  return root(fixture).querySelector('.rv-select-value')?.textContent?.trim() ?? '';
}

function rows(fixture: ComponentFixture<unknown>): HTMLElement[] {
  return Array.from(root(fixture).querySelectorAll<HTMLElement>('[rvselectpopupitem]'));
}

function row(fixture: ComponentFixture<unknown>, id: string): HTMLElement | undefined {
  return rows(fixture).find((item) => item.getAttribute('data-rv-id') === id);
}

async function open(fixture: ComponentFixture<unknown>): Promise<void> {
  trigger(fixture).click();
  fixture.detectChanges();
  TestBed.flushEffects();
  fixture.detectChanges();
  await Promise.resolve();
}

async function flush(): Promise<void> {
  for (let round = 0; round < 4; round += 1) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  TestBed.resetTestingModule();
});

afterEach(() => {
  while (attached.length > 0) {
    attached.pop()?.remove();
  }
});

describe('languageSelectOptions', () => {
  it('maps every language, in order, with its native name, code, lang and dir', () => {
    expect(languageSelectOptions([AR, EN, DE])).toEqual([
      { id: 'ar', label: 'العربية', lang: 'ar', dir: 'rtl', hint: 'ar' },
      { id: 'en', label: 'English', lang: 'en', dir: 'ltr', hint: 'en' },
      { id: 'de', label: 'Deutsch', lang: 'de', dir: 'ltr', hint: 'de' },
    ]);
  });

  it('falls back to Intl when nativeName is absent, and omits dir when unknown', () => {
    const [option] = languageSelectOptions([{ id: 'fr', locale: 'en' }]);

    expect(option).toEqual({ id: 'fr', label: 'French', lang: 'fr', hint: 'fr' });
    expect(Object.prototype.hasOwnProperty.call(option, 'dir')).toBe(false);
  });

  it('does not repeat the id as a hint when the label already is the id', () => {
    const [option] = languageSelectOptions([{ id: 'qaa' }]);

    expect(option.label).toBe('qaa');
    expect(Object.prototype.hasOwnProperty.call(option, 'hint')).toBe(false);
  });

  it('keeps an arbitrary language count instead of assuming two', () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      id: `l${index}`,
      nativeName: `Language ${index}`,
      dir: index % 2 === 0 ? ('ltr' as const) : ('rtl' as const),
    }));

    expect(languageSelectOptions(many).map((option) => option.id)).toEqual(
      many.map((language) => language.id),
    );
  });
});

describe('RiviniaLanguageSelect — managed', () => {
  it('lets the manager beat [languages] and [current], and shows the current name', () => {
    const fixture = attach(ManagedHost);
    fixture.detectChanges();

    expect(valueText(fixture)).toBe('العربية');
  });

  it('renders every language with native names, codes, lang and dir', async () => {
    const fixture = attach(ManagedHost);
    fixture.detectChanges();
    await open(fixture);

    expect(rows(fixture).map((item) => item.querySelector('.rv-select-label')?.textContent?.trim())).toEqual([
      'العربية',
      'English',
      'Deutsch',
    ]);
    expect(rows(fixture).map((item) => item.querySelector('.rv-select-hint')?.textContent?.trim())).toEqual([
      'ar',
      'en',
      'de',
    ]);

    const labels = rows(fixture).map((item) => item.querySelector('.rv-select-label'));
    expect(labels.map((label) => [label?.getAttribute('lang'), label?.getAttribute('dir')])).toEqual(
      [
        ['ar', 'rtl'],
        ['en', 'ltr'],
        ['de', 'ltr'],
      ],
    );
  });

  it('calls setLanguageAsync once and emits only after the manager confirms', async () => {
    const fixture = attach(ManagedHost);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    await open(fixture);

    row(fixture, 'en')?.click();
    fixture.detectChanges();
    TestBed.flushEffects();
    await flush();

    expect(host.manager.calls).toEqual(['en']);
    expect(host.got).toEqual([]);

    host.manager.settle('en');
    await flush();
    fixture.detectChanges();

    expect(host.got).toEqual(['en']);
    expect(valueText(fixture)).toBe('English');
  });

  it('emits nothing and returns to the real language when the manager refuses', async () => {
    const fixture = attach(ManagedHost);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    await open(fixture);

    row(fixture, 'en')?.click();
    fixture.detectChanges();
    TestBed.flushEffects();
    host.manager.settle();
    await flush();
    fixture.detectChanges();

    expect(host.got).toEqual([]);
    expect(valueText(fixture)).toBe('العربية');
  });

  it('does not call the manager when the current language is picked again', async () => {
    const fixture = attach(ManagedHost);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    await open(fixture);

    row(fixture, 'ar')?.click();
    fixture.detectChanges();
    TestBed.flushEffects();
    await flush();

    expect(host.manager.calls).toEqual([]);
    expect(host.got).toEqual([]);
  });

  it('is disabled while the manager loads, so a second pick cannot race the first', () => {
    const fixture = attach(ManagedHost);
    const host = fixture.componentInstance;
    host.manager.loadingState.set('loading');
    fixture.detectChanges();

    expect(trigger(fixture).disabled).toBe(true);
    expect(root(fixture).querySelector('.rv-select-popup-panel')).toBeNull();
  });

  it('lets a later pick of the current language supersede an in-flight switch', async () => {
    const fixture = attach(ManagedHost);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    await open(fixture);

    row(fixture, 'en')?.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    // The user changes their mind and re-picks the language that is still
    // current. No manager call is made for it, but the pending `en` switch is
    // now stale and must not be announced.
    await open(fixture);
    row(fixture, 'ar')?.click();
    fixture.detectChanges();
    TestBed.flushEffects();
    await flush();

    host.manager.settle('en');
    await flush();
    fixture.detectChanges();

    expect(host.manager.calls).toEqual(['en']);
    expect(host.got).toEqual([]);
    // The manager still applied `en`; the trigger follows the manager, never
    // the superseded intent.
    expect(valueText(fixture)).toBe('English');
  });

  it('emits nothing for an outvoted overlapping call', async () => {
    const fixture = attach(ManagedHost);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    await open(fixture);

    row(fixture, 'en')?.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    await open(fixture);
    row(fixture, 'de')?.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    host.manager.settle('de');
    await flush();
    host.manager.settle();
    await flush();

    expect(host.manager.calls).toEqual(['en', 'de']);
    expect(host.got).toEqual(['de']);
  });
});

describe('RiviniaLanguageSelect — presentational', () => {
  it('emits synchronously and keeps the picked row selected until [current] changes', async () => {
    const fixture = attach(PresentationalHost);
    const host = fixture.componentInstance;
    fixture.detectChanges();
    await open(fixture);

    row(fixture, 'de')?.click();
    fixture.detectChanges();
    TestBed.flushEffects();

    expect(host.got).toEqual(['de']);
    expect(valueText(fixture)).toBe('Deutsch');

    host.current.set('en');
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(valueText(fixture)).toBe('English');
  });

  it('blocks opening when [disabled] is set', () => {
    const fixture = attach(PresentationalHost);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();

    expect(trigger(fixture).disabled).toBe(true);
    expect(root(fixture).querySelector('.rv-select-popup-panel')).toBeNull();
  });
});

describe('RiviniaLanguageSelect — select pass-through', () => {
  it('passes label, popup label, search, empty text and variant to rv-select', async () => {
    const fixture = attach(ConfiguredHost);
    fixture.detectChanges();

    expect(root(fixture).querySelector('.rv-select-caption')?.textContent?.trim()).toBe(
      'Language',
    );
    expect(root(fixture).querySelector('rv-select')?.getAttribute('data-variant')).toBe('premium');

    await open(fixture);

    expect(root(fixture).querySelector('.rv-select-popup-panel')?.getAttribute('aria-label')).toBe(
      'Choose a language',
    );
    const search = root(fixture).querySelector<HTMLInputElement>('.rv-select-search');
    expect([search?.getAttribute('aria-label'), search?.placeholder]).toEqual([
      'Filter languages',
      'Type a language',
    ]);

    search!.value = 'deu';
    search!.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();

    expect(
      rows(fixture).map((item) => item.querySelector('.rv-select-label')?.textContent?.trim()),
    ).toEqual(['Deutsch']);

    search!.value = 'zzz';
    search!.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();

    expect(root(fixture).querySelector('.rv-select-empty')?.textContent?.trim()).toBe(
      'Nothing here',
    );
  });
});
