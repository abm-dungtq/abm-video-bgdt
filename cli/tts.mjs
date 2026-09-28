// tts.mjs — narration over the VieNeu-TTS HTTP API in one batch (replaces one MCP call per sentence).
//
//   abm-video tts [--concurrency 4]              every pending job from tools/tts-manifest.mjs --pending
//   abm-video tts --text "<text>" --out <wav>    one clip (probes: pronunciation terms, rate sentence)
//
// Same request body as mcp/vieneu-tts/server.py. The API answers raw s16le mono PCM, written here as WAV.
// Plausibility QA per clip, same rule as build-voice.py --qa: 0.6× ≤ duration / (syllables / rate) ≤ 1.6×.

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const API = (process.env.VIENEU_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

export async function apiUp() {
  try {
    const r = await fetch(`${API}/health`, { signal: AbortSignal.timeout(3000) });
    return r.ok;
  } catch {
    return false;
  }
}

function wav(pcm, sampleRate) {
  const h = Buffer.alloc(44);
  h.write("RIFF", 0); h.writeUInt32LE(36 + pcm.length, 4); h.write("WAVE", 8);
  h.write("fmt ", 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sampleRate, 24); h.writeUInt32LE(sampleRate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write("data", 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

async function speak(text, out, voice) {
  const body = JSON.stringify({ input: text, voice: voice.id, response_format: "pcm", sample_rate: voice.sampleRate,
    temperature: voice.temperature, top_k: 25, top_p: 0.95, repetition_penalty: 1.2 });
  let last;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 2000));
    try {
      const r = await fetch(`${API}/v1/audio/speech`, { method: "POST", headers: { "content-type": "application/json" }, body });
      if (r.status >= 500) { last = new Error(`HTTP ${r.status}`); continue; }
      if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`), { fatal: true });
      const pcm = Buffer.from(await r.arrayBuffer());
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, wav(pcm, voice.sampleRate));
      return pcm.length / 2 / voice.sampleRate;
    } catch (e) {
      if (e.fatal) throw e;
      last = e;
    }
  }
  throw new Error(`speech API failed after retries: ${last?.message}`);
}

const syllables = (text) => text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

/** One clip. Returns its duration in seconds. */
export async function one(P, text, out) {
  const cfg = JSON.parse(readFileSync(join(P, "video.config.json"), "utf8"));
  return speak(text, join(P, out), cfg.voice);
}

/** Every pending job; returns { done, total, flagged }. */
export async function batch(P, scripts, concurrency = 4) {
  const cfg = JSON.parse(readFileSync(join(P, "video.config.json"), "utf8"));
  const rate = JSON.parse(readFileSync(join(P, "script.json"), "utf8")).meta.rate;
  const { jobs } = JSON.parse(execFileSync(process.execPath, [join(scripts, "tts-manifest.mjs"), "--pending"],
    { cwd: P, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }));
  const t0 = Date.now();
  const flagged = [];
  let done = 0;
  const queue = [...jobs];
  const worker = async () => {
    for (let j; (j = queue.shift());) {
      const expected = syllables(j.text) / rate;
      const ok = (d) => d >= 0.6 * expected && d <= 1.6 * expected;
      let d = await speak(j.text, j.output_path, cfg.voice);
      if (!ok(d)) d = await speak(j.text, j.output_path, cfg.voice);
      if (!ok(d)) flagged.push({ id: j.id, duration: Number(d.toFixed(2)), expected: Number(expected.toFixed(2)) });
      if (++done % 10 === 0) console.log(`tts: ${done}/${jobs.length}`);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, concurrency) }, worker));
  if (flagged.length) {
    mkdirSync(join(P, "audio"), { recursive: true });
    writeFileSync(join(P, "audio/qa-flagged.json"), JSON.stringify(flagged, null, 1));
  }
  console.log(`tts: ${done}/${jobs.length} clips, ${flagged.length} flagged, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  return { done, total: jobs.length, flagged: flagged.length };
}
