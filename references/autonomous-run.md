# Autonomous run — one agent makes the whole lesson

You are the director of this lesson: you write the facts, the script and `scenes.json`, and you approve gates 2 and 3
yourself when their checks pass. The user approves only gate 1 (pronunciation and pace) and gate 4 (the draft).
`next` stays the source of truth: this page is the map of what it will ask, and what "done" means at each step.

```
node tools/bin/abm-video.mjs next          prints NEXT, RUN, WHY: do exactly that, then ask again
```

`<cli>` below means `node tools/bin/abm-video.mjs` inside the project. There is no `abm-video` command on the PATH:
wherever a page or a message says `abm-video …`, run `<cli> …`.

## The run

| # | Step | Command | Writes | Done when | If it fails |
|---|---|---|---|---|---|
| 1 | Create the project | `node <skill>/bin/abm-video.mjs init <dir> --title "<title>" --minutes <n>` | the project folder, `tools/` | it prints `next: cd <dir> && …` | `node <skill>/bin/abm-video.mjs doctor --fix`, then init again |
| 2 | Probe the voice | `<cli> run probe`, then the clips it asks for (`<cli> tts --text … --out .probe/…`) | `.probe/*.wav`, `.probe/pronunciation.md`, `.probe/rate.json` | `run probe` exits 0 | `next` says "start the speech API": start that command in a separate terminal or in the background (it never exits), then ask `next` again |
| 3 | **Gate 1 (user)** | `<cli> gate 1 --request`, show the user `.abm/gates/1.md`, **stop and wait** | `.abm/gates/1.md` | the user answered | record their exact words: `<cli> gate 1 --approve "<their words>"` or `--reject "<their words>"` |
| 4 | Facts | edit `capture/extracted/visible-text.txt` | `[F-NN] fact — source` lines | every fact has a real source, and every URL in the file answers (gate 2 fetches them) | a source that blocks the fetch: cite another page that answers, or name the source without a URL; never invent one |
| 5 | Script | load the viet-pro skill's `SKILL.md`, write `script.src.txt` with it and audit it ([script-authoring.md](script-authoring.md) § Writing with viet-pro) | `script.src.txt`, `script.viet-pro.md` | `<cli> gate 2 --check` shows `✓ viet-pro` (the other gate 2 lines come at step 8) | the line names what is missing: the audit, a fix, a stale hash after an edit, or a lint WARN |
| 6 | Build the script | `<cli> run script` | `script.json`, `SCRIPT-REVIEW.md`, `STORYBOARD.md` | exit 0 | the last lines name the sentence or chapter (depth: facts, example, list run) |
| 7 | Direct the frames | write `scenes.json` ([direction.md](direction.md)) | `scenes.json` | `node tools/compiler/lint.mjs --estimated` prints `0 error(s)` | fix the frame each error names |
| 8 | **Gate 2 (you)** | `<cli> gate 2 --check` | `.abm/gates/2-check.json` | every line starts with `✓` | fix the cause and check again |
| 9 | Approve gate 2 | `<cli> gate 2 --approve --by agent "<what the checks showed>"` | the approval | it prints `gate 2 approved by agent` | a check failed: back to step 8 |
| 10 | Voice | `<cli> run tts`, then `<cli> run voice` | `audio/`, `audio_meta.json` | both exit 0 | clips still wrong after the retakes: run `run tts` once more; still wrong, shorten that sentence in `script.src.txt` (no English word at its start or end), then steps 6–9 again (gate 2 went stale); still wrong, ask the user to listen to `audio/clips/<id>.wav`. Never write `audio/qa-accepted.txt` yourself |
| 11 | Storyboard and compile | `<cli> run storyboard`, then `<cli> run compile` | `compositions/frames/*.html` | both exit 0 (`lint: … 0 error(s)`) | a moved cue: fix that reveal in `scenes.json`, compile again |
| 12 | Karaoke | `<cli> run karaoke` | `renders/karaoke-preview.mp4` | exit 0 | follow the lines it prints |
| 13 | **Gate 3 (you)** | `<cli> gate 3 --check` | `.abm/gates/3-check.json` | `✓ asr`, `✓ lint`, `✓ visible`, `✓ config` | `✗ visible` naming a slot: it is not on screen at that time; fix its reveal or window in `scenes.json`, compile, check again. `✗ visible … the check did not run`: run `node tools/wave-check.mjs 1` once (it installs the browser), then check again |
| 14 | Approve gate 3 | `<cli> gate 3 --approve --by agent "<what the checks showed>"` | the approval | it prints `gate 3 approved by agent` | back to step 13 |
| 15 | Assemble and draft | `<cli> run assemble`, then `<cli> run draft` | `index.html`, `renders/draft.mp4` | both exit 0 | follow the lines it prints |
| 16 | Look (not a gate) | § Reading the screen, below | you write `renders/qa-report.md` | every checked frame shows its slots | fix `scenes.json`, then steps 11–15 again |
| 17 | **Gate 4 (user)** | `<cli> gate 4 --check` (`✓ lint`, `✓ asr`, `✓ blank`), then `<cli> gate 4 --request`, show the user `.abm/gates/4.md`, **stop and wait** | `.abm/gates/4.md` | the user answered | `✗ blank`: look at the time it names with `node tools/wave-check.mjs <n>@<t>`, fix `scenes.json`, steps 11–17 again. Record the user's exact words, as at gate 1; if the approval then says `checks failed`, fix the cause and request gate 4 again, without asking the user twice for the same draft |
| 18 | Final | `<cli> run final`, then `<cli> run clean --apply` | `renders/<name>.mp4`, `renders/chapters.txt` | `next` says there is nothing left to run | clean refuses without `renders/qa-report.md`: write it (step 16) |

