#!/usr/bin/env node
// postprocess.mjs — two-pass loudnorm (−16 LUFS, TP −1.5) with the video stream copied, plus
// renders/chapters.txt (mm:ss per chapter start) from the storyboard. Target loudness, output
// name and chapter title format come from video.config.json.
//
//   node tools/postprocess.mjs [renders/master-raw.mp4] [renders/<name>.mp4]

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { cfg, chapterLabel, loadStoryboardParser } from "./lib/config.mjs";

const [input = "renders/master-raw.mp4", output = `renders/${cfg.name}.mp4`] = process.argv.slice(2);
const LN = `loudnorm=I=${cfg.loudness.i}:TP=${cfg.loudness.tp}:LRA=${cfg.loudness.lra}`;

// pass 1: measure
const p1 = spawnSync("ffmpeg", ["-hide_banner", "-i", input, "-af", `${LN}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" });
const m = JSON.parse(p1.stderr.slice(p1.stderr.lastIndexOf("{"), p1.stderr.lastIndexOf("}") + 1));
// pass 2: apply linearly, copy video
execFileSync("ffmpeg", [
  "-v", "error", "-y", "-i", input, "-c:v", "copy",
  "-af", `${LN}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`,
  "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", output,
], { stdio: "inherit" });

// chapters
const { parseStoryboard } = await loadStoryboardParser();
const { frames } = parseStoryboard(readFileSync("STORYBOARD.md", "utf8"));
const script = JSON.parse(readFileSync("script.json", "utf8"));
const title = new Map(script.chapters.map((c, i) => [c.id, chapterLabel(cfg.chapterLabel.chapters, i, c.title)]));
const mmss = (t) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
let t = 0, prev = null;
const lines = [];
for (const f of frames) {
  const ch = f.extra?.chapter;
  if (ch !== prev) lines.push(`${mmss(t)} ${title.get(ch)}`);
  prev = ch;
  t += f.durationSeconds ?? parseFloat(f.duration);
}
writeFileSync("renders/chapters.txt", lines.join("\n") + "\n");
console.log(`postprocess: ${output} (measured ${m.input_i} LUFS → ${cfg.loudness.i}), chapters=${lines.length}`);
