## 2026-10-29 — D71: language ids are asserted once and must be unique

- **The gap.** The only checks were "at least one language" and "`defaultLanguage` is one
  of the ids". `languages: [AR, EN, AR]` passed validation, and every consumer of the list
  then resolves the duplicate to the **first** entry — `currentLanguageObject()`,
  `getLanguage()`, dictionary lookup by id — while `next()`/`previous()`/`toggle()` walk
  three entries and land on the same language twice. The `/ui` toggle counted three
  languages as "many" although there were two. Nothing said a word.
- **Unique, non-empty, every entry.** The same construction-time pass validates each entry
  (`language[i] needs a non-empty \`id\``) and rejects a repeated id
  (`Duplicate language id "ar" in the languages array.`). It runs for every config — not
  only when `defaultLanguage` is derived — because a duplicate breaks switching regardless
  of which language starts.
- **Throws in production too.** Like the other config checks, this is a programming error,
  not a load failure: it fails at bootstrap with a named message instead of degrading at
  runtime.
- **Not covered here.** Ids are compared exactly, so `ar` and `ar ` remain two ids; id
  shape (BCP-47), `dir` presence, and unknown keys in `translations` are separate
  questions.
- **Versioning.** 0.7.1 — a config that was already valid is untouched.
