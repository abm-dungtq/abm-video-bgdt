# Gotchas from the first two videos (Hermes Agent and Claude intro, 2026-09-25)

Each entry gives the symptom, then the cause and the fix. The scripts already contain every fix; this file is here
so a change to them does not bring an old failure back.

## Audio

- **The narration was cut mid-sentence.** An ffmpeg `silenceremove … stop_periods` trim stops at the first pause inside a sentence.
  Trim only leading silence, once forward and once on the reversed signal (`build-voice.py` `TRIM`).
- **The duration estimate came out about 25 s short** (2 × 0.08 s × 156 clips). The estimator had left out the 80 ms pad on both ends of every clip.
  The pads are now part of `script-to-md.mjs` `estimate()`, and both scripts read the same `timing` from the config.
- **The voice felt fast** at the default gap. A 0.5 s gap between sentences was right for Thanh Bình at temperature 0.55.
- **`uv add uroman` modified the upstream VieNeu-TTS project** (`pyproject.toml` and its lock file). Install extras into
  the venv with `uv pip install`, never `uv add`.
- **MMS_FA handled Vietnamese well**: 156 of 156 sentences aligned and the syllable fallback never ran. Keep the fallback
  anyway, because it protects against odd clips.
- **Alignment must run on the same trimmed files that were concatenated.** Otherwise the word times drift by the trim amount.

## HyperFrames 0.7.99 vs the 0.8.x skill docs

The worker delta template records every rule below; they are repeated here for the orchestrator.
- A frame must set `window.__timelines = window.__timelines || {}` before it registers its timeline.
- Element ids must not start with a digit (`#08-…`), so every id and class carries the `fNN-` prefix.
- Motion may use only transform and paint properties. Tweening `left`, `top`, `width` or `height` is a lint error
  (`gsap_non_transform_motion`).
- Set the initial hidden state with CSS or `gsap.set`, never with `tl.set(…, 0)` (`gsap_timeline_set_initial_hide`).
- Use `tl.set` for instant changes. Two tweens on the same property of the same element must not overlap.
- Never tween `.clip` elements themselves. Never combine a CSS `transform` with a GSAP tween on the same element.
- GSAP parses `textContent: "64.000"` as the number 64. Count integers only and put separators or suffixes in a static span.
- The catalog has no `--query` option. Dump it with `catalog --json` and search the file locally.
- The full-project `check` and `snapshot` need a long navigation timeout, because the default 10 s is too short for 60–80
  sub-compositions. 60 s was enough on the first video, but on the second it timed out on both projects (a loaded machine).
  The scripts now use `cli.checkTimeoutMs`, default 240000.
- The `/hyperframes` router and the init-generated `CLAUDE.md` tell agents to `upgrade` pinned projects. **Do not** do this here.

## Frames and workers

- **A worker guessed word times.** Workers must take keyword times from `- cues:` and every other word's time from
  `audio_meta.json`. The brief now says so.
- **A worker claimed that `onUpdate` callbacks do not fire when seeking.** A test render showed that they do. Even so, prefer
  pre-sampled keyframes over callbacks; the overlay's spark does this.
- **The 20-concurrent subagent cap.** Queue the remaining frames and do not retry blindly.
- **The layout `content_overlap` findings were false positives** (frames 7, 19, 32, 33, 37, 48, 53, 57). The flagged elements were
  at opacity 0, clipped, or on the hidden side of a flip card. Confirm each one with `wave-check.mjs N@t` before changing a frame.
- **The `frame.md` from the `code-editorial` preset contradicted the dark palette.** `build-frame` remixed the preset onto a light
  canvas. Read `frame.md` after `build-frame`, and rewrite it when the result is wrong.
- **The scratch folder was locked (EPERM) on the next run.** `wave-check` and `fixture-check` now use a fresh
  `../.wave-*` or `../.fixture-*` folder per process. `wave-check` names it `<name>-<pid>-<time>`, and removes this
  project's folders older than 6 h at start.
