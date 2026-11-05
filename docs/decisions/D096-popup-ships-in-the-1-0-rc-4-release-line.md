## 2026-11-05 — D96: Popup ships in the 1.0 release line at rc.4

- Context: D95 approved preparing the shared Popup package only after the 1.0 final. Before 1.0.0 final has shipped, the owner chose to include Popup in the existing `rivinia-1.0` synchronized release line at `1.0.0-rc.4`.
- Decision: supersede D95 only on timing: Popup ships in this 1.0 release candidate. The package remains in the existing synchronized group; Popup, Theme, Select, Menu and i18n align at `1.0.0-rc.4`. Select and Menu declare `@rivinia/popup` as a regular dependency with range `^1.0.0-rc.4`.
- Preserve D95's behavior contract: the characterization tests and host-specific Select/Menu policies remain intact; this timing decision does not unify behavior.
- The current owner instruction says this RC stays on `latest`, consistent with D93 and the live registry read (rc.3 is on both `latest` and `next`). Thus publish rc.4 with `--tag latest`; `next` remains rc.3 unless the owner separately aligns it. D94 conflicts on sequencing: it says new RCs publish to `next` first, then `latest` moves for the whole set. Record that discrepancy for the owner; the current instruction governs rc.4.
- No publish, tag, push or registry mutation is authorized by this decision.
