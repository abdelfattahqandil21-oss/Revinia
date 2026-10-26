import { describe, expect, it } from 'vitest';
import { resolveCalendarKey } from '../src/public-api';
import type { RiviniaCalendarAction } from '../src/public-api';

/*
 * A key press is resolved into an ACTION, once, here — the directive that
 * listens never decides what ArrowLeft means, and the service never looks at a
 * KeyboardEvent. That is what makes the RTL rule testable without a DOM.
 *
 * The RTL rule is the ArrowLeft/ArrowRight mirror and NOTHING else:
 * in a right-to-left layout, the day after the focused one is drawn to the
 * LEFT, so ArrowLeft moves forward in time. Up/Down/Home/End/PageUp/PageDown
 * keep their meaning, because "up" is still the previous row and "page back"
 * is still the previous month. (Source: React Aria `useCalendarGrid` — the
 * same conclusion, measured against our own grid in the UI specs.)
 */

const resolve = (
  key: string,
  overrides: Partial<Parameters<typeof resolveCalendarKey>[0]> = {},
): RiviniaCalendarAction | null => resolveCalendarKey({ key, ...overrides });

describe('resolveCalendarKey — LTR', () => {
  it.each([
    { key: 'ArrowLeft', action: 'move-previous' },
    { key: 'ArrowRight', action: 'move-next' },
    { key: 'ArrowUp', action: 'move-row-up' },
    { key: 'ArrowDown', action: 'move-row-down' },
    { key: 'Home', action: 'move-row-start' },
    { key: 'End', action: 'move-row-end' },
    { key: 'PageUp', action: 'page-back' },
    { key: 'PageDown', action: 'page-forward' },
    { key: 'Enter', action: 'select' },
    { key: ' ', action: 'select' },
    { key: 'Escape', action: 'close' },
  ] as const)('$key → $action', ({ key, action }) => {
    expect(resolve(key, { direction: 'ltr' })).toBe(action);
  });

  it('Shift+PageUp/PageDown steps a year', () => {
    expect(resolve('PageUp', { direction: 'ltr', shiftKey: true })).toBe('page-back-year');
    expect(resolve('PageDown', { direction: 'ltr', shiftKey: true })).toBe(
      'page-forward-year',
    );
  });
});

describe('resolveCalendarKey — RTL mirrors the horizontal arrows only', () => {
  it('ArrowLeft moves FORWARD in time', () => {
    expect(resolve('ArrowLeft', { direction: 'rtl' })).toBe('move-next');
  });

  it('ArrowRight moves BACK in time', () => {
    expect(resolve('ArrowRight', { direction: 'rtl' })).toBe('move-previous');
  });

  it.each([
    { key: 'ArrowUp', action: 'move-row-up' },
    { key: 'ArrowDown', action: 'move-row-down' },
    { key: 'Home', action: 'move-row-start' },
    { key: 'End', action: 'move-row-end' },
    { key: 'PageUp', action: 'page-back' },
    { key: 'PageDown', action: 'page-forward' },
    { key: 'Enter', action: 'select' },
    { key: ' ', action: 'select' },
    { key: 'Escape', action: 'close' },
  ] as const)('$key is NOT mirrored → $action', ({ key, action }) => {
    expect(resolve(key, { direction: 'rtl' })).toBe(action);
  });

  it('Shift+PageUp/Down is not mirrored either', () => {
    expect(resolve('PageUp', { direction: 'rtl', shiftKey: true })).toBe('page-back-year');
    expect(resolve('PageDown', { direction: 'rtl', shiftKey: true })).toBe(
      'page-forward-year',
    );
  });

  it('defaults to LTR when the direction is unknown', () => {
    expect(resolve('ArrowLeft')).toBe('move-previous');
    expect(resolve('ArrowLeft', { direction: 'ltr' })).toBe('move-previous');
  });
});

describe('resolveCalendarKey — keys the calendar does not own', () => {
  it.each(['Tab', 'a', 'A', '0', 'F1', 'Delete', 'Backspace', 'Shift', 'Control'])(
    '%s → null',
    (key) => {
      expect(resolve(key)).toBeNull();
    },
  );

  it('ignores every modifier combination except Shift+Page', () => {
    expect(resolve('ArrowLeft', { ctrlKey: true })).toBeNull();
    expect(resolve('ArrowLeft', { altKey: true })).toBeNull();
    expect(resolve('ArrowLeft', { metaKey: true })).toBeNull();
    expect(resolve('ArrowLeft', { ctrlKey: true, shiftKey: true })).toBeNull();
    expect(resolve('Enter', { ctrlKey: true })).toBeNull();
    expect(resolve('Escape', { metaKey: true })).toBeNull();
  });

  it('Shift+Arrow is not range selection in v1', () => {
    expect(resolve('ArrowLeft', { shiftKey: true })).toBeNull();
    expect(resolve('ArrowRight', { shiftKey: true })).toBeNull();
    expect(resolve('ArrowUp', { shiftKey: true })).toBeNull();
    expect(resolve('Home', { shiftKey: true })).toBeNull();
    expect(resolve('End', { shiftKey: true })).toBeNull();
  });

  it('Shift does not change Enter, Space or Escape', () => {
    expect(resolve('Enter', { shiftKey: true })).toBe('select');
    expect(resolve(' ', { shiftKey: true })).toBe('select');
    expect(resolve('Escape', { shiftKey: true })).toBe('close');
  });
});
