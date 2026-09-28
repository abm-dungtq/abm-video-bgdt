# scenes.json — the only file you edit to change the visuals

The storyboard stage writes `scenes.json` for you (`compiler/solver.mjs`); `abm-video run compile` turns it into every
frame's HTML. You never write HTML or GSAP for a compiled frame. Edit the JSON when a shot reads wrong, then compile
again. Everything below is checked by `node tools/compiler/lint.mjs` (it runs inside the storyboard and compile stages).

## Shape

```json
{ "version": 1, "seed": 20260928, "frames": [
  { "frame": 8, "shots": [
    { "template": "flow", "variant": "loop", "window": ["start", "sent:3.start-0.3"],
      "slots": { "steps": [ { "icon": "lightbulb", "label": "Suy nghĩ" }, { "icon": "gear", "label": "Hành động" } ] },
      "reveals": { "steps.0": "kw:suy", "steps.1": "kw:hành" } },
    { "template": "kinetic", "variant": "stack-words", "window": ["prev.end", "end"],
      "slots": { "words": ["Tự sửa sai"] } } ] },
  { "frame": 9, "custom": true },
  { "frame": 12, "rail": { "slots": ["Tính năng", "Vì sao nổi bật", "Bạn được gì"], "at": ["kw:tính", "kw:nổi", "kw:được"] },
    "shots": [ … ] } ] }
```

- One entry per storyboard frame. Shots tile the frame: the first window starts at `start`, each next one at
  `prev.end`, the last ends at `end`. A shot lasts within its template's length range (catalog below) and ≤ 10 s,
  except a frame made of one shot of its own `scene_hint` template, which may last up to 16 s: a comparison, a case,
  an exercise or a quiz needs all of its sentences, and cutting it in two leaves that shot with half of them.
  The solver makes such a frame one shot when the template can be built from the whole frame, else cuts it as usual.
- `slots` must match the template's slots exactly (lint names the field that is wrong). Text is on-screen copy: short
  labels in Vietnamese with full diacritics, never whole narration sentences (the karaoke band shows those).
- `reveals` is optional: a key you leave out lands on the next keyword phrase of the window (`kw` keys) or is spread
  evenly (`spread` keys). A cue you give must fall inside the shot.
- Icons: `person people doc docs folder card-stack terminal cloud server key lock shield target timer question check
  cross arrow spark chat mail calendar chart gear plug book lightbulb rocket globe image briefcase`.
- `rail` (optional) lights 2–4 pills across the top of the frame on their cues; keep that frame's content below y 140.

## Cues (frame-relative seconds from the aligned voice)

| cue | meaning |
|---|---|
| `start`, `end` | 0 and the frame duration |
| `kw:<word>` / `kw:<word>#2` | start of the (2nd) keyword token `*word*` of the frame (lower case, no punctuation) |
| `word:<word>#n` | the same for any spoken word |
| `sent:<k>.start` / `sent:<k>.end` | first / last word of sentence k of the frame |
| `prev.end` | end of the previous shot |
| `<cue>+0.4`, `<cue>-0.3` | an offset |
| `<cue>..<cue>` | a range, only for keys marked (range) — typewriter `text` |

## What to change, and how

- **Another look for the same content:** change `variant` (catalog below; the preview images show each one).
- **Another template:** change `template` and rewrite `slots` for it; keep `window`. Two shots in a row may not share a
  family, and one template + variant should not come back within six shots (lint warns). Across the video no
  family may take more than 25 % of the shots, and it must use at least min(10, shots ÷ 3) templates (lint errors);
  a frame's first shot follows its `scene_hint` (lint warns).
- **Wrong words on screen:** edit the slot text; keep it within the `≤n` limits (lint errors otherwise).
- **A reveal lands too early or late:** set its key in `reveals` to the keyword that says it.
- **Different shot cut:** move the `window` boundary (`sent:k.start-0.3` is the usual cut just before a sentence).
- **A frame no template can express** (an opening hook, a special metaphor): `{ "frame": N, "custom": true }` and build
  its HTML at its storyboard `src` with [custom-frame.md](custom-frame.md). Custom frames are capped at
  `video.config.json` `scenes.customBudget` (15 % of frames); above that lint fails.
- **Start over:** `abm-video run storyboard --regenerate` (the old file is kept as `scenes.json.bak-<time>`), or a
  different `--seed` in the solver for another variant mix.

## Review checklist (read the solver's scenes.json once, frame by frame)

