#!/usr/bin/env node
// src-to-script.mjs — compact authoring file (script.src.txt) → script.json.
//
// Authoring format (one sentence per line):
//   # <chapter-id> | <title> | <level>          chapter
//   ## <n> | <scene_hint> | <title>             frame (ids are renumbered 1..N in file order)
//   > note text                                  optional frame note (visual intent)
//   Sentence with *keyword* tokens. {F-01,F-07}  sentence; *x* marks a keyword, {..} cites facts
//
// spoken == display for every token, except entries in video.config.json `spokenOverrides`
// (display token without punctuation → spoken text, from the pronunciation probe).
// Title, message, voice and budget come from video.config.json; the speech rate from
// .probe/rate.json (pilot calibration). Existing meta (e.g. `approved`) in script.json is preserved.
//
//   node tools/src-to-script.mjs script.src.txt script.json

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { cfg } from "./lib/config.mjs";

const SPOKEN_OVERRIDES = cfg.spokenOverrides ?? {};

const [srcPath = "script.src.txt", outPath = "script.json"] = process.argv.slice(2);
const lines = readFileSync(srcPath, "utf8").split(/\r?\n/);
const prev = existsSync(outPath) ? JSON.parse(readFileSync(outPath, "utf8")) : null;

const chapters = [];
let ch = null, fr = null, frameCount = 0;
const pad3 = (n) => String(n).padStart(3, "0");

for (const [i, raw] of lines.entries()) {
  const line = raw.trim();
  if (!line || line.startsWith("//")) continue;
  let m;
  if ((m = line.match(/^#\s+([^|]+)\|([^|]+)\|(.+)$/)) && !line.startsWith("##")) {
    ch = { id: m[1].trim(), title: m[2].trim(), level: m[3].trim(), frames: [] };
    chapters.push(ch);
  } else if ((m = line.match(/^##\s+(\d+)\s*\|([^|]+)\|(.+)$/))) {
    if (!ch) throw new Error(`line ${i + 1}: frame before chapter`);
    fr = { id: ++frameCount, scene_hint: m[2].trim(), title: m[3].trim(), sentences: [] };
    ch.frames.push(fr);
  } else if (line.startsWith(">")) {
    fr.notes = ((fr.notes ? fr.notes + " " : "") + line.slice(1).trim()).trim();
  } else {
    if (!fr) throw new Error(`line ${i + 1}: sentence before frame`);
    const facts = [];
    const text = line.replace(/\{([^}]*)\}\s*$/, (_, f) => {
      facts.push(...f.split(",").map((x) => x.trim()).filter(Boolean));
      return "";
    }).trim();
    const tokens = text.split(/\s+/).map((w) => {
      const keyword = /\*[^*]+\*/.test(w);
      const display = w.replace(/\*/g, "");
      const bare = display.replace(/^[.,!?;:…"“”()]+|[.,!?;:…"“”()]+$/g, "");
      const tok = { display, spoken: SPOKEN_OVERRIDES[bare] ? display.replace(bare, SPOKEN_OVERRIDES[bare]) : display };
      if (keyword) tok.keyword = true;
      return tok;
    });
    fr.sentences.push({ id: `s${pad3(fr.id)}-${fr.sentences.length + 1}`, tokens, facts });
  }
}

const meta = {
  title: cfg.title,
  message: cfg.message,
  voice: cfg.voice.id,
  temperature: cfg.voice.temperature,
  rate: JSON.parse(readFileSync(".probe/rate.json", "utf8")).syllables_per_s,
  budget: cfg.budget.syllables,
  ...(prev?.meta?.approved ? { approved: prev.meta.approved } : {}),
};
writeFileSync(outPath, JSON.stringify({ meta, chapters }, null, 1));
console.log(`script.json: chapters=${chapters.length} frames=${chapters.reduce((n, c) => n + c.frames.length, 0)}`);
