#!/usr/bin/env node
// build-overlay.mjs — compositions/overlay.html: the learner-orientation layer that sits
// above the frames and below the karaoke band.
//   - progress bar (y 0–6 px, gold fill over the whole video, a tick per chapter start)
//   - chapter label (top-left, video.config.json `chapterLabel.overlay`, swaps at each chapter start)
//   - courier trail: at every chapter start a golden S-curve draws across the frame with a
//     winged spark riding its head (the "Sứ giả" signature motif)
//   - role chip (top-right, only when the storyboard has - role: bullets; labels from dna.roleLabels)

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { cfg, chapterLabel, DNA, loadStoryboardParser, rgb } from "./lib/config.mjs";

const { parseStoryboard } = await loadStoryboardParser();

const GOLD = cfg.design.accent, INK = cfg.design.ink;
const r3 = (x) => Number(x.toFixed(3));
const { frames } = parseStoryboard(readFileSync("STORYBOARD.md", "utf8"));
const script = JSON.parse(readFileSync("script.json", "utf8"));
const titles = new Map(script.chapters.map((c, i) => [c.id, { n: i, title: c.title }]));

let t = 0, prev = null;
const chapters = [];
const roleRuns = [];
for (const f of frames) {
  const ch = f.extra?.chapter;
  if (ch !== prev) chapters.push({ id: ch, start: r3(t), ...titles.get(ch) });
  prev = ch;
  const role = f.extra?.role ?? null;
  if (role !== (roleRuns.at(-1)?.role ?? null)) roleRuns.push({ role, start: r3(t) });
  t += f.durationSeconds ?? parseFloat(f.duration);
}
const total = r3(t);

// role chip: one run per stretch of frames sharing a role; absent roles leave the overlay unchanged
const runs = roleRuns
  .map((r, i) => ({ ...r, end: i + 1 < roleRuns.length ? roleRuns[i + 1].start : total }))
  .filter((r) => r.role);
const roleHtml = runs.length
  ? `\n    <div id="ov-roles">${runs.map((r, i) => `<div class="ov-role" id="ov-role-${i}">${DNA.roleLabels[r.role]}</div>`).join("")}</div>`
  : "";
const roleCss = runs.length
  ? `\n    .ov-role { position: absolute; right: 40px; top: 18px; padding: 4px 14px; border-radius: 16px; font-family: "JetBrains Mono", monospace; font-size: 20px; letter-spacing: 0.08em; color: ${GOLD}; background: rgba(${rgb(INK)},0.08); opacity: 0; white-space: nowrap; }`
  : "";
const roleScript = runs
  .map((r, i) => `\n      tl.fromTo("#ov-role-${i}", { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.3 }, ${r.start});` +
    `\n      tl.to("#ov-role-${i}", { opacity: 0, duration: 0.3 }, ${r3(Math.max(r.start + 0.4, r.end - 0.3))});`)
  .join("");
const pct = (x) => ((x / total) * 100).toFixed(3);

const ticks = chapters.slice(1).map((c) => `<i class="ov-tick" style="left:${pct(c.start)}%"></i>`).join("");
const labels = chapters
  .map((c, i) => `<div class="ov-label" id="ov-label-${i}">${chapterLabel(cfg.chapterLabel.overlay, c.n, c.title)}</div>`)
  .join("\n      ");
const trails = chapters
  .slice(1)
  .map(
    (c, i) => `<svg class="ov-trail" id="ov-trail-${i}" viewBox="0 0 1920 1080" width="1920" height="1080">
        <path id="ov-path-${i}" d="M -60 ${760 - (i % 3) * 120} C 420 ${420 + (i % 2) * 180}, 1100 ${980 - (i % 2) * 260}, 1980 ${300 + (i % 3) * 110}"
          fill="none" stroke="${GOLD}" stroke-width="5" stroke-linecap="round" pathLength="1000" stroke-dasharray="1000" stroke-dashoffset="1000"/>
        <g id="ov-spark-${i}" opacity="0">
          <circle r="9" fill="${GOLD}"/>
          <path d="M -4 -4 C -26 -30, -46 -18, -52 -6 C -38 -10, -24 -6, -4 0 Z" fill="${INK}" opacity="0.9"/>
          <path d="M -4 4 C -26 30, -46 18, -52 6 C -38 10, -24 6, -4 0 Z" fill="${INK}" opacity="0.7"/>
        </g>
      </svg>`,
  )
  .join("\n      ");

