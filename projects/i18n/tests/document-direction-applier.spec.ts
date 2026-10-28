import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Language, ViewTransitionConfig, ViewTransitionInfo } from '../src/lib/models/i18n-types';
import { DocumentDirectionApplier } from '../src/lib/services/document-direction-applier';
import type { ViewTransitionService } from '../src/lib/services/view-transition.service';

const AR: Language = { id: 'ar', dir: 'rtl', locale: 'ar-EG' };
const EN: Language = { id: 'en', dir: 'ltr' };

function make(opts?: { viewTransition?: ViewTransitionConfig; service?: boolean; doc?: Document }) {
  const calls: (() => void)[] = [];
  const fake = opts?.service === false || opts?.viewTransition === undefined
    ? null
    : ({
        run: (cb: () => void) => {
          calls.push(cb);
          cb();
        },
      } as unknown as ViewTransitionService);
  const applier = new DocumentDirectionApplier({
    document: opts?.doc ?? document,
    viewTransition: fake,
    config: opts?.viewTransition,
  });
  return { applier, calls };
}

beforeEach(() => {
  document.documentElement.dir = '';
  document.documentElement.lang = '';
});

describe('DocumentDirectionApplier direction', () => {
  it('writes dir and the BCP-47 locale to the root element', () => {
    const { applier } = make();
    applier.applyDirection(AR);
    expect(document.documentElement.dir).toBe('rtl');
    expect(document.documentElement.lang).toBe('ar-EG');
  });

  it('falls back to the id when the language has no locale', () => {
    const { applier } = make();
    applier.applyDirection(EN);
    expect(document.documentElement.lang).toBe('en');
  });

  it('tolerates a document without a root element (SSR)', () => {
    const { applier } = make({ doc: { documentElement: null } as unknown as Document });
    expect(() => applier.applyDirection(AR)).not.toThrow();
  });

  it('keeps the root element in sync through the installed effect', () => {
    const current = signal<Language>(EN);
    const { applier } = make();
    TestBed.runInInjectionContext(() => applier.install(() => current()));
    TestBed.flushEffects();
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');

    current.set(AR);
    TestBed.flushEffects();
    expect(document.documentElement.lang).toBe('ar-EG');
    expect(document.documentElement.dir).toBe('rtl');
  });
});

describe('DocumentDirectionApplier view transitions', () => {
  it('runs the callback synchronously when transitions are off', () => {
    const { applier, calls } = make();
    const apply = vi.fn();
    applier.apply(AR, apply);
    expect(apply).toHaveBeenCalledOnce();
    expect(calls).toHaveLength(0);
  });

  it('runs the callback synchronously when no transition service exists', () => {
    const { applier } = make({ viewTransition: { enabled: true }, service: false });
    const apply = vi.fn();
    applier.apply(AR, apply);
    expect(apply).toHaveBeenCalledOnce();
  });

  it('wraps the callback and reports the created transition', () => {
    const onViewTransitionCreated = vi.fn<(info: ViewTransitionInfo) => void>();
    const { applier, calls } = make({ viewTransition: { enabled: true, onViewTransitionCreated } });
    const apply = vi.fn();
    applier.apply(AR, apply);
    expect(calls).toHaveLength(1);
    expect(apply).toHaveBeenCalledOnce();
    expect(onViewTransitionCreated).toHaveBeenCalledWith({ language: 'ar', direction: 'rtl' });
  });

  it('skipInitialTransition uses the transition from the second apply on', () => {
    const { applier, calls } = make({ viewTransition: { enabled: true, skipInitialTransition: true } });
    applier.apply(EN, () => {});
    expect(calls).toHaveLength(0);
    applier.apply(AR, () => {});
    expect(calls).toHaveLength(1);
  });
});
