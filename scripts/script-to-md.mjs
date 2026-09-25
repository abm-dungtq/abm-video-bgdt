#!/usr/bin/env node
// script-to-md.mjs — script.json (single source of truth) → SCRIPT.md + STORYBOARD.md
// outline + SCRIPT-REVIEW.md. `--check` validates budget/structure without writing.
//
//   node tools/script-to-md.mjs --check script.json
//   node tools/script-to-md.mjs script.json            (writes the three .md files)
//   node tools/script-to-md.mjs --review script.json   (writes SCRIPT-REVIEW.md only)

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { cfg } from "./lib/config.mjs";

const SCENE_TYPES = new Set(cfg.scenes.types);
const TRANSITIONS = new Set(["cut", "crossfade", "blur-crossfade", "push-slide", "zoom-through", "squeeze"]);
// Pause layout (video.config.json `timing`, shared with tools/build-voice.py).
const { lead: LEAD_S, titleLead: TITLE_LEAD_S, gap: GAP_S, tail: TAIL_S, pad: PAD_S } = cfg.timing;
const TARGET_S = cfg.budget.targetS;
const FRAMES_RANGE = cfg.budget.frames;
const MAX_SENTENCE_SYL = cfg.budget.maxSentenceSyllables;

const args = process.argv.slice(2);
const mode = args.includes("--check") ? "check" : args.includes("--review") ? "review" : "write";
const scriptPath = resolve(args.find((a) => !a.startsWith("--")) ?? "script.json");
const root = dirname(scriptPath);
const script = JSON.parse(readFileSync(scriptPath, "utf8"));

const rate = script.meta.rate || JSON.parse(readFileSync(join(root, ".probe/rate.json"), "utf8")).syllables_per_s;
const pad2 = (n) => String(n).padStart(2, "0");
const slug = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const syllables = (sentence) =>
  sentence.tokens.reduce((n, t) => n + t.spoken.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length, 0);
const displayText = (sentence) => sentence.tokens.map((t) => t.display).join(" ");
const spokenText = (sentence) => sentence.tokens.map((t) => t.spoken).join(" ");

const frames = script.chapters.flatMap((ch, ci) =>
  ch.frames.map((f, fi) => ({ ...f, chapter: ch, chapterIndex: ci, firstInChapter: fi === 0 })),
);
function estimate(f) {
  const syl = f.sentences.reduce((n, s) => n + syllables(s), 0);
  const lead = f.scene_hint === "title" ? TITLE_LEAD_S : LEAD_S;
  // each trimmed clip carries PAD_S of lead-in and tail (tools/build-voice.py)
  return syl / rate + lead + TAIL_S + GAP_S * Math.max(0, f.sentences.length - 1) + 2 * PAD_S * f.sentences.length;
}

// ── check ─────────────────────────────────────────────────────────────────────
const errors = [];
const factText = existsSync(join(root, "capture/extracted/visible-text.txt"))
  ? readFileSync(join(root, "capture/extracted/visible-text.txt"), "utf8")
  : "";
const factIds = new Set(factText.match(/\[F-\d+\]/g)?.map((x) => x.slice(1, -1)) ?? []);
let totalSyl = 0, totalEst = 0;
const seenIds = new Set();
frames.forEach((f, i) => {
  if (f.id !== i + 1) errors.push(`frame ids must be 1..N in order (got ${f.id} at position ${i + 1})`);
  if (!SCENE_TYPES.has(f.scene_hint)) errors.push(`frame ${f.id}: scene_hint "${f.scene_hint}" not in catalog`);
  if (f.firstInChapter !== (f.scene_hint === "title")) errors.push(`frame ${f.id}: title frames must open each chapter (and only there)`);
  if (!f.sentences?.length) errors.push(`frame ${f.id}: no sentences`);
  for (const s of f.sentences ?? []) {
    if (seenIds.has(s.id)) errors.push(`duplicate sentence id ${s.id}`);
    seenIds.add(s.id);
    const n = syllables(s);
    totalSyl += n;
    if (n > MAX_SENTENCE_SYL) errors.push(`${s.id}: ${n} syllables > ${MAX_SENTENCE_SYL}`);
    for (const t of s.tokens) if (!t.display || !t.spoken) errors.push(`${s.id}: empty token`);
    for (const fid of s.facts ?? []) if (!factIds.has(fid)) errors.push(`${s.id}: fact ${fid} not in visible-text.txt`);
  }
  totalEst += estimate(f);
});
if (frames.length < FRAMES_RANGE[0] || frames.length > FRAMES_RANGE[1])
  errors.push(`frames=${frames.length} outside ${FRAMES_RANGE.join("–")}`);
if (totalEst < TARGET_S[0] || totalEst > TARGET_S[1])
  errors.push(`estimated duration ${totalEst.toFixed(1)}s outside ${TARGET_S.join("–")}s`);

