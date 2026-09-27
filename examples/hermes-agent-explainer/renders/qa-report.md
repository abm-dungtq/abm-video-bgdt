# QA report — hermes-agent-explainer

## Phase 5 gates (2026-09-25)
- lint: 0 errors (warnings: composition_file_too_large on index.html; zero-length overlapping tween notices)
- check (--timeout 60000 --samples 12): runtime 0 errors; layout reported content_overlap in frames 7, 19, 32, 33, 37, 48, 53, 57.
  Visual inspection at the flagged times (tools/wave-check.mjs 7@9.00 19@6.19 32@7.82 33@7.28 37@5.75 48@2.83 53@1.88 57@3.51)
  showed no visible overlap: the findings come from opacity-0 / clipped / flip-card elements. Treated as false positives.
- overlay trail container_overflow warnings: intentional (the S-curve starts off-canvas inside an SVG).
- transitions verify: 62 transitions ok.

## Phase 6 draft (2026-09-25)
- Draft: renders/draft.mp4 — 1920×1080, 611.96 s, video+audio, 25 fps draft, rendered in 10m58s (screenshot capture mode: CSS 3D in some frames)
- Sync (tools/sync-report.mjs, audio cross-correlation at 3 points per chapter, 24 points): max |offset| 0.022 s (constant ~21 ms AAC priming), all scores ≥ 0.86 → PASS (gate 0.15 s)

## User review
- APPROVED draft on 2026-09-25 ("Duyệt, render bản cuối"); no change requests. Ch6 rail left as is.
- Draft render took 10m58s (< 90 min) → final at 30 fps, quality high.

## Final delivery (2026-09-25)
- Master: renders/master-raw.mp4 — 1920×1080, 30 fps, quality high, 611.97 s; rendered in 16m38s
- Delivered: renders/hermes-agent-explainer.mp4 — 1920×1080, 612.0 s, video+audio, 166.6 MB
- Loudness: measured −17.0 LUFS → integrated −16.0 LUFS (two-pass loudnorm, TP −1.5, video stream copied)
- Chapters: renders/chapters.txt (8 lines, first 00:00)
- Script approval: 2026-09-25 (script.json meta.approved); 8 sentences cut later with user consent to fit 10 min
- Variety: tools/variety-lint.mjs → frames=63 shots=131 ok
- Sync: max |offset| 0.022 s over 24 points (draft; the final uses the same timeline)
- Pipeline re-run: pwsh tools/run-pipeline.ps1 -From <stage> -To <stage> (TTS stage runs via the vieneu-tts MCP)
- Sync re-measured on the FINAL mp4 (renders/sync-final.json): max |offset| 0.022 s over 24 points
