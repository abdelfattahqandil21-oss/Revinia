import type { Type } from '@angular/core';
import { Component, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RiviniaLanguageToggle } from '../ui/src/lib/components/language-toggle/language-toggle';
import type { LanguageLike, RiviniaLanguageManager } from '../ui/src/lib/models/language-view';

const AR: LanguageLike = { id: 'ar', nativeName: 'العربية', dir: 'rtl' };
const EN: LanguageLike = { id: 'en', nativeName: 'English', dir: 'ltr' };
const FR: LanguageLike = { id: 'fr', nativeName: 'Français', dir: 'ltr' };

class FakeManager implements RiviniaLanguageManager {
  readonly languages = signal<readonly LanguageLike[]>([AR, EN]);
  readonly currentLanguage = signal('ar');
  readonly loadingState = signal<'idle' | 'loading' | 'error'>('idle');
  readonly calls: string[] = [];

  setLanguageAsync(id: string): Promise<void> {
    this.calls.push(id);
    return Promise.resolve();
  }
}

@Component({
  imports: [RiviniaLanguageToggle],
  template: `<rv-language-toggle
    [languages]="languages"
    [current]="current"
    [busy]="busy"
    [disabled]="disabled"
    label="Switch language"
    (languageChange)="onChange($event)"
  />`,
})
class PresentationalHost {
  languages: readonly LanguageLike[] = [AR, EN];
  current = 'ar';
  busy = false;
  disabled = false;
  readonly got: string[] = [];

  onChange(id: string): void {
    this.got.push(id);
  }
}

@Component({
  imports: [RiviniaLanguageToggle],
  template: `<rv-language-toggle
    [manager]="manager"
    label="Switch language"
    (languageChange)="onChange($event)"
  />`,
})
class ManagedHost {
  readonly manager = new FakeManager();
  readonly got: string[] = [];

  onChange(id: string): void {
    this.got.push(id);
  }
}

const attached: HTMLElement[] = [];

function attach<T>(type: Type<T>): ComponentFixture<T> {
  const fixture = TestBed.createComponent(type);
  document.body.appendChild(fixture.nativeElement);
  attached.push(fixture.nativeElement);
  return fixture;
}

function button(fixture: ComponentFixture<unknown>): HTMLButtonElement | null {
  return (fixture.nativeElement as HTMLElement).querySelector('button');
}

function componentHost(fixture: ComponentFixture<unknown>): HTMLElement {
  const host = (fixture.nativeElement as HTMLElement).querySelector('rv-language-toggle');
  if (host === null) {
    throw new Error('rv-language-toggle is not in the fixture DOM');
  }
  return host as HTMLElement;
}

function dataAttrs(fixture: ComponentFixture<unknown>): string[] {
  return Array.from(componentHost(fixture).attributes)
    .map((attribute) => attribute.name)
    .filter((name) => name.startsWith('data-'));
}

beforeEach(() => {
  TestBed.resetTestingModule();
});

afterEach(() => {
  while (attached.length > 0) {
    attached.pop()?.remove();
  }
  vi.restoreAllMocks();
});

describe('RiviniaLanguageToggle — shape', () => {
  it('shows the other language, not the current one', () => {
    const fixture = attach(PresentationalHost);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('.rv-language-toggle__name')
        ?.textContent?.trim(),
    ).toBe('English');
  });

  it('puts lang and dir on the inner button, never on the host', () => {
    const fixture = attach(PresentationalHost);
    fixture.detectChanges();
    const inner = button(fixture);

    expect([inner?.getAttribute('lang'), inner?.getAttribute('dir')]).toEqual(['en', 'ltr']);
    expect(componentHost(fixture).hasAttribute('dir')).toBe(false);
  });

  it('marks the two-language shape on the host', () => {
    const fixture = attach(PresentationalHost);
    fixture.detectChanges();

    expect(componentHost(fixture).getAttribute('data-languages')).toBe('2');
  });

  it('composes the accessible name from the visible name and the label', () => {
    const fixture = attach(PresentationalHost);
    fixture.detectChanges();

    expect(button(fixture)?.getAttribute('aria-label')).toBe('English, Switch language');
  });
});

