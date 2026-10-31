/**
 * Multi-select trigger summary and its accessible description.
 *
 * The trigger shows the first pick plus `+N`; the full list lives in a
 * visually hidden sibling referenced by `aria-describedby`. Everything here is
 * asserted through the rendered DOM: the trigger's text, the pill's markup,
 * and the element the description ID resolves to.
 */
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  formatSelectionList,
  formatterFor,
  resolveListLocale,
} from '../ui/src/lib/utils/selection-summary';
import { RiviniaSelectComponent } from '../ui/src/lib/components/select/select-panel';

const OPTIONS = [
  { id: 'ts', label: 'TypeScript' },
  { id: 'ng', label: 'Angular' },
  { id: 'sig', label: 'Signals' },
  { id: 'rx', label: 'RxJS' },
  { id: 'vit', label: 'Vitest' },
  { id: 'pw', label: 'Playwright' },
  { id: 'es', label: 'esbuild' },
  { id: 'tw', label: 'Tailwind' },
];

/** Multi mode with a visible caption, the field's name source. */
@Component({
  imports: [RiviniaSelectComponent],
  template: `<rv-select mode="multi" label="Skills" [options]="options" [value]="picked()" />`,
})
class CaptionHarness {
  readonly options = OPTIONS;
  readonly picked = signal<readonly string[]>([]);
}

/** Multi mode without a caption or ariaLabel: the name comes from content. */
@Component({
  imports: [RiviniaSelectComponent],
  template: `<rv-select mode="multi" [options]="options" [value]="picked()" />`,
})
class PlainMultiHarness {
  readonly options = OPTIONS;
  readonly picked = signal<readonly string[]>([]);
}

/** Multi mode named only by ariaLabel. */
@Component({
  imports: [RiviniaSelectComponent],
  template: `<rv-select
    mode="multi"
    ariaLabel="Skills, screen-reader only"
    [options]="options"
    [value]="picked()"
  />`,
})
class AriaLabelHarness {
  readonly options = OPTIONS;
  readonly picked = signal<readonly string[]>([]);
}

/** Single mode, for the regression half of the contract. */
@Component({
  imports: [RiviniaSelectComponent],
  template: `<rv-select label="Skill" [options]="options" [value]="picked()" />`,
})
class SingleHarness {
  readonly options = OPTIONS;
  readonly picked = signal<string | null>(null);
}

interface FixtureLike {
  nativeElement: HTMLElement;
  detectChanges(): void;
}

function q<T extends Element = HTMLElement>(root: ParentNode, sel: string): T {
  const el = root.querySelector(sel);
  if (!el) throw new Error(`fixture is missing "${sel}"`);
  return el as T;
}

function qNull<T extends Element = HTMLElement>(root: ParentNode, sel: string): T | null {
  return root.querySelector(sel) as T | null;
}

/** Render + effects + post-render microtask. */
async function settle(fixture: FixtureLike): Promise<void> {
  fixture.detectChanges();
  TestBed.flushEffects();
  fixture.detectChanges();
  await Promise.resolve();
  fixture.detectChanges();
}

function trigger(host: HTMLElement): HTMLButtonElement {
  return q<HTMLButtonElement>(host, '.rv-select-trigger');
}

function valueText(host: HTMLElement): string {
  return q(host, '.rv-select-value').textContent?.trim() ?? '';
}

function descriptionTarget(host: HTMLElement): HTMLElement | null {
  const id = trigger(host).getAttribute('aria-describedby');
  return id ? (host.ownerDocument.getElementById(id) as HTMLElement | null) : null;
}

function descriptionText(host: HTMLElement): string {
  return descriptionTarget(host)?.textContent?.trim() ?? '';
}

/** The component instance under the harness. */
function view(fixture: {
  debugElement: { children: { componentInstance: unknown }[] };
}): RiviniaSelectComponent {
  return fixture.debugElement.children[0].componentInstance as RiviniaSelectComponent;
}

beforeEach(() => {
  TestBed.resetTestingModule();
});

/** The test page's own language, restored after every locale test. */
const PAGE_LANG = document.documentElement.getAttribute('lang');

afterEach(() => {
  if (PAGE_LANG === null) document.documentElement.removeAttribute('lang');
  else document.documentElement.setAttribute('lang', PAGE_LANG);
  vi.unstubAllGlobals();
});

