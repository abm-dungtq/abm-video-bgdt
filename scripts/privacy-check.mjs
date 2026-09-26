#!/usr/bin/env node
// privacy-check.mjs — prove that the video shows only screenshots the user approved at gate 2b.
//
//   node tools/privacy-check.mjs
//
// capture/screens/INDEX.md has one table row per shot:
//   | <redacted file> → assets/screens/<file> | F-NN | … | <approved Y/N> |
// Passes when:
//   - every file in assets/screens/ has a row whose last cell is Y;
//   - its md5 equals capture/screens/redacted/<redacted file> (nothing unredacted was copied);
//   - every assets/screens/ file a frame references is one of those approved files;
//   - no frame references capture/ (raw captures never reach a frame).
// A project without assets/screens/ passes with "no screens".

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SCREENS = "assets/screens";
if (!existsSync(SCREENS)) {
  console.log("privacy-check: no screens");
  process.exit(0);
}
const md5 = (p) => createHash("md5").update(readFileSync(p)).digest("hex");
const index = existsSync("capture/screens/INDEX.md") ? readFileSync("capture/screens/INDEX.md", "utf8") : "";
const rows = new Map();
for (const line of index.split("\n")) {
  const m = line.match(/^\|\s*(\S+)\s*→\s*assets\/screens\/(\S+?)\s*\|/);
  if (!m) continue;
  const cells = line.split("|").map((c) => c.trim()).filter(Boolean);
  rows.set(m[2], { redacted: m[1], approved: cells.at(-1) === "Y" });
}

const problems = [];
const shipped = readdirSync(SCREENS);
for (const f of shipped) {
  const row = rows.get(f);
  if (!row) { problems.push(`${f}: no row in capture/screens/INDEX.md`); continue; }
  if (!row.approved) problems.push(`${f}: not approved (last cell must be Y)`);
  const src = join("capture/screens/redacted", row.redacted);
  if (!existsSync(src)) problems.push(`${f}: redacted source ${src} missing`);
  else if (md5(src) !== md5(join(SCREENS, f))) problems.push(`${f}: differs from ${src}`);
}
for (const fr of readdirSync("compositions/frames")) {
  const html = readFileSync(join("compositions/frames", fr), "utf8");
  if (/["'(]\.{0,2}\/?capture\//.test(html)) problems.push(`${fr}: references capture/`);
  for (const [, f] of html.matchAll(/assets\/screens\/([^"')\s]+)/g)) {
    if (!shipped.includes(f) || !rows.get(f)?.approved) problems.push(`${fr}: uses unapproved ${f}`);
  }
}
for (const p of problems) console.log(`✗ ${p}`);
console.log(problems.length ? `privacy-check: ${problems.length} problem(s)` : `privacy-check ok (${shipped.length} screens, privacy: clean)`);
process.exit(problems.length ? 1 : 0);
