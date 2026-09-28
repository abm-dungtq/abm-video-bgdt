#!/usr/bin/env node
// doctor.mjs — check everything abm-video-bgdt needs on this machine and say how to fix what is missing.
//
//   node setup/doctor.mjs           human-readable report
//   node setup/doctor.mjs --json    machine-readable report (for agents)
//   node setup/doctor.mjs --fix     when the HeyGen faceless-explainer scripts are missing or broken, install them
//                                   (hyperframes skills update faceless-explainer, at the pinned CLI) and check again
//
// Exit 1 when a required item fails (✗). Warnings (⚠) do not fail: the speech API may simply not be running yet.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findSkillsDir, findVieneuDir, PROFILE_PATH, readProfile } from "../scripts/lib/machine.mjs";
import { detect } from "./hardware.mjs";
import { registerMcp } from "./register-mcp.mjs";

const win = process.platform === "win32";
const HERE = dirname(fileURLToPath(import.meta.url));
const installer = win ? "setup/install.ps1" : "setup/install.sh";
const PIN = JSON.parse(readFileSync(join(HERE, "../templates/video.config.json"), "utf8")).cli.pin;
const checks = [];
const add = (name, level, detail, fix) => checks.push({ name, level, detail, fix });
// one command line through the shell (Windows needs it for .cmd shims such as npx); quote arguments with spaces
const q = (a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
const run = (cmd, args) => spawnSync([cmd, ...args].map(q).join(" "), { encoding: "utf8", shell: true });
const version = (cmd, args = ["--version"]) => {
  const r = run(cmd, args);
  return r.status === 0 ? (r.stdout || r.stderr).trim().split(/\r?\n/)[0] : null;
};

// ── tools ─────────────────────────────────────────────────────────────────────
const nodeMajor = Number(process.versions.node.split(".")[0]);
add("node", nodeMajor >= 20 ? "ok" : "fail", `v${process.versions.node}`, `install Node.js 20 or newer (${installer})`);
for (const [bin, args] of [["git"], ["ffmpeg", ["-version"]], ["ffprobe", ["-version"]], ["uv"], ["pwsh"], ["npx"]]) {
  const v = version(bin, args);
  add(bin, v ? "ok" : "fail", v ?? "not found", `run ${installer}`);
}

// ── HyperFrames skills ────────────────────────────────────────────────────────
const skillsDir = findSkillsDir();
const fe = existsSync(join(skillsDir, "faceless-explainer/scripts/lib/storyboard.mjs"));
const hfCount = existsSync(skillsDir) ? readdirSync(skillsDir).filter((d) => existsSync(join(skillsDir, d, "SKILL.md"))).length : 0;
add("hyperframes skills", fe ? "ok" : "fail", fe ? `${skillsDir} (${hfCount} skills)` : "faceless-explainer not found",
  `npx -y hyperframes@${PIN} skills   (or set HF_SKILLS_DIR)`);

// upstream scripts the pipeline calls (kept as a dependency, never vendored): import-probe each one
const FIX = `node ${resolve(HERE, "doctor.mjs").replace(/\\/g, "/")} --fix`;
const feDir = join(skillsDir, "faceless-explainer/scripts");
async function probeUpstream() {
  const out = [];
  const sb = join(feDir, "lib/storyboard.mjs");
  let ok = false;
  try { ok = existsSync(sb) && typeof (await import(pathToFileURL(sb).href)).parseStoryboard === "function"; } catch {}
  out.push(["upstream storyboard", ok, ok ? "parseStoryboard exported" : `${sb} missing or has no parseStoryboard`]);
  for (const [name, file, want] of [["upstream assemble", "assemble-index.mjs"], ["upstream transitions", "transitions.mjs"],
    ["upstream audio", "audio.mjs", "sync-durations"]]) {
    const f = join(feDir, file);
    const r = existsSync(f) ? spawnSync(process.execPath, [f, "--help"], { encoding: "utf8" }) : null;
    const text = r ? `${r.stdout}${r.stderr}` : "";
    const good = !!r && !/Cannot find module|ERR_MODULE_NOT_FOUND/.test(text) && (!want || text.includes(want) || readFileSync(f, "utf8").includes(want));
    out.push([name, good, good ? file : `${f} ${r ? "does not load" : "missing"}${want && r ? ` or lacks ${want}` : ""}`]);
  }
  return out;
}
let upstream = await probeUpstream();
if (process.argv.includes("--fix") && upstream.some(([, ok]) => !ok)) {
  // on 0.7.99 `skills update` refreshes every installed skill, so it only runs on --fix after a failed probe
  console.log(`fixing: npx -y hyperframes@${PIN} skills update faceless-explainer`);
  spawnSync(`npx -y hyperframes@${PIN} skills update faceless-explainer`, { stdio: "inherit", shell: true });
  upstream = await probeUpstream();
  console.log("upstream API may have moved: run node tools/fixture-check.mjs in a project before relying on it");
}
for (const [name, ok, detail] of upstream) add(name, ok ? "ok" : "fail", detail, FIX);
const upstreamOk = upstream.every(([, ok]) => ok);

// ── VieNeu-TTS ────────────────────────────────────────────────────────────────
let vieneu = null;
try { vieneu = findVieneuDir(resolve(HERE, "..")); } catch (e) { add("VieNeu-TTS", "fail", e.message, "fix VIENEU_TTS_DIR"); }
const hw = detect();
const profile = readProfile();
if (vieneu) {
  add("VieNeu-TTS", "ok", vieneu, "");
  const probe = run("uv", ["run", "--directory", vieneu, "python", "-c",
    "import torch, torchaudio, uroman; print(torch.__version__, torchaudio.__version__, torch.cuda.is_available())"]);
  if (probe.status === 0) {
    const [tv, tav, cuda] = probe.stdout.trim().split(/\s+/).slice(-3);
    const okTa = tav.startsWith("2.8.");
    add("alignment env", okTa ? "ok" : "fail", `torch ${tv}, torchaudio ${tav}, cuda ${cuda}`,
      okTa ? "" : "torchaudio must be 2.8.x (2.9 drops forced_align): rerun node setup/setup.mjs --only vieneu");
    if (hw.profile === "cuda" && cuda !== "True") add("gpu use", "warn", `${hw.gpu.name} found but torch cannot use CUDA`, "node setup/setup.mjs --only vieneu --profile cuda");
  } else {
    add("alignment env", "fail", "torch / torchaudio / uroman not importable in the VieNeu venv", "node setup/setup.mjs --only vieneu");
  }
} else if (!checks.some((c) => c.name === "VieNeu-TTS")) {
  add("VieNeu-TTS", "fail", "no checkout found", "node setup/setup.mjs --only vieneu   (or set VIENEU_TTS_DIR)");
}
add("machine profile", profile.profile ? (profile.profile === hw.profile ? "ok" : "warn") : "warn",
  profile.profile ? `${PROFILE_PATH}: ${profile.profile} (hardware suggests ${hw.profile})` : `none at ${PROFILE_PATH} (hardware suggests ${hw.profile})`,
  "node setup/setup.mjs --only vieneu");
if (hw.note) add("gpu driver", "warn", hw.note, "update the NVIDIA driver, then rerun node setup/setup.mjs --only vieneu");

// ── speech API and MCP ────────────────────────────────────────────────────────
const url = (process.env.VIENEU_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");
try {
  const r = await fetch(`${url}/health`, { signal: AbortSignal.timeout(3000) });
  add("speech API", r.ok ? "ok" : "warn", `${url} → HTTP ${r.status}`, "");
} catch {
  add("speech API", "warn", `${url} not reachable (not started yet?)`, "node mcp/vieneu-tts/start-api.mjs");
}
for (const line of registerMcp({ dry: true })) {
  const [agent, ...rest] = line.split(": ");
  const msg = rest.join(": ");
  add(`mcp ${agent}`, msg.startsWith("already") ? "ok" : "warn", msg, msg.startsWith("already") ? "" : "node setup/register-mcp.mjs");
}

// ── report ────────────────────────────────────────────────────────────────────
const failed = checks.filter((c) => c.level === "fail").length;
if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ ok: failed === 0, upstreamOk, hardware: hw, checks }, null, 2));
} else {
  const icon = { ok: "✓", warn: "⚠", fail: "✗" };
  for (const c of checks) console.log(`${icon[c.level]} ${c.name.padEnd(20)} ${c.detail}${c.level !== "ok" && c.fix ? `\n    → ${c.fix}` : ""}`);
  console.log(`\nhardware profile: ${hw.profile}${hw.gpu?.name ? ` (${hw.gpu.name}${hw.gpu.computeCap ? `, compute ${hw.gpu.computeCap}` : ""})` : ""}`);
  console.log(failed ? `doctor: ${failed} problem(s)` : "doctor ok");
}
process.exit(failed ? 1 : 0);
