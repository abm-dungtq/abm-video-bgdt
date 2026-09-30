#!/usr/bin/env node
// compile.mjs — scenes.json → compositions/frames/*.html, one per non-custom frame, plus the STORYBOARD.md bullets
// (status, blueprint, shots, layout) that variety-lint, assemble-index and transitions read. Lint runs first.
//
//   node tools/compiler/compile.mjs [--estimated] [--frames 3,8]
//
// Custom frames ({"frame": N, "custom": true}) are hand-built from references/custom-frame.md and left untouched.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve as resolvePath } from "node:path";
import { fileURLToPath } from "node:url";
import { analyze, report } from "./lint.mjs";
import { compose } from "./compose.mjs";
import { ZONES, CARD } from "./zones.mjs";
import { GAP } from "./emitter-0.7.99.mjs";
import { renderRail } from "./rail.mjs";
import { renderMotif } from "./motif.mjs";

const MOTION = { rise: { opacity: 0, y: 24 }, pop: { opacity: 0, scale: 0.85 }, slide: { opacity: 0, x: -40 } };
const ROTATE = ["rise", "pop", "slide"];

const HERE = dirname(fileURLToPath(import.meta.url));
const r2 = (x) => Math.round(x * 100) / 100;
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** mulberry32: a small seeded PRNG in [0, 1) */
export function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const icons = new Map();
function icon(name) {
  if (!icons.has(name)) {
    const f = join(HERE, "pictograms", `${name}.svg`);
    if (!existsSync(f)) throw new Error(`unknown icon "${name}" (see compiler/pictograms/)`);
    icons.set(name, readFileSync(f, "utf8").trim().replace(/^<svg /, '<svg aria-hidden="true" '));
  }
  return icons.get(name);
}

