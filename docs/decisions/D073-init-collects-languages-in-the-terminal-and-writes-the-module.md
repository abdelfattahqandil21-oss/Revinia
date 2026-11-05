## 2026-10-29 — D73: `init` collects languages in the terminal and writes the module

- **The gap.** `provideRiviniaI18n` needs `id`, `nativeName` and `dir` per language, so
  every app re-types the same object list. The owner asked for the terminal to collect it
  and for the files to be generated: "نشيل من عليه التعريفات الكتابية الكتيرة".
- **Prompts live in the CLI, not in `ng add`.** A schematic's `x-prompt` entries are a
  fixed list evaluated once by the CLI's prompt provider
  (`@angular/cli/.../json-schema.js`), so a variable number of per-language questions is
  not expressible without depending on CLI internals. `rivinia-i18n-keys init` already
  ships as the package's own binary and can loop, validate and re-ask with
  `node:readline` — no new dependency, no internals.
- **One writer, no drift.** The generator lives in the binary. The schematic is not
  taught to generate the same module from a second copy of the rules; the module is
  emitted once, by `init`, and `app.config.ts` only imports it.
- **Generated shape.** `languages.ts` holds `defineRiviniaI18n` with the list and the
  default, plus `export const injectI18n = i18n.inject`. `defaultLanguage` is written
  explicitly rather than left to the first-entry default: the file is generated, and
  reordering the list must not silently change the starting language. The `injectI18n`
  alias is what components import — `i18n.inject()` keeps working and is the primitive
  (`inject()` cannot infer `L` at the call site, see D70); the alias is just a name users
  are used to (`injectRouter()`), not a second DI mechanism.
- **`dir` is asked, not derived.** The prompt offers the known direction for the id as
  the default, but the value is written literally, so an Urdu/Hebrew/… dictionary cannot
  end up left-to-right by guess.
- **Nothing is half-written.** Ids (shape, duplicates), the direction and the default id
  are validated before the first `writeFileSync`. An existing dictionary is kept, a
  `languages.ts` without the generated banner is only replaced with `--force`, and
  `--dry-run` prints the plan.
- **Pipes are a second adapter.** A TTY answers through `readline.question`; a pipe
  cannot, because all lines arrive before the next question is asked — those answers are
  queued from the `line` event instead. Non-interactive runs and the tests use
  `--languages <list>`; an empty stdin exits 1 with a message naming the flag instead of
  looping on EOF.
- **No `lang.json` source of truth.** A JSON language list read at runtime would type `L`
  as `string`, losing the compile-time checks (D72) and letting `dir` go unverified;
  dictionaries stay JSON, the language list stays TypeScript.
- **Versioning.** 0.7.1 — additive command; `--source`/`--out`/`--check`/`--parity` are
  unchanged.
