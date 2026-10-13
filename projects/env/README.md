# @rivinia/env

[![npm version](https://img.shields.io/npm/v/@rivinia/env.svg)](https://www.npmjs.com/package/@rivinia/env)
[![license](https://img.shields.io/npm/l/@rivinia/env.svg)](https://www.npmjs.com/package/@rivinia/env)

Typed application environments for Angular: dev/staging/prod file layout, a
`BaseEnvironment` contract, and an `ng-add` schematic that scaffolds the
files and wires the build configurations. Zero runtime code — environments are
build-time constants; this package ships types plus setup tooling only.

- Version: **0.2.0**
- Requires: nothing at runtime (types only). Schematic runs under Angular CLI 22+.

## Install

```bash
npm install @rivinia/env
ng add @rivinia/env   # multi-select: development / staging / production
```

Interactive runs ask which environments to scaffold (checkbox, all checked by
default); non-interactive runs take all. From flags, comma-separate (short
aliases work: `dev`, `prod`, `stag`):

```bash
ng add @rivinia/env --environments staging,production
```

Only the selection is scaffolded and wired (model + base file always — the
base is the replacement source). Each wired configuration gets its output
directory (`builds/dev`, `builds/stag`, `builds/prod`) unless it already
defines one, and `/builds` is appended to `.gitignore` once. Re-runs never
overwrite files or duplicate configuration.

`ng add` creates (never overwrites) `src/environments/`:

```
environment.model.ts   # AppEnvironment extends BaseEnvironment — extend it
environment.ts         # development defaults (used as-is by `development`)
environment.staging.ts # staging values (production: true)
environment.prod.ts    # production values
```

and wires `angular.json`: `production` gains its replacement if missing, and a
`staging` configuration (copied from `production`) is created if absent.
`development` intentionally gets no replacement (CLI standard). The app version
is snapshotted from your `package.json` into each file (`0.0.0` fallback).

## Usage pattern (app-owned)

```ts
// environment.model.ts
import type { BaseEnvironment } from '@rivinia/env';

export interface AppEnvironment extends BaseEnvironment {
  readonly apiUrl: string;
}

// anywhere:
import { environment } from '../environments/environment';
fetch(`${environment.apiUrl}/trips`);
console.log(environment.version); // e.g. footer, about page, cache keys
```

Re-run the schematic (or edit by hand) when the app version changes.

## License

MIT.
