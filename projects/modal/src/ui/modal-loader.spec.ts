/**
 * The dialog loader.
 *
 * A dialog that opens before its data arrives has nothing to show, and an
 * empty box reads as a broken dialog. The host renders a loader instead of the
 * instance's content while the instance reports itself as loading.
 */
import { Component, TemplateRef, ViewChild, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { RiviniaModal } from '../lib/rivinia-modal';
import { RiviniaModalHost } from '../../ui/src/lib/modal-host';

@Component({
  imports: [RiviniaModalHost],
  template: `
    <rv-modal-host [modal]="modal" [loadingOf]="isLoading" />
    <ng-template #tpl><span data-testid="content">Ready</span></ng-template>
  `,
})
class LoaderHost {
  readonly modal = inject(RiviniaModal);

  @ViewChild('tpl', { static: true })
  tpl!: TemplateRef<never>;

  /** The template cannot cast, so the check lives in the class. */
  protected readonly isLoading = (instance: { data?: unknown }): boolean =>
    (instance.data as { loading?: boolean } | undefined)?.loading === true;
}

beforeEach(() => {
  TestBed.resetTestingModule();
  // jsdom has no <dialog>; give it the bits the component touches.
  const proto = window.HTMLDialogElement?.prototype as unknown as Record<string, unknown>;
  if (proto && !proto['showModal']) {
    proto['showModal'] = function (this: HTMLElement) {
      this.setAttribute('open', '');
    };
    proto['close'] = function (this: HTMLElement) {
      this.removeAttribute('open');
    };
  }
});

describe('the dialog loader', () => {
  it('renders the content when the instance is not loading', () => {
    TestBed.configureTestingModule({ imports: [LoaderHost] });
    const fixture = TestBed.createComponent(LoaderHost);
    const host = fixture.componentInstance;
    fixture.detectChanges();

    const handle = host.modal.openModal(host.tpl, { ref: 'plain' });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="content"]')).not.toBeNull();
    expect(el.querySelector('.rv-modal-loading')).toBeNull();
    handle.dismiss();
  });

  it('renders a loader instead of the content while loading', () => {
    TestBed.configureTestingModule({ imports: [LoaderHost] });
    const fixture = TestBed.createComponent(LoaderHost);
    const host = fixture.componentInstance;
    fixture.detectChanges();

    const handle = host.modal.openModal(host.tpl, {
      ref: 'loading',
      data: { loading: true },
    });
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const loader = el.querySelector('.rv-modal-loading');
    expect(loader).not.toBeNull();
    expect(loader?.getAttribute('role')).toBe('status');
    // the content is NOT rendered while loading
    expect(el.querySelector('[data-testid="content"]')).toBeNull();
    handle.dismiss();
  });
});
