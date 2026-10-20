import {
  DestroyRef,
  ElementRef,
  EmbeddedViewRef,
  EnvironmentInjector,
  TemplateRef,
  createEnvironmentInjector,
  type Type,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RiviniaModalConfig } from '../src/lib/models/modal-config';
import { QueueStrategy, StackStrategy } from '../src/lib/services/modal-strategy';
import type { ModalContent, ModalResult, ModalTemplateContext } from '../src/lib/models/modal-types';
import { provideRiviniaModal } from '../src/lib/providers/provide-modal';
import { RiviniaModal } from '../src/lib/services/rivinia-modal';

class FakeDialog {}

class FakeTemplateRef extends TemplateRef<
  import('../src/lib/models/modal-types').ModalTemplateContext<{ title: string }>
> {
  declare readonly elementRef: ElementRef;
  override createEmbeddedView(): EmbeddedViewRef<
    import('../src/lib/models/modal-types').ModalTemplateContext<{ title: string }>
  > {
    throw new Error('test-only: never rendered in core tests');
  }
}

function componentContent(): {
  readonly kind: 'component';
  readonly component: Type<unknown>;
  readonly inputs?: Record<string, unknown>;
} {
  return { kind: 'component', component: FakeDialog };
}

function templateContent<T = unknown>(): {
  readonly kind: 'template';
  readonly template: TemplateRef<ModalTemplateContext<T>>;
} {
  return { kind: 'template', template: {} as TemplateRef<ModalTemplateContext<T>> };
}

function setup(config: RiviniaModalConfig = {}): RiviniaModal {
  TestBed.configureTestingModule({ providers: [provideRiviniaModal(config)] });
  return TestBed.inject(RiviniaModal);
}

