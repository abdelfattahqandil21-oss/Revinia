## 2026-10-12 — D15: baseUrl removed from the provider (user directive)

- Rationale: Angular itself ships no baseUrl (verified: zero matches in
  `http.d.ts`, open issue angular#23139); but imposing ours in the provider was
  still the library dictating URL ownership. Decision: provider holds NO URL —
  `RiviniaHttp` passes endpoints through untouched; call sites compose via the
  still-exported `joinUrl(environment.apiUrl, path)` (BRT pattern, documented).
- Breaking vs 0.1.0 (unpublished→published 0.1.0 is live!): removal ships as
  **0.2.0**. ng-add drops to two questions (unwrap confirm + key); schema
  defaults removed so prompts always appear interactively (verified mechanism;
  `--defaults`/CI skip silently).
- Verified: lib 18/18, schematics 6/6, build+pack, consumer rebuild on 0.2.0
  tarball (245.22 kB), fresh pnpm `ng add --unwrap-key payload` wires
  `provideRiviniaHttp({ unwrapKey: 'payload' })` with no baseUrl trace.
- Pending: user publishes 0.2.0 from their terminal (same one-liner).
