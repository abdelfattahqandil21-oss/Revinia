import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { injectRiviniaSelect, provideRiviniaSelect } from '../src/lib/providers/select-di';

@Component({
  selector: 'rv-provided-scope',
  template: '',
  providers: [provideRiviniaSelect('multi')],
})
class ProvidedScope {
  readonly controller = injectRiviniaSelect();
}

beforeEach(() => {
  TestBed.resetTestingModule();
});

describe('provideRiviniaSelect / injectRiviniaSelect', () => {
  it('provides a controller in the requested mode', () => {
    TestBed.configureTestingModule({ providers: [provideRiviniaSelect('multi')] });
    const controller = TestBed.runInInjectionContext(() => injectRiviniaSelect());
    expect(controller.mode).toBe('multi');
  });

  it('returns the same instance twice inside one injector', () => {
    TestBed.configureTestingModule({ providers: [provideRiviniaSelect('single')] });
    const first = TestBed.runInInjectionContext(() => injectRiviniaSelect());
    const second = TestBed.runInInjectionContext(() => injectRiviniaSelect());
    expect(second).toBe(first);
  });

  it('gives two component injectors independent controllers', () => {
    const a = TestBed.createComponent(ProvidedScope);
    const b = TestBed.createComponent(ProvidedScope);
    expect(a.componentInstance.controller).not.toBe(b.componentInstance.controller);

    a.componentInstance.controller.syncOptions([{ id: 'x', label: 'X' }]);
    expect(a.componentInstance.controller.toggle('x')).toBe(true);
    expect(a.componentInstance.controller.isSelected('x')).toBe(true);
    expect(b.componentInstance.controller.isSelected('x')).toBe(false);
  });

  it('throws, with the documented message, when nothing is provided', () => {
    TestBed.configureTestingModule({});
    expect(() => TestBed.runInInjectionContext(() => injectRiviniaSelect())).toThrowError(
      /No select controller provided/,
    );
  });
});
