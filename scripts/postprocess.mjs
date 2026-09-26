#!/usr/bin/env node
// postprocess.mjs — final audio + chapters.
//
//   node tools/postprocess.mjs [renders/master-raw.mp4] [renders/<name>.mp4]
//
// The picture is copied from the render untouched. The audio is NOT the renderer's (it mixes the per-frame
// <audio> clips and encodes AAC, so normalising it would encode a second time): it is audio/voice-concat.wav
// (the same voice wavs laid end to end, the reference sync-report already validates), upmixed to stereo
// (dual mono at full level via pan, like the renderer; aformat would split the power -3 dB per channel), two-pass loudnorm, padded or cut to the video's length, AAC once.
// `loudness.tp` is the DELIVERED true-peak ceiling: loudnorm aims 1 dB lower because the AAC encode adds
// ~0.7 dB of intersample overshoot, and the encoded file is asserted (exit 1 when I is off by more than
// 1 LU or the true peak is above `loudness.tp`).
// Run sync-report on the render BEFORE this step: afterwards the final file carries the reference itself.
// Also writes renders/chapters.txt (mm:ss per chapter start) and prints the final file's loudness.

import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { cfg, chapterLabel } from "./lib/config.mjs";
import { buildVoiceConcat, storyboardFrames } from "./lib/voice-concat.mjs";

const [input = "renders/master-raw.mp4", output = `renders/${cfg.name}.mp4`] = process.argv.slice(2);
const LN = `pan=stereo|c0=c0|c1=c0,loudnorm=I=${cfg.loudness.i}:TP=${cfg.loudness.tp - 1}:LRA=${cfg.loudness.lra}`;
const frames = await storyboardFrames();
const voice = buildVoiceConcat(frames);
const videoS = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", input], { encoding: "utf8" }));

// pass 1: measure the voice master
const p1 = spawnSync("ffmpeg", ["-hide_banner", "-i", voice, "-af", `${LN}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" });
const m = JSON.parse(p1.stderr.slice(p1.stderr.lastIndexOf("{"), p1.stderr.lastIndexOf("}") + 1));
// pass 2: apply linearly, pad/cut to the picture, one AAC encode, picture stream-copied
execFileSync("ffmpeg", [
  "-v", "error", "-y", "-i", input, "-i", voice, "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
  "-af", `${LN}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true,apad`,
  "-t", videoS.toFixed(3), "-ar", "48000", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", output,
], { stdio: "inherit" });

// final loudness (integrated + true peak) as delivered
const ebu = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", output, "-af", "ebur128=peak=true", "-f", "null", "-"],
  { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).stderr; // the per-frame log is tens of MB
const summary = ebu.slice(ebu.lastIndexOf("Summary:"));
const I = summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1];
const TP = summary.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1];

// chapters
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
console.log(`postprocess: ${output} (voice master ${m.input_i} LUFS, ${m.normalization_type} → I ${I} LUFS, true peak ${TP} dBFS, ${videoS.toFixed(2)} s), chapters=${lines.length}`);
const ok = I != null && TP != null && Math.abs(Number(I) - cfg.loudness.i) <= 1 && Number(TP) <= cfg.loudness.tp;
if (!ok) {
  console.error(`✗ delivered loudness out of spec: I ${I} (target ${cfg.loudness.i} ±1), true peak ${TP} (max ${cfg.loudness.tp})`);
  process.exit(1);
}
