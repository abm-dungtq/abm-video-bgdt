// config.mjs — project parameters (video.config.json at the project root = cwd) plus
// machine-local paths (env vars with this machine's defaults).
//
//   HF_SKILLS_DIR   HeyGen skills root            (default ~/.agents/skills)
//   VIENEU_VENV     VieNeu-TTS uv project (venv)   (default D:/TQD/Claude-Video/VieNeu-TTS)
//   HF_CACHE_DIR    render frames cache            (default <project>/../../.hf-cache)

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const ROOT = resolve(".");
export const cfg = JSON.parse(readFileSync(join(ROOT, "video.config.json"), "utf8"));

const slash = (p) => p.replace(/\\/g, "/");
export const SKILLS_DIR = slash(process.env.HF_SKILLS_DIR ?? join(homedir(), ".agents/skills"));
export const FE_SCRIPTS = `${SKILLS_DIR}/faceless-explainer/scripts`;
export const VENV = slash(process.env.VIENEU_VENV ?? "D:/TQD/Claude-Video/VieNeu-TTS");
export const CACHE_DIR = slash(process.env.HF_CACHE_DIR ?? resolve(ROOT, "../../.hf-cache"));
export const HF = `hyperframes@${cfg.cli.pin}`;
// full-project check/snapshot navigation timeout; 60 s timed out on a loaded machine (2026-09-25)
export const CHECK_TIMEOUT = cfg.cli.checkTimeoutMs ?? 240000;
// frame-guard rules: glyphs the shipped fonts lack, and optional regexes every `- rail:` frame must carry
export const GUARD = {
  missingGlyphs: cfg.guard?.missingGlyphs ?? "①②③✳✕✓→",
  railPatterns: (cfg.guard?.railPatterns ?? []).map((p) => new RegExp(p)),
};

/** "#0B1026" → "11,16,38" */
export const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",");

/** "Chương {n} · {title}" with chapter 0 rendered as the bare title */
export const chapterLabel = (template, n, title) => (n === 0 ? title : template.replace("{n}", n).replace("{title}", title));

export async function loadStoryboardParser() {
  return import(pathToFileURL(`${FE_SCRIPTS}/lib/storyboard.mjs`).href);
}
