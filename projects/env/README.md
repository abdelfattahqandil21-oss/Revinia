# @rivinia/env

[![npm version](https://img.shields.io/npm/v/@rivinia/env.svg)](https://www.npmjs.com/package/@rivinia/env)
[![license](https://img.shields.io/npm/l/@rivinia/env.svg)](https://www.npmjs.com/package/@rivinia/env)

A typed application environment contract and Angular CLI schematic.

Package version: **1.0.1**

```ts
import type { BaseEnvironment } from '@rivinia/env';
export interface AppEnvironment extends BaseEnvironment {
  readonly apiUrl: string;
}
```

## Why @rivinia/env

- A reusable `BaseEnvironment` contract types application configuration.
- The CLI schematic scaffolds environment files and build replacements.
- Angular selects a statically imported file at build time; the package does not read values at runtime.

## Install

```bash
npm install @rivinia/env
ng add @rivinia/env
```

## Quick start

1. Install the package in an Angular CLI workspace.
2. Run `ng add @rivinia/env` and choose environments.
3. Import the generated environment and read its typed values.

## Use the selected environment

Always import the base path from the app, not a stage/prod-specific file:

```ts
// src/app/trip.service.ts
import { Service } from '@angular/core';
import { environment } from '../environments/environment';

@Service()
export class TripService {
  readonly apiUrl = environment.apiUrl;
}
```

After `ng add @rivinia/env`, build with the short configuration names:

```bash
ng build --configuration dev
ng build --configuration stag
ng build --configuration prod
```

These are actual keys in `angular.json`, not Angular CLI aliases. If you
maintain custom configurations, inspect the selected project's
`architect.build.configurations` and ensure each key has the intended
`fileReplacements`; `ng build --configuration` uses the key exactly as written.

The generated files are compile-time configuration, not secrets: values
included in a browser build are visible to its users. `BaseEnvironment`
requires only readonly `production: boolean` and `version: string`; extend
AppEnvironment with the fields your app needs.

## Public API

| Export            | Kind | Purpose                                                                |
| ----------------- | ---- | ---------------------------------------------------------------------- |
| `BaseEnvironment` | type | Required `production` and `version` fields for app environment models. |

## License

MIT.

## Compatibility

| Angular CLI | Node | Runtime behavior |
| --- | --- | --- |
| `^22.0.0` | `^22.22.3 or ^24.15.0 or >=26.0.0` | Type contract and build-time file replacement; no runtime service |

## Go further

| Topic | Read |
| --- | --- |
| Scaffold environments | [Scaffold environments](https://github.com/abdelfattahqandil21-oss/Revinia/blob/env/v1.0.1/docs/env/scaffolding.md) |
