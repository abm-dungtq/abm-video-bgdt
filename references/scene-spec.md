# scenes.json — the only file you edit to change the visuals

Under `authoring: "director"` (older name `"claude"`) the agent making the video writes `scenes.json` by hand ([direction.md](direction.md)); in older
projects the storyboard stage writes it (`compiler/solver.mjs`). `abm-video run compile` turns it into every
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
  evenly (`spread` keys). A cue you give must fall inside the shot. Defaults rarely hit the word that says an item:
  pin every item, label and value with `word:<its word>-0.1`, and write copy the voice actually says. Lint checks each
  reveal against the aligned voice (voice sync, 1.2 s): in a directed lesson a defaulted reveal that misses is an
  error, a pinned one a warning. Headings, titles and kickers are exempt; they may open the shot.
- Icons: `person people doc docs folder card-stack terminal cloud server key lock shield target timer question check
  cross arrow spark chat mail calendar chart gear plug book lightbulb rocket globe image briefcase`.
- `rail` (optional) lights 2–4 pills across the top of the frame on their cues; keep that frame's content below y 140.
- `transition` (optional) names the transition into the frame, e.g. `"whip-pan RIGHT"` ([direction.md](direction.md)
  § Transitions); compile writes it to `transition_in`.
- `overlays` (optional, 1–3) are timed notes drawn on the overlay layer: `{ kind: lower-third|callout|note|ticker,
  text≤60, sub?≤48, at, until?, place?: tl|tr|mr (callout), skin?: kicker|bar (lower-third) }`
  ([direction.md](direction.md) § Overlays).

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
| `accent-cuboids` | accent-cuboids | **wave**, shelf | heading?≤40, items[3..6]{icon, label≤18, note?≤26}, hero?:int 0–5 | heading, items.*, hero >items.2 | 4–12 s |
| `accent-device` | accent-device | **turntable**, callouts | app≤18, icon?, caption≤40, items[2..4]{label≤22, note?≤26} | caption, items.* | 4–12 s |
| `accent-orbit` | accent-orbit | **orbit**, side | tag?≤20, title≤28, desc≤96, icon? | tag, title, desc >title, turn >desc | 4–12 s |
| `ai-answer` | ai-answer | inline, **sources-side** | question≤100, turns[2..4]{who≤28, text≤140} | question, turns.* | 2.5–10 s |
| `anchor` | anchor | checklist, **cycle**, badge-row | title≤30, items[2..5]≤34 | title, items.* | 3–10 s |
| `balance` | balance | **scale-tilt**, tug, seesaw | left{label≤18, icon?, items[1..3]≤22}, right{label≤18, icon?, items[1..3]≤22}, winner(left|right|even) | left, left.items.*, right, right.items.*, tip | 3.5–10 s |
| `bar-line-chart` | bar-line-chart | combo, **spotlight** | title?≤40, unit?≤14, barName≤18, lineName?≤18, lineSuffix?≤4, points[3..6]{label≤10, bar:int 0–999999, line?:int 0–999999} | title, bars, line | 2.5–10 s |
| `callout-sentence` | callout-sentence | **marker**, circle | text≤110, key?≤32, source?≤40 | text (range), source >text | 2.5–10 s |
| `card-antipattern` | antipattern | side-by-side, **flip**, strike | wrong{label≤20, items[1..3]≤40}, right{label≤20, items[1..3]≤40} | label, wrong, right >wrong | 4–10 s |
| `card-case` | case | story, **chat**, polaroid | situation≤90, detail≤60, question?≤60 | label, situation, detail >situation, question >detail | 4–10 s |
| `card-exercise` | exercise | **timer-ring**, steps, sticky-note | task≤80, minutes?:int 1–60, steps?[0..3]≤40 | label, task, steps.* | 8–10 s |
| `card-objective` | objective | **list**, spotlight, target-rings | items[1..3]≤48 | label, items.* | 4–10 s |
| `card-principle` | principle | quote, **keyword**, monolith | text≤90, keyword?≤18 | label, text, keyword >text | 3–10 s |
| `card-quiz` | quiz | **abc**, true-false, spotlight-pick | question≤90, options[2..4]≤40, answer:int 0–3 | label, question, options.*, answer >options.1 | 8–10 s |
| `cards` | cards | grid-3, grid-4, **stack-fan** | heading?≤40, items[2..6]{icon, label≤22, note?≤40} | heading, items.* | 2.5–10 s |
| `chat-exchange` | chat-exchange | chatgpt, **claude** | name≤24, turns[2..4]{who≤24, text≤140} | turns.* | 2.5–10 s |
| `code-card` | code-card | **float**, aside | file≤32, lang?≤14, lines[2..12]≤52, focus?:int 0–11, caption?≤48 | caption, focus | 3–10 s |
| `code-diff` | code-diff | unified, **split** | file≤32, lines[2..10]{kind(ctx|del|add), text≤48}, note?≤48 | del, add >del, note | 3–10 s |
| `code-focus` | code-focus | sweep, **lens** | file≤32, lines[2..10]≤48, focus:int 0–9, note?≤48 | focus, note >focus | 3–10 s |
| `code-hero` | code-hero | **flip**, slice | title≤40, code≤40, lang?≤14 | title, code | 3–12 s |
| `code-morph` | code-morph | **flip**, summary | file≤32, before[1..10]≤44, after[1..10]≤44, note?≤48 | after, note >after | 3–10 s |
| `code-scroll` | code-scroll | minimap, **reel** | file≤32, lines[12..40]≤48, focus:int 0–39, note?≤48 | focus, note >focus | 3.5–10 s |
| `code-typing` | code-typing | **editor**, palette | file≤32, lines[1..8]≤52, note?≤48 | lines (range), note >lines | 3–10 s |
| `cursor-text` | cursor-text | **retype**, select | lead≤40, draft≤24, fix≤24, tail?≤36, note?≤48 | lead, fix, note >fix | 4–10 s |
| `decision-tree` | decision-tree | **tree**, sideways | question≤40, branches[2..3]{when≤18, then≤28, icon?}, pick?:int 0–2 | question, branches.*, pick >branches.1 | 3.5–10 s |
| `dialogue` | dialogue | **chat-bubbles**, two-portraits, script-lines | speakers[2..2]{icon?, name≤14}, turns[2..4]{who:int 0–1, text≤72} | turns.* | 3.5–10 s |
| `editor-window` | editor-window | **workbench**, zen | project≤24, file≤28, files?[1..4]≤22, lines[2..10]≤48, run?≤40, output?[1..3]≤48 | code (range), run >code | 4–10 s |
| `flap-board` | flap-board | **board**, departures | kicker?≤28, lines[1..3]≤14, note?≤48 | kicker, lines.*, note | 3–10 s |
| `flow` | flow | linear, **loop**, branch | steps[2..5]{icon, label≤18}, loop?:boolean | steps.*, spark | 3–10 s |
| `flow-vertical` | flow-vertical | **stack**, rail | steps[3..6]{icon, label≤26} | steps.* | 3–10 s |
| `funnel` | funnel | **pour**, stages, drop-off | stages[3..5]{label≤22, value?:int 0–999999, suffix?≤3} | stages.* | 3–10 s |
| `glass-widgets` | glass-widgets | row, **board** | heading?≤40, items[2..4]{label≤22, value:int 0–999999, unit?≤6, meter?:int 0–100, note?≤28} | heading, items.* | 2.5–10 s |
| `handwritten-note` | handwritten-note | **title**, sticky | text≤40, note?≤56 | text (range), note >text | 2.5–10 s |
| `hex-map` | hex-map | **honeycomb**, ranked | title?≤36, unit?≤8, regions[4..20]{label≤10, value:int 0–999999, col?:int 0–9, row?:int 0–5} | title, fill, top >fill | 3.5–10 s |
| `hub` | hub | **constellation**, orbit, spokes | center{icon, label≤16}, nodes[3..8]{icon?, label≤14} | center, nodes.* | 3–10 s |
| `iceberg` | iceberg | **waterline**, sonar, cutaway | tip{icon?, label≤22}, hidden[2..4]{icon?, label≤26} | tip, hidden.* | 3–10 s |
| `journey` | journey | stations, timeline, **path** | stops[3..6]{label≤18, note?≤28}, current?:int 0–5 | stops.* | 3–10 s |
| `kinetic` | kinetic | center-punch, stack-words, **off-axis**, word-rain | words[1..5]≤18, sub?≤48 | words.*, sub | 1.5–10 s |
| `layers` | layers | **exploded**, slices, onion | title?≤32, layers[3..5]{label≤22, note?≤36, icon?} | layers.* | 3–10 s |
| `line-graph` | line-graph | draw, **area** | title?≤40, unit?≤14, labels[3..8]≤10, series[1..2]{name≤18, values[3..8]:int 0–999999} | title, series.* | 2.5–10 s |
| `matrix` | matrix | **quadrant**, heat, plot | x?≤20, y?≤20, items[4..4]{icon?, label≤18} | axes, items.* | 3.5–10 s |
| `media-grid` | media-grid | **grid**, hero | title?≤40, tiles[2..4]{kind(chat|code|chart|doc|photo|dashboard|terminal), label≤24} | title, tiles.* | 3–10 s |
| `message-thread` | message-thread | bubbles, **feed** | contact≤24, turns[2..4]{who≤24, text≤140} | turns.* | 2.5–10 s |
| `myth-fact` | myth | **stamp**, flip-cards, tear | pairs[1..3]{myth≤48, fact≤64} | myth.*, fact.* | 3.5–10 s |
| `notify-single` | notify-single | banner, **spotlight** | icon, app?≤22, when?≤12, title≤40, body?≤110 | title, body | 2.5–10 s |
| `notify-stack` | notify-stack | **cascade**, split | heading?≤40, items[2..5]{icon, title≤26, text?≤48, when?≤10} | heading, items.* | 2.5–10 s |
| `opener-canopy` | opener-canopy | **part**, sweep | kicker?≤28, headline≤24, headline2?≤28 | kicker, headline, headline2 >headline | 3.5–12 s |
| `opener-portal` | opener-portal | **tunnel**, rings | title≤20, phrase≤28, subtitle?≤40 | title, phrase >title, subtitle | 3.5–12 s |
| `opener-prism` | opener-prism | **center**, numeral | title≤32, kicker?≤28, chapterNo?:int 1–20 | kicker, title | 3–12 s |
| `opener-shard` | opener-shard | **center**, sweep | title≤32, kicker?≤28 | kicker, title | 3–12 s |
| `opener-tiles` | opener-tiles | **sweep**, ripple | kicker?≤32, headline≤16, reverse≤16 | kicker, headline, reverse >headline | 3.5–12 s |
| `opener-write` | opener-write | **chalk**, ink | kicker?≤28, title≤30, note?≤44 | kicker, title, note >title | 3.5–12 s |
| `path-text` | path-text | **wave**, arc | text≤56, from?≤20, to?≤20 | text (range), to >text | 3–10 s |
| `pictogram-scene` | metaphor | triptych, scene-row, **transform** | pictos[1..5], labels?[0..5]≤16, badge?≤24 | pictos.*, badge | 2.5–10 s |
| `progress-stat` | progress-stat | track, **blocks** | value:int 0–999999, max:int 1–999999, suffix?≤6, label≤32, caption?≤48 | value, label, caption | 2.5–10 s |
| `pyramid` | pyramid | **stack-up**, inverted, side-labels | levels[3..5]{icon?, label≤22} | levels.* | 3.5–10 s |
| `question-hook` | question | **big-question**, blank-fill, poll | question≤90, focus?≤24, options?[2..3]≤24 | question, focus, options.* | 3–10 s |
| `rank-race` | rank-race | **race**, columns | title?≤40, unit?≤8, milestones[2..5]≤12, items[3..6]{name≤16, values[2..5]:int 0–999999} | title, milestones.* | 2.5–10 s |
| `screen` | screen | **focus**, steps, callout | image, region?{x:num 0–1, y:num 0–1, w:num 0.02–1, h:num 0.02–1}, callouts?[0..3]{x:num 0–1, y:num 0–1, label≤24}, steps?[0..4]≤30 | image, callouts.*, steps.* | 3–10 s |
| `signal-trace` | signal-trace | **scope**, latency | title?≤32, shape(sine|square|pulse|step|noise), channels?[1..2]≤14, readouts[1..4]{label≤14, value≤12}, marker?≤24 | trace, readouts.*, marker >trace | 3–10 s |
| `sketch-pipeline` | sketch-pipeline | row, **zigzag** | title?≤36, steps[2..5]{label≤18, note?≤28} | title, steps.* | 3–10 s |
| `specs-list` | specs-list | rows, **checklist** | heading?≤40, items[2..6]{label≤24, value?≤36} | heading, items.* | 2.5–10 s |
| `split` | split | compare-50, slide-over, **before-after** | left{title≤24, items?[0..3]≤28, icon?}, right{title≤24, items?[0..3]≤28, icon?}, verdict?≤40 | left, right >left, verdict >right | 3–10 s |
| `stat` | stat | countup, bar, **ring** | value:int 0–999999, suffix?≤6, label≤32, compare?{value:int 0–999999, label≤24} | value, label, compare | 2.5–10 s |
| `table` | table | **rows-reveal**, scorecard, checkmarks | columns[2..3]≤16, rows[2..5]{label≤22, cells[2..3]≤16} | columns, rows.* | 3–10 s |
| `terminal` | terminal | **typed**, output-scroll | title≤30, lines[1..12]{prompt:boolean, text≤80} | lines.* | 3–12 s |
| `terminal-window` | terminal-window | **classic**, steps | title?≤30, prompt?≤24, steps[1..4]{label?≤26, cmd≤48, output?[0..4]{text≤60, kind?(text|ok|err|dim)}} | steps.* | 3–10 s |
| `title` | title | **number-draw**, big-type, split-band | chapterNo:int 0–20, title≤40, kicker?≤24 | kicker, number, title | 2–10 s |
| `typewriter` | typewriter | line, **document**, quote-card | text≤110, heading?≤30 | heading, text (range) | 2.5–10 s |
| `ui-reveal` | ui-reveal | **tilt**, angle | app≤24, nav?[2..5]≤16, headline?≤36, cards[2..4]{label≤18, value?≤10}, caption?≤40 | cards.*, caption | 3–10 s |
| `weight-wave` | weight-wave | **wave**, specimen | text≤28, focus?≤16, caption?≤48 | text, caption >text | 3–10 s |
| `world-map` | world-map | **callouts**, pins | title?≤40, regions[1..6]{region(vn|cn|jp|kr|in|id|th|ph|my|tw|kh|la|mm|pk|bd|kz|mn|us|ca|mx|br|ar|cl|co|pe|gb|fr|de|it|es|pt|nl|se|no|fi|pl|ua|ch|ie|ru|tr|sa|ae|il|ir|eg|ng|za|ke|et|ma|au|nz|north-america|south-america|europe|africa|oceania|asia|middle-east|southeast-asia|eu), label≤22, value?≤12} | title, regions.* | 3–10 s |
| `zoom` | zoom | lens, **pull-back**, focus-crop | subject{icon, label≤24}, detail≤40, context?[0..4]≤16 | subject, detail >subject, context.* | 2.5–10 s |
<!-- catalog:end -->
