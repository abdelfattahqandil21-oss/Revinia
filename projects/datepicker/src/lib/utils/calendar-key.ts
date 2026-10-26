import type {
  RiviniaCalendarAction,
  RiviniaCalendarKeyInput,
} from '../models/calendar-types';

/*
 * One key press → one intent. The directive that listens never decides what
 * ArrowLeft means, and the service never reads a KeyboardEvent.
 *
 * RTL mirrors the HORIZONTAL arrows and nothing else: in a right-to-left grid
 * the next day is drawn to the LEFT, so ArrowLeft moves forward in time. "Up"
 * is still the previous row and "Page Down" is still the next month.
 */

const ARROWS: Record<string, 'previous' | 'next'> = {
  ArrowLeft: 'previous',
  ArrowRight: 'next',
};

export function resolveCalendarKey(
  input: RiviniaCalendarKeyInput,
): RiviniaCalendarAction | null {
  const { key, shiftKey = false, ctrlKey = false, altKey = false, metaKey = false } = input;
  const direction = input.direction ?? 'ltr';

  // A modified key belongs to the browser, the OS or the host application.
  if (ctrlKey || altKey || metaKey) return null;

  const horizontal = ARROWS[key];
  if (horizontal) {
    // Shift+Arrow is range selection, which v1 does not offer — staying silent
    // is better than moving the focus as if Shift had no meaning.
    if (shiftKey) return null;
    const forward = direction === 'rtl' ? horizontal === 'previous' : horizontal === 'next';
    return forward ? 'move-next' : 'move-previous';
  }

  if (key === 'ArrowUp') return shiftKey ? null : 'move-row-up';
  if (key === 'ArrowDown') return shiftKey ? null : 'move-row-down';
  if (key === 'Home') return shiftKey ? null : 'move-row-start';
  if (key === 'End') return shiftKey ? null : 'move-row-end';
  if (key === 'PageUp') return shiftKey ? 'page-back-year' : 'page-back';
  if (key === 'PageDown') return shiftKey ? 'page-forward-year' : 'page-forward';
  if (key === 'Enter' || key === ' ') return 'select';
  if (key === 'Escape') return 'close';

  return null;
}