describe('multi summary (0/1/2+)', () => {
  it('shows the placeholder, no pill and no description with no picks', async () => {
    const fixture = TestBed.createComponent(CaptionHarness);
    await settle(fixture);
    const host = fixture.nativeElement;

    expect(valueText(host)).toBe('Select…');
    expect(qNull(host, '.rv-select-count')).toBeNull();
    expect(trigger(host).hasAttribute('aria-describedby')).toBe(false);
    expect(qNull(host, '.rv-select-sr-only')).toBeNull();
  });

  it('shows the single label, no pill, and that label as the description', async () => {
    const fixture = TestBed.createComponent(CaptionHarness);
    await settle(fixture);
    const host = fixture.nativeElement;

    fixture.componentInstance.picked.set(['ts']);
    await settle(fixture);

    expect(valueText(host)).toBe('TypeScript');
    expect(qNull(host, '.rv-select-count')).toBeNull();
    expect(descriptionText(host)).toBe('TypeScript');
  });

  it('shows the first pick plus +1 for two picks, full list in the description', async () => {
    const fixture = TestBed.createComponent(CaptionHarness);
    await settle(fixture);
    const host = fixture.nativeElement;

    fixture.componentInstance.picked.set(['ts', 'ng']);
    await settle(fixture);

    expect(valueText(host)).toBe('TypeScript');
    expect(q(host, '.rv-select-count').textContent?.trim()).toBe('+1');
    expect(descriptionText(host)).toBe('TypeScript and Angular');
  });

  it('shows +7 for eight picks and keeps the description free of the count', async () => {
    const fixture = TestBed.createComponent(CaptionHarness);
    await settle(fixture);
    const host = fixture.nativeElement;

    fixture.componentInstance.picked.set(OPTIONS.map((o) => o.id));
    await settle(fixture);

    expect(valueText(host)).toBe('TypeScript');
    expect(q(host, '.rv-select-count').textContent?.trim()).toBe('+7');
    const text = descriptionText(host);
    expect(text).toContain('TypeScript');
    expect(text).toContain('Angular');
    expect(text).toContain('Tailwind');
    expect(text).not.toContain('+');
  });

  it('hides the pill from assistive technology and keeps +N LTR', async () => {
    const fixture = TestBed.createComponent(CaptionHarness);
    await settle(fixture);
    const host = fixture.nativeElement;

    fixture.componentInstance.picked.set(['ts', 'ng']);
    await settle(fixture);

    const pill = q(host, '.rv-select-count');
    expect(pill.getAttribute('aria-hidden')).toBe('true');
    expect(q(pill, 'bdi').getAttribute('dir')).toBe('ltr');
    // The chevron is the only other decorative child, and both are hidden.
    expect(q(host, '.rv-select-chevron').getAttribute('aria-hidden')).toBe('true');
  });

  it('promotes the next pick when the first is removed', async () => {
    const fixture = TestBed.createComponent(CaptionHarness);
    await settle(fixture);
    const host = fixture.nativeElement;

    fixture.componentInstance.picked.set(['ts', 'ng', 'sig']);
    await settle(fixture);
    expect(valueText(host)).toBe('TypeScript');
    expect(q(host, '.rv-select-count').textContent?.trim()).toBe('+2');

    fixture.componentInstance.picked.set(['ng', 'sig']);
    await settle(fixture);

    expect(valueText(host)).toBe('Angular');
    expect(q(host, '.rv-select-count').textContent?.trim()).toBe('+1');
    expect(descriptionText(host)).toBe('Angular and Signals');
  });

  it('drops the pill and the description when one pick remains (no caption)', async () => {
    const fixture = TestBed.createComponent(PlainMultiHarness);
    await settle(fixture);
    const host = fixture.nativeElement;

    fixture.componentInstance.picked.set(['ts', 'ng']);
    await settle(fixture);
    expect(trigger(host).hasAttribute('aria-labelledby')).toBe(false);
    expect(trigger(host).hasAttribute('aria-label')).toBe(false);
    expect(descriptionText(host)).toBe('Angular');

    fixture.componentInstance.picked.set(['ng']);
    await settle(fixture);

    expect(valueText(host)).toBe('Angular');
    expect(qNull(host, '.rv-select-count')).toBeNull();
    expect(trigger(host).hasAttribute('aria-describedby')).toBe(false);
    expect(qNull(host, '.rv-select-sr-only')).toBeNull();
  });
});

