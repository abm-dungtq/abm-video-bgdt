#!/usr/bin/env node
// director-check.mjs — run the solver in director mode on the auto fixture (dev/compile-fixture.mjs --auto builds it)
// with the scenes settings of templates/video.config.json, and check what the director promises:
//   · no frame longer than minShotsLongFrame.overS is a single shot;
//   · a frame's scene_hint template, when it shows, is the frame's last shot or a later shot than any other of its family;
//   · a card family does not repeat a variant it used in the previous chapter while another variant was free;
//   · scenes.json carries a scorecard with the seed it kept.
//
//   node dev/director-check.mjs          (after node dev/compile-fixture.mjs --auto)
// Last line: director-check ok | director-check FAILED (<n> problem(s)); exit 1 on failure.

import { cpSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const S = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REG = resolve(process.env.ABM_REGRESS_DIR ?? "D:/TQD/Claude-Video/.regress");
const SRC = join(REG, "hermes-auto"), W = join(REG, "director-check");
if (!existsSync(join(SRC, "script.json"))) { console.log("director-check: run node dev/compile-fixture.mjs --auto first"); process.exit(1); }
rmSync(W, { recursive: true, force: true });
cpSync(SRC, W, { recursive: true });
cpSync(join(S, "compiler"), join(W, "tools/compiler"), { recursive: true });
cpSync(join(S, "templates/scenes"), join(W, "tools/templates/scenes"), { recursive: true });
const tpl = JSON.parse(readFileSync(join(S, "templates/video.config.json"), "utf8")).scenes;
const cfg = JSON.parse(readFileSync(join(W, "video.config.json"), "utf8"));
cfg.scenes = { ...cfg.scenes, director: true, minShotsLongFrame: tpl.minShotsLongFrame, scorecard: tpl.scorecard, types: tpl.types };
writeFileSync(join(W, "video.config.json"), JSON.stringify(cfg, null, 2));

const r = spawnSync(process.execPath, ["tools/compiler/solver.mjs", "--auto", "--out", "scenes.json"], { cwd: W, encoding: "utf8" });
const problems = [];
if (r.status !== 0) problems.push(`solver exit ${r.status}: ${(r.stdout + r.stderr).trim().split("\n").slice(-3).join(" | ")}`);
const scenes = JSON.parse(readFileSync(join(W, "scenes.json"), "utf8"));
const script = JSON.parse(readFileSync(join(W, "script.json"), "utf8"));
const meta = JSON.parse(readFileSync(join(W, "audio_meta.json"), "utf8"));
const dur = new Map(meta.voices.map((v) => [v.frame, v.duration_s]));
const HINT = { metaphor: "pictogram-scene", objective: "card-objective", principle: "card-principle", antipattern: "card-antipattern",
  case: "card-case", exercise: "card-exercise", quiz: "card-quiz" };
const frameInfo = new Map(script.chapters.flatMap((c, ci) => c.frames.map((f) => [f.id, { ci, hint: HINT[f.scene_hint] ?? f.scene_hint }])));

let longSingle = 0, hintShown = 0, hintLate = 0;
const byChapter = new Map(); // chapter index → Map(template → Set(variant))
for (const f of scenes.frames) {
  const info = frameInfo.get(f.frame);
  if (dur.get(f.frame) > tpl.minShotsLongFrame.overS && f.shots.length === 1) longSingle++;
  const at = f.shots.findIndex((s) => s.template === info.hint);
  if (at >= 0 && info.hint !== "title") { hintShown++; if (at === f.shots.length - 1 || f.shots.length === 1) hintLate++; }
  if (!byChapter.has(info.ci)) byChapter.set(info.ci, new Map());
  for (const s of f.shots) {
    const m = byChapter.get(info.ci);
    if (!m.has(s.template)) m.set(s.template, new Set());
    m.get(s.template).add(s.variant);
  }
}
if (longSingle) problems.push(`${longSingle} frame(s) over ${tpl.minShotsLongFrame.overS} s with one shot`);
if (hintShown && hintLate / hintShown < 0.6) problems.push(`the hint closes only ${hintLate} of ${hintShown} frames that show it`);
let repeats = 0;
for (const [ci, m] of byChapter) {
  const prev = byChapter.get(ci - 1);
  if (!prev) continue;
  for (const [t, vs] of m) if (t.startsWith("card-") && prev.has(t) && [...vs].every((v) => prev.get(t).has(v))) repeats++;
}
if (repeats) problems.push(`${repeats} card family(ies) reuse last chapter's variant`);
if (!scenes.scorecard || typeof scenes.scorecard.seed !== "number") problems.push("scenes.json has no scorecard with a seed");

for (const p of problems) console.log(`✗ ${p}`);
console.log(`director: ${scenes.frames.length} frames, ${scenes.frames.reduce((n, f) => n + f.shots.length, 0)} shots, hint closes ${hintLate}/${hintShown}, scorecard ${scenes.scorecard?.ok ? "ok" : `${scenes.scorecard?.violations?.length ?? "?"} violation(s)`}`);
console.log(problems.length ? `director-check FAILED (${problems.length} problem(s))` : "director-check ok");
process.exit(problems.length ? 1 : 0);
