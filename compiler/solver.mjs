#!/usr/bin/env node
// solver.mjs — write scenes.json for a whole lesson from script.json and the real (or estimated) timing, so every frame
// is compiled from templates. The agent then only edits the JSON (swap a template, reword a slot, mark ≤ 15 % custom).
//
//   node tools/compiler/solver.mjs --auto [--estimated] [--seed N] [--out scenes.json]
//
// Per frame: split into 1–3 shots at sentence boundaries (each ≤ scenes.maxShotS and inside the template's duration
// range); shot 1 follows the frame's scene_hint, later shots follow their content (numbers → stat, many phrases →
// cards/hub/flow/journey/anchor, a comparison → split, else kinetic/zoom/pictogram/typewriter). Slots come from the
// keyword phrases (runs of *keyword* tokens in one sentence), the frame title, spoken numbers and capture/terminal.
// A template whose slots cannot be filled within its limits falls back to the next candidate; never cut a word.
// Variety: no family twice in a row (across frames too), a (template, variant) pair not reused within 6 shots, new
// templates preferred inside a chapter, one signature variant per chapter; ties broken by mulberry32(seed + frame).
// The result is checked with lint's analyze(); shots it rejects are re-solved with the next candidate.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { endsPhrase, frameCtx, norm, resolve } from "./cues.mjs";
import { analyze, loadTemplate, readStoryboard, TEMPLATES, WHOLE_FRAME_MAX_S } from "./lint.mjs";
import { mulberry32 } from "./compile.mjs";
import { validate } from "./schema.mjs";
import { score, violations } from "./scorecard.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const r2 = (x) => Math.round(x * 100) / 100;
const ICONS = JSON.parse(readFileSync(join(HERE, "icon-words.json"), "utf8"));
const STOP = new Set(["một", "các", "những", "của", "và", "thì", "là", "cho", "với", "được", "này", "đó", "nó", "rồi", "cũng"]);
export const HINT = { metaphor: "pictogram-scene", objective: "card-objective", principle: "card-principle", antipattern: "card-antipattern",
  case: "card-case", exercise: "card-exercise", quiz: "card-quiz", myth: "myth-fact", question: "question-hook" };
// families of cards that are built from a whole frame (the director keeps such a frame in one shot)
export const WHOLE_FAMILIES = new Set(["exercise", "quiz", "case"]);
const PRIVATE = /[A-Za-z]:\\Users\\|\/Users\/|\/home\/|@[\w.-]+\.\w+/;

