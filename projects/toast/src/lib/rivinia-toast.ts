import { DestroyRef, inject, Service, signal } from '@angular/core';
import {
  DEFAULT_DURATION,
  DEFAULT_MAX_VISIBLE,
  RIVINIA_TOAST_CONFIG,
  type RiviniaToastConfig,
} from './toast-config';
import type {
  Toast,
  ToastChanges,
  ToastKind,
  ToastOptions,
} from './toast-types';
import { clampDuration } from './toast-utils';

interface TimerRecord {
  handle: ReturnType<typeof setTimeout>;
  startedAt: number;
  generation: number;
}

/**
 * Headless toast queue owner.
 *
 * State: two readonly signals — `active` (visible, capped) and `queue`
 * (overflow waiting, timerless). Who changes it: only the methods below.
 * Timers: one `setTimeout` per active timed toast, guarded by a per-toast
 * generation so a stale fire can never dismiss an updated toast. No DOM,
 * no styles, no router — presentation and navigation policy are app-owned
 * (see README recipes).
 */
@Service()
export class RiviniaToast {
  private readonly config = inject<RiviniaToastConfig>(RIVINIA_TOAST_CONFIG, {
    optional: true,
  });

  private readonly _active = signal<Toast[]>([]);
  private readonly _queue = signal<Toast[]>([]);

  /** Visible toasts, oldest first. Never exceeds effective `maxVisible`. */
  readonly active = this._active.asReadonly();
  /** Overflow waiting for room. No timers run while queued. */
  readonly queue = this._queue.asReadonly();

