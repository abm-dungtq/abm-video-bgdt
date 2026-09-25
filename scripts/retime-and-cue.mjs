#!/usr/bin/env node
// retime-and-cue.mjs — bring STORYBOARD.md visual timing from the estimated durations to the real
// voice durations, and add each frame's aligned keyword times.
//
//   node tools/retime-and-cue.mjs                    scale shots/Scene times by duration/est_duration,
//                                                    snap shot boundaries to keyword cues (±0.8 s),
//                                                    write `- cues:` and `- retimed_from:` bullets
//   node tools/retime-and-cue.mjs --check            cues count == keyword count per frame
//   node tools/retime-and-cue.mjs --patch-voiceover  rewrite `- voiceover:` from script.json in place
//
// Idempotent: `- retimed_from:` records the duration the visual times currently refer to, so a
// re-run after a voice change rescales from that value rather than from est_duration.

import { readFileSync, writeFileSync } from "node:fs";

const SNAP_S = 0.8;
const r2 = (x) => Math.round(x * 100) / 100;
const md = readFileSync("STORYBOARD.md", "utf8");
const meta = JSON.parse(readFileSync("audio_meta.json", "utf8"));
const script = JSON.parse(readFileSync("script.json", "utf8"));
const frames = new Map(script.chapters.flatMap((c) => c.frames).map((f) => [f.id, f]));
const voices = new Map(meta.voices.map((v) => [v.frame, v]));

function cuesFor(id) {
  const f = frames.get(id), v = voices.get(id);
  const toks = f.sentences.flatMap((s) => s.tokens);
  if (toks.length !== v.words.length) throw new Error(`frame ${id}: ${toks.length} tokens vs ${v.words.length} words`);
  return toks.flatMap((t, i) => (t.keyword ? [{ word: v.words[i].text.replace(/[.,!?:;…"“”]/g, ""), t: r2(v.words[i].start) }] : []));
}

// split into frame blocks, keeping the preamble and the trailing sections intact
const parts = md.split(/(?=^## Frame \d+ )/m);
const mode = process.argv.includes("--check") ? "check" : process.argv.includes("--patch-voiceover") ? "patch" : "retime";
let bad = 0;

const out = parts.map((block) => {
  const m = block.match(/^## Frame (\d+) /);
  if (!m) return block;
  const id = Number(m[1]);
  const get = (k) => block.match(new RegExp(`^- ${k}: (.+)$`, "m"))?.[1];
  const setBullet = (b, k, v) =>
    new RegExp(`^- ${k}: .+$`, "m").test(b)
      ? b.replace(new RegExp(`^- ${k}: .+$`, "m"), `- ${k}: ${v}`)
      : b.replace(/^(- sfx: .+)$/m, `$1\n- ${k}: ${v}`);

  if (mode === "patch") {
    const text = frames.get(id).sentences.map((s) => s.tokens.map((t) => t.display).join(" ")).join(" ");
    return setBullet(block, "voiceover", `"${text.replace(/"/g, "”")}"`);
  }
  const cues = cuesFor(id);
  if (mode === "check") {
    const have = (get("cues") ?? "").split(",").filter((x) => x.includes("@")).length;
    if (have !== cues.length) {
      console.error(`✗ frame ${id}: cues ${have} vs keywords ${cues.length}`);
      bad++;
    }
    return block;
  }

  const duration = parseFloat(get("duration"));
  const from = parseFloat(get("retimed_from") ?? get("est_duration"));
  const k = duration / from;
  const cueTimes = cues.map((c) => c.t);
  const snap = (t) => {
    const near = cueTimes.reduce((best, c) => (Math.abs(c - t) < Math.abs(best - t) ? c : best), Infinity);
    return Math.abs(near - t) <= SNAP_S ? near : t;
  };

  // shots: scale, snap interior boundaries, force the last end to the real duration
  const shots = get("shots").split(",").map((s) => s.trim()).map((s) => {
    const [, type, a, b] = s.match(/^([a-z]+)@([\d.]+)-([\d.]+)$/);
    return { type, a: +a * k, b: +b * k };
  });
  const boundary = new Map(); // scaled value → snapped value
  for (let i = 0; i < shots.length - 1; i++) {
    const nb = r2(Math.min(Math.max(snap(shots[i].b), shots[i].a + 1), shots[i + 1].b - 1));
    boundary.set(r2(shots[i].b), nb);
    shots[i].b = nb;
    shots[i + 1].a = nb;
  }
  shots[0].a = 0;
  shots.at(-1).b = r2(duration);
  const shotStr = shots.map((s) => `${s.type}@${r2(s.a)}-${r2(s.b)}`).join(", ");

  // Scene lines and inline "~N s" hints: scale, reuse snapped shot boundaries when they coincide
  const mapT = (t) => {
    const scaled = r2(t * k);
    for (const [from2, to] of boundary) if (Math.abs(from2 - scaled) <= 0.05) return to;
    return Math.min(scaled, r2(duration));
  };
  let body = block.replace(/^(Scene \d+ \()([\d.]+)–([\d.]+)( s\))/gm, (_, p, a, b, s) => `${p}${mapT(+a)}–${mapT(+b)}${s}`);
  // inline "~N s" hints point at a spoken word: snap them to the nearest cue (±1.2 s)
  const snapHint = (t) => {
    const near = cueTimes.reduce((best, c) => (Math.abs(c - t) < Math.abs(best - t) ? c : best), Infinity);
    return Math.abs(near - t) <= 1.2 ? near : t;
  };
  body = body.replace(/~([\d.]+) s\b/g, (_, t) => `~${snapHint(mapT(+t))} s`);
  body = body.replace(/^- shots: .+$/m, `- shots: ${shotStr}`);
  body = setBullet(body, "retimed_from", `${duration}s`);
  body = setBullet(body, "cues", cues.map((c) => `${c.word}@${c.t}`).join(", ") || "none");
  return body;
});

if (mode === "check") {
  console.log(bad ? `FAIL (${bad})` : "cues ok");
  process.exit(bad ? 1 : 0);
}
writeFileSync("STORYBOARD.md", out.join(""));
console.log(`${mode}: ${parts.length - 1} frames`);
