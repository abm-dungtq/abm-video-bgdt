#!/usr/bin/env node
// template-ci.mjs — compile every scene template × variant × {4, 7, 10} s on a synthetic voice, lint the result with
// the pinned HyperFrames CLI, and snapshot each variant (7 s frame) at 20 % and 85 % — side by side, 2 × 480 px — to
// templates/scenes/<id>/<variant>.jpg. 20 % is what a learner looks at longest, so an empty or sparse start shows up.
//
//   node dev/template-ci.mjs [--only title,cards] [--keep]
//
// Scratch project: <workspace>/.regress/template-ci ($ABM_REGRESS_DIR), created once with hyperframes init and reused.
// The synthetic voice: 0.35 s per token w1 w2 …, every 4th token a keyword, sentences of 8 tokens, silent wav. Each shot
// uses its preview.json slots and variant with window start → end and default reveals (the solver's path).
// Then `hyperframes check` (layout, runtime, contrast) samples every frame at 20 %, 55 % and 90 %; its errors count too —
// the assemble stage runs the same check on a real lesson, so a template must be check-clean, not only lint-clean.
// Last line: template-ci: <t> templates, <v> variants, <n> frames, <e> lint errors  (exit 1 when e > 0).

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const S = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const only = argv.includes("--only") ? argv[argv.indexOf("--only") + 1].split(",") : null;
const W = resolve(process.env.ABM_REGRESS_DIR ?? "D:/TQD/Claude-Video/.regress", "template-ci");
const cfg = JSON.parse(readFileSync(join(S, "templates/video.config.json"), "utf8"));
const HF = `hyperframes@${cfg.cli.pin}`;
const TPL = join(S, "templates/scenes");
const DURS = [4, 7, 10];
const STEP = 0.35, LEAD = 0.3;

const sh = (cmd, cwd = W) => execSync(cmd, { cwd, stdio: "pipe", encoding: "utf8", env: { ...process.env, HYPERFRAMES_SKIP_SKILLS: "1" } });
const shTry = (cmd, cwd = W) => { try { return { ok: true, out: sh(cmd, cwd) }; } catch (e) { return { ok: false, out: `${e.stdout ?? ""}${e.stderr ?? ""}` }; } };

// ── scratch project ───────────────────────────────────────────────────────────
if (!existsSync(join(W, "hyperframes.json"))) {
  mkdirSync(dirname(W), { recursive: true });
  sh(`npx -y ${HF} init "${W}" --non-interactive --example=blank --resolution landscape`, dirname(W));
}
for (const d of ["compositions/frames", "assets/voice", "snapshots"]) rmSync(join(W, d), { recursive: true, force: true });
for (const d of ["compositions/frames", "assets/voice"]) mkdirSync(join(W, d), { recursive: true });
writeFileSync(join(W, "video.config.json"), JSON.stringify({ ...cfg, name: "template-ci" }, null, 2));
cpSync(join(S, "templates/fonts"), join(W, "assets/fonts"), { recursive: true });
sh(`node "${join(S, "scripts/new-project.mjs")}" "${W}" --update-tools`, S);
sh("node tools/build-design-kit.mjs");

// ── combinations ─────────────────────────────────────────────────────────────
const ids = readdirSync(TPL).filter((d) => existsSync(join(TPL, d, "schema.json")) && (!only || only.includes(d))).sort();
if (only) for (const o of only) if (!ids.includes(o)) { console.error(`✗ unknown template ${o}`); process.exit(1); }
const combos = [];
for (const id of ids) {
  const schema = JSON.parse(readFileSync(join(TPL, id, "schema.json"), "utf8"));
  const preview = JSON.parse(readFileSync(join(TPL, id, "preview.json"), "utf8"));
  const lo = schema.duration?.min ?? 2, hi = schema.duration?.max ?? 10;
  for (const variant of schema.variants) {
    const durs = [...new Set(DURS.map((d) => Math.min(hi, Math.max(lo, d))))];
    for (const dur of durs) combos.push({ id, variant, dur, schema, preview, snap: dur === durs[Math.floor(durs.length / 2)] });
  }
}

