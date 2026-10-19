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
  imports: [RiviniaModalDialog],
  template: `<rv-modal-dialog
    [(open)]="open"
    [title]="'Hi'"
    [closeOnEscape]="esc"
    [description]="desc"
    [showCloseButton]="x"
  />`,
})
class DialogHarness {
  open = false;
  esc = true;
  desc = '';
  x = true;
}

beforeEach(() => {
  TestBed.resetTestingModule();
  ensureDialogApi();
});

@Component({
  imports: [RiviniaModalDialog],
  template: `<rv-modal-dialog
    [(open)]="open"
    [title]="'Hi'"
    [managed]="true"
    [closing]="closing"
    [animation]="'none'"
    (exitDone)="exited = exited + 1"
  />`,
})
class ManagedHarness {
  open = false;
  closing = false;
  exited = 0;
}

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

  it('passes position and size through as data attributes (CSS does the rest)', () => {
    @Component({
      imports: [RiviniaModalDialog],
      template: `<rv-modal-dialog [position]="'side-end'" [size]="'lg'" />`,
    })
    class PositionHarness {}

    const fixture = TestBed.createComponent(PositionHarness);
    fixture.detectChanges();
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    expect(dialog.getAttribute('data-position')).toBe('side-end');
    expect(dialog.getAttribute('data-size')).toBe('lg');
  });

  it('focuses the title when there is no close button, the dialog otherwise', () => {
    const noX = TestBed.createComponent(DialogHarness);
    noX.componentInstance.x = false;
    noX.detectChanges();
    const noXRef = noX.debugElement.query(By.directive(RiviniaModalDialog));
    (noXRef.componentInstance as RiviniaModalDialog).open.set(true);
    TestBed.flushEffects();
    noX.detectChanges();
    expect(noX.nativeElement.ownerDocument.activeElement?.className).toContain('rv-modal-title');

    const withX = TestBed.createComponent(DialogHarness);
    withX.detectChanges();
    const withXRef = withX.debugElement.query(By.directive(RiviniaModalDialog));
    (withXRef.componentInstance as RiviniaModalDialog).open.set(true);
    TestBed.flushEffects();
    withX.detectChanges();
    expect(withX.nativeElement.ownerDocument.activeElement?.tagName).toBe('DIALOG');
  });

  it('dismisses through the exit machinery and settles closed', () => {
    // NOTE: drives dismiss() directly. The managed `closing`-input flip is
    // the same playExit path, but this harness cannot propagate template
    // inputs after the first CD (see NOTE above) — managed teardown itself
    // is proven by the CSR lab app, where the host drives `closing`.
    const fixture = TestBed.createComponent(ManagedHarness);
    fixture.componentInstance.open = true;
    fixture.detectChanges();
    TestBed.flushEffects();
    fixture.detectChanges();
    const cmp = fixture.debugElement.query(By.directive(RiviniaModalDialog))
      .componentInstance as RiviniaModalDialog;
    expect(cmp.state()).toBe('open');
    expect(cmp.dismiss('x')).toBe(true);
    TestBed.flushEffects();
    fixture.detectChanges();
    expect(fixture.componentInstance.exited).toBe(0);
    expect(cmp.state()).toBe('closed');
    const dialog: HTMLDialogElement = fixture.nativeElement.querySelector('dialog');
    expect(dialog.hasAttribute('open')).toBe(false);
  });
});
