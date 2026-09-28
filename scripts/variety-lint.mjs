#!/usr/bin/env node
// variety-lint.mjs — enforce the visual-variety rules on STORYBOARD.md `shots:` bullets.
//
//   - shots: kinetic@0-4.5, terminal@4.5-11.2     (frame-relative seconds)
//   - layout: split-50, custom-orbit-ring          (optional; one token per shot, same order)
//   - role: core                                   (optional; from ### markers in script.src.txt)
//
// Rules: every frame has `blueprint` + `shots`; shots tile [0, duration] (±0.2 s);
// no consecutive shots share a type (across frame boundaries too); no shot > 10 s;
// each chapter uses ≥5 distinct types (≥3 for chapters with ≤4 frames); `terminal` only in
// the chapters listed in video.config.json `scenes.terminalChapters`; `title` only on a chapter's
// first frame, and every chapter's first frame is `title`. Types and the shot cap come from `scenes`.
//
// Layouts (only for frames with `- layout:`). The library in video.config.json `layouts.catalog` is a set of
// inspiration pieces, never a closed list: `custom-<name>` is always valid.
//   errors   L1 token count = shot count · L2 token is a catalog piece, a card layout or custom-<name> ·
//            L5 a DNA card shot uses its `layouts.fixed` token
//   warnings L3 no layout repeats the previous shot · L4 ≥ minDistinctPerChapter layouts per chapter ·
//            L6 no layout above maxShare of shots; every chapter has a custom-* layout
// DNA BGĐT (only when `dna.enabled`; warnings, errors under `dna.strict`). Content chapters = all but the
// first and the last: D1 roles in hook → core → case → action order, none missing · D2 the second frame opens
// with `objective` · D3 at least one `antipattern` and one `exercise` shot · D4 `quiz` only in the last
// chapter · D5 an `exercise` frame has role `action`.
// Structure (only when video.config.json has `structure`): S1 error, more `exercise` shots in the whole video than
// `structure.maxExercise` · S2 warning, two content chapters run the same sequence of shot types.
//
//   node tools/variety-lint.mjs STORYBOARD.md

import { readFileSync } from "node:fs";
import { cfg, DNA, LAYOUTS, loadStoryboardParser, ROLES, STRUCTURE } from "./lib/config.mjs";

const { parseStoryboard } = await loadStoryboardParser();

const TYPES = new Set(cfg.scenes.types);
const TERMINAL_CHAPTERS = new Set(cfg.scenes.terminalChapters);
const MAX_SHOT_S = cfg.scenes.maxShotS;
const CARD_LAYOUTS = new Set(Object.values(LAYOUTS.fixed));
const CUSTOM = /^custom-[a-z0-9]+(-[a-z0-9]+)*$/;

const path = process.argv[2] ?? "STORYBOARD.md";
const { frames } = parseStoryboard(readFileSync(path, "utf8"));
const errors = [];
const warnings = [];
let dnaWarnCount = 0;
const dna = (msg) => {
  (DNA.strict ? errors : warnings).push(msg);
  dnaWarnCount++;
};
const flat = [];
const chapterTypes = new Map();
const chapterFrames = new Map();
const chapterOrder = [];
const frameInfo = [];
let prevChapter = null;