/** Replace or add `- key: value` bullets inside one frame block of STORYBOARD.md. */
export function setBullets(md, no, kv) {
  const parts = md.split(/(?=^## Frame \d+ )/m);
  const i = parts.findIndex((p) => new RegExp(`^## Frame ${no} `).test(p));
  if (i < 0) throw new Error(`frame ${no} not in STORYBOARD.md`);
  let block = parts[i];
  for (const [k, v] of Object.entries(kv)) {
    const re = new RegExp(`^- ${k}:.*$`, "m");
    if (re.test(block)) block = block.replace(re, () => `- ${k}: ${v}`);
    else {
      const lines = block.split("\n");
      let last = 0;
      lines.forEach((l, j) => { if (/^- [\w_]+:/.test(l) && (last === 0 || j === last + 1)) last = j; });
      lines.splice(last + 1, 0, `- ${k}: ${v}`);
      block = lines.join("\n");
    }
  }
  parts[i] = block;
  return parts.join("");
}

export async function compile({ P, cfg, estimated = false, only = null, legacy = false, variety = true }) {
  const res = await analyze({ P, cfg, estimated, legacy, variety });
  if (res.errors.length) { report(res); return { ok: false }; }
  const skeletonPath = join(P, "tools/frame-skeleton.html");
  if (!existsSync(skeletonPath)) throw new Error("tools/frame-skeleton.html missing: run node tools/build-design-kit.mjs");
  const skeleton = readFileSync(skeletonPath, "utf8");
  const script = JSON.parse(readFileSync(join(P, "script.json"), "utf8"));
  const chapterOf = new Map(script.chapters.flatMap((c, ci) => c.frames.map((f) => [f.id, ci])));
  const titleOf = new Map(script.chapters.flatMap((c) => c.frames.map((f) => [f.id, c])));
  const theme = { ...cfg.design, mono: cfg.fonts?.find((f) => /mono/i.test(f.family))?.family ?? "JetBrains Mono" };
  const lastNo = Math.max(...res.frames.map((f) => f.no));
  let md = readFileSync(join(P, "STORYBOARD.md"), "utf8");
  let written = 0, skipped = 0;
  const changed = [];

  for (const f of res.frames) {
    if (f.custom) { skipped++; continue; }
    if (only && !only.includes(f.no)) continue;
    const src = f.board.bullets.src ?? (() => { throw new Error(`frame ${f.no}: no src in STORYBOARD.md`); })();
    const id = src.split("/").pop().replace(/\.html$/, "");
    const pfx = `f${String(f.no).padStart(2, "0")}`;
    const seed = (res.scenes.frames.find((x) => x.frame === f.no).seed ?? res.scenes.seed ?? 1) + f.no * 1009;
    const chapterIndex = chapterOf.get(f.no) ?? 0;
    // per-chapter motion personality: the reveal "from" (design.motion, rotated by chapter when motionRotate) and the ease
    const motionName = cfg.design.motionRotate ? ROTATE[chapterIndex % 3] : (cfg.design.motion ?? "rise");
    const motionFrom = MOTION[motionName] ?? MOTION.rise;
    const ease = chapterIndex % 2 ? "back.out(1.4)" : "power3.out";
    const shots = f.shots.map((s, i) => {
      const S = `${pfx}-s${i + 1}`;
      const ctx = {
        P: pfx, S, slots: s.spec.slots, variant: s.variant, params: s.spec.params ?? {}, theme,
        window: { a: s.a, b: s.b }, rng: mulberry32(seed + i * 7919), icon, esc, zones: { ...ZONES, CARD }, gap: GAP,
        frame: { no: f.no, duration: f.duration, chapter: titleOf.get(f.no), chapterIndex },
        motionFrom: () => ({ ...motionFrom }), ease,
        // slow drift of a finished group until the shot ends (one of the three planes: motif, content, accent)
        drift: (target, from, amount = 14) => (s.b - from > 0.6
          ? { prim: "slide", target, at: from, dur: r2(s.b - from - 0.05), from: { y: 0 }, to: { y: -amount }, ease: "none" } : null),
        at: (key) => {
          if (!(key in s.times)) throw new Error(`frame ${f.no} shot ${i + 1}: template asked for reveal "${key}" it did not list`);
          return s.times[key];
        },
      };
      let out;
      try { out = s.mod.render(ctx); } catch (e) { throw new Error(`frame ${f.no} shot ${i + 1} (${s.spec.template}): ${e.message}`); }
      for (const [, v] of out.html.matchAll(/\sid="([^"]+)"/g)) {
        if (!v.startsWith(`${S}-`)) throw new Error(`frame ${f.no} shot ${i + 1} (${s.spec.template}): id "${v}" must start with ${S}-`);
      }
      return { ...out, window: { a: s.a, b: s.b } };
    });
    const hue = (cfg.design.hueBase ?? 230) + (cfg.design.hueStep ?? 12) * (chapterOf.get(f.no) ?? 0);
    let html;
    try {
      html = compose(skeleton, { id, no: f.no, duration: f.duration, hue, pfx }, shots,
        { missingGlyphs: cfg.guard?.missingGlyphs ?? "①②③✳✕✓→", fadeOutLast: f.no === lastNo,
          rail: f.rail ? renderRail(f.rail, pfx, { esc, icon }) : null,
          motif: renderMotif(cfg.design.motif ?? "trail", pfx, { duration: f.duration, chapterIndex, rng: mulberry32(seed + 31) }) });
    } catch (e) { throw new Error(`frame ${f.no}: ${e.message}`); }
    mkdirSync(dirname(join(P, src)), { recursive: true });
    if (!existsSync(join(P, src)) || readFileSync(join(P, src), "utf8") !== html) changed.push(f.no);
    writeFileSync(join(P, src), html);
    md = setBullets(md, f.no, {
      status: "animated",
      blueprint: "template",
      shots: f.shots.map((s) => `${s.schema.family}@${r2(s.a)}-${r2(s.b)}`).join(", "),
      layout: f.shots.map((s) => s.schema.card ?? s.schema.zone?.[s.variant] ?? "hero-center").join(", "),
    });
    written++;
  }
  // custom frames too: the transition into a frame belongs to the boundary, not to the frame's own HTML
  for (const f of res.frames) if (f.transition) md = setBullets(md, f.no, { transition_in: f.transition });
  writeFileSync(join(P, "STORYBOARD.md"), md);
  for (const w of res.warnings) console.log(`⚠ ${w}`);
  console.log(`compile: ${written} frames written, ${skipped} custom skipped${changed.length ? ` (changed: ${changed.join(",")})` : ""}`);
  return { ok: true, written, skipped, changed };
}

if (resolvePath(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const P = process.cwd();
  const argv = process.argv.slice(2);
  const cfg = JSON.parse(readFileSync(join(P, "video.config.json"), "utf8"));
  const legacy = existsSync(join(P, ".abm/state.json")) && JSON.parse(readFileSync(join(P, ".abm/state.json"), "utf8")).legacy === true;
  const only = argv.includes("--frames") ? argv[argv.indexOf("--frames") + 1].split(",").map(Number) : null;
  try {
    const r = await compile({ P, cfg, estimated: argv.includes("--estimated"), only, legacy });
    process.exit(r.ok ? 0 : 1);
  } catch (e) {
    console.error(`✗ ${e.message}`);
    console.log("compile: 0 frames written");
    process.exit(1);
  }
}
