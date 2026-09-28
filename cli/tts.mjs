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

/** RMS in dBFS of the last `ms` of a 16-bit PCM WAV; above voice.maxTailDb the model stopped mid-syllable. */
export const tailDb = (wavPath, ms = 40) => windowDb(wavPath, ms, true);

/** RMS in dBFS of the first `ms` of a 16-bit PCM WAV; above voice.maxHeadDb the model started mid-consonant. */
export const headDb = (wavPath, ms = 20) => windowDb(wavPath, ms, false);

/**
 * RMS in dBFS of the first or last `ms` of a 16-bit PCM WAV.
 * Parses the RIFF header and finds the "data" chunk (does not assume a 44-byte header).
 */
function windowDb(wavPath, ms, atEnd) {
  const buf = readFileSync(wavPath);
  if (buf.length < 12) return -Infinity;
  if (buf.subarray(0, 4).toString("latin1") !== "RIFF" || buf.subarray(8, 12).toString("latin1") !== "WAVE") {
    throw new Error(`Not a valid RIFF/WAVE file: ${wavPath}`);
  }
  let offset = 12;
  let sampleRate = 48000;
  let channels = 1;
  let bitsPerSample = 16;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= buf.length) {
    const chunkId = buf.subarray(offset, offset + 4).toString("latin1");
    const chunkSize = buf.readUInt32LE(offset + 4);
    const chunkData = offset + 8;
    if (chunkId === "fmt " && chunkSize >= 16) {
      channels = buf.readUInt16LE(chunkData + 2);
      sampleRate = buf.readUInt32LE(chunkData + 4);
      bitsPerSample = buf.readUInt16LE(chunkData + 14);
    } else if (chunkId === "data") {
      dataOffset = chunkData;
      dataSize = Math.min(chunkSize, buf.length - chunkData);
    }
    offset = chunkData + chunkSize + (chunkSize % 2);
  }

  if (dataOffset === -1 || dataSize <= 0) return -Infinity;

  const bytesPerSample = (bitsPerSample || 16) / 8;
  const bytesPerFrame = (channels || 1) * bytesPerSample;
  const totalFrames = Math.floor(dataSize / bytesPerFrame);
  if (totalFrames <= 0) return -Infinity;

  const framesToRead = Math.min(totalFrames, Math.round((sampleRate * ms) / 1000));
  if (framesToRead <= 0) return -Infinity;

  const startFrame = atEnd ? totalFrames - framesToRead : 0;
  const startByte = dataOffset + startFrame * bytesPerFrame;
  const endByte = dataOffset + (startFrame + framesToRead) * bytesPerFrame;

  let sumSq = 0;
  let sampleCount = 0;
  for (let pos = startByte; pos + 2 <= endByte; pos += 2) {
    const s = buf.readInt16LE(pos);
    const norm = s / 32768.0;
    sumSq += norm * norm;
    sampleCount++;
  }

  if (sampleCount === 0 || sumSq === 0) return -Infinity;
  const rms = Math.sqrt(sumSq / sampleCount);
  return 20 * Math.log10(rms);
}

const tailOk = (r, lim) => typeof r.tail_db !== "number" || r.tail_db <= lim.maxTailDb;
const headOk = (r, lim) => typeof r.head_db !== "number" || r.head_db <= lim.maxHeadDb;

function isBetter(a, b, lim) {
  // a cut start or end loses sound that no later step can restore, so it outranks ASR
  const aSound = tailOk(a, lim) + headOk(a, lim);
  const bSound = tailOk(b, lim) + headOk(b, lim);
  if (aSound !== bSound) return aSound > bSound;

  const aEdgeOk = !a.edge;
  const bEdgeOk = !b.edge;
  if (aEdgeOk !== bEdgeOk) return aEdgeOk;

  const aWer = typeof a.wer === "number" ? a.wer : Infinity;
  const bWer = typeof b.wer === "number" ? b.wer : Infinity;
  return aWer < bWer;
}