After gate 4 is rejected, apply the changes the user listed (usually `scenes.json`), then steps 11–17 again.

## Never

- Never edit a file under the skill folder (`~/.claude/skills/…`, `~/.gemini/…/skills/…`), and never the copies in
  `tools/`. If the skill looks wrong, write it in `skill-issues.md` (§ When you are stuck) and let the maintainer fix it.
- Never loosen a threshold in `video.config.json` (`scenes.*`, `depth.*`, `voice.*`). The config check compares them
  with the skill's defaults and fails gates 2 and 3. Never change `scenes.authoring`.
- Never approve gate 1 or 4 yourself. Their note is the user's own words, quoted, never your summary.
- Never approve gate 2 or 3 before `gate <n> --check` shows only `✓`.
- Never write `audio/qa-accepted.txt`: only someone who listened to a clip may accept it.
- Never write a Vietnamese respelling of an English word in `spokenOverrides`; English stays as written unless the
  user asks at gate 1.
- Never edit `index.html` or a compiled frame's HTML; never use `--force`; never run `hyperframes upgrade`.

## Reading the screen (before gate 4)

The checks read the page; this step reads the picture, the way a viewer does.

1. Pick the 5 frames with the most words on screen (count the slot text in `scenes.json`).
2. For each, take the end of the frame: `node tools/wave-check.mjs <n>@<duration − 0.3>` (the duration is the frame's
   `- duration:` in `STORYBOARD.md`). It prints `snapshots: <folder>`.
3. Read each snapshot with your OCR or vision tool (in Claude Code: the `antigravity_ocr` MCP tool). Compare with the
   frame's slots: every slot's text is there, readable, not cut, above the karaoke band.
4. A slot missing or cut: fix `scenes.json` (shorter text, a later window end, another variant), then steps 11–15.
5. Write `renders/qa-report.md` yourself: one line per frame you read (`frame <n> @<t>: slots seen: … — ok` or what
   you fixed), and the `privacy-check …` line that `run assemble` printed. `run clean --apply` refuses without it.

## When you are stuck

- The same check fails 3 times in a row after your fixes: stop. Tell the user which check, attach
  `.abm/gates/<n>-check.json`, and say what you tried.
- A check or a stage looks wrong (it fails on a file that is right): do not work around it. Append to
  `skill-issues.md` at the project root (create it): the command, its last 20 lines, and why you think the skill is
  wrong. Then tell the user.
- A decision only the user can make (topic scope, a fact you cannot source, a cut to the length): ask, and wait.
