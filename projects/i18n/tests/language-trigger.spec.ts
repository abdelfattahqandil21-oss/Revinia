import type { Type } from '@angular/core';
import { Component } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RiviniaLanguageToggle } from '../ui/src/lib/components/language-toggle/language-toggle';
import { RiviniaLanguageTrigger } from '../ui/src/lib/components/language-toggle/language-trigger.directive';
import type { LanguageLike } from '../ui/src/lib/models/language-view';

const AR: LanguageLike = { id: 'ar', nativeName: 'العربية', dir: 'rtl' };
const EN: LanguageLike = { id: 'en', nativeName: 'English', dir: 'ltr' };

@Component({
  imports: [RiviniaLanguageToggle, RiviniaLanguageTrigger],
  template: `<rv-language-toggle [languages]="languages" [current]="current" [busy]="busy" [label]="label">
    <ng-template rvLanguageTrigger let-lang let-busy="busy">
      <span class="custom">{{ lang.id }}/{{ busy }}</span>
    </ng-template>
  </rv-language-toggle>`,
})
class TriggerHost {
  languages: readonly LanguageLike[] = [AR, EN];
  current = 'ar';
  busy = true;
  label: string | undefined = 'Switch language';
}

@Component({
  imports: [RiviniaLanguageToggle],
  template: `<rv-language-toggle [languages]="languages" [current]="current" />`,
})
class PlainHost {
  readonly languages: readonly LanguageLike[] = [AR, EN];
  readonly current = 'ar';
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

function custom(fixture: ComponentFixture<unknown>): Element | null {
  return (fixture.nativeElement as HTMLElement).querySelector('.custom');
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

describe('RiviniaLanguageTrigger', () => {
  it('renders the template with the target and the busy flag as context', () => {
    const fixture = attach(TriggerHost);
    fixture.detectChanges();

    expect(custom(fixture)?.textContent?.trim()).toBe('en/true');
  });

  it('does not instantiate the template before the first render', () => {
    const fixture = attach(TriggerHost);

    expect(custom(fixture)).toBeNull();

    fixture.detectChanges();
    expect(custom(fixture)).not.toBeNull();
  });

  it('does not instantiate the template when no button is rendered', () => {
    const fixture = attach(TriggerHost);
    fixture.componentInstance.languages = [AR];
    fixture.detectChanges();

    expect(button(fixture)).toBeNull();
    expect(custom(fixture)).toBeNull();
  });

  it('renders the default name span when no template is given', () => {
    const fixture = attach(PlainHost);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.rv-language-toggle__name')
        ?.textContent?.trim(),
    ).toBe('English');
  });

  it('warns once without a label but keeps a non-empty accessible name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = attach(TriggerHost);
    fixture.componentInstance.label = undefined;
    fixture.detectChanges();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(button(fixture)?.getAttribute('aria-label')).toBeTruthy();
  });
});
