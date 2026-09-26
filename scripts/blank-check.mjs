#!/usr/bin/env node
// blank-check.mjs — find stretches where the stage shows only the ground (canvas + glow), e.g. a frame
// whose late fromTo hid everything. Stock blackdetect misses them: the canvas is dark, not black.
//
//   node tools/blank-check.mjs [renders/<name>.mp4]
//
// Crops the stage (y 60–880: no overlay, no karaoke band) and runs blackdetect. Calibrated on the Claude
// lesson (2026-09-26): a looped ground-only frame is caught, the 875 s video has 0 hits, and its sparsest
// intended beats last ≤ 1 s. Override with video.config.json `qa.blank` {minS, pixTh, picTh}.
// Exits 1 when any stretch is found; check each one with `wave-check N@t` before changing a frame.

import { spawnSync } from "node:child_process";
import { cfg } from "./lib/config.mjs";

const video = process.argv[2] ?? `renders/${cfg.name}.mp4`;
const { minS = 2, pixTh = 0.25, picTh = 0.999 } = cfg.qa?.blank ?? {};
const vf = `crop=1920:820:0:60,blackdetect=d=${minS}:pix_th=${pixTh}:pic_th=${picTh}`;
const out = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", video, "-vf", vf, "-an", "-f", "null", "-"],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).stderr;
const hits = [...out.matchAll(/black_start:([\d.]+) black_end:([\d.]+)/g)].map(([, s, e]) => [Number(s), Number(e)]);
for (const [s, e] of hits) console.log(`✗ stage empty ${s.toFixed(2)}–${e.toFixed(2)} s (${(e - s).toFixed(2)} s)`);
console.log(hits.length ? `blank-check: ${hits.length} empty stretch(es)` : `blank-check ok (no empty stage ≥ ${minS} s)`);
process.exit(hits.length ? 1 : 0);
