#!/usr/bin/env node
// inject-overlay.mjs — mount compositions/overlay.html into the assembled index.html,
// immediately before the `<!-- captions -->` host so DOM order layers it above the frames
// and below the karaoke band. Idempotent: an existing overlay host is replaced, not duplicated.
// Run after assemble-index.mjs and transitions.mjs (assemble rewrites index.html).

import { readFileSync, writeFileSync } from "node:fs";

const index = readFileSync("index.html", "utf8");
const total = index.match(/id="el-captions"[\s\S]*?data-duration="([\d.]+)"/)?.[1];
if (!total) {
  console.error("✗ inject-overlay: captions host not found in index.html (assemble first)");
  process.exit(1);
}
const host = [
  `      <!-- overlay -->`,
  `      <div`,
  `        id="el-overlay"`,
  `        class="scene"`,
  `        data-composition-id="overlay"`,
  `        data-composition-src="compositions/overlay.html"`,
  `        data-start="0"`,
  `        data-duration="${total}"`,
  `        data-track-index="3"`,
  `      ></div>`,
  "",
].join("\n");
const cleaned = index.replace(/ *<!-- overlay -->\n\s*<div\s+id="el-overlay"[\s\S]*?<\/div>\n\n?/, "");
const out = cleaned.replace(/( *)<!-- captions -->/, (m) => `${host}${m}`);
writeFileSync("index.html", out);
console.log(`inject-overlay: mounted overlay (${total}s)`);
