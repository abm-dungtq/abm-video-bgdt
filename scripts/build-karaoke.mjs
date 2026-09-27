#!/usr/bin/env node
// build-karaoke.mjs — compositions/captions.html: a 162 px karaoke band (bottom 15%) that shows
// a whole sentence (≤2 lines, ≤MAX_CHARS) and reveals it word by word as it is spoken
// (user feedback: short phrase lines felt choppy; words should appear one at a time). Replaces faceless-explainer's
// captions.mjs (180 px band, 2–4-word groups); assemble-index mounts it because it keys
// off compositions/captions.html existing.
//
//   node tools/build-karaoke.mjs           write captions.html + caption_groups.json
//   node tools/build-karaoke.mjs --check   validate groups against audio_meta.json

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { cfg, loadStoryboardParser, rgb } from "./lib/config.mjs";

const { parseStoryboard } = await loadStoryboardParser();

const W = 1920, H = 1080, BAND_TOP = 918, BAND_H = 162;
const { maxChars: MAX_CHARS, lead: LEAD, linger: LINGER } = cfg.karaoke;
const INK = cfg.design.ink, GOLD = cfg.design.accent, CANVAS_RGB = rgb(cfg.design.canvas);
// karaoke face (a theme may set karaoke.font); the default is the shipped Be Vietnam Pro SemiBold
const KF = cfg.karaoke.font ?? { family: "Be Vietnam Pro", weight: 600, file: "BeVietnamPro-SemiBold.ttf" };
const r3 = (x) => Number(x.toFixed(3));

const { frames } = parseStoryboard(readFileSync("STORYBOARD.md", "utf8"));
const meta = JSON.parse(readFileSync("audio_meta.json", "utf8"));
const script = JSON.parse(readFileSync("script.json", "utf8"));

// frame start times (cumulative storyboard durations — transitions never move starts)
const startOf = new Map();
let total = 0;
for (const f of frames) {
  startOf.set(f.number, total);
  total += f.durationSeconds ?? parseFloat(f.duration);
}
total = r3(total);

// sentence token counts per frame, to cut the frame's word list back into sentences
const sentencesByFrame = new Map(
  script.chapters.flatMap((c) => c.frames).map((f) => [f.id, f.sentences.map((s) => s.tokens.length)]),
);

function phrases(words) {
  // whole sentence when it fits; otherwise split at clause punctuation, then greedily at MAX_CHARS
  if (words.map((x) => x.text).join(" ").length <= MAX_CHARS) return [words];
  const clauses = [];
  let cur = [];
  for (const w of words) {
    cur.push(w);
    if (/[,.?!:;…]$/.test(w.text)) {
      clauses.push(cur);
      cur = [];
    }
  }
  if (cur.length) clauses.push(cur);
  const out = [];
  for (const clause of clauses) {
    let line = [];
    for (const w of clause) {
      const len = [...line, w].map((x) => x.text).join(" ").length;
      if (line.length && len > MAX_CHARS) {
        out.push(line);
        line = [];
      }
      line.push(w);
    }
    if (line.length) out.push(line);
  }
  // merge a dangling 1–2 word line into its predecessor when it still fits
  for (let i = out.length - 1; i > 0; i--) {
    const joined = [...out[i - 1], ...out[i]];
    if (out[i].length <= 2 && joined.map((x) => x.text).join(" ").length <= MAX_CHARS) out.splice(i - 1, 2, joined);
  }
  return out;
}

const groups = [];
for (const v of meta.voices) {
  const base = startOf.get(v.frame);
  if (base == null) throw new Error(`frame ${v.frame} missing from STORYBOARD.md`);
  const counts = sentencesByFrame.get(v.frame) ?? [v.words.length];
  let k = 0;
  for (const n of counts) {
    const sentence = v.words.slice(k, k + n).map((w) => ({ ...w, start: r3(base + w.start), end: r3(base + w.end) }));
    k += n;
    for (const p of phrases(sentence)) groups.push({ words: p, start: r3(p[0].start - LEAD), end: r3(p.at(-1).end + LINGER) });
  }
}
groups.sort((a, b) => a.start - b.start);
for (let i = 0; i < groups.length - 1; i++) {
  if (groups[i].end > groups[i + 1].start - 0.02) groups[i].end = r3(Math.max(groups[i].words.at(-1).end, groups[i + 1].start - 0.02));
}
for (const g of groups) g.end = Math.min(g.end, total);

