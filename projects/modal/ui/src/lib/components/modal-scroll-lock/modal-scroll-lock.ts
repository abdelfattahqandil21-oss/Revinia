import { DOCUMENT, Service, inject } from '@angular/core';

/**
 * Reference-counted background scroll lock. Multiple overlays share one lock:
 * closing one modal never unlocks the page while another still needs it.
 * Restores the exact previous `overflow` value (never blanks app-owned
 * styles). All DOM access happens inside methods — never at module
 * evaluation — and every method is a no-op without a document (SSR).
 */
@Service()
export class RiviniaModalScrollLock {
  private readonly _doc = inject(DOCUMENT, { optional: true });
  private _locks = 0;
  private _previousOverflow: string | null = null;

  /** Number of active locks (diagnostics/tests). */
  get active(): number {
    return this._locks;
  }

  acquire(): void {
    const doc = this.document;
    if (!doc) return;
    this._locks += 1;
    if (this._locks > 1) return;
    const body = doc.body;
    this._previousOverflow = body.style.overflow || null;
    body.style.overflow = 'hidden';
    // Reserve the scrollbar gutter where supported so content does not jump.
    // Overlay scrollbars ignore it; that is documented, not promised.
    doc.documentElement.style.setProperty('scrollbar-gutter', 'stable');
  }

  release(): void {
    const doc = this.document;
    if (!doc || this._locks === 0) {
      this._locks = 0;
      return;
    }
    this._locks -= 1;
    if (this._locks > 0) return;
    const body = doc.body;
    if (this._previousOverflow === null) body.style.removeProperty('overflow');
    else body.style.overflow = this._previousOverflow;
    this._previousOverflow = null;
    doc.documentElement.style.removeProperty('scrollbar-gutter');
  }

  private get document(): Document | null {
    try {
      return this._doc ?? (typeof document === 'undefined' ? null : document);
    } catch {
      return null;
    }
  }
}
