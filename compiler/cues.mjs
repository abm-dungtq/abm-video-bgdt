// cues.mjs — the cue grammar (contracts C3): frame-relative seconds from the aligned voice.
//
//   start | end | prev.end
//   kw:<text>[#n]      n-th keyword token (*x* in the script) whose normalized display equals <text>
//   word:<text>[#n]    same, any token
//   sent:<k>.start | sent:<k>.end
//   <cue>+<s> | <cue>-<s>        offset in seconds
//   <cue>..<cue>                 a range (resolveRange; only for reveal keys marked range: true)
//
// Word i of audio_meta voices[frame].words is token i across the frame's sentences (retime-and-cue asserts it).
// With estimated: true (no voice yet) times come from timing + rate, like the script budget estimate.

const r2 = (x) => Math.round(x * 100) / 100;
/** a token that ends a keyword phrase: its display ends with punctuation ("nhớ," in "*ghi* *nhớ,* *tìm* *lại*") */
export const endsPhrase = (display) => /[.,!?;:…]["”')]*$/.test(display);
export const norm = (s) => s.normalize("NFC").toLowerCase().replace(/[.,!?;:…"“”()'‘’]/g, "").trim();
const syl = (t) => t.spoken.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length || 1;
const fail = (msg) => { throw new Error(`cue: ${msg}`); };

/** Tokens and their times for one frame. */
export function frameCtx(frameNo, script, audioMeta, duration, { estimated = false, timing = {}, rate = 4.3 } = {}) {
  const frame = script.chapters.flatMap((c) => c.frames).find((f) => f.id === frameNo) ?? fail(`frame ${frameNo} not in script.json`);
  const tokens = frame.sentences.flatMap((s, si) => s.tokens.map((t) => ({ norm: norm(t.display), display: t.display, keyword: !!t.keyword, sent: si + 1, spoken: t.spoken })));
  let times;
  if (!estimated) {
    const v = audioMeta?.voices?.find((x) => x.frame === frameNo) ?? fail(`frame ${frameNo} has no voice in audio_meta.json`);
    if (v.words.length !== tokens.length) fail(`frame ${frameNo}: ${tokens.length} tokens vs ${v.words.length} aligned words`);
    times = v.words.map((w) => ({ start: w.start, end: w.end }));
  } else {
    const lead = frame.scene_hint === "title" ? (timing.titleLead ?? timing.lead ?? 0.25) : (timing.lead ?? 0.25);
    const gap = timing.gap ?? 0.5, pad = timing.pad ?? 0.08;
    let done = 0;
    times = tokens.map((t) => {
      const start = lead + done / rate + (gap + 2 * pad) * (t.sent - 1);
      done += syl(t);
      return { start, end: start + syl(t) / rate };
    });
  }
  return { frame: frameNo, duration, tokens, times };
}

function base(expr, ctx, prevEnd) {
  if (expr === "start") return 0;
  if (expr === "end") return ctx.duration;
  if (expr === "prev.end") return prevEnd ?? fail("prev.end used on the first shot");
  let m = expr.match(/^(kw|word):(.+?)(?:#(\d+))?$/u);
  if (m) {
    const want = norm(m[2]);
    const n = Number(m[3] ?? 1);
    const hits = ctx.tokens.map((t, i) => [t, i]).filter(([t]) => t.norm === want && (m[1] === "word" || t.keyword));
    if (hits.length < n) fail(`${expr}: ${hits.length ? `only ${hits.length} match(es)` : `no ${m[1] === "kw" ? "keyword" : "word"} "${m[2]}"`} in frame ${ctx.frame}`);
    return ctx.times[hits[n - 1][1]].start;
  }
  m = expr.match(/^sent:(\d+)\.(start|end)$/);
  if (m) {
    const k = Number(m[1]);
    const idx = ctx.tokens.map((t, i) => [t, i]).filter(([t]) => t.sent === k).map(([, i]) => i);
    if (!idx.length) fail(`${expr}: frame ${ctx.frame} has no sentence ${k}`);
    return m[2] === "start" ? ctx.times[idx[0]].start : ctx.times[idx.at(-1)].end;
  }
  return fail(`${expr}: unknown form`);
}

/** Seconds for one cue expression, rounded to 0.01 and inside [0, duration]. */
export function resolve(expr, ctx, prevEnd) {
  expr = String(expr).trim();
  if (expr.includes("..")) fail(`${expr}: a range is only valid for range reveal keys`);
  let t;
  const off = expr.match(/^(.+?)([+-]\d+(?:\.\d+)?)$/);
  if (off) {
    try { t = base(off[1], ctx, prevEnd) + Number(off[2]); } catch { t = undefined; }
  }
  if (t === undefined) t = base(expr, ctx, prevEnd);
  t = r2(t);
  if (t < 0 || t > r2(ctx.duration) + 0.001) fail(`${expr} = ${t} s is outside [0, ${ctx.duration}] in frame ${ctx.frame}`);
  return t;
}

/** [from, to] for "<cue>..<cue>" (a single cue gives [t, t]). */
export function resolveRange(expr, ctx, prevEnd) {
  const [a, b] = String(expr).split("..");
  const from = resolve(a, ctx, prevEnd);
  if (b === undefined) return [from, from];
  const to = resolve(b, ctx, prevEnd);
  if (to <= from) fail(`${expr}: range end ${to} is not after ${from}`);
  return [from, to];
}
