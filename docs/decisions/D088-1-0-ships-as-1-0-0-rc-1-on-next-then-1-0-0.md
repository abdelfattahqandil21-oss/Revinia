## 2026-10-31 — D88: 1.0 ships as `1.0.0-rc.1` on `next`, then `1.0.0`

- Context: pre-1.0 caret peers make release order load-bearing. i18n has an
  optional peer on select (`^0.7.0`), so select must reach 1.0 before i18n can
  peer on `^1.0.0`. The registry state on 2026-10-31 is i18n 0.8.0,
  select 0.7.1, menu 0.5.0, theme 0.1.0.
- Decision: publish `1.0.0-rc.1` on dist-tag `next` in the order theme →
  select → menu → i18n; keep it there through a soak period; then promote to
  `latest` as `1.0.0`. i18n's peer becomes `@rivinia/select: ^1.0.0`, still
  optional via `peerDependenciesMeta`. Every publish stays a human gate with
  explicit confirmation of name, version, access and tarball contents.
- Also: document the i18n × select compatibility table, and the `@angular/*`
  peer policy, in the i18n README.
- Rejected: straight to `1.0.0` with no soak; staying on 0.x (the peer-range
  trap only gets worse with the next select minor).
- Impact: `rc` and `1.0.0` share the same public contract (exported TS API,
  `--rv-*` names, documented ARIA roles). Theme's unreleased SPEC-0.1.1 work
  must be versioned before the order starts.
