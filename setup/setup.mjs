#!/usr/bin/env node
// setup.mjs — set up abm-video-bgdt on this machine after the base tools exist (install.ps1 / install.sh install them).
//
//   node setup/setup.mjs                         plan, ask, then run every step
//   node setup/setup.mjs --yes                   run without asking (agents: only after the user agreed)
//   node setup/setup.mjs --dry-run               print the plan and the commands, change nothing
//   node setup/setup.mjs --only vieneu           run one step: link | hyperframes | vieneu | mcp
//   node setup/setup.mjs --skip hyperframes      skip steps (comma-separated)
//   node setup/setup.mjs --vieneu-dir <path>     use or clone VieNeu-TTS there (default: found, else ~/VieNeu-TTS)
//   node setup/setup.mjs --profile cpu           force a VieNeu profile: auto | cuda | cpu | mps (default auto)
//   node setup/setup.mjs --agents claude,codex   register the MCP server only for these agents (default: all found)
//
// Steps
//   link         link this skill into the skill folders of the agents found (Claude Code, Codex; ~/.agents/skills)
//   hyperframes  install the full HeyGen HyperFrames skill set: npx -y hyperframes@0.7.99 skills
//   vieneu       clone VieNeu-TTS if needed, install the profile that fits the hardware (setup/hardware.mjs),
//                add torchaudio 2.8 + uroman for word alignment, write the machine profile
//   mcp          register the vieneu-tts MCP server with every agent found (setup/register-mcp.mjs)
// Then setup/doctor.mjs checks the result.

import { existsSync, lstatSync, mkdirSync, symlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { findVieneuDir, PROFILE_PATH, writeProfile } from "../scripts/lib/machine.mjs";
import { detect, recipe } from "./hardware.mjs";
import { registerMcp } from "./register-mcp.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL = resolve(HERE, "..");
const H = homedir();
const win = process.platform === "win32";
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n, d) => (flag(n) ? argv[argv.indexOf(n) + 1] : d);
const DRY = flag("--dry-run");
const ALL = ["link", "hyperframes", "vieneu", "mcp"];
const only = opt("--only");
const skip = (opt("--skip", "") || "").split(",").filter(Boolean);
const steps = (only ? only.split(",") : ALL).filter((s) => !skip.includes(s));

