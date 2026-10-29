import type { Type } from '@angular/core';
import { Component, signal } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RiviniaLanguageToggle } from '../ui/src/lib/components/language-toggle/language-toggle';
import type { LanguageLike, RiviniaLanguageManager } from '../ui/src/lib/models/language-view';

const AR: LanguageLike = { id: 'ar', nativeName: 'العربية', dir: 'rtl' };
const EN: LanguageLike = { id: 'en', nativeName: 'English', dir: 'ltr' };
const FR: LanguageLike = { id: 'fr', nativeName: 'Français', dir: 'ltr' };

/** Every switch stays pending until the test settles it, so the post-await check is observable. */
class ManualManager implements RiviniaLanguageManager {
  readonly languages = signal<readonly LanguageLike[]>([AR, EN]);
  readonly currentLanguage = signal('ar');
  readonly loadingState = signal<'idle' | 'loading' | 'error'>('idle');
  readonly calls: string[] = [];
  private readonly pending: Array<() => void> = [];

  setLanguageAsync(id: string): Promise<void> {
    this.calls.push(id);
    return new Promise<void>((resolve) => {
      this.pending.push(resolve);
    });
  }

  settle(apply?: string): void {
    if (apply !== undefined) {
      this.currentLanguage.set(apply);
    }
    this.pending.shift()?.();
  }
}

@Component({
  imports: [RiviniaLanguageToggle],
  template: `<rv-language-toggle
    [manager]="manager"
    [languages]="decoy"
    [current]="decoyCurrent"
    label="Switch language"
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

describe('RiviniaLanguageToggle — manager mode', () => {
  it('lets the manager beat [languages] and [current]', () => {
    const fixture = attach(ManagedHost);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.rv-language-toggle__name')
        ?.textContent?.trim(),
    ).toBe('English');
  });

  it('calls setLanguageAsync exactly once with the target id', () => {
    const fixture = attach(ManagedHost);
    fixture.detectChanges();

    button(fixture)?.click();

    expect(fixture.componentInstance.manager.calls).toEqual(['en']);
  });

  it('calls nothing when the target already is the current language', () => {
    const fixture = attach(ManagedHost);
    const manager = fixture.componentInstance.manager;
    fixture.detectChanges();
    manager.currentLanguage.set('en');

    button(fixture)?.click();

    expect(manager.calls).toEqual([]);
  });

  it('emits only after the await confirms the switch', async () => {
    const fixture = attach(ManagedHost);
    const host = fixture.componentInstance;
    fixture.detectChanges();

    button(fixture)?.click();
    await flush();
    expect(host.got).toEqual([]);

    host.manager.settle('en');
    await flush();
    expect(host.got).toEqual(['en']);
  });

  it('emits nothing when the manager leaves the language unchanged', async () => {
    const fixture = attach(ManagedHost);
    const host = fixture.componentInstance;
    fixture.detectChanges();

    button(fixture)?.click();
    host.manager.settle();
    await flush();

    expect(host.got).toEqual([]);
  });

  it('emits nothing for an outvoted overlapping call', async () => {
    const fixture = attach(ManagedHost);
    const host = fixture.componentInstance;
    fixture.detectChanges();

    button(fixture)?.click();
    host.manager.currentLanguage.set('fr');
    host.manager.settle();
    await flush();

    expect(host.got).toEqual([]);
  });
});
