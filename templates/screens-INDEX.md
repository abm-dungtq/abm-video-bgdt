# Screenshot index

- Capture: <tool, browser, theme, logical size>. Upscale to 1920×1080 after redaction.
- Redaction: solid boxes in the surface colour, never blur. Raw files stay in `raw/`, and no frame ever references them.
- Approval: the last column is set at gate 2b. `node tools/privacy-check.mjs` passes only when:
  - every file in `assets/screens/` has a row here marked `Y`;
  - each such file is byte-identical to its `redacted/` source.

| file | F-NN | feature | UI state | captured | redactions | approved |
|------|------|---------|----------|----------|------------|----------|
