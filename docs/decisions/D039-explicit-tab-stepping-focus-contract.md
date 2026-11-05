## 2026-10-17 — D39: explicit Tab stepping (focus contract)

- Context: release gate. Adding a Shift+Tab regression test exposed that focus
  ended up on `<body>`: the panel is still mounted when the keydown is handled,
  so the browser's own tab step re-entered the panel, and focus was dropped
  when Angular unmounted it.
- Decision: on Tab/Shift+Tab, prevent default, close, and step focus
  explicitly to the tab stop before/after the trigger (skipping rows inside any
  panel). Deterministic in both directions and on both engines, and it matches
  where the user would have landed anyway. End-of-document behaviour stays
  whatever the browser does — documented, not second-guessed.
- Also corrected two of my own weak assertions while adding coverage: the
  theming spec accepted either the override or the default value (now asserts
  the exact tokens), and a "repeated Tab" test asserted an end-of-document
  behaviour that Firefox legitimately does not implement.
- Verified: 32 unit, 98/98 Playwright (Chromium + Firefox), packed 0.3.0
  rebuilt and installed into a clean consumer build. WebKit cannot launch here
  (missing libWPEWebKit-2.0, libbacktrace, libjxl.so.0.8, libavif.so.16) and
  is NOT claimed. NOT published.
