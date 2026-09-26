#!/usr/bin/env node
// facts-check.mjs — trace every fact id used in the lesson back to a source.
//
//   node tools/facts-check.mjs
//
// capture/extracted/visible-text.txt holds `[F-NN] one fact — <source>`. Passes when:
//   - every F-NN in script.json, STORYBOARD.md, capture/COVERAGE.md and capture/screens/INDEX.md is defined there;
//   - when capture/sources/INDEX.md exists (a table whose first column is the source slug), every fact's
//     `— <source>` names one of those slugs.

import { existsSync, readFileSync } from "node:fs";

const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const facts = new Map();
for (const [, id, src] of read("capture/extracted/visible-text.txt").matchAll(/^\[(F-\d+)\].*?(?:\s—\s*([^—\n]+?))?\s*$/gm)) {
  facts.set(id, src?.trim());
}
const problems = [];
const used = new Map();
const script = existsSync("script.json") ? JSON.parse(read("script.json")) : { chapters: [] };
for (const s of script.chapters.flatMap((c) => c.frames.flatMap((f) => f.sentences))) {
  for (const id of s.facts ?? []) used.set(id, `script.json ${s.id}`);
}
for (const file of ["STORYBOARD.md", "capture/COVERAGE.md", "capture/screens/INDEX.md"]) {
  for (const [id] of read(file).matchAll(/\bF-\d+\b/g)) if (!used.has(id)) used.set(id, file);
}
for (const [id, where] of used) if (!facts.has(id)) problems.push(`${id} (${where}) is not in visible-text.txt`);

const sourcesIndex = read("capture/sources/INDEX.md");
if (sourcesIndex) {
  const slugs = new Set([...sourcesIndex.matchAll(/^\|\s*([^|\s]+)\s*\|/gm)].map((m) => m[1]).filter((s) => !/^(slug|-+)$/.test(s)));
  for (const [id, src] of facts) {
    if (!src) problems.push(`${id} has no "— <source>"`);
    else if (!slugs.has(src)) problems.push(`${id}: source "${src}" has no row in capture/sources/INDEX.md`);
  }
}
for (const p of problems) console.log(`✗ ${p}`);
const scope = sourcesIndex ? "facts → sources" : "facts (no capture/sources/INDEX.md)";
console.log(problems.length ? `facts-check: ${problems.length} problem(s)` : `facts-check ok (${facts.size} facts, ${used.size} used, ${scope})`);
process.exit(problems.length ? 1 : 0);
