#!/usr/bin/env node
// build-overlay.mjs — compositions/overlay.html: the learner-orientation layer that sits
// above the frames and below the karaoke band.
//   - progress bar (y 0–6 px, gold fill over the whole video, a tick per chapter start)
//   - chapter label (top-left, video.config.json `chapterLabel.overlay`, swaps at each chapter start)
//   - courier trail: at every chapter start a golden swoosh draws across the frame with a
//     winged spark riding its head (the "Sứ giả" signature motif). It runs in the strip between the copy limit (the
//     karaoke band starts at y 918) and the caption text (a two-line caption starts near y 942), because this layer sits
//     above the frames and a curve through the stage would strike through their copy (tools/visible-check.mjs)
//   - role chip (top-right, only when the storyboard has - role: bullets; labels from dna.roleLabels)
//   - the director's overlays (scenes.json frame "overlays": lower-third, callout, note, ticker), timed on the voice
//     with the compiler's cues and checked by compiler/lint.mjs

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { cfg, chapterLabel, DNA, loadStoryboardParser, rgb } from "./lib/config.mjs";

const { parseStoryboard } = await loadStoryboardParser();
// the compiler sits next to this script in a project (tools/compiler) and one level up in the skill
const here = dirname(fileURLToPath(import.meta.url));
const COMPILER = [join(here, "compiler"), join(here, "../compiler")].find((d) => existsSync(join(d, "lint.mjs")));

const GOLD = cfg.design.accent, INK = cfg.design.ink;
const r3 = (x) => Number(x.toFixed(3));
const { frames } = parseStoryboard(readFileSync("STORYBOARD.md", "utf8"));
const script = JSON.parse(readFileSync("script.json", "utf8"));
const titles = new Map(script.chapters.map((c, i) => [c.id, { n: i, title: c.title }]));

