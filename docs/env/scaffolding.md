# Scaffold environments

Generate typed environment files and build configurations.

[Back to @rivinia/env README](https://github.com/abdelfattahqandil21-oss/Rivinia/blob/env/v1.0.1/projects/env/README.md)

## Install and scaffold

From an Angular CLI workspace:

```bash
npm install @rivinia/env
ng add @rivinia/env
```

The schematic prompts for environments when interactive; the default and
non-interactive selection is all three (`dev`, `stage`, `prod`). Select only
what you need with a comma-separated option:

```bash
ng add @rivinia/env --environments stage,prod
```

Accepted names are `dev`, `stage` (or `stag`), and `prod`. `--project <name>`
selects a project in a multi-project workspace; otherwise it uses
`defaultProject` from `angular.json`, falling back to the first project.
The schematic uses that project's `sourceRoot` (or `<root>/src`, then `src`).

The model and development base file are always scaffolded. The selected
environment files are created only if they do not already exist:

```text
src/environments/
  environment.model.ts   # AppEnvironment extends BaseEnvironment
  environment.ts         # development defaults; not replaced by the CLI
  environment.staging.ts # only when stage is selected
  environment.prod.ts    # only when prod is selected
```

The generated contract and values have this shape:

```ts
// environment.model.ts
import type { BaseEnvironment } from '@rivinia/env';

export interface AppEnvironment extends BaseEnvironment {
  readonly apiUrl: string;
}
```

```ts
// environment.ts (generated development defaults)
import type { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: false,
  version: '1.2.3',
  apiUrl: 'http://localhost:3000/api',
};
```

Staging and production files have the same fields, with `production: true`;
their generated API URLs are `https://staging.example.com/api` and
`https://api.example.com/api`. Replace these example URLs and any other
generated values with the app's real configuration.

The schematic creates the short `dev`, `stag`, and `prod` build configurations
for the selected environments, copying settings from the corresponding
`development`, `staging`, or `production` configuration when one exists.
Otherwise, it creates the short configuration with the required environment
replacement when needed (`dev` uses the base file directly). It also wires
existing legacy keys when present: `development`
uses `environment.ts`, `staging` replaces it with
`environment.staging.ts`, and `production` replaces it with
`environment.prod.ts`. The short names are the recommended CLI commands; the
legacy names remain available for existing scripts.

For selected configurations that exist, it sets `outputPath` to
`builds/dev`, `builds/stag`, or `builds/prod` only if no output path is
already configured. If that adds an output path and a root `.gitignore`
exists, `/builds` is appended once. Existing output paths and files are never
overwritten; repeated runs do not duplicate replacements.

The version in generated files is copied from the workspace-root
`package.json` when each file is first created (`0.0.0` if unavailable).
Since the schematic never overwrites existing files, update `version` in
those environment files manually when releasing a new app version; rerunning
`ng add` will not refresh it.
