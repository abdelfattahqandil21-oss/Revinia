/**
 * The custom option row.
 *
 * `optionTemplate` replaces the default row (label + hint + check mark) with
 * the consumer's own markup. That is the escape hatch for icons, avatars,
 * badges and group headers — the option shape has no icon field, and adding
 * one would put raw HTML in the library's hands.
 */
import { Component, signal, TemplateRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { RiviniaSelectComponent } from '../../ui/src/lib/components/select/select-panel';
import type { RiviniaSelectOption } from '@rivinia/select';

interface IconOption extends RiviniaSelectOption {
  readonly icon: string;
}

@Component({
  imports: [RiviniaSelectComponent],
  template: `
    <ng-template #row let-option>
      <img class="row-icon" [src]="option.icon" alt="" />
      <span class="row-label">{{ option.label }}</span>
    </ng-template>

    <rv-select
      label="Icon picker"
      [options]="options()"
      [optionTemplate]="row"
    />
  `,
})
class IconHost {
  readonly options = signal<readonly IconOption[]>([
    { id: 'a', label: 'Alpha', icon: '/a.svg' },
    { id: 'b', label: 'Beta', icon: '/b.svg' },
  ]);
}

@Component({
  imports: [RiviniaSelectComponent],
  template: `
    <rv-select label="Plain" [options]="options()" />
  `,
})
class PlainHost {
  readonly options = signal<readonly RiviniaSelectOption[]>([
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta', hint: 'Ctrl+B' },
  ]);
}

describe('the custom option row', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [IconHost, PlainHost] }));

  it('renders the consumer markup instead of the default row', () => {
    const fixture = TestBed.createComponent(IconHost);
    fixture.detectChanges();

    // open the panel
    (fixture.nativeElement as HTMLElement)
      .querySelector('.rv-select-trigger')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.row-icon').length).toBe(2);
    expect(host.querySelector('.row-label')?.textContent).toContain('Alpha');
  });

  it('keeps the default row when no template is supplied', () => {
    const fixture = TestBed.createComponent(PlainHost);
    fixture.detectChanges();

    (fixture.nativeElement as HTMLElement)
      .querySelector('.rv-select-trigger')
      ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.row-icon').length).toBe(0);
    expect(host.querySelector('.rv-select-label')?.textContent).toContain('Alpha');
  });
});
