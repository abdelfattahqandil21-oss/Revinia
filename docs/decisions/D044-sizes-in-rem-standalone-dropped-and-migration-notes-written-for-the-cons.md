## 2026-10-19 — D44: sizes in rem, `standalone` dropped, and migration notes written for the consumer

- Context: three sharp corrections from a consumer reading the packages as a
  user, not as an author of them.
- **Sizes are now `rem`, not `px`.** Every type and spacing token moved:
  `13px → 0.8125rem`, `14px → 0.875rem`, `8px 12px → 0.5rem 0.75rem`,
  `40px → 2.5rem`, and so on. Measured in the consumer app: at a 17px root
  the trigger is 14.875px with `8.5px 12.75px` padding; at a 24px root it is
  21px with `12px 18px` padding. In `px` nothing would have moved. This is
  what makes the components follow the browser's text-size preference, a
  user-set accessibility default, and the app's own `html { font-size }` —
  the levers that matter on the 2026 device range, where the root font size
  varies far more than the viewport width does.
  - What deliberately stayed in `px`: hairline borders (`1px`), focus-ring
    widths (`2px`), SVG icon boxes (`16px`, which carry a `viewBox`), and
    shadow offsets/blur. None of them is type or spacing, and a hairline must
    stay a hairline.
- **`standalone: true` removed** from every component, directive and spec in
  the workspace, and from every README example. Verified in the installed
  Angular: `standalone: metadata.standalone === undefined ? true : …` — it is
  the default since Angular 19, so writing it says nothing, and the README
  was teaching consumers to write it.
- **Migration notes rewritten for the reader, not the author.** The previous
  notes explained how the bugs were fixed — cascade leaks, CSS specificity,
  over-constrained boxes. That is a `DECISIONS.md` entry, not a migration
  note; a consumer needs to know what to change, if anything.
  - `@rivinia/menu` 0.3.4 → 0.3.5 is now: **"Nothing to do."** No API
    changed, no token was renamed, no class was renamed; the panel just stays
    attached to its trigger in RTL now. The selectors a consumer might have
    targeted are listed, unchanged, so they can confirm.
  - `@rivinia/select` 0.4.x → 0.5.1 is now two mechanical steps: the
    markup rename table (only if you targeted the markup) and `[menuLabel]`
    → `[popupLabel]` (only if you bound it), plus a line saying everything
    else is additive.
- **The "Package layout" section was removed** from the select README and
  from its migration notes. The internal file tree is an implementation
  detail; a consumer needs the public entry points, and the public exports
  did not change — so there was no migration to document.
- Verified: all five packages build; 59/59 select, 32/32 menu, 51/51 modal,
  33/33 toast; and the rem scaling measured in the consumer app.
  NOT published.
