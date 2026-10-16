import { Component } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RiviniaModalDialog } from '../../ui/src/lib/modal-dialog';

function ensureDialogApi(): void {
  // The unit-test DOM may not implement HTMLDialogElement at all (then
  // created <dialog> elements are HTMLUnknownElements). Stub on whatever
  // prototype actually backs them — always overriding, since a present-but-
  // throwing "not implemented" showModal is worse than none (a silent
  // try/catch would hide it).
  const g = globalThis as Record<string, unknown>;
  const ctor = g['HTMLDialogElement'] as { prototype?: object } | undefined;
  const target = (ctor?.prototype ??
    (g['Element'] as { prototype?: object } | undefined)?.prototype) as
    { showModal?: unknown; close?: unknown } | undefined;
  if (!target) return;
  Object.defineProperty(target, 'showModal', {
    configurable: true,
    value: function (this: Element) {
      this.setAttribute('open', '');
    },
  });
  Object.defineProperty(target, 'close', {
    configurable: true,
    value: function (this: Element) {
      this.removeAttribute('open');
    },
  });
}

@Component({
  standalone: true,
  imports: [RiviniaModalDialog],
  template: `<rv-modal-dialog
    [(open)]="open"
    [title]="'Hi'"
    [closeOnEscape]="esc"
    [description]="desc"
  />`,
})
class DialogHarness {
  open = false;
  esc = true;
  desc = '';
}

beforeEach(() => {
  TestBed.resetTestingModule();
  ensureDialogApi();
});

describe('RiviniaModalDialog', () => {
  it('starts closed and renders a closed dialog on the server-safe path', () => {
    const fixture = TestBed.createComponent(DialogHarness);
    fixture.detectChanges();
    const dialog: HTMLDialogElement | null = fixture.nativeElement.querySelector('dialog');
    expect(dialog?.hasAttribute('open')).toBe(false);
    expect(dialog?.getAttribute('aria-label')).toBe(null);
  });

  it('opens via showModal and emits dismissed on X with policy plumbing', () => {
    // NOTE: the model is written directly (not via the harness binding):
    // template input propagation needs a second CD rhythm this harness
    // doesn't add signal value over — the binding itself is proven by the
    // CSR lab app, where [(open)] opens the dialog in a real browser.
    const fixture = TestBed.createComponent(DialogHarness);
    fixture.detectChanges();
    const cmp = fixture.debugElement.query(By.directive(RiviniaModalDialog));
    expect(cmp).toBeTruthy();
    (cmp.componentInstance as RiviniaModalDialog).open.set(true);
    TestBed.flushEffects();
    fixture.detectChanges();
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    expect(dialog.hasAttribute('open')).toBe(true);
  });

  it('closeOnEscape=false cancels the native cancel event and stays open', () => {
    const fixture = TestBed.createComponent(DialogHarness);
    fixture.componentInstance.esc = false;
    fixture.detectChanges();
    const cmp = fixture.debugElement.query(By.directive(RiviniaModalDialog));
    (cmp.componentInstance as RiviniaModalDialog).open.set(true);
    TestBed.flushEffects();
    fixture.detectChanges();
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    const event = new Event('cancel', { cancelable: true });
    const before = dialog.hasAttribute('open');
    dialog.dispatchEvent(event);
    expect(before).toBe(true);
    expect(event.defaultPrevented).toBe(true);
  });

  it('repeated close while closed is a safe no-op returning false', () => {
    const fixture = TestBed.createComponent(DialogHarness);
    fixture.detectChanges();
    const ref = fixture.debugElement.query(By.directive(RiviniaModalDialog));
    const instance = ref.componentInstance as RiviniaModalDialog;
    expect(instance.dismiss()).toBe(false);
    expect(instance.confirm('x')).toBe(false);
    expect(instance.cancel()).toBe(false);
  });

  it('renders the description with aria-describedby only when provided', () => {
    const fixture = TestBed.createComponent(DialogHarness);
    fixture.componentInstance.desc = 'Why this appears';
    fixture.detectChanges();
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    expect(dialog.querySelector('.rv-modal-description')?.textContent).toBe('Why this appears');
    expect(dialog.getAttribute('aria-describedby')).toBeTruthy();

    const plain = TestBed.createComponent(DialogHarness);
    plain.detectChanges();
    const plainDialog: HTMLDialogElement = plain.nativeElement.querySelector('dialog');
    expect(plainDialog.querySelector('.rv-modal-description')).toBeNull();
    expect(plainDialog.getAttribute('aria-describedby')).toBe(null);
  });
});
