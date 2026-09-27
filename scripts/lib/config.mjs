// config.mjs — project parameters (video.config.json at the project root = cwd) plus
// machine-local paths (env vars, else discovered; nothing is tied to one machine).
//
//   HF_SKILLS_DIR   HeyGen skills root (default: the first of ~/.agents/skills, ~/.claude/skills, ~/.codex/skills,
//                   ~/.cursor/skills, ~/.gemini/skills, ~/.config/opencode/skills that holds faceless-explainer)
//   VIENEU_TTS_DIR  VieNeu-TTS checkout whose uv venv runs the audio tools (default: the nearest folder named
//                   VieNeu-TTS beside the project or beside one of its parents, e.g. <workspace>/VieNeu-TTS)
//   HF_CACHE_DIR    render frames cache            (default <project>/.hf-cache)
//
//   node tools/lib/config.mjs --vieneu-dir         prints the resolved VieNeu-TTS folder (used by run-pipeline.ps1)
//   node tools/lib/config.mjs --skills-dir         prints the resolved HeyGen skills root (used by run-pipeline.ps1)

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const ROOT = resolve(".");
export const cfg = JSON.parse(readFileSync(join(ROOT, "video.config.json"), "utf8"));

const slash = (p) => p.replace(/\\/g, "/");
// `npx hyperframes skills` installs into the skill folder of each agent it finds, so look in all of them
const SKILL_ROOTS = [".agents/skills", ".claude/skills", ".codex/skills", ".cursor/skills", ".gemini/skills", ".config/opencode/skills"]
  .map((r) => join(homedir(), r));
export const SKILLS_DIR = slash(process.env.HF_SKILLS_DIR ??
  SKILL_ROOTS.find((r) => existsSync(join(r, "faceless-explainer/scripts/lib/storyboard.mjs"))) ?? SKILL_ROOTS[0]);
export const FE_SCRIPTS = `${SKILLS_DIR}/faceless-explainer/scripts`;
export const CACHE_DIR = slash(process.env.HF_CACHE_DIR ?? resolve(ROOT, ".hf-cache"));

/** The VieNeu-TTS checkout: $VIENEU_TTS_DIR, else the nearest VieNeu-TTS/pyproject.toml found walking up from the project. */
export function vieneuDir() {
  if (process.env.VIENEU_TTS_DIR) {
    const d = resolve(process.env.VIENEU_TTS_DIR);
    if (!existsSync(join(d, "pyproject.toml"))) throw new Error(`VIENEU_TTS_DIR=${d} is not a VieNeu-TTS checkout (no pyproject.toml)`);
    return slash(d);
  }
  for (let d = ROOT; ; d = dirname(d)) {
    if (existsSync(join(d, "VieNeu-TTS", "pyproject.toml"))) return slash(join(d, "VieNeu-TTS"));
    if (dirname(d) === d) break;
  }
  throw new Error("VieNeu-TTS not found: set VIENEU_TTS_DIR to your VieNeu-TTS checkout (see SETUP.md)");
}
export const HF = `hyperframes@${cfg.cli.pin}`;
// full-project check/snapshot navigation timeout; 60 s timed out on a loaded machine (2026-09-25)
export const CHECK_TIMEOUT = cfg.cli.checkTimeoutMs ?? 240000;
// frame-guard rules: glyphs the shipped fonts lack, and optional regexes every `- rail:` frame must carry
export const GUARD = {
  missingGlyphs: cfg.guard?.missingGlyphs ?? "①②③✳✕✓→",
  railPatterns: (cfg.guard?.railPatterns ?? []).map((p) => new RegExp(p)),
  layoutPatterns: Object.fromEntries(Object.entries(cfg.guard?.layoutPatterns ?? {}).map(([k, v]) => [k, v.map((p) => new RegExp(p))])),
};
// layout library (all optional): catalog = inspiration pieces, never a closed list; custom-<name> is always valid
export const LAYOUTS = {
  catalog: cfg.layouts?.catalog ?? [],
  fixed: cfg.layouts?.fixed ?? {},
  minDistinctPerChapter: cfg.layouts?.minDistinctPerChapter ?? 3,
  maxShare: cfg.layouts?.maxShare ?? 0.25,
  requireCustomPerChapter: cfg.layouts?.requireCustomPerChapter ?? true,
};
// DNA BGĐT v1.1 roles (Hook → Core → Case → Action); off unless the config enables it
export const ROLES = ["hook", "core", "case", "action"];
export const DNA = {
  enabled: cfg.dna?.enabled ?? false,
  strict: cfg.dna?.strict ?? false,
  roleLabels: { hook: "Hook", core: "Core", case: "Case", action: "Action", ...(cfg.dna?.roleLabels ?? {}) },
};

/** "#0B1026" → "11,16,38" */
export const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(",");

/** "Chương {n} · {title}" with chapter 0 rendered as the bare title */
export const chapterLabel = (template, n, title) => (n === 0 ? title : template.replace("{n}", n).replace("{title}", title));

export async function loadStoryboardParser() {
  return import(pathToFileURL(`${FE_SCRIPTS}/lib/storyboard.mjs`).href);
}

if (resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === "--vieneu-dir") console.log(vieneuDir());
  if (process.argv[2] === "--skills-dir") console.log(SKILLS_DIR);
}