/**
 * Speech check of every clip. `asr(ids)` transcribes those clips and returns [{ id, wer, expected, heard }].
 * Returns the clips still wrong after the retakes: `warn` (maxWer < WER ≤ 2 × maxWer) and `fail` (worse, or missing);
 * ids listed in audio/qa-accepted.txt are never failed. Writes audio/asr-report.json.
 */
export async function verify(P, asr, rounds) {
  const cfg = JSON.parse(readFileSync(join(P, "video.config.json"), "utf8"));
  const maxWer = cfg.voice?.maxWer ?? 0.2;
  const lim = { maxTailDb: cfg.voice?.maxTailDb ?? -40, maxHeadDb: cfg.voice?.maxHeadDb ?? -40 };
  // the model cuts about 60 % of starts and 40 % of ends at random; only failing clips are regenerated
  const totalRounds = rounds ?? cfg.voice?.retakes ?? 10;
  const jobs = new Map(JSON.parse(readFileSync(join(P, "audio/tts-jobs.json"), "utf8")).map((j) => [j.id, j]));

  const enrich = (r) => {
    const j = jobs.get(r.id);
    const wavPath = j && existsSync(j.output_path) ? j.output_path : (j && existsSync(join(P, j.output_path)) ? join(P, j.output_path) : null);
    const db = (v) => (Number.isFinite(v) ? Number(v.toFixed(1)) : -100);
    if (wavPath) {
      r.tail_db = db(tailDb(wavPath));
      r.head_db = db(headDb(wavPath));
    } else {
      r.tail_db = r.tail_db ?? -100;
      r.head_db = r.head_db ?? -100;
    }
    r.edge = Boolean(r.edge);
    return r;
  };

  const good = (r) => typeof r.wer === "number" && r.wer <= maxWer && !r.edge && tailOk(r, lim) && headOk(r, lim);

  const best = new Map(asr([...jobs.keys()]).map((r) => [r.id, enrich(r)]));

  for (let round = 1; round <= totalRounds; round++) {
    const bad = [...best.values()].filter((r) => !good(r) && existsSync(jobs.get(r.id)?.output_path));
    if (!bad.length) break;
    console.log(`tts: speech check, retake ${round}: ${bad.length} clip(s)`);
    for (const r of bad) {
      const j = jobs.get(r.id);
      copyFileSync(j.output_path, `${j.output_path}.best`);
      await speak(j.text, j.output_path, cfg.voice);
    }
    for (const r of asr(bad.map((x) => x.id))) {
      const j = jobs.get(r.id);
      enrich(r);
      if (isBetter(r, best.get(r.id), lim)) {
        best.set(r.id, r);
      } else {
        copyFileSync(`${j.output_path}.best`, j.output_path);
      }
      rmSync(`${j.output_path}.best`, { force: true });
    }
  }

  const list = [...best.values()];
  writeFileSync(join(P, "audio/asr-report.json"), JSON.stringify(list, null, 1));
  const accepted = existsSync(join(P, "audio/qa-accepted.txt")) ? readFileSync(join(P, "audio/qa-accepted.txt"), "utf8") : "";

  // After the rounds, a clip whose best take is still cut at either end or wrong at an edge word is a FAIL (not a warn) unless its id is in audio/qa-accepted.txt.
  const hasFatalDefect = (r) => Boolean(r.missing || typeof r.wer !== "number" || r.wer > 2 * maxWer || r.edge || !tailOk(r, lim) || !headOk(r, lim));

  const fail = list.filter((r) => !good(r) && hasFatalDefect(r) && !accepted.includes(r.id));
  const warn = list.filter((r) => !good(r) && !fail.includes(r));

  for (const r of [...warn, ...fail]) {
    const headStr = typeof r.head_db === "number" ? `, head ${r.head_db} dBFS` : "";
    const tailStr = typeof r.tail_db === "number" ? `, tail ${r.tail_db} dBFS` : "";
    const edgeStr = r.edge ? ", edge error" : "";
    console.log(`${fail.includes(r) ? "✗" : "⚠"} ${r.id}: WER ${r.wer ?? "?"}${headStr}${tailStr}${edgeStr}${r.missing ? ` (missing ${r.missing})` : ""}`);
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