describe('description placement and clearing', () => {
  it('keeps the description outside the trigger', async () => {
    const fixture = TestBed.createComponent(CaptionHarness);
    await settle(fixture);
    const host = fixture.nativeElement;

    fixture.componentInstance.picked.set(['ts', 'ng']);
    await settle(fixture);

    expect(qNull(trigger(host), '.rv-select-sr-only')).toBeNull();
    const hidden = q(host, '.rv-select-sr-only');
    expect(hidden.closest('button')).toBeNull();
    expect(hidden.getAttribute('aria-hidden')).toBeNull();
    const id = trigger(host).getAttribute('aria-describedby');
    expect(id).not.toBeNull();
    expect(host.ownerDocument.getElementById(id as string)).toBe(hidden);
  });

  it('removes the description, its element and its ID on a full clear', async () => {
    const fixture = TestBed.createComponent(CaptionHarness);
    await settle(fixture);
    const host = fixture.nativeElement;

    fixture.componentInstance.picked.set(['ts', 'ng', 'sig']);
    await settle(fixture);
    const staleId = trigger(host).getAttribute('aria-describedby');
    expect(staleId).not.toBeNull();

    view(fixture).clear();
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(trigger(host).hasAttribute('aria-describedby')).toBe(false);
    expect(qNull(host, '.rv-select-sr-only')).toBeNull();
    expect(host.ownerDocument.getElementById(staleId as string)).toBeNull();
  });
});

describe('description per name source', () => {
  it('lists every label when a caption names the field', async () => {
    const fixture = TestBed.createComponent(CaptionHarness);
    await settle(fixture);
    const host = fixture.nativeElement;

    fixture.componentInstance.picked.set(OPTIONS.map((o) => o.id));
    await settle(fixture);

    expect(trigger(host).getAttribute('aria-labelledby')).not.toBeNull();
    expect(trigger(host).hasAttribute('aria-label')).toBe(false);
    expect(descriptionText(host)).toContain('TypeScript');
    expect(descriptionText(host)).toContain('Tailwind');
  });

  it('lists every label when ariaLabel names the field', async () => {
    const fixture = TestBed.createComponent(AriaLabelHarness);
    await settle(fixture);
    const host = fixture.nativeElement;

    fixture.componentInstance.picked.set(OPTIONS.map((o) => o.id));
    await settle(fixture);

    expect(trigger(host).getAttribute('aria-label')).toBe('Skills, screen-reader only');
    const text = descriptionText(host);
    expect(text).toContain('TypeScript');
    expect(text).toContain('Tailwind');
    expect(text).not.toContain('+');
  });

  it('describes only the remaining labels when the name comes from content', async () => {
    const fixture = TestBed.createComponent(PlainMultiHarness);
    await settle(fixture);
    const host = fixture.nativeElement;

    fixture.componentInstance.picked.set(['ts', 'ng', 'sig']);
    await settle(fixture);

    // The trigger's name is its visible text: the first pick.
    expect(trigger(host).hasAttribute('aria-label')).toBe(false);
    expect(valueText(host)).toBe('TypeScript');
    expect(descriptionText(host)).toBe('Angular and Signals');
    expect(descriptionText(host)).not.toContain('TypeScript');
  });

  it('adds no description for a single pick when there is no caption', async () => {
    const fixture = TestBed.createComponent(PlainMultiHarness);
    await settle(fixture);
    const host = fixture.nativeElement;

    fixture.componentInstance.picked.set(['ts']);
    await settle(fixture);

    expect(valueText(host)).toBe('TypeScript');
    expect(trigger(host).hasAttribute('aria-describedby')).toBe(false);
    expect(qNull(host, '.rv-select-sr-only')).toBeNull();
  });
});

describe('single mode is unchanged', () => {
  it('shows one label with no pill and no description', async () => {
    const fixture = TestBed.createComponent(SingleHarness);
    await settle(fixture);
    const host = fixture.nativeElement;

    fixture.componentInstance.picked.set('ts');
    await settle(fixture);

    expect(valueText(host)).toBe('TypeScript');
    expect(qNull(host, '.rv-select-count')).toBeNull();
    expect(trigger(host).hasAttribute('aria-describedby')).toBe(false);
    expect(qNull(host, '.rv-select-sr-only')).toBeNull();
  });
});

