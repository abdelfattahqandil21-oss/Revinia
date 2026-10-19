# `@rivinia/proof-second`

Internal architecture proof for an independent, headless Angular service. It
does not depend on `@rivinia/proof-core` and is not a published consumer
library.

## Public API

The primary entry point exports `SecondStore`, a root-scoped service with:

- `marks()`: readonly signal of recorded names, initially an empty array.
- `mark(name)`: appends a name.
- `clear()`: removes all names.

## Use in an Angular app

Inject the store into a standalone component. No configuration provider is
required:

```ts
import { Component, inject } from '@angular/core';
import { SecondStore } from '@rivinia/proof-second';

@Component({
  template: `
    <button type="button" (click)="store.mark('invoice-42')">Record invoice</button>
    <button type="button" (click)="store.clear()">Clear</button>

    <ul>
      @for (name of store.marks(); track $index) {
        <li>{{ name }}</li>
      }
    </ul>
  `,
})
export class InvoiceActivityComponent {
  readonly store = inject(SecondStore);
}
```

## Develop in this workspace

From the repository root:

```bash
pnpm exec ng build proof-second
```

No unit-test files are currently defined for this proof project, so
`ng test proof-second` has no tests to run. This package exists to verify
independent package boundaries; it is not a publish or `npm publish` workflow.
