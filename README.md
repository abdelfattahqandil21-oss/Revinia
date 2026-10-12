# Rivinia

Production-ready ecosystem of reusable Angular libraries (Angular 22+).
Each package is independently versioned, built with `ng-packagr` (APF),
and validated by tarball install into a clean consumer before any publish.

## Packages

| Package | Version | Description |
|---|---|---|
| `@rivinia/http` | 0.1.0 | Headless typed HTTP client: envelope unwrapping, Observables + `httpResource` (`projects/http`) |

Proof-of-architecture packages (not for publish): `@rivinia/proof-core`,
`@rivinia/proof-second` (`projects/proof-*`, consumer fixture in `/tmp`).

## Workspace commands (pnpm)

- `pnpm build:http` — compile schematics, then `ng build http`
- `ng test http` — library unit tests (vitest)
- `pnpm test:schematics` — `ng-add` schematic tests (virtual FS)
- `npm pack ./dist/http` — tarball for clean-consumer validation

## Rules

`AGENTS.md` (build/test/publish gates) and `docs/DECISIONS.md` (append-only
decision log) are normative. No public publish without explicit confirmation
of name, version, access, and inspected tarball contents.
