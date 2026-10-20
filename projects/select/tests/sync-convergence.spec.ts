/**
 * Does the options-mirroring effect converge?
 *
 * `syncOptions` reads the registry it also writes. Without a content
 * comparison, the effect re-arms itself on every pass — an infinite
 * change-detection loop, which is not a slow one.
 *
 * This is measured with a real component and a real effect, because the
 * question is whether the FRAMEWORK converges, not what the code looks like.
 */
import { Component, effect, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { RiviniaSelect } from '../src/lib/services/rivinia-select';
import type { RiviniaSelectOption } from '../src/lib/models/select-types';

const OPTIONS: readonly RiviniaSelectOption[] = [
  { id: 'a', label: 'A' },
  { id: 'b', label: 'B' },
];

/** Mirrors the component's own effect, exactly. */
@Component({ template: '' })
class MirrorHost {
  readonly controller = new RiviniaSelect('single');
  readonly options = signal<readonly RiviniaSelectOption[]>(OPTIONS);

  constructor() {
    effect(() => {
      this.controller.syncOptions(this.options());
    });
  }
}

describe('the options-mirroring effect', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [MirrorHost] }));

  it('converges instead of re-arming forever', async () => {
    const fixture = TestBed.createComponent(MirrorHost);
    const detect = vi.spyOn(fixture.componentRef.changeDetectorRef, 'detectChanges');

    await fixture.whenStable();
    const passes = detect.mock.calls.length;

    // A self-re-arming effect calls this without bound. A converging one
    // settles after a handful of passes.
    expect(passes).toBeLessThan(25);
  });

  it('leaves the registry with the right content', async () => {
    const fixture = TestBed.createComponent(MirrorHost);
    await fixture.whenStable();

    const options = fixture.componentInstance.controller.options();
    expect(options.length).toBe(2);
    expect(options.map((o) => o.id)).toEqual(['a', 'b']);
  });

  it('re-converges when the option list really changes', async () => {
    const fixture = TestBed.createComponent(MirrorHost);
    await fixture.whenStable();

    fixture.componentInstance.options.set([{ id: 'c', label: 'C' }]);
    await fixture.whenStable();

    const options = fixture.componentInstance.controller.options();
    expect(options.map((o) => o.id)).toEqual(['c']);
  });
});
