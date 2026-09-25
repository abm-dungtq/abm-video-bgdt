# Visual storyboard and design system

## Storyboard frame block

`script-to-md.mjs` writes the outline bullets. Stage 4 adds the visual fields, and stage 5 (`retime-and-cue.mjs`) adds `cues` and `retimed_from`.
**Every field is a `- key: value` bullet**, because the skill parsers only match bullets.

```markdown
## Frame 8 — Vòng lặp của một agent

- status: outline | animated
- src: compositions/frames/08-vong-lap-cua-mot-agent.html
- est_duration: 17.18s
- duration: 16.415s                      (set from the real voice by sync-durations)
- transition_in: crossfade               (cut on frame 1, blur-crossfade on each chapter's first frame)
- scene: flow
- chapter: ch1
- voiceover: "…display text…"
- blueprint: agent-progress-theater (Adapt)   (a blueprint id with Reproduce|Adapt, or `compose`)
- focal: the three-node loop suy nghĩ → hành động → quan sát with the spark running around it
- roles: loop ring = foreground subject · spark = supporting · field = background (dim ~40%)
- shots: kinetic@0-2.22, flow@2.22-11.85, zoom@11.85-16.42
- sfx: none
- cues: vòng@2.06, lặp@2.22, suy@4.21, …   (written by retime-and-cue.mjs; do not hand-edit)
- retimed_from: 16.415s                  (written by retime-and-cue.mjs)

<Chapter> · <level>. <visual note from script.src.txt>

Adapt: what is kept from the blueprint and what changes.
Scene 1 (0–2.22 s): [kinetic] … what appears, where, and on which spoken word (~2.06 s).
Scene 2 (2.22–7.93 s): [flow] …
```

`shots` is machine-readable. It uses frame-relative seconds and tiles `[0, duration]` with no gap. The `Scene k (a–b s)`
lines and inline `~N s` hints are rescaled and snapped to cues automatically after the voice exists.

## Scene-type catalog (the variety system)

| type | use for | blueprint to start from |
|------|---------|-------------------------|
| `kinetic` | hook lines, key definitions | `kinetic-type-beats` |
| `typewriter` | a key sentence landing word by word | `typewriter-reveal` |
| `terminal` | real CLI output replayed from `capture/terminal/` | `prompt-type-submit-generate`, `transcript-scroll-artifact-reveal` |
| `flow` | loops, pipelines, processes | `agent-progress-theater` |
| `split` | A vs B, before vs after | `comparison-split` |
| `hub` | platforms, providers, integrations around a center | `constellation-hub` |
| `cards` | lists of tools or features | `grid-card-assemble` |
| `stat` | numbers | `dataviz-countup` |
| `journey` | moving through stations or chapters | `spatial-pan-stations`, `camera-journey` |
| `zoom` | revealing context | `zoom-out-workspace-reveal` |
| `anchor` | recap or checklist (fixed anchor, cycling items) | `fixed-anchor-cycle` |
| `title` | chapter cards; the trail writes the number | `titlecard-reveal` (Adapt) |
| `metaphor` | analogies | `compose` |

The blueprints are described in `~/.agents/skills/faceless-explainer/references/visual-design.md` and `cut-catalog.md`.

### Rules (enforced by `variety-lint.mjs`)

1. No two consecutive shots share a type, including across frame boundaries.
2. No shot lasts longer than `scenes.maxShotS` (10 s). A frame longer than that needs at least 2 shots.
3. Each chapter uses at least 5 distinct types, or at least 3 when the chapter has 4 frames or fewer.
4. `terminal` appears only in `scenes.terminalChapters`.
5. `title` appears only as the first shot of a chapter's first frame, and every chapter opens with one.

These are not linted but are still required:

6. Every `*keyword*` token gets an on-screen key-text reveal at its cue time.
7. Every chapter has at least one held beat, a still read of 2 s or more, placed after its densest reveal.
8. For an "advanced / standout points" chapter, use the **analyze pattern**. Its first frame builds a three-slot rail
   (① Tính năng · ② Vì sao nổi bật · ③ Bạn được gì) that stays small at the top of the following frames,
   and each slot lights as a separate cued reveal.

## Video direction block

Add `## Video direction` after the last frame. The block records:
- the preset, and the reason it was chosen;
- the concept. On the first video this was "Sứ giả" (the messenger): the courier carries the task out and brings the result back;
- the recurring motif: a thin glowing accent trail with a winged spark;
- palette roles;
- the chapter hue shift: the background radial tilts by `hueStep` degrees per chapter, while surfaces and accents stay fixed;
- the motion grammar;
- where the held beats fall;
- the layout safe area;
- the terminal truth rule: terminal shots show only real captured text;
- the negative list: no logos, no purple-blue "AI" gradients, no bokeh, no fake cursors or browser chrome, and warn colour only where the content is a warning.

## Layout contract

- The stage safe area is x 80–1840 and y 60–880. The top 10 px belong to the progress bar. The chapter label sits at x 40–520, y 14–50.
- The karaoke band starts at y ≥ 918 (162 px). Nothing from the frames may enter it.
- On-screen text is motion-graphics copy of 1–5 words (the keyword, a number, a label). It is never a narration sentence;
  the karaoke band already carries every spoken word.
- Use at least 28 px for readable text. Keep one hero per shot, filling 40–60 % of the frame.
- Rotate the framing (centered, 50/50 split, 60/40, triptych, strip, ring) and never use the same one twice in a row.

## Design system

- The palette lives in `video.config.json` → `design`: canvas, surface, ink, accent, accent2, warn, muted, hueBase and hueStep.
  `build-design-kit.mjs` writes it into `tokens.json`, the frame skeleton, and the karaoke and overlay colours.
- Fonts: Be Vietnam Pro (500/600/800) for text, with full Vietnamese diacritics, and JetBrains Mono (400) for terminal text and kickers.
  Both are bundled locally (OFL) in `assets/fonts/`, so no network fonts are needed.
- GSAP loads from the jsDelivr URL in the config, so rendering needs a network connection. To work offline, vendor GSAP into `assets/` and
  point `gsap` at the local path.
