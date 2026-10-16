# Rivinia

Production-ready ecosystem of reusable Angular libraries (Angular 22+).
Headless-first like TanStack Table: packages sell complex logic, never pixels —
every Core is fully usable without any UI, and Core releases never wait for UI.
Each package is independently versioned, built with `ng-packagr` (APF),
ships an `ng-add` schematic, and is validated by tarball install into a clean
consumer before any publish.

## Packages

| Package           | Version                                                | `ng add` | Description                                                                                     |
| ----------------- | ------------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------- |
| `@rivinia/http`   | [0.5.0](https://www.npmjs.com/package/@rivinia/http)   | ✅       | Headless typed HTTP client: envelope unwrapping, Observables + `httpResource` (`projects/http`) |
| `@rivinia/toast`  | [0.4.0](https://www.npmjs.com/package/@rivinia/toast)  | ✅       | Headless toast queue: signals, timers, actions, dedupe (`projects/toast`)                       |
| `@rivinia/modal`  | [0.5.0](https://www.npmjs.com/package/@rivinia/modal)  | ✅       | Headless modal manager: stack/queue, typed results, guards (`projects/modal`)                   |
| `@rivinia/i18n`   | [0.3.0](https://www.npmjs.com/package/@rivinia/i18n)   | ✅       | Headless language manager: signals, RTL, ICU plurals, detection (`projects/i18n`)               |
| `@rivinia/env`    | [0.2.0](https://www.npmjs.com/package/@rivinia/env)    | ✅       | Typed app environments dev/staging/prod + setup schematic (`projects/env`)                      |
| `@rivinia/menu`   | [0.1.0](https://www.npmjs.com/package/@rivinia/menu)   | 🆕       | Headless menu behavior + ready-made dropdown UI (`projects/menu`)                               |
| `@rivinia/select` | [0.1.0](https://www.npmjs.com/package/@rivinia/select) | 🆕       | Headless select (search + single/multi) + ready-made UI on rv-menu (`projects/select`)          |

```bash
npm install @rivinia/http @rivinia/toast @rivinia/modal @rivinia/i18n @rivinia/env
ng add @rivinia/http   # wires provideHttpClient() + provideRiviniaHttp()
ng add @rivinia/toast  # wires provideRiviniaToast()
ng add @rivinia/modal  # optional: --strategy queue
ng add @rivinia/i18n   # prompts: default language + browser detection
```

Proof-of-architecture packages (not for publish, no schematics):
`@rivinia/proof-core`, `@rivinia/proof-second` (`projects/proof-*`).

## Workspace commands (pnpm)

- `pnpm build:http` — compile schematics, then `ng build http`
- `ng test http` — library unit tests (vitest)
- `pnpm test:schematics` — `ng-add` schematic tests (virtual FS)
- `npm pack ./dist/http` — tarball for clean-consumer validation

## Rules

`AGENTS.md` (build/test/publish gates) and `docs/DECISIONS.md` (append-only
decision log) are normative. No public publish without explicit confirmation
of name, version, access, and inspected tarball contents.
