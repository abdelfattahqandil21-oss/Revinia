import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RiviniaModalScrollLock } from '../../ui/src/lib/modal-scroll-lock';

function fakeDocument() {
  const calls: string[] = [];
  const bodyStyle = {
    overflow: '',
    removeProperty: vi.fn((name: string) => {
      calls.push(`body-remove:${name}`);
    }),
  };
  const rootStyle = {
    setProperty: vi.fn((name: string) => {
      calls.push(`root-set:${name}`);
    }),
    removeProperty: vi.fn((name: string) => {
      calls.push(`root-remove:${name}`);
    }),
  };
  return {
    doc: { body: { style: bodyStyle }, documentElement: { style: rootStyle } },
    calls,
    bodyStyle,
  };
}

function setup(doc: unknown): RiviniaModalScrollLock {
  TestBed.configureTestingModule({
    providers: [{ provide: DOCUMENT, useValue: doc }],
  });
  return TestBed.inject(RiviniaModalScrollLock);
}

beforeEach(() => {
  TestBed.resetTestingModule();
});

describe('RiviniaModalScrollLock', () => {
  it('locks on first acquire and restores the previous value on last release', () => {
    const { doc, bodyStyle } = fakeDocument();
    const lock = setup(doc);
    bodyStyle.overflow = 'auto';
    lock.acquire();
    expect(lock.active).toBe(1);
    expect(bodyStyle.overflow).toBe('hidden');
    lock.release();
    expect(lock.active).toBe(0);
    expect(bodyStyle.overflow).toBe('auto');
  });

  it('reference-counts nested overlays (one release does not unlock)', () => {
    const { doc, bodyStyle } = fakeDocument();
    const lock = setup(doc);
    lock.acquire();
    lock.acquire();
    expect(lock.active).toBe(2);
    lock.release();
    expect(lock.active).toBe(1);
    expect(bodyStyle.overflow).toBe('hidden');
    lock.release();
    expect(lock.active).toBe(0);
  });

  it('release without acquire is a safe no-op', () => {
    const { doc } = fakeDocument();
    const lock = setup(doc);
    expect(() => lock.release()).not.toThrow();
    expect(lock.active).toBe(0);
  });

  it('is inert without a document (SSR)', () => {
    const lock = setup(null);
    expect(() => {
      lock.acquire();
      lock.release();
    }).not.toThrow();
    expect(lock.active).toBe(0);
  });
});
