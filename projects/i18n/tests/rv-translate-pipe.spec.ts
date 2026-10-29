import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { customLoader } from '../src/lib/models/loaders';
import type { Translation } from '../src/lib/models/i18n-types';
import { provideRiviniaI18n } from '../src/lib/providers/provide-i18n';
import { RvTranslatePipe } from '../src/lib/pipes/rv-translate.pipe';
import { RiviniaI18n } from '../src/lib/services/rivinia-i18n';

const AR = { id: 'ar', dir: 'rtl' } as const;
const EN = { id: 'en', dir: 'ltr' } as const;
const INLINE: Translation<'ar' | 'en'> = { ar: 'مباشر', en: 'Inline' };

@Component({
  template: `
    <p id="rv">{{ 'hello' | rvTranslate }}</p>
    <p id="params">{{ 'items' | rvTranslate: { count: 3 } }}</p>
    <p id="default">{{ 'missing.key' | rvTranslate: 'Fallback' }}</p>
    <p id="object">{{ inline | rvTranslate }}</p>
  `,
  imports: [RvTranslatePipe],
})
class RvHost {
  readonly inline = INLINE;
}

beforeEach(() => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRiviniaI18n({
        defaultLanguage: 'ar',
        languages: [AR, EN],
        storageStrategy: 'none',
        preload: false,
        translations: { ar: { hello: 'مرحبا', items: '{count, plural, one {# عنصر} other {# عناصر}}' } },
        loader: customLoader(async (language) =>
          language === 'en'
            ? { hello: 'Hello', items: '{count, plural, one {# item} other {# items}}' }
            : { hello: 'مرحبا', items: '{count, plural, one {# عنصر} other {# عناصر}}' },
        ),
      }),
    ],
  });
});

function text(fixture: ReturnType<typeof TestBed.createComponent>, id: string): string {
  return (fixture.nativeElement.querySelector(`#${id}`) as HTMLElement).textContent ?? '';
}

describe('rvTranslate', () => {
  it('translates and re-renders on a language switch', async () => {
    const fixture = TestBed.createComponent(RvHost);
    fixture.detectChanges();
    expect(text(fixture, 'rv')).toBe('مرحبا');

    await TestBed.inject(RiviniaI18n).setLanguageAsync('en');
    fixture.detectChanges();
    expect(text(fixture, 'rv')).toBe('Hello');
  });

  it('renders ICU params with the active locale', async () => {
    const fixture = TestBed.createComponent(RvHost);
    fixture.detectChanges();
    expect(text(fixture, 'params')).toBe('3 عناصر');

    await TestBed.inject(RiviniaI18n).setLanguageAsync('en');
    fixture.detectChanges();
    expect(text(fixture, 'params')).toBe('3 items');
  });

  it('uses the defaultValue when the key resolves nowhere', () => {
    const fixture = TestBed.createComponent(RvHost);
    fixture.detectChanges();
    expect(text(fixture, 'default')).toBe('Fallback');
  });

  it('resolves a translation object to the active language', async () => {
    const fixture = TestBed.createComponent(RvHost);
    fixture.detectChanges();
    expect(text(fixture, 'object')).toBe('مباشر');

    await TestBed.inject(RiviniaI18n).setLanguageAsync('en');
    fixture.detectChanges();
    expect(text(fixture, 'object')).toBe('Inline');
  });
});
