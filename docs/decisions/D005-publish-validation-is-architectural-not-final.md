## 2026-10-12 — D05: Publish validation is architectural, not final

- Decision: manual per-package flow first (`build → test → npm pack → inspect →
clean-consumer install → prod build → confirm name/access/version`), user confirms each
  public publish. Automation only after the manual flow is proven and recorded.
- Impact: blocks Phase 5 until Phase 3 experiment + Phase 4 first-package flow succeed.
