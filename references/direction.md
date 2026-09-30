# Direction — the director writes scenes.json

Under `"scenes": { "authoring": "director" }` (the default for new projects; `"claude"` is the older name and still
works) the solver does not pick the visuals. The director, the agent making the video, writes every frame of
`scenes.json` by hand. The storyboard stage stops with `scenes.json missing: authoring is "director"` until the file
exists; `run storyboard --regenerate` still runs the solver, as a deliberate escape hatch.

Shape, windows, cues, slots and the template catalog are in [scene-spec.md](scene-spec.md). This file is about what
to put there.

## When

After the script stage and before gate 2, which lints it. `STORYBOARD.md` exists from the script stage, so
`node tools/compiler/lint.mjs --estimated` can check the file before any audio: it reads durations from the outline.
After the voice stage, the storyboard stage lints it again with real timings; fix windows there if a cue moved.

## Three steps per frame

1. **Read the sentences aloud.** What does the viewer need to *see* while hearing them — a number, a change, a
   choice, a place, a sequence, one idea landing?
2. **Pick a visual idea and write it down** in the frame's `"idea"` (10–400 characters, required in a directed
   lesson). One object, one scene or one comparison: "a building with one floor per service", "the price tag flips
   from free to 30 USD", "two roads split at a sign: chat or API". The idea is for the reviewer too: at gate 3 it
   explains why the frame looks the way it does.
3. **Choose the template by meaning, not habit.** A trend over time is `line-graph`, a ranking that changes is
   `rank-race`, "if … then use …" is `decision-tree`, a command is `terminal-window` or `code-typing`, a key sentence
   is `callout-sentence`. A conversation with an assistant is `chat-exchange` (in `turns`, a turn whose `who` equals
   `name` is the assistant's; with no match the turns alternate), an answer that cites its sources is `ai-answer`, a
   chat between two people is `message-thread` (`who` equal to `contact` is the received side), events arriving one
   after another are `notify-stack`, one alert that matters is `notify-single`, a few live figures side by side are
   `glass-widgets`, and ordered steps read top to bottom are `flow-vertical`. `opener-shard` (a chapter title) and
   `code-hero` (the one command of a chapter) are accents. When two templates fit, take the one used least so far.

```json
{ "frame": 7, "idea": "the Grok family as floors of one building; the lift stops at the floor being named",
  "shots": [ { "template": "layers", "variant": "stack", "window": ["start", "end"], "slots": { … } } ] }
```

## Pinning and variety (lint errors in a directed lesson)

- **Every copy reveal is pinned to the voice:** `"reveals": { "<slot>": "word:<its word>-0.1" }` (or `kw:`, or a
  range `word:a..word:b`). Slot text says what the voice says in that frame; code the voice only talks about is a
  warning, not an error.
- **Change the layout axis:** a frame does not open with a family that a shot of one of the two frames before it used
  (title and accent shots excluded).

- **Uses per template:** at most `scenes.maxUsesPerTemplate` (2 for a video up to 5 minutes, else 3), title excluded.
- **Gap:** a template does not come back within `scenes.pairGap` shots (6).
- **Chapter openers:** with `scenes.uniqueChapterOpeners`, no two chapters open with the same template/variant. Open
  chapters with different `title` variants or with accent openers (below).
- **One accent per chapter:** a template whose schema has `"accent": true` appears at most once in a chapter.
- **Custom frames:** at most 15 % (`scenes.customBudget`), kept for the single biggest moment of the lesson.

Not enforced by lint, but part of your own review before gate 3:

- **Dense, then sparse.** After a frame full of text or data, give one frame a single image or a single sentence.
- **Change the axis.** Alternate what moves: numbers, then space (map, flow), then words, then an interface.
- **Match the chapter's arc.** A chapter that argues needs comparisons (`split`, `balance`, `bar-line-chart`); one
  that teaches a tool needs interfaces (`editor-window`, `terminal-window`, `ui-reveal`).
- **Labels are the script's keywords.** Slot text comes from the `*keywords*` and `|` labels, not new wording.

## The accent layer

Accent templates (`opener-*`, `accent-*`; 3D and showcase blocks ported from the HyperFrames registry) are loud.
Use them only to open the video or a chapter, for the climax of a chapter, or to close the lesson, and at most once
per chapter. They may last up to 12 s, so give them a frame long enough, and never two accents in a row.

## Transitions

A frame may name the transition into it: `"transition": "<name> [direction] [seconds]"`, e.g. `"whip-pan RIGHT"` or
`"flash-white 0.7s"`. Without it, the first frame cuts in, a chapter's first frame gets `blur-crossfade` and every
other frame `crossfade`; compile writes the result as `transition_in` in `STORYBOARD.md`.

- **Calm, the default:** `crossfade`, `blur-crossfade`. Most boundaries stay here; the voice carries the lesson.
- **Medium, for a change of subject inside a chapter:** `push-slide` (LEFT, RIGHT, UP, DOWN), `elastic-push` (LEFT,
  RIGHT), `blur-slide`, `squeeze`, `zoom-out` (back to the big picture).
- **Strong, for a chapter's opening or its climax:** `whip-pan` (LEFT, RIGHT), `flash-white`, `zoom-through`.

Lint: the name must be one of these (or `cut`), the first frame takes none, and three boundaries in a row with the
same type other than `crossfade` are an error. A strong transition marks a turn; repeated, it marks nothing.

## Overlays

A frame may carry up to 3 timed notes on the overlay layer, above its template:
`"overlays": [ { "kind": "lower-third", "text": "Grok là một tòa nhà", "sub": "Hình dung", "at": "word:tòa-0.1",
"until": "word:móng" } ]`. `until` defaults to the frame's end; a note shows for at least 1 s.

- `lower-third`: who or what is on screen (a name, a product), left, just above the karaoke band. `skin`: `kicker`
  (the default, `sub` above as a small caps line) or `bar` (a gold bar, `sub` under the text).
- `callout`: one phrase to remember, in a corner: `place` `tr` (the default), `tl` or `mr`.
- `note`: a side remark, a number to keep, on a paper card at the right.
- `ticker`: a news line in a strip above the karaoke band; `sub` is its tag (Mới, Tin). At most one per chapter.

Lint: `text` is words the voice says in that frame, shown near where it says them (1.2 s); `sub` may say more. Two
notes in one place at once (a lower-third and a ticker share the strip above the band; a note and an `mr` callout
share the right) are an error. Use them sparingly: a note covers part of the template, so check the snapshot.

## Self-review before handing over

1. `node tools/compiler/lint.mjs --estimated` (before audio) or `node tools/compiler/lint.mjs` → `0 error(s)`.
   Read the warnings too: a V1 pair repeat or a chapter with no signature shot is worth fixing.
2. Read every `idea` in order, as a list. If two in a row say the same thing in different words, change one.
3. After compile, `node tools/visible-check.mjs` → `visible-check ok`: every slot is on screen, readable and above
   the karaoke band at the end of its shot. Gate 3 runs it too.
