## 2026-10-12 — D25: ng-add asks for a language LIST, validates strictly (live bug)

- Live failure: user typed `'ar' , 'en' , 'fr'` at a "default language" prompt;
  the schematic interpolated it raw → `defaultLanguage: ''ar' , 'en' , 'fr''`
  (invalid TS, broken app.config). Two faults: wrong question + zero validation.
- Fix: schematic asks ONE list question (comma-separated, first = default),
  parses defensively (strip quotes/whitespace/case, dedupe, BCP-47 validation,
  known RTL map + native names), and THROWS a clear error on invalid ids instead
  of emitting code. Proven with the exact messy input (valid config + build).
  Demo app config repaired by hand to the same shape.
