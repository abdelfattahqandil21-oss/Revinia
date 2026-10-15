import type { DestroyRef, TemplateRef, Type } from '@angular/core';

/**
 * Discriminated result of a modal request. Every terminal path settles exactly
 * once — infrastructure failures reject the promise instead of becoming variants.
 */
export type ModalResult<T> =
  | { readonly status: 'confirmed'; readonly value: T }
  | { readonly status: 'cancelled'; readonly reason?: string }
  | { readonly status: 'dismissed'; readonly reason?: string }
  | { readonly status: 'owner-destroyed' }
  | { readonly status: 'queued-cancelled' }
  | { readonly status: 'rejected'; readonly reason?: string };

/** Lifecycle state of one modal instance. Single source of truth: the manager. */
export type ModalStatus = 'queued' | 'active' | 'closing' | 'closed';

/** Origin of a dismissal intent. Guards see it; forced paths bypass guards. */
export type ModalDismissOrigin =
  | 'escape'
  | 'backdrop'
  | 'button'
  | 'program'
  | 'system';

/** Content a modal renders. Core stores the descriptor; UI interprets it. */
export type ModalContent<TData> =
  | { readonly kind: 'template'; readonly template: TemplateRef<ModalTemplateContext<TData>> }
  | {
      readonly kind: 'component';
      readonly component: Type<unknown>;
      /**
       * Component inputs bound by the UI via `NgComponentOutlet`.
       *
       * Type hole (by design, not checked): `Record<string, unknown>` accepts
       * any shape — a misspelled input key compiles and fails silently at
       * render. The UI layer, not Core, owns binding.
       */
      readonly inputs?: Record<string, unknown>;
    };

/** Template context for `TemplateRef` content. */
export interface ModalTemplateContext<TData> {
  /** Typed input data (`let-data`). */
  readonly $implicit: TData;
  /** Modal operations (`let-modal="modal"`). */
  readonly modal: ModalContext<TData>;
}

/**
 * Operations exposed to modal content (injected token value for components,
 * template context for templates). Scoped to ONE instance — never global.
 */
export interface ModalContext<TData> {
  readonly id: string;
  readonly data: TData;
  readonly parentId: string | null;
  /**
   * Type hole (by design): `result` is `unknown`, so passing the wrong payload
   * type compiles — the mismatch surfaces only in the `ModalResult` value the
   * opener awaits. Prefer the typed `ModalHandle<TResult>.close()` at the
   * call site, which IS checked (see type tests).
   */
  close(result?: unknown): boolean;
  dismiss(reason?: string): boolean;
}

/**
 * Guard hook run by `requestDismiss` (user intents: escape/backdrop/button,
 * or explicit programmatic review). Return `false` (or a rejecting promise)
 * to deny. Throwing denies safely. Never blocks forced disposal.
 */
export type ModalGuard = (context: {
  readonly id: string;
  readonly origin: ModalDismissOrigin;
}) => boolean | Promise<boolean>;

/** Dismissal policy: global defaults, per-open overrides win. */
export interface ModalDismissPolicy {
  /** Escape closes the topmost eligible modal. @default true */
  readonly closeOnEscape?: boolean;
  /** Backdrop click behavior. @default 'close' */
  readonly backdrop?: 'close' | 'static' | 'disabled';
}

/** Overflow behavior when capacity is full. @default 'queue' (lossless). */
export type ModalOverflowPolicy = 'dismiss-oldest' | 'queue' | 'reject';

/** What closing a parent does to its descendants. */
export type DescendantPolicy = 'close-with-parent' | 'prevent-parent-close';

/** Public, UI-consumable snapshot of one modal instance. */
export interface ModalInstance<TData = unknown> {
  readonly id: string;
  /** Stable key for a modal definition (e.g. `'confirm-delete'`). */
  readonly ref: string | null;
  /** Request origin label for diagnostics (e.g. component/feature name). */
  readonly caller: string | null;
  readonly parentId: string | null;
  readonly data: TData;
  readonly content: ModalContent<TData>;
  readonly status: ModalStatus;
  readonly dismiss: ModalDismissPolicy;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Caller-side handle. `result` settles exactly once per the manager contract;
 * repeated terminal calls are safe no-ops returning `false`.
 */
export interface ModalHandle<TResult = unknown> {
  readonly id: string;
  readonly result: Promise<ModalResult<TResult>>;
  close(result?: TResult): boolean;
  dismiss(reason?: string): boolean;
  cancel(reason?: string): boolean;
}

/** Arguments to `openModal()`. */
export interface ModalOpenOptions<TData = unknown> {
  readonly data?: TData;
  readonly ref?: string;
  readonly caller?: string;
  readonly parentId?: string;
  /**
   * Lifecycle owner. Destruction settles active modals as `owner-destroyed`
   * and queued ones as `queued-cancelled`. Default: independent lifetime.
   */
  readonly owner?: DestroyRef;
  /** Named preset from global config (explicit options always win). */
  readonly preset?: string;
  readonly dismiss?: Partial<ModalDismissPolicy>;
  readonly guards?: readonly ModalGuard[];
  readonly metadata?: Record<string, unknown>;
  /** Inputs for component content (bound by the UI via `NgComponentOutlet`).
   *
   * Type hole (by design, not checked): any shape compiles; misspelled keys
   * fail silently at render. See `ModalContent` inputs.
   */
  readonly inputs?: Record<string, unknown>;
}

/** Partial changes for `update()` (content shape itself is immutable). */
export interface ModalUpdate<TData = unknown> {
  readonly data?: TData;
  readonly metadata?: Record<string, unknown>;
}

/** Bounded diagnostic record. Never carries payloads. */
export interface ModalDiagnostic {
  readonly seq: number;
  readonly type:
    | 'opened'
    | 'activated'
    | 'queued'
    | 'promoted'
    | 'closing'
    | 'closed'
    | 'dismissed'
    | 'rejected'
    | 'guard-denied'
    | 'strategy-rejected';
  readonly id: string;
  readonly ref: string | null;
  readonly reason?: string;
}
