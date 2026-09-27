#!/usr/bin/env node
// register-mcp.mjs — register the vieneu-tts MCP server with the coding agents on this machine.
//
//   node setup/register-mcp.mjs                       every agent found on this machine
//   node setup/register-mcp.mjs --agents claude,codex  only these
//   node setup/register-mcp.mjs --dry-run             print what would change
//   node setup/register-mcp.mjs --list                show which agents were found
//
// Agents: claude (Claude Code CLI + desktop), codex (Codex CLI), cursor, gemini (Gemini CLI), vscode (GitHub Copilot in
// VS Code, user mcp.json), copilot (Copilot CLI), opencode, windsurf (Windsurf / Devin Desktop).
// Claude Code and Codex are registered through their own `mcp add` CLI; the others by merging their JSON config.
// Every edited file is backed up to <file>.bak first; an existing vieneu-tts entry is left untouched.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SERVER_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../mcp/vieneu-tts").replace(/\\/g, "/");
const NAME = "vieneu-tts";
const ENV = { VIENEU_API_URL: process.env.VIENEU_API_URL ?? "http://127.0.0.1:8000", PYTHONIOENCODING: "utf-8" };
const CMD = "uv", ARGS = ["run", "--directory", SERVER_DIR, "python", "server.py"];
const H = homedir();
const win = process.platform === "win32", mac = process.platform === "darwin";

const onPath = (bin) => spawnSync(win ? "where" : "which", [bin], { encoding: "utf8" }).status === 0;
// one command line through the shell (Windows needs it for .cmd shims such as claude.cmd); quote arguments with spaces
const q = (a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a);
const sh = (bin, args) => spawnSync([bin, ...args].map(q).join(" "), { encoding: "utf8", shell: true });
const vscodeUser = win ? join(process.env.APPDATA ?? join(H, "AppData/Roaming"), "Code/User")
  : mac ? join(H, "Library/Application Support/Code/User") : join(H, ".config/Code/User");

function mergeJson(file, key, entry, dry) {
  const data = existsSync(file) ? JSON.parse(readFileSync(file, "utf8") || "{}") : {};
  data[key] ??= {};
  if (data[key][NAME]) return `already registered in ${file}`;
  data[key][NAME] = entry;
  if (dry) return `would add ${NAME} to ${file} (${key})`;
  mkdirSync(dirname(file), { recursive: true });
  if (existsSync(file)) copyFileSync(file, `${file}.bak`);
  writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
  return `added ${NAME} to ${file}`;
}
const stdEntry = { command: CMD, args: ARGS, env: ENV };
const envFlags = Object.entries(ENV).flatMap(([k, v]) => ["--env", `${k}=${v}`]);

const AGENTS = {
  claude: {
    found: () => onPath("claude"),
    register: (dry) => {
      if (sh("claude", ["mcp", "get", NAME]).status === 0) return "already registered in Claude Code";
      const a = ["mcp", "add", "--transport", "stdio", "--scope", "user", NAME, ...envFlags, "--", CMD, ...ARGS];
      if (dry) return `would run: claude ${a.join(" ")}`;
      const r = sh("claude", a);
      if (r.status !== 0) throw new Error(`claude mcp add failed: ${r.stderr || r.stdout}`);
      return "added to Claude Code (user scope)";
    },
  },
  codex: {
    found: () => onPath("codex") || existsSync(join(H, ".codex")),
    register: (dry) => {
      const file = join(H, ".codex/config.toml");
      if (existsSync(file) && readFileSync(file, "utf8").includes(`[mcp_servers.${NAME}]`)) return `already registered in ${file}`;
      if (onPath("codex")) {
        const a = ["mcp", "add", NAME, ...envFlags, "--", CMD, ...ARGS];
        if (dry) return `would run: codex ${a.join(" ")}`;
        const r = sh("codex", a);
        if (r.status !== 0) throw new Error(`codex mcp add failed: ${r.stderr || r.stdout}`);
        return "added to Codex CLI";
      }
      const toml = `\n[mcp_servers.${NAME}]\ncommand = "${CMD}"\nargs = ${JSON.stringify(ARGS)}\n\n[mcp_servers.${NAME}.env]\n` +
        Object.entries(ENV).map(([k, v]) => `${k} = "${v}"`).join("\n") + "\n";
      if (dry) return `would append [mcp_servers.${NAME}] to ${file}`;
      mkdirSync(dirname(file), { recursive: true });
      if (existsSync(file)) copyFileSync(file, `${file}.bak`);
      writeFileSync(file, (existsSync(file) ? readFileSync(file, "utf8") : "") + toml);
      return `added ${NAME} to ${file}`;
    },
  },
  cursor: { found: () => existsSync(join(H, ".cursor")), register: (dry) => mergeJson(join(H, ".cursor/mcp.json"), "mcpServers", stdEntry, dry) },
  gemini: { found: () => existsSync(join(H, ".gemini")) || onPath("gemini"), register: (dry) => mergeJson(join(H, ".gemini/settings.json"), "mcpServers", stdEntry, dry) },
  vscode: { found: () => existsSync(vscodeUser), register: (dry) => mergeJson(join(vscodeUser, "mcp.json"), "servers", { type: "stdio", ...stdEntry }, dry) },
  copilot: { found: () => existsSync(join(H, ".copilot")) || onPath("copilot"), register: (dry) => mergeJson(join(process.env.COPILOT_HOME ?? join(H, ".copilot"), "mcp-config.json"), "mcpServers", stdEntry, dry) },
  opencode: {
    found: () => existsSync(join(H, ".config/opencode")) || onPath("opencode"),
    register: (dry) => mergeJson(join(H, ".config/opencode/opencode.json"), "mcp",
      { type: "local", command: [CMD, ...ARGS], environment: ENV, enabled: true }, dry),
  },
  windsurf: { found: () => existsSync(join(H, ".codeium/windsurf")), register: (dry) => mergeJson(join(H, ".codeium/windsurf/mcp_config.json"), "mcpServers", stdEntry, dry) },
};

export function registerMcp({ agents = "auto", dry = false } = {}) {
  const names = agents === "auto" ? Object.keys(AGENTS).filter((a) => AGENTS[a].found()) : agents.split(",").map((s) => s.trim());
  const out = [];
  for (const a of names) {
    if (!AGENTS[a]) { out.push(`✗ ${a}: unknown agent (known: ${Object.keys(AGENTS).join(", ")})`); continue; }
    try { out.push(`${a}: ${AGENTS[a].register(dry)}`); } catch (e) { out.push(`✗ ${a}: ${e.message}`); }
  }
  if (!names.length) out.push("no supported agent found; register the server by hand (SETUP.md § 7)");
  return out;
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  if (argv.includes("--list")) {
    for (const [a, def] of Object.entries(AGENTS)) console.log(`${def.found() ? "found  " : "absent "} ${a}`);
    process.exit(0);
  }
  const agents = argv.includes("--agents") ? argv[argv.indexOf("--agents") + 1] : "auto";
  const lines = registerMcp({ agents, dry: argv.includes("--dry-run") });
  for (const l of lines) console.log(l);
  process.exit(lines.some((l) => l.startsWith("✗")) ? 1 : 0);
}
