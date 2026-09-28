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
import { analyze, loadTemplate, readStoryboard, TEMPLATES } from "./lint.mjs";
import { mulberry32 } from "./compile.mjs";
import { validate } from "./schema.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const r2 = (x) => Math.round(x * 100) / 100;
const ICONS = JSON.parse(readFileSync(join(HERE, "icon-words.json"), "utf8"));
const STOP = new Set(["một", "các", "những", "của", "và", "thì", "là", "cho", "với", "được", "này", "đó", "nó", "rồi", "cũng"]);
const HINT = { metaphor: "pictogram-scene", objective: "card-objective", principle: "card-principle", antipattern: "card-antipattern",
  case: "card-case", exercise: "card-exercise", quiz: "card-quiz" };
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

const BUILD = {
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
      const it = items(ps, 28, 2, 4);
      if (!it) return null;
      const title = fit(it[0].p.text, 24);
      return title ? { slots: { title, items: it.slice(1, 4).map((x) => x.t), icon: iconFor(it[0].t, c.sentOf(it[0].p)) }, cue: cueOf(it[0]) } : null;
    };
    const L = side(c.ph.filter((p) => p.sent < mid)), R = side(c.ph.filter((p) => p.sent >= mid));
    if (!L || !R) return null;
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
  "card-objective": (c) => {
    const it = c.sents.map((s) => fit(s.text, 48)).filter(Boolean).slice(0, 3);
    return it.length ? { slots: { items: it }, reveals: Object.fromEntries(c.sents.slice(0, it.length).map((s, i) => [`items.${i}`, `sent:${s.k}.start`])) } : null;
  },
  "card-principle": (c) => {
    const s = c.sents.find((x) => [...x.text].length <= 90);
    if (!s) return null;
    const keyword = fit(c.ph.find((p) => p.sent === s.k)?.text, 18);
    return { slots: { text: s.text, ...(keyword ? { keyword } : {}) }, reveals: { text: `sent:${s.k}.start` } };
  },
  "card-antipattern": (c) => {
    if (c.sents.length < 2) return null;
    const half = Math.ceil(c.sents.length / 2);
    const side = (ss) => {
      const lab = fit(c.ph.find((p) => ss.some((s) => s.k === p.sent))?.text, 20);
      const its = ss.map((s) => fit(s.text, 40)).filter(Boolean).slice(0, 3);
      return lab && its.length ? { label: lab, items: its } : null;
    };
    const wrong = side(c.sents.slice(0, half)), right = side(c.sents.slice(half));
    if (!wrong || !right) return null;
    return { slots: { wrong, right }, reveals: { wrong: `sent:${c.sents[0].k}.start`, right: `sent:${c.sents[half].k}.start` } };
  },
  "card-case": (c) => {
    const [s1, s2, ...rest] = c.sents;
    const situation = fit(s1?.text, 90), detail = fit(s2?.text, 60);
    if (!situation || !detail) return null;
    const q = rest.find((s) => /\?$/.test(s.text.trim()));
    const question = q ? fit(q.text, 60) : null;
    return { slots: { situation, detail, ...(question ? { question } : {}) },
      reveals: { situation: `sent:${s1.k}.start`, detail: `sent:${s2.k}.start`, ...(question ? { question: `sent:${q.k}.start` } : {}) } };
  },
  "card-exercise": (c) => {
    const task = fit(c.sents[0]?.text, 80);
    if (!task) return null;
    const steps = c.sents.slice(1).map((s) => fit(s.text, 40)).filter(Boolean).slice(0, 3);
    return { slots: { task, minutes: c.nums[0]?.value && c.nums[0].value <= 60 ? c.nums[0].value : 5, ...(steps.length ? { steps } : {}) },
      reveals: { task: `sent:${c.sents[0].k}.start` } };
  },
  "card-quiz": (c) => {
    const q = c.sents.find((s) => /\?$/.test(s.text.trim()) && [...s.text].length <= 90);
    const opts = items(c.ph.filter((p) => !q || p.sent !== q.k), 40, 2, 3);
    if (!q || !opts) return null;
    return { slots: { question: q.text, options: opts.map((x) => x.t), answer: 0 },
      reveals: { question: `sent:${q.k}.start`, ...Object.fromEntries(opts.map((x, i) => [`options.${i}`, cueOf(x)])) } };
  },
};

