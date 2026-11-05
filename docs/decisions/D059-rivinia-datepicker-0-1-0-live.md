## 2026-10-26 — D59: @rivinia/datepicker@0.1.0 LIVE

- The user logged in on npmjs (`abdelfattahqandil21`; the old token problem from
  D14 was not present) and published the inspected tarball:
  `npm publish ./pack/rivinia-datepicker-0.1.0.tgz --access public --registry
  https://registry.npmjs.org/`.
- The publish went through **staged publishing** for the new name: the registry
  now carries `0.0.0-stage` **and** `0.1.0`, with `dist-tags.latest = 0.1.0`.
  The live `dist.shasum` is `c26a80285c71bb33c3a7e09d05848f12259e4dd4` — the
  exact tarball that was built, inspected and installed into the consumer
  (8 files, 126,524 bytes, readable README included).
- `npm view @rivinia/datepicker version --registry https://registry.npmjs.org/`
  returns `0.1.0`.
- Repository finalisation after the publish (the user published from
  `pkg-datepicker/specs-first`; the tag is added to the same tree): commit,
  `--no-ff` merge into `main`, tag `datepicker/v0.1.0`.
