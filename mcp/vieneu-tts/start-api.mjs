#!/usr/bin/env node
// start-api.mjs — start the VieNeu-TTS speech API that the MCP server talks to (default http://127.0.0.1:8000).
// Works on Windows, macOS and Linux. Keep it running while you make a video.
//
//   node mcp/vieneu-tts/start-api.mjs [--repo <VieNeu-TTS dir>] [--host 127.0.0.1] [--port 8000]
//
// The VieNeu-TTS folder comes from --repo, $VIENEU_TTS_DIR, or the machine profile written by setup/setup.mjs.
// VIENEU_BACKEND / VIENEU_DTYPE come from the environment, else from the machine profile (chosen for this
// machine's hardware by setup/hardware.mjs). VIENEU_API_KEY and other VIENEU_* variables pass through.

import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { findVieneuDir, readProfile } from "../../scripts/lib/machine.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const opt = (name, dflt) => (argv.includes(name) ? argv[argv.indexOf(name) + 1] : dflt);

const repo = opt("--repo") ? resolve(opt("--repo")) : findVieneuDir(HERE);
if (!repo || !existsSync(join(repo, "pyproject.toml"))) {
  console.error("✗ VieNeu-TTS not found: pass --repo <path>, set VIENEU_TTS_DIR, or run node setup/setup.mjs");
  process.exit(1);
}
const profile = readProfile();
const env = {
  ...Object.fromEntries(Object.entries(profile.env ?? {}).filter(([k]) => !process.env[k])),
  ...process.env,
  HOST: opt("--host", "127.0.0.1"),
  PORT: opt("--port", "8000"),
  PYTHONIOENCODING: "utf-8",
};
console.log(`starting VieNeu API from ${repo} on http://${env.HOST}:${env.PORT} (backend=${env.VIENEU_BACKEND ?? "auto"}, dtype=${env.VIENEU_DTYPE ?? "float32"})`);
const child = spawn("uv", ["run", "python", join(HERE, "run-api.py")], { cwd: repo, env, stdio: "inherit" });
child.on("exit", (code) => process.exit(code ?? 0));
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => child.kill(sig));