describe('locale mechanics', () => {
  /** MutationObserver callbacks are delivered in a microtask. */
  function observerDelivered(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  /** Installs a constructor spy; the real observer still works. */
  function spyOnObservers(): MutationObserver[] {
    const RealObserver = globalThis.MutationObserver;
    const created: MutationObserver[] = [];
    class SpyObserver extends RealObserver {
      constructor(callback: MutationCallback) {
        super(callback);
        created.push(this);
      }
    }
    vi.stubGlobal('MutationObserver', SpyObserver);
    return created;
  }

  it('formats the description in the page language', async () => {
    document.documentElement.setAttribute('lang', 'ar');
    const fixture = TestBed.createComponent(CaptionHarness);
    fixture.componentInstance.picked.set(['ts', 'ng']);
    await settle(fixture);

    expect(descriptionText(fixture.nativeElement)).toBe('TypeScript وAngular');
  });

  it('formats with independent en and ar literals', () => {
    expect(formatSelectionList(['TypeScript', 'Angular'], 'en')).toBe('TypeScript and Angular');
    expect(formatSelectionList(['TypeScript', 'Angular'], 'ar')).toBe('TypeScript وAngular');
  });

  it('falls back to en for an invalid locale instead of throwing', () => {
    document.documentElement.setAttribute('lang', 'invalid_locale');
    expect(resolveListLocale(document)).toBe('en');
    expect(formatSelectionList(['TypeScript', 'Angular'], 'invalid_locale')).toBe(
      'TypeScript and Angular',
    );
  });

  it('falls back to en for an empty or missing lang', () => {
    document.documentElement.removeAttribute('lang');
    expect(resolveListLocale(document)).toBe('en');
    document.documentElement.setAttribute('lang', '   ');
    expect(resolveListLocale(document)).toBe('en');
  });

  it('resolves to en when there is no document at all', () => {
    expect(resolveListLocale(null)).toBe('en');
  });

  it('joins plainly when the runtime has no Intl.ListFormat', () => {
    const intl = Intl as unknown as Record<string, unknown>;
    const saved = intl['ListFormat'];
    intl['ListFormat'] = undefined;
    try {
      expect(formatSelectionList(['Alpha', 'Beta', 'Gamma'], 'ar')).toBe('Alpha, Beta, Gamma');
    } finally {
      intl['ListFormat'] = saved;
    }
  });

  it('uses one formatter instance per locale', () => {
    const first = formatterFor('ar');
    formatterFor('en');
    expect(formatterFor('ar')).toBe(first);
  });

  it('creates exactly one observer after the first render', async () => {
    const created = spyOnObservers();
    const fixture = TestBed.createComponent(CaptionHarness);
    fixture.componentInstance.picked.set(['ts', 'ng']);

    // Construction and the render pass only queue the afterNextRender hook.
    expect(created).toHaveLength(0);
    TestBed.tick();
    expect(created).toHaveLength(1);
    await settle(fixture);

    document.documentElement.setAttribute('lang', 'ar');
    await observerDelivered();
    fixture.detectChanges();
    expect(created).toHaveLength(1);

    document.documentElement.setAttribute('lang', 'en');
    await observerDelivered();
    fixture.detectChanges();
    expect(created).toHaveLength(1);
  });

  it('updates the description when <html lang> changes', async () => {
    document.documentElement.setAttribute('lang', 'en');
    const fixture = TestBed.createComponent(CaptionHarness);
    fixture.componentInstance.picked.set(['ts', 'ng']);
    TestBed.tick();
    await settle(fixture);
    const host = fixture.nativeElement;

    expect(descriptionText(host)).toBe('TypeScript and Angular');

    document.documentElement.setAttribute('lang', 'ar');
    await observerDelivered();
    fixture.detectChanges();

    expect(descriptionText(host)).toBe('TypeScript وAngular');
  });

  it('disconnects the observer on destroy', () => {
    const created = spyOnObservers();
    const fixture = TestBed.createComponent(CaptionHarness);
    TestBed.tick();
    expect(created).toHaveLength(1);

    const disconnect = vi.spyOn(created[0], 'disconnect');
    fixture.destroy();

    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
