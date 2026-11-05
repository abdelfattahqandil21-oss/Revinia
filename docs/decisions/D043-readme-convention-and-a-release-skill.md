## 2026-10-19 — D43: README convention, and a release skill

- Context: the user pointed at `@tanstack/angular-virtual`'s README as the
  model and asked for the Rivinia READMEs to follow that order, and for
  reliable "skills".
- **README convention** (adopted from the TanStack shape, which is a good
  model for an npm library page):
  1. title, badges, one-paragraph description, then the facts (version,
     Angular requirement, entry points, side effects);
  2. **Quick features** — a bulleted list of what the package does;
  3. **Install** — the command for EVERY package manager (npm / pnpm / yarn /
     bun), not just npm;
  4. the rest of the documentation, in the order a reader needs it:
     imports → package layout → quick start → API → forms → headless usage →
     custom UI → override surface → theming → keyboard → accessibility →
     migration notes.
  - The ordering rule that mattered: **API before the deep dives.** A reader
    who wants the input names should not have to scroll past the headless
    chapter to find them.
- **`@rivinia/theme` README** — written from scratch in the same shape; it is
  also shipped in the tarball (an `assets` entry), because the npm page IS
  the README.
- **A release skill** at `.opencode/skills/rivinia-release/SKILL.md`:
  - The gates in `AGENTS.md` were already written, but they were prose an
    agent had to re-interpret on every release. The skill turns them into a
    runnable sequence — build → test → **inspect the tarball** (exports,
    types, peers, sideEffects, file list, and a grep of the dist FESM for
    runtime imports beyond the declared peers) → prove it in a CLEAN consumer
    (a `file:` link proves nothing about what npm will serve) → test the
    public imports as a consumer uses them → record bundle sizes → **get
    explicit user confirmation** (name, version, access, file list) → publish
    from a namespaced tag → verify the registry state.
  - It also encodes the two traps this repo has actually hit: a spec glob
    that silently excludes a suite (the `ui/src/**` gap that left the
    regression specs unrun), and a rename leaking into the bundle.
  - `opencode/autoinvoke: false` — a release must be asked for, never
    volunteered. The skill's ID is the path (`rivinia-release`), not the
    frontmatter `name`.
- Verified: 59/59 select, 32/32 menu, all three packages build, and
  `npm pack --dry-run` on the theme tarball shows 8 files / 4.5 kB with the
  README included.
  NOT published.
