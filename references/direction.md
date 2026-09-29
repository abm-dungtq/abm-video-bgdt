# Direction — the coordinator writes scenes.json

Under `"scenes": { "authoring": "claude" }` (the default for new projects) the solver does not pick the visuals. The
coordinator (Claude) writes every frame of `scenes.json` by hand, and a worker (agy, codex…) only runs stages. The
storyboard stage stops with `scenes.json missing: authoring is "claude"` until the file exists; `run storyboard
--regenerate` still runs the solver, as a deliberate escape hatch.

Shape, windows, cues, slots and the template catalog are in [scene-spec.md](scene-spec.md). This file is about what
to put there.

## When

After gate 2 (script approved) and before stage storyboard. `STORYBOARD.md` exists from the script stage, so
`node tools/compiler/lint.mjs --estimated` can check the file before any audio: it reads durations from the outline.
After the voice stage, the storyboard stage lints it again with real timings; fix windows there if a cue moved.

## Three steps per frame

1. **Read the sentences aloud.** What does the viewer need to *see* while hearing them — a number, a change, a
   choice, a place, a sequence, one idea landing?
2. **Pick a visual idea and write it down** in the frame's `"idea"` (10–400 characters, required under authoring
   claude). One object, one scene or one comparison: "a building with one floor per service", "the price tag flips
   from free to 30 USD", "two roads split at a sign: chat or API". The idea is for the reviewer too: at gate 3 it
   explains why the frame looks the way it does.
3. **Choose the template by meaning, not habit.** A trend over time is `line-graph`, a ranking that changes is
   `rank-race`, "if … then use …" is `decision-tree`, a command is `terminal-window` or `code-typing`, a key sentence
   is `callout-sentence`. When two templates fit, take the one used least so far.

```json
{ "frame": 7, "idea": "the Grok family as floors of one building; the lift stops at the floor being named",
  "shots": [ { "template": "layers", "variant": "stack", "window": ["start", "end"], "slots": { … } } ] }
```

## Variety rules (lint errors under authoring claude)

- **Uses per template:** at most `scenes.maxUsesPerTemplate` (2 for a video up to 5 minutes, else 3), title excluded.
- **Gap:** a template does not come back within `scenes.pairGap` shots (6).
- **Chapter openers:** with `scenes.uniqueChapterOpeners`, no two chapters open with the same template/variant. Open
  chapters with different `title` variants or with accent openers (below).
- **One accent per chapter:** a template whose schema has `"accent": true` appears at most once in a chapter.
- **Custom frames:** at most 15 % (`scenes.customBudget`), kept for the single biggest moment of the lesson.

Not enforced, but reviewed at gate 3:

- **Dense, then sparse.** After a frame full of text or data, give one frame a single image or a single sentence.
- **Change the axis.** Alternate what moves: numbers, then space (map, flow), then words, then an interface.
- **Match the chapter's arc.** A chapter that argues needs comparisons (`split`, `balance`, `bar-line-chart`); one
  that teaches a tool needs interfaces (`editor-window`, `terminal-window`, `ui-reveal`).
- **Labels are the script's keywords.** Slot text comes from the `*keywords*` and `|` labels, not new wording.

## The accent layer

Accent templates (`opener-*`, `accent-*`; 3D and showcase blocks ported from the HyperFrames registry) are loud.
Use them only to open the video or a chapter, for the climax of a chapter, or to close the lesson, and at most once
per chapter. They may last up to 12 s, so give them a frame long enough, and never two accents in a row.

## Self-review before handing over

1. `node tools/compiler/lint.mjs --estimated` (before audio) or `node tools/compiler/lint.mjs` → `0 error(s)`.
   Read the warnings too: a V1 pair repeat or a chapter with no signature shot is worth fixing.
2. `node <skill>/dev/variety-report.mjs .` → check the template share and distinct-pair ratio.
3. Read every `idea` in order, as a list. If two in a row say the same thing in different words, change one.
4. After compile, look at the end-of-frame snapshot of every frame (gate 3 checklist): no empty card, no clipped
   Vietnamese text, nothing under the karaoke band.
