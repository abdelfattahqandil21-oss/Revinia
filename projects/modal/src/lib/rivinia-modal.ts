import { DestroyRef, TemplateRef, computed, inject, Service, signal } from '@angular/core';
import type { Type } from '@angular/core';
import {
  DEFAULT_CLOSING_TIMEOUT,
  DEFAULT_MAX_VISIBLE,
  DIAGNOSTIC_CAP,
  RIVINIA_MODAL_CONFIG,
  type RiviniaModalConfig,
} from './modal-config';
import type {
  ModalContent,
  ModalDiagnostic,
  ModalDismissOrigin,
  ModalDismissPolicy,
  ModalGuard,
  ModalHandle,
  ModalInstance,
  ModalOpenOptions,
  ModalResult,
  ModalTemplateContext,
  ModalUpdate,
} from './modal-types';
import { QueueStrategy, StackStrategy, type ModalStrategy } from './modal-strategy';

interface ModalRecord extends ModalInstance<unknown> {
  openedSeq: number;
  generation: number;
  guards: readonly ModalGuard[];
  closingTimer: ReturnType<typeof setTimeout> | null;
  ownerCleanup: (() => void) | null;
}

interface PendingResult {
  promise: Promise<ModalResult<unknown>>;
  resolve: (value: ModalResult<unknown>) => void;
  settled: boolean;
}

/**
 * Public snapshot of an internal record. Strips lifecycle internals (`guards`,
 * `closingTimer`, `ownerCleanup`, `generation`, `openedSeq`) so consumers can
 * never observe or mutate manager state. Frozen: UI must use `update()`.
 */
function toPublicInstance(record: ModalRecord): ModalInstance {
  return Object.freeze({
    id: record.id,
    ref: record.ref,
    caller: record.caller,
    parentId: record.parentId,
    data: record.data,
    content: record.content,
    status: record.status,
    dismiss: Object.freeze({ ...record.dismiss }),
    metadata: Object.freeze({ ...record.metadata }),
  }) as ModalInstance;
}

/**
 * Headless modal manager. Owns identity, lifecycle coordination, result
 * settlement and diagnostics. Ordering/admission policy is delegated to a
 * `ModalStrategy` (Stack/Queue/custom) — the manager never branches on mode.
 *
 * Settlement contract (each path settles exactly once, never hangs):
 * - `close()` on active → `confirmed` · `dismiss()` on active → `dismissed`
 * - `cancel()` on active → `cancelled` · on queued → `queued-cancelled`
 * - `dismiss()` on queued → `dismissed` with the reason (pre-activation)
 * - overflow/guard refusal → `rejected` · owner gone → `owner-destroyed`
 * - forced paths (owner, overflow eviction, `dismissAll`) bypass guards
 * - `close/dismiss/cancel` are guard-free primitives; `requestDismiss` runs
 *   guards for user intents (escape/backdrop/button) or explicit review
 * - infrastructure failures reject the promise — never a result variant
 *
 * Results settle at dismissal initiation, not after UI teardown: animations
 * never delay callers. The `closing` → `closed` handshake (`confirmClosed`
 * or `closingTimeout` auto-finalize) exists only for exit animations.
 */
@Service()
export class RiviniaModal {
  private readonly config = inject<RiviniaModalConfig>(RIVINIA_MODAL_CONFIG, {
    optional: true,
  });

  private readonly _instances = signal<readonly ModalRecord[]>([]);
  private readonly _results = new Map<string, PendingResult>();
  /** In-flight guarded dismissals: concurrent intents share one guard run. */
  private readonly _dismissInflight = new Map<string, Promise<boolean>>();
  private _strategy: ModalStrategy = this.resolveStrategy(this.config?.strategy);
  private _seq = 0;
  private _diagSeq = 0;
  private readonly _diagnostics: ModalDiagnostic[] = [];

