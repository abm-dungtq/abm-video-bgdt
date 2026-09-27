# Pipeline stages, step by step

Run every command from the project root `$P`, using Git Bash syntax for the checks.
- `R` is `pwsh tools/run-pipeline.ps1`.
- `$SK` is `~/.agents/skills/faceless-explainer/scripts`.
- `$HF` is `npx -y hyperframes@<cli.pin>`.

A **Verify** line states a mechanical pass condition. If a Verify fails:
1. stop;
2. read the full output;
3. fix the cause, not the check.

On the second failure of the same step, spawn `kongming` with the stage, the command, the output and the pass condition.

## Stage 0: Scaffold

1. Check that the VieNeu API is up: MCP `server_status` must return `"status":"ok"`. If it does not, ask the
   user to start the speech API with this skill's `mcp/vieneu-tts/start-api.ps1` (SETUP.md § 4).
2. `node $SKILL/scripts/new-project.mjs videos/<kebab-slug> --title "<Tiêu đề bài giảng>"`. Add `--theme abm-brand` for the
   ABM brand (Navy #030548, orange-gold #F9B508, Montserrat for frames via `design.bodyFont` and for karaoke via
   `karaoke.font`). The theme is optional; without it the project keeps the default palette.
   This runs a pinned `init` with skills frozen, then copies `tools/`, `tools/worker-kit/`, the fonts,
   `video.config.json`, `BRIEF.md`, a sample `script.src.txt`, and the capture folders. It also appends an
   override note to the project's `CLAUDE.md` and `AGENTS.md`.
3. Edit `video.config.json`:
   - `title`, `message`, `audience`, `arc`
   - `budget.targetS`: the duration window in seconds. For 10 minutes use `[570, 630]`.
   - `budget.frames`: about 6 frames per minute.
   - `budget.syllables`: the total is roughly `targetS_mid × rate − pauses`. Refine it after the rate probe.
   - `scenes.terminalChapters`: the chapters that may show real terminal replays.
   - `design`: the palette. Keep the "Sứ giả" palette unless the user wants another look.
   - `voice.id`: the default is `Thanh Bình`. Check it against MCP `list_voices`.

Verify: `node -e "JSON.parse(require('fs').readFileSync('video.config.json','utf8'))"` exits 0.

## Stage 1: Probes (about 1 h)

1. `node tools/build-design-kit.mjs`. Verify: it prints `design kit: …`.
2. `node tools/fixture-check.mjs`. Verify: it prints `fixture-check ok`. If it fails, the pin or the installed
   faceless-explainer scripts have drifted, so stop and resolve that before anything else.
3. **Pronunciation probe.** List every English or technical term in the topic. Synthesize them in one
   `text_to_speech` call, separated by commas, to `.probe/terms-raw.wav`. For any term that sounds wrong, try
   Vietnamese-phonetic spellings in `.probe/terms-candidates.wav`. Record each decision in
   `.probe/pronunciation.md`. Put every override in `video.config.json` → `spokenOverrides`
   (`"display token": "spoken text"`).
4. **Rate probe.** Pick a 45–55-syllable sentence typical of the lesson and call `text_to_speech` with the configured
   voice and temperature, writing to `.probe/rate.wav`. Then run `node tools/measure-rate.mjs .probe/rate.wav "<same text>"`.
   Verify: exit 0 (rate 2.5–6 syl/s). Thanh Bình measured 4.32.
5. **Gate 1.** Let the user listen to `terms-raw.wav` (and candidates) and `rate.wav`, then ask with
   AskUserQuestion:
   - Is the pronunciation acceptable?
   - Is the pace right?
   If the pace feels fast, raise `timing.gap` (0.5 s between sentences suited the first video). You may
   also lower `voice.temperature` slightly. Re-measure after any voice change.

## Stage 2: Facts and script (about 3 h)

Mark each content chapter's DNA roles with `### hook|core|case|action` lines (script-authoring.md § DNA chapter template).