if (process.argv.includes("--check")) {
  const errors = [];
  const allWords = meta.voices.flatMap((v) => v.words.map((w) => w.id));
  const seen = groups.flatMap((g) => g.words.map((w) => w.id));
  if (seen.length !== allWords.length || new Set(seen).size !== allWords.length) errors.push(`word coverage ${seen.length}/${allWords.length}`);
  groups.forEach((g, i) => {
    const text = g.words.map((w) => w.text).join(" ");
    if (text.length > MAX_CHARS && g.words.length > 1) errors.push(`group ${i} "${text}" is ${text.length} chars`);
    if (i && g.start < groups[i - 1].end) errors.push(`group ${i} overlaps the previous one`);
    if (g.words.at(-1).end > total + 0.01) errors.push(`group ${i} ends after the video`);
  });
  for (const e of errors.slice(0, 20)) console.error(`✗ ${e}`);
  console.log(`groups=${groups.length} words=${seen.length} total=${total}s ${errors.length ? "FAIL" : "ok"}`);
  process.exit(errors.length ? 1 : 0);
}

const data = groups.map((g) => ({ s: g.start, e: g.end, w: g.words.map((w) => [w.text, w.start, w.end]) }));
const html = `<template id="captions-template">
  <div data-composition-id="captions" data-width="${W}" data-height="${H}" data-duration="${total}" id="captions-root">
    <div id="cap-scrim"></div>
    <div id="cap"></div>
  </div>
  <style>
    @font-face{font-family:"${KF.family}";font-weight:${KF.weight};font-style:normal;font-display:block;src:url("assets/fonts/${KF.file}") format("truetype");}
    #captions-root { position: absolute; inset: 0; pointer-events: none; }
    #cap-scrim { position: absolute; left: 0; right: 0; top: ${BAND_TOP}px; height: ${BAND_H}px;
      background: linear-gradient(to top, rgba(${CANVAS_RGB},0.92), rgba(${CANVAS_RGB},0)); }
    #cap { position: absolute; left: 0; right: 0; top: ${BAND_TOP}px; height: ${BAND_H}px;
      display: flex; align-items: center; justify-content: center; }
    .caption-line { position: absolute; width: 1640px; left: 140px; text-align: center;
      font-family: "${KF.family}", sans-serif; font-weight: ${KF.weight}; font-size: 44px; line-height: 1.3;
      color: ${INK}; opacity: 0; }
    .caption-word { position: relative; display: inline-block; color: ${INK}; opacity: 0; padding: 0 0.12em; }
    .caption-bar { position: absolute; left: 0.12em; right: 0.12em; bottom: 0.02em; height: 4px; border-radius: 2px;
      background: ${GOLD}; transform-origin: left center; opacity: 0; }
  </style>
  <script src="${cfg.gsap}"></script>
  <script>
    (function () {
      var GROUPS = ${JSON.stringify(data).replace(/</g, "\\u003c")};
      var cap = document.getElementById("cap");
      var tl = gsap.timeline({ paused: true });
      GROUPS.forEach(function (g, gi) {
        var line = document.createElement("div");
        line.className = "caption-line";
        line.id = "caption-line-" + gi;
        g.w.forEach(function (w, wi) {
          var s = document.createElement("span");
          s.className = "caption-word";
          s.id = "caption-word-" + gi + "-" + wi;
          s.textContent = w[0];
          var bar = document.createElement("span");
          bar.className = "caption-bar";
          s.appendChild(bar);
          line.appendChild(s);
        });
        cap.appendChild(line);
        tl.fromTo(line, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" }, g.s);
        g.w.forEach(function (w, wi) {
          var s = line.children[wi], bar = s.lastChild;
          // reveal (opacity/y) is capped to the word's own span so it never outlives the colour reset
          tl.set(s, { color: "${GOLD}" }, w[1]);
          tl.fromTo(s, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: Math.min(0.12, Math.max(0.03, w[2] - w[1])), ease: "power2.out" }, w[1]);
          tl.fromTo(bar, { scaleX: 0, opacity: 1 }, { scaleX: 1, duration: Math.max(0.05, w[2] - w[1]), ease: "none" }, w[1]);
          tl.set(s, { color: "${INK}" }, w[2]);
          tl.set(bar, { opacity: 0 }, w[2]);
        });
        tl.to(line, { opacity: 0, duration: 0.15 }, Math.max(g.s + 0.2, g.e - 0.15));
        tl.set(line, { opacity: 0, visibility: "hidden" }, g.e);
      });
      tl.to({}, { duration: ${total} }, 0);
      window.__timelines = window.__timelines || {};
      window.__timelines["captions"] = tl;
    })();
  </script>
</template>
`;
mkdirSync("compositions", { recursive: true });
writeFileSync("compositions/captions.html", html);
writeFileSync("caption_groups.json", JSON.stringify(groups, null, 1));
writeFileSync("caption-overrides.json", "[]");
console.log(`captions.html: groups=${groups.length} total=${total}s`);
