# Writing the lesson script

## Grammar of `script.src.txt`

```
// comment
# ch0 | Mở đầu | basic                     chapter: id | title | level (basic|intermediate|advanced)
## 1 | title | Tên bài giảng               frame: n | scene_hint | frame title (n renumbered 1..N)
> visual note for the storyboard            optional; joined into the frame's note
| Nhãn một / Nhãn hai / Nhãn ba              optional on-screen labels for the frame's list scene (not spoken)
Một câu một dòng, có *từ* *khóa*. {F-01}    sentence; *x* = keyword token, {F-01,F-02} = fact ids
### core                                    optional, legacy: DNA role of the frames that follow
                                            (hook|core|case|action; only used when dna.enabled)
```

- `scene_hint` must be one of `video.config.json` → `scenes.types`. The first frame of every chapter is `title`, and no other frame is.
- Mark a multi-word keyword token by token: `*kinh* *nghiệm*`. Keywords get on-screen reveals cued to the voice.
- **Keywords are the on-screen labels.** The solver turns each run of marked tokens (a *keyword phrase*) into a card,
  step or node label, so mark 2–4 word noun phrases that read well alone on screen: `*tự* *rút* *kinh* *nghiệm*`,
  `*máy* *chủ* *riêng*`. Do not mark pronouns (`bạn`, `nó`), bare counts (`hai`, `ba`) or lone verbs. A comma ends a
  phrase: `*ghi* *nhớ,* *tìm* *lại,* *kỹ* *năng*` gives three labels. Numbers worth a big counter are written
  with digits (`64.000`, `hơn 20`); a year or a version is never a counter. The script stage warns when more than half of the phrases are a single word.
  Aim for 2–5 per frame.
- **Labels (`|` lines) say exactly what a list shows.** For a frame whose scene is a list (`cards`, `flow`, `hub`,
  `journey`, `anchor`, `split`, `kinetic`, `metaphor`, `objective`, `quiz`, and the shaped scenes in § Chapter arcs:
  `question`, `myth`, `matrix`, `table`, `pyramid`, `funnel`, `iceberg`, `balance`, `layers`), write its items on a `|` line, split by
  `/`: `| Đặt mục tiêu / Soạn thảo / Kiểm tra cuối`. Each label is 2–5 words, at most 32 characters, and the labels of
  one list are about the same length. The labels are not read aloud; each one appears on the keyword phrase of the same
  position (the first label on the first `*keyword*` phrase), or on its sentence when there are fewer phrases. Without
  a `|` line the keyword phrases are the labels, as before. Use labels whenever the spoken sentences are long, so no
  list item is empty or a cut-off sentence.
- A fact id must exist in `capture/extracted/visible-text.txt` as `[F-NN]`, or `--check` fails.
- **Numbers are written with digits** (`10 hàm`, `bản 7.75`, `64.000 dòng`). They stay digits on screen and are
  spoken in Vietnamese words automatically (`mười`, `bảy chấm bảy mươi lăm`). Write dates as words around digits
  (`tháng 8 năm 2026`, not `8/2026`): `--check` fails on a token with digits it cannot read out.
- **Foreign words** (product names, English terms) are read differently on each take. Give every product name a
  Vietnamese reading in `spokenOverrides` (`"Lark": "Lác"`, `"AI": "ây ai"`), and list every other foreign word in
  the gate 1 probe (`.probe/pronunciation.md`). `--check` fails on a foreign word that is in neither place.
- `spokenOverrides` in the config maps a display token, without punctuation, to what the voice should say. Keep
  display text correct (for example `SOUL.md`) and fix only the spoken side.

## Chapter arcs: every chapter its own rhythm

Learners get bored when every chapter walks the same beats. Give each content chapter (all but the first and the last)
its own arc, and pick its frames' `scene_hint`s from that arc. Mix freely; these are starting points, not a checklist.

| Arc | Frames after the `title` (suggested hints) |
|---|---|
| Question first | `question` (the hook question) → `typewriter` or `principle` (the answer) → `metaphor` (an everyday example) |
| Story | `case` (the situation) → `journey` (what happened, step by step) → `principle` (the lesson) |
| Myth and fact | `myth` (what people believe vs what is true) → `stat` (the evidence) → `cards` (what to do instead) |
| Before and after | `split` (before / after) → `hub` (why it changed) → `flow` (how to get there) |
| Step by step | `flow` (the steps) → `zoom` (the step people get wrong) → `antipattern` (wrong way, right way) |
| Shocking number | `stat` (the number) → `iceberg` (the hidden causes) → `balance` (what you gain, what it costs) |
| Two voices | `dialogue` (a short exchange) → `principle` → `typewriter` (the takeaway line) |
| Picture it | `metaphor` (an image from daily life) → `layers` (what it is made of) → `cards` (what to do) |
| Sort it out | `matrix` (four cases on two axes) → `table` (compare the options) → `pyramid` (what to build first) |
| Narrow it down | `funnel` (from many to few) → `split` (who stays, who drops) → `flow` (how to improve each stage) |

Scenes for a specific shape of content (write their items on a `|` line):

