#!/usr/bin/env node
// frame-guard.mjs — frame checks the HyperFrames linter does not cover. wave-check.mjs runs it after lint.
//
//   node tools/frame-guard.mjs <frame numbers…>
//
// 1. Glyphs: the shipped fonts lack some symbols (video.config.json `guard.missingGlyphs`, default ①②③✳✕✓→).
//    The browser silently falls back to another font, so those characters must be drawn as inline SVG.
//    Comments are ignored.
// 2. Rail geometry (only when `guard.railPatterns` is set): every frame whose storyboard block has a
//    `- rail:` bullet must match each regex, so the analyze rail sits in the same place in every frame.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GUARD } from "./lib/config.mjs";

const nums = process.argv.slice(2).map(Number).filter(Boolean);
if (!nums.length) throw new Error("usage: frame-guard.mjs <frame numbers…>");
const dir = "compositions/frames";
const files = readdirSync(dir);
const railFrames = new Set(
  readFileSync("STORYBOARD.md", "utf8").split(/(?=^## Frame \d+ )/m)
    .filter((b) => /^- rail: /m.test(b)).map((b) => Number(b.match(/^## Frame (\d+) /)?.[1])),
);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const BAD = GUARD.missingGlyphs ? new RegExp(`[${[...GUARD.missingGlyphs].map(esc).join("")}]`, "u") : null;
let problems = 0;
for (const n of nums) {
  const f = files.find((x) => x.startsWith(String(n).padStart(2, "0") + "-"));
  if (!f) { console.log(`✗ ${n}: no frame file`); problems++; continue; }
  const code = readFileSync(join(dir, f), "utf8")
    .replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n").map((l) => l.replace(/(^|[^:"'])\/\/.*$/, "$1")).join("\n");
  if (BAD) {
    code.split("\n").forEach((l, i) => {
      if (BAD.test(l)) { console.log(`✗ ${n}: glyph at line ${i + 1}: ${l.trim().slice(0, 90)}`); problems++; }
    });
  }
  if (GUARD.railPatterns.length && railFrames.has(n)) {
    const miss = GUARD.railPatterns.filter((r) => !r.test(code)).map(String);
    if (miss.length) { console.log(`✗ ${n}: rail geometry missing ${miss.join(" ")}`); problems++; }
  }
}
console.log(problems ? `frame-guard: ${problems} problem(s)` : `frame-guard ok (${nums.length} frames)`);
process.exit(problems ? 1 : 0);
