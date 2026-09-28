#!/usr/bin/env node
// wave-check.mjs — mount a subset of built frames in a scratch HyperFrames project, then lint
// and snapshot each frame's midpoint. Keeps the real project's index.html untouched while the
// frame workers are still writing.
//
//   node tools/wave-check.mjs 1 2 3 4 5 6          (frame numbers; snapshot at each midpoint)
//   node tools/wave-check.mjs 7@8.2 32@5.5         (snapshot at a frame-local time instead)
//   node tools/wave-check.mjs 1 2 3 --render renders/karaoke-preview.mp4
//        also mounts the karaoke band and overlay and renders a draft clip (frames must be 1..k,
//        because caption times are absolute): the preview for the karaoke-style gate
//
// Scratch project: <project>/../.wave-<name>-<pid>-<time> (fresh per run, so concurrent runs never share
// one). Scratch folders of this project older than 6 h are removed at start (locked ones are skipped).
// It sits outside the project so the project-level lint never scans it.
// After lint, tools/frame-guard.mjs checks the wave's frames (glyphs, optional rail geometry).

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, resolve } from "node:path";
import { cfg, CHECK_TIMEOUT, FE_SCRIPTS as SK, HF, ROOT as P } from "./lib/config.mjs";

const W = resolve(P, `../.wave-${cfg.name}-${process.pid}-${Date.now().toString(36)}`);
const parent = resolve(P, "..");
for (const d of readdirSync(parent)) {
  if (!d.startsWith(`.wave-${cfg.name}-`)) continue;
  try {
    if (Date.now() - statSync(join(parent, d)).mtimeMs > 6 * 3600e3) rmSync(join(parent, d), { recursive: true, force: true });
  } catch {} // still locked by a running render or snapshot
}
const argv = process.argv.slice(2);
const renderOut = argv.includes("--render") ? resolve(P, argv[argv.indexOf("--render") + 1]) : null;
const args = argv.filter((a, i) => a !== "--render" && argv[i - 1] !== "--render").map((a) => a.split("@"));
const nums = args.map(([n]) => Number(n)).filter(Boolean);
const localAt = new Map(args.filter(([, t]) => t).map(([n, t]) => [Number(n), Number(t)]));
if (!nums.length) throw new Error("usage: wave-check.mjs <frame numbers…> [--render out.mp4]");
if (renderOut && nums.some((n, i) => n !== i + 1)) throw new Error("--render needs frames 1..k in order (caption times are absolute)");

rmSync(W, { recursive: true, force: true });
mkdirSync(join(W, "compositions/frames"), { recursive: true });
mkdirSync(join(W, "assets/voice"), { recursive: true });
for (const f of ["hyperframes.json", "meta.json", "package.json", "index.html", "video.config.json"]) cpSync(join(P, f), join(W, f));
// frame.md is the design brief of hand-built frames; a project whose frames are all compiled has none
if (existsSync(join(P, "frame.md"))) cpSync(join(P, "frame.md"), join(W, "frame.md"));
// every asset folder except the voice (only the wave's clips are copied below): fonts, screens, images…
for (const d of readdirSync(join(P, "assets"))) {
  if (d !== "voice") cpSync(join(P, "assets", d), join(W, "assets", d), { recursive: true });
}

// storyboard with only the wave's frames (frontmatter kept)
const sb = readFileSync(join(P, "STORYBOARD.md"), "utf8");
const parts = sb.split(/(?=^## Frame \d+ )/m);
const head = parts[0];
const keep = parts.filter((p) => nums.includes(Number(p.match(/^## Frame (\d+) /)?.[1])));
writeFileSync(join(W, "STORYBOARD.md"), head + keep.map((p) => p.split(/^## Video direction/m)[0]).join(""));

const meta = JSON.parse(readFileSync(join(P, "audio_meta.json"), "utf8"));
const missing = [];
const mids = [];
let t = 0;
for (const block of keep) {
  const n = Number(block.match(/^## Frame (\d+) /)[1]);
  const src = block.match(/^- src: (.+)$/m)[1].trim();
  const dur = parseFloat(block.match(/^- duration: (.+)$/m)[1]);
  if (!existsSync(join(P, src))) missing.push(src);
  else cpSync(join(P, src), join(W, src));
  const voice = `assets/voice/${String(n).padStart(2, "0")}.wav`;
  cpSync(join(P, voice), join(W, voice));
  mids.push((t + (localAt.get(n) ?? dur / 2)).toFixed(2));
  t += dur;
}
if (missing.length) {
  console.error(`✗ missing frame files: ${missing.join(", ")}`);
  process.exit(1);
}
meta.voices = meta.voices.filter((v) => nums.includes(v.frame));
writeFileSync(join(W, "audio_meta.json"), JSON.stringify(meta));

const run = (cmd) => execSync(cmd, { cwd: W, stdio: "pipe", encoding: "utf8" });
if (renderOut) for (const f of ["captions.html", "overlay.html"]) cpSync(join(P, "compositions", f), join(W, "compositions", f));
run(`node ${SK}/assemble-index.mjs --storyboard ./STORYBOARD.md --hyperframes .`);
if (renderOut) run(`node "${P}/tools/inject-overlay.mjs"`);
let lint;
try {
  lint = run(`npx -y ${HF} lint`);
} catch (e) {
  lint = (e.stdout || "") + (e.stderr || "");
}
const findings = lint.split("\n").filter((l) => /✗|⚠/.test(l));
console.log(findings.join("\n") || "(no findings)");
// the CLI prints "0 errors, 0 warnings" when clean but "0 error(s), 1 warning(s)" when warnings exist
const summary = lint.split("\n").find((l) => /error(s|\(s\))?,/.test(l)) ?? "";
console.log(summary.trim());
let guardOk = true;
try {
  console.log(execSync(`node "${P}/tools/frame-guard.mjs" ${nums.join(" ")}`, { cwd: P, encoding: "utf8" }).trim());
} catch (e) {
  console.log((e.stdout || e.message).trim());
  guardOk = false;
}
try {
  run(`npx -y ${HF} snapshot --timeout ${CHECK_TIMEOUT} --at ${mids.join(",")}`);
  console.log(`snapshots: ${W}/snapshots (midpoints ${mids.join(", ")})`);
} catch (e) {
  console.error("✗ snapshot failed:", (e.stderr || e.message).slice(0, 400));
  process.exit(1);
}
if (renderOut) {
  try {
    run(`npx -y ${HF} render --quality draft --output "${renderOut}"`);
    console.log(`preview: ${renderOut}`);
  } catch (e) {
    console.error("✗ render failed:", (e.stderr || e.message).slice(-400));
    process.exit(1);
  }
}
process.exit(/\b0 error(s|\(s\))?,/.test(summary) && guardOk ? 0 : 1);
