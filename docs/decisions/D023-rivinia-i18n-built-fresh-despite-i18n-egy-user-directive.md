## 2026-10-12 — D23: @rivinia/i18n built fresh despite i18n-egy (user directive)

- Override of D03's no-duplicate rule, documented reason: unified `@rivinia`
  scope/ownership, branded `provide/injectRivinia*` API consistency across the
  ecosystem, single release process, and native improvements i18n-egy lacks
  (ICU plural subset with Arabic six forms, browser detection, Intl formatting,
  `rTranslate` collision-safe pipe name). i18n-egy stays untouched and live;
  no fork, no re-export wrapper, no shared code — independent implementation
  that learned its proven patterns (descriptor code-splitting, request token,
  SSR guards, peer discipline).