const q = (a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
function run(cmd, args, cwd) {
  const line = [cmd, ...args].map(q).join(" ");
  console.log(`  $ ${line}${cwd ? `   (in ${cwd})` : ""}`);
  if (DRY) return;
  const r = spawnSync(line, { cwd, stdio: "inherit", shell: true });
  if (r.status !== 0) throw new Error(`command failed (${r.status}): ${line}`);
}
const has = (bin) => spawnSync(win ? "where" : "which", [bin], { encoding: "utf8" }).status === 0;

// ── plan ──────────────────────────────────────────────────────────────────────
const missing = ["git", "ffmpeg", "ffprobe", "uv", "npx"].filter((b) => !has(b));
if (missing.length) {
  console.error(`✗ missing base tools: ${missing.join(", ")}. Run ${win ? "setup/install.ps1" : "setup/install.sh"} first.`);
  process.exit(1);
}
const hw = detect();
const profileName = opt("--profile", "auto") === "auto" ? hw.profile : opt("--profile");
let vieneuDir = opt("--vieneu-dir");
try { vieneuDir ??= findVieneuDir(SKILL); } catch (e) { console.error(`✗ ${e.message}`); process.exit(1); }
vieneuDir = resolve(vieneuDir ?? join(H, "VieNeu-TTS"));

console.log(`abm-video-bgdt setup (${DRY ? "dry run" : "live"})`);
console.log(`  skill:     ${SKILL}`);
console.log(`  steps:     ${steps.join(", ")}`);
if (steps.includes("vieneu")) {
  console.log(`  VieNeu:    ${vieneuDir}${existsSync(join(vieneuDir, "pyproject.toml")) ? " (existing checkout)" : " (will clone)"}`);
  console.log(`  hardware:  ${hw.profile}${hw.gpu?.computeCap ? ` — ${hw.gpu.name}, compute ${hw.gpu.computeCap}, driver CUDA ${hw.gpu.maxCuda}` : hw.gpu?.name ? ` — ${hw.gpu.name}` : ""}${hw.note ? ` (${hw.note})` : ""}`);
  console.log(`  profile:   ${profileName}`);
}
if (profileName === "unsupported") {
  console.error(`✗ ${hw.reason}`);
  process.exit(1);
}
if (!DRY && !flag("--yes")) {
  if (!process.stdin.isTTY) {
    console.error("✗ not interactive: ask the user, then rerun with --yes");
    process.exit(1);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ans = (await rl.question("Proceed? [y/N] ")).trim().toLowerCase();
  rl.close();
  if (ans !== "y" && ans !== "yes") process.exit(1);
}

// ── link ──────────────────────────────────────────────────────────────────────
if (steps.includes("link")) {
  console.log("\n== link the skill into agent skill folders");
  const targets = [join(H, ".agents/skills")];
  if (has("claude") || existsSync(join(H, ".claude"))) targets.push(join(H, ".claude/skills"));
  if (has("codex") || existsSync(join(H, ".codex"))) targets.push(join(H, ".codex/skills"));
  for (const root of targets) {
    const dest = join(root, basename(SKILL));
    if (resolve(dest) === SKILL) { console.log(`  ${dest}: this is the skill itself`); continue; }
    let present = false;
    try { lstatSync(dest); present = true; } catch { /* absent */ }
    if (present) { console.log(`  ${dest}: already present`); continue; }
    console.log(`  link ${dest} → ${SKILL}`);
    if (!DRY) {
      mkdirSync(root, { recursive: true });
      symlinkSync(SKILL, dest, win ? "junction" : "dir");
    }
  }
}

// ── hyperframes ───────────────────────────────────────────────────────────────
if (steps.includes("hyperframes")) {
  console.log("\n== HyperFrames skills (full published set)");
  run("npx", ["-y", "hyperframes@0.7.99", "skills"]);
}

// ── vieneu ────────────────────────────────────────────────────────────────────
if (steps.includes("vieneu")) {
  console.log(`\n== VieNeu-TTS (${profileName})`);
  const r = recipe(profileName, hw.gpu);
  if (!existsSync(join(vieneuDir, "pyproject.toml"))) run("git", ["clone", "https://github.com/pnnbao97/VieNeu-TTS.git", vieneuDir]);
  run("uv", r.sync, vieneuDir);
  run("uv", r.pip, vieneuDir);
  run("uv", ["run", "python", "-c", "import torch, torchaudio, uroman; print('alignment env ok:', torch.__version__, torchaudio.__version__, 'cuda', torch.cuda.is_available())"], vieneuDir);
  console.log(`  write ${PROFILE_PATH}`);
  if (!DRY) writeProfile({ vieneuDir: vieneuDir.replace(/\\/g, "/"), profile: profileName, env: r.env, gpu: hw.gpu ?? null });
}

// ── mcp ───────────────────────────────────────────────────────────────────────
if (steps.includes("mcp")) {
  console.log("\n== MCP server vieneu-tts");
  for (const l of registerMcp({ agents: opt("--agents", "auto"), dry: DRY })) console.log(`  ${l}`);
}

// ── check ─────────────────────────────────────────────────────────────────────
console.log("\n== doctor");
if (!DRY) spawnSync(process.execPath, [join(HERE, "doctor.mjs")], { stdio: "inherit" });
console.log(`
Next:
  1. start the speech API and keep it running:  node ${join(SKILL, "mcp/vieneu-tts/start-api.mjs").replace(/\\/g, "/")}
  2. restart your agent so it loads the skill and the vieneu-tts MCP server
  3. ask the agent to call server_status, then make a lesson ("làm video bài giảng về …")`);
