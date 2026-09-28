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
- layout: custom-word-orbit, ring, custom-lens-zoom   (optional; one token per shot, same order as shots)
- role: core                              (optional; from ### markers in script.src.txt)
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
| `screen` | a real UI screenshot from `assets/screens/` (gate 2b), or a `MINH HỌA` mockup; pan, zoom and callout on the cue | `tools/worker-screen-addendum.md` |
| `objective` | [MỤC TIÊU CHƯƠNG]: goals, where the learner needs them (optional, not every chapter) | `card-objective` (tools/worker-layouts.md) |
| `principle` | NGUYÊN LÝ CỐT LÕI: one core principle | `card-principle` (tools/worker-layouts.md) |
| `antipattern` | ❌ the wrong way before ✅ the right way | `card-antipattern` (tools/worker-layouts.md) |
| `case` | a real situation | `card-case` (tools/worker-layouts.md) |
| `exercise` | BÀI TẬP quick-win: "pause the video, 5 minutes", an 8–10 s card that keeps moving; optional, at most once per video (`structure.maxExercise`) | `card-exercise` (tools/worker-layouts.md) |
| `quiz` | a situational question (optional) | `card-quiz` (tools/worker-layouts.md) |

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
8. A `screen` frame alternates `screen` with another type (for example `screen@0-7, kinetic@7-11`). Its `focal` names
   the file (`assets/screens/<file> – region`) or starts with `MINH HỌA`.
9. For an "advanced / standout points" chapter, use the **analyze pattern**. Its first frame builds a three-slot rail
   (① Tính năng · ② Vì sao nổi bật · ③ Bạn được gì) that stays small at the top of the following frames,
   and each slot lights as a separate cued reveal.
   - Give every frame that shows the rail a `- rail: ①@t · ②@t · ③@t` bullet.
   - Pin the rail's resting geometry in one frame and copy it everywhere else. Add its CSS signatures as regexes to
     `guard.railPatterns` in `video.config.json`; `frame-guard` then rejects a rail frame that drifts (the Claude video
     used left 480px / top 4px / 1068px wide, pills 340px with radius 22px).
   - The slot numbers are plain digits or SVG badges. The fonts have no ① ② ③.

## Layout library (pieces, not a template)

The `- layout:` bullet records the framing of every shot. The 12 pieces in `layouts.catalog` are **inspiration, not a
template**: `custom-<name>` (lowercase kebab-case, e.g. `custom-orbit-left`) is always valid, and the Scene line of that shot describes the layout. Combine pieces, shift
the axis, stack layers, tilt the frame, lay content along a motion path. The goal is that a learner never sees two
consecutive shots that look like the same slide. When a custom layout works well, propose it for the library in the
next skill version.

- The pieces and their suggested boxes are in `tools/worker-layouts.md`: `hero-center`, `split-50`, `split-60-40`,
  `split-40-60`, `triptych`, `strip-top`, `ring`, `sidebar-left`, `screen-focus`, `screen-steps`, `lower-third`,
  `full-bleed-quote`.
- The six cards (`card-objective`, `card-principle`, `card-antipattern`, `card-case`, `card-exercise`, `card-quiz`)
  are optional scenes, not a required chapter skeleton. They lock only their **identity**: label, icon, accent colour and label position. Everything inside the card is free and
  should change from chapter to chapter. Once the first card of a type is approved, pin its identity with regexes in
  `guard.layoutPatterns` (`{ "card-exercise": ["…"] }`, an array per key), the same way as `railPatterns`.

| rule | kind | meaning |
|---|---|---|
| L1 | error | the number of `layout` tokens equals the number of shots |
| L2 | error | a token is a library piece, a `card-*` layout, or `custom-<name>` |
| L5 | error | a DNA card shot uses its `layouts.fixed` token (its identity is checked by `frame-guard`) |
| L3 | warning | a layout repeats the previous shot |
| L4 | warning | a chapter has fewer than `layouts.minDistinctPerChapter` layouts |
| L6 | warning | one layout takes more than `layouts.maxShare` of the shots; a chapter has no `custom-*` layout |
| D1–D5 | warning (error under `dna.strict`) | DNA order and cards; only when the project turns `dna.enabled` on (off by default since 0.8.0) |
| S1 | error | more `exercise` shots in the video than `structure.maxExercise` (1) |
| S2 | warning | two content chapters run the same sequence of shot types; see script-authoring.md § Chapter arcs |

Warnings never block the pipeline, but read them: they are the anti-boredom check.

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
- Record the framing of every shot in `- layout:`. Rotate, remix and invent: the library is a starting point, and the lint only warns.

## Design system

- The palette lives in `video.config.json` → `design`: canvas, surface, ink, accent, accent2, warn, muted, hueBase and hueStep.
  `build-design-kit.mjs` writes it into `tokens.json`, the frame skeleton, and the karaoke and overlay colours.
- Fonts: Be Vietnam Pro (500/600/800) for text, with full Vietnamese diacritics, and JetBrains Mono (400) for terminal text and kickers.
  Both are bundled locally (OFL) in `assets/fonts/`, so no network fonts are needed. With `--theme abm-brand` the body font is
  Montserrat (`design.bodyFont`), and the karaoke uses it too (`karaoke.font`).
- GSAP loads from the jsDelivr URL in the config, so rendering needs a network connection. To work offline, vendor GSAP into `assets/` and
  point `gsap` at the local path.
