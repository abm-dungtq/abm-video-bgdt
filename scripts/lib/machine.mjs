// machine.mjs — per-machine settings shared by the tools, the setup scripts and the MCP launcher.
// Nothing here is tied to one computer: values come from env vars, the machine profile written by
// setup/setup.mjs, or discovery.
//
//   profile  ~/.config/abm-video-bgdt/machine.json (override with ABM_VIDEO_PROFILE)
//            { vieneuDir, profile: "cuda"|"cpu"|"mps", env: { VIENEU_BACKEND, VIENEU_DTYPE }, gpu, updated }

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

const slash = (p) => p.replace(/\\/g, "/");

export const PROFILE_PATH = slash(process.env.ABM_VIDEO_PROFILE ?? join(homedir(), ".config", "abm-video-bgdt", "machine.json"));

export function readProfile() {
  try {
    return JSON.parse(readFileSync(PROFILE_PATH, "utf8"));
  } catch {
    return {};
  }
}

export function writeProfile(profile) {
  mkdirSync(dirname(PROFILE_PATH), { recursive: true });
  writeFileSync(PROFILE_PATH, JSON.stringify({ ...profile, updated: new Date().toISOString() }, null, 2) + "\n");
}

// `npx hyperframes skills` installs into the skill folder of each agent it finds, so look in all of them
export const SKILL_ROOTS = [".agents/skills", ".claude/skills", ".codex/skills", ".cursor/skills", ".gemini/skills", ".config/opencode/skills"]
  .map((r) => slash(join(homedir(), r)));

/** HeyGen skills root: $HF_SKILLS_DIR, else the first agent skill folder holding faceless-explainer. */
export function findSkillsDir() {
  if (process.env.HF_SKILLS_DIR) return slash(resolve(process.env.HF_SKILLS_DIR));
  return SKILL_ROOTS.find((r) => existsSync(join(r, "faceless-explainer/scripts/lib/storyboard.mjs"))) ?? SKILL_ROOTS[0];
}

const isVieneu = (d) => d && existsSync(join(d, "pyproject.toml"));

/**
 * VieNeu-TTS checkout: $VIENEU_TTS_DIR, else the machine profile, else the nearest VieNeu-TTS/ folder found
 * walking up from `start`. Returns null when none is found.
 */
export function findVieneuDir(start = process.cwd()) {
  if (process.env.VIENEU_TTS_DIR) {
    const d = resolve(process.env.VIENEU_TTS_DIR);
    if (!isVieneu(d)) throw new Error(`VIENEU_TTS_DIR=${d} is not a VieNeu-TTS checkout (no pyproject.toml)`);
    return slash(d);
  }
  const p = readProfile().vieneuDir;
  if (isVieneu(p)) return slash(p);
  for (let d = resolve(start); ; d = dirname(d)) {
    if (isVieneu(join(d, "VieNeu-TTS"))) return slash(join(d, "VieNeu-TTS"));
    if (dirname(d) === d) return null;
  }
}