1. **Facts.** Read only local sources (README, docs, `--help` output, or web pages saved to `capture/sources/`). Write
   `capture/extracted/visible-text.txt` as `[F-NN] one fact — source`, grouped under `##` headings. Save
   read-only terminal output that the video will show to `capture/terminal/*.txt`.
   - When the sources are saved web pages, list them in `capture/sources/INDEX.md`, a table whose first column is
     the slug used after `—`, with URL, published and accessed dates.
   - For a feature survey, fill `capture/COVERAGE.md`: one row per feature, with its F-NN, source, accessed date,
     chapter pick and visual (`real | minh-hoa | graphic | omitted`).
2. **Script.** Write `script.src.txt` following [script-authoring.md](script-authoring.md).
3. Run `R -From script -To script`. This runs `src-to-script`, `--check`, `facts-check`, `--review` and `tts-manifest`.
   Verify:
   - the pipeline finishes with `pipeline ok: script -> script`;
   - `facts-check ok` is printed: every F-NN in the script, storyboard and coverage is defined, and each fact's source
     has a row in `capture/sources/INDEX.md` when that file exists;
   - when `spokenOverrides` is set, the `--check` line shows `overrides=` above 0 and no `⚠ spokenOverrides never used`.
   - If the estimate is too long, propose specific supporting sentences to cut and ask the user. Never cut silently.
   - If it is too short, add examples.
4. **Gate 2.** Send `SCRIPT-REVIEW.md`, which shows chapters, per-frame text, the time estimate and the cited facts. Ask:
   approve, or a list of changes. Loop until approved.
5. Record the approval in `script.json` → `meta.approved` (for example `"2026-09-25 by user"`).
   `src-to-script` keeps it on later runs.
6. Run `node tools/script-to-md.mjs script.json` **once**. It writes `SCRIPT.md` and the outline
   `STORYBOARD.md`, where every frame has `src`, `duration`, `transition_in`, `scene`, `chapter` and `voiceover`.
   Never run write mode again after stage 4 has started.

## Stage 2b: Screenshots (only when the lesson shows real UI)

1. Write a shot list: feature, the UI state to show, and the demo actions it needs. Ask the user to approve the
   demo actions in their account before doing any of them.
2. **Capture.** Use a desktop computer-use tool (Orca on the first run) on the user's browser, in fullscreen, with the
   lesson's theme. Save PNGs to `capture/screens/raw/`.
   - Claude in Chrome screenshots are low-resolution JPEGs, so do not use them.
   - F11 may not be available to the tool. Use the browser menu for fullscreen, and ask the user to leave it.
3. **Redact.** Cover every personal item (names, emails, account chips, private chat text) with solid boxes in the
   surface colour, never blur. Upscale with lanczos to 1920×1080, and save to `capture/screens/redacted/`.
4. Add one row per shot to `capture/screens/INDEX.md`: `<redacted file> → assets/screens/<file>`, F-NN, feature,
   UI state, date, redactions, and approved.
5. **Gate 2b.** Send the redacted shots. Ask the user to approve each one, or to name more redactions.
   - Set the last column to `Y` for approved shots, and copy only those files to `assets/screens/`.
   - A feature that cannot be captured becomes a `MINH HỌA` mockup; record it in `COVERAGE.md`.
6. Verify: `node tools/privacy-check.mjs` prints `privacy-check ok`.

## Stage 3: Voice and alignment (about 1–2 h, mostly TTS)

1. Run `node tools/tts-manifest.mjs --pending`. It prints `{voice, temperature, sample_rate, jobs:[{id,text,output_path}]}`.
2. For each job, call MCP `text_to_speech` with exactly those `voice`, `temperature`, `sample_rate`, `text` and
   `output_path` values. Work in batches of about 20. `--pending` resumes after an interruption.
   Verify: `node tools/tts-manifest.mjs --pending` reports `pending=0/N`.
