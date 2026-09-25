#!/usr/bin/env node
// measure-rate.mjs — speaking rate of the configured voice from one probe clip, for the script
// budget (script-to-md --check) and the clip QA (build-voice.py --qa).
//
//   node tools/measure-rate.mjs .probe/rate.wav "<exact text sent to text_to_speech>"
//
// Writes .probe/rate.json = { voice, duration_s, syllables, syllables_per_s }.
// Vietnamese: one whitespace-separated token = one syllable.

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { cfg } from "./lib/config.mjs";

const [wav, text] = process.argv.slice(2);
if (!wav || !text) {
  console.error('usage: measure-rate.mjs <wav> "<text>"');
  process.exit(1);
}
const duration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", wav], { encoding: "utf8" }));
const syllables = text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
const rate = Number((syllables / duration).toFixed(2));
mkdirSync(".probe", { recursive: true });
writeFileSync(".probe/rate.json", JSON.stringify({ voice: cfg.voice.id, duration_s: Number(duration.toFixed(2)), syllables, syllables_per_s: rate }, null, 1));
console.log(`rate=${rate} syl/s (${syllables} syllables in ${duration.toFixed(2)} s)${rate > 2.5 && rate < 6 ? "" : "  ✗ outside 2.5–6: re-record the probe"}`);
process.exit(rate > 2.5 && rate < 6 ? 0 : 1);