// ── synthetic script, voice, storyboard and scenes ────────────────────────────
const frames = [], voices = [], scenes = [];
const md = ["---", "format: 1920x1080", `duration: ${combos.reduce((s, c) => s + c.dur, 0)}s`, 'message: "template CI"', "mode: autonomous", "music: none", "---", ""];
combos.forEach((c, i) => {
  const n = i + 1;
  c.n = n;
  c.fid = `${String(n).padStart(2, "0")}-${c.id}-${c.variant}-${c.dur}`;
  const count = Math.max(4, Math.floor((c.dur - LEAD - 0.4) / STEP));
  const tokens = Array.from({ length: count }, (_, k) => ({ display: `w${k + 1}`, spoken: `w${k + 1}`, ...(k % 4 === 1 ? { keyword: true } : {}) }));
  const sentences = [];
  for (let k = 0; k < tokens.length; k += 8) sentences.push({ id: `s${n}-${k / 8 + 1}`, tokens: tokens.slice(k, k + 8), facts: [] });
  frames.push({ id: n, scene_hint: c.schema.family, title: `${c.id} ${c.variant}`, sentences });
  voices.push({ frame: n, path: `assets/voice/${String(n).padStart(2, "0")}.wav`, duration_s: c.dur,
    words: tokens.map((t, k) => ({ id: `w${n}-${k}`, text: t.display, start: +(LEAD + k * STEP).toFixed(3), end: +(LEAD + k * STEP + 0.3).toFixed(3) })) });
  execSync(`ffmpeg -v error -y -f lavfi -i anullsrc=r=48000:cl=mono -t ${c.dur} -c:a pcm_s16le "${join(W, voices[i].path)}"`);
  md.push(`## Frame ${n} — ${c.id} ${c.variant} ${c.dur}s`, "", "- status: outline", `- src: compositions/frames/${c.fid}.html`,
    `- duration: ${c.dur}s`, "- transition_in: cut", `- scene: ${c.schema.family}`, "- chapter: ch1", "");
  scenes.push({ frame: n, shots: [{ template: c.id, variant: c.variant, window: ["start", "end"], slots: c.preview.slots, ...(c.preview.params ? { params: c.preview.params } : {}) }] });
});
writeFileSync(join(W, "script.json"), JSON.stringify({ meta: { title: "template CI", rate: 1 / STEP * 1.0 }, chapters: [{ id: "ch1", title: "CI", level: "basic", frames }] }, null, 1));
writeFileSync(join(W, "audio_meta.json"), JSON.stringify({ bgm: null, bgm_pending: false, voices, sfx: [] }));
writeFileSync(join(W, "STORYBOARD.md"), md.join("\n"));
writeFileSync(join(W, "scenes.json"), JSON.stringify({ version: 1, seed: 7, frames: scenes }, null, 1));

