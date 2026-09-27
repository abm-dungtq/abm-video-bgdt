# QA report — claude-intro-explainer

## Task 7.1: static and runtime check (2026-09-25)

### How the check was run
- `pwsh tools/run-pipeline.ps1 -From check -To check` (lint, then `check --timeout 60000`) reported:
  - lint: 0 errors, 2 benign warnings (the duplicate image in frame 24, which is deliberate, and the size of `index.html`);
  - runtime: `check_runtime_failure: Navigation timeout of 60000 ms exceeded`.
- A control run on the Hermes project also timed out at 60 s, although it had passed earlier. The timeout comes from the environment, not from this composition.
- `npx hyperframes@0.7.99 check --timeout 240000` completed in 246 s. It reported 22 errors (21 `content_overlap` and 1 `text_not_painted`) and 52 info-level `content_overlap` items.
- Layout: no frame places fixed content in the karaoke band (a grep for `top ≥ 920px` in `compositions/frames` found nothing).

### Verdicts, each checked with a `wave-check N@t` snapshot

| Finding | Time (s) | Verdict | Evidence |
|---|---|---|---|
| f02 "Đồng"/"nghiệp" and card labels inside `#f02-claude-text` | 5.84–7.3, 10.22–11.69 | False positive | `#f02-claude-text` is hidden until its reveal. The snapshot at 2@1.9 shows clean text. |
| Chapter cards: "CHƯƠNG" kicker inside the big digit box (f05, f12, f22, f33, f55, f74) and f43 kicker digit/dot | chapter starts | False positive | The box of the large numeral and its stroke overlaps the kicker line, but the glyphs don't touch. Snapshots at 12@2.4 and 43@2.5 are clean. |
| f57 rolling-digit strip spans inside caption words and pills | 607–611 | False positive | The strip's off-screen digits are clipped by `overflow:hidden`, so only the current digit shows. The snapshot at 57@2.7 is clean and nothing shows in the band. |
| f60 `#f60-label` inside the overlay chapter label | 645.66 | False positive | During the shot-2 zoom the label is pushed outside the clipped `#f60-view`, and it is not visible. The snapshot at 60@5.3 shows the top-left clear. |
| f72 `#f72-num` inside `#f72-numlabel` | 785.9 | False positive | "10" sits above "tính năng mới" with a clear gap. Snapshot at 72@1.7. |
| f59 `text_not_painted` `#f59-ghost` "5.5" | 631.95 | By design | An outlined numeral (transparent fill, visible stroke) used as a background accent. The outline is visible in the snapshot at 59@3.7. |
| Info: rail pills of frame N inside frame N+1 (57/58, 60/61, 63/64, 65/66, 51/52) | crossfades | Expected | The two frames draw the identical rail in the same place during the 0.5 s crossfade. |
| Info: f02, f23, f27, f37, f52, f58 single-sample overlaps | – | False positive | These are elements at opacity 0 or mid-transition at the sampled instant. The per-frame worker snapshots were clean. |

### Result
Lint shows 0 errors. Every remaining check finding is a false positive or by design, and none needs a code change.

### Fixes made during phase 6 QA
- **Frame 3:** it rendered blank because a late `fromTo` applied its from-state immediately. Fixed with `immediateRender: false`.
- **Frame 77:** a reused GSAP vars object blanked a shot. Fixed.
- **Frame 59:** the stat now reads "khoảng −40%" to match the voiceover. An id collision with the ≈ SVG was fixed along the way.
- **Frame 31:** the ghost button is shown on the home screenshot at the top right, as the narration says.

## Tasks 7.2 and 7.3: draft render, sync and still sweep (2026-09-25)

- Draft render: `renders/draft.mp4` rendered with exit 0 in 19 min 49 s. It is 1920×1080 with an audio stream and runs 875.04 s, inside the 810–880 s budget.
- Sync: `sync-report` sampled 24 points with offsets of about 0.018–0.020 s. The `--max` offset is 0.022 s, well under the 0.15 s limit. Spot clips are in `renders/spot/`.
- Still sweep: 237 stills were taken at 25, 50 and 75 % of each of the 79 frames. No frame is blank.
  - A handful of stills look sparse: 04@75, 27@75, 29@75, 60@50, 67@75 and 71@75. Each one catches a build-up beat, where content appears as it is spoken.
  - A 2 fps strip of frame 04 confirms this: the "Cơ bản → Chuyên sâu" line builds in on cue.
- Preview: `renders/draft-720p-preview.mp4` (28 MB).

privacy: clean. All 9 screenshots the frames reference in `assets/screens/` are byte-identical to the Gate 2b approved files in `capture/screens/redacted/`. No raw capture is referenced, and the F-76 panel is a labeled "Minh họa" mockup.

## Task 7.5: final render and post-processing (2026-09-25)
- Final render: `renders/claude-intro-explainer.mp4` (high quality, 30 fps, 24 min 18 s to render). It is 1920×1080 with an audio stream and runs 875.10 s.
- Loudness: measured at −16.99 LUFS and normalised to −16.0 LUFS integrated (ebur128).
- Sync: `sync-report` exited 0, with a max offset of 0.022 s.
- Chapters: 8 chapters are listed in `renders/chapters.txt`.
- 720p copy: `renders/claude-intro-explainer-720p.mp4`.

## Re-post with skill 0.3.0 (2026-09-26)
- Only the audio of `renders/claude-intro-explainer.mp4` changed. It is now `audio/voice-concat.wav`, upmixed to dual mono, loudnormed and AAC-encoded once; the picture is stream-copied from `master-raw.mp4`.
- Measured:
  - stereo, I −16.0 LUFS, true peak −2.2 dBFS (the previous file measured −1.5);
  - audio and video both 875.033 s (the previous audio ran 67 ms past the picture).
- Sync:
  - renderer audio vs voice master: max 0.022 s;
  - final audio vs renderer audio: constant −0.020 s (24/24 points), which matches the AAC priming lag in the renderer's audio.
- `blank-check ok`: no empty stage ≥ 2 s.
- The 720p copy was re-encoded from the new file.