1. Each label reads well alone on screen (a noun phrase, not a pronoun, a count or half a sentence); rewrite weak ones.
2. Icons match their labels (see the icon list); a stat's number is a real figure worth a big counter.
3. The template tells the frame's idea: a list → cards/anchor, steps → flow/journey, one idea → kinetic/zoom, a
   comparison → split, a number → stat. Swap it when it does not.
4. At most one custom frame per chapter, for its opening hook or one special metaphor.

## Check your edits

```
node tools/compiler/lint.mjs              0 error(s) is required; warnings are advice
abm-video run compile                     writes the frames, lints and snapshots the changed ones
node tools/compiler/compile.mjs --frames 8,12 && node tools/wave-check.mjs 8@5.2 12   one frame at a time
```

## Template catalog

<!-- catalog:start -->
Generated by `node dev/gen-catalog.mjs` from the schemas; **bold** = signature variant; preview: `templates/scenes/<id>/<variant>.jpg` (20 % | 85 %).

| template | family | variants | slots (`?` optional, `≤n` characters, `[a..b]` items) | reveal keys | length |
|---|---|---|---|---|---|
| `anchor` | anchor | checklist, **cycle**, badge-row | title≤30, items[2..5]≤34 | title, items.* | 3–10 s |
| `card-antipattern` | antipattern | side-by-side, **flip** | wrong{label≤20, items[1..3]≤40}, right{label≤20, items[1..3]≤40} | label, wrong, right >wrong | 4–10 s |
| `card-case` | case | story, **chat** | situation≤90, detail≤60, question?≤60 | label, situation, detail >situation, question >detail | 4–10 s |
| `card-exercise` | exercise | **timer-ring**, steps | task≤80, minutes?:int 1–60, steps?[0..3]≤40 | label, task, steps.* | 8–10 s |
| `card-objective` | objective | **list**, spotlight | items[1..3]≤48 | label, items.* | 4–10 s |
| `card-principle` | principle | quote, **keyword** | text≤90, keyword?≤18 | label, text, keyword >text | 3–10 s |
| `card-quiz` | quiz | **abc**, true-false | question≤90, options[2..4]≤40, answer:int 0–3 | label, question, options.*, answer >options.1 | 8–10 s |
| `cards` | cards | grid-3, grid-4, **stack-fan** | heading?≤40, items[2..6]{icon, label≤22, note?≤40} | heading, items.* | 2.5–10 s |
| `flow` | flow | linear, **loop**, branch | steps[2..5]{icon, label≤18}, loop?:boolean | steps.*, spark | 3–10 s |
| `hub` | hub | **constellation**, orbit, spokes | center{icon, label≤16}, nodes[3..8]{icon?, label≤14} | center, nodes.* | 3–10 s |
| `journey` | journey | stations, timeline, **path** | stops[3..6]{label≤18, note?≤28}, current?:int 0–5 | stops.* | 3–10 s |
| `kinetic` | kinetic | center-punch, stack-words, **off-axis**, word-rain | words[1..5]≤18, sub?≤48 | words.*, sub | 1.5–10 s |
| `pictogram-scene` | metaphor | triptych, scene-row, **transform** | pictos[1..5], labels?[0..5]≤16, badge?≤24 | pictos.*, badge | 2.5–10 s |
| `screen` | screen | **focus**, steps, callout | image, region?{x:num 0–1, y:num 0–1, w:num 0.02–1, h:num 0.02–1}, callouts?[0..3]{x:num 0–1, y:num 0–1, label≤24}, steps?[0..4]≤30 | image, callouts.*, steps.* | 3–10 s |
| `split` | split | compare-50, slide-over, **before-after** | left{title≤24, items?[0..3]≤28, icon?}, right{title≤24, items?[0..3]≤28, icon?}, verdict?≤40 | left, right >left, verdict >right | 3–10 s |
| `stat` | stat | countup, bar, **ring** | value:int 0–999999, suffix?≤6, label≤32, compare?{value:int 0–999999, label≤24} | value, label, compare | 2.5–10 s |
| `terminal` | terminal | **typed**, output-scroll | title≤30, lines[1..12]{prompt:boolean, text≤80} | lines.* | 3–12 s |
| `title` | title | **number-draw**, big-type, split-band | chapterNo:int 0–20, title≤40, kicker?≤24 | kicker, number, title | 2–10 s |
| `typewriter` | typewriter | line, **document**, quote-card | text≤110, heading?≤30 | heading, text (range) | 2.5–10 s |
| `zoom` | zoom | lens, **pull-back**, focus-crop | subject{icon, label≤24}, detail≤40, context?[0..4]≤16 | subject, detail >subject, context.* | 2.5–10 s |
<!-- catalog:end -->
