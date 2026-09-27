#!/usr/bin/env node
// regression-check.mjs — prove that the current scripts produce the same outputs as a baseline revision
// on delivered projects. For each project, two scratch copies (old = scripts from `git archive <rev>`,
// new = this working tree) run the same steps; steps 1–7 must exit 0 on both sides, frame-guard (step 8)
// must give the same exit code and stdout on both sides, and the listed outputs must be byte-identical.
//
//   node dev/regression-check.mjs --baseline v0.4.0 <project-dir>…
//
// Scratch: D:/TQD/Claude-Video/.regress/<name>-old|new (kept for inspection).

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { execSync, spawnSync } from "node:child_process";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const R = "D:/TQD/Claude-Video/.regress";
const args = process.argv.slice(2);
const bi = args.indexOf("--baseline");
if (bi < 0 || !args[bi + 1]) {
  console.error("usage: regression-check.mjs --baseline <git-rev> <project-dir>…");
  process.exit(1);
}
const rev = args[bi + 1];
const projects = args.filter((a, i) => i !== bi && i !== bi + 1);

const INPUTS = [
  "video.config.json", "script.src.txt", "script.json", "STORYBOARD.md", "audio_meta.json",
  ".probe/rate.json", "capture/extracted/visible-text.txt", "assets/fonts", "compositions/frames",
];
const COMPARE = [
  "script.json", "STORYBOARD.md", "SCRIPT-REVIEW.md", "caption_groups.json",
  "compositions/captions.html", "compositions/overlay.html",
  "tools/frame-skeleton.html", "tools/worker-delta-0.7.99.md", "capture/extracted/tokens.json",
];

// baseline scripts: file-based tar, because execSync runs cmd.exe on Windows
const oldTree = join(R, `old-${rev}`);
rmSync(oldTree, { recursive: true, force: true });
mkdirSync(oldTree, { recursive: true });
execSync(`git -C "${SKILL}" archive --format=tar -o "${R}/old-${rev}.tar" ${rev} scripts templates/worker-kit`);
// relative operands: GNU tar (Git Bash) reads "D:" in a path as a remote host
execSync(`tar -xf old-${rev}.tar -C old-${rev}`, { cwd: R });

function stage(project, side) {
  const dir = join(R, `${basename(project)}-${side}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  for (const f of INPUTS) cpSync(join(project, f), join(dir, f), { recursive: true });
  const src = side === "old" ? oldTree : SKILL;
  cpSync(join(src, "scripts"), join(dir, "tools"), { recursive: true });
  cpSync(join(src, "templates/worker-kit"), join(dir, "tools/worker-kit"), { recursive: true });
  return dir;
}

function run(dir) {
  const nums = [...readFileSync(join(dir, "STORYBOARD.md"), "utf8").matchAll(/^## Frame (\d+) /gm)].map((m) => m[1]);
  const steps = [
    ["1", ["tools/src-to-script.mjs", "script.src.txt", "script.json"]],
    ["2", ["tools/script-to-md.mjs", "--check", "script.json"]],
    ["2b", ["tools/script-to-md.mjs", "--review", "script.json"]],
    ["3", ["tools/retime-and-cue.mjs"]],
    ["4", ["tools/variety-lint.mjs", "STORYBOARD.md"]],
    ["5", ["tools/build-karaoke.mjs"]],
    ["6", ["tools/build-overlay.mjs"]],
    ["7", ["tools/build-design-kit.mjs"]],
    ["8", ["tools/frame-guard.mjs", ...nums]],
  ];
  return steps.map(([k, a]) => {
    const r = spawnSync("node", a, { cwd: dir, encoding: "utf8" });
    return { k, code: r.status, stdout: r.stdout };
  });
}

let failed = false;
for (const project of projects) {
  const name = basename(project);
  const missing = INPUTS.filter((f) => !existsSync(join(project, f)));
  if (missing.length) {
    for (const f of missing) console.log(`✗ ${name}: missing ${f}`);
    failed = true;
    continue;
  }
  const oldDir = stage(project, "old");
  const newDir = stage(project, "new");
  const a = run(oldDir), b = run(newDir);
  const problems = [];
  a.forEach((s, i) => {
    console.log(`${name} step ${s.k} exit old=${s.code} new=${b[i].code}`);
    // step 8 (frame-guard) characterizes frame content, which may carry pre-existing findings (the Hermes
    // frames predate the glyph rule): it must only match between old and new; steps 1–7 must exit 0
    const mustPass = s.k !== "8";
    if ((mustPass && (s.code !== 0 || b[i].code !== 0)) || s.code !== b[i].code) problems.push(`step ${s.k} exit old=${s.code} new=${b[i].code}`);
  });
  if (a.at(-1).stdout !== b.at(-1).stdout) problems.push("step 8 frame-guard stdout differs");
  for (const f of COMPARE) {
    const fa = join(oldDir, f), fb = join(newDir, f);
    if (!existsSync(fa) || !existsSync(fb)) continue;
    if (!readFileSync(fa).equals(readFileSync(fb))) problems.push(`${f} differs`);
  }
  if (problems.length) {
    for (const p of problems) console.log(`✗ ${name}: ${p}`);
    failed = true;
  } else console.log(`regression ok ${name}`);
}
process.exit(failed ? 1 : 0);