// ── content of a frame ─────────────────────────────────────────────────────────
const strip = (s) => s.replace(/^[\s"“”'(]+|[\s.,!?;:…"“”')]+$/g, "");

const WEAK = new Set(["bạn", "tôi", "nó", "mọi thứ", "cái này", "điều này", "ở đây", "như vậy", "rất", "nhiều"]);
/** a phrase that says nothing on its own: a pronoun or filler, or a bare spoken count ("hai", "ba mươi") */
const weak = (text) => WEAK.has(norm(text)) || norm(text).split(/\s+/).every((w) => w in DIGIT || w in SCALE || ["mười", "mươi", "trăm", "linh", "lẻ", "hơn"].includes(w));

/** Keyword phrases: runs of keyword tokens inside one sentence, with the cue of their first token. */
function phrases(ctx) {
  const out = [];
  const seen = new Map();
  ctx.tokens.forEach((t, i) => {
    if (!t.keyword) return;
    seen.set(t.norm, (seen.get(t.norm) ?? 0) + 1);
    const prev = ctx.tokens[i - 1];
    if (prev?.keyword && prev.sent === t.sent && !endsPhrase(prev.display)) {
      const p = out.at(-1);
      p.words.push(t.display);
      p.end = ctx.times[i].end;
      return;
    }
    const n = seen.get(t.norm);
    out.push({ words: [t.display], sent: t.sent, time: r2(ctx.times[i].start), end: ctx.times[i].end, cue: `kw:${t.norm}${n > 1 ? `#${n}` : ""}` });
  });
  return out.map((p) => ({ ...p, text: strip(p.words.join(" ")) })).filter((p) => p.text && !weak(p.text));
}

function sentences(ctx) {
  const out = [];
  ctx.tokens.forEach((t, i) => {
    const s = out[t.sent - 1] ?? (out[t.sent - 1] = { k: t.sent, words: [], start: ctx.times[i].start, end: 0 });
    s.words.push(t.display);
    s.end = ctx.times[i].end;
  });
  return out.map((s) => ({ ...s, text: s.words.join(" ") }));
}

const DIGIT = { không: 0, một: 1, mốt: 1, hai: 2, ba: 3, bốn: 4, tư: 4, năm: 5, lăm: 5, sáu: 6, bảy: 7, bẩy: 7, tám: 8, chín: 9 };
const SCALE = { nghìn: 1e3, ngàn: 1e3, triệu: 1e6, tỷ: 1e9 };
const NUMWORD = (w) => w in DIGIT || w in SCALE || ["mười", "mươi", "trăm", "linh", "lẻ"].includes(w);

/** Read one spoken Vietnamese number ("sáu mươi tư nghìn" = 64000, "mười lăm" = 15, "hai trăm linh năm" = 205). */
export function readNumber(words) {
  let total = 0, hundreds = 0, tens = 0, unit = null;
  for (const w of words) {
    if (w in DIGIT) unit = DIGIT[w];
    else if (w === "mười") { tens = 10; unit = null; }
    else if (w === "mươi") { tens = (unit ?? 1) * 10; unit = null; }
    else if (w === "trăm") { hundreds = (unit ?? 1) * 100; unit = null; }
    else if (w in SCALE) { total += (hundreds + tens + (unit ?? 0) || 1) * SCALE[w]; hundreds = tens = 0; unit = null; }
  }
  return total + hundreds + tens + (unit ?? 0);
}

/**
 * Numbers worth a counter (words or digits) with the cue of their first word; "một"/"năm" alone are an article /
 * "year". Not counters: decimals, versions and dates written with digits (7.75, 8/2026) and years (1900–2100 after
 * "năm"/"tháng", or a spoken run with "năm" inside: "tháng tám năm hai nghìn…").
 */
export function numbers(ctx) {
  const out = [];
  const w = ctx.tokens.map((t) => t.norm);
  const bare = (i) => ctx.tokens[i].display.replace(/^[.,!?;:…"“”()]+|[.,!?;:…"“”()]+$/g, "");
  for (let i = 0; i < w.length; i++) {
    let value = null, j = i + 1;
    const b = bare(i);
    if (/^\d+$/.test(b) || /^\d{1,3}(\.\d{3})+$/.test(b)) value = Number(b.replace(/\./g, ""));
    else if (/\d/.test(b)) continue;
    else if (w[i] in DIGIT || w[i] === "mười") {
      while (j < w.length && NUMWORD(w[j]) && ctx.tokens[j].sent === ctx.tokens[i].sent) j++;
      const run = w.slice(i, j);
      if (run.slice(0, -1).includes("năm") && run.length > 2) { i = j - 1; continue; }
      value = run.length === 1 && ["một", "mốt", "năm", "không"].includes(run[0]) ? null : readNumber(run);
    }
    if (value !== null && value >= 1900 && value <= 2100 && ["năm", "tháng"].includes(w[i - 1])) { i = j - 1; continue; }
    if (value === null || value < 2) continue;
    const suffix = w[i - 1] === "hơn" ? "+" : w[j] === "phần" && w[j + 1] === "trăm" ? "%" : "";
    const spoken = !/^\d/.test(w[i]);
    if (spoken && value < 10 && !suffix && !w.slice(i, j).some((x) => x in SCALE)) { i = j - 1; continue; }
    const n = w.slice(0, i + 1).filter((x) => x === w[i]).length;
    out.push({ value, suffix, time: r2(ctx.times[i].start), cue: `word:${w[i]}${n > 1 ? `#${n}` : ""}`, sent: ctx.tokens[i].sent });
    i = j - 1;
  }
  return out;
}

/** Shorten a text to max characters by dropping filler words at its ends; null when it still does not fit. */
function fit(text, max) {
  if (!text) return null;
  let words = strip(text).split(/\s+/);
  const ok = () => [...words.join(" ")].length <= max;
  while (!ok() && words.length > 1 && STOP.has(norm(words[0]))) words = words.slice(1);
  while (!ok() && words.length > 1 && STOP.has(norm(words.at(-1)))) words = words.slice(0, -1);
  const s = words.join(" ");
  return s && ok() ? s.charAt(0).toUpperCase() + s.slice(1) : null;
}

/** Icons for a list of [label, context] pairs: the label decides, its sentence is a fallback, no icon twice in a shot. */
function iconsFor(pairs) {
  const used = new Set();
  return pairs.map(([label, context]) => {
    const pick = [iconFor(label), iconFor(label, context)].find((i) => i !== "spark" && !used.has(i))
      ?? ["spark", ...Object.keys(ICONS).filter((k) => !k.startsWith("_"))].find((i) => !used.has(i));
    used.add(pick);
    return pick;
  });
}

function iconFor(...texts) {
  const hay = ` ${norm(texts.filter(Boolean).join(" "))} `;
  let best = null;
  for (const [icon, list] of Object.entries(ICONS)) {
    if (icon.startsWith("_")) continue;
    for (const p of list) if (hay.includes(` ${p} `) && (!best || p.length > best[1].length)) best = [icon, p];
  }
  return best?.[0] ?? "spark";
}

function terminalLines(P, frame, ascii) {
  const dir = join(P, "capture/terminal");
  const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".txt")) : [];
  const named = files.find((f) => String(frame.notes ?? "").includes(f));
  if (named) {
    const lines = readFileSync(join(dir, named), "utf8").split(/\r?\n/).map((l) => l.replace(/\s+$/, ""))
      .filter((l) => l && !PRIVATE.test(l) && [...l].length <= 80).slice(0, 11);
    return lines.length ? lines.map((text, i) => ({ prompt: i === 0, text })) : null;
  }
  return ascii.length ? ascii.slice(0, 6).map((text) => ({ prompt: true, text })) : null;
}

// ── template builders: shot content → { slots, reveals } or null ────────────────
const items = (ps, max, lo, hi) => {
  const out = ps.map((p) => ({ p, t: fit(p.text, max) })).filter((x) => x.t).slice(0, hi);
  return out.length >= lo ? out : null;
};
const cueOf = (x) => x.p.cue;

// Builders that take a list of short labels; a frame's explicit `| a / b / c` labels (script.json frame.labels) replace
// their keyword phrases, once per frame: on the shot of the frame's scene_hint template when that is one of these,
// else on the first of these shots.
export const LABELED = new Set(["kinetic", "cards", "hub", "flow", "journey", "anchor", "split", "pictogram-scene", "card-objective", "card-quiz",
  "matrix", "myth-fact", "pyramid", "funnel", "iceberg", "table", "balance", "layers", "question-hook"]);

/** the shot context with its keyword phrases replaced by the frame's labels (cue: phrase i, else sentence i's start) */
export function withLabels(c, labels) {
  const ph = labels.map((text, i) => {
    if (c.ph[i]) return { ...c.ph[i], text };
    const s = c.sents[Math.min(i, c.sents.length - 1)];
    return s ? { text, sent: s.k, time: s.start, cue: `sent:${s.k}.start` } : { text, sent: 0, time: 0, cue: "start+0.35" };
  });
  return { ...c, ph, labelled: true };
}

export const BUILD = {
  title: (c) => {
    const title = fit(c.frame.title, 40) ?? fit(c.chapter.title, 40);
    if (!title || !c.first) return null;
    return { slots: { chapterNo: Math.min(20, c.chapterIndex), title, ...(c.chapterIndex === 0 ? { kicker: "Bài học" } : {}) },
      reveals: { number: "start+0.3", title: `start+${c.titleLead}`, ...(c.chapterIndex === 0 ? { kicker: "start+0.1" } : {}) } };
  },
  kinetic: (c) => {
    const w = items(c.ph, 18, 1, 3);
    if (!w) return null;
    const sub = c.first ? fit(c.frame.title, 48) : null;
    return { slots: { words: w.map((x) => x.t), ...(sub && !w.some((x) => norm(x.t) === norm(sub)) ? { sub } : {}) },
      reveals: Object.fromEntries(w.map((x, i) => [`words.${i}`, cueOf(x)])) };
  },
  cards: (c) => {
    const it = items(c.ph, 22, 2, 4);
    if (!it) return null;
    const heading = c.first ? fit(c.frame.title, 40) : null;
    const icons = iconsFor(it.map((x) => [x.t, c.sentOf(x.p)]));
    return { slots: { ...(heading ? { heading } : {}), items: it.map((x, i) => ({ icon: icons[i], label: x.t })) },
      reveals: Object.fromEntries(it.map((x, i) => [`items.${i}`, cueOf(x)])) };
  },
  hub: (c) => {
    const center = fit(c.frame.title, 16) ?? fit(c.ph[0]?.text, 16);
    const it = items(c.ph.filter((p) => norm(p.text) !== norm(center ?? "")), 14, 3, 6);
    if (!center || !it) return null;
    const icons = iconsFor([[center, c.frame.title], ...it.map((x) => [x.t, c.sentOf(x.p)])]);
    return { slots: { center: { icon: icons[0], label: center }, nodes: it.map((x, i) => ({ icon: icons[i + 1], label: x.t })) },
      reveals: Object.fromEntries(it.map((x, i) => [`nodes.${i}`, cueOf(x)])) };
  },
  flow: (c) => {
    const it = items(c.ph, 18, 2, 5);
    if (!it) return null;
    const loop = /vòng lặp|lặp lại/.test(norm(`${c.frame.title} ${c.text}`));
    const icons = iconsFor(it.map((x) => [x.t, c.sentOf(x.p)]));
    return { slots: { steps: it.map((x, i) => ({ icon: icons[i], label: x.t })), ...(loop ? { loop: true } : {}) },
      reveals: Object.fromEntries(it.map((x, i) => [`steps.${i}`, cueOf(x)])) };
  },
  journey: (c) => {
    const it = items(c.ph, 18, 3, 6);
    if (!it) return null;
    return { slots: { stops: it.map((x) => ({ label: x.t })), current: it.length - 1 },
      reveals: Object.fromEntries(it.map((x, i) => [`stops.${i}`, cueOf(x)])) };
  },
  anchor: (c) => {
    const title = fit(c.frame.title, 30);
    const it = items(c.ph, 34, 2, 5);
    if (!title || !it) return null;
    return { slots: { title, items: it.map((x) => x.t) }, reveals: Object.fromEntries(it.map((x, i) => [`items.${i}`, cueOf(x)])) };
  },
  split: (c) => {
    const mid = c.sents.length > 1 ? c.sents[Math.floor(c.sents.length / 2)].k : null;
    if (!mid) return null;
    const side = (ps) => {
      const it = items(ps, 28, 1, 4);
      if (!it) return null;
      const title = fit(it[0].p.text, 24);
      const its = it.slice(1, 4).map((x) => x.t);
      // under the director a side with nothing under its title leaves `items` out instead of an empty list
      return title ? { slots: { title, ...(its.length || c.hintHere === undefined ? { items: its } : {}), icon: iconFor(it[0].t, c.sentOf(it[0].p)) }, cue: cueOf(it[0]) } : null;
    };
    const L = side(c.ph.filter((p) => p.sent < mid)), R = side(c.ph.filter((p) => p.sent >= mid));
    if (!L || !R) return null;
    // under the director a half with a title and nothing under it reads as a gap: leave such a shot to another template,
    // unless it is the frame's own split hint (keeping the hint matters more)
    if (c.hintHere === false && !c.relaxed && (!L.slots.items?.length || !R.slots.items?.length)) return null;
    return { slots: { left: L.slots, right: R.slots }, reveals: { left: L.cue, right: R.cue } };
  },
  stat: (c) => {
    const [n1, n2] = c.nums;
    const label = fit(c.frame.title, 32) ?? fit(c.ph[0]?.text, 32);
    if (!n1 || !label) return null;
    const cmpLabel = n2 ? fit(c.ph.find((p) => p.time >= n2.time && !/\d/.test(p.text))?.text ?? "", 24) : null;
    return { slots: { value: n1.value, ...(n1.suffix ? { suffix: n1.suffix } : {}), label, ...(n2 && cmpLabel ? { compare: { value: n2.value, label: cmpLabel } } : {}) },
      reveals: { value: n1.cue, ...(n2 && cmpLabel ? { compare: n2.cue } : {}) } };
  },
  typewriter: (c) => {
    // the narration is already on screen in the karaoke band: type the keyword phrases; a whole sentence (the
    // shortest) only when the shot has fewer than two phrases and nothing else fits
    const ph = c.ph.slice(0, 4);
    if (ph.length < 2) {
      const s = [...c.sents].sort((x, y) => x.text.length - y.text.length).find((x) => [...x.text].length <= 110);
      return s ? { slots: { text: s.text }, reveals: { text: `sent:${s.k}.start..sent:${s.k}.end` } } : null;
    }
    const join = () => ph.map((p) => p.text).join(" · ");
    while ([...join()].length > 80 && ph.length > 2) ph.pop();
    const text = join();
    if ([...text].length > 80) return null;
    const heading = fit(c.frame.title, 30);
    return { slots: { text, ...(heading ? { heading } : {}) }, reveals: { text: `${ph[0].cue}..${ph.at(-1).cue}+0.6` } };
  },
  zoom: (c) => {
    const [a, b, ...rest] = c.ph;
    const label = fit(a?.text, 24);
    const detail = fit(b?.text, 40) ?? fit(c.frame.title, 40);
    if (!label || !detail || norm(label) === norm(detail)) return null;
    const ctxs = rest.map((p) => fit(p.text, 16)).filter(Boolean).slice(0, 4);
    return { slots: { subject: { icon: iconFor(label, c.sentOf(a)), label }, detail, ...(ctxs.length ? { context: ctxs } : {}) },
      reveals: { subject: a.cue, ...(b ? { detail: b.cue } : {}) } };
  },
  "pictogram-scene": (c) => {
    const it = items(c.ph, 16, 1, 4);
    if (!it) return null;
    const badge = c.first ? fit(c.frame.title, 24) : null;
    return { slots: { pictos: iconsFor(it.map((x) => [x.t, c.sentOf(x.p)])), labels: it.map((x) => x.t), ...(badge ? { badge } : {}) },
      reveals: Object.fromEntries(it.map((x, i) => [`pictos.${i}`, cueOf(x)])) };
  },
  terminal: (c) => {
    const ascii = c.ph.map((p) => p.text).filter((t) => /^[\x20-\x7e]+$/.test(t) && t.includes(" "));
    const lines = terminalLines(c.P, c.frame, ascii);
    const title = fit(c.frame.title, 30);
    if (!lines || !title) return null;
    return { slots: { title, lines }, reveals: {} };
  },
  screen: (c) => {
    const img = String(c.frame.notes ?? "").match(/assets\/screens\/[\w.-]+\.(?:png|jpe?g|webp)/)?.[0];
    if (!img || !existsSync(join(c.P, img))) return null;
    const steps = c.ph.map((p) => fit(p.text, 30)).filter(Boolean).slice(0, 4);
    return { slots: { image: img, ...(steps.length ? { steps } : {}) }, reveals: {} };
  },
  matrix: (c) => {
    // frame labels "| trục dọc / trục ngang / a / b / c / d" give the axes; else "trục dọc là …" in the text
    const lab = c.labelled && c.ph.length >= 6;
    const axis = (re) => fit(c.text.match(re)?.[1], 20);
    const y = lab ? fit(c.ph[0].text, 20) : axis(/trục (?:dọc|tung)(?: là|:)?\s+([^,.;:!?]+)/iu);
    const x = lab ? fit(c.ph[1].text, 20) : axis(/trục (?:ngang|hoành)(?: là|:)?\s+([^,.;:!?]+)/iu);
    const it = items(lab ? c.ph.slice(2) : c.ph.filter((p) => !/^trục\b/iu.test(p.text)), 18, 4, 4);
    if (!it || (lab && (!x || !y))) return null;
    const icons = iconsFor(it.map((q) => [q.t, c.sentOf(q.p)]));
    const axes = x && y;
    return { slots: { ...(axes ? { y, x } : {}), items: it.map((q, i) => ({ icon: icons[i], label: q.t })) },
      reveals: { ...(axes ? { axes: "start+0.35" } : {}), ...Object.fromEntries(it.map((q, i) => [`items.${i}`, cueOf(q)])) } };
  },
  "myth-fact": (c) => {
    // pairs: labels in order myth, fact, myth, fact…; else a sentence that states a belief, then the next one that corrects it
    const MYTH = /lầm tưởng|hiểu lầm|ngộ nhận|nhiều người (?:nghĩ|tin|cho rằng)|tưởng rằng/u;
    const FACT = /sự thật|thực ra|thật ra|thực tế/u;
    const lead = /^.*?(?:lầm tưởng|hiểu lầm|ngộ nhận|nhiều người (?:nghĩ|tin|cho rằng)|tưởng rằng|sự thật|thực ra|thật ra|thực tế)(?:\s+(?:thứ\s+\S+|đầu tiên))?(?:\s+(?:là|rằng|thì))*\s*[:,]?\s*/iu;
    const say = (s, max) => fit(s.text.replace(lead, ""), max)
      ?? c.ph.filter((p) => p.sent === s.k).map((p) => fit(p.text, max)).filter(Boolean).sort((a, b) => b.length - a.length)[0] ?? null;
    const pairs = [], reveals = {};
    const add = (myth, fact, cm, cf) => { reveals[`myth.${pairs.length}`] = cm; reveals[`fact.${pairs.length}`] = cf; pairs.push({ myth, fact }); };
    if (c.labelled) {
      for (let i = 0; i + 1 < c.ph.length && pairs.length < 3; i += 2) {
        const myth = fit(c.ph[i].text, 48), fact = fit(c.ph[i + 1].text, 64);
        if (!myth || !fact) return null;
        add(myth, fact, c.ph[i].cue, c.ph[i + 1].cue);
      }
    } else {
      const ss = c.sents;
      for (let i = 0; i < ss.length && pairs.length < 3; i++) {
        if (!MYTH.test(norm(ss[i].text))) continue;
        const j = ss.findIndex((s, k) => k > i && FACT.test(norm(s.text)));
        const f = ss[j > 0 ? j : i + 1];
        if (!f) break;
        const myth = say(ss[i], 48), fact = say(f, 64);
        if (myth && fact) add(myth, fact, `sent:${ss[i].k}.start`, `sent:${f.k}.start`);
        i = ss.indexOf(f);
      }
    }
    return pairs.length ? { slots: { pairs }, reveals } : null;
  },
  dialogue: (c) => {
    // turns: sentences (or labels); "Tên: lời" names the speaker, else speakers alternate
    // a speaker is a short name (≤ 3 words, no digits), not a lead-in like "Câu hỏi:", "Lưu ý:", "Bước 2:" or "Lúc 10:30"
    const SPK = /^([^:\d]{1,24}):\s*(.+)$/u;
    const NOT_NAME = /^(câu hỏi|lưu ý|ví dụ|bước|lúc|chú ý|kết luận|tóm lại|mẹo|gợi ý|nhớ|tip)(\s|$)/u;
    const raw = c.labelled ? c.ph.map((p) => ({ text: p.text, cue: p.cue })) : c.sents.map((s) => ({ text: s.text, cue: `sent:${s.k}.start` }));
    const names = [], turns = [], reveals = {};
    for (const r of raw) {
      if (turns.length === 4) break;
      const m0 = r.text.match(SPK);
      const m = m0 && m0[1].trim().split(/\s+/).length <= 3 && !NOT_NAME.test(norm(m0[1])) ? m0 : null;
      let who = turns.length ? 1 - turns.at(-1).who : 0;
      if (m) {
        const nm = fit(m[1].replace(/\s+(?:hỏi|nói|đáp|trả lời)$/iu, ""), 14);
        if (!nm) continue;
        who = names.findIndex((x) => norm(x) === norm(nm));
        if (who < 0) { if (names.length === 2) continue; who = names.push(nm) - 1; }
      }
      let text = fit(m ? m[2] : r.text, 72);
      if (!text) continue;
      if (/\?\s*$/.test(r.text) && [...text].length < 72) text += "?";
      reveals[`turns.${turns.length}`] = r.cue;
      turns.push({ who, text });
    }
    if (turns.length < 2 || !turns.some((x) => x.who === 0) || !turns.some((x) => x.who === 1)) return null;
    // two plain sentences are not a conversation: without "Tên: lời" turns, only a frame hinted `dialogue` becomes one
    if (names.length < 2 && c.frame.scene_hint !== "dialogue") return null;
    const def = ["Người hỏi", "Người đáp"];
    return { slots: { speakers: [0, 1].map((i) => ({ name: names[i] ?? def[i] })), turns }, reveals };
  },
  pyramid: (c) => {
    const it = items(c.ph, 22, 3, 5);
    if (!it) return null;
    const icons = iconsFor(it.map((x) => [x.t, c.sentOf(x.p)]));
    let lv = it.map((x, i) => ({ x, icon: icons[i] }));
    // levels[0] is the base: a list spoken from the top ("trên đỉnh là …") is turned over
    const first = norm(c.sentOf(it[0].p));
    if (/đỉnh|cao nhất|trên cùng/u.test(first) && !/nền|đáy|dưới cùng|cơ bản/u.test(first)) lv = lv.reverse();
    return { slots: { levels: lv.map((l) => ({ icon: l.icon, label: l.x.t })) },
      reveals: Object.fromEntries(lv.map((l, i) => [`levels.${i}`, cueOf(l.x)])) };
  },
  funnel: (c) => {
    const it = items(c.ph, 22, 3, 5);
    if (!it) return null;
    // a number said in a stage's sentence becomes its value; kept only when every stage has its own and they never grow
    const used = new Set();
    const val = it.map((x) => { const n = c.nums.find((v) => v.sent === x.p.sent && !used.has(v)); if (n) used.add(n); return n; });
    const withNum = val.every((n) => n && n.value <= 999999) && val.every((n, i) => !i || n.value <= val[i - 1].value);
    return { slots: { stages: it.map((x, i) => ({ label: x.t, ...(withNum ? { value: val[i].value, ...(val[i].suffix ? { suffix: val[i].suffix } : {}) } : {}) })) },
      reveals: Object.fromEntries(it.map((x, i) => [`stages.${i}`, cueOf(x)])) };
  },
  iceberg: (c) => {
    const it = items(c.ph, 26, 3, 5);
    const tip = it && fit(it[0].p.text, 22);
    if (!tip) return null;
    const hid = it.slice(1);
    const icons = iconsFor([[tip, c.sentOf(it[0].p)], ...hid.map((x) => [x.t, c.sentOf(x.p)])]);
    return { slots: { tip: { icon: icons[0], label: tip }, hidden: hid.map((x, i) => ({ icon: icons[i + 1], label: x.t })) },
      reveals: { tip: cueOf(it[0]), ...Object.fromEntries(hid.map((x, i) => [`hidden.${i}`, cueOf(x)])) } };
  },
  table: (c) => {
    // the compared things come from the frame title ("A và B", "A vs B", "A hay B"), the criteria from keyword phrases
    const cols = String(c.frame.title ?? "").split(/\s+(?:vs\.?|và|với|hay|so với)\s+/iu).map((s) => fit(s, 16));
    if (cols.length < 2 || cols.length > 3 || cols.some((x) => !x)) return null;
    const keys = cols.map((x) => norm(x));
    const NEG = /(^| )(không|chưa|chẳng|kém)( |$)/u;
    const rows = [];
    for (const p of c.ph) {
      const label = fit(p.text, 22);
      if (!label || keys.some((k) => norm(label).includes(k) || k.includes(norm(label)))) continue;
      // a cell is true when a clause of the row's sentence names the column without a negation
      const clauses = c.sentOf(p).split(/[,;]|\s(?:nhưng|còn|trong khi)\s/iu).map(norm);
      if (!keys.some((k) => clauses.some((cl) => cl.includes(k)))) continue;
      rows.push({ p, label, cells: keys.map((k) => clauses.some((cl) => cl.includes(k) && !NEG.test(cl))) });
      if (rows.length === 5) break;
    }
    if (rows.length < 2 || rows.every((r) => r.cells.every((v) => v === r.cells[0]))) return null;
    return { slots: { columns: cols, rows: rows.map(({ label, cells }) => ({ label, cells })) },
      reveals: { columns: "start+0.35", ...Object.fromEntries(rows.map((r, i) => [`rows.${i}`, r.p.cue])) } };
  },
  "question-hook": (c) => {
    const q = c.sents.find((s) => /[?？]\s*$/.test(s.text) && [...s.text.trim()].length <= 90);
    if (!q) return null;
    const t = q.text.trim().replace(/\s*[?？]$/, "?");
    const question = t.charAt(0).toUpperCase() + t.slice(1);
    const f = c.ph.find((p) => p.sent === q.k && norm(question).includes(norm(p.text)) && [...p.text].length <= 24);
    const opts = items(c.ph.filter((p) => p.sent > q.k), 24, 2, 3);
    return {
      slots: { question, ...(f ? { focus: f.text } : {}), ...(opts ? { options: opts.map((x) => x.t) } : {}) },
      reveals: { question: `sent:${q.k}.start`, ...(f ? { focus: f.cue } : {}),
        ...(opts ? Object.fromEntries(opts.map((x, i) => [`options.${i}`, cueOf(x)])) : {}) },
    };
  },
  balance: (c) => {
    let A, B;
    if (c.labelled) { const h = Math.ceil(c.ph.length / 2); A = c.ph.slice(0, h); B = c.ph.slice(h); }
    else {
      const mid = c.sents.length > 1 ? c.sents[Math.floor(c.sents.length / 2)].k : null;
      if (!mid) return null;
      A = c.ph.filter((p) => p.sent < mid); B = c.ph.filter((p) => p.sent >= mid);
    }
    const sentText = (p) => c.sents.find((s) => s.k === p.sent)?.text ?? "";
    const side = (ps) => {
      const it = items(ps, 22, 2, 4);
      const label = it && fit(it[0].p.text, 18);
      if (!label) return null;
      return { slots: { label, icon: iconFor(label, sentText(it[0].p)), items: it.slice(1).map((x) => x.t) },
        cues: it.map(cueOf), text: norm(ps.map((p) => `${p.text} ${sentText(p)}`).join(" ")), last: it.at(-1).p };
    };
    const L = side(A), R = side(B);
    if (!L || !R) return null;
    const POS = /lợi|tốt|nên|hiệu quả|nhanh|đúng|thắng|nặng hơn|vượt/g, NEG = /hại|xấu|chậm|tốn|rủi ro|sai|thua|nhẹ hơn/g;
    const tone = (s) => (s.text.match(POS)?.length ?? 0) - (s.text.match(NEG)?.length ?? 0);
    const d = tone(L) - tone(R);
    const tail = c.sents.find((s) => s.k > Math.max(L.last.sent, R.last.sent));
    const rv = (k, s) => Object.fromEntries(s.cues.map((cue, i) => [i ? `${k}.items.${i - 1}` : k, cue]));
    return { slots: { left: L.slots, right: R.slots, winner: d > 0 ? "left" : d < 0 ? "right" : "even" },
      reveals: { ...rv("left", L), ...rv("right", R), tip: tail ? `sent:${tail.k}.start` : `${R.cues.at(-1)}+0.6` } };
  },
  layers: (c) => {
    const it = items(c.ph, 22, 3, 5);
    if (!it) return null;
    const title = c.first ? fit(c.frame.title, 32) : null;
    const icons = iconsFor(it.map((x) => [x.t, c.sents.find((s) => s.k === x.p.sent)?.text ?? ""]));
    return { slots: { ...(title ? { title } : {}), layers: it.map((x, i) => ({ label: x.t, icon: icons[i] })) },
      reveals: Object.fromEntries(it.map((x, i) => [`layers.${i}`, cueOf(x)])) };
  },
  "card-objective": (c) => {
    if (c.labelled) {
      const it = c.ph.map((p) => ({ p, t: fit(p.text, 48) })).filter((x) => x.t).slice(0, 3);
      return it.length ? { slots: { items: it.map((x) => x.t) }, reveals: Object.fromEntries(it.map((x, i) => [`items.${i}`, cueOf(x)])) } : null;
    }
    // each objective is its sentence, or the sentence's keyword phrase when the sentence is longer than an item;
    // each item is revealed with its own sentence
    const it = c.sents.map((s) => ({ s, t: fit(s.text, 48) ?? fit(c.ph.find((p) => p.sent === s.k)?.text, 48) }))
      .filter((x) => x.t).slice(0, 3);
    return it.length ? { slots: { items: it.map((x) => x.t) }, reveals: Object.fromEntries(it.map((x, i) => [`items.${i}`, `sent:${x.s.k}.start`])) } : null;
  },
  "card-principle": (c) => {
    const s = c.sents.find((x) => [...x.text].length <= 90);
    if (!s) return null;
    const keyword = fit(c.ph.find((p) => p.sent === s.k)?.text, 18);
    return { slots: { text: s.text, ...(keyword ? { keyword } : {}) }, reveals: { text: `sent:${s.k}.start` } };
  },
  "card-antipattern": (c) => {
    if (c.sents.length < 2) return null;
    // the right side starts at the sentence that announces the right way ("cách làm đúng là…"), else at the half
    const turn = c.sents.findIndex((s, i) => i > 0 && /(?:^|\s)(?<!không\s)(?:đúng|thay vào đó|ngược lại)(?=\s|$)/u.test(norm(s.text)));
    const half = turn > 0 ? turn : Math.ceil(c.sents.length / 2);
    const side = (ss, plain) => {
      const ps = c.ph.filter((p) => ss.some((s) => s.k === p.sent));
      const lab = fit(ps[0]?.text, 20);
      const its = ss.map((s) => fit(s.text, 40)).filter(Boolean).slice(0, 3);
      if (lab && its.length) return { label: lab, items: its };
      // spoken sentences are often longer than an item: show the side's keyword phrases under a plain label
      const kws = ps.map((p) => fit(p.text, 40)).filter(Boolean).slice(0, 3);
      return kws.length ? { label: plain, items: kws } : null;
    };
    const wrong = side(c.sents.slice(0, half), "Cách làm sai"), right = side(c.sents.slice(half), "Cách làm đúng");
    if (!wrong || !right) return null;
    return { slots: { wrong, right }, reveals: { wrong: `sent:${c.sents[0].k}.start`, right: `sent:${c.sents[half].k}.start` } };
  },
  "card-case": (c) => {
    const [s1, s2, ...rest] = c.sents;
    const situation = fit(s1?.text, 90);
    const later = c.sents.slice(1).find((s) => fit(s.text, 60));
    const detail = later ? fit(later.text, 60) : fit(c.ph.find((p) => p.sent === s2?.k)?.text, 60);
    if (!situation || !detail) return null;
    const q = rest.find((s) => /\?$/.test(s.text.trim()));
    const question = q ? fit(q.text, 60) : null;
    return { slots: { situation, detail, ...(question ? { question } : {}) },
      reveals: { situation: `sent:${s1.k}.start`, detail: `sent:${(later ?? s2).k}.start`, ...(question ? { question: `sent:${q.k}.start` } : {}) } };
  },
  "card-exercise": (c) => {
    const task = fit(c.sents[0]?.text, 80);
    if (!task) return null;
    const steps = c.sents.slice(1).map((s) => fit(s.text, 40)).filter(Boolean).slice(0, 3);
    // the minutes are the ones the narration names ("5 phút"); any other number (e.g. "6 phần") is not a duration,
    // and without one the card keeps its quick-exercise default
    const said = Number(c.text.match(/(\d+)\s*phút/u)?.[1]);
    return { slots: { task, ...(said >= 1 && said <= 60 ? { minutes: said } : {}), ...(steps.length ? { steps } : {}) },
      reveals: { task: `sent:${c.sents[0].k}.start` } };
  },
  "card-quiz": (c) => {
    const q = c.sents.find((s) => /\?$/.test(s.text.trim()) && [...s.text].length <= 90);
    const opts = items(c.ph.filter((p) => !q || p.sent !== q.k), 40, 2, 3);
    if (!q || !opts) return null;
    // the options appear one by one right after the question, so the learner can think during the pause that follows;
    // the narration usually names them only while giving the answer, which lights when it is spoken
    return { slots: { question: q.text, options: opts.map((x) => x.t), answer: 0 },
      reveals: { question: `sent:${q.k}.start`,
        ...Object.fromEntries(opts.map((x, i) => [`options.${i}`, `sent:${q.k}.end+${(0.4 + 0.5 * i).toFixed(1)}`])),
        answer: cueOf(opts[0]) } };
  },
};

// ── solving ──────────────────────────────────────────────────────────────────
/**
 * Candidate templates for a shot, best first: the frame's scene_hint (first shot), what the content asks for (numbers →
 * stat, a comparison → split), then every other template, least used in the video so far first, so no template takes
 * over the lesson.
 */
function candidates(c, types, videoUsed, dir = null) {
  const hint = HINT[c.frame.scene_hint] ?? c.frame.scene_hint;
  const content = [];
  // director: every template whose `fit` matches what the shot says is a content candidate, least used first
  if (dir) {
    content.push(...Object.entries(dir.schemas).filter(([t, s]) => s.fit && t !== hint && fitOk(s.fit, c))
      .map(([t]) => t).sort((x, y) => (videoUsed.get(x) ?? 0) - (videoUsed.get(y) ?? 0)));
  }
  if (c.nums.length) content.push("stat");
  if (/thay vì|khác với|so với|ngược lại|trước đây/.test(norm(c.text)) && c.sents.length > 1) content.push("split");
  const general = c.ph.length >= 3
    ? ["cards", "flow", "hub", "journey", "anchor", "pictogram-scene", "kinetic", "zoom", "typewriter", "terminal"]
    : ["kinetic", "zoom", "pictogram-scene", "typewriter", "cards", "flow", "hub", "journey", "terminal"];
  const rest = general.map((t, k) => ({ t, k })).sort((x, y) => (videoUsed.get(x.t) ?? 0) - (videoUsed.get(y.t) ?? 0) || x.k - y.k)
    .map((x) => x.t);
  const hintHere = dir ? c.hintHere : c.first;
  const list = hintHere ? [hint, ...content, ...rest] : [...content, ...rest];
  return [...new Set(list)].filter((t) => BUILD[t] && (t !== "title" || c.first && hint === "title")
    && (!dir || !dir.schemas[t]?.fit || t === hint && hintHere || fitOk(dir.schemas[t].fit, c)));
}

/**
 * Does a shot's content suit a template? schema.json `fit` (all optional): minItems/maxItems — keyword phrases (or the
 * frame's labels) the shot holds; needsNumber — a counter is said; cue — a regex the shot's normalized text matches.
 */
export function fitOk(fit, c) {
  const n = Math.max(c.ph.length, c.labelsLeft ?? 0);
  if (fit.minItems != null && n < fit.minItems) return false;
  if (fit.maxItems != null && n > fit.maxItems) return false;
  if (fit.needsNumber && !c.nums.length) return false;
  if (fit.cue && !new RegExp(fit.cue, "u").test(norm(`${c.frame.title} ${c.text}`))) return false;
  return true;
}

function splitShots(sents, a, b, maxShot, minShot = 2.5, minN = 1) {
  const dur = b - a;
  let n = Math.max(minN, Math.min(3, Math.ceil(dur / maxShot), sents.length));
  for (; n <= Math.min(3, sents.length); n++) {
    // boundaries just before the first sentence of each later group, chosen nearest to an even split
    const cuts = [];
    for (let k = 1; k < n; k++) {
      const target = a + (dur * k) / n;
      const pick = sents.slice(1).filter((s) => !cuts.includes(s.k) && (!cuts.length || s.k > cuts.at(-1)))
        .sort((x, y) => Math.abs(x.start - 0.3 - target) - Math.abs(y.start - 0.3 - target))[0];
      if (pick) cuts.push(pick.k);
    }
    cuts.sort((x, y) => x - y);
    const edges = [a, ...cuts.map((k) => sents[k - 1].start - 0.3), b];
    const lens = edges.slice(1).map((e, i) => e - edges[i]);
    if (lens.every((l) => l <= maxShot + 0.01 && l >= minShot)) return cuts;
  }
  return null;
}

export async function solve({ P, cfg, estimated = false, seed = 20260928 }) {
  const read = (f) => JSON.parse(readFileSync(join(P, f), "utf8"));
  const script = read("script.json");
  const audioMeta = estimated ? null : read("audio_meta.json");
  const board = readStoryboard(readFileSync(join(P, "STORYBOARD.md"), "utf8"));
  const rate = existsSync(join(P, ".probe/rate.json")) ? read(".probe/rate.json").syllables_per_s : script.meta?.rate ?? 4.3;
  const types = new Set(cfg.scenes?.types ?? []);
  const maxShot = cfg.scenes?.maxShotS ?? 10;
  const titleLead = cfg.timing?.titleLead ?? 0.8;
  const schemas = {};
  for (const id of Object.keys(BUILD)) {
    if (!existsSync(join(TEMPLATES, id, "schema.json"))) continue;
    const s = (await loadTemplate(id)).schema;
    if (!types.size || types.has(s.family)) schemas[id] = s;
  }
  const chapters = script.chapters.map((ch, ci) => ({ ch, ci, frames: ch.frames }));
  const durationOf = (frame) => {
    const bf = board.find((b) => b.no === frame.id);
    return Number((estimated ? bf?.bullets.est_duration : bf?.bullets.duration ?? bf?.bullets.est_duration)?.replace("s", ""));
  };
  const recent = []; // last (template/variant) pairs
  const videoUsed = new Map(); // template → shots in the whole video
  let prevFamily = null;
  const frames = [];
  const stats = { shots: 0, fallbacks: 0, longSingle: 0, durations: new Map() };
  // director mode (scenes.director, projects from 0.8.0 on): long frames get several shots with the scene_hint's
  // template closing the frame, templates whose `fit` matches the content join the candidates, and a card family
  // changes its variant from one chapter to the next
  const D = cfg.scenes?.director === true;
  const longRule = cfg.scenes?.minShotsLongFrame ?? { overS: 12, min: 2 };
  const dir = D ? { schemas } : null;
  let prevChapterVariants = new Map(); // family → variants used in the previous chapter
  const videoPairs = new Set();

  for (const { ch, ci, frames: fs } of chapters) {
    const used = new Map();
    let signature = false;
    const chapterVariants = new Map();
    for (const [fi, frame] of fs.entries()) {
      const duration = durationOf(frame);
      const ctx = frameCtx(frame.id, script, audioMeta, duration, { estimated, timing: cfg.timing, rate });
      const allPh = phrases(ctx), allSents = sentences(ctx), allNums = numbers(ctx);
      const rng = mulberry32(seed + frame.id);
      stats.durations.set(frame.id, duration);
      // whole-frame cards (an exercise, a quiz, a case) need all of the frame's sentences: the director does not cut them
      // while they fit WHOLE_FRAME_MAX_S, so a hinted exercise never disappears into shorter windows
      const long = D && duration > longRule.overS && !(WHOLE_FAMILIES.has(schemas[HINT[frame.scene_hint] ?? frame.scene_hint]?.family)
        && duration <= WHOLE_FRAME_MAX_S);
      // a frame whose scene_hint names a template that can hold the whole frame is one shot of that template, up to
      // WHOLE_FRAME_MAX_S (a case, an exercise or a comparison needs all of its sentences); otherwise, or when the
      // template cannot be built from the whole frame, the frame is cut into shots
      const hintT = HINT[frame.scene_hint] ?? frame.scene_hint;
      const hintSchema = schemas[hintT];
      const nextHintFamily = fi + 1 < fs.length ? schemas[HINT[fs[fi + 1].scene_hint] ?? fs[fi + 1].scene_hint]?.family : null;
      const wholeFits = () => {
        const inWin = (t) => t < duration - 0.35;
        const c = { P, frame, chapter: ch, chapterIndex: ci, first: true, titleLead, ph: allPh.filter((p) => inWin(p.time)),
          nums: allNums.filter((n) => inWin(n.time)), sents: allSents, text: allSents.map((s) => s.text).join(" "),
          sentOf: (p) => allSents[p.sent - 1]?.text ?? "" };
        const built = BUILD[hintT]?.(c);
        return Boolean(built && !validate(hintSchema.slots, built.slots).length);
      };
      const whole0 = !long && Boolean(hintSchema && frame.scene_hint !== "title" && hintSchema.family !== prevFamily
        && hintSchema.family !== nextHintFamily && duration >= (hintSchema.duration?.min ?? 0) - 0.01
        && duration <= Math.max(hintSchema.duration?.max ?? maxShot, WHOLE_FRAME_MAX_S) + 0.01 && wholeFits());
      // the frame's windows for a list of sentence cuts: cut just before the next group's first keyword phrase (not at
      // its sentence start), so a new shot never waits long on bare structure; fall back to the sentence start when that
      // would break a shot's length limits
      const cutWindows = (cuts) => {
        const cutCues = cuts.map((k, j) => {
          const next = cuts[j + 1] ?? Infinity;
          const p = allPh.find((x) => x.sent >= k && x.sent < next);
          const sentEdge = allSents[k - 1].start - 0.3;
          const kwEdge = p ? r2(p.time - 0.6) : null;
          return kwEdge && kwEdge > sentEdge ? { t: kwEdge, cue: `${p.cue}-0.6`, alt: { t: sentEdge, cue: `sent:${k}.start-0.3` } }
            : { t: sentEdge, cue: `sent:${k}.start-0.3` };
        });
        const lens = (ts) => [0, ...ts, duration].slice(1).map((x, j, arr) => x - (j ? arr[j - 1] : 0));
        const ts = cutCues.map((c) => c.t);
        const ok = (xs) => lens(xs).every((l) => l <= maxShot + 0.01 && l >= 2.5);
        cutCues.forEach((c, j) => {
          if (c.alt && !ok(ts)) { ts[j] = c.alt.t; Object.assign(c, c.alt); }
        });
        const edges = [0, ...cutCues.map((c) => c.t), duration];
        const windows = edges.slice(1).map((b, i) => [
          i === 0 ? "start" : "prev.end",
          i === edges.length - 2 ? "end" : cutCues[i].cue,
        ]);
        return { edges, windows };
      };
      const shotCtxIn = (edges, i) => {
        const a = edges[i], b = edges[i + 1];
        const inWin = (t) => t >= a - 0.05 && t < b - 0.35;
        const anchor = (s) => allPh.find((p) => p.sent === s.k)?.time ?? s.start;
        const sents = allSents.filter((s) => anchor(s) >= a - 0.05 && anchor(s) < b);
        return {
          P, frame, chapter: ch, chapterIndex: ci, first: i === 0, titleLead,
          ph: allPh.filter((p) => inWin(p.time)), nums: allNums.filter((n) => inWin(n.time)), sents,
          text: sents.map((s) => s.text).join(" "), sentOf: (p) => allSents[p.sent - 1]?.text ?? "",
        };
      };
      // director: the hint's shot is the latest window whose content can build the hint's template (a title stays first);
      // window 0 does not count when the previous frame closed on the hint's family, which would block it
      const probeHint = (edges, windows) => {
        for (let i = windows.length - 1; i >= 0; i--) {
          if (i === 0 && hintSchema.family === prevFamily) continue;
          const probe = { ...shotCtxIn(edges, i), hintHere: true };
          const built = BUILD[hintT](frame.labels?.length && LABELED.has(hintT) ? withLabels(probe, frame.labels) : probe);
          if (built && !validate(hintSchema.slots, built.slots).length) return i;
        }
        return -1;
      };
      let whole = whole0;
      let { edges, windows } = cutWindows(whole ? [] : (long && splitShots(allSents, 0, duration, maxShot, 2.5, longRule.min))
        || splitShots(allSents, 0, duration, maxShot) || []);
      let hintShot = 0;
      if (D && hintT !== "title" && hintSchema && BUILD[hintT]) {
        hintShot = probeHint(edges, windows);
        // no window of the forced cut can show the hint: fall back to the plain cut, then to one whole-frame shot
        if (hintShot < 0 && long) {
          ({ edges, windows } = cutWindows(splitShots(allSents, 0, duration, maxShot) || []));
          hintShot = probeHint(edges, windows);
        }
        if (hintShot < 0 && !whole && duration <= WHOLE_FRAME_MAX_S && hintSchema.family !== prevFamily && wholeFits()) {
          whole = true;
          ({ edges, windows } = cutWindows([]));
          hintShot = 0;
        }
        if (hintShot < 0) hintShot = windows.length - 1;
      }
      let labelsUsed = false;
      const shots = [];
      const shotCtx = (i) => shotCtxIn(edges, i);
      for (let i = 0; i < windows.length; i++) {
        const a = edges[i], b = edges[i + 1];
        const c = {
          ...shotCtx(i),
          ...(D ? { hintHere: i === hintShot,
            labelsLeft: frame.labels?.length && !labelsUsed && (!LABELED.has(hintT) || i === hintShot) ? frame.labels.length : 0 } : {}),
        };
        const nextHint = fi + 1 < fs.length ? (HINT[fs[fi + 1].scene_hint] ?? fs[fi + 1].scene_hint) : null;
        const nextLong = D && nextHint && nextHint !== "title" && durationOf(fs[fi + 1]) > longRule.overS;
        let chosen = null;
        const cands = candidates(c, types, videoUsed, dir).filter((t) => schemas[t]);
        // the director's preferences (keep the hint's family for the closing shot, no half-empty split) give way when
        // nothing else fits the shot
        for (const relaxed of D ? [false, true] : [false]) {
        if (chosen) break;
        if (D) c.relaxed = relaxed;
        for (const [rank, t] of cands.entries()) {
          const schema = schemas[t];
          if (schema.family === prevFamily) continue;
          // director: the hint's family is kept for the frame's closing shot
          if (D && !c.relaxed && i < hintShot && hintSchema && hintT !== "title" && schema.family === hintSchema.family) continue;
          // the last shot must not share a family with the next frame's hint, which that frame will open with (under the
          // director a long next frame closes with its hint instead, unless it is a title)
          if (i === windows.length - 1 && nextHint && schemas[nextHint]?.family === schema.family && fs[fi + 1] && !nextLong) continue;
          const len = b - a, d = schema.duration ?? {};
          const wholeHint = whole && t === hintT;
          const max = wholeHint && d.max != null ? Math.max(d.max, WHOLE_FRAME_MAX_S) : d.max;
          if ((d.min != null && len < d.min - 0.01) || (max != null && len > max + 0.01)) continue;
          if (!wholeHint && !(D && c.hintHere && t === hintT) && t !== "title" && (used.get(t) ?? 0) >= 2 && cands.slice(rank + 1).some((x) => schemas[x] && (used.get(x) ?? 0) < 2 && schemas[x].family !== prevFamily)) continue;
          const lab = Boolean(frame.labels?.length && !labelsUsed && LABELED.has(t)
            && (t === hintT || !LABELED.has(hintT) || i === (D ? hintShot : windows.length - 1)));
          const built = BUILD[t](lab ? withLabels(c, frame.labels) : c);
          if (!built || validate(schema.slots, built.slots).length) continue;
          if (lab) labelsUsed = true;
          // reveals must fall inside the window: drop explicit cues that do not, the lint default then takes over
          for (const [k, cue] of Object.entries(built.reveals)) {
            try {
              const v = String(cue).split("..").map((x) => resolve(x, ctx, a));
              if (v[0] < a - 0.05 || v.at(-1) > b - (v.length > 1 ? 0 : 0.3)) delete built.reveals[k];
            } catch { delete built.reveals[k]; }
          }
          // a long silence before the shot's first keyword: bring its first element in early instead of leaving the
          // shot on its bare structure for more than 2 s
          const keys = (await loadTemplate(t)).mod.revealKeys(built.slots, schema.variants[0]);
          const k0 = keys[0];
          const rule0 = schema.reveals?.[k0] ?? schema.reveals?.[k0?.replace(/\.\d+$/, ".*")] ?? {};
          const t0 = built.reveals[k0] ? resolve(String(built.reveals[k0]).split("..")[0], ctx, a)
            : rule0.default === "kw" ? (c.ph[0]?.time ?? a) : a;
          if (k0 && t0 - a > 1.5) {
            const early = `${i === 0 ? "start" : "prev.end"}+0.35`;
            built.reveals[k0] = rule0.range && String(built.reveals[k0] ?? "").includes("..") ? `${early}..${String(built.reveals[k0]).split("..")[1]}` : early;
          }
          // looks added for the director (schema directorOnly) stay out of projects solved without it, so they re-solve as before
          const variants = D ? schema.variants : schema.variants.filter((v) => !(schema.directorOnly ?? []).includes(v));
          const fresh = variants.filter((v) => !recent.slice(-5).includes(`${t}/${v}`));
          let pool = fresh.length ? fresh : variants;
          if (D) {
            // a family changes its look from one chapter to the next, and a look not yet seen in the video comes first
            const notPrev = pool.filter((v) => !prevChapterVariants.get(schema.family)?.has(v));
            if (notPrev.length) pool = notPrev;
            const unseen = pool.filter((v) => !videoPairs.has(`${t}/${v}`));
            if (unseen.length) pool = unseen;
          }
          const sig = !signature && t !== "title" ? pool.filter((v) => (schema.signatures ?? []).includes(v)) : [];
          const variant = (sig.length ? sig : pool)[Math.floor(rng() * (sig.length ? sig.length : pool.length))];
          chosen = { template: t, variant, window: windows[i], slots: built.slots, ...(Object.keys(built.reveals).length ? { reveals: built.reveals } : {}) };
          if (rank > 0 && i === 0) stats.fallbacks++;
          if (t !== "title" && (schema.signatures ?? []).includes(variant)) signature = true;
          prevFamily = schema.family;
          break;
        }
        }
        if (!chosen) throw new Error(`frame ${frame.id} shot ${i + 1}: no template fits (${cands.join(", ")})`);
        if (D) {
          videoPairs.add(`${chosen.template}/${chosen.variant}`);
          const fam = schemas[chosen.template].family;
          if (!chapterVariants.has(fam)) chapterVariants.set(fam, new Set());
          chapterVariants.get(fam).add(chosen.variant);
        }
        used.set(chosen.template, (used.get(chosen.template) ?? 0) + 1);
        videoUsed.set(chosen.template, (videoUsed.get(chosen.template) ?? 0) + 1);
        recent.push(`${chosen.template}/${chosen.variant}`);
        shots.push(chosen);
        stats.shots++;
      }
      if (long && shots.length === 1) stats.longSingle++;
      frames.push({ frame: frame.id, shots });
    }
    prevChapterVariants = chapterVariants;
  }
  return { scenes: { version: 1, seed, frames }, stats };
}

if (resolvePath(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
  const P = process.cwd();
  if (!argv.includes("--auto")) { console.error("usage: solver.mjs --auto [--estimated] [--seed N] [--out scenes.json]"); process.exit(1); }
  const cfg = JSON.parse(readFileSync(join(P, "video.config.json"), "utf8"));
  const seed = Number(opt("--seed", cfg.scenes?.seed ?? 20260928));
  const estimated = argv.includes("--estimated");
  try {
    let { scenes, stats } = await solve({ P, cfg, estimated, seed });
    const card = cfg.scenes?.director === true ? cfg.scenes.scorecard ?? {} : null;
    if (card) {
      // the director's scorecard: the seed only moves variants, so reseed only while a seed-dependent limit is broken;
      // keep the best try (fewest violations, then the smallest summed relative excess, then the most distinct looks)
      const script = JSON.parse(readFileSync(join(P, "script.json"), "utf8"));
      const judge = (sc, st) => {
        const hints = new Map(script.chapters.flatMap((ch) => ch.frames.map((f) => [f.id, HINT[f.scene_hint] ?? f.scene_hint])));
        const metrics = score({ scenes: sc, script, durations: st.durations, longS: cfg.scenes.minShotsLongFrame?.overS ?? 12,
          wholeMaxS: WHOLE_FRAME_MAX_S, hints });
        const v = violations(metrics, card);
        const excess = v.reduce((n, x) => n + Math.abs(x.value - x.bound) / (x.bound || 1), 0);
        return { metrics, v, excess };
      };
      const SEEDED = new Set(["maxPairReuse", "distinctPairRatio"]);
      let best = { scenes, stats, seed, ...judge(scenes, stats) };
      const better = (x, y) => x.v.length - y.v.length || x.excess - y.excess || y.metrics.distinctPairRatio - x.metrics.distinctPairRatio;
      for (let k = 1; k <= (card.reseeds ?? 8) && best.v.some((x) => SEEDED.has(x.key)); k++) {
        const r = await solve({ P, cfg, estimated, seed: seed + k });
        const t = { ...r, seed: seed + k, ...judge(r.scenes, r.stats) };
        if (better(t, best) < 0) best = t;
      }
      ({ scenes, stats } = best);
      scenes.scorecard = { ok: !best.v.length, seed: best.seed, metrics: best.metrics, violations: best.v };
      for (const x of best.v) console.log(`solver: scorecard FAIL ${x.key}=${x.value} (${x.limit})`);
    }
    const out = opt("--out", "scenes.json");
    writeFileSync(join(P, out), JSON.stringify(scenes, null, 1) + "\n");
    const res = await analyze({ P: P, cfg, estimated });
    if (out !== "scenes.json") console.log("(lint ran on scenes.json; pass --out scenes.json to lint the new file)");
    const templates = new Set(scenes.frames.flatMap((f) => f.shots.map((s) => s.template))).size;
    for (const w of res.warnings) console.log(`⚠ ${w}`);
    for (const e of res.errors) console.log(`✗ ${e}`);
    console.log(`solver: ${scenes.frames.length} frames, ${stats.shots} shots, ${templates} templates used, seed ${scenes.scorecard?.seed ?? seed}, ${res.errors.length} lint error(s), ${res.warnings.length} warning(s)${scenes.scorecard?.ok ? ", scorecard ok" : ""}`);
    process.exit(res.errors.length ? 1 : 0);
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
}
