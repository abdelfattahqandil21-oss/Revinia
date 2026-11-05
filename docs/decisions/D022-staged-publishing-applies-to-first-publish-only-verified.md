## 2026-10-12 — D22: staged publishing applies to first publish only (verified)

- User-verified registry behavior: a package name's FIRST publish goes through
  staged review (placeholder + manual 2FA approval, minutes of propagation).
  Later versions on the same name publish instantly (`http@0.2.0`,
  `toast@0.2.0` went live without staging). Budget staging only for new names.
