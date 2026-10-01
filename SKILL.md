---
name: abm-video-bgdt
description: "Make a narrated Vietnamese e-learning lesson video (bài giảng điện tử, video bài giảng, e-learning, course chapter, narrated explainer over ~2 min, 16:9) with HyperFrames: VieNeu-TTS narration, word-by-word karaoke captions in the bottom 15%, and visuals compiled from a scene-template library and timed to each spoken keyword. Use it for 'làm video bài giảng', 'video e-learning cho học viên ABM', 'video giới thiệu <chủ đề> từ cơ bản đến nâng cao'. Do not use it for 60–90 s faceless explainers with HeyGen voices (/faceless-explainer), videos built from a website (/product-launch-video), or short motion graphics."
user-invocable: true
argument-hint: "<topic or project dir>"
metadata:
  author: ABM
  version: "1.0.2"
  proven-on: "videos/hermes-agent-explainer (612 s, 63 frames) rebuilt from templates; videos/claude-intro-explainer (875 s, 79 frames)"
---

# abm-video-bgdt: e-learning lesson video

A production line, not a guide: a CLI with recorded state and user gates runs every stage, and the frames are compiled
from templates. **Always run `next` and do exactly what it prints. Never invent a step.**

```
node <skill>/bin/abm-video.mjs next            before a project exists (it tells you to run init; pass --minutes <n>)
node tools/bin/abm-video.mjs next              inside a project (the folder with video.config.json)
```

It prints three lines — `NEXT` (the task), `RUN` (the command), `WHY`. Run the command, then ask `next` again.
There is no `abm-video` command on the PATH: wherever a page or a message says `abm-video …`, run
`node tools/bin/abm-video.mjs …` inside the project (`node <skill>/bin/abm-video.mjs …` outside one).
If the machine is not ready it says `doctor`; `abm-video doctor --fix` installs what is missing.

## The only things you write

1. **Facts:** `capture/extracted/visible-text.txt`, one `[F-NN] fact — source` per line, from real sources only.
2. **Script:** `script.src.txt`, written and audited with the **viet-pro** skill (load its SKILL.md; the audit goes in
   `script.viet-pro.md`, which gate 2 checks), following [references/script-authoring.md](references/script-authoring.md). Mark 2–4 word
   noun phrases as `*keywords*`; they become the on-screen labels. Give every chapter its own arc (§ Chapter arcs: no
   two chapters on the same scene hints), write a list's items on a `| a / b / c` line, and use `exercise` at most once
   in the whole video. Keep English words (product names, terms) as written; list them in the gate 1 probe, never respell them.
3. **Scenes:** under `authoring: "director"` (the default; `"claude"` is its older name) the agent making the video
   writes `scenes.json` by hand before gate 2, one visual `idea` per frame, following
   [references/direction.md](references/direction.md). Older projects let the storyboard stage's solver write it. Shape and catalog: [references/scene-spec.md](references/scene-spec.md). At most 15 % of frames may be `custom` (hand-built with
   [references/custom-frame.md](references/custom-frame.md)).
4. **Gate answers:** when `next` asks for a gate, show the user the file it names, then record the user's own words:
   `abm-video gate <n> --approve "<what they said>"` or `--reject "<the changes>"`. The gates: pronunciation and pace (1),
   script (2), screenshots (2b, only with real UI), karaoke style (3), draft video (4). In a directed lesson you approve
   gates 2 and 3 yourself, only after `gate <n> --check` shows every check `✓`:
   `abm-video gate <n> --approve --by agent "<what the checks showed>"`.

**Making the whole video alone:** follow [references/autonomous-run.md](references/autonomous-run.md), the step table
with the command and the pass condition of every step.

## Never

- Never edit `index.html` or a compiled frame's HTML; change `scenes.json` and run `abm-video run compile`.
- Never approve gate 1 or 4 yourself, and never skip a gate; a gate goes stale when its files change.
- Never edit files in the skill folder or in the project's `tools/`, and never loosen a threshold in
  `video.config.json`; report a skill problem to the user instead (autonomous-run.md § When you are stuck).
- Never run `hyperframes upgrade`, `skills update` or `add` in a project; the CLI stays pinned (`video.config.json` `cli.pin`).
- Never use `--force`; it exists for the skill's own tests.
- Never put private data on screen; screenshots go through gate 2b and `privacy-check`.

## When something fails

Read the command's last lines; they name the file and the fix. `abm-video status` shows every stage and gate.
Environment problems: `abm-video doctor --fix`, or `setup/AGENT-SETUP.md` for a new machine.

## Reference (maintainers)

- [references/pipeline-stages.md](references/pipeline-stages.md) — what each stage does, timings, the late-change rule.
- [references/gotchas.md](references/gotchas.md) — HyperFrames 0.7.99 and tooling pitfalls.
- `dev/` — `template-ci.mjs`, `compiler-tests.mjs`, `cli-tests.mjs`, `regression-check.mjs`, `compile-fixture.mjs --auto`.
