import { Component, TemplateRef, ViewChild, inject } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provideRiviniaModal } from '../lib/provide-modal';
import { RiviniaModal } from '../lib/rivinia-modal';
import { RiviniaModalHost } from '../../ui/src/lib/modal-host';

function ensureDialogApi(): void {
  const proto = globalThis.HTMLDialogElement?.prototype as
    { showModal?: unknown; close?: unknown } | undefined;
  if (!proto || typeof proto.showModal === 'function') return;
  Object.defineProperty(proto, 'showModal', {
    configurable: true,
    value: function (this: Element) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(proto, 'close', {
    configurable: true,
    value: function (this: Element) {
      this.removeAttribute('open');
    },
  });
}

@Component({
  standalone: true,
  imports: [RiviniaModalHost],
  template: `
    <rv-modal-host [modal]="modal" />
    <ng-template #tpl let-payload
      ><span data-testid="tpl-n">{{ payload.n }}</span></ng-template
    >
  `,
})
class HostHarness {
  protected readonly modal = inject(RiviniaModal);

  @ViewChild('tpl', { static: true })
  tpl!: TemplateRef<{ $implicit: { n: number } }>;
}

@Component({
  standalone: true,
  template: `<p data-testid="mini-dlg">mini</p>`,
})
class MiniDialog {}

function componentContent(): { readonly kind: 'component'; readonly component: typeof MiniDialog } {
  return { kind: 'component', component: MiniDialog };
}

beforeEach(() => {
  TestBed.resetTestingModule();
  ensureDialogApi();
  vi.useFakeTimers();
});

describe('RiviniaModalHost', () => {
  it('renders one dialog per visible instance and settles through the manager', async () => {
    TestBed.configureTestingModule({ providers: [provideRiviniaModal({ closingTimeout: 0 })] });
    const fixture = TestBed.createComponent(HostHarness);
    fixture.detectChanges();
    const modal = TestBed.inject(RiviniaModal);
    expect(fixture.nativeElement.querySelector('dialog')).toBeNull();

    fixture.detectChanges();
    TestBed.flushEffects();
    const handle = modal.openModal<string>(componentContent(), { ref: 'm' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog')).not.toBeNull();
    expect(modal.visible().length).toBe(1);

    expect(handle.dismiss('host-x')).toBe(true);
    expect(await handle.result).toEqual({ status: 'dismissed', reason: 'host-x' });
    // Manual teardown (closingTimeout 0): host confirms after the exit.
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
    expect(modal.debugState()).toMatchObject({ active: [], queued: [], closing: [] });
  });

  it('renders template content with data and a working modal context', async () => {
    TestBed.configureTestingModule({ providers: [provideRiviniaModal({ closingTimeout: 0 })] });
    const fixture = TestBed.createComponent(HostHarness);
    fixture.detectChanges();
    const modal = TestBed.inject(RiviniaModal);
    fixture.detectChanges();
    TestBed.flushEffects();
    const handle = modal.openModal<{ n: number }, string>(
      { kind: 'template', template: fixture.componentInstance.tpl as never },
      { data: { n: 7 } },
    );
    fixture.detectChanges();
    expect(modal.visible().length).toBe(1);
    expect(fixture.nativeElement.querySelector('[data-testid="tpl-n"]')?.textContent).toBe('7');
    expect(handle.close('done')).toBe(true);
    expect(await handle.result).toEqual({ status: 'confirmed', value: 'done' });
    vi.advanceTimersByTime(1000);
    fixture.detectChanges();
  });
});