// ── compile each frame on its own, so one broken template does not hide the others ──
const { compile } = await import(pathToFileURL(join(W, "tools/compiler/compile.mjs")).href);
const errs = new Map(ids.map((id) => [id, []]));
for (const c of combos) {
  try {
    const log = console.log;
    let out = "";
    console.log = (...a) => { out += a.join(" ") + "\n"; };
    let r;
    try { r = await compile({ P: W, cfg: { ...cfg, name: "template-ci" }, only: [c.n], variety: false }); } finally { console.log = log; }
    if (!r.ok) errs.get(c.id).push(`${c.variant} ${c.dur}s: lint\n${out.split("\n").filter((l) => l.startsWith("✗") && l.includes(`frame ${c.n} `)).join("\n") || out}`);
  } catch (e) {
    errs.get(c.id).push(`${c.variant} ${c.dur}s: ${e.message}`);
  }
}
const compiled = combos.filter((c) => existsSync(join(W, `compositions/frames/${c.fid}.html`)));
// assemble only the frames that compiled
const board = md.join("\n").split(/(?=^## Frame \d+ )/m).filter((b) => !/^## Frame (\d+) /.test(b) || compiled.some((c) => c.n === Number(b.match(/^## Frame (\d+) /)[1])));
writeFileSync(join(W, "STORYBOARD.md"), board.join(""));
const SK = `${(await import(pathToFileURL(join(W, "tools/lib/machine.mjs")).href)).findSkillsDir()}/faceless-explainer/scripts`;
if (compiled.length) {
  const a = shTry(`node "${SK}/assemble-index.mjs" --storyboard ./STORYBOARD.md --hyperframes .`);
  if (!a.ok) { console.error(`✗ assemble-index failed\n${a.out.slice(-1200)}`); process.exit(1); }
  const lint = shTry(`npx -y ${HF} lint`).out;
  for (const line of lint.split("\n").filter((l) => /✗/.test(l))) {
    const c = compiled.find((x) => line.includes(`${x.fid}.html`));
    (c ? errs.get(c.id) : (errs.get("_project") ?? errs.set("_project", []).get("_project"))).push(`${c ? `${c.variant} ${c.dur}s: ` : ""}${line.trim()}`);
  }
  // layout / runtime / contrast check, three samples per frame
  {
    let t0 = 0;
    const at = compiled.flatMap((c) => { const s = t0; t0 += c.dur; return [0.2, 0.55, 0.9].map((f) => (s + f * c.dur).toFixed(2)); });
    const r = shTry(`npx -y ${HF} check --json --timeout ${cfg.cli.checkTimeoutMs ?? 240000} --max-issues 400 --at ${at.join(",")}`);
    let report = null;
    try { report = JSON.parse(r.out.slice(r.out.indexOf("{"), r.out.lastIndexOf("}") + 1)); } catch { errs.set("_project", [...(errs.get("_project") ?? []), `check did not return JSON: ${r.out.slice(-300)}`]); }
    for (const section of ["runtime", "layout", "contrast"]) {
      for (const f of report?.[section]?.findings ?? []) {
        if (f.severity !== "error") continue;
        const n = Number((f.selector ?? "").match(/[#.]f(\d+)-/)?.[1]);
        const c = compiled.find((x) => x.n === n);
        const line = `check ${f.code} ${f.selector}${f.text ? ` "${f.text}"` : ""} at ${f.time}s`;
        (c ? errs.get(c.id) : (errs.get("_project") ?? errs.set("_project", []).get("_project"))).push(`${c ? `${c.variant} ${c.dur}s: ` : ""}${line}`);
      }
    }
  }
  // previews of the middle duration, at 20 % and 85 % of each frame. The renderer's page load has a fixed 10 s navigation
  // deadline, so the snapshots run in batches of 18 frames, each on an index assembled from that batch alone.
  const snaps = compiled.filter((c) => c.snap);
  const header = md.join("\n").split(/(?=^## Frame \d+ )/m)[0];
  const blocks = new Map(md.join("\n").split(/(?=^## Frame \d+ )/m).filter((b) => /^## Frame \d+ /.test(b))
    .map((b) => [Number(b.match(/^## Frame (\d+) /)[1]), b]));
  for (let s = 0; s < snaps.length; s += 18) {
    const batch = snaps.slice(s, s + 18);
    writeFileSync(join(W, "STORYBOARD.md"), header + batch.map((c) => blocks.get(c.n)).join(""));
    const a = shTry(`node "${SK}/assemble-index.mjs" --storyboard ./STORYBOARD.md --hyperframes .`);
    if (!a.ok) { (errs.get("_project") ?? errs.set("_project", []).get("_project")).push(`assemble for previews failed: ${a.out.slice(-300)}`); break; }
    let t = 0;
    const at = batch.flatMap((c) => { const x = t; t += c.dur; return [(x + 0.2 * c.dur).toFixed(2), (x + 0.85 * c.dur).toFixed(2)]; });
    rmSync(join(W, "snapshots"), { recursive: true, force: true });
    const snap = () => shTry(`npx -y ${HF} snapshot --no-end --timeout ${cfg.cli.checkTimeoutMs ?? 240000} --at ${at.join(",")}`);
    let r = snap();
    if (!r.ok) r = snap();
    if (!r.ok) { (errs.get("_project") ?? errs.set("_project", []).get("_project")).push(`snapshot failed twice: ${r.out.slice(-300)}`); continue; }
    const files = existsSync(join(W, "snapshots")) ? readdirSync(join(W, "snapshots")).filter((f) => /^frame-\d+-at-/.test(f))
      .sort((x, y) => Number(x.match(/^frame-(\d+)/)[1]) - Number(y.match(/^frame-(\d+)/)[1])) : []; // numeric order
    batch.forEach((c, k) => {
      const [l, rr] = [files[2 * k], files[2 * k + 1]];
      if (!l || !rr) return;
      spawnSync("ffmpeg", ["-v", "error", "-y", "-i", join(W, "snapshots", l), "-i", join(W, "snapshots", rr), "-filter_complex",
        "[0]scale=480:-2[l];[1]scale=480:-2[r];[l][r]hstack=inputs=2", "-q:v", "4", join(TPL, c.id, `${c.variant}.jpg`)]);
    });
  }
}

// ── report ────────────────────────────────────────────────────────────────────
let total = 0;
for (const [id, list] of errs) {
  total += list.length;
  if (id === "_project") { for (const e of list) console.log(`✗ project: ${e}`); continue; }
  const variants = new Set(combos.filter((c) => c.id === id).map((c) => c.variant)).size;
  console.log(`ci ${id}: ${variants} variants × ${DURS.length} durations, ${list.length} lint errors`);
  for (const e of list) console.log(`  ✗ ${e}`);
}
const nv = new Set(combos.map((c) => `${c.id}/${c.variant}`)).size;
console.log(`template-ci: ${ids.length} templates, ${nv} variants, ${combos.length} frames, ${total} lint errors`);
process.exit(total ? 1 : 0);
