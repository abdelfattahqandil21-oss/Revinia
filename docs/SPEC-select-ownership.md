# SPEC — select: controller ownership, mode precedence, shared instances

Status: **implemented 2026-10-30** — approved, implemented on this branch
Branch: `pkg/select/ownership-contract` (from `main` @ `de64c1e`)
Package: `@rivinia/select` (0.6.x line, unpublished)
Kind: documentation + tests + one **type-only** source edit. No runtime behaviour change.

## 1. Scope

In scope, for `@rivinia/select` only:

- written rules for who owns a controller and which `mode` wins;
- written rules for the one supported sharing configuration, and what sharing does
  and does not share;
- tests that pin those rules;
- replacing the duplicated `'single' | 'multi'` union on the component with the
  exported `RiviniaSelectMode` type.

Out of scope: any public API redesign. No registry, no global singleton, no
static factory, no constructor restriction, no Symbol-based scoping, no
per-component state maps, no multi-scope controller. None of these is added by
this SPEC.

## 2. Verified today (source facts)

| # | Fact | Source |
|---|---|---|
| F1 | `[select]` is an input; the effective controller is `select() ?? ownedSingle/ownedMulti` | `select-panel.ts:77`, `:242` |
| F2 | Each component instance allocates both owned controllers eagerly | `select-panel.ts:209-210` |
| F3 | `mode` is read only to pick the owned controller; every behaviour reads `controller().mode` | `select-panel.ts:242`, `:331`, `:360`, `:368` |
| F4 | The component mirrors its `options` input into the bound controller on every pass | `select-panel.ts:254-256` |
| F5 | A form→controller effect also *reads* the controller's `value()`/`values()` to skip redundant writes | `select-panel.ts:267-285` |
| F6 | `RIVINIA_SELECT` / `provideRiviniaSelect` / `injectRiviniaSelect` exist and are exported | `select-di.ts:43,52,65`; `src/public-api.ts` |
| F7 | The UI package never injects `RIVINIA_SELECT` | no occurrence under `projects/select/ui` |
| F8 | `RiviniaSelectMode` is exported; the component restates the union inline | `select-types.ts:20`; `select-panel.ts:79` |
| F9 | `setValue`/`setValues` bypass the unknown/disabled guards; no test calls them | `rivinia-select.ts:83-94`; test suite |

F1–F3 are the basis of the mode precedence rule; F4–F5 are the basis of the
shared-instance rule; F7 is the basis of the DI rule.

## 3. Ownership rules

### 3.1 Component-owned controller (default)

A `<rv-select>` **without** `[select]` owns its controller. `mode` selects which
owned controller is used (`'single'` → `ownedSingle`, `'multi'` → `ownedMulti`).

- Two instances of `rv-select` have two controllers and two independent states
  (value, query, option registry).
- This is the normal usage; nothing here requires sharing.

### 3.2 Externally supplied controller — `[select]`

`[select]` is the **only** way to bind a controller from outside. When it is
supplied:

- the external controller is authoritative for its own mode;
- the `mode` input does **not** change the external controller's mode; it is
  simply not consulted (F1, F3);
- this precedence is part of the contract, not an accident of `??`.

### 3.3 Provider — injector scope only

`provideRiviniaSelect(mode)` puts a controller into the injector; it does **not**
connect it to any `rv-select`. The consumer must bind it explicitly:

```ts
readonly controller = injectRiviniaSelect();
```

```html
<rv-select [select]="controller" [options]="options" />
```

The component will **not** be changed to inject `RIVINIA_SELECT` itself. An
implicit lookup would hand the same instance to every `rv-select` below the
provider — the accidental form of §4, applied to a whole subtree.

Consequences:

- one provider = one controller per injector;
- independent selects from DI need independent injectors (`providers` on the
  component) or the constructor;
- `injectRiviniaSelect()` throws the documented error when nothing is provided
  (`select-di.ts:69`).

### 3.4 Mode precedence, summarised

| Binding | Mode used | `mode` input effect |
|---|---|---|
| none (component-owned) | `mode` input | selects the owned controller |
| `[select]="c"` | `c.mode` | none |

## 4. Sharing one controller

Sharing is an explicit configuration, not a bug and not the default.

**A. Independent selects (normal).** Each owns or receives its own controller.
Selection, query and option registry are all per controller; nothing leaks
between components.

**B. Several components bound to one controller (intentional).** They share
controller state:

| Shared (controller) | Per component (UI) |
|---|---|
| `value` / `values` | panel open state, active row, focus |
| `query` | `justOpened`, label id |
| option registry — **one**, not one per component | the `options` input it mirrors |

Because each component mirrors its own `options` input into the same registry
(F4), a component whose list differs replaces the list the other one sees. Last
sync wins.

### 4.1 Measured limitation (must be stated before B is promised)

Case B only holds when the components agree on the value. Measured on this
branch:

- two unbound siblings: `shared.select('a')` ends at `null` after a settle, and
  a pick through the UI makes the two components ping-pong (one selects, the
  other clears) — the suite does not finish;
- the same two components bound to **one** `[(value)]` model: the pick lands in
  the controller, the model updates, both triggers render the label.

Cause: F5. The form→controller effect reads `value()`/`values()` and, on a
mismatch, writes the controller — so a sibling whose form value is still `null`
treats the shared controller as stale and clears it. The effect is documented as
one-way (form → controller); the reverse dependency it accidentally creates is
what makes unbound sharing fight.

