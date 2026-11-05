## 2026-10-12 — D01: Angular baseline 22.2.2

- Context: need a production baseline, not RC/nightly.
- Decision: Angular `^22.0.0`, verified stable `22.2.2` (npm `latest`, released 2026-10-08).
- Sources: `npm view @angular/core`, https://angular.dev/reference/releases (checked 2026-10-12).
- Impact: all packages peer-depend on `@angular/core ^22.0.0`; `@angular/*` kept on same major/minor.