  private readonly _timers = new Map<number, TimerRecord>();
  private readonly _generations = new Map<number, number>();
  private readonly _dedupeByKey = new Map<string, number>();
  private readonly _dedupeKeyById = new Map<number, string>();
  private _nextId = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimers());
  }

  /**
   * Shows a toast. Returns its stable id, or `null` when rejected by the
   * `'reject'` overflow policy (or a full finite queue).
   */
  show(options: ToastOptions): number | null {
    if (options.dedupeKey !== undefined) {
      const existing = this.findByDedupeKey(options.dedupeKey);
      if (existing !== null) {
        this.update(existing, {
          message: options.message,
          kind: options.kind,
          duration: options.duration,
          action: options.action ?? null,
        });
        return existing;
      }
    }

    const id = ++this._nextId;
    const kind = options.kind ?? 'info';
    const duration = this.resolveDuration(kind, options.duration);
    const toast: Toast = {
      id,
      kind,
      message: options.message,
      duration,
      remaining: duration,
      action: options.action ?? null,
    };
    if (options.dedupeKey !== undefined) {
      this._dedupeByKey.set(options.dedupeKey, id);
      this._dedupeKeyById.set(id, options.dedupeKey);
    }

    if (this._active().length < this.maxVisible()) {
      this._active.update((list) => [...list, toast]);
      this.arm(id, duration);
      return id;
    }

    switch (this.config?.overflow ?? 'dismiss-oldest') {
      case 'queue': {
        if (this._queue().length >= this.maxQueue()) {
          this.forgetDedupe(id);
          return null;
        }
        this._queue.update((list) => [...list, toast]);
        return id;
      }
      case 'reject':
        this.forgetDedupe(id);
        return null;
      case 'dismiss-oldest':
      default: {
        const oldest = this._active()[0];
        if (oldest) this.dismiss(oldest.id);
        this._active.update((list) => [...list, toast]);
        this.arm(id, duration);
        return id;
      }
    }
  }

  /**
   * Merges changes into an active or queued toast and restarts its timer
   * with the new duration (unchanged when `changes.duration` is absent).
   * Unknown ids (never shown or already dismissed): no-op, returns `false`.
   */
  update(id: number, changes: ToastChanges): boolean {
    const inActive = this._active().some((t) => t.id === id);
    const apply = (t: Toast): Toast => ({
      ...t,
      message: changes.message ?? t.message,
      kind: changes.kind ?? t.kind,
      duration: changes.duration !== undefined ? clampDuration(changes.duration, t.duration) : t.duration,
      remaining:
        changes.duration !== undefined ? clampDuration(changes.duration, t.duration) : t.duration,
      action: changes.action !== undefined ? changes.action : t.action,
    });
    if (inActive) {
      this.disarm(id);
      let next: Toast | undefined;
      this._active.update((list) =>
        list.map((t) => {
          if (t.id !== id) return t;
          next = apply(t);
          return next;
        }),
      );
      if (next) this.arm(id, next.duration);
      return true;
    }
    let found = false;
    this._queue.update((list) =>
      list.map((t) => {
        if (t.id !== id) return t;
        found = true;
        return apply(t);
      }),
    );
    return found;
  }

  /**
   * Removes a toast wherever it lives, clearing its timer. Unknown ids and
   * repeated calls: no-op, returns `false`. Removing an active toast promotes
   * the queue head (if any), whose timer starts at promotion.
   */
  dismiss(id: number): boolean {
    this.disarm(id);
    let removed = false;
    this._active.update((list) => {
      const next = list.filter((t) => t.id !== id);
      removed = next.length !== list.length;
      return next;
    });
    if (!removed) {
      this._queue.update((list) => {
        const next = list.filter((t) => t.id !== id);
        removed = next.length !== list.length;
        return next;
      });
    }
    if (removed) {
      this.forgetDedupe(id);
      this.promote();
    }
    return removed;
  }

  /** Clears timers, active and queue. Ids keep incrementing (never reused). */
  dismissAll(): void {
    this.clearTimers();
    this._active.set([]);
    this._queue.set([]);
    this._dedupeByKey.clear();
    this._dedupeKeyById.clear();
  }

  /**
   * Suspends the active timer, preserving `remaining`. UI binds this to
   * hover/focus (WCAG 2.2.1 timing control). Returns `false` for unknown ids,
   * queued/persistent toasts, or already-paused timers.
   */
  pause(id: number): boolean {
    const record = this._timers.get(id);
    if (!record) return false;
    clearTimeout(record.handle);
    this._timers.delete(id);
    const elapsed = Date.now() - record.startedAt;
    this._active.update((list) =>
      list.map((t) =>
        t.id === id ? { ...t, remaining: Math.max(0, t.remaining - elapsed) } : t,
      ),
    );
    return true;
  }

  /**
   * Restarts a paused timer with the preserved `remaining`. A toast paused at
   * zero remaining is dismissed instead (it logically already expired).
   */
  resume(id: number): boolean {
    if (this._timers.has(id)) return false;
    const toast = this._active().find((t) => t.id === id);
    if (!toast) return false;
    if (toast.remaining <= 0) {
      this.dismiss(id);
      return true;
    }
    this.arm(id, toast.remaining);
    return true;
  }

  /**
   * Runs the toast action callback, then dismisses unless the action opts out
   * via `dismissAfterPress: false`. Callback exceptions propagate to the caller.
   * Returns `false` when the toast or its action is missing.
   */
  runAction(id: number): boolean {
    const toast =
      this._active().find((t) => t.id === id) ?? this._queue().find((t) => t.id === id);
    if (!toast?.action) return false;
    toast.action.onPress();
    if (toast.action.dismissAfterPress ?? true) this.dismiss(id);
    return true;
  }

  private maxVisible(): number {
    const value = this.config?.maxVisible ?? DEFAULT_MAX_VISIBLE;
    return Math.max(1, Math.floor(value));
  }

  private maxQueue(): number {
    const value = this.config?.maxQueue ?? Number.POSITIVE_INFINITY;
    return value < 0 ? 0 : value;
  }

  private resolveDuration(kind: ToastKind, override?: number): number {
    if (override !== undefined) return clampDuration(override, this.fallbackDuration(kind));
    return this.fallbackDuration(kind);
  }

  private fallbackDuration(kind: ToastKind): number {
    const perKind = this.config?.durations?.[kind];
    if (perKind !== undefined) return clampDuration(perKind, DEFAULT_DURATION);
    return clampDuration(this.config?.duration, DEFAULT_DURATION);
  }

  private arm(id: number, delay: number): void {
    if (delay <= 0) return;
    const generation = (this._generations.get(id) ?? 0) + 1;
    this._generations.set(id, generation);
    this._timers.set(id, {
      handle: setTimeout(() => {
        // Stale-guard: only the latest generation may dismiss.
        if (this._timers.get(id)?.generation === generation) this.dismiss(id);
      }, delay),
      startedAt: Date.now(),
      generation,
    });
  }

  private disarm(id: number): void {
    const record = this._timers.get(id);
    if (record) {
      clearTimeout(record.handle);
      this._timers.delete(id);
    }
  }

  private clearTimers(): void {
    for (const record of this._timers.values()) clearTimeout(record.handle);
    this._timers.clear();
  }

  private promote(): void {
    while (this._active().length < this.maxVisible() && this._queue().length > 0) {
      const head = this._queue()[0];
      this._queue.update((list) => list.slice(1));
      const fresh: Toast = { ...head, remaining: head.duration };
      this._active.update((list) => [...list, fresh]);
      this.arm(fresh.id, fresh.duration);
    }
  }

  private findByDedupeKey(key: string): number | null {
    const id = this._dedupeByKey.get(key);
    if (id === undefined) return null;
    const present =
      this._active().some((t) => t.id === id) || this._queue().some((t) => t.id === id);
    if (!present) {
      this.forgetDedupe(id);
      return null;
    }
    return id;
  }

  private forgetDedupe(id: number): void {
    const key = this._dedupeKeyById.get(id);
    if (key !== undefined) {
      this._dedupeKeyById.delete(id);
      if (this._dedupeByKey.get(key) === id) this._dedupeByKey.delete(key);
    }
  }
}
