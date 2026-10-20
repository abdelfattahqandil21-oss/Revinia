/**
 * The panel's data-loading features.
 *
 * A select whose options come from a paged API needs three things the
 * component did not have before: a loader row, a "scrolled near the end"
 * signal, and a way to replace the list wholesale (for a virtualised one).
 */
import { Component, signal, type TemplateRef } from '@angular/core';
import type { ComponentFixture } from '@angular/core/testing';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { RiviniaSelectComponent } from '../ui/src/lib/components/select/select-panel';
import type { RiviniaSelectOption } from '@rivinia/select';

@Component({
  imports: [RiviniaSelectComponent],
  template: `
    <rv-select
      label="Status"
      [options]="options()"
      [loading]="loading()"
      (reachEnd)="reached.set(reached() + 1)"
      (panelReady)="panel.set($event)"
    />
  `,
})
class LoaderHost {
  readonly options = signal<readonly RiviniaSelectOption[]>([
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta' },
  ]);
  readonly loading = signal(false);
  readonly reached = signal(0);
  readonly panel = signal<HTMLElement | null>(null);
}

@Component({
  imports: [RiviniaSelectComponent],
  template: `
    <ng-template #list let-options>
      <div class="virtual-list">
        @for (option of options; track option.id) {
          <div class="virtual-row">{{ option.label }}</div>
        }
      </div>
    </ng-template>

    <rv-select label="Virtual" [options]="options()" [listTemplate]="list" />
  `,
})
class VirtualHost {
  readonly options = signal<readonly RiviniaSelectOption[]>([
    { id: 'a', label: 'Alpha' },
    { id: 'b', label: 'Beta' },
  ]);
}

@Component({
  imports: [RiviniaSelectComponent],
  template: `
    <rv-select label="Status" [options]="options()">
      <button class="load-more" type="button" rv-select-popup-footer>Load more</button>
    </rv-select>
  `,
})
class FooterHost {
  readonly options = signal<readonly RiviniaSelectOption[]>([{ id: 'a', label: 'Alpha' }]);
}

async function openPanel(fixture: ComponentFixture<unknown>): Promise<void> {
  (fixture.nativeElement as HTMLElement)
    .querySelector('.rv-select-trigger')
    ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  fixture.detectChanges();
  TestBed.flushEffects();
  fixture.detectChanges();
}

describe('the loading features', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [LoaderHost, VirtualHost, FooterHost] }),
  );

  it('shows no loader row when nothing is loading', async () => {
    const fixture = TestBed.createComponent(LoaderHost);
    fixture.detectChanges();
    await openPanel(fixture);

    expect((fixture.nativeElement as HTMLElement).querySelector('.rv-select-loading')).toBeNull();
  });

  it('shows a loader row while loading', async () => {
    const fixture = TestBed.createComponent(LoaderHost);
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    await openPanel(fixture);

    const loader = (fixture.nativeElement as HTMLElement).querySelector('.rv-select-loading');
    expect(loader).not.toBeNull();
    expect(loader?.textContent).toContain('Loading');
  });

  it('emits reachEnd when the panel scrolls close to its end', async () => {
    const fixture = TestBed.createComponent(LoaderHost);
    fixture.detectChanges();
    await openPanel(fixture);

    const panel = (fixture.nativeElement as HTMLElement).querySelector(
      '.rv-select-popup-panel',
    ) as HTMLElement;
    expect(panel).not.toBeNull();

    // Simulate a scroll that is already at the end.
    Object.defineProperty(panel, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(panel, 'clientHeight', { value: 200, configurable: true });
    Object.defineProperty(panel, 'scrollTop', { value: 800, configurable: true });
    panel.dispatchEvent(new Event('scroll', { bubbles: true }));

    expect(fixture.componentInstance.reached()).toBe(1);
  });

  it('does NOT emit reachEnd while the panel is far from the end', async () => {
    const fixture = TestBed.createComponent(LoaderHost);
    fixture.detectChanges();
    await openPanel(fixture);

    const panel = (fixture.nativeElement as HTMLElement).querySelector(
      '.rv-select-popup-panel',
    ) as HTMLElement;
    Object.defineProperty(panel, 'scrollHeight', { value: 1000, configurable: true });
    Object.defineProperty(panel, 'clientHeight', { value: 200, configurable: true });
    Object.defineProperty(panel, 'scrollTop', { value: 0, configurable: true });
    panel.dispatchEvent(new Event('scroll', { bubbles: true }));

    expect(fixture.componentInstance.reached()).toBe(0);
  });

  it('hands the panel element to the consumer', async () => {
    const fixture = TestBed.createComponent(LoaderHost);
    fixture.detectChanges();
    await openPanel(fixture);

    const panel = fixture.componentInstance.panel();
    expect(panel).not.toBeNull();
    expect(panel?.classList.contains('rv-select-popup-panel')).toBe(true);
  });

  it('replaces the list with the consumer template when given one', async () => {
    const fixture = TestBed.createComponent(VirtualHost);
    fixture.detectChanges();
    await openPanel(fixture);

    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelectorAll('.virtual-list').length).toBe(1);
    expect(host.querySelectorAll('.virtual-row').length).toBe(2);
    // The built-in rows are NOT rendered when a list template is supplied.
    expect(host.querySelectorAll('.rv-select-label').length).toBe(0);
  });
  it('projects the consumer footer after the list', async () => {
    const fixture = TestBed.createComponent(FooterHost);
    fixture.detectChanges();
    await openPanel(fixture);

    const host = fixture.nativeElement as HTMLElement;
    const footer = host.querySelector('.load-more');
    expect(footer).not.toBeNull();

    const panel = host.querySelector('.rv-select-popup-panel');
    expect(panel?.contains(footer)).toBe(true);

    // It comes AFTER the option rows in document order.
    const row = panel?.querySelector('[rvselectpopupitem]');
    expect(row).not.toBeNull();
    const order = (row as Node).compareDocumentPosition(footer as Node);
    // DOCUMENT_POSITION_FOLLOWING === 4
    expect(order & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