3. Run `R -From voice -To meta`. This runs:
   - `build-voice.py --qa`, which flags clips far from the expected length;
   - trim and per-frame concat into `assets/voice/NN.wav`;
   - `--verify`;
   - MMS_FA alignment;
   - `build-audio-meta.py`.
   Verify:
   - QA reports `flagged=0`. Regenerate each flagged clip, or listen to it and add its id to `audio/qa-accepted.txt`.
   - Verify reports `bad=0`.
   - The meta line reports `0 failed`. A `syllable` fallback count above 0 is allowed; spot-check those sentences.
4. Check the total with `cat audio/total.txt`. It must lie inside `budget.targetS`.
   `node tools/script-to-md.mjs --check script.json` now also prints `real=` and `ratio=` (real / estimate).
   Record the ratio in the journal; see script-authoring.md § "Calibrating the estimate".

## Stage 4: Design and visual storyboard (about 2 h; can run alongside stage 3)

1. Run `node tools/build-design-kit.mjs` again if the palette changed. It rewrites `tokens.json` and the worker kit.
2. Pick a preset from `~/.agents/skills/hyperframes-creative/frame-presets/`: dark and technical
   (`code-editorial`, `cobalt-grid`, `cartesian`) or one that suits the topic. Run
   `node $SK/build-frame.mjs --preset <name> --hyperframes .`.
   Verify: `grep -c "@font-face" frame.md` prints ≥ 2 and the palette hexes appear in `frame.md`.
   **Read `frame.md`.** If the preset's remix contradicts the palette (on the first video it painted a light canvas),
   rewrite `frame.md` by hand as the design truth: palette roles, type scale, motion language,
   and the courier-trail motif.
3. Search the registry. Run `$HF catalog --json > .probe/catalog.json` once, then search names and descriptions for
   the looks you need (terminal window, path line draw, node graph, count up, checklist). Fetch the ones
   you adopt with `node tools/fetch-registry-refs.mjs <name…>`. They go to `.hyperframes/registry-ref/` and are
   read-only ideas for the workers.
4. Add the visual fields to every `## Frame N` block of `STORYBOARD.md`, plus a `## Video direction` block.
   Follow [visual-storyboard.md](visual-storyboard.md).
5. Give every frame a `- layout:` bullet, one token per shot (see visual-storyboard.md § Layout library).
   Run `node tools/variety-lint.mjs STORYBOARD.md`. Verify: the summary ends with ` ok` and shows `layouts=<n> dna=…`.
   Read every `⚠` warning (repetition, low variety, missing custom layout, DNA order); they do not block the pipeline.
6. Post a heads-up to the user: a compact table of frame, chapter, shot types and focal. Continue unless the user objects.

## Stage 5: Frames, karaoke and assembly (about 3–4 h)

1. Run `R -From cues -To cues`. It syncs durations to the voice, retimes shots and Scene lines, and writes `- cues:`.
   Verify: the output includes `cues ok` and `frames=… ok`.
2. Run `node tools/build-design-kit.mjs` if it was not run since the last config change.
3. Run `node $SK/frame-packets.mjs --project "$P" --storyboard "$P/STORYBOARD.md"`. It writes `.hyperframes/frame-packets/`.
4. Dispatch the workers (see SKILL.md § Frame workers). Workers whose block has `- layout:` also read
   `tools/worker-layouts.md`. Each worker gets `tools/worker-brief.md` plus its dispatch
   context. After each wave:
   1. `node tools/wave-check.mjs <nums>`. Verify: `0 errors` and `frame-guard ok`.
   2. Read the snapshots. Use `N@t` to look at a specific cue.
   3. Send back failures together with the exact lint line.
   4. Set `- status: animated` for the frames that passed.