if (mode === "check") {
  for (const e of errors) console.error(`✗ ${e}`);
  const budget = script.meta.budget?.total ?? "?";
  console.log(`syllables=${totalSyl} budget=${budget} frames=${frames.length} est=${totalEst.toFixed(1)}s ${errors.length ? "FAIL" : "ok"}`);
  process.exit(errors.length ? 1 : 0);
}

// ── write ─────────────────────────────────────────────────────────────────────
const quote = (s) => `"${s.replace(/"/g, "”")}"`;
const mmss = (t) => `${pad2(Math.floor(t / 60))}:${pad2(Math.round(t % 60))}`;

function writeReview() {
  const out = [`# Kịch bản duyệt — ${script.meta.title ?? cfg.title}`, ""];
  out.push(`Giọng: ${script.meta.voice} · Tổng ước tính: ${mmss(totalEst)} (${totalEst.toFixed(0)} s) · ${frames.length} khung hình · ${totalSyl} âm tiết`, "");
  const footnotes = new Map();
  for (const ch of script.chapters) {
    const est = ch.frames.reduce((n, f) => n + estimate(f), 0);
    out.push(`## ${ch.title}  _(≈ ${est.toFixed(0)} s · ${ch.level})_`, "");
    for (const f of ch.frames) {
      const refs = [...new Set(f.sentences.flatMap((s) => s.facts ?? []))];
      refs.forEach((r) => footnotes.set(r, true));
      out.push(`**[${pad2(f.id)}] ${f.title}** — _${f.scene_hint}_  `);
      out.push(f.sentences.map(displayText).join(" ") + (refs.length ? ` <sub>${refs.join(", ")}</sub>` : ""), "");
    }
  }
  out.push("---", "## Nguồn trích dẫn", "");
  for (const line of factText.split(/\r?\n/)) {
    const m = line.match(/^\[(F-\d+)\]/);
    if (m && footnotes.has(m[1])) out.push(`- ${line}`);
  }
  writeFileSync(join(root, "SCRIPT-REVIEW.md"), out.join("\n") + "\n");
}

if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error("refusing to write: fix script.json (run --check)");
  if (mode !== "review") process.exit(1);
}
writeReview();
if (mode === "review") {
  console.log("wrote SCRIPT-REVIEW.md");
  process.exit(0);
}

const scriptMd = [
  `# SCRIPT — ${cfg.name}`, "",
  `**Voice:** ${cfg.voice.id} (VieNeu-TTS, local MCP)`,
  `**Voice settings:** temperature ${script.meta.temperature} · sample_rate ${cfg.voice.sampleRate}`,
  `**Voice direction:** ${cfg.voice.direction}`, "", "---", "",
];
const sb = [
  "---",
  "format: 1920x1080",
  `duration: ${Math.round((TARGET_S[0] + TARGET_S[1]) / 2)}s`,
  `message: ${quote(script.meta.message ?? cfg.message)}`,
  `arc: ${cfg.arc}`,
  `audience: ${cfg.audience}`,
  "mode: autonomous",
  "music: none",
  "---", "",
];
let t = 0;
for (const f of frames) {
  const est = estimate(f);
  const text = f.sentences.map(displayText).join(" ");
  scriptMd.push(`## Line ${f.id} — ${f.title} (Frame ${f.id})`, "",
    `**Time:** ${t.toFixed(1)} – ${(t + est).toFixed(1)}s`,
    `**Delivery:** ${f.chapter.level === "advanced" ? "Chậm, nhấn vào điểm nổi bật." : "Thân thiện, rõ ràng."}`, "",
    `    ${f.sentences.map(spokenText).join(" ")}`, "");
  const transition = f.id === 1 ? "cut" : f.firstInChapter ? "blur-crossfade" : "crossfade";
  if (!TRANSITIONS.has(transition)) throw new Error(`unknown transition ${transition}`);
  sb.push(`## Frame ${f.id} — ${f.title}`, "",
    `- status: outline`,
    `- src: compositions/frames/${pad2(f.id)}-${slug(f.title)}.html`,
    `- est_duration: ${est.toFixed(2)}s`,
    `- duration: ${est.toFixed(2)}s`,
    `- transition_in: ${transition}`,
    `- scene: ${f.scene_hint}`,
    `- chapter: ${f.chapter.id}`,
    `- voiceover: ${quote(text)}`, "",
    `${f.chapter.title} · ${f.chapter.level}. ${f.notes ?? ""}`.trim(), "");
  t += est;
}
writeFileSync(join(root, "SCRIPT.md"), scriptMd.join("\n"));
writeFileSync(join(root, "STORYBOARD.md"), sb.join("\n"));
console.log(`wrote SCRIPT.md, STORYBOARD.md, SCRIPT-REVIEW.md (frames=${frames.length}, est=${totalEst.toFixed(1)}s)`);
