# Testing

Test code that uses the package.

[Back to @rivinia/toast README](https://github.com/abdelfattahqandil21-oss/Revinia/blob/toast/v1.0.1/projects/toast/README.md)

## Testing app code

Use fake timers to make timer-dependent tests deterministic:

```ts
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { provideRiviniaToast, RiviniaToast } from '@rivinia/toast';

beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideRiviniaToast()] });
  vi.useFakeTimers();
});

afterEach(() => {
  TestBed.resetTestingModule();
  vi.useRealTimers();
});

it('auto-dismisses after the configured duration', () => {
  const toast = TestBed.inject(RiviniaToast);
  const id = toast.show({ message: 'Saved', duration: 1000 });

  vi.advanceTimersByTime(1000);
  expect(toast.active().some((item) => item.id === id)).toBe(false);
});
```
