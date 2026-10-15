import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RiviniaToastConfig } from './toast-config';
import { provideRiviniaToast } from './provide-toast';
import { RiviniaToast } from './rivinia-toast';
import { clampDuration, resolveToastText } from './toast-utils';

function setup(config: RiviniaToastConfig = {}): RiviniaToast {
  TestBed.configureTestingModule({ providers: [provideRiviniaToast(config)] });
  return TestBed.inject(RiviniaToast);
}

function drain(toast: RiviniaToast): void {
  toast.dismissAll();
  vi.advanceTimersByTime(60_000);
}

beforeEach(() => {
  TestBed.resetTestingModule();
  vi.useFakeTimers();
});

afterEach(() => {
  expect(vi.getTimerCount()).toBe(0);
  vi.useRealTimers();
});

describe('RiviniaToast durations', () => {
  it('auto-dismisses after the global default (5000ms)', () => {
    const toast = setup();
    const id = toast.show({ message: 'hi' });
    expect(toast.active().length).toBe(1);
    vi.advanceTimersByTime(4999);
    expect(toast.active().length).toBe(1);
    vi.advanceTimersByTime(1);
    expect(toast.active().length).toBe(0);
    expect(id).toBeGreaterThan(0);
  });

  it('honours per-kind and per-toast overrides (per-toast wins)', () => {
    const toast = setup({ duration: 5000, durations: { error: 8000 } });
    toast.show({ message: 'e', kind: 'error' });
    toast.show({ message: 'i' });
    toast.show({ message: 'custom', duration: 1000 });
    vi.advanceTimersByTime(1000);
    expect(toast.active().map((t) => t.message)).toEqual(['e', 'i']);
    vi.advanceTimersByTime(4000);
    expect(toast.active().map((t) => t.message)).toEqual(['e']);
    vi.advanceTimersByTime(3000);
    expect(toast.active()).toEqual([]);
  });

  it('treats 0, negative and NaN durations as persistent', () => {
    const toast = setup();
    toast.show({ message: 'a', duration: 0 });
    toast.show({ message: 'b', duration: -5 });
    toast.show({ message: 'c', duration: Number.NaN });
    vi.advanceTimersByTime(60_000);
    expect(toast.active().length).toBe(3);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('RiviniaToast manual dismissal', () => {
  it('dismiss(id) removes and cancels the timer; repeats are false', () => {
    const toast = setup();
    const id = toast.show({ message: 'x' }) as number;
    expect(toast.dismiss(id)).toBe(true);
    expect(toast.active()).toEqual([]);
    expect(toast.dismiss(id)).toBe(false);
    expect(toast.dismiss(9999)).toBe(false);
    vi.advanceTimersByTime(60_000);
  });

  it('dismissAll clears active and queue; ids never repeat', () => {
    const toast = setup({ maxVisible: 1, overflow: 'queue' });
    const a = toast.show({ message: 'a' }) as number;
    toast.show({ message: 'b' });
    toast.dismissAll();
    expect(toast.active()).toEqual([]);
    expect(toast.queue()).toEqual([]);
    const c = toast.show({ message: 'c' }) as number;
    expect(c).toBeGreaterThan(a);
    vi.advanceTimersByTime(60_000);
  });
});

describe('RiviniaToast pause and resume', () => {
  it('preserves remaining time across pause/resume', () => {
    const toast = setup({ duration: 1000 });
    const id = toast.show({ message: 'x' }) as number;
    vi.advanceTimersByTime(400);
    expect(toast.pause(id)).toBe(true);
    expect(toast.active()[0].remaining).toBe(600);
    vi.advanceTimersByTime(5000);
    expect(toast.active().length).toBe(1);
    expect(toast.resume(id)).toBe(true);
    vi.advanceTimersByTime(599);
    expect(toast.active().length).toBe(1);
    vi.advanceTimersByTime(1);
    expect(toast.active()).toEqual([]);
  });

  it('pause is a no-op for unknown, persistent and double-paused toasts', () => {
    const toast = setup();
    expect(toast.pause(1234)).toBe(false);
    const id = toast.show({ message: 'sticky', duration: 0 }) as number;
    expect(toast.pause(id)).toBe(false);
    const timed = toast.show({ message: 't' }) as number;
    expect(toast.pause(timed)).toBe(true);
    expect(toast.pause(timed)).toBe(false);
    expect(toast.resume(1234)).toBe(false);
    toast.dismissAll();
  });

  it('resume on a persistent toast is a no-op (never paused, never dismissed)', () => {
    const toast = setup();
    const id = toast.show({ message: 'sticky', duration: 0 }) as number;
    expect(toast.pause(id)).toBe(false);
    expect(toast.resume(id)).toBe(false);
    expect(toast.active().length).toBe(1);
    expect(toast.active()[0].paused).toBe(false);
    toast.dismissAll();
  });

  it('resume at zero remaining dismisses a paused timed toast', () => {
    const toast = setup({ duration: 1000 });
    const id = toast.show({ message: 'x' }) as number;
    vi.advanceTimersByTime(400);
    expect(toast.pause(id)).toBe(true);
    expect(toast.active()[0].paused).toBe(true);
    expect(toast.update(id, { duration: 0 })).toBe(true);
    expect(toast.active()[0].remaining).toBe(0);
    expect(toast.resume(id)).toBe(true);
    expect(toast.active()).toEqual([]);
  });

  it('update while paused stores remaining without arming the timer', () => {
    const toast = setup({ duration: 1000 });
    const id = toast.show({ message: 'x' }) as number;
    vi.advanceTimersByTime(400);
    expect(toast.pause(id)).toBe(true);
    expect(toast.update(id, { message: 'y', duration: 200 })).toBe(true);
    expect(toast.active()[0].remaining).toBe(200);
    vi.advanceTimersByTime(5000);
    expect(toast.active().length).toBe(1);
    expect(toast.resume(id)).toBe(true);
    expect(toast.active()[0].paused).toBe(false);
    vi.advanceTimersByTime(200);
    expect(toast.active()).toEqual([]);
  });
});

describe('RiviniaToast update', () => {
  it('replaces content and restarts the timer (stale fire is harmless)', () => {
    const toast = setup({ duration: 1000 });
    const id = toast.show({ message: 'old' }) as number;
    vi.advanceTimersByTime(900);
    expect(toast.update(id, { message: 'new', duration: 1000 })).toBe(true);
    expect(toast.active()[0].message).toBe('new');
    vi.advanceTimersByTime(100);
    expect(toast.active().length).toBe(1);
    vi.advanceTimersByTime(900);
    expect(toast.active()).toEqual([]);
  });

  it('keeps the old duration when changes omit it; null removes actions', () => {
    const toast = setup({ duration: 1000 });
    const id = toast.show({ message: 'x', action: { label: 'Go', onPress: () => {} } }) as number;
    expect(toast.update(id, { message: 'y', action: null })).toBe(true);
    expect(toast.active()[0].action).toBeNull();
    vi.advanceTimersByTime(1000);
    expect(toast.active()).toEqual([]);
  });

  it('update on unknown or dismissed ids returns false', () => {
    const toast = setup();
    expect(toast.update(4242, { message: '?' })).toBe(false);
    const id = toast.show({ message: 'x' }) as number;
    toast.dismiss(id);
    expect(toast.update(id, { message: '?' })).toBe(false);
  });
});

describe('RiviniaToast kind and duration interaction', () => {
  it('kind change re-resolves the per-kind default unless duration was explicit', () => {
    const toast = setup({ duration: 5000, durations: { error: 9000 } });
    const a = toast.show({ message: 'x', kind: 'info' }) as number;
    expect(toast.update(a, { kind: 'error' })).toBe(true);
    expect(toast.active()[0].duration).toBe(9000);
    vi.advanceTimersByTime(5000);
    expect(toast.active().length).toBe(1);
    vi.advanceTimersByTime(4000);
    expect(toast.active()).toEqual([]);

    const b = toast.show({ message: 'y', kind: 'info', duration: 1000 }) as number;
    expect(toast.update(b, { kind: 'error' })).toBe(true);
    expect(toast.active()[0].duration).toBe(1000);
    toast.dismissAll();
  });
});

describe('RiviniaToast overflow eviction', () => {
  it('prefers evicting timed actionless toasts over persistent errors with actions', () => {
    const toast = setup({ maxVisible: 2, overflow: 'dismiss-oldest' });
    const plain = toast.show({ message: 'plain', duration: 60_000 }) as number;
    const critical = toast.show({
      message: 'failed',
      kind: 'error',
      duration: 0,
      action: { label: 'Retry', onPress: () => {} },
    }) as number;
    const third = toast.show({ message: 'third', duration: 60_000 }) as number;
    const ids = toast.active().map((t) => t.id);
    expect(ids).toEqual([critical, third]);
    expect(ids).not.toContain(plain);
    drain(toast);
  });

  it('falls back to the oldest when everything is persistent', () => {
    const toast = setup({ maxVisible: 1, overflow: 'dismiss-oldest' });
    const first = toast.show({ message: 'a', duration: 0 }) as number;
    const second = toast.show({ message: 'b', duration: 0 }) as number;
    expect(toast.active().map((t) => t.id)).toEqual([second]);
    expect(first).not.toEqual(second);
    drain(toast);
  });
});
describe('RiviniaToast capacity and queue', () => {
  it('dismiss-oldest (default) evicts the head and ids stay unique', () => {
    const toast = setup({ maxVisible: 2, duration: 10_000 });
    const a = toast.show({ message: 'a' }) as number;
    toast.show({ message: 'b' });
    const c = toast.show({ message: 'c' }) as number;
    expect(toast.active().map((t) => t.id)).toEqual([a + 1, c]);
    expect(toast.queue()).toEqual([]);
    vi.advanceTimersByTime(60_000);
  });

  it('queue holds overflow timerless and promotes FIFO with fresh timers', () => {
    const toast = setup({ maxVisible: 1, overflow: 'queue', duration: 1000 });
    toast.show({ message: 'first' });
    toast.show({ message: 'second' });
    toast.show({ message: 'third' });
    expect(toast.active().map((t) => t.message)).toEqual(['first']);
    expect(toast.queue().map((t) => t.message)).toEqual(['second', 'third']);
    // Queued time must not consume duration: after 900ms the head is still fresh…
    vi.advanceTimersByTime(900);
    toast.dismiss(toast.active()[0].id);
    expect(toast.active().map((t) => t.message)).toEqual(['second']);
    // …so it survives a full fresh duration from promotion, not 100ms.
    vi.advanceTimersByTime(999);
    expect(toast.active().map((t) => t.message)).toEqual(['second']);
    vi.advanceTimersByTime(1);
    expect(toast.active().map((t) => t.message)).toEqual(['third']);
    toast.dismissAll();
  });

  it('reject returns null and changes nothing', () => {
    const toast = setup({ maxVisible: 1, overflow: 'reject' });
    expect(toast.show({ message: 'a' })).toBe(1);
    expect(toast.show({ message: 'b' })).toBeNull();
    expect(toast.active().length).toBe(1);
    expect(toast.queue()).toEqual([]);
    toast.dismissAll();
  });

  it('a finite maxQueue rejects past the bound', () => {
    const toast = setup({ maxVisible: 1, overflow: 'queue', maxQueue: 1, duration: 10_000 });
    toast.show({ message: 'a' });
    expect(toast.show({ message: 'b' })).toBe(2);
    expect(toast.show({ message: 'c' })).toBeNull();
    expect(toast.queue().map((t) => t.message)).toEqual(['b']);
    toast.dismissAll();
  });
});

describe('RiviniaToast actions', () => {
  it('runAction executes the callback and dismisses by default', () => {
    const toast = setup({ duration: 10_000 });
    let calls = 0;
    const id = toast.show({
      message: 'x',
      action: { label: 'Retry', onPress: () => calls++ },
    }) as number;
    expect(toast.runAction(id)).toBe(true);
    expect(calls).toBe(1);
    expect(toast.active()).toEqual([]);
  });

  it('dismissAfterPress:false keeps the toast visible', () => {
    const toast = setup({ duration: 10_000 });
    let calls = 0;
    const id = toast.show({
      message: 'x',
      action: { label: 'Snooze', onPress: () => calls++, dismissAfterPress: false },
    }) as number;
    expect(toast.runAction(id)).toBe(true);
    expect(calls).toBe(1);
    expect(toast.active().length).toBe(1);
    expect(toast.runAction(7777)).toBe(false);
    toast.dismissAll();
  });
});

describe('RiviniaToast deduplication', () => {
  it('same key updates in place: same id, new content, restarted timer', () => {
    const toast = setup({ duration: 1000 });
    const first = toast.show({ message: 'Saving…', dedupeKey: 'save' }) as number;
    vi.advanceTimersByTime(900);
    const second = toast.show({ message: 'Saved', dedupeKey: 'save' });
    expect(second).toBe(first);
    expect(toast.active().length).toBe(1);
    expect(toast.active()[0].message).toBe('Saved');
    vi.advanceTimersByTime(900);
    expect(toast.active().length).toBe(1);
    vi.advanceTimersByTime(100);
    expect(toast.active()).toEqual([]);
  });

  it('no key means no dedupe; a dismissed key may be reused', () => {
    const toast = setup({ duration: 10_000 });
    const a = toast.show({ message: 'x' }) as number;
    const b = toast.show({ message: 'x' }) as number;
    expect(b).toBe(a + 1);
    toast.dismiss(a);
    const c = toast.show({ message: 'x', dedupeKey: 'k' }) as number;
    toast.dismiss(c);
    const d = toast.show({ message: 'x', dedupeKey: 'k' }) as number;
    expect(d).not.toBe(c);
    toast.dismissAll();
  });
});

describe('RiviniaToast teardown and state', () => {
  it('DestroyRef cleanup leaves no timers behind', () => {
    const toast = setup({ duration: 1000 });
    toast.show({ message: 'a' });
    toast.show({ message: 'b', duration: 2000 });
    expect(vi.getTimerCount()).toBe(2);
    TestBed.resetTestingModule();
    vi.advanceTimersByTime(60_000);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('exposes readonly signals and resolves signal messages', () => {
    const toast = setup({ duration: 10_000 });
    const name = signal('World');
    toast.show({ message: name });
    const active = toast.active();
    expect('set' in active).toBe(false);
    expect('update' in active).toBe(false);
    expect(resolveToastText(active[0].message)).toBe('World');
    name.set('Mars');
    expect(resolveToastText(toast.active()[0].message)).toBe('Mars');
    expect(resolveToastText('plain')).toBe('plain');
    expect(clampDuration(undefined, 5000)).toBe(5000);
    expect(clampDuration(Number.POSITIVE_INFINITY, 5000)).toBe(0);
    toast.dismissAll();
  });
});

describe('RiviniaToast generations cleanup', () => {
  function generations(toast: RiviniaToast): number {
    return (toast as unknown as { _generations: Map<number, number> })._generations.size;
  }

  it('does not grow _generations across show/dismiss cycles', () => {
    const toast = setup();
    for (let i = 0; i < 10; i++) {
      const id = toast.show({ message: `m${i}` });
      expect(id).not.toBeNull();
      expect(toast.dismiss(id as number)).toBe(true);
    }
    expect(generations(toast)).toBe(0);
    drain(toast);
  });

  it('clears _generations on dismissAll', () => {
    const toast = setup();
    toast.show({ message: 'a' });
    toast.show({ message: 'b' });
    expect(generations(toast)).toBeGreaterThan(0);
    toast.dismissAll();
    expect(generations(toast)).toBe(0);
  });
});