// ── solving ──────────────────────────────────────────────────────────────────
/** Candidate templates for a shot, best first. */
function candidates(c, types) {
  const hint = HINT[c.frame.scene_hint] ?? c.frame.scene_hint;
  const content = [];
  if (c.nums.length) content.push("stat");
  if (/thay vì|khác với|so với|ngược lại|trước đây/.test(norm(c.text)) && c.sents.length > 1) content.push("split");
  if (c.ph.length >= 3) content.push("cards", "flow", "hub", "journey", "anchor", "pictogram-scene");
  content.push("kinetic", "zoom", "pictogram-scene", "typewriter", "cards", "flow", "terminal");
  const list = c.first ? [hint, ...content] : content;
  return [...new Set(list)].filter((t) => BUILD[t] && (t !== "title" || c.first && hint === "title"));
}

function splitShots(sents, a, b, maxShot, minShot = 2.5) {
  const dur = b - a;
  let n = Math.max(1, Math.min(3, Math.ceil(dur / maxShot), sents.length));
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
  const recent = []; // last (template/variant) pairs
  let prevFamily = null;
  const frames = [];
  const stats = { shots: 0, fallbacks: 0 };

  for (const { ch, ci, frames: fs } of chapters) {
    const used = new Map();
    let signature = false;
    for (const [fi, frame] of fs.entries()) {
      const bf = board.find((b) => b.no === frame.id);
      const duration = Number((estimated ? bf?.bullets.est_duration : bf?.bullets.duration ?? bf?.bullets.est_duration)?.replace("s", ""));
      const ctx = frameCtx(frame.id, script, audioMeta, duration, { estimated, timing: cfg.timing, rate });
      const allPh = phrases(ctx), allSents = sentences(ctx), allNums = numbers(ctx);
      const rng = mulberry32(seed + frame.id);
      const cuts = splitShots(allSents, 0, duration, maxShot) ?? [];
      // cut just before the next group's first keyword phrase (not at its sentence start), so a new shot never waits
      // long on bare structure; fall back to the sentence start when that would break a shot's length limits
      const cutCues = cuts.map((k, j) => {
        const next = cuts[j + 1] ?? Infinity;
        const p = allPh.find((x) => x.sent >= k && x.sent < next);
        const sentEdge = allSents[k - 1].start - 0.3;
        const kwEdge = p ? r2(p.time - 0.6) : null;
        return kwEdge && kwEdge > sentEdge ? { t: kwEdge, cue: `${p.cue}-0.6`, alt: { t: sentEdge, cue: `sent:${k}.start-0.3` } }
          : { t: sentEdge, cue: `sent:${k}.start-0.3` };
      });
      const lens = (ts) => [0, ...ts, duration].slice(1).map((x, j, arr) => x - (j ? arr[j - 1] : 0));
      let ts = cutCues.map((c) => c.t);
      const ok = (xs) => lens(xs).every((l) => l <= maxShot + 0.01 && l >= 2.5);
      cutCues.forEach((c, j) => {
        if (c.alt && !ok(ts)) { ts[j] = c.alt.t; Object.assign(c, c.alt); }
      });
      const edges = [0, ...cutCues.map((c) => c.t), duration];
      const windows = edges.slice(1).map((b, i) => [
        i === 0 ? "start" : "prev.end",
        i === edges.length - 2 ? "end" : cutCues[i].cue,
      ]);
      const shots = [];
      for (let i = 0; i < windows.length; i++) {
        const a = edges[i], b = edges[i + 1];
        const inWin = (t) => t >= a - 0.05 && t < b - 0.35;
        const anchor = (s) => allPh.find((p) => p.sent === s.k)?.time ?? s.start;
        const sents = allSents.filter((s) => anchor(s) >= a - 0.05 && anchor(s) < b);
        const c = {
          P, frame, chapter: ch, chapterIndex: ci, first: i === 0, titleLead,
          ph: allPh.filter((p) => inWin(p.time)), nums: allNums.filter((n) => inWin(n.time)), sents,
          text: sents.map((s) => s.text).join(" "), sentOf: (p) => allSents[p.sent - 1]?.text ?? "",
        };
        const nextHint = fi + 1 < fs.length ? (HINT[fs[fi + 1].scene_hint] ?? fs[fi + 1].scene_hint) : null;
        let chosen = null;
        const cands = candidates(c, types).filter((t) => schemas[t]);
        for (const [rank, t] of cands.entries()) {
          const schema = schemas[t];
          if (schema.family === prevFamily) continue;
          // the last shot must not share a family with the next frame's hint, which that frame will open with
          if (i === windows.length - 1 && nextHint && schemas[nextHint]?.family === schema.family && fs[fi + 1]) continue;
          const len = b - a, d = schema.duration ?? {};
          if ((d.min != null && len < d.min - 0.01) || (d.max != null && len > d.max + 0.01)) continue;
          if (t !== "title" && (used.get(t) ?? 0) >= 2 && cands.slice(rank + 1).some((x) => schemas[x] && (used.get(x) ?? 0) < 2 && schemas[x].family !== prevFamily)) continue;
          const built = BUILD[t](c);
          if (!built || validate(schema.slots, built.slots).length) continue;
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
          const variants = schema.variants;
          const fresh = variants.filter((v) => !recent.slice(-5).includes(`${t}/${v}`));
          const pool = fresh.length ? fresh : variants;
          const sig = !signature && t !== "title" ? pool.filter((v) => (schema.signatures ?? []).includes(v)) : [];
          const variant = (sig.length ? sig : pool)[Math.floor(rng() * (sig.length ? sig.length : pool.length))];
          chosen = { template: t, variant, window: windows[i], slots: built.slots, ...(Object.keys(built.reveals).length ? { reveals: built.reveals } : {}) };
          if (rank > 0 && i === 0) stats.fallbacks++;
          if (t !== "title" && (schema.signatures ?? []).includes(variant)) signature = true;
          prevFamily = schema.family;
          break;
        }
        if (!chosen) throw new Error(`frame ${frame.id} shot ${i + 1}: no template fits (${cands.join(", ")})`);
        used.set(chosen.template, (used.get(chosen.template) ?? 0) + 1);
        recent.push(`${chosen.template}/${chosen.variant}`);
        shots.push(chosen);
        stats.shots++;
      }
      frames.push({ frame: frame.id, shots });
    }
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
    const { scenes, stats } = await solve({ P, cfg, estimated, seed });
    const out = opt("--out", "scenes.json");
    writeFileSync(join(P, out), JSON.stringify(scenes, null, 1) + "\n");
    const res = await analyze({ P: P, cfg, estimated });
    if (out !== "scenes.json") console.log("(lint ran on scenes.json; pass --out scenes.json to lint the new file)");
    const templates = new Set(scenes.frames.flatMap((f) => f.shots.map((s) => s.template))).size;
    for (const w of res.warnings) console.log(`⚠ ${w}`);
    for (const e of res.errors) console.log(`✗ ${e}`);
    console.log(`solver: ${scenes.frames.length} frames, ${stats.shots} shots, ${templates} templates used, seed ${seed}, ${res.errors.length} lint error(s), ${res.warnings.length} warning(s)`);
    process.exit(res.errors.length ? 1 : 0);
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
}