const script_ = chapters
  .map((c, i) => {
    const end = i + 1 < chapters.length ? chapters[i + 1].start : total;
    return `tl.fromTo("#ov-label-${i}", { opacity: 0, x: -16 }, { opacity: 1, x: 0, duration: 0.3 }, ${c.start});
      tl.to("#ov-label-${i}", { opacity: 0, duration: 0.3 }, ${r3(Math.max(c.start + 0.4, end - 0.3))});`;
  })
  .join("\n      ");
const trailScript = chapters
  .slice(1)
  .map(
    (c, i) => `drawTrail(${i}, ${r3(Math.max(0, c.start - 0.5))});`,
  )
  .join("\n      ");

const html = `<template id="overlay-template">
  <div data-composition-id="overlay" data-width="1920" data-height="1080" data-duration="${total}" id="overlay-root">
    <div id="ov-progress"><div id="ov-fill"></div>${ticks}</div>
    <div id="ov-labels">
      ${labels}
    </div>
    <div id="ov-trails">
      ${trails}
    </div>${roleHtml}
  </div>
  <style>
    @font-face{font-family:"JetBrains Mono";font-weight:400;font-style:normal;font-display:block;src:url("assets/fonts/JetBrainsMono-Regular.ttf") format("truetype");}
    #overlay-root { position: absolute; inset: 0; pointer-events: none; }
    #ov-progress { position: absolute; left: 0; right: 0; top: 0; height: 6px; background: rgba(${rgb(INK)},0.10); }
    #ov-fill { position: absolute; left: 0; top: 0; bottom: 0; width: 100%; background: ${GOLD}; transform-origin: left center; }
    .ov-tick { position: absolute; top: 0; width: 3px; height: 10px; margin-left: -1px; background: ${INK}; opacity: 0.7; }
    .ov-label { position: absolute; left: 40px; top: 22px; font-family: "JetBrains Mono", monospace; font-size: 22px;
      letter-spacing: 0.04em; color: ${INK}; opacity: 0; white-space: nowrap; }
    .ov-trail { position: absolute; left: 0; top: 0; filter: drop-shadow(0 0 10px rgba(${rgb(GOLD)},0.7)); }${roleCss}
  </style>
  <script src="${cfg.gsap}"></script>
  <script>
    (function () {
      var tl = gsap.timeline({ paused: true });
      tl.fromTo("#ov-fill", { scaleX: 0 }, { scaleX: 1, duration: ${total}, ease: "none" }, 0);
      ${script_}
      function drawTrail(i, t0) {
        var path = document.getElementById("ov-path-" + i);
        var spark = document.getElementById("ov-spark-" + i);
        // Sample the path once at build time: the spark rides seek-safe keyframes, never a callback.
        var len = path.getTotalLength(), N = 24, frames = [];
        for (var k = 0; k <= N; k++) {
          var pt = path.getPointAtLength((k / N) * len);
          var ahead = path.getPointAtLength(Math.min(len, (k / N) * len + 2));
          frames.push({ x: pt.x, y: pt.y, rotation: Math.atan2(ahead.y - pt.y, ahead.x - pt.x) * 180 / Math.PI, duration: 0.9 / N, ease: "none" });
        }
        tl.fromTo(path, { attr: { "stroke-dashoffset": 1000 } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.9, ease: "none" }, t0);
        tl.set(spark, { opacity: 1, x: frames[0].x, y: frames[0].y }, t0);
        tl.to(spark, { keyframes: frames.slice(1) }, t0);
        tl.to(path, { opacity: 0, duration: 0.35 }, t0 + 0.9);
        tl.set(spark, { opacity: 0 }, t0 + 0.9);
      }
      ${trailScript}${roleScript}
      tl.to({}, { duration: ${total} }, 0);
      window.__timelines = window.__timelines || {};
      window.__timelines["overlay"] = tl;
    })();
  </script>
</template>
`;
mkdirSync("compositions", { recursive: true });
writeFileSync("compositions/overlay.html", html);
console.log(`overlay.html: chapters=${chapters.length} total=${total}s`);