| Hint | Use it for | Labels |
|---|---|---|
| `question` | one question that opens a topic (the sentence ends with `?`) | optional 2–3 answer options |
| `myth` | a common belief, then the truth | myth / fact / myth / fact (1–3 pairs) |
| `dialogue` | a short exchange; write each turn as `Tên: lời` | — |
| `matrix` | four cases sorted on two axes | vertical axis / horizontal axis / 4 cases |
| `table` | 2–3 things compared on 2–5 criteria; title the frame `A và B` | the criteria |
| `pyramid` | 3–5 levels, the base first | the levels, base first |
| `funnel` | 3–5 stages narrowing (numbers optional) | the stages |
| `iceberg` | what shows vs 2–4 hidden causes | the visible part first, then the hidden ones |
| `balance` | two sides weighed against each other | left side items / right side items |
| `layers` | 3–5 layers from outer to inner | the layers |

Rules, checked when the project config has `structure` (every project made from 0.8.0 on):

- No two content chapters share most of their scene hints: gate 2 fails when two chapters' hint sets overlap above
  `structure.maxChapterHintOverlap` (0.5, Jaccard, `title` ignored), and names the pair and the shared hints.
- Use at least 3 different hints in a chapter, and never the same hint on two frames in a row.
- `exercise` ("pause the video and try it") is optional and appears **at most once in the whole video**
  (`structure.maxExercise`, default 1). Leave it out when the lesson has no natural hands-on moment.
- `objective`, `principle`, `antipattern`, `case`, `quiz` and `anchor` are ordinary scenes: use them where they help,
  not in every chapter. A recap (`anchor`) at the end of every chapter is not needed; one at the end of the lesson is.
- `### hook|core|case|action` role markers still parse, but they are not needed; the DNA rules run only when a
  project turns `dna.enabled` on.

A worked example of two chapters on different arcs:

```
# ch1 | Vì sao dự án AI thất bại | basic
## 5 | title | Vì sao dự án AI thất bại
Chương một: *vì* *sao* *dự* *án* *AI* *thất* *bại*.
## 6 | kinetic | Câu hỏi đáng giá
Nếu AI giỏi đến thế, vì sao *7* *trên* *10* *dự* *án* vẫn dừng giữa chừng? {F-04}
## 7 | case | Một tháng với AI
Công ty mua tài khoản, nhân viên học *mẹo* *viết* *câu* *lệnh*. {F-01}
Sau một tháng, văn bản vẫn *chung* *chung*. {F-02}
## 8 | principle | Người kiến trúc sư
Hãy coi mình là *kiến* *trúc* *sư* *trưởng* của cách làm việc. {F-05}

# ch2 | Nhân sự số | intermediate
## 9 | title | Nhân sự số
Chương hai: *nhân* *sự* *số*.
## 10 | stat | Một người, ba trợ lý
Một nhân viên có thể điều phối *3* *trợ* *lý* *AI* cùng lúc. {F-07}
## 11 | hub | Ai làm việc gì
Người đặt *mục* *tiêu,* trợ lý *soạn* *thảo,* người *kiểm* *tra* *cuối*. {F-07}
## 12 | flow | Bắt đầu từ đâu
Chọn *một* *việc* *lặp* *lại,* viết *quy* *trình,* rồi *giao* *cho* *AI*. {F-08}
```

## Budget math

`script-to-md.mjs --check` estimates each frame as:

```
syllables / rate + lead (titleLead for title frames) + tail + gap × (sentences − 1) + 2 × pad × sentences
```

- `rate` comes from `.probe/rate.json`.
- The pauses come from `timing`: lead 0.25, titleLead 0.8, gap 0.5, tail 0.7 and pad 0.08 on the first video.
- The total must land inside `budget.targetS`, and the frame count inside `budget.frames`.
- One sentence may have at most `maxSentenceSyllables` (26) syllables, because long sentences overflow the karaoke band and tire beginners.

The first video's estimate ended within 1.5 % of the real voice (604 s estimated, 612 s real).

### Calibrating the estimate

After the voice stage, `--check` prints `real=` and `ratio=` (real ÷ estimate).

| Video | Voice | Estimate | Real | Ratio |
|---|---|---|---|---|
| Hermes Agent | Thanh Bình, 0.55 | 604 s | 612 s | 1.013 |
| Claude intro | Thanh Bình, 0.55 | 845 s | 875 s | 1.035 |

- Aim the estimate at `targetS` ÷ ratio, so the real voice lands inside the range. With a 1.035 ratio, an 880 s ceiling means an estimate of at most 850 s.
- A first draft that is far short (the Claude script first estimated 667 s against an 810 s floor) fails `--check`. Add examples, not filler, before gate 2.
- Add each new video's row to this table.

## Structure that worked for a 10-minute lesson

| Chapter | Content | Frames |
|---------|---------|--------|
| ch0 Mở đầu | hook, what it is, why it matters, what the learner will take away | 4 |
| ch1 Khái niệm cơ bản | the core idea, compared with what the learner already knows, an everyday example | 6–7 |
| ch2–ch5 Trung cấp | one capability per chapter: install and first use, main features, how it learns, where it runs | 7–11 each |
| ch6 Nâng cao | the standout points using the analyze pattern: feature → vì sao nổi bật → bạn được gì | 8–11 |
| ch7 An toàn và tổng kết | safe use, recap, next steps | 5–6 |

Give each chapter from ch1 on a different arc (§ Chapter arcs). End the lesson with one recap (`anchor`); inside
the lesson, close a chapter however its arc ends best.

## Language for beginners

- Use short sentences in the second person ("bạn"), with one idea per sentence.
- Explain every English term the first time it appears, using an everyday comparison (a trợ lý, a cuốn sổ ghi nhớ).
- Use numbers only when a source backs them and a `{F-NN}` cites them.
- The advanced chapter introduces and analyzes standout points; it is not a step-by-step how-to.
- Read the text aloud. If a sentence needs a breath in the middle, split it.
