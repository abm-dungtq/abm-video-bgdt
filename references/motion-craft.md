# Motion craft for custom frames

Read this when you build a custom frame ([custom-frame.md](custom-frame.md)) or choose an accent
([direction.md](direction.md) § The accent layer). It distils the motion rules that recur in the awesome-opus5-5-videos
gallery (videos people made by asking Claude Opus 5.5 to write the animation as code) and says how each one is done in
a deterministic HyperFrames frame. Template frames already follow them; nothing here changes a template.

**This is a lesson, not a launch.** The gallery is mostly showreels and product teasers. Take the craft, never the hype:
no "go all out", no beat-cut montage, no loop. A lesson frame shows one idea, timed to the voice, readable at a glance.

## Finding an idea

```
node tools/gallery-refs.mjs search <words> [--tech svg,gsap] [--limit 10]
node tools/gallery-refs.mjs adopt <slug>          → .hyperframes/gallery-ref/<slug>.md
```

`search` keeps explainer and motion entries with a full prompt and no 3D/shader tech. Search in English words that the
prompts use (`explain`, `step`, `chart`, `graph`, `flow`, `cursor`, `typography`). An adopted ref is a read-only idea:
borrow its staging, never its copy, palette, timing or length. When the gallery is unavailable, build from this file
alone.

## Rules, and how to do them here

| Rule | In a HyperFrames lesson frame |
|---|---|
| **One object, never cut.** Each state is the same element changing size, radius and colour while its content swaps ([1], [2]). | Keep one wrapper (`PFX-obj`) on the timeline for the whole frame; tween `scale`, `x`, `y`, `borderRadius`, `backgroundColor`, and swap the inner text with a short opacity cross (0.15–0.25 s). No second wrapper popping in. |
| **Something changes on every beat** ([2], [3]). | The beat is the voice: one change on each `- cues:` time of the frame (±0.1 s, from `audio_meta.json`), never a BPM grid. Nothing stands still for more than about 2 s. |
| **Tight easing, a tiny overshoot at most; no bouncy easing** ([1]). | `power2.out` / `power3.inOut` for moves, `back.out(1.2)` at most for an arrival. No `elastic`, no `bounce`. |
| **The camera reframes so the subject fills the frame and stays readable** ([1], [2]). | A "camera" is a `scale` + `x`/`y` tween on a stage wrapper. Every piece of copy stays inside the stage box (x 80–1840, y 60–880) at every moment; the karaoke band stays empty. |
| **Slow camera: pushes and pans of 1.5–3 s on gentle in-out curves, about half the default speed** ([4]). | Camera tweens 1.5–3 s, `sine.inOut` or `power1.inOut`; copy reveals stay short (0.3–0.6 s). |
| **Every transition demonstrates something** ([5]). | A move carries the idea the voice says at that moment (a value grows, a path joins, a state flips). Decorative motion with no meaning is cut. |
| **Typography carries the weight, not camera shake** ([6]); a type system with roles, never one font for everything ([7]). | Use the theme's fonts by role (display for the key word, body for labels, mono for code and numbers). Emphasis comes from size, weight and the gold accent, never from shake or flashing. |
| **Banned: particle bursts, glows, gradients on UI chrome, dead time, anything that looks like a template** ([1]). | No particles or glows. A decorative line or dot must not cross copy: `visible-check` fails it, and an intended overlap is marked `data-layout-allow-overlap` only after checking the snapshot. |
| **The frame is a function of time: no timers, no state carried between frames** ([3], [8]). | Everything is a tween on the frame's registered GSAP timeline, seeked by the renderer. No `setTimeout`, `requestAnimationFrame` loops, `Math.random`, `Date.now` or `repeat: -1` (see the project's `tools/worker-delta-<pin>.md`). |
| **Real data, no placeholders** ([3]). | Every label, number and name comes from the script and its facts; a value the voice does not say is not on screen. |
| **Keep important content in a safe central area** ([5]). | The stage box above is the safe area; leave room for the lower-third strip when the frame has an overlay. |

Not for lessons: looping (last frame = first frame), cutting every scene on a music beat, sound effects on every move,
AI-generated imagery or 3D scenes inside a custom frame.

## Sources

Prompts in [awesome-opus5-5-videos](https://github.com/yihui-dev/awesome-opus5-5-videos) (MIT; each prompt by its
credited author), at the pinned commit `3d54892`:

[1]: https://github.com/yihui-dev/awesome-opus5-5-videos/blob/3d54892e2ae5b0e8d337171e6508bba4cec01ab8/prompts/twoclipping-402193.md
[2]: https://github.com/yihui-dev/awesome-opus5-5-videos/blob/3d54892e2ae5b0e8d337171e6508bba4cec01ab8/prompts/thegrootdev-966114.md
[3]: https://github.com/yihui-dev/awesome-opus5-5-videos/blob/3d54892e2ae5b0e8d337171e6508bba4cec01ab8/prompts/verbove-268381.md
[4]: https://github.com/yihui-dev/awesome-opus5-5-videos/blob/3d54892e2ae5b0e8d337171e6508bba4cec01ab8/prompts/jake11moran-414633.md
[5]: https://github.com/yihui-dev/awesome-opus5-5-videos/blob/3d54892e2ae5b0e8d337171e6508bba4cec01ab8/prompts/howdevelop-733090.md
[6]: https://github.com/yihui-dev/awesome-opus5-5-videos/blob/3d54892e2ae5b0e8d337171e6508bba4cec01ab8/prompts/gdgtify-929495.md
[7]: https://github.com/yihui-dev/awesome-opus5-5-videos/blob/3d54892e2ae5b0e8d337171e6508bba4cec01ab8/prompts/techhalla-498547.md
[8]: https://github.com/yihui-dev/awesome-opus5-5-videos/blob/3d54892e2ae5b0e8d337171e6508bba4cec01ab8/prompts/astrothewizard-618782.md
