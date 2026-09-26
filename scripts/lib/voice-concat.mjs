// voice-concat.mjs — the per-frame voice wavs laid end to end, exactly as the assembler places them.
// sync-report uses it as the reference for drift; postprocess uses it as the final audio (one AAC encode).

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { loadStoryboardParser } from "./config.mjs";

export const VOICE_CONCAT = "audio/voice-concat.wav";

/** Storyboard frames in order (parsed by faceless-explainer's parser). */
export async function storyboardFrames() {
  const { parseStoryboard } = await loadStoryboardParser();
  return parseStoryboard(readFileSync("STORYBOARD.md", "utf8")).frames;
}

/** Rebuild audio/voice-concat.wav from assets/voice/NN.wav (a stream copy, seconds; never trust an old one). */
export function buildVoiceConcat(frames) {
  const list = frames.map((f) => `file '../assets/voice/${String(f.number).padStart(2, "0")}.wav'`).join("\n");
  writeFileSync("audio/voice-list.txt", list);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", "audio/voice-list.txt", "-c", "copy", VOICE_CONCAT]);
  return VOICE_CONCAT;
}
