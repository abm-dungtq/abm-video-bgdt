// config.mjs — project parameters (video.config.json at the project root = cwd) plus
// machine-local paths, resolved by lib/machine.mjs (env var → machine profile → discovery; nothing is tied to one machine).
//
//   HF_SKILLS_DIR   HeyGen skills root (default: the first of ~/.agents/skills, ~/.claude/skills, ~/.codex/skills,
//                   ~/.cursor/skills, ~/.gemini/skills, ~/.config/opencode/skills that holds faceless-explainer)
//   VIENEU_TTS_DIR  VieNeu-TTS checkout whose uv venv runs the audio tools (default: `vieneuDir` in the machine profile
//                   written by setup/setup.mjs, else the nearest VieNeu-TTS/ folder beside the project or its parents)
//   HF_CACHE_DIR    render frames cache            (default <project>/.hf-cache)
//
//   node tools/lib/config.mjs --vieneu-dir         prints the resolved VieNeu-TTS folder (used by run-pipeline.ps1)
//   node tools/lib/config.mjs --skills-dir         prints the resolved HeyGen skills root (used by run-pipeline.ps1)

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findSkillsDir, findVieneuDir } from "./machine.mjs";

export const ROOT = resolve(".");
export const cfg = JSON.parse(readFileSync(join(ROOT, "video.config.json"), "utf8"));

const slash = (p) => p.replace(/\\/g, "/");
export const SKILLS_DIR = findSkillsDir();
export const FE_SCRIPTS = `${SKILLS_DIR}/faceless-explainer/scripts`;
export const CACHE_DIR = slash(process.env.HF_CACHE_DIR ?? resolve(ROOT, ".hf-cache"));

/** The VieNeu-TTS checkout the audio tools run in; throws with a setup hint when none is found. */
export function vieneuDir() {
  const d = findVieneuDir(ROOT);
  if (!d) throw new Error("VieNeu-TTS not found: run setup/setup.mjs, or set VIENEU_TTS_DIR (see SETUP.md)");
  return d;
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
// free chapter structure (optional; absent in projects made before 0.8.0): exercise cap and distinct chapter arcs
export const STRUCTURE = cfg.structure
  ? { maxExercise: cfg.structure.maxExercise ?? 1, distinctChapterArcs: cfg.structure.distinctChapterArcs ?? true }
  : null;
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
