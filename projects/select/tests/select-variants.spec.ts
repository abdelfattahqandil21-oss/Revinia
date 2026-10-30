import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Component } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { RiviniaSelectComponent } from '../ui/src/lib/components/select/select-panel';
import { SelectPopupComponent, SelectPopupItem } from '../ui/src/lib/components/popup/select-popup';

/**
 * Two skins, one DOM. `simple` is 0.6.1 unchanged; `premium` is CSS only,
 * selected by a flag that reflects onto `data-variant`.
 *
 * The flag has to reach BOTH hosts: the select's own (trigger, caption,
 * search) and the vendored popup's (panel surface, rows, scrollbar). A select
 * that sets only its own attribute leaves the panel unstyled — the panel
 * belongs to `<rv-select-popup>`, not to `<rv-select>`.
 */
const SELECT_CSS = join(
  process.cwd(),
  'projects/select/ui/src/lib/components/select/select-panel.css',
);
const POPUP_CSS = join(
  process.cwd(),
  'projects/select/ui/src/lib/components/popup/select-popup.css',
);

@Component({
  imports: [RiviniaSelectComponent],
  template: `<rv-select [options]="options" [value]="value" [variant]="variant" />`,
})
class SelectHost {
  readonly options = [
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta' },
  ];
  value: string | null = 'b';
  variant: 'simple' | 'premium' = 'simple';
}

@Component({
  imports: [SelectPopupComponent, SelectPopupItem],
  template: `
    <rv-select-popup [variant]="variant">
      <button rv-select-popup-trigger type="button">Open</button>
      <div rv-select-popup-panel>
        <button rvSelectPopupItem id="one">One</button>
      </div>
    </rv-select-popup>
  `,
})
class PopupHost {
  variant: 'simple' | 'premium' = 'premium';
}

function open(fixture: ComponentFixture<unknown>): HTMLElement {
  const trigger = fixture.nativeElement.querySelector(
    '.rv-select-popup-trigger button, .rv-select-trigger',
  ) as HTMLElement;
  trigger.click();
  fixture.detectChanges();
  TestBed.flushEffects();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

function rule(css: string, selector: string): string {
  const at = css.indexOf(`${selector} {`);
  if (at === -1) return '';
  return css.slice(at, css.indexOf('}', at));
}

/** Selector assertions must not trip over prose inside block comments. */
function code(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

beforeEach(() => {
  TestBed.resetTestingModule();
});

describe('select variant flag', () => {
  it('defaults to simple on both hosts', () => {
    const fixture = TestBed.createComponent(SelectHost);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;

    expect(host.querySelector('rv-select')?.getAttribute('data-variant')).toBe('simple');
    expect(host.querySelector('rv-select-popup')?.getAttribute('data-variant')).toBe('simple');
  });

  it('carries premium from the select down to the vendored popup', () => {
    const fixture = TestBed.createComponent(SelectHost);
    fixture.componentInstance.variant = 'premium';
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;

    expect(host.querySelector('rv-select')?.getAttribute('data-variant')).toBe('premium');
    expect(host.querySelector('rv-select-popup')?.getAttribute('data-variant')).toBe('premium');
  });

  it('sets the flag on a standalone popup too', () => {
    const fixture = TestBed.createComponent(PopupHost);
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement)
        .querySelector('rv-select-popup')
        ?.getAttribute('data-variant'),
    ).toBe('premium');
  });

  it('marks the selected row, and only that row', () => {
    const fixture = TestBed.createComponent(SelectHost);
    fixture.detectChanges();
    const host = open(fixture);

    const rows = [...host.querySelectorAll('.rv-select-popup-panel [data-rv-id]')];
    expect(rows.map((row) => row.getAttribute('data-rv-id'))).toEqual(['a', 'b']);
    expect(rows[0].getAttribute('data-selected')).toBeNull();
    expect(rows[1].getAttribute('data-selected')).toBe('true');
  });
});

describe('premium skin is CSS only, behind the flag', () => {
  it('scopes both skins to their host attribute', () => {
    const popup = readFileSync(POPUP_CSS, 'utf8');
    const select = readFileSync(SELECT_CSS, 'utf8');

    expect(
      rule(
        popup,
        "rv-select-popup[data-variant='premium'] .rv-select-popup-panel [rvselectpopupitem][data-active='true']",
      ),
    ).toMatch(/--rv-select-item-active-bg/);
    expect(rule(select, "rv-select[data-variant='premium'] .rv-select-trigger")).toMatch(
      /--rv-select-trigger-shadow/,
    );
  });

  it('keeps the entrance timing overridable, with 0.6.1 defaults', () => {
    const popup = readFileSync(POPUP_CSS, 'utf8');

    expect(popup).toMatch(/scale\(var\(--rv-select-popup-from-scale,\s*0\.96\)\)/);
    // 250ms open / 0.22, 1, 0.36, 1 — the design-token dropdown pair.
    expect(rule(popup, "rv-select-popup[data-variant='premium'] .rv-select-popup-panel")).toMatch(
      /--rv-select-popup-duration:\s*250ms/,
    );
    expect(rule(popup, "rv-select-popup[data-variant='premium'] .rv-select-popup-panel")).toMatch(
      /--rv-select-popup-easing:\s*cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)/,
    );
  });

  it('styles the scrollbar with standard properties only', () => {
    const popup = code(readFileSync(POPUP_CSS, 'utf8'));
    const panel = rule(popup, "rv-select-popup[data-variant='premium'] .rv-select-popup-panel");

    expect(panel).toMatch(/scrollbar-width:\s*thin/);
    expect(panel).toMatch(/scrollbar-color:/);
    // Chromium ignores the vendor pseudo-elements once scrollbar-color is set.
    expect(popup).not.toMatch(/::-webkit-scrollbar[^{]*\{/);
  });

  it('shows skeleton rows only in premium, and keeps the label', () => {
    const select = readFileSync(SELECT_CSS, 'utf8');

    expect(rule(select, '.rv-select-skeleton')).toMatch(/display:\s*none/);
    expect(rule(select, "rv-select[data-variant='premium'] .rv-select-skeleton")).toMatch(
      /display:\s*flex/,
    );
    expect(select).not.toMatch(/transition:\s*all/);
  });

  it('backs every motion with a reduced-motion guard', () => {
    for (const css of [readFileSync(POPUP_CSS, 'utf8'), readFileSync(SELECT_CSS, 'utf8')]) {
      expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/);
    }
    // The skeleton loop lives beside the loading row; its guard has to stop it,
    // or the bars keep pulsing for a user who asked for less motion.
    const select = readFileSync(SELECT_CSS, 'utf8');
    expect(select).toMatch(/@keyframes rv-select-shimmer/);
    expect(select.slice(select.lastIndexOf('@media (prefers-reduced-motion: reduce)'))).toMatch(
      /rv-select-skeleton[\s\S]*animation:\s*none/,
    );
  });
});