Two ways out, owner's call:

1. **Document the precondition.** Sharing is supported when the components
   present one logical value (typically one `[(value)]` binding). Cheap, matches
   the intended use, no source change. The README says so in one sentence.
2. **Make the effect one-way.** Compare through `untracked(...)` so the effect
   only runs when the form value changes. Unbound siblings then share cleanly.
   This is a source change with its own blast radius; it needs a separate
   approval and is **not** part of this SPEC.

This SPEC implements test coverage for option 1 and records option 2 as an open
question. It does not silently pick one.

## 5. Type contract

- `mode` input becomes `input<RiviniaSelectMode>('single')`, imported from
  `@rivinia/select` (already imported by the file for other types).
- Same union, same runtime value, no exported type added or removed.
- The `mode` doc comment states the precedence of §3.4.

## 6. Exact change list

| # | File | Change |
|---|---|---|
| 1 | `projects/select/README.md` | Fix the §"The controller in the injector" snippet to bind `[select]="controller"`; add a short "Ownership rules" block (component-owned, external wins the mode, provider is per-injector and must be bound, sharing requires one value); state the provider is the headless/custom-UI path |
| 2 | `projects/select/ui/src/lib/components/select/select-panel.ts` | `mode` typed `RiviniaSelectMode`; doc comment states §3.4 |
| 3 | `projects/select/tests/select-di.spec.ts` *(new)* | 4 tests |
| 4 | `projects/select/tests/select-ownership.spec.ts` *(new)* | 5 tests |
| 5 | `projects/select/tests/rivinia-select.spec.ts` | +3 tests for `setValue` / `setValues` |
| 6 | `CHANGELOG.md` | Unreleased entry: docs + tests + type alias, "no behaviour change" |

No change to `select-di.ts`, `rivinia-select.ts`, `select-types.ts`, the public
exports, or the component's injection surface.

## 7. Test matrix (12 new tests)

### `select-di.spec.ts`
1. `provideRiviniaSelect('multi')` yields a controller whose `mode` is `multi`.
2. Injecting twice in one injector returns the same instance.
3. Two component-level injectors get independent instances (a selection in one
   is invisible in the other).
4. `injectRiviniaSelect()` throws the documented message when nothing is
   provided.

### `select-ownership.spec.ts`
5. External single controller + `mode="multi"`: one pick, panel closes — the
   controller wins.
6. Two selects with their own controllers do not leak selection into each other.
7. Two selects bound to one controller **and one `[(value)]` model** observe the
   same selection (§4.1, option 1). No assertion is made for unbound siblings.
8. Sharing the controller does not share the panel: one panel element, one
   `aria-expanded="true"`.
9. After replacing the bound controller at runtime, a pick lands in the new
   controller (old one untouched) and the trigger renders its label.

### `rivinia-select.spec.ts`
10. `setValue('x')` before the option exists keeps the id and renders the raw id;
    registering the option replaces it with the label.
11. `setValue` on a disabled option keeps it (`select` would refuse).
12. `setValues([...])` stores ids in the given order and drops none.

Deliberately not duplicated: dropped-selection on `unregisterOption` /
`syncOptions`, option-mirror convergence, external `[select]` in both modes,
`clear()` announcement, single-mode `toggle()` refusal.

## 8. Non-goals

- Any new export, factory, registry, constructor signature, Symbol scope, or
  state map (§1).
- A dev-mode warning for a twice-bound controller. It needs bookkeeping outside
  the controller; the written contract covers the case instead.
- Changing the `mode`/`options` inputs or the event surface.
- Asserting that components sharing a controller keep separate option
  registries — they do not, by design.
- Making the form→controller effect one-way (§4.1, option 2). Separate decision.

## 9. Verification

```
pnpm exec ng test select      # 11 existing spec files + 2 new; report pass/fail count
pnpm build:select             # ng-packagr production build
pnpm check:docs               # docs link/format check
```

`npm pack` (gate 3), the consumer fixture (gate 4) and publishing (gate 7) belong
to the 0.6.2 release, not to this change.

## 10. Contradictions found

1. **README vs implementation.** The DI snippet binds nothing, so the provided
   controller is a live instance no `rv-select` uses (F1, F7). Fixed in the
   document; the component stays as it is.
2. **"A root singleton would be wrong" vs the unwired provider.** Sound
   reasoning, missing link: per-injector is not per-component. Hence §3.3.
3. **`mode` input vs controller mode.** Two sources, one silently wins today.
   §3.4 states it; test 5 pins it.
4. **Sharing claimed vs sharing measured.** §4 promises shared state; §4.1 shows
   the unbound form clears it. The test matrix only covers the configuration
   that holds. Resolving the rest is an open question, not a quiet edit.
5. **`setValue` documented vs untested.** Tests 10–12 pin the restore half, so it
   cannot drift against the pruning half of `syncOptions`.

## 11. Open questions for the owner

1. §4.1 — **resolved: option 1.** The one-value precondition is documented in
   the README and covered by test 7. The one-way effect fix stays a separate
   proposal for a later change.
2. Record the contract in `docs/DECISIONS.md` as **D76** (D74 is the i18n 0.7.1
   release entry; D75 is the select panel-metrics entry), or keep it
   README-only? **Resolved: README-only** — nothing here changes a foundational
   rule.
