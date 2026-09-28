#!/usr/bin/env node
// variety-report.mjs — print the variety scorecard of a lesson project as one JSON line.
//
//   node dev/variety-report.mjs <project-dir>
//
// Reads scenes.json (required), script.json and audio_meta.json (optional: frame durations). Exit 2 without scenes.json.

import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { score } from "../compiler/scorecard.mjs";
import { HINT } from "../compiler/solver.mjs";

const P = resolve(process.argv[2] ?? ".");
const read = (f) => (existsSync(join(P, f)) ? JSON.parse(readFileSync(join(P, f), "utf8")) : null);
const scenes = read("scenes.json");
if (!scenes) { console.log(JSON.stringify({ error: "no scenes.json" })); process.exit(2); }
const meta = read("audio_meta.json");
const durations = meta?.voices ? new Map(meta.voices.map((v) => [v.frame, v.duration_s])) : null;
const script = read("script.json");
const hints = script ? new Map(script.chapters.flatMap((c) => c.frames.map((f) => [f.id, HINT[f.scene_hint] ?? f.scene_hint]))) : null;
console.log(JSON.stringify({ project: basename(P), ...score({ scenes, script, durations, hints }) }));