  /** Active instances in strategy display order (bottom-first). */
  readonly active = computed<readonly ModalInstance[]>(() =>
    this._strategy
      .order(this._instances().filter((i) => i.status === 'active'))
      .map(toPublicInstance),
  );
  /** Queued instances, FIFO admission order. */
  readonly queued = computed<readonly ModalInstance[]>(() =>
    this._instances()
      .filter((i) => i.status === 'queued')
      .map(toPublicInstance),
  );
  /** Closing instances (exit animations), in strategy display order. */
  readonly closing = computed<readonly ModalInstance[]>(() =>
    this._strategy.order(this._instances().filter((i) => i.status === 'closing')),
  );
  /** Everything rendered (active + closing), in strategy display order. */
  readonly visible = computed<readonly ModalInstance[]>(() =>
    this._strategy.order(
      this._instances().filter((i) => i.status === 'active' || i.status === 'closing'),
    ),
  );
  /** Topmost active instance (the only Escape-eligible one), if any. */
  readonly top = computed<ModalInstance | null>(() => {
    const list = this.active();
    return list.length > 0 ? list[list.length - 1] : null;
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      for (const record of [...this._instances()]) {
        if (record.status === 'queued') {
          this.remove(record.id);
          this.settle(record.id, { status: 'queued-cancelled' });
        } else if (record.status !== 'closed') {
          this.clearClosingTimer(record.id);
          this.remove(record.id);
          this.settle(record.id, { status: 'dismissed', reason: 'manager-destroyed' });
        }
      }
    });
  }

  openModal<TData = unknown, TResult = unknown>(
    template: TemplateRef<ModalTemplateContext<TData>>,
    options?: ModalOpenOptions<TData>,
  ): ModalHandle<TResult>;
  openModal<TComponent, TData = unknown, TResult = unknown>(
    component: Type<TComponent>,
    options?: ModalOpenOptions<TData>,
  ): ModalHandle<TResult>;
  openModal<TData = unknown, TResult = unknown>(
    content: ModalContent<TData>,
    options?: ModalOpenOptions<TData>,
  ): ModalHandle<TResult>;
  openModal<TData = unknown, TResult = unknown>(
    content: ModalContent<TData> | TemplateRef<ModalTemplateContext<TData>> | Type<unknown>,
    options: ModalOpenOptions<TData> = {},
  ): ModalHandle<TResult> {
    const id = `modal-${++this._seq}`;
    const pending = this.deferred();
    this._results.set(id, pending);    const handle: ModalHandle<TResult> = {
      id,
      result: pending.promise as Promise<ModalResult<TResult>>,
      close: (value?: TResult) => this.close(id, value),
      dismiss: (reason?: string) => this.dismiss(id, reason),
      cancel: (reason?: string) => this.cancel(id, reason),
    };

    const visibleCount = this._instances().filter((i) => i.status !== 'queued').length;
    const intent = this._strategy.admit(visibleCount, this.queuedCount(), this.maxVisible());
    let status: 'active' | 'queued' = intent === 'activate' ? 'active' : 'queued';
    if (intent === 'queue') {
      const outcome = this.admitQueued(id);
      if (outcome === 'active' || outcome === 'queued') {
        // 'dismiss-oldest' evicted room: the newcomer activates immediately.
        // 'queue' keeps it queued.
        status = outcome;
      } else {
        this.settle(id, { status: 'rejected', reason: outcome });
        this.diagnose('rejected', id, options.ref ?? null, outcome);
        return handle;
      }
    }

    const record: ModalRecord = {
      id,
      ref: options.ref ?? null,
      caller: options.caller ?? null,
      parentId: this.knownParent(options.parentId) ? (options.parentId as string) : null,
      data: options.data as unknown,
      content: this.normalizeContent(content, options),
      status,
      // Precedence: built-in defaults < global config < named preset < per-call.
      // Layers merge field-by-field so an absent key never clobbers a default.
      dismiss: this.resolveDismiss(options.dismiss, options.preset),
      metadata: { ...(options.metadata ?? {}) },
      openedSeq: this._seq,
      generation: 0,
      guards: [...(options.guards ?? [])],
      closingTimer: null,
      ownerCleanup: null,
    };
    if (options.parentId !== undefined && record.parentId === null) {
      this.diagnose('rejected', id, record.ref, 'stale-parent');
    }
    this._instances.update((list) => [...list, record]);

    if (options.owner) {
      let ownerCleanup: (() => void) | null = null;
      try {
        ownerCleanup = options.owner.onDestroy(() => this.teardownOwned(id));
      } catch {
        // Owner already destroyed (NG0205): settle immediately and never add.
        this._instances.update((list) => list.filter((i) => i.id !== id));
        this.settle(id, { status: 'owner-destroyed' });
        this.diagnose('rejected', id, record.ref, 'owner-destroyed');
        return handle;
      }
      this.patch(id, { ownerCleanup });
    }
    this.diagnose(intent === 'activate' ? 'activated' : 'queued', id, record.ref);
    return handle;
  }

  /**
   * Confirms with a value. Active instances only; settles `confirmed`.
   * Blocked (returns `false`) by the prevent-parent-close policy.
   */
  close(id: string, value?: unknown): boolean {
    const record = this.get(id);
    if (!record || record.status !== 'active' || this.blockedByDescendants(id)) return false;
    this.beginClosing(id, 'confirmed', undefined, value);
    return true;
  }

  /**
   * Guard-free dismissal primitive. Active → `dismissed`; queued → removed as
   * `dismissed` with the reason. Blocked by prevent-parent-close.
   */
  dismiss(id: string, reason?: string): boolean {
    const record = this.get(id);
    if (!record || this.blockedByDescendants(id)) return false;
    if (record.status === 'active') {
      this.beginClosing(id, 'dismissed', reason);
      return true;
    }
    if (record.status === 'queued') {
      this.closeDescendants(id, true);
      this.remove(id);
      this.settle(id, { status: 'dismissed', reason });
      this.diagnose('dismissed', id, record.ref, reason);
      return true;
    }
    return false;
  }

  /**
   * Cancels: active → `cancelled`, queued → removed as `queued-cancelled`.
   * Blocked by prevent-parent-close. Closing/closed/unknown → `false`.
   */
  cancel(id: string, reason?: string): boolean {
    const record = this.get(id);
    if (!record || this.blockedByDescendants(id)) return false;
    if (record.status === 'queued') {
      this.closeDescendants(id, true);
      this.remove(id);
      this.settle(id, { status: 'queued-cancelled' });
      this.diagnose('dismissed', id, record.ref, reason ?? 'cancelled');
      return true;
    }
    if (record.status !== 'active') return false;
    this.beginClosing(id, 'cancelled', reason);
    return true;
  }

  /**
   * Guarded dismissal for user intents (escape/backdrop/button) or explicit
   * programmatic review. Guards run sequentially; any `false` or throw denies
   * (stays open + diagnostic). Stale guard completions are ignored.
   */
  async requestDismiss(
    id: string,
    origin: ModalDismissOrigin,
    reason?: string,
  ): Promise<boolean> {
    const record = this.get(id);
    if (!record || record.status !== 'active' || this.blockedByDescendants(id)) return false;
    const inflight = this._dismissInflight.get(id);
    if (inflight) return inflight;
    const run = this.runGuards(id, origin, reason);
    this._dismissInflight.set(id, run);
    try {
      return await run;
    } finally {
      if (this._dismissInflight.get(id) === run) this._dismissInflight.delete(id);
    }
  }

  private async runGuards(
    id: string,
    origin: ModalDismissOrigin,
    reason?: string,
  ): Promise<boolean> {
    const record = this.get(id);
    if (!record) return false;
    const generation = record.generation;
    for (const guard of record.guards) {
      let allowed: boolean;
      try {
        allowed = await guard({ id, origin });
      } catch {
        allowed = false;
      }
      const current = this.get(id);
      if (!current || current.status !== 'active' || current.generation !== generation) {
        return false; // Resolved stale: something else already moved it.
      }
      if (!allowed) {
        this.diagnose('guard-denied', id, record.ref, origin);
        return false;
      }
    }
    return this.dismiss(id, reason ?? origin);
  }

  /** Merges data/metadata (new object identity so UI re-renders). */
  update<TData>(id: string, changes: import('./modal-types').ModalUpdate<TData>): boolean {
    const record = this.get(id);
    if (!record || (record.status !== 'active' && record.status !== 'queued')) return false;
    this._instances.update((list) =>
      list.map((t) =>
        t.id === id
          ? {
              ...t,
              data: (changes.data !== undefined ? changes.data : t.data) as unknown,
              metadata: changes.metadata !== undefined ? { ...changes.metadata } : t.metadata,
            }
          : t,
      ),
    );
    return true;
  }

  /** UI teardown confirmation after exit animations. Auto-finalizes via timeout. */
  confirmClosed(id: string): boolean {
    const record = this.get(id);
    if (!record || record.status !== 'closing') return false;
    this.finalize(id);
    return true;
  }

  /** Forced cleanup (bypasses guards): active → `dismissed`, queued → `queued-cancelled`. */
  dismissAll(reason = 'dismiss-all'): void {
    for (const record of [...this._instances()]) {
      if (record.status === 'queued') {
        this.remove(record.id);
        this.settle(record.id, { status: 'queued-cancelled' });
      } else if (record.status === 'active') {
        this.beginClosing(record.id, 'dismissed', reason);
      } else if (record.status === 'closing') {
        this.finalize(record.id);
      }
    }
  }

  /** Non-closed snapshots for a definition ref (e.g. avoid duplicate confirms). */
  findByRef(ref: string): ModalInstance[] {
    return this._instances()
      .filter((i) => i.ref === ref && i.status !== 'closed')
      .map(toPublicInstance);
  }

  /**
   * Swaps the strategy. Rejected with an explicit error while any instance is
   * not closed — silent live migration is never attempted.
   */
  useStrategy(strategy: ModalStrategy): void {
    if (this._instances().some((i) => i.status !== 'closed')) {
      throw new Error(
        '[rivinia/modal] useStrategy() rejected: active, queued or closing modals exist. ' +
          'Close everything first — live migration is not supported.',
      );
    }
    this._strategy = strategy;
  }

  /** Introspection snapshot. Active means interactive; closing instances are
   * still rendered (exit animations) until `confirmClosed`/timeout finalizes. */
  debugState(): { strategy: string; active: string[]; closing: string[]; queued: string[] } {
    const all = this._instances();
    return {
      strategy: this._strategy.name,
      active: this.orderedActive()
        .filter((i) => i.status === 'active')
        .map((i) => i.id),
      closing: all.filter((i) => i.status === 'closing').map((i) => i.id),
      queued: all.filter((i) => i.status === 'queued').map((i) => i.id),
    };
  }

  /** Bounded transition log (only when `diagnostics: true`). */
  getDiagnostics(): readonly import('./modal-types').ModalDiagnostic[] {
    return [...this._diagnostics];
  }

  clearDiagnostics(): void {
    this._diagnostics.length = 0;
  }

  // ------------------------------------------------------------------ internals

  private get(id: string): ModalRecord | undefined {
    return this._instances().find((i) => i.id === id);
  }

  /** Accepts raw `TemplateRef`/`Type` or a full descriptor (README form). */
  private normalizeContent<TData>(
    content: ModalContent<TData> | TemplateRef<ModalTemplateContext<TData>> | Type<unknown>,
    options: ModalOpenOptions<TData>,
  ): ModalRecord['content'] {
    if (content instanceof TemplateRef) {
      return {
        kind: 'template',
        template: content as unknown as TemplateRef<ModalTemplateContext<unknown>>,
      };
    }
    if (typeof content === 'function') {
      return {
        kind: 'component',
        component: content as Type<unknown>,
        ...(options.inputs ? { inputs: { ...options.inputs } } : {}),
      };
    }
    return content as ModalRecord['content'];
  }

  private queuedCount(): number {
    return this._instances().filter((i) => i.status === 'queued').length;
  }

  private orderedActive(): ModalRecord[] {
    return [
      ...this._strategy.order(
        this._instances().filter((i) => i.status === 'active' || i.status === 'closing'),
      ),
    ];
  }

  private maxVisible(): number {
    return Math.max(1, Math.floor(this.config?.maxVisible ?? DEFAULT_MAX_VISIBLE));
  }

  private maxQueue(): number {
    const value = this.config?.maxQueue ?? Number.POSITIVE_INFINITY;
    return value < 0 ? 0 : value;
  }

  private presetDismiss(preset?: string): Record<string, unknown> {
    if (!preset) return {};
    return { ...(this.config?.presets?.[preset]?.dismiss ?? {}) };
  }

  private resolveDismiss(
    perCall?: Partial<ModalDismissPolicy>,
    preset?: string,
  ): ModalDismissPolicy {
    const merged: { closeOnEscape?: boolean; backdrop?: 'close' | 'static' | 'disabled' } = {
      closeOnEscape: true,
      backdrop: 'close',
    };
    const layers: Array<Partial<ModalDismissPolicy> | Record<string, unknown> | undefined> = [
      this.config?.dismiss,
      this.presetDismiss(preset),
      perCall,
    ];
    for (const layer of layers) {
      if (!layer) continue;
      const typed = layer as { closeOnEscape?: boolean; backdrop?: 'close' | 'static' | 'disabled' };
      if (typed.closeOnEscape !== undefined) merged.closeOnEscape = typed.closeOnEscape;
      if (typed.backdrop !== undefined) merged.backdrop = typed.backdrop;
    }
    return merged as import('./modal-types').ModalDismissPolicy;
  }

  private knownParent(parentId: string | undefined): parentId is string {
    if (parentId === undefined) return false;
    return this._instances().some((i) => i.id === parentId && i.status !== 'closed');
  }

  /** Overflow handling for queue-intent admissions. Returns rejection reason, or the resulting status. */
  private admitQueued(id: string): string | 'active' | 'queued' {
    switch (this.config?.overflow ?? 'queue') {
      case 'reject':
        return 'overflow';
      case 'dismiss-oldest': {
        // Preempt: evict oldest pure-active instance (system path, no guards).
        const oldest = this.orderedActive().find((i) => i.status === 'active');
        if (oldest) this.beginClosing(oldest.id, 'dismissed', 'overflow-evicted');
        return 'active';
      }
      case 'queue':
      default:
        return this.queuedCount() >= this.maxQueue() ? 'queue-full' : 'queued';
    }
  }

  private blockedByDescendants(id: string): boolean {
    if ((this.config?.descendants ?? 'close-with-parent') !== 'prevent-parent-close') {
      return false;
    }
    const blocked = this._instances().some(
      (i) => i.parentId === id && i.status !== 'closed' && i.status !== 'closing',
    );
    if (blocked) this.diagnose('strategy-rejected', id, this.get(id)?.ref ?? null, 'prevent-parent-close');
    return blocked;
  }

  private beginClosing(
    id: string,
    status: 'confirmed' | 'dismissed' | 'cancelled',
    reason?: string,
    value?: unknown,
  ): void {
    const record = this.get(id);
    if (!record || record.status !== 'active') return;
    const generation = record.generation + 1;
    this.closeDescendants(id, false);
    this.patch(id, { status: 'closing', generation });
    if (status === 'confirmed') {
      this.settle(id, { status, value } as ModalResult<unknown>);
    } else {
      this.settle(id, { status, reason } as ModalResult<unknown>);
    }
    this.diagnose('closing', id, record.ref, reason);
    const timeout = Math.max(0, this.config?.closingTimeout ?? DEFAULT_CLOSING_TIMEOUT);
    if (timeout === 0) return; // Manual teardown: UI must call confirmClosed().
    const timer = setTimeout(() => {
      const current = this.get(id);
      if (current && current.status === 'closing' && current.generation === generation) {
        this.finalize(id);
      }
    }, timeout);
    this.patch(id, { closingTimer: timer });
  }

  private closeDescendants(parentId: string, force: boolean): void {
    if (!force && (this.config?.descendants ?? 'close-with-parent') !== 'close-with-parent') {
      return;
    }
    for (const child of this._instances().filter(
      (i) => i.parentId === parentId && (i.status === 'active' || i.status === 'queued'),
    )) {
      if (child.status === 'queued') {
        this.remove(child.id);
        this.settle(child.id, { status: 'queued-cancelled' });
        this.diagnose('dismissed', child.id, child.ref, 'parent-closed');
      } else {
        this.closeDescendants(child.id, force);
        this.beginClosing(child.id, 'dismissed', 'parent-closed');
      }
    }
  }

  private finalize(id: string, promoteAfter = true): void {
    const record = this.get(id);
    if (!record) return;
    this.clearClosingTimer(id);
    const cleanup = record.ownerCleanup;
    const ref = record.ref;
    this.patch(id, { status: 'closed', closingTimer: null });
    cleanup?.();
    this._instances.update((list) => list.filter((i) => i.id !== id));
    this._results.delete(id);
    this.diagnose('closed', id, ref);
    if (promoteAfter) this.promote();
  }

  private promote(): void {
    const width = this._strategy.maxActive(this.maxVisible());
    const visible = (): number =>
      this._instances().filter((i) => i.status === 'active' || i.status === 'closing').length;
    while (visible() < width) {
      const head = this._instances().find((i) => i.status === 'queued');
      if (!head) break;
      this.patch(head.id, { status: 'active' });
      this.diagnose('promoted', head.id, head.ref);
    }
  }

  private remove(id: string): void {
    this.clearClosingTimer(id);
    this._instances.update((list) => list.filter((i) => i.id !== id));
  }

  private clearClosingTimer(id: string): void {
    const record = this.get(id);
    if (record?.closingTimer) {
      clearTimeout(record.closingTimer);
      this.patch(id, { closingTimer: null });
    }
  }

  private teardownOwned(id: string): void {
    const record = this.get(id);
    if (!record || record.status === 'closed' || record.status === 'closing') return;
    if (record.status === 'queued') {
      this.closeDescendants(id, true);
      this.remove(id);
      this.settle(id, { status: 'queued-cancelled' });
      this.diagnose('dismissed', id, record.ref, 'owner-destroyed');
      return;
    }
    this.closeDescendants(id, true);
    this.patch(id, { status: 'closing', generation: record.generation + 1 });
    this.settle(id, { status: 'owner-destroyed' });
    this.diagnose('closing', id, record.ref, 'owner-destroyed');
    // Promote normally: freeing room must activate the queued head (whose own
    // owner is alive). A queued toast sharing the dead owner is torn down by
    // its own owner callback in the same pass, settling owner-destroyed.
    this.finalize(id);
  }

  private patch(id: string, changes: Partial<ModalRecord>): void {
    this._instances.update((list) => list.map((t) => (t.id === id ? { ...t, ...changes } : t)));
  }

  private deferred<TResult>(): PendingResult & { promise: Promise<ModalResult<TResult>> } {
    let resolve!: (value: ModalResult<unknown>) => void;
    const promise = new Promise<ModalResult<unknown>>((res) => {
      resolve = res;
    });
    return {
      promise: promise as Promise<ModalResult<TResult>>,
      resolve: (value) => {
        resolve(value);
      },
      settled: false,
    };
  }

  private settle(id: string, value: ModalResult<unknown>): void {
    const pending = this._results.get(id);
    if (!pending || pending.settled) return; // Exactly-once, even under reentrancy.
    pending.settled = true;
    // Delete on settle: entries must not outlive their promises. finalize()
    // keeps its own delete as a backstop for paths that bypass settle.
    this._results.delete(id);
    pending.resolve(value);
  }

  private diagnose(
    type: import('./modal-types').ModalDiagnostic['type'],
    id: string,
    ref: string | null,
    reason?: string,
  ): void {
    if (!this.config?.diagnostics) return;
    this._diagnostics.push({ seq: ++this._diagSeq, type, id, ref, reason });
    while (this._diagnostics.length > DIAGNOSTIC_CAP) this._diagnostics.shift();
  }

  private resolveStrategy(configured: RiviniaModalConfig['strategy']): ModalStrategy {
    if (!configured || configured === 'stack') return new StackStrategy();
    if (configured === 'queue') return new QueueStrategy();
    return configured;
  }
}
