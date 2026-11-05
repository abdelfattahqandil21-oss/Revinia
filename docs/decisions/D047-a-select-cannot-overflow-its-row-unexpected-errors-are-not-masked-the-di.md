## 2026-10-19 — D47: a select cannot overflow its row; unexpected errors are not masked; the dialog gets a loader

Three defects, all found by a consumer using the packages.

### 1. A select could overflow its cell and land on its neighbour

- **Measured.** A grid cell was 207px; the trigger was **357px** — overflowing by
  150px and overlapping the next select. The cause: `min-width:
  var(--rv-select-width)` on the trigger, with `--rv-select-width` set to 21rem
  (357px at a 17px root). In CSS **`min-width` beats `max-width`**, so the
  trigger's `max-width: 100%` could not cap it. A plain `max-width` was
  powerless, and a `width: 100%` on the trigger would have fought the
  `min-width` instead of resolving it.
- **Fix, in three parts:**
  - `min-width: min(var(--rv-select-width, 14rem), 100%)` on the trigger —
    `min()` is the only way to cap a `min-width`, because the cascade gives
    `min-width` priority over `max-width`.
  - the width has to reach the trigger, and the chain is host → wrapper →
    popup host → trigger wrapper → trigger. Two links in it were
    `inline-block`/`inline-flex` and therefore shrink-to-fit, so the cap
    resolved against a narrow width. Both now carry `width: 100%`, which
    resolves to `auto` when nothing upstream has a definite width — so a select
    with no size constraint still shrink-wraps to its content, as before.
  - the panel's own `min-width` is capped the same way, so the popup can never
    be wider than the button that opened it.
- **Verified in the consumer app**: the triggers are now 207/207/207 in 207px
  cells (no overflow), the panel is 207px — exactly the trigger's width — and
  it stays 0px from it. Before: 357px, overflowing.

### 2. Unexpected runtime errors were masked as network failures

- The consumer's `ApiService.toApiError` turned **every** thrown value into an
  `ApiError`, so a `TypeError` from a response shape that did not match the
  model surfaced as *"Could not reach the lab backend. Is it running on port
  4010?"* — sending every hunt for the cause to the wrong place. This is
  exactly the class of failure that passes TypeScript and breaks at runtime.
- **Fix.** Only an `HttpErrorResponse` is an expected failure and becomes an
  `ApiError`. Anything else is **logged and rethrown**, so the app's global
  handler sees it too. A `rethrowIfUnexpected(error, context)` helper applies
  the same rule at every screen-level catch: an `ApiError` is shown, anything
  else is reported and rethrown. The screen still finishes its work — the
  world continues — but the defect is never silent.
- The library's own `catch` blocks were reviewed and left alone: they are
  best-effort DOM calls (focus, scroll lock) and one known condition
  (NG0205, an owner destroyed before the dialog opened). Rethrowing those
  would break the app for a non-problem.

### 3. The dialog had no loading state

- A dialog that opens before its data arrives showed an empty box, which
  reads as a broken dialog.
- **Fix.** `loadingOf` on the host — the same shape as the existing `titleOf`
  — decides PER INSTANCE whether it is loading, because one host can have
  several dialogs open and they load independently. While it is true the host
  renders a loader instead of the instance's content: a `role="status"`
  polite live region (announced without stealing focus) with a spinner that
  `prefers-reduced-motion` stops. A throwing resolver falls back to "not
  loading", so the content renders — the safe default.
- Verified: 51/51 → 53/53 modal tests, the new cases covering both the
  loading and the not-loading paths.