- **A worker deleted other runs' `.wave-*` folders** in the middle of a wave. The brief now forbids workers from running
  `wave-check` or touching scratch folders; only the orchestrator runs checks.

## Second video (Claude intro)

Each entry gives the symptom, then the cause and fix. Every fix is now in the scripts or templates.

- **`spokenOverrides` were silently ignored.** `src-to-script` stripped every punctuation mark before the lookup, so
  `5.5` became `55`. It now strips only leading and trailing punctuation, and `--check` prints `overrides=N`.
- **`wave-check` reported failure on a clean frame.** With warnings, the CLI prints `0 error(s), 1 warning(s)` instead of
  `0 errors,`. Both forms now match.
- **Screenshots were missing from `wave-check` snapshots.** Only `assets/fonts` was copied into the scratch project;
  now every `assets/*` folder except `voice` is copied.
- **Frame 3 rendered blank.** A late `fromTo` applied its from-state at time 0. Late `fromTo` tweens need
  `immediateRender: false` (worker delta).
- **A shot blanked when one GSAP vars object was reused** across tweens. Write a fresh object per tween.
- **Tofu or wrong-font symbols.** The fonts lack ① ② ③ ✳ ✕ ✓ →. `frame-guard` rejects them, and workers draw them as SVG.
- **A new display font (Lora) and a softer glow were hand-patched into the skeleton**, so `--update-tools` would have
  erased them. Both now come from `video.config.json`: `fonts[].faces` and `design.glow`.
- **The analyze rail drifted between frames.** `guard.railPatterns` pins its geometry; see visual-storyboard.md.
- **New `check` false positives**, each confirmed with a `wave-check N@t` snapshot:
  - `content_overlap` of a chapter card's kicker with the big numeral's box;
  - a rolling-digit strip clipped by `overflow:hidden`;
  - identical rails during a crossfade;
  - `text_not_painted` on an outlined numeral (transparent fill, visible stroke), which is by design.
- **Claude in Chrome screenshots were low-resolution JPEGs.** Capture with a desktop computer-use tool (Orca) in
  browser fullscreen instead. F11 was not available to the tool; the user toggled it.
- **The first script draft was far too short** (667 s estimated against an 810 s floor). Examples fixed it; the real voice
  then ran 3.5 % over the estimate. See script-authoring.md § "Calibrating the estimate".

## Karaoke

- **The user rejected short 2–4-word phrase lines as choppy.** They approved the whole sentence (≤ 110 characters, up to 2 lines)
  with words revealed one by one. This is the default now; still confirm it at gate 3.
- **Colours overlapped on short words.** The reveal tween outlived the colour reset. The active colour now switches with
  `tl.set`, and the reveal duration is capped to the word's own span.

## Renderer limits (learned by motion-video-skill, MIT, bestagentkits/motion-video-skill)

Not yet hit in our lessons, but the same HyperFrames 0.7.99 renderer produced them there:
- About 40 or more elements with `radial-gradient`, `filter: blur()` or `clip-path` on screen at once rendered
  **black frames**. Count per moment across the frame, including the skeleton's ground glow. Bake textures (halftone,
  grain, noise) into PNG tiles under `assets/images/` and use them as `background-image` or `mask-image`.
- Attach an SVG filter only while its effect runs (`tl.set(el, {filter: "url(#x)"})`, then back to `none`).
- For heavy full-frame layers, toggling `visibility` is cheaper than `opacity: 0`.

## Final audio (skill 0.3.0)

- **The voice was AAC-encoded twice.** The renderer mixes the per-frame `<audio>` clips into AAC, and loudnorm re-encoded
  that. `postprocess` now muxes `audio/voice-concat.wav` instead (one encode) and stream-copies the picture.
- **Mono measures 3 dB quieter than the renderer's dual mono.** Upmix with `pan=stereo|c0=c0|c1=c0`. `aformat` splits
  the power (−3 dB per channel), which forced a +3.9 dB gain and heavy limiting.
