---
name: abm-video-bgdt
description: "Make a narrated Vietnamese e-learning lesson video (bài giảng điện tử, video bài giảng, e-learning, course chapter, narrated explainer over ~2 min, 16:9) with HyperFrames: VieNeu-TTS narration through the vieneu-tts MCP, word-by-word karaoke captions in the bottom 15%, and varied visuals timed to each spoken keyword. Use it for 'làm video bài giảng', 'video e-learning cho học viên ABM', 'video giới thiệu <chủ đề> từ cơ bản đến nâng cao'. Do not use it for 60–90 s faceless explainers with HeyGen voices (/faceless-explainer), videos built from a website (/product-launch-video), or short motion graphics."
user-invocable: true
argument-hint: "<topic or project dir> [--from <stage>]"
metadata:
  author: ABM
  version: "0.3.0"
  proven-on: "videos/hermes-agent-explainer (612 s, 63 frames, 2026-09-25); videos/claude-intro-explainer (875 s, 79 frames, real screenshots, 2026-09-25)"
---

# abm-video-bgdt: e-learning lesson video

This skill makes a Vietnamese lesson video of 3–15 minutes, 1920×1080:
- narration: the vieneu-tts MCP, one clip per sentence
- word timing: MMS_FA forced alignment
- karaoke band: bottom 162 px
- overlay: progress bar, chapter label, and the courier trail
- visuals: one HTML frame per storyboard frame, built by parallel workers

It is built on the installed `faceless-explainer` skill (storyboard → frame-packets → assemble →
transitions) and **replaces two of its steps**: the TTS step (`audio.mjs`) and the captions step
(`captions.mjs`). Load `faceless-explainer` only for its references; follow this file for the order of work.

The skill is personal, not portable. It assumes this Windows machine, PowerShell 7, ffmpeg, Node, `uv`, and the
VieNeu-TTS venv with torchaudio and uroman. The first alignment downloads the 1.2 GB MMS_FA model.

## Non-negotiables

- **CLI pin.** Use only `npx -y hyperframes@<cli.pin>` (0.7.99 today). The `/hyperframes` router tells agents
  to run `upgrade` on pinned projects; **ignore that here**. Never run `upgrade`, `skills update`, or
  `add` inside the project. To move the pin, first make `node tools/fixture-check.mjs` pass on the new
  version, then write `tools/worker-kit/worker-delta-<pin>.md.tmpl` from its lint output.
- **HeyGen skills stay read-only.** Never edit `~/.agents/skills/`. Every `init` runs with `HYPERFRAMES_SKIP_SKILLS=1`
  (the scripts do this for you).
- **Four user gates**, plus gate 2b when the lesson shows real screenshots. Ask each one with AskUserQuestion,
  and never skip one:
  - **Gate 1:** pronunciation and voice pace, on the probe clips.
  - **Gate 2:** the script (`SCRIPT-REVIEW.md`), **before any TTS for the lesson**.
  - **Gate 2b:** every redacted screenshot, before a worker may use it. Only approved files go to `assets/screens/`.
  - **Gate 3:** the karaoke style, on a short preview clip. Default: whole sentence, words reveal one by one.
  - **Gate 4:** the draft video, before the final render (11–25 min).
- **Screenshots come only from actions the user approved**, in their own account. Redact with solid boxes, never blur.
  `privacy-check.mjs` must pass before gate 4.
- **Facts come only from local sources** listed in `capture/extracted/visible-text.txt` as `[F-NN]`.
  Record terminal output only from read-only commands (`--help`, `--version`).
- **Never regenerate `STORYBOARD.md` after the visual fields exist.** A text change patches the
  voiceover in place (see references/pipeline-stages.md § "Changing text late").
- **Frames are seek-safe.** GSAP timelines are paused and registered on `window.__timelines`. No `Date.now`,
  `Math.random`, `setTimeout`, `requestAnimationFrame`, or `repeat:-1`. The delta file lists the rest.

## Paths

- `$P`: the project root. Every command runs from `$P`.
- `$SKILL`: this skill's folder.
- `$SK`: `~/.agents/skills/faceless-explainer/scripts`, or `$HF_SKILLS_DIR/faceless-explainer/scripts`.
- `video.config.json`: every per-project parameter (title, voice, timing, budget, scene types, palette,
  fonts, karaoke, chapter label format, CLI pin, GSAP URL, render, loudness). Tools never hard-code them.
- Machine paths come from environment variables, with defaults in `tools/lib/config.mjs`:
  - `HF_SKILLS_DIR`
  - `VIENEU_VENV` (default `D:/TQD/Claude-Video/VieNeu-TTS`)
  - `HF_CACHE_DIR`

