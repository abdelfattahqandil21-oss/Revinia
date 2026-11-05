## 2026-10-12 — D20: zero declared dependencies vs ng-packagr tslib injection

- Verified: no Rivinia FESM imports `tslib` (ES2022 output needs no helpers).
  Source `package.json` files declare zero `dependencies` (tslib entry removed).
- ng-packagr 22 unconditionally injects `dependencies.tslib` into dist
  (`write-package.transform.js:178` — unless already peer/dependency).
  Fighting the packager (post-strip) is fragile; every ng-packagr library ships
  it and Angular always provides it. Accepted as standard, not a defect.
- Gate (added to AGENTS.md): before every pack, grep dist FESM — any `tslib`
  (or other undeclared runtime) import fails the release. Published http 0.2.0
  needs no change (identical effective metadata).