let t = 0, prev = null;
const chapters = [];
const roleRuns = [];
const starts = new Map();
for (const f of frames) {
  starts.set(f.number, { start: t, duration: f.durationSeconds ?? parseFloat(f.duration) });
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
  ? `\n    <div id="ov-roles">${runs.map((r, i) => `<div class="ov-role" id="ov-role-${i}">${DNA.roleLabels[r.role] ?? r.role}</div>`).join("")}</div>`
  : "";
const roleCss = runs.length
  ? `\n    .ov-role { position: absolute; right: 40px; top: 18px; padding: 4px 14px; border-radius: 16px; font-family: "JetBrains Mono", monospace; font-size: 20px; letter-spacing: 0.08em; color: ${GOLD}; background: rgba(${rgb(INK)},0.08); opacity: 0; white-space: nowrap; }`
  : "";
const roleScript = runs
  .map((r, i) => `\n      tl.fromTo("#ov-role-${i}", { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.3 }, ${r.start});` +
    `\n      tl.to("#ov-role-${i}", { opacity: 0, duration: 0.3 }, ${r3(Math.max(r.start + 0.4, r.end - 0.3))});`)
  .join("");
const pct = (x) => ((x / total) * 100).toFixed(3);

// the director's overlays, in video time
const notes = [];
const scenes = existsSync("scenes.json") ? JSON.parse(readFileSync("scenes.json", "utf8")) : { frames: [] };
if (scenes.frames.some((s) => s.overlays)) {
  if (!COMPILER) throw new Error("overlays need the compiler (tools/compiler): run new-project.mjs --update-tools");
  const { resolveOverlays } = await import(pathToFileURL(join(COMPILER, "lint.mjs")).href);
  const { frameCtx } = await import(pathToFileURL(join(COMPILER, "cues.mjs")).href);
  const audioMeta = existsSync("audio_meta.json") ? JSON.parse(readFileSync("audio_meta.json", "utf8")) : null;
  const rate = existsSync(".probe/rate.json") ? JSON.parse(readFileSync(".probe/rate.json", "utf8")).syllables_per_s : 4.3;
  for (const s of scenes.frames) {
    if (!s.overlays || !starts.has(s.frame)) continue;
    const { start, duration } = starts.get(s.frame);
    const ctx = frameCtx(s.frame, script, audioMeta, duration, { estimated: !audioMeta, timing: cfg.timing, rate });
    for (const o of resolveOverlays(s.overlays, ctx)) notes.push({ ...o, a: r3(start + o.a), b: r3(start + o.b) });
  }
}
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const SURFACE = cfg.design.surface ?? "#141B3A";
const noteHtml = notes.map((o, i) => {
  const sub = o.sub ? `<div class="ov-sub">${esc(o.sub)}</div>` : "";
  if (o.kind === "lower-third") {
    return (o.skin ?? "kicker") === "kicker"
      ? `<div class="ov-note ov-lt" id="ov-note-${i}">${sub}<div class="ov-text">${esc(o.text)}</div><i class="ov-rule" id="ov-rule-${i}"></i></div>`
      : `<div class="ov-note ov-lt ov-lt-bar" id="ov-note-${i}"><i class="ov-vbar"></i><div><div class="ov-text">${esc(o.text)}</div>${sub}</div></div>`;
  }
  if (o.kind === "callout") return `<div class="ov-note ov-co ov-co-${o.zone}" id="ov-note-${i}"><div class="ov-text">${esc(o.text)}</div>${sub}<i class="ov-rule" id="ov-rule-${i}"></i></div>`;
  if (o.kind === "note") return `<div class="ov-note ov-nt" id="ov-note-${i}"><div class="ov-text">${esc(o.text)}</div>${sub}</div>`;
  return `<div class="ov-note ov-tk" id="ov-note-${i}"><span class="ov-tk-tag">${esc(o.sub ?? "•")}</span><span class="ov-tk-run">${esc(o.text)}</span></div>`;
}).join("\n    ");
const noteCss = notes.length ? `
    @font-face{font-family:"Be Vietnam Pro";font-weight:600;font-style:normal;font-display:block;src:url("assets/fonts/BeVietnamPro-SemiBold.ttf") format("truetype");}
    @font-face{font-family:"Be Vietnam Pro";font-weight:800;font-style:normal;font-display:block;src:url("assets/fonts/BeVietnamPro-ExtraBold.ttf") format("truetype");}
    .ov-note { position: absolute; opacity: 0; font-family: "Be Vietnam Pro", sans-serif; color: ${INK}; }
    .ov-text { font-weight: 800; font-size: 40px; line-height: 1.15; }
    .ov-sub { font-weight: 600; font-size: 22px; letter-spacing: 0.06em; color: ${GOLD}; }
    .ov-rule { display: block; height: 4px; margin-top: 10px; background: ${GOLD}; transform-origin: left center; transform: scaleX(0); }
    .ov-lt { left: 64px; bottom: 196px; max-width: 900px; padding: 14px 22px; border-radius: 10px; background: rgba(${rgb(SURFACE)},0.88); }
    .ov-lt .ov-sub { text-transform: uppercase; margin-bottom: 4px; }
    .ov-lt-bar { display: flex; gap: 16px; align-items: stretch; }
    .ov-lt-bar .ov-sub { text-transform: none; color: ${INK}; opacity: 0.8; margin: 4px 0 0; }
    .ov-vbar { width: 6px; border-radius: 3px; background: ${GOLD}; }
    .ov-co { max-width: 560px; padding: 16px 22px; border-radius: 12px; border-left: 5px solid ${GOLD}; background: rgba(${rgb(SURFACE)},0.9); }
    .ov-co .ov-text { font-size: 34px; } .ov-co .ov-sub { margin-top: 6px; }
    .ov-co-tl { left: 64px; top: 96px; } .ov-co-tr { right: 64px; top: 96px; } .ov-co-mr { right: 64px; top: 400px; }
    .ov-nt { right: 64px; top: 360px; width: 440px; padding: 22px 26px; border-radius: 6px; background: ${INK}; color: ${cfg.design.canvas ?? "#0B1026"};
      box-shadow: 0 18px 40px rgba(0,0,0,0.35); }
    .ov-nt .ov-text { font-size: 32px; } .ov-nt .ov-sub { margin-top: 8px; color: ${cfg.design.canvas ?? "#0B1026"}; opacity: 0.7; }
    .ov-tk { left: 0; right: 0; top: 852px; height: 52px; display: flex; align-items: center; gap: 22px; overflow: hidden;
      background: rgba(${rgb(SURFACE)},0.92); border-top: 2px solid ${GOLD}; }
    .ov-tk-tag { flex: none; height: 100%; display: flex; align-items: center; padding: 0 22px; background: ${GOLD};
      color: ${cfg.design.canvas ?? "#0B1026"}; font-weight: 800; font-size: 22px; letter-spacing: 0.08em; text-transform: uppercase; }
    .ov-tk-run { font-weight: 600; font-size: 26px; white-space: nowrap; }` : "";
// in and out 0.3 s; a note tilts a little
const noteScript = notes.map((o, i) => {
  const id = `#ov-note-${i}`, out = r3(Math.max(o.a + 0.4, o.b - 0.3));
  const tilt = o.kind === "note" ? ", rotation: -1.5" : "";
  const lines = [`tl.fromTo("${id}", { opacity: 0, y: ${o.kind === "ticker" ? 20 : 14}${tilt} }, { opacity: 1, y: 0${tilt}, duration: 0.3, ease: "power2.out" }, ${o.a});`];
  if (o.kind === "callout" || (o.kind === "lower-third" && (o.skin ?? "kicker") === "kicker"))
    lines.push(`tl.to("#ov-rule-${i}", { scaleX: 1, duration: 0.45, ease: "power2.out" }, ${r3(o.a + 0.2)});`);
  lines.push(`tl.to("${id}", { opacity: 0, duration: 0.3 }, ${out});`);
  return "\n      " + lines.join("\n      ");
}).join("");

const ticks = chapters.slice(1).map((c) => `<i class="ov-tick" style="left:${pct(c.start)}%"></i>`).join("");
const labels = chapters
  .map((c, i) => `<div class="ov-label" id="ov-label-${i}">${chapterLabel(cfg.chapterLabel.overlay, c.n, c.title)}</div>`)
  .join("\n      ");
// the swoosh keeps to y 921-939 (stroke 4); odd chapters run it right to left, so the spark changes direction
const TRAIL = ["M -60 930 C 480 922, 1440 938, 1980 928", "M 1980 930 C 1440 922, 480 938, -60 928"];
const trails = chapters
  .slice(1)
  .map(
    (c, i) => `<svg class="ov-trail" id="ov-trail-${i}" viewBox="0 0 1920 1080" width="1920" height="1080">
        <path id="ov-path-${i}" d="${TRAIL[i % 2]}"
          fill="none" stroke="${GOLD}" stroke-width="4" stroke-linecap="round" pathLength="1000" stroke-dasharray="1000" stroke-dashoffset="1000"/>
        <g id="ov-spark-${i}" opacity="0"><g transform="scale(0.45)">
          <circle r="9" fill="${GOLD}"/>
          <path d="M -4 -4 C -26 -30, -46 -18, -52 -6 C -38 -10, -24 -6, -4 0 Z" fill="${INK}" opacity="0.9"/>
          <path d="M -4 4 C -26 30, -46 18, -52 6 C -38 10, -24 6, -4 0 Z" fill="${INK}" opacity="0.7"/>
        </g></g>
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
    </div>${roleHtml}${notes.length ? `\n    ${noteHtml}` : ""}
  </div>
  <style>
    @font-face{font-family:"JetBrains Mono";font-weight:400;font-style:normal;font-display:block;src:url("assets/fonts/JetBrainsMono-Regular.ttf") format("truetype");}
    #overlay-root { position: absolute; inset: 0; pointer-events: none; }
    #ov-progress { position: absolute; left: 0; right: 0; top: 0; height: 6px; background: rgba(${rgb(INK)},0.10); }
    #ov-fill { position: absolute; left: 0; top: 0; bottom: 0; width: 100%; background: ${GOLD}; transform-origin: left center; }
    .ov-tick { position: absolute; top: 0; width: 3px; height: 10px; margin-left: -1px; background: ${INK}; opacity: 0.7; }
    .ov-label { position: absolute; left: 40px; top: 22px; font-family: "JetBrains Mono", monospace; font-size: 22px;
      letter-spacing: 0.04em; color: ${INK}; opacity: 0; white-space: nowrap; }
    .ov-trail { position: absolute; left: 0; top: 0; filter: drop-shadow(0 0 6px rgba(${rgb(GOLD)},0.7)); }${roleCss}${noteCss}
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
      ${trailScript}${roleScript}${noteScript}
      tl.to({}, { duration: ${total} }, 0);
      window.__timelines = window.__timelines || {};
      window.__timelines["overlay"] = tl;
    })();
  </script>
</template>
`;
mkdirSync("compositions", { recursive: true });
writeFileSync("compositions/overlay.html", html);
console.log(`overlay.html: chapters=${chapters.length} total=${total}s${notes.length ? ` overlays=${notes.length}` : ""}`);