- **AAC adds about 0.7 dB of intersample overshoot.** Loudnorm at TP −1.5 gave −0.8 dBFS after encoding, so loudnorm now
  aims at `loudness.tp − 1` and the delivered file is asserted against `loudness.tp` (measured: −2.2 dBFS).
- **The renderer's audio lags the voice master by a constant ~20 ms** (about the 21.3 ms AAC priming). The muxed voice
  master is the picture-aligned one; 20 ms is far below what anyone notices.
- **Never run `sync-report` on the final file.** Its audio is the reference itself; measure the render before `postprocess`.
- **`spawnSync` default `maxBuffer`** (1 MB) silently truncates ffmpeg's `ebur128` per-frame log; raise it.

## Empty-stage check (skill 0.3.0)

Stock `blackdetect` finds nothing on these videos because the canvas is dark, not black. `blank-check.mjs` crops the stage
(y 60–880) and uses `d=2, pix_th=0.25, pic_th=0.999`, calibrated on 2026-09-26:
- a looped ground-only frame is caught;
- the Claude (875 s) and Hermes (612 s) finals give 0 hits;
- the sparsest intended beats last ≤ 1 s.
A frame drawn with thin strokes on the dark canvas already counts as "empty" at `pix_th=0.20` and `pic_th=0.97`, so keep
`pic_th` high and rely on the 2 s duration.

## Cards that hold still (skill 0.5.0)

- `check` fails with `sweep_static` only when a composition of 3 s or more shows zero geometry change at **every** sample
  (9 by default) of the whole `index.html`. `wave-check` never runs `check`.
- Keep the exercise and quiz cards moving anyway (a ring turning by `strokeDashoffset`, a caret blinking by opacity):
  a reveal that finishes early and then holds is the documented trap for short compositions.
- Never hold a frame still for the 5 minutes of a quick-win exercise; the card lasts 8–10 s and asks the learner to pause.
- `guard.layoutPatterns` values must be arrays of regex strings; a scalar throws when the config loads.

## Themes (skill 0.5.0)

- A theme file (`templates/themes/<name>.json`) has three blocks. `new-project.mjs --theme <name>` merges `design` key by key,
  replaces `fonts` as a whole, and merges `karaoke` (for `karaoke.font`). `config.theme` only records which theme was used.
- `abm-brand` uses Montserrat as one variable font (`Montserrat-VF.ttf`, `font-weight: 100 900`) for frames (`design.bodyFont`)
  and karaoke (`karaoke.font`).
- `--update-tools` refreshes only `tools/`. An older project that switches to a theme must also copy the theme's font files from
  the skill's `templates/fonts/` into `assets/fonts/`.
- `templates/fonts` is copied whole into each new project, so the OFL licence files travel with the fonts on purpose.
- After changing the canvas colour or theme, run `node tools/fixture-check.mjs --blank-probe` to prove `blank-check` still catches
  an empty stage on the new canvas (on Navy #030548 it found 3.27–5.97 s, as expected).
- Roles are validated only in `script.src.txt` (`###` lines). A hand-edited `- role:` bullet with another value shows up raw
  in the overlay chip (no label); edit roles in the script, not in `STORYBOARD.md`.

## Render and delivery

- CSS 3D (`perspective`) forces the slower screenshot capture: the draft took 11 min and the final at 30 fps took 17 min.
  Budget for it, or avoid 3D effects. The second video (79 frames, 875 s, no 3D) took 20 min for the draft at 25 fps
  and 24 min for the final at 30 fps.
- GSAP loads from a CDN, so rendering needs a network connection.
- The 1080p file (167 MB) exceeded the 30 MB limit for sending files, so also deliver a 720p copy (about 18 MB).
  A 14.5-minute video needs `-crf 28` to stay under 30 MB (crf 26 gave 33.5 MB).