5. Run `R -From karaoke -To karaoke`. It builds `compositions/captions.html` and `compositions/overlay.html`. Verify: `groups=… ok`.
6. **Gate 3.** Render a preview with `node tools/wave-check.mjs 1 2 3 --render renders/karaoke-preview.mp4` and send it.
   Ask whether the karaoke style is right.
   - Default: the whole sentence (≤ 110 characters, up to 2 lines) with words revealed one by one; a word turns gold while spoken, with a gold underline.
   - To change it, edit `karaoke` in the config or `tools/build-karaoke.mjs`.
7. Run `R -From assemble -To assemble`. Verify: `✓ transitions verify: … verified`.

## Stage 6: QA, render, delivery (about 2 h plus render time)

1. Run `R -From check -To check`. It runs lint, `privacy-check.mjs`, then `check --timeout <cli.checkTimeoutMs>`
   (default 240000; 60 s timed out on a loaded machine).
   - Lint must show 0 errors.
   - `privacy-check ok … privacy: clean`. Copy that line into `renders/qa-report.md`.
   - Runtime must show 0 errors.
   - For every `content_overlap` finding, take a snapshot at the flagged time with `wave-check.mjs N@t`. On the first video
     all eight were false positives, caused by elements at opacity 0, clipped, or on flip cards. Record each verdict in
     `renders/qa-report.md`. Fix real overlaps in the frame file.
   - Because this stage exits 1 whenever layout findings remain, the orchestrator decides only after checking the snapshots.
2. Draft render:
   ```
   $HF render --quality draft --fps 25 --frames-cache-dir <cache> --output renders/draft.mp4
   ```
   Run it in the background. The first video took about 11 min. Then run `node tools/sync-report.mjs renders/draft.mp4`,
   then `node tools/sync-report.mjs --max`. Verify: exit 0 (≤ 0.15 s; the first video measured 0.022 s).
   The report also cuts clips into `renders/spot/`.
3. Make a 720p copy:
   ```
   ffmpeg -i renders/draft.mp4 -vf scale=1280:-2 -c:v libx264 -crf 28 -c:a aac renders/draft-720p-preview.mp4
   ```
4. **Gate 4.** Send the draft, or the 720p copy and the spot clips. Ask: approve, or a list of frame ids to change.
   Use the late-change rule below to make changes, then re-render the draft.
5. Run `R -From render -To post`. It renders `renders/master-raw.mp4` with the config's quality and fps (17–25 min at 30 fps).
   The `post` stage then, in this order:
   1. `sync-report.mjs renders/master-raw.mp4` and `--max`: the drift of the renderer's audio against the voice master (≤ 0.15 s);
   2. `postprocess.mjs`: the picture is stream-copied, and the audio is `audio/voice-concat.wav` upmixed to dual mono,
      two-pass loudnorm with 1 dB of headroom for the AAC encode, then one AAC encode. It asserts the delivered
      loudness (−16 ±1 LUFS, true peak ≤ `loudness.tp`) and writes `renders/<name>.mp4` and `renders/chapters.txt`;
   3. `blank-check.mjs`: no stretch ≥ 2 s where the stage shows only the ground.
   Never run `sync-report` on the final file: its audio is the reference itself, so it would always pass.
6. Verify:
   - `ffprobe` shows 1920×1080, a duration inside `budget.targetS`, a video stream, and a stereo audio stream.
   - The `post` stage printed `postprocess: … I -16.x LUFS, true peak ≤ -1.5` and `blank-check ok`.
7. Deliver:
   - the final MP4 (files over 30 MB can only be opened in the desktop app);
   - a 720p copy for phones;
   - `chapters.txt`;
   - `renders/qa-report.md`.
   Write a journal entry.

## Stage 7: Cleanup (after delivery)

A finished 10-minute lesson leaves 380–480 MB of regenerable files in the project: drafts, previews, `master-raw.mp4`,
trimmed clips, the voice concat, and probe audio. `tools/clean-project.mjs` lists them against fixed rules and
moves them to the Windows Recycle Bin. It never deletes permanently.

