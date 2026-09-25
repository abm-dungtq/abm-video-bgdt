#!/usr/bin/env node
// variety-lint.mjs — enforce the visual-variety rules on STORYBOARD.md `shots:` bullets.
//
//   - shots: kinetic@0-4.5, terminal@4.5-11.2     (frame-relative seconds)
//
// Rules: every frame has `blueprint` + `shots`; shots tile [0, duration] (±0.2 s);
// no consecutive shots share a type (across frame boundaries too); no shot > 10 s;
// each chapter uses ≥5 distinct types (≥3 for chapters with ≤4 frames); `terminal` only in
// the chapters listed in video.config.json `scenes.terminalChapters`; `title` only on a chapter's
// first frame, and every chapter's first frame is `title`. Types and the shot cap come from `scenes`.
//
//   node tools/variety-lint.mjs STORYBOARD.md

import { readFileSync } from "node:fs";
import { cfg, loadStoryboardParser } from "./lib/config.mjs";

const { parseStoryboard } = await loadStoryboardParser();

const TYPES = new Set(cfg.scenes.types);
const TERMINAL_CHAPTERS = new Set(cfg.scenes.terminalChapters);
const MAX_SHOT_S = cfg.scenes.maxShotS;

const path = process.argv[2] ?? "STORYBOARD.md";
const { frames } = parseStoryboard(readFileSync(path, "utf8"));
const errors = [];
const flat = [];
const chapterTypes = new Map();
const chapterFrames = new Map();
let prevChapter = null;

for (const f of frames) {
  const id = `frame ${f.number}`;
  const chapter = f.extra?.chapter;
  const duration = f.durationSeconds ?? parseFloat(f.duration);
  const first = chapter !== prevChapter;
  prevChapter = chapter;
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
  if (Math.abs(shots[0].a) > 0.2) errors.push(`${id}: shots start at ${shots[0].a}, not 0`);
  if (Math.abs(shots.at(-1).b - duration) > 0.2) errors.push(`${id}: shots end at ${shots.at(-1).b}, duration ${duration}`);
  shots.forEach((s, i) => {
    if (!TYPES.has(s.type)) errors.push(`${id}: type "${s.type}" not in catalog`);
    if (i && Math.abs(s.a - shots[i - 1].b) > 0.2) errors.push(`${id}: gap/overlap before shot ${i + 1}`);
    if (s.b - s.a > MAX_SHOT_S + 0.01) errors.push(`${id}: shot ${s.type} lasts ${(s.b - s.a).toFixed(1)}s > ${MAX_SHOT_S}s`);
    if (s.type === "terminal" && !TERMINAL_CHAPTERS.has(chapter)) errors.push(`${id}: terminal outside ${[...TERMINAL_CHAPTERS].join(", ")}`);
    if (s.type === "title" && !(first && i === 0)) errors.push(`${id}: title shot only as a chapter's first shot`);
    flat.push({ id, ...s });
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

for (const e of errors) console.error(`✗ ${e}`);
console.log(`frames=${frames.length} shots=${flat.length} ${errors.length ? `FAIL (${errors.length})` : "ok"}`);
process.exit(errors.length ? 1 : 0);