## Stages

Detailed steps, commands and pass conditions are in [references/pipeline-stages.md](references/pipeline-stages.md).

| # | Stage | Main commands | Gate / check |
|---|-------|---------------|--------------|
| 0 | Scaffold | `node $SKILL/scripts/new-project.mjs videos/<slug> --title "…"`, edit `video.config.json` | – |
| 1 | Probes | `build-design-kit.mjs`, `fixture-check.mjs`; pronunciation and rate probes via MCP; `measure-rate.mjs` | **Gate 1**; fixture 0 errors; rate 2.5–6 syl/s |
| 2 | Facts and script | `visible-text.txt`, `script.src.txt`, `run-pipeline.ps1 -From script -To script` (runs `facts-check.mjs`) | `--check` ok, `overrides=` > 0 when overrides exist; facts-check ok; **Gate 2**; then `script-to-md.mjs script.json` once |
| 2b | Screenshots (only if the lesson shows real UI) | capture, redact, `capture/screens/INDEX.md`, copy approved files to `assets/screens/` | **Gate 2b** |
| 3 | Voice | `tts-manifest.mjs --pending` → MCP `text_to_speech` per job → `-From voice -To meta` | QA flagged=0; verify bad=0; the align report lists 0 failed |
| 4 | Design and storyboard | `build-design-kit.mjs`, `build-frame.mjs --preset`, catalog, `fetch-registry-refs.mjs`, visual fields | `variety-lint.mjs` ok |
| 5 | Frames | `-From cues -To cues`, `frame-packets.mjs`, workers in waves, `wave-check.mjs`, `-From karaoke -To assemble` | each wave: 0 lint errors; **Gate 3**; `transitions verify` |
| 6 | QA and delivery | `-From check -To check` (runs `privacy-check.mjs`), draft render, `sync-report.mjs`, `-From render -To post` (sync on the render, then the voice master is muxed in, then `blank-check.mjs`) | privacy clean; sync ≤ 0.15 s; **Gate 4**; −16 ±1 LUFS, true peak ≤ −1.5; no empty stage ≥ 2 s |

Stages 2b, 3 and 4 may run in parallel once gate 2 is passed: stage 3 owns `audio/` and `audio_meta.json`,
and stage 4 owns `frame.md` and the visual fields of `STORYBOARD.md`.

## Frame workers

Dispatch one `general-purpose` subagent per frame. Run at most 20 concurrently; waves of 6–10 are easier to check.
Each prompt contains:
- `tools/worker-brief.md`, verbatim;
- for a `screen` frame, also `tools/worker-screen-addendum.md`, verbatim;
- the frame id, the number NN, the prefix PFX (`fNN`), the chapter, and HUE (`hueBase + hueStep × chapter`);
- whether this is the final frame.

A worker writes exactly one file, `compositions/frames/<id>.html`. After each wave, the orchestrator:
- runs `node tools/wave-check.mjs <numbers>`. It lints, runs `frame-guard.mjs` (glyphs the fonts lack, optional
  rail geometry from `guard.railPatterns`), and takes snapshots;
- looks at the snapshots, and uses `N@t` to check the look at a cue time;
- sends failing frames back to their worker with the exact lint line;
- marks passing frames `status: animated` in `STORYBOARD.md`. Workers never touch `STORYBOARD.md`.

## References

- [references/pipeline-stages.md](references/pipeline-stages.md): each stage step by step, with commands and pass conditions
- [references/script-authoring.md](references/script-authoring.md): the `script.src.txt` grammar, budget math, and plain-language rules
- [references/visual-storyboard.md](references/visual-storyboard.md): scene catalog, shot rules, storyboard fields, and design system
- [references/gotchas.md](references/gotchas.md): what broke on the first video and how it was fixed
- `templates/worker-kit/*.tmpl`: worker brief, delta for CLI 0.7.99, screen addendum, and frame skeleton (filled by `build-design-kit.mjs`;
  the skeleton's `@font-face` lines come from `fonts`, using each entry's `faces` for fonts the skill does not ship)

## Updating the skill

- Scripts in `$SKILL/scripts/` are canonical. Each project runs its own copy in `tools/`.
- Fix a bug in the skill first, then refresh a project with
  `node $SKILL/scripts/new-project.mjs <dir> --update-tools`.
- A new CLI pin means:
  1. change `cli.pin` in a scratch project;
  2. run `fixture-check.mjs`;
  3. write the new `worker-delta-<pin>.md.tmpl`;
  4. only then use the new pin in real projects.