1. Run `node tools/clean-project.mjs`. This is a dry run at level `delivered`: it prints each item, its size, and why it can go.
   The script refuses to run unless the final MP4 has video and audio streams, `renders/qa-report.md` exists, and
   `audio/clips` holds a clip for every TTS job.
2. Read the list. If the user may still ask for changes to this video, stop here: `delivered` keeps every input that
   `-From render -To post` needs, but a late change after cleaning costs a full re-render because `master-raw.mp4` is gone.
3. Run `node tools/clean-project.mjs --apply`. The result is appended to `renders/cleanup-log.txt`.
4. When the project is closed for good, run `node tools/clean-project.mjs --level archive --apply`. It also recycles
   `assets/voice` (rebuilt byte for byte by `R -From voice -To meta`) and `.hyperframes/frame-packets`. Rebuild the voice before
   rendering again.
5. Empty the Recycle Bin yourself when you are sure. An agent never empties it.

Measured on 2026-09-26: level `delivered` recycled 380 MB from the Hermes project (665 MB → 284 MB) and 482 MB from the Claude intro
project (865 MB → 382 MB). Both final MP4s kept their video and audio streams.

What the script never touches:
- **Deliverables:** `renders/<name>.mp4`, the 720p copy, `chapters.txt`, `qa-report.md`, and `sync*.json`.
- **Sources:**
  - `audio/clips`: re-synthesizing costs one MCP call per sentence, and the result never sounds identical;
  - `script.src.txt`, `script.json`, `STORYBOARD.md`, `SCRIPT*.md`;
  - `compositions/`, `frame.md`, `index.html`;
  - `capture/`, `assets/fonts`, `assets/screens`;
  - `audio_meta.json`, `audio/align`, `audio/offsets.json`, `audio/tts-jobs.json`;
  - `.probe/rate.json` and `.probe/pronunciation.md`, plus any other `.probe/*.md` notes that match no rule;
  - `tools/`, `video.config.json`.
- **Outside the project:**
  - `vieneu-mcp/outputs/` holds voice samples from choosing voices. Ask the user before removing them.
  - `.backup/` holds rollback copies. Remove each one only after the change it protects has been verified.
  - The machine caches are needed for the next video: `~/.cache/torch` (the MMS_FA model, 1.2 GB), `~/.cache/huggingface` (VieNeu), and `~/.cache/hyperframes` (headless Chrome).

## Changing text late (after the storyboard has visual fields)

1. Edit `script.src.txt`, then run `R -From script -To script`. Gate 2 applies again if the meaning changed.
2. Delete the changed clips from `audio/clips/`, regenerate them from `tts-manifest.mjs --pending`, and run `R -From voice -To cues`.
3. Run `node tools/retime-and-cue.mjs --patch-voiceover` to rewrite `- voiceover:` in place.
4. Re-dispatch workers **only** for frames whose `duration` moved more than 0.1 s or whose `cues` changed.
5. Run `R -From karaoke -To check`, then render the draft again.

## Stage map of `run-pipeline.ps1`

| Stage | Runs |
|-------|------|
| `script` | `src-to-script` → `script-to-md --check` → `facts-check` → `--review` → `tts-manifest` |
| `tts` | always stops with instructions: TTS runs through the MCP |
| `voice` | `build-voice.py --qa` → build → `--verify` |
| `align` | `align-words.py` (MMS_FA, falling back to syllables) |
| `meta` | `build-audio-meta.py` → `audio_meta.json` |
| `cues` | `audio.mjs sync-durations` → `retime-and-cue` → `--check` → `variety-lint` |
| `karaoke` | `build-karaoke` → `--check` → `build-overlay` |
| `assemble` | `assemble-index` → `transitions inject` → `inject-overlay` → `transitions verify` |
| `check` | `lint` → `privacy-check` → `check --timeout <cli.checkTimeoutMs>` |
| `render` | `render` with the config's quality and fps, and the frames cache |
| `post` | `sync-report` on the render → `--max` → `postprocess.mjs` (voice master, loudness, chapters) → `blank-check.mjs` |
