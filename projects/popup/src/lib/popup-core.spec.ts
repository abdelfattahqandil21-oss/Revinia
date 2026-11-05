import { DestroyRef, EnvironmentInjector, runInInjectionContext } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { bindPopupDismissal, computePopupPosition } from './popup-core';

describe('computePopupPosition', () => {
  const viewport = { width: 1280, height: 900 };
  const panel = { width: 256, height: 300 };

  it('aligns logical start/end using the explicit direction input', () => {
    const trigger = { left: 300, top: 100, width: 120, height: 40 };
    expect(computePopupPosition(trigger, panel, 'bottom-start', viewport, 'ltr')).toEqual({
      left: 300,
      top: 146,
      flipped: false,
    });
    expect(computePopupPosition(trigger, panel, 'bottom-start', viewport, 'rtl').left).toBe(164);
    expect(computePopupPosition(trigger, panel, 'bottom-end', viewport, 'rtl').left).toBe(300);
  });

  it('flips vertically when the preferred side overflows and the opposite side fits', () => {
    expect(
      computePopupPosition(
        { left: 100, top: 700, width: 120, height: 40 },
        panel,
        'bottom-start',
        viewport,
        'ltr',
      ),
    ).toEqual({ left: 100, top: 394, flipped: true });
  });

  it('clamps oversized panels within the viewport inset', () => {
    const result = computePopupPosition(
      { left: 2, top: 2, width: 30, height: 20 },
      { width: 400, height: 500 },
      'top-start',
      { width: 300, height: 400 },
      'ltr',
    );
    expect(result.left).toBe(8);
    expect(result.top).toBe(8);
  });
});

describe('bindPopupDismissal', () => {
  it('binds the three listeners and removes them with the host DestroyRef', () => {
    const host = document.createElement('div');
    const panel = document.createElement('div');
    host.append(panel);
    const dismiss = vi.fn();
    const originalWidth = window.innerWidth;
    const editable = { value: false };
    let cleanup!: () => void;
    const fakeDestroyRef = { onDestroy(callback: () => void) { cleanup = callback; } } as DestroyRef;

    runInInjectionContext(TestBed.inject(EnvironmentInjector), () => {
      bindPopupDismissal({
        document,
        window,
        host: () => host,
        panel: () => panel,
        editableFocusInsidePanel: () => editable.value,
        dismiss,
      }, fakeDestroyRef);
    });

    document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }));
    expect(dismiss).toHaveBeenCalledTimes(1);
    dismiss.mockClear();
    panel.dispatchEvent(new Event('scroll', { bubbles: true }));
    expect(dismiss).not.toHaveBeenCalled();

    editable.value = true;
    window.dispatchEvent(new Event('resize'));
    expect(dismiss).not.toHaveBeenCalled();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth + 1 });
    window.dispatchEvent(new Event('resize'));
    expect(dismiss).toHaveBeenCalledTimes(1);
    cleanup();
    dismiss.mockClear();
    window.dispatchEvent(new Event('resize'));
    expect(dismiss).not.toHaveBeenCalled();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
  });

  it('is a no-op for a null server browser context', () => {
    const destroyRef = { onDestroy: vi.fn() } as unknown as DestroyRef;
    runInInjectionContext(TestBed.inject(EnvironmentInjector), () => {
      bindPopupDismissal({
        document: null,
        window: null,
        host: () => null,
        panel: () => null,
        editableFocusInsidePanel: () => false,
        dismiss: vi.fn(),
      }, destroyRef);
    });
    expect(destroyRef.onDestroy).not.toHaveBeenCalled();
  });
});
