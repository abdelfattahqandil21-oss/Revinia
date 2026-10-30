import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { RiviniaSelect } from '../src/lib/services/rivinia-select';
import { RiviniaSelectComponent } from '../ui/src/lib/components/select/select-panel';

/**
 * The search used to be a plain first child of the panel, and the panel is the
 * scrollport — so scrolling the list carried the input out of view (measured
 * in Chromium: top 7px -> -154px after a 300px scroll).
 *
 * Pinning it is not a CSS one-liner a consumer can add safely: the input
 * paints transparent by design, so a sticky input lets rows slide visibly
 * underneath it (measured on the consumer override that pinned the input:
 * `position: sticky` applied while `background` computed to `rgba(0, 0, 0, 0)`).
 * Hence the wrapper owns both the stickiness and the paint.
 */
const CSS_FILE = join(
  process.cwd(),
  'projects/select/ui/src/lib/components/select/select-panel.css',
);

function block(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) return '';
  return css.slice(start, css.indexOf('}', start));
}

@Component({
  imports: [RiviniaSelectComponent],
  template: `<rv-select [select]="select" [options]="options" [searchable]="searchable" />`,
})
class SearchHarness {
  readonly select = new RiviniaSelect('single');
  readonly options = [{ id: 'a', label: 'A' }];
  searchable = true;
}

beforeEach(() => {
  TestBed.resetTestingModule();
});

describe('select search stays reachable while the list scrolls', () => {
  it('pins the search bar on the panel surface', () => {
    const css = readFileSync(CSS_FILE, 'utf8');
    const bar = block(css, '.rv-select-search-bar');

    expect(bar).not.toBe('');
    expect(bar).toMatch(/position:\s*sticky/);
    expect(bar).toMatch(/top:\s*0/);
    // Opaque paint, resolved from the same token the panel paints itself with.
    expect(bar).toMatch(/background:[^;]*--rv-select-popup-bg/);
    // The input stays transparent: the bar supplies the paint.
    expect(block(css, '.rv-select-search')).toMatch(/background:\s*transparent/);
  });

  it('keeps keyboard-scrolled rows clear of the pinned bar', () => {
    const css = readFileSync(CSS_FILE, 'utf8');
    // The scrollport is the OUTER popup panel; the select's own div is
    // projected inside it, so an inset declared there would do nothing.
    const rule = block(css, '.rv-select .rv-select-popup-panel:has(.rv-select-search-bar)');

    expect(rule).toMatch(/scroll-padding-top:/);
  });

  it('leaves no strip of the list above the pinned bar', () => {
    const css = readFileSync(CSS_FILE, 'utf8');
    // The scrollport's padding sits OUTSIDE the bar's containing block, and a
    // sticky box is clamped to that block — so `top: 0` stopped at the content
    // edge and rows stayed visible in the 7px strip between the panel's border
    // and the bar (measured 6px padding + 1px border at every scroll offset).
    // The bar carries that padding instead, so its top edge is the content edge.
    const scrollport = block(css, '.rv-select .rv-select-popup-panel:has(.rv-select-search-bar)');

    expect(scrollport).toMatch(/padding-top:\s*0/);
    expect(block(css, '.rv-select-search-bar')).toMatch(
      /padding-top:\s*var\(--rv-select-popup-pad/,
    );
  });

  it('puts the search input inside the sticky bar', async () => {
    const fixture = TestBed.createComponent(SearchHarness);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.rv-select-trigger') as HTMLElement).click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();
    const host: HTMLElement = fixture.nativeElement;

    expect(host.querySelector('.rv-select-search-bar > .rv-select-search')).not.toBeNull();
  });

  it('renders no bar when the select is not searchable', async () => {
    const fixture = TestBed.createComponent(SearchHarness);
    fixture.componentInstance.searchable = false;
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.rv-select-trigger') as HTMLElement).click();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    await Promise.resolve();
    const host: HTMLElement = fixture.nativeElement;

    expect(host.querySelector('.rv-select-search-bar')).toBeNull();
  });
});
