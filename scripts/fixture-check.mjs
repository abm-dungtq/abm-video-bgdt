#!/usr/bin/env node
// fixture-check.mjs — prove that the pinned HyperFrames CLI (video.config.json `cli.pin`) and the
// installed faceless-explainer scripts still work together before a project relies on them.
// Builds a throwaway 2-frame project next to this one (silent voice, skeleton frames, one
// crossfade), then runs assemble-index → transitions inject/verify → lint → check → snapshot.
//
//   node tools/fixture-check.mjs          (from the project root; needs tools/frame-skeleton.html)
//
// Exit 0 = the pin is usable. Any failure prints the failing step; a new pin then needs its own
// tools/worker-kit/worker-delta-<pin>.md.tmpl written from the lint output.

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, resolve } from "node:path";
import { cfg, FE_SCRIPTS as SK, HF, ROOT } from "./lib/config.mjs";

const W = resolve(ROOT, `../.fixture-${cfg.name}-${process.pid}`);
const frames = [
  { n: 1, id: "01-fixture-title", dur: 3, transition: "cut", text: "Fixture 1" },
  { n: 2, id: "02-fixture-body", dur: 3, transition: "crossfade", text: "Fixture 2" },
];

function step(name, cmd, cwd = W) {
  process.stdout.write(`== ${name}\n`);
  try {
    return execSync(cmd, { cwd, stdio: "pipe", encoding: "utf8", env: { ...process.env, HYPERFRAMES_SKIP_SKILLS: "1" } });
  } catch (e) {
    console.error(`✗ ${name} failed\n${((e.stdout || "") + (e.stderr || "")).slice(-1500)}`);
    console.error(`fixture kept for inspection: ${W}`);
    process.exit(1);
  }
}

if (!existsSync("tools/frame-skeleton.html")) {
  console.error("✗ tools/frame-skeleton.html missing: run node tools/build-design-kit.mjs first");
  process.exit(1);
}
rmSync(W, { recursive: true, force: true });
step("init", `npx -y ${HF} init "${W}" --non-interactive --example=blank --resolution landscape`, ROOT);

mkdirSync(join(W, "compositions/frames"), { recursive: true });
mkdirSync(join(W, "assets/voice"), { recursive: true });
const fonts = join(ROOT, "assets/fonts");
if (existsSync(fonts)) cpSync(fonts, join(W, "assets/fonts"), { recursive: true });

const skeleton = readFileSync("tools/frame-skeleton.html", "utf8");
const voices = [];
const sb = ["---", "format: 1920x1080", "duration: 6s", "message: \"fixture\"", "mode: autonomous", "music: none", "---", ""];
for (const f of frames) {
  const src = `compositions/frames/${f.id}.html`; // the file stem must equal the composition id
  let html = skeleton
    .replaceAll("FRAME_ID", f.id).replaceAll("PFX", `f${String(f.n).padStart(2, "0")}`)
    .replaceAll("DURATION", String(f.dur)).replaceAll("HUE", String(cfg.design.hueBase));
  if (!existsSync(fonts)) html = html.replace(/^\s*@font-face.*$/gm, "");
  const pfx = `f${String(f.n).padStart(2, "0")}`;
  html = html
    .replace("<!-- shots go here; reveal each element on its cue -->", `<div id="${pfx}-word" style="position:absolute;left:0;top:340px;width:1760px;text-align:center;font-size:96px;font-weight:800;opacity:0">${f.text}</div>`)
    .replace("// build the shot sequence here with gsap.fromTo / tl.set at the cue times", `tl.fromTo("#${pfx}-word", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.6 }, 0.3);`);
  writeFileSync(join(W, src), html);
  const voice = `assets/voice/${String(f.n).padStart(2, "0")}.wav`;
  execSync(`ffmpeg -v error -y -f lavfi -i anullsrc=r=${cfg.voice.sampleRate}:cl=mono -t ${f.dur} -c:a pcm_s16le "${join(W, voice)}"`);
  voices.push({ frame: f.n, path: voice, duration_s: f.dur, words: [] });
  sb.push(`## Frame ${f.n} — ${f.text}`, "", "- status: animated", `- src: ${src}`, `- duration: ${f.dur}s`, `- transition_in: ${f.transition}`, "");
}
writeFileSync(join(W, "STORYBOARD.md"), sb.join("\n"));
writeFileSync(join(W, "audio_meta.json"), JSON.stringify({ bgm: null, bgm_pending: false, voices, sfx: [] }));

step("assemble-index", `node "${SK}/assemble-index.mjs" --storyboard ./STORYBOARD.md --hyperframes .`);
step("transitions inject", `node "${SK}/transitions.mjs" inject --storyboard ./STORYBOARD.md --hyperframes .`);
step("transitions verify", `node "${SK}/transitions.mjs" verify --storyboard ./STORYBOARD.md --index ./index.html`);
const lint = step("lint", `npx -y ${HF} lint`);
console.log(lint.split("\n").filter((l) => /✗|⚠|error/.test(l)).join("\n"));
step("check", `npx -y ${HF} check --timeout 60000`);
step("snapshot", `npx -y ${HF} snapshot --timeout 60000 --at 1.5,4.5`);
rmSync(W, { recursive: true, force: true });
console.log(`fixture-check ok: ${HF} + ${SK}`);
