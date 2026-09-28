# Custom frames: hand-building one frame

Read this only for a frame that `scenes.json` marks `{ "frame": N, "custom": true }`. Every other frame is compiled
from templates. Custom frames are for what no template expresses well — a chapter's opening hook, one special metaphor —
and are capped at `video.config.json` `scenes.customBudget` (15 % of frames; lint fails above it).

## Where it goes

- The file is the frame's `src` in `STORYBOARD.md` (for example `compositions/frames/09-mot-vi-du-doi-thuong.html`).
  `abm-video next` names it when it is missing.
- The compiler never touches it; `abm-video run compile` skips custom frames.

## The project's worker kit (read these, in this order)

`node tools/build-design-kit.mjs` (the probe stage runs it) fills these for this project's theme and HyperFrames pin:

1. `tools/frame-skeleton.html` — copy it verbatim to the frame's `src`, then replace `FRAME_ID` (the file name without
   `.html`), `PFX` (`f` + the two-digit frame number), `DURATION` (the frame's `duration`) and `HUE`.
2. `tools/worker-delta-<pin>.md` — the HyperFrames rules that break lint when ignored (timeline registration, no two
   tweens overlapping on one property, initial states with `gsap.set` never `tl.set(…, 0)`, transform-only motion,
   `immediateRender: false`, no `Math.random` / `Date.now` / `repeat: -1`, glyphs the fonts lack).
3. `tools/worker-brief.md` — timing on the voice (`- cues:` in the storyboard, word times in `audio_meta.json`), facts,
   the self-check list.
4. `tools/worker-layouts.md` — layout pieces and zone boxes, and the DNA card identity if the frame is a DNA card.
5. `tools/worker-screen-addendum.md` — only when the frame shows a real screenshot.

## Rules that matter most

- Every id and class starts with `PFX-`; `data-composition-id` and the `__timelines` key equal `FRAME_ID`.
- Everything stays inside the stage (x 80–1840, y 60–880) at every moment; the karaoke band below stays empty.
- Each keyword's visual lands on its cue (±0.1 s). Nothing appears before it is said. The frame never stands still for
  more than about 2 s.
- Colours come from the skeleton's CSS variables (`--canvas --surface --ink --gold --cyan --warn --muted`).
- On-screen text is short copy (1–5 words, a number, a label), never a narration sentence; Vietnamese keeps its
  diacritics.

## Check it

```
node tools/wave-check.mjs N           lint + frame-guard + a snapshot at the frame's midpoint
node tools/wave-check.mjs N@6.5       a snapshot at a frame-local time (check each cue you care about)
```

Pass: `0 errors` and `frame-guard ok`. Look at the snapshots before moving on. A later `abm-video run assemble` runs
`hyperframes check` on the whole lesson; a real overlap in a custom frame is fixed in the frame, and an intentional
layering is marked with `data-layout-allow-overlap` after you have checked its snapshot.
