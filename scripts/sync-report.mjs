#!/usr/bin/env node
// sync-report.mjs — measure render/narration drift at 3 points per chapter and cut spot clips.
//
//   node tools/sync-report.mjs [renders/draft.mp4]      writes renders/sync.json + renders/spot/*.mp4
//   node tools/sync-report.mjs --max                    prints max |offset| from renders/sync.json;
//                                                       exits 1 when it exceeds 0.15 s or a point is unmeasured

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { loadStoryboardParser, VENV } from "./lib/config.mjs";

if (process.argv.includes("--max")) {
  const rows = JSON.parse(readFileSync("renders/sync.json", "utf8"));
  const measured = rows.filter((r) => r.offset_s != null);
  const max = Math.max(...measured.map((r) => Math.abs(r.offset_s)));
  console.log(max.toFixed(3));
  process.exit(measured.length === rows.length && max <= 0.15 ? 0 : 1);
}

const render = process.argv[2] ?? "renders/draft.mp4";
const { parseStoryboard } = await loadStoryboardParser();
const { frames } = parseStoryboard(readFileSync("STORYBOARD.md", "utf8"));

// reference: the voice wavs laid end to end exactly as the assembler places them
if (!existsSync("audio/voice-concat.wav")) {
  const list = frames.map((f) => `file '../assets/voice/${String(f.number).padStart(2, "0")}.wav'`).join("\n");
  writeFileSync("audio/voice-list.txt", list);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", "audio/voice-list.txt", "-c", "copy", "audio/voice-concat.wav"]);
}

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

execFileSync("uv", ["run", "--directory", VENV, "python", `${process.cwd()}/tools/xcorr.py`,
  "--render", `${process.cwd()}/${render}`, "--reference", `${process.cwd()}/audio/voice-concat.wav`,
  "--at", points.join(","), "--out", `${process.cwd()}/renders/sync.json`], { stdio: "inherit" });

mkdirSync("renders/spot", { recursive: true });
for (const p of points) {
  execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(Math.max(0, p - 2)), "-t", "4", "-i", render,
    "-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac", `renders/spot/t${p.toFixed(0).padStart(3, "0")}.mp4`]);
}
console.log(`sync-report: ${points.length} points → renders/sync.json, renders/spot/`);
