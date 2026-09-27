# Example library

Two finished lessons made with this skill, kept as reference material for agents and people who build the next one.
Use them to see how a script, a storyboard block and a frame's HTML fit together, not as templates to copy verbatim:
the skill wants every lesson to look different.

| Lesson | Length | Frames | Look | What to study |
|---|---|---|---|---|
| [hermes-agent-explainer](hermes-agent-explainer/) | 10:12 | 63 | "Sứ giả": dark indigo, gold trail | terminal replays, the analyze rail (① Tính năng · ② Vì sao nổi bật · ③ Bạn được gì), flow and hub diagrams |
| [claude-intro-explainer](claude-intro-explainer/) | 14:35 | 79 | "Tia lửa": warm charcoal, terracotta spark | `screen` scenes built around real UI (screenshots replaced by a placeholder here), the pinned rail geometry, a custom font (Lora, not shipped: get the OFL variable font from Google Fonts) |

Both videos were made with skill 0.3.x/0.4.0, before the layout library and DNA cards existed, so their storyboards have no
`- layout:` or `- role:` bullets. Their framing is described in each frame's Scene lines instead.

## What is in each folder

| Path | Stage | Notes |
|---|---|---|
| `video.config.json` | 0 | palette, fonts, timing, budget, guard rules |
| `script.src.txt` | 2 | the authoring source: chapters, frames, sentences, keywords, fact ids |
| `capture/extracted/visible-text.txt` | 2 | the fact sheet every claim cites |
| `capture/terminal/*.txt` | 2 | real, read-only CLI output replayed by `terminal` shots |
| `SCRIPT-REVIEW.md` | 2 | what the user approved at gate 2 |
| `frame.md` | 4 | the design truth given to workers |
| `STORYBOARD.md` | 4–5 | every frame block with shots, cues, Scene lines, plus the `## Video direction` block |
| `compositions/frames/*.html` | 5 | the frames as built by the workers (seek-safe GSAP, HyperFrames 0.7.99) |
| `previews/NN.jpg` | 6 | one still per frame, taken at 75 % of the frame from the final video |
| `renders/qa-report.md`, `renders/chapters.txt` | 6 | QA evidence and chapter timestamps |

Not included: audio, voice clips, fonts (the skill ships them in `templates/fonts`), the rendered videos, and the nine
account screenshots of the Claude lesson. Frames that showed a screenshot now point to
`assets/screens/private-screenshot-placeholder.svg` and have no preview.

## How to use it

1. Open [CATALOG.md](CATALOG.md) and find the shot type you are about to build (for example `hub`, `split`, `stat`).
2. Read that frame's block in `STORYBOARD.md` (cues, Scene lines), then its HTML, then look at its preview.
3. Build your own frame from `tools/frame-skeleton.html`. Borrow the technique (seek-safe timing, cue-locked reveals,
   layer switching), not the picture.

To regenerate this folder from the delivered projects: `node dev/build-examples.mjs <project-dir>…`.
