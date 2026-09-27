#!/usr/bin/env node
// sync-report.mjs — measure render/narration drift at 3 points per chapter and cut spot clips.
//
//   node tools/sync-report.mjs [renders/draft.mp4]      writes renders/sync.json + renders/spot/*.mp4
//   node tools/sync-report.mjs --max                    prints max |offset| from renders/sync.json;
//                                                       exits 1 when it exceeds 0.15 s or a point is unmeasured

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { vieneuDir } from "./lib/config.mjs";
import { buildVoiceConcat, storyboardFrames, VOICE_CONCAT } from "./lib/voice-concat.mjs";

if (process.argv.includes("--max")) {
  const rows = JSON.parse(readFileSync("renders/sync.json", "utf8"));
  const measured = rows.filter((r) => r.offset_s != null);
  const max = Math.max(...measured.map((r) => Math.abs(r.offset_s)));
  console.log(max.toFixed(3));
  process.exit(measured.length === rows.length && max <= 0.15 ? 0 : 1);
}

const render = process.argv[2] ?? "renders/draft.mp4";
const frames = await storyboardFrames();

// reference: the voice wavs laid end to end exactly as the assembler places them
buildVoiceConcat(frames);

// chapter windows → start+5, middle, end−5
const chapters = [];
let t = 0, prev = null;
for (const f of frames) {
  const ch = f.extra?.chapter;
  if (ch !== prev) chapters.push({ id: ch, start: t, end: t });
  prev = ch;
  t += f.durationSeconds ?? parseFloat(f.duration);
  chapters.at(-1).end = t;
}
const points = chapters.flatMap((c) => [c.start + 5, (c.start + c.end) / 2, c.end - 5].map((x) => +x.toFixed(2)));

execFileSync("uv", ["run", "--directory", vieneuDir(), "python", `${process.cwd()}/tools/xcorr.py`,
  "--render", `${process.cwd()}/${render}`, "--reference", `${process.cwd()}/${VOICE_CONCAT}`,
  "--at", points.join(","), "--out", `${process.cwd()}/renders/sync.json`], { stdio: "inherit" });

mkdirSync("renders/spot", { recursive: true });
for (const p of points) {
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(Math.max(0, p - 2)), "-t", "4", "-i", render,
    "-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac", `renders/spot/t${p.toFixed(0).padStart(3, "0")}.mp4`]);
}
console.log(`sync-report: ${points.length} points → renders/sync.json, renders/spot/`);
