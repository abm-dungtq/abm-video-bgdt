// migrate.mjs — bring a project made before the abm-video CLI (hand-built frames, no scenes.json, no .abm/state.json)
// under the CLI without touching its content. Writes only:
//   scenes.json         every storyboard frame as { "frame": N, "custom": true } (hand-built, never compiled)
//   .abm/state.json     legacy: true; every stage whose output exists stamped done (one timestamp, so nothing is stale);
//                       every gate approved with note "historic" on its current files (missing artifacts hash to null)
// Legacy projects are exempt from scenes.customBudget, and their assemble-stage layout check only warns.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { GATES } from "./gates.mjs";
import { activeStages } from "./stages.mjs";
import { hashes, save } from "./state.mjs";
import { readStoryboard } from "../compiler/lint.mjs";

/** the output that proves a stage ran in a legacy project */
const EVIDENCE = {
  doctor: () => true, init: (P) => existsSync(join(P, "video.config.json")),
  probe: (P) => existsSync(join(P, ".probe/rate.json")), script: (P) => existsSync(join(P, "script.json")),
  screens: (P) => existsSync(join(P, "capture/screens/INDEX.md")), tts: (P) => existsSync(join(P, "audio_meta.json")),
  voice: (P) => existsSync(join(P, "audio_meta.json")), storyboard: (P) => existsSync(join(P, "STORYBOARD.md")),
  compile: (P) => existsSync(join(P, "compositions/frames")), karaoke: (P) => existsSync(join(P, "compositions/captions.html")),
  assemble: (P) => existsSync(join(P, "index.html")),
  draft: (P, cfg) => existsSync(join(P, "renders/draft.mp4")) || existsSync(join(P, `renders/${cfg.name}.mp4`)),
  final: (P, cfg) => existsSync(join(P, `renders/${cfg.name}.mp4`)),
  clean: () => false,
};

export function migrate(P) {
  if (existsSync(join(P, ".abm/state.json"))) throw new Error("this project already has .abm/state.json (nothing to migrate)");
  if (existsSync(join(P, "scenes.json"))) throw new Error("this project already has scenes.json");
  if (!existsSync(join(P, "STORYBOARD.md"))) throw new Error("no STORYBOARD.md: not a legacy abm-video-bgdt project");
  const cfg = JSON.parse(readFileSync(join(P, "video.config.json"), "utf8"));
  const frames = readStoryboard(readFileSync(join(P, "STORYBOARD.md"), "utf8")).map((f) => ({ frame: f.no, custom: true }));
  writeFileSync(join(P, "scenes.json"), JSON.stringify({ version: 1, frames }, null, 1) + "\n");

  const at = new Date().toISOString();
  const s = { version: 1, stages: {}, gates: {}, legacy: true };
  const stamped = [];
  for (const st of activeStages(cfg)) {
    if (!EVIDENCE[st.name]?.(P, cfg)) continue;
    s.stages[st.name] = { status: "done", at, inputs: hashes(P, st.inputs), note: "historic" };
    stamped.push(st.name);
  }
  for (const [n, g] of Object.entries(GATES)) {
    if (n === "2b" && cfg.screens !== true) continue;
    s.gates[n] = { status: "approved", approvedAt: at, note: "historic", artifacts: hashes(P, g.artifacts) };
  }
  save(P, s);
  return { frames: frames.length, stamped };
}
