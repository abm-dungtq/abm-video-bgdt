// tts.mjs — narration over the VieNeu-TTS HTTP API in one batch (replaces one MCP call per sentence).
//
//   abm-video tts [--concurrency 4]              every pending job from tools/tts-manifest.mjs --pending
//   abm-video tts --text "<text>" --out <wav>    one clip (probes: pronunciation terms, rate sentence)
//
// Same request body as mcp/vieneu-tts/server.py. The API answers raw s16le mono PCM, written here as WAV.
// Plausibility QA per clip, same rule as build-voice.py --qa: 0.6× ≤ duration / (syllables / rate) ≤ 1.6×.
// Speech check (verify): every clip is transcribed (scripts/asr-check.py); a clip whose word error rate is above
// voice.maxWer is spoken again, twice at most, keeping its best take.

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

/**
 * Speech check of every clip. `asr(ids)` transcribes those clips and returns [{ id, wer, expected, heard }].
 * Returns the clips still wrong after the retakes: `warn` (maxWer < WER ≤ 2 × maxWer) and `fail` (worse, or missing);
 * ids listed in audio/qa-accepted.txt are never failed. Writes audio/asr-report.json.
 */
export async function verify(P, asr, rounds = 2) {
  const cfg = JSON.parse(readFileSync(join(P, "video.config.json"), "utf8"));
  const maxWer = cfg.voice.maxWer ?? 0.2;
  const jobs = new Map(JSON.parse(readFileSync(join(P, "audio/tts-jobs.json"), "utf8")).map((j) => [j.id, j]));
  const good = (r) => typeof r.wer === "number" && r.wer <= maxWer;
  const best = new Map(asr([...jobs.keys()]).map((r) => [r.id, r]));
  for (let round = 1; round <= rounds; round++) {
    const bad = [...best.values()].filter((r) => !good(r) && existsSync(jobs.get(r.id).output_path));
    if (!bad.length) break;
    console.log(`tts: speech check, retake ${round}: ${bad.length} clip(s)`);
    for (const r of bad) {
      const j = jobs.get(r.id);
      copyFileSync(j.output_path, `${j.output_path}.best`);
      await speak(j.text, j.output_path, cfg.voice);
    }
    for (const r of asr(bad.map((x) => x.id))) {
      const j = jobs.get(r.id);
      if (typeof r.wer === "number" && r.wer < best.get(r.id).wer) best.set(r.id, r);
      else copyFileSync(`${j.output_path}.best`, j.output_path);
      rmSync(`${j.output_path}.best`, { force: true });
    }
  }
  const list = [...best.values()];
  writeFileSync(join(P, "audio/asr-report.json"), JSON.stringify(list, null, 1));
  const accepted = existsSync(join(P, "audio/qa-accepted.txt")) ? readFileSync(join(P, "audio/qa-accepted.txt"), "utf8") : "";
  const warn = list.filter((r) => !good(r) && r.wer <= 2 * maxWer);
  const fail = list.filter((r) => !good(r) && !(r.wer <= 2 * maxWer) && !accepted.includes(r.id));
  for (const r of [...warn, ...fail]) {
    console.log(`${fail.includes(r) ? "✗" : "⚠"} ${r.id}: WER ${r.wer ?? "?"}${r.missing ? ` (missing ${r.missing})` : ""}`);
    if (r.heard) console.log(`    script: ${r.expected}\n    heard:  ${r.heard}`);
  }
  const scored = list.filter((r) => typeof r.wer === "number");
  const mean = scored.reduce((s, r) => s + r.wer, 0) / Math.max(1, scored.length);
  console.log(`tts: speech check ${list.length} clip(s), mean WER ${mean.toFixed(3)}, ${warn.length} to listen to, ${fail.length} failed`);
  return { warn, fail };
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
