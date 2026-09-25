#!/usr/bin/env node
// tts-manifest.mjs — script.json → audio/tts-jobs.json (one VieNeu MCP call per sentence).
//
//   node tools/tts-manifest.mjs            write audio/tts-jobs.json
//   node tools/tts-manifest.mjs --count    verify job count == sentence count
//   node tools/tts-manifest.mjs --pending  list jobs whose wav is missing (resumable batches), with the
//                                          text_to_speech arguments from video.config.json `voice`

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { cfg } from "./lib/config.mjs";

const ROOT = resolve(".");
const script = JSON.parse(readFileSync("script.json", "utf8"));
const jobs = script.chapters.flatMap((c) =>
  c.frames.flatMap((f) =>
    f.sentences.map((s) => ({
      id: s.id,
      frame: f.id,
      text: s.tokens.map((t) => t.spoken).join(" "),
      output_path: `${ROOT.replace(/\\/g, "/")}/audio/clips/${s.id}.wav`,
    })),
  ),
);
const done = (j) => existsSync(j.output_path) && statSync(j.output_path).size > 10240;

if (process.argv.includes("--count")) {
  const onDisk = JSON.parse(readFileSync("audio/tts-jobs.json", "utf8")).length;
  console.log(`jobs=${onDisk} sentences=${jobs.length}`);
  process.exit(onDisk === jobs.length ? 0 : 1);
} else if (process.argv.includes("--pending")) {
  const pending = jobs.filter((j) => !done(j));
  const { id: voice, temperature, sampleRate: sample_rate } = cfg.voice;
  console.log(JSON.stringify({ voice, temperature, sample_rate, jobs: pending.map(({ id, text, output_path }) => ({ id, text, output_path })) }));
  console.error(`pending=${pending.length}/${jobs.length}`);
} else {
  mkdirSync("audio/clips", { recursive: true });
  writeFileSync("audio/tts-jobs.json", JSON.stringify(jobs, null, 1));
  console.log(`audio/tts-jobs.json: ${jobs.length} jobs`);
}