for (const f of frames) {
  const id = `frame ${f.number}`;
  const chapter = f.extra?.chapter;
  const role = f.extra?.role;
  const duration = f.durationSeconds ?? parseFloat(f.duration);
  const first = chapter !== prevChapter;
  prevChapter = chapter;
  if (first) chapterOrder.push(chapter);
  chapterFrames.set(chapter, (chapterFrames.get(chapter) ?? 0) + 1);
  if (!f.extra?.blueprint) errors.push(`${id}: missing blueprint`);
  const raw = f.extra?.shots;
  if (!raw) {
    errors.push(`${id}: missing shots`);
    continue;
  }
  const shots = raw.split(",").map((s) => s.trim()).filter(Boolean).map((s) => {
    const m = s.match(/^([a-z]+)@(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
    if (!m) {
      errors.push(`${id}: bad shot "${s}"`);
      return null;
    }
    return { type: m[1], a: +m[2], b: +m[3] };
  }).filter(Boolean);
  if (!shots.length) continue;
  frameInfo.push({ id, number: f.number, chapter, role, shots });
  if (Math.abs(shots[0].a) > 0.2) errors.push(`${id}: shots start at ${shots[0].a}, not 0`);
  if (Math.abs(shots.at(-1).b - duration) > 0.2) errors.push(`${id}: shots end at ${shots.at(-1).b}, duration ${duration}`);

  let toks = null;
  if (f.extra?.layout) {
    toks = f.extra.layout.split(",").map((s) => s.trim()).filter(Boolean);
    if (toks.length !== shots.length) errors.push(`${id}: layout has ${toks.length} token(s) for ${shots.length} shot(s)`);
    for (const tok of toks) {
      if (!LAYOUTS.catalog.includes(tok) && !CARD_LAYOUTS.has(tok) && !CUSTOM.test(tok))
        errors.push(`${id}: layout "${tok}" is not in layouts.catalog, not a card layout and not custom-<name>`);
    }
    if (toks.length !== shots.length) toks = null;
  }

  shots.forEach((s, i) => {
    if (!TYPES.has(s.type)) errors.push(`${id}: type "${s.type}" not in catalog`);
    if (i && Math.abs(s.a - shots[i - 1].b) > 0.2) errors.push(`${id}: gap/overlap before shot ${i + 1}`);
    if (s.b - s.a > MAX_SHOT_S + 0.01) errors.push(`${id}: shot ${s.type} lasts ${(s.b - s.a).toFixed(1)}s > ${MAX_SHOT_S}s`);
    if (s.type === "terminal" && !TERMINAL_CHAPTERS.has(chapter)) errors.push(`${id}: terminal outside ${[...TERMINAL_CHAPTERS].join(", ")}`);
    if (s.type === "title" && !(first && i === 0)) errors.push(`${id}: title shot only as a chapter's first shot`);
    if (toks && LAYOUTS.fixed[s.type] && toks[i] !== LAYOUTS.fixed[s.type]) errors.push(`${id}: ${s.type} shot must use layout ${LAYOUTS.fixed[s.type]}`);
    flat.push({ id, ...s, layout: toks?.[i], chapter, role });
    if (!chapterTypes.has(chapter)) chapterTypes.set(chapter, new Set());
    chapterTypes.get(chapter).add(s.type);
  });
  if (first && shots[0].type !== "title") errors.push(`${id}: chapter ${chapter} must open with a title shot`);
}
flat.forEach((s, i) => {
  if (i && s.type === flat[i - 1].type) errors.push(`${s.id}: "${s.type}" repeats the previous shot (${flat[i - 1].id})`);
});
for (const [chapter, types] of chapterTypes) {
  const need = (chapterFrames.get(chapter) ?? 0) <= 4 ? 3 : 5;
  if (types.size < need) errors.push(`${chapter}: only ${types.size} distinct types (need ≥${need})`);
}

// ── layouts: anti-boredom warnings ───────────────────────────────────────────
const withLayout = flat.filter((s) => s.layout);
if (withLayout.length) {
  flat.forEach((s, i) => {
    if (i && s.layout && s.layout === flat[i - 1].layout) warnings.push(`${s.id}: layout "${s.layout}" repeats the previous shot (${flat[i - 1].id})`);
  });
  const byChapter = new Map();
  for (const s of withLayout) {
    if (!byChapter.has(s.chapter)) byChapter.set(s.chapter, []);
    byChapter.get(s.chapter).push(s.layout);
  }
  for (const [chapter, list] of byChapter) {
    const k = new Set(list).size;
    if (k < LAYOUTS.minDistinctPerChapter) warnings.push(`${chapter}: only ${k} distinct layouts (want ≥${LAYOUTS.minDistinctPerChapter})`);
    if (LAYOUTS.requireCustomPerChapter && !list.some((t) => t.startsWith("custom-"))) warnings.push(`${chapter}: no custom-* layout (invent at least one)`);
  }
  const counts = new Map();
  for (const s of withLayout) if (!s.layout.startsWith("card-")) counts.set(s.layout, (counts.get(s.layout) ?? 0) + 1);
  for (const [tok, n] of counts) {
    if (n / withLayout.length > LAYOUTS.maxShare)
      warnings.push(`layout "${tok}" is ${Math.round((100 * n) / withLayout.length)}% of shots (max ${Math.round(100 * LAYOUTS.maxShare)}%)`);
  }
}

// ── DNA BGĐT roles and cards ─────────────────────────────────────────────────
if (DNA.enabled) {
  if (!frameInfo.some((f) => f.role)) dna("dna: no frame has a role (add ### hook|core|case|action to script.src.txt)");
  else {
    const last = chapterOrder.at(-1);
    for (const chapter of chapterOrder.slice(1, -1)) {
      const fs = frameInfo.filter((f) => f.chapter === chapter);
      let prevRole = null;
      for (const f of fs) {
        if (!f.role) continue;
        if (prevRole && ROLES.indexOf(f.role) < ROLES.indexOf(prevRole)) dna(`${chapter}: role ${f.role} (frame ${f.number}) comes after ${prevRole}`);
        prevRole = f.role;
      }
      for (const r of ROLES) if (!fs.some((f) => f.role === r)) dna(`${chapter}: missing role ${r}`);
      if (fs[1] && fs[1].shots[0].type !== "objective") dna(`${chapter}: second frame should open with an objective shot`);
      const types = new Set(fs.flatMap((f) => f.shots.map((s) => s.type)));
      if (!types.has("antipattern")) dna(`${chapter}: no antipattern shot`);
      if (!types.has("exercise")) dna(`${chapter}: no exercise shot`);
    }
    for (const f of frameInfo) {
      if (f.shots.some((s) => s.type === "quiz") && f.chapter !== last) dna(`${f.id}: quiz belongs in the last chapter`);
      if (f.shots.some((s) => s.type === "exercise") && f.role !== "action") dna(`${f.id}: exercise frame should have role action`);
    }
  }
}

// ── free structure: exercise cap, no two chapters on the same arc ─────────────
if (STRUCTURE) {
  const ex = flat.filter((s) => s.type === "exercise").length;
  if (ex > STRUCTURE.maxExercise) errors.push(`${ex} exercise shots in the video (max ${STRUCTURE.maxExercise}) (S1)`);
  if (STRUCTURE.distinctChapterArcs) {
    const content = chapterOrder.slice(1, -1);
    const seq = new Map(content.map((c) => [c, flat.filter((s) => s.chapter === c).map((s) => s.type).join(">")]));
    content.forEach((a, i) => content.slice(i + 1).forEach((b) => {
      if (seq.get(a) && seq.get(a) === seq.get(b)) warnings.push(`${a} and ${b} run the same scene sequence (S2)`);
    }));
  }
}

for (const w of warnings) console.error(`⚠ ${w}`);
for (const e of errors) console.error(`✗ ${e}`);
const layoutsInfo = withLayout.length ? String(withLayout.length) : "skipped";
const dnaInfo = !DNA.enabled ? "off" : dnaWarnCount ? `${dnaWarnCount} warning(s)` : "ok";
console.log(`frames=${frames.length} shots=${flat.length} layouts=${layoutsInfo} dna=${dnaInfo} ${errors.length ? `FAIL (${errors.length})` : "ok"}`);
process.exit(errors.length ? 1 : 0);
