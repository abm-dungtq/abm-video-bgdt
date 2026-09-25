# Writing the lesson script

## Grammar of `script.src.txt`

```
// comment
# ch0 | Mở đầu | basic                     chapter: id | title | level (basic|intermediate|advanced)
## 1 | title | Tên bài giảng               frame: n | scene_hint | frame title (n renumbered 1..N)
> visual note for the storyboard            optional; joined into the frame's note
Một câu một dòng, có *từ* *khóa*. {F-01}    sentence; *x* = keyword token, {F-01,F-02} = fact ids
```

- `scene_hint` must be one of `video.config.json` → `scenes.types`. The first frame of every chapter is `title`, and no other frame is.
- Mark a multi-word keyword token by token: `*kinh* *nghiệm*`. Keywords get on-screen reveals cued to the voice.
  Aim for 2–5 per frame.
- A fact id must exist in `capture/extracted/visible-text.txt` as `[F-NN]`, or `--check` fails.
- `spokenOverrides` in the config maps a display token, without punctuation, to what the voice should say. Keep
  display text correct (for example `SOUL.md`) and fix only the spoken side.

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

## Structure that worked for a 10-minute lesson

| Chapter | Content | Frames |
|---------|---------|--------|
| ch0 Mở đầu | hook, what it is, why it matters, learning objectives (a checklist) | 4 |
| ch1 Khái niệm cơ bản | the core idea, compared with what the learner already knows, an everyday example | 6–7 |
| ch2–ch5 Trung cấp | one capability per chapter: install and first use, main features, how it learns, where it runs | 7–11 each |
| ch6 Nâng cao | the standout points using the analyze pattern: feature → vì sao nổi bật → bạn được gì | 8–11 |
| ch7 An toàn và tổng kết | safe use, recap, next steps | 5–6 |

Every chapter after ch0 ends with a short recap frame (`anchor`) before the next title card.

## Language for beginners

- Use short sentences in the second person ("bạn"), with one idea per sentence.
- Explain every English term the first time it appears, using an everyday comparison (a trợ lý, a cuốn sổ ghi nhớ).
- Use numbers only when a source backs them and a `{F-NN}` cites them.
- The advanced chapter introduces and analyzes standout points; it is not a step-by-step how-to.
- Read the text aloud. If a sentence needs a breath in the middle, split it.
