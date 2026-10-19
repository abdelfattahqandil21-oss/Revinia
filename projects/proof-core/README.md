# `@rivinia/proof-core`

Internal architecture proof for a headless Angular store and an independent
optional UI entry point. This package is not a published consumer library;
use its examples to understand the workspace experiment, not as a release
support promise.

## Public API

The primary entry point exports:

- `ProofStore`: root-scoped signal store with `count()`, `increment(by?)`,
  `decrement(by?)`, and `reset()`.
- `provideProofCore(config?)`: optionally sets the initial count. The default
  is `0`.
- `injectProofStore()`: shorthand for `inject(ProofStore)`.
- `ProofConfig`: `{ initialCount?: number }`.

The secondary entry point `@rivinia/proof-core/ui` exports `ProofBadge`. It is
presentational and takes a required numeric `count` input; it does not inject
or import the store.

## Use the store in an Angular app

Register the optional initial value at bootstrap:

```ts
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideProofCore } from '@rivinia/proof-core';

export const appConfig: ApplicationConfig = {
  providers: [provideProofCore({ initialCount: 3 })],
};
```

Inject the store where it is needed. The public count signal is readonly;
change it through the store methods:

```ts
import { Component, inject } from '@angular/core';
import { ProofStore } from '@rivinia/proof-core';
import { ProofBadge } from '@rivinia/proof-core/ui';

@Component({
  imports: [ProofBadge],
  template: `
    <button type="button" (click)="store.increment()">Add one</button>
    <button type="button" (click)="store.reset()">Reset</button>
    <rv-proof-badge [count]="store.count()">Items</rv-proof-badge>
  `,
})
export class CounterComponent {
  readonly store = inject(ProofStore);
}
```

`ProofBadge` is optional: a consumer can display `store.count()` directly, or
provide any other numeric value to `[count]`.

## Develop in this workspace

From the repository root:

```bash
pnpm exec ng build proof-core
pnpm exec ng test proof-core --watch=false
```

`ng build proof-core` builds the primary and UI entry points. This is an
architecture experiment, not a publish or `npm publish` workflow.