describe('RiviniaLanguageToggle — busy', () => {
  it('carries aria-busy and nothing else while the manager loads', () => {
    const fixture = attach(ManagedHost);
    fixture.componentInstance.manager.loadingState.set('loading');
    fixture.detectChanges();
    const inner = button(fixture);

    expect(inner?.getAttribute('aria-busy')).toBe('true');
    expect(inner?.hasAttribute('aria-disabled')).toBe(false);
    expect(inner?.hasAttribute('disabled')).toBe(false);
  });

  it('ignores activation while the manager loads (managed)', () => {
    const fixture = attach(ManagedHost);
    const manager = fixture.componentInstance.manager;
    manager.loadingState.set('loading');
    fixture.detectChanges();

    button(fixture)?.click();

    expect(manager.calls).toEqual([]);
  });

  it('ignores activation while [busy] is set (presentational)', () => {
    const fixture = attach(PresentationalHost);
    fixture.componentInstance.busy = true;
    fixture.detectChanges();

    button(fixture)?.click();

    expect(fixture.componentInstance.got).toEqual([]);
  });
});

describe('RiviniaLanguageToggle — disabled', () => {
  it('sets the native disabled attribute and blocks activation', () => {
    const fixture = attach(PresentationalHost);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();
    const inner = button(fixture);

    inner?.click();

    expect(inner?.disabled).toBe(true);
    expect(fixture.componentInstance.got).toEqual([]);
  });

  it('mirrors [disabled] on the host without claiming the ≥3 shape', () => {
    const fixture = attach(PresentationalHost);
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();

    expect(componentHost(fixture).hasAttribute('data-disabled')).toBe(true);
    expect(componentHost(fixture).getAttribute('data-languages')).toBe('2');
  });
});

describe('RiviniaLanguageToggle — language count', () => {
  it('renders nothing with zero languages and carries no data-* attribute', () => {
    const fixture = attach(PresentationalHost);
    fixture.componentInstance.languages = [];
    fixture.componentInstance.busy = true;
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();

    expect(button(fixture)).toBeNull();
    expect(dataAttrs(fixture)).toEqual([]);
  });

  it('renders nothing with one language and carries no data-* attribute', () => {
    const fixture = attach(PresentationalHost);
    fixture.componentInstance.languages = [AR];
    fixture.componentInstance.busy = true;
    fixture.componentInstance.disabled = true;
    fixture.detectChanges();

    expect(button(fixture)).toBeNull();
    expect(dataAttrs(fixture)).toEqual([]);
  });

  it('at three languages marks the button aria-disabled, never natively disabled', () => {
    const fixture = attach(PresentationalHost);
    fixture.componentInstance.languages = [AR, EN, FR];
    fixture.detectChanges();
    const inner = button(fixture);

    expect(inner?.getAttribute('aria-disabled')).toBe('true');
    expect(inner?.hasAttribute('disabled')).toBe(false);
  });

  it('at three languages leaves the button focusable', () => {
    const fixture = attach(PresentationalHost);
    fixture.componentInstance.languages = [AR, EN, FR];
    fixture.detectChanges();
    const inner = button(fixture);

    inner?.focus();

    expect(document.activeElement).toBe(inner);
  });

  it('at three languages signals data-languages="many", not data-disabled', () => {
    const fixture = attach(PresentationalHost);
    fixture.componentInstance.languages = [AR, EN, FR];
    fixture.detectChanges();
    const host = componentHost(fixture);

    expect(host.getAttribute('data-languages')).toBe('many');
    expect(host.hasAttribute('data-disabled')).toBe(false);
  });

  it('at three languages warns one dev line per component instance', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const first = attach(PresentationalHost);
    first.componentInstance.languages = [AR, EN, FR];
    first.detectChanges();
    first.detectChanges();
    const second = attach(PresentationalHost);
    second.componentInstance.languages = [AR, EN, FR];
    second.detectChanges();
    second.detectChanges();

    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('at three languages never activates, even while the manager loads', () => {
    const fixture = attach(ManagedHost);
    const manager = fixture.componentInstance.manager;
    manager.languages.set([AR, EN, FR]);
    manager.loadingState.set('loading');
    fixture.detectChanges();
    const inner = button(fixture);

    inner?.click();

    expect(inner?.getAttribute('aria-busy')).toBe('true');
    expect(inner?.getAttribute('aria-disabled')).toBe('true');
    expect(manager.calls).toEqual([]);
  });
});