function drain(modal: RiviniaModal): void {
  modal.dismissAll();
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

describe('RiviniaModal stack strategy', () => {
  it('orders multiple active modals and selects the topmost', () => {
    const modal = setup();
    const a = modal.openModal(componentContent(), { ref: 'a' });
    const b = modal.openModal(componentContent(), { ref: 'b' });
    expect(modal.active().map((i) => i.id)).toEqual([a.id, b.id]);
    expect(modal.top()?.id).toBe(b.id);
    a.close('va');
    vi.advanceTimersByTime(1000);
    expect(modal.top()?.id).toBe(b.id);
    drain(modal);
  });

  it('closes one modal without touching unrelated instances', async () => {
    const modal = setup();
    const a = modal.openModal<string>(componentContent());
    const b = modal.openModal<string>(componentContent());
    a.close('A');
    expect(await a.result).toEqual({ status: 'confirmed', value: 'A' });
    expect(modal.active().map((i) => i.id)).toEqual([b.id]);
    drain(modal);
  });

  it('repeated close/dismiss settle exactly once', async () => {
    const modal = setup();
    const handle = modal.openModal<string>(componentContent());
    expect(handle.close('x')).toBe(true);
    expect(handle.close('y')).toBe(false);
    expect(handle.dismiss('late')).toBe(false);
    expect(await handle.result).toEqual({ status: 'confirmed', value: 'x' });
    drain(modal);
  });

  it('dismiss on unknown ids is a no-op false', () => {
    const modal = setup();
    expect(modal.dismiss('nope')).toBe(false);
    expect(modal.cancel('nope')).toBe(false);
    expect(modal.close('nope')).toBe(false);
    expect(modal.confirmClosed('nope')).toBe(false);
  });
});

describe('RiviniaModal content forms', () => {
  it('accepts a raw TemplateRef like the README quick start', () => {
    const modal = setup();
    const handle = modal.openModal<{ title: string }, boolean>(new FakeTemplateRef(), {
      data: { title: 'x' },
      ref: 'confirm-delete',
    });
    const stored = modal.active()[0];
    expect(stored.content.kind).toBe('template');
    expect(stored.ref).toBe('confirm-delete');
    expect(handle.dismiss()).toBe(true);
    drain(modal);
  });

  it('accepts a raw component Type with inputs', () => {
    const modal = setup();
    modal.openModal(FakeDialog, { inputs: { title: 'hi' } });
    const stored = modal.active()[0];
    expect(stored.content.kind).toBe('component');
    if (stored.content.kind === 'component') {
      expect(stored.content.component).toBe(FakeDialog);
      expect(stored.content.inputs).toEqual({ title: 'hi' });
    }
    drain(modal);
  });
});

describe('RiviniaModal queue strategy', () => {
  it('activates strictly serially, FIFO, timers start at promotion', () => {
    const modal = setup({ strategy: 'queue' });
    modal.openModal(componentContent(), { ref: 'first' });
    modal.openModal(componentContent(), { ref: 'second' });
    expect(modal.active().map((i) => i.ref)).toEqual(['first']);
    expect(modal.queued().map((i) => i.ref)).toEqual(['second']);
    modal.dismiss(modal.active()[0].id);
    vi.advanceTimersByTime(1000);
    expect(modal.active().map((i) => i.ref)).toEqual(['second']);
    expect(modal.queued()).toEqual([]);
    drain(modal);
  });

  it('cancel on a queued request settles queued-cancelled and never activates', async () => {
    const modal = setup({ strategy: 'queue' });
    modal.openModal(componentContent());
    const queued = modal.openModal<string>(componentContent());
    expect(queued.cancel('changed-mind')).toBe(true);
    expect(await queued.result).toEqual({ status: 'queued-cancelled' });
    expect(modal.queued()).toEqual([]);
    drain(modal);
  });

  it('custom strategies plug in through the same contract', () => {
    const modal = setup({ strategy: new QueueStrategy() });
    expect(modal.debugState().strategy).toBe('queue');
    modal.openModal(componentContent());
    modal.openModal(componentContent());
    expect(modal.active().length).toBe(1);
    expect(modal.queued().length).toBe(1);
    drain(modal);
  });

  it('useStrategy while instances exist throws explicitly', () => {
    const modal = setup();
    modal.openModal(componentContent());
    expect(() => modal.useStrategy(new QueueStrategy())).toThrow(/live migration/);
    drain(modal);
    expect(() => modal.useStrategy(new QueueStrategy())).not.toThrow();
    expect(modal.debugState().strategy).toBe('queue');
  });
});

describe('RiviniaModal capacity and overflow', () => {
  it('dismiss-oldest evicts the head and settles it as dismissed', async () => {
    const modal = setup({ maxVisible: 1, overflow: 'dismiss-oldest' });
    const first = modal.openModal<string>(componentContent());
    const second = modal.openModal<string>(componentContent());
    expect(await first.result).toEqual({ status: 'dismissed', reason: 'overflow-evicted' });
    expect(modal.active().map((i) => i.id)).toEqual([second.id]);
    drain(modal);
  });

  it('reject settles immediately and retains nothing', async () => {
    const modal = setup({ maxVisible: 1, overflow: 'reject' });
    modal.openModal(componentContent());
    const rejected = modal.openModal<string>(componentContent());
    expect(await rejected.result).toEqual({ status: 'rejected', reason: 'overflow' });
    expect(modal.debugState()).toMatchObject({ active: [modal.active()[0].id], queued: [] });
    drain(modal);
  });
});

describe('RiviniaModal dismissal policies and guards', () => {
  it('requestDismiss runs guards in order; deny keeps it open', async () => {
    const modal = setup();
    const order: string[] = [];
    const handle = modal.openModal<string>(componentContent(), {
      guards: [
        () => {
          order.push('first');
          return true;
        },
        () => {
          order.push('second');
          return false;
        },
      ],
    });
    expect(await modal.requestDismiss(handle.id, 'escape')).toBe(false);
    expect(order).toEqual(['first', 'second']);
    expect(modal.active().length).toBe(1);
    drain(modal);
  });

  it('throwing guards deny safely; close/dismiss bypass guards', async () => {
    const modal = setup();
    const handle = modal.openModal<string>(componentContent(), {
      guards: [
        () => {
          throw new Error('boom');
        },
      ],
    });
    expect(await modal.requestDismiss(handle.id, 'backdrop')).toBe(false);
    expect(handle.dismiss('manual')).toBe(true);
    expect(await handle.result).toEqual({ status: 'dismissed', reason: 'manual' });
    drain(modal);
  });

  it('stale guard completions are ignored after the modal moved', async () => {
    const modal = setup();
    let release!: (value: boolean) => void;
    const gate = new Promise<boolean>((res) => (release = res));
    const handle = modal.openModal<string>(componentContent(), {
      guards: [() => gate],
    });
    const pending = modal.requestDismiss(handle.id, 'button');
    handle.dismiss('meanwhile');
    release(true);
    expect(await pending).toBe(false);
    expect(await handle.result).toEqual({ status: 'dismissed', reason: 'meanwhile' });
    drain(modal);
  });

  it('reentrant guard may open a follow-up modal', async () => {
    const modal = setup();
    let followUp: string | null = null;
    const first = modal.openModal<string>(componentContent(), {
      guards: [
        () => {
          followUp = modal.openModal<string>(componentContent(), { ref: 'confirm' }).id;
          return true;
        },
      ],
    });
    expect(await modal.requestDismiss(first.id, 'button', 'chain')).toBe(true);
    expect(await first.result).toEqual({ status: 'dismissed', reason: 'chain' });
    expect(followUp).not.toBeNull();
    expect(modal.findByRef('confirm').length).toBe(1);
    drain(modal);
  });

  it('concurrent requestDismiss shares one guard run', async () => {
    const modal = setup();
    let guardCalls = 0;
    let release!: (value: boolean) => void;
    const gate = new Promise<boolean>((res) => (release = res));
    const handle = modal.openModal<string>(componentContent(), {
      guards: [
        () => {
          guardCalls++;
          return gate;
        },
      ],
    });
    const first = modal.requestDismiss(handle.id, 'escape');
    const second = modal.requestDismiss(handle.id, 'backdrop');
    release(true);
    expect(await first).toBe(true);
    expect(await second).toBe(true);
    expect(guardCalls).toBe(1);
    expect(await handle.result).toEqual({ status: 'dismissed', reason: 'escape' });
    drain(modal);
  });

  it('merges dismissal policy: defaults < global < preset < per-call', () => {
    const modal = setup({
      dismiss: { closeOnEscape: false },
      presets: { danger: { dismiss: { backdrop: 'static' } } },
    });
    modal.openModal(componentContent());
    expect(modal.active()[0].dismiss).toMatchObject({ closeOnEscape: false, backdrop: 'close' });
    modal.openModal(componentContent(), { preset: 'danger' });
    expect(modal.active()[1].dismiss).toMatchObject({ closeOnEscape: false, backdrop: 'static' });
    modal.openModal(componentContent(), {
      preset: 'danger',
      dismiss: { closeOnEscape: true },
    });
    expect(modal.active()[2].dismiss).toMatchObject({ closeOnEscape: true, backdrop: 'static' });
    drain(modal);
  });

  it('absent policy keys never clobber defaults', () => {
    // Global backdrop-only keeps closeOnEscape true (no undefined spread).
    const modal = setup({ dismiss: { backdrop: 'static' } });
    modal.openModal(componentContent());
    expect(modal.active()[0].dismiss).toMatchObject({
      closeOnEscape: true,
      backdrop: 'static',
    });
    drain(modal);
  });
});

describe('RiviniaModal ownership and nesting', () => {
  function childInjector() {
    return createEnvironmentInjector([], TestBed.inject(EnvironmentInjector));
  }

  it('owner destruction settles active as owner-destroyed, queued as queued-cancelled', async () => {
    const modal = setup({ strategy: 'queue' });
    const owner = childInjector();
    const active = modal.openModal<string>(componentContent(), {
      owner: owner.get(DestroyRef),
    });
    const queued = modal.openModal<string>(componentContent(), {
      owner: owner.get(DestroyRef),
    });
    owner.destroy();
    expect(await active.result).toEqual({ status: 'owner-destroyed' });
    // Same dead owner: promoted then torn down as owner-destroyed (truthful).
    expect(await queued.result).toEqual({ status: 'owner-destroyed' });
    expect(modal.debugState()).toMatchObject({ active: [], queued: [], closing: [] });
  });

  it('opening with an already-destroyed owner settles immediately, adds nothing', async () => {
    const modal = setup();
    const owner = childInjector();
    const staleOwner = owner.get(DestroyRef);
    owner.destroy();
    const handle = modal.openModal<string>(componentContent(), { owner: staleOwner });
    expect(await handle.result).toEqual({ status: 'owner-destroyed' });
    expect(modal.debugState()).toMatchObject({ active: [], queued: [], closing: [] });
  });

  it('teardown promotes an independently-owned queued modal', async () => {
    const modal = setup({ strategy: 'queue' });
    const owner = childInjector();
    const active = modal.openModal<string>(componentContent(), {
      owner: owner.get(DestroyRef),
    });
    const queued = modal.openModal<string>(componentContent());
    owner.destroy();
    expect(await active.result).toEqual({ status: 'owner-destroyed' });
    expect(modal.active().map((i) => i.id)).toEqual([queued.id]);
    expect(modal.queued()).toEqual([]);
    expect(queued.dismiss()).toBe(true);
    expect(await queued.result).toEqual({ status: 'dismissed', reason: undefined });
    drain(modal);
  });

  it('independent lifetime survives owner injector destruction', async () => {
    const modal = setup();
    const owner = childInjector();
    const handle = modal.openModal<string>(componentContent());
    owner.destroy();
    expect(modal.active().length).toBe(1);
    handle.close('done');
    expect(await handle.result).toEqual({ status: 'confirmed', value: 'done' });
    drain(modal);
  });

  it('close-with-parent cascades to descendants (dismissed / queued-cancelled)', async () => {
    const modal = setup();
    const parent = modal.openModal<string>(componentContent(), { ref: 'parent' });
    const child = modal.openModal<string>(componentContent(), { parentId: parent.id });
    const grandchild = modal.openModal<string>(componentContent(), { parentId: child.id });
    expect(parent.close()).toBe(true);
    expect(await parent.result).toEqual({ status: 'confirmed', value: undefined });
    expect(await child.result).toEqual({ status: 'dismissed', reason: 'parent-closed' });
    expect(await grandchild.result).toEqual({ status: 'dismissed', reason: 'parent-closed' });
    expect(modal.debugState()).toMatchObject({
      active: [],
      queued: [],
      closing: [parent.id, child.id, grandchild.id],
    });
    vi.advanceTimersByTime(1000);
    expect(modal.debugState()).toMatchObject({ active: [], queued: [], closing: [] });
  });

  it('prevent-parent-close blocks while descendants live', async () => {
    const modal = setup({ descendants: 'prevent-parent-close' });
    const parent = modal.openModal<string>(componentContent());
    const child = modal.openModal<string>(componentContent(), { parentId: parent.id });
    expect(parent.close()).toBe(false);
    expect(parent.dismiss()).toBe(false);
    expect(child.dismiss('solo')).toBe(true);
    expect(await child.result).toEqual({ status: 'dismissed', reason: 'solo' });
    expect(parent.close('now')).toBe(true);
    expect(await parent.result).toEqual({ status: 'confirmed', value: 'now' });
    drain(modal);
  });

  it('stale parent ids open as root with a diagnostic', () => {
    const modal = setup({ diagnostics: true });
    const handle = modal.openModal(componentContent(), { parentId: 'ghost' });
    expect(modal.active().length).toBe(1);
    const types = modal.getDiagnostics().map((d) => d.type);
    expect(types).toContain('rejected');
    drain(modal);
  });
});

describe('RiviniaModal closing handshake and registry', () => {
  it('result settles at dismissal; confirmClosed finalizes the registry', async () => {
    const modal = setup({ closingTimeout: 0 });
    const handle = modal.openModal<string>(componentContent());
    handle.dismiss('bye');
    expect(await handle.result).toEqual({ status: 'dismissed', reason: 'bye' });
    expect(modal.debugState()).toMatchObject({ active: [], closing: [handle.id] });
    expect(modal.confirmClosed(handle.id)).toBe(true);
    expect(modal.debugState()).toMatchObject({ active: [], queued: [] });
  });

  it('closingTimeout auto-finalizes; manual confirm afterwards is false', async () => {
    const modal = setup({ closingTimeout: 300 });
    const handle = modal.openModal<string>(componentContent());
    handle.close();
    expect(await handle.result).toEqual({ status: 'confirmed', value: undefined });
    vi.advanceTimersByTime(300);
    expect(modal.debugState()).toMatchObject({ active: [], queued: [] });
    expect(modal.confirmClosed(handle.id)).toBe(false);
  });

  it('update merges data and metadata; unknown ids are false', () => {
    const modal = setup();
    const handle = modal.openModal<{ n: number }>(templateContent<{ n: number }>(), {
      data: { n: 1 },
      metadata: { a: 1 },
    });
    expect(modal.update(handle.id, { data: { n: 2 } })).toBe(true);
    expect(modal.active()[0].data).toEqual({ n: 2 });
    expect(modal.active()[0].metadata).toEqual({ a: 1 });
    expect(modal.update('ghost', { data: { n: 3 } })).toBe(false);
    drain(modal);
  });

  it('dismissAll settles everything and diagnostics stay bounded', async () => {
    const modal = setup({ strategy: 'queue', diagnostics: true, maxVisible: 1 });
    const a = modal.openModal<string>(componentContent());
    const b = modal.openModal<string>(componentContent());
    modal.dismissAll('shutdown');
    expect(await a.result).toEqual({ status: 'dismissed', reason: 'shutdown' });
    expect(await b.result).toEqual({ status: 'queued-cancelled' });
    expect(modal.debugState()).toMatchObject({ active: [], queued: [], closing: [a.id] });
    vi.advanceTimersByTime(1000);
    expect(modal.debugState()).toMatchObject({ active: [], queued: [], closing: [] });
    for (let i = 0; i < 150; i++) {
      const h = modal.openModal(componentContent());
      h.dismiss();
    }
    vi.advanceTimersByTime(1000);
    expect(modal.getDiagnostics().length).toBeLessThanOrEqual(100);
    modal.clearDiagnostics();
    expect(modal.getDiagnostics()).toEqual([]);
  });

  it('registry entries drain to zero across every terminal path', async () => {
    const modal = setup({ strategy: 'queue', maxVisible: 1 });
    const results = modal as unknown as { _results: Map<string, unknown> };
    const a = modal.openModal<string>(componentContent());
    const b = modal.openModal<string>(componentContent());
    b.cancel();
    expect(await b.result).toEqual({ status: 'queued-cancelled' });
    expect(results._results.size).toBe(1);
    modal.openModal<string>(componentContent(), { ref: 'c' });
    expect(results._results.size).toBe(2);
    a.dismiss();
    drain(modal);
    expect(results._results.size).toBe(0);
  });

  it('rejected opens leave no registry residue', async () => {
    const modal = setup({ maxVisible: 1, overflow: 'reject' });
    modal.openModal(componentContent());
    const rejected = modal.openModal<string>(componentContent());
    expect(await rejected.result).toEqual({ status: 'rejected', reason: 'overflow' });
    expect((modal as unknown as { _results: Map<string, unknown> })._results.size).toBe(1);
    drain(modal);
  });

  it('manager destruction settles everything without hangs', async () => {
    const modal = setup();
    const settled: ModalResult<unknown>[] = [];
    modal.openModal(componentContent()).result.then(
      (r: ModalResult<unknown>) => settled.push(r),
      () => settled.push({ status: 'dismissed', reason: 'unexpected-rejection' }),
    );
    TestBed.resetTestingModule();
    vi.advanceTimersByTime(60_000);
    await Promise.resolve();
    expect(settled).toEqual([{ status: 'dismissed', reason: 'manager-destroyed' }]);
  });
});

describe('RiviniaModal record isolation', () => {
  const INTERNAL_KEYS = ['guards', 'closingTimer', 'ownerCleanup', 'generation', 'openedSeq'];
  const PUBLIC_KEYS = [
    'id',
    'ref',
    'caller',
    'parentId',
    'data',
    'content',
    'status',
    'dismiss',
    'metadata',
  ];

  it('public snapshots expose only ModalInstance fields', () => {
    const modal = setup();
    const keep = modal.openModal(componentContent(), { ref: 'keep' });
    const shutting = modal.openModal(componentContent(), { ref: 'iso', guards: [() => true] });
    expect(shutting.dismiss('bye')).toBe(true);
    // `shutting` is now `closing` (auto-finalize pending on fake timers);
    // `keep` stays active. Every surface must hide internals.
    expect(modal.active().map((i) => i.id)).toEqual([keep.id]);
    const snapshots = [
      ...modal.active(),
      ...modal.closing(),
      ...modal.visible(),
      ...modal.queued(),
      ...modal.findByRef('iso'),
    ];
    expect(snapshots.length).toBeGreaterThan(0);
    for (const snap of snapshots) {
      for (const key of INTERNAL_KEYS) {
        expect(snap).not.toHaveProperty(key);
      }
      expect(Object.keys(snap).sort()).toEqual([...PUBLIC_KEYS].sort());
    }
    expect(modal.top()).not.toHaveProperty('guards');
    drain(modal);
  });

  it('returned snapshots are immutable copies, not live records', () => {
    const modal = setup();
    const handle = modal.openModal<{ n: number }>(templateContent<{ n: number }>(), {
      data: { n: 1 },
    });
    const before = modal.active()[0];
    expect(modal.update(handle.id, { data: { n: 2 } })).toBe(true);
    // The previously returned object is untouched by the update.
    expect(before.data).toEqual({ n: 1 });
    expect(modal.active()[0].data).toEqual({ n: 2 });
    drain(modal);
  });
});

describe('RiviniaModal closing/visible signals', () => {
  it('exposes closing instances reactively while active/top stay unchanged', async () => {
    const modal = setup({ closingTimeout: 0 });
    const a = modal.openModal<string>(componentContent(), { ref: 'a' });
    const b = modal.openModal<string>(componentContent(), { ref: 'b' });
    expect(b.dismiss('bye')).toBe(true);
    expect(await b.result).toEqual({ status: 'dismissed', reason: 'bye' });
    // Consumer-visible: closing holds the dismissed instance until teardown.
    expect(modal.closing().map((i) => i.id)).toEqual([b.id]);
    // Visible = active + closing in strategy order; active/top unchanged.
    expect(modal.visible().map((i) => i.id)).toEqual([a.id, b.id]);
    expect(modal.active().map((i) => i.id)).toEqual([a.id]);
    expect(modal.top()?.id).toBe(a.id);
    expect(modal.confirmClosed(b.id)).toBe(true);
    expect(modal.closing()).toEqual([]);
    expect(modal.visible().map((i) => i.id)).toEqual([a.id]);
    drain(modal);
  });
});
