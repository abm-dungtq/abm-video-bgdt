// paths.mjs — where the CLI runs from. Works both from the skill (S/bin/abm-video.mjs) and from the copy
// inside a project (P/tools/bin/abm-video.mjs), where the scripts sit flat in P/tools and the skill root
// is recorded in P/tools/skill-root.txt (setup/ imports ../scripts/lib, so it is never copied).

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const slash = (p) => p.replace(/\\/g, "/");
export const TOOLS_ROOT = slash(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
const rootFile = join(TOOLS_ROOT, "skill-root.txt");
export const SKILL_ROOT = existsSync(join(TOOLS_ROOT, "setup"))
  ? TOOLS_ROOT
  : existsSync(rootFile) ? slash(readFileSync(rootFile, "utf8").trim()) : TOOLS_ROOT;
export const SETUP = `${SKILL_ROOT}/setup`;
export const MCP = `${SKILL_ROOT}/mcp/vieneu-tts`;
export const REFS = `${SKILL_ROOT}/references`;
/** The viet-pro skill that writes and audits the narration: next to this skill, or VIET_PRO_DIR. */
export const VIET_PRO = slash(process.env.VIET_PRO_DIR ?? join(SKILL_ROOT, "..", "viet-pro"));

/** The lesson project: the nearest folder from cwd upwards that holds video.config.json, else null. */
export function findProject(start = process.cwd()) {
  for (let d = resolve(start); ; d = dirname(d)) {
    if (existsSync(join(d, "video.config.json")) && !existsSync(join(d, "SKILL.md"))) return slash(d);
    if (dirname(d) === d) return null;
  }
}
export const PROJECT = findProject();

/** Scripts a stage runs: the project's own pinned copy in P/tools when present, else the skill's scripts/. */
export function scriptsDir(P) {
  if (P && existsSync(join(P, "tools/lib/config.mjs"))) return `${P}/tools`;
  return existsSync(join(TOOLS_ROOT, "scripts")) ? `${TOOLS_ROOT}/scripts` : TOOLS_ROOT;
}
