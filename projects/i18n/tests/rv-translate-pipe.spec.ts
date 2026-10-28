import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { customLoader } from '../src/lib/models/loaders';
import { provideRiviniaI18n } from '../src/lib/providers/provide-i18n';
import { RTranslatePipe, RvTranslatePipe } from '../src/lib/pipes/rv-translate.pipe';
import { RiviniaI18n } from '../src/lib/services/rivinia-i18n';

const AR = { id: 'ar', dir: 'rtl' } as const;
const EN = { id: 'en', dir: 'ltr' } as const;

@Component({
  template: `<p id="rv">{{ 'hello' | rvTranslate }}</p>`,
  imports: [RvTranslatePipe],
})
class RvHost {}

@Component({
  template: `<p id="r">{{ 'hello' | rTranslate }}</p>`,
  imports: [RTranslatePipe],
})
class RHost {}

beforeEach(() => {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [
      provideRiviniaI18n({
        defaultLanguage: 'ar',
        languages: [AR, EN],
        storageStrategy: 'none',
        preload: false,
        translations: { ar: { hello: 'مرحبا' }, en: { hello: 'Hello' } },
        loader: customLoader(async (language) =>
          language === 'en' ? { hello: 'Hello' } : { hello: 'مرحبا' },
        ),
      }),
    ],
  });
});

describe('rvTranslate pipe', () => {
  it('translates and re-renders on a language switch', async () => {
    const fixture = TestBed.createComponent(RvHost);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('#rv') as HTMLElement;
    expect(el.textContent).toBe('مرحبا');

    await TestBed.inject(RiviniaI18n).setLanguageAsync('en');
    fixture.detectChanges();
    expect(el.textContent).toBe('Hello');
  });
});

describe('rTranslate alias', () => {
  it('still translates through the old selector', () => {
    const fixture = TestBed.createComponent(RHost);
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('#r') as HTMLElement).textContent).toBe('مرحبا');
  });
});
