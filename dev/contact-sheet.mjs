#!/usr/bin/env node
// contact-sheet.mjs — tile every template preview (templates/scenes/<id>/<variant>.jpg, 20 % | 85 % side by side)
// into sheets for a visual review: 3 previews per row, 6 rows per sheet, each labelled <id>/<variant>.
//
//   node dev/contact-sheet.mjs            → templates/scenes/CONTACT-SHEET-1.jpg, -2.jpg, …

import { existsSync, readdirSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const S = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const TPL = join(S, "templates/scenes");
const PER_ROW = 3, ROWS = 6, W = 960, H = 270, LABEL = 36;
const FONTS = join(S, "templates/fonts"); // ffmpeg runs there, so the font path has no drive colon to escape
const font = "JetBrainsMono-Regular.ttf";

const items = readdirSync(TPL).filter((d) => existsSync(join(TPL, d, "schema.json"))).sort()
  .flatMap((id) => readdirSync(join(TPL, id)).filter((f) => f.endsWith(".jpg")).sort().map((f) => ({ id, variant: f.replace(/\.jpg$/, ""), file: join(TPL, id, f) })));
for (const f of readdirSync(TPL)) if (/^CONTACT-SHEET.*\.jpg$/.test(f)) rmSync(join(TPL, f));
const per = PER_ROW * ROWS;
const sheets = [];
for (let s = 0; s * per < items.length; s++) {
  const page = items.slice(s * per, (s + 1) * per);
  const inputs = page.flatMap((it) => ["-i", it.file]);
  const labelled = page.map((it, i) => `[${i}]scale=${W}:${H},pad=${W}:${H + LABEL}:0:${LABEL}:color=0x1b1b1b,` +
    `drawtext=fontfile='${font}':text='${it.id}/${it.variant}':x=10:y=8:fontsize=22:fontcolor=white[v${i}]`).join(";");
  const layout = page.map((_, i) => `${(i % PER_ROW) * W}_${Math.floor(i / PER_ROW) * (H + LABEL)}`).join("|");
  const graph = page.length > 1
    ? `${labelled};${page.map((_, i) => `[v${i}]`).join("")}xstack=inputs=${page.length}:layout=${layout}:fill=0x111111[out]`
    : `${labelled};[v0]copy[out]`;
  const out = join(TPL, `CONTACT-SHEET-${s + 1}.jpg`);
  const r = spawnSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", graph, "-map", "[out]", "-q:v", "3", out], { encoding: "utf8", cwd: FONTS });
  if (r.status !== 0) { console.error(`✗ ffmpeg: ${r.stderr.slice(-600)}`); process.exit(1); }
  sheets.push(out);
}
console.log(`contact-sheet: ${items.length} previews in ${sheets.length} sheet(s): ${sheets.map((f) => f.replace(/\\/g, "/")).join(", ")}`);
