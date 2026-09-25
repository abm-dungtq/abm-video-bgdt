# Gotchas from the first video (Hermes Agent, 2026-09-25)

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
- The full-project `check` and `snapshot` need `--timeout 60000`, because the default 10 s is too short for about 60 sub-compositions.
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
  `../.wave-*` or `../.fixture-*` folder per process. Delete the old ones once they are unlocked.

## Karaoke

- **The user rejected short 2–4-word phrase lines as choppy.** They approved the whole sentence (≤ 110 characters, up to 2 lines)
  with words revealed one by one. This is the default now; still confirm it at gate 3.
- **Colours overlapped on short words.** The reveal tween outlived the colour reset. The active colour now switches with
  `tl.set`, and the reveal duration is capped to the word's own span.

## Render and delivery

- CSS 3D (`perspective`) forces the slower screenshot capture: the draft took 11 min and the final at 30 fps took 17 min.
  Budget for it, or avoid 3D effects.
- GSAP loads from a CDN, so rendering needs a network connection.
- The 1080p file (167 MB) exceeded the 30 MB limit for sending files, so also deliver a 720p copy (about 18 MB).
