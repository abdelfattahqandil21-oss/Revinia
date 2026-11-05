## 2026-10-25 — D54: consumer playground, the RTL anchor defect it exposed, and Angular 22's `ngModel` validator gap

- Context: after D52 the package needed to be exercised the way a consumer uses
  it, not only by the unit suite. A playground was built in `tmp/consumer`
  (gitignored, outside the workspace, installed from the packed tarball, public
  entry points only): one shared value across **eight formats**
  (`short|medium|long|full`, `dd/MM/yyyy`, `yyyy-MM-dd`, `dd.MM.yy`,
  `EEEE, d MMMM yyyy`), a Reactive Forms card (`FormGroup`,
  `Validators.required`, submit/reset/disable), a Template-Driven card
  (`ngModel`, touched/dirty, reset), a Signal Forms card (`form()` +
  `[formField]`, `required()`), plus min/max bounds, a disabled picker, a
  pinned-dark picker, a default-vs-full-width pair, and a toolbar that switches
  **English/العربية** and **Light/Dark/Auto**.

- Verified in Chromium against the consumer's **production** build (`ng build`,
  292.82 kB raw / 76.36 kB transfer for the playground): en-GB renders
  `25/10/2026`, `25 Oct 2026`, `25 October 2026`, `Sunday, 25 October 2026`,
  `25/10/2026`, `2026-10-25`, `25.10.26`, `Sunday, 25 October 2026`; ar-EG
  renders `٢٥‏/١٠‏/٢٠٢٦`, `٢٥‏/١٠‏/٢٠٢٦`, `٢٥ أكتوبر ٢٠٢٦`,
  `الأحد، ٢٥ أكتوبر ٢٠٢٦`, `٢٥/١٠/٢٠٢٦`, `٢٠٢٦-١٠-٢٥`, `٢٥.١٠.٢٦`,
  `الأحد, ٢٥ أكتوبر ٢٠٢٦` (the ASCII comma in the last row is the pattern's
  literal, not Intl's). The Arabic panel weekdays are `س ح ن ث ر خ ج`
  (week starts Saturday), one panel is open at a time, Escape closes it, and
  clearing one picker clears all eight (shared `[(value)]`). Dark applies to
  field `rgb(24, 24, 27)`, text `rgb(244, 244, 245)`, panel and selected day
  `rgb(139, 139, 240)` while the page is light. Widths: default field 176px →
  panel 308px (the 19.25rem floor); a full-width field 367px → panel 367px.
  Reactive `required` keeps submit disabled until a pick, submit shows the
  submitted state, and `control.disable()` reaches the picker
  (`data-disabled="true"`); Signal Forms `required` reports `valid no` before
  and `valid yes` after; Template-Driven reset clears the control, the value
  and the submitted flag. Zero console errors.

- **A real defect the playground exposed (fixed before this entry):** in an
  RTL page the anchored panel grew toward the page's **inline-start** and sat
  over its own row's label. Measured: field `x=940…1179`, panel
  `x=940…1248` — the panel's **left** edge matched the field's left edge (its
  inline-end), while the LTR case put the panel's left edge at the field's
  left (inline-start). The cause is Chromium resolving
  `position-area: block-end span-inline-end` **physically**: the computed
  value is `span-end` in both directions, so the position area became
  `[anchor inline-end → containing block inline-start]`, an LTR-shaped area.
  The absolute fallback was already correct because
  `inset-inline-start: 0` is logical. Fix: one direction-scoped rule —
  `:host(:dir(rtl)) .rv-datepicker-panel { position-area: block-end
  span-inline-start; }` — which puts the panel's inline-start edge on the
  field's inline-start edge, extending toward the inline-end. Measured after:
  field `940…1179`, panel `871…1179`, gap **4px**, inside the viewport; LTR
  unchanged (`260…568`, gap 4). The 4px gap is a real margin once the entrance
  animation settles; measuring immediately after `waitForSelector` catches the
  animation mid-flight and reads ~0–1px.

- **Angular 22.2.2 finding, documented rather than worked around:**
  `NG_VALIDATORS` do not run for a value-model custom control bound with
  `[(ngModel)]`. In the installed `@angular/forms` FESM, `NgControl` sets
  `isCustomControlBased` and `_setupWithForm()` calls `setupCustomControl()`,
  which never calls `setUpValidators()`; only `setUpControlValueAccessor()`
  does. Measured in the playground: a plain `<input required>` in the same
  form reports `errors: { required: true }` while the picker's `NgModel`
  reports `errors: null` even though `_rawValidators` contains
  `_RequiredValidator`. Reactive Forms and Signal Forms validate normally.
  Decision: do not add a `ControlValueAccessor` (D51 removed one deliberately;
  it would break the value-model/Signal Forms path). The README's Forms
  section now states the limitation and the two supported options (validate in
  the submit handler, or use a reactive control carrying the validators); the
  playground's template card does exactly that.

- Version stays **0.1.0** (unpublished). After the CSS fix: `ng build
  datepicker`, 395/395 tests, tarball rebuilt and installed into the consumer;
  the README note required one more build + pack. Final tarball: 8 files,
  65.7 kB, npm shasum `d55769ff64726329601ad61718c337b7e8a65a18`, sha256
  `c7d3b35b04f51e4386ed9955fe31108a84d1075fab336e8d8eb6bf1a1ecf8462`.
  The consumer build and the browser run are the evidence for the RTL
  placement — jsdom has no layout, so it cannot be a unit test.
