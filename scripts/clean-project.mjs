#!/usr/bin/env node
// clean-project.mjs — list, then recycle, the regenerable files a lesson project leaves behind.
//
//   node tools/clean-project.mjs                      dry run, level "delivered"
//   node tools/clean-project.mjs --level archive      dry run, level "archive"
//   node tools/clean-project.mjs --apply [--level …]  move the listed items to the Windows Recycle Bin
//
// Levels (each includes the one before):
//   delivered  after gate 4 and the final render: drafts, previews, spot clips, master-raw, logs,
//              trimmed clips, the voice concat, probe audio and drafts, scratch projects.
//              Every input needed to re-render stays, so `-From render -To post` still works.
//   archive    the project is closed: also the per-frame voice wavs and the frame packets.
//              Run `R -From voice -To meta` (rebuilt byte for byte from audio/clips) before rendering again.
//
// Never removed: the deliverables (renders/<name>.mp4, the 720p copy, chapters.txt, qa-report.md, sync*.json),
// audio/clips (the TTS source; regenerating it costs one MCP call per sentence and never sounds identical),
// script and storyboard files, compositions/, frame.md, capture/, assets/fonts, assets/screens, tools/,
// video.config.json, .probe/rate.json and .probe/pronunciation.md.
//
// Guards: refuses unless the final MP4 has video and audio streams and renders/qa-report.md exists, and refuses to
// drop derived audio unless audio/clips holds a clip for every TTS job. Each apply appends to renders/cleanup-log.txt.

import { appendFileSync, existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { cfg, ROOT } from "./lib/config.mjs";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const level = args.includes("--level") ? args[args.indexOf("--level") + 1] : "delivered";
if (!["delivered", "archive"].includes(level)) {
  console.error('✗ --level must be "delivered" or "archive"');
  process.exit(1);
}

// [pattern relative to the project root, why it can go]; `*` matches within the last path segment only
const RULES = {
  delivered: [
    ["renders/master-raw.mp4", "raw render before the voice master and loudness pass (re-render: -From render)"],
    ["renders/draft.mp4", "gate 4 draft"],
    ["renders/draft-720p-preview.mp4", "gate 4 draft preview"],
    ["renders/karaoke-preview.mp4", "gate 3 preview"],
    ["renders/spot", "sync spot clips (sync-report.mjs writes them again)"],
    ["renders/*.log", "render and post logs"],
    ["renders/*-start.txt", "render start stamps"],
    ["audio/voice-concat.wav", "voice master (sync-report.mjs rebuilds it from assets/voice when missing)"],
    ["audio/voice-list.txt", "concat list (rebuilt with the voice master)"],
    ["audio/trimmed", "trimmed clips (-From voice rebuilds them from audio/clips)"],
    ["audio/spot", "spot clips"],
    ["snapshots", "lint/check snapshots"],
    [".hf-cache", "render frames cache (the next render refills it)"],
    [".probe/*.wav", "pronunciation, rate and trim probes (decisions live in pronunciation.md, rate.json)"],
    [".probe/cal", "rate calibration clips"],
    [".probe/STORYBOARD.*", "storyboard backups"],
    [".probe/sb-draft-*", "storyboard drafts"],
    [".probe/*backup*", "backups"],
    [".probe/*.log", "check logs"],
    [".probe/catalog.json", "registry catalog dump (catalog --json recreates it)"],
    [".probe/catalog.err", "catalog stderr"],
    [`../.wave-${cfg.name}-*`, "wave-check scratch projects"],
    [`../.fixture-${cfg.name}-*`, "fixture-check scratch projects"],
    [`../.registry-${cfg.name}-*`, "fetch-registry-refs scratch projects"],
    [".hyperframes/gallery-ref", "gallery idea copies (gallery-refs.mjs adopt)"],
  ],
  archive: [
    ["assets/voice", "per-frame voice wavs (-From voice -To meta rebuilds them byte for byte)"],
    [".hyperframes/frame-packets", "worker packets (frame-packets.mjs rebuilds them)"],
  ],
};
const rules = level === "archive" ? [...RULES.delivered, ...RULES.archive] : RULES.delivered;

function expand(pattern) {
  const abs = resolve(ROOT, pattern);
  if (!basename(pattern).includes("*")) return existsSync(abs) ? [abs] : [];
  const dir = dirname(abs);
  if (!existsSync(dir)) return [];
  const re = new RegExp(`^${basename(pattern).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`);
  return readdirSync(dir).filter((f) => re.test(f)).map((f) => join(dir, f));
}
function size(p) {
  const s = statSync(p);
  return s.isDirectory() ? readdirSync(p).reduce((n, f) => n + size(join(p, f)), 0) : s.size;
}
const mb = (b) => `${(b / 1048576).toFixed(1)} MB`;

// ── guards ────────────────────────────────────────────────────────────────────
const errors = [];
const final = join(ROOT, `renders/${cfg.name}.mp4`);
if (!existsSync(final)) errors.push(`final video renders/${cfg.name}.mp4 not found: clean only after delivery`);
else {
  const streams = spawnSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_type", "-of", "csv=p=0", final], { encoding: "utf8" }).stdout;
  if (!/video/.test(streams) || !/audio/.test(streams)) errors.push(`renders/${cfg.name}.mp4 lacks a video or audio stream`);
}
if (!existsSync(join(ROOT, "renders/qa-report.md"))) errors.push("renders/qa-report.md not found: record QA and gate 4 before cleaning");
const jobsPath = join(ROOT, "audio/tts-jobs.json");
if (existsSync(jobsPath)) {
  const missing = JSON.parse(readFileSync(jobsPath, "utf8")).filter((j) => !existsSync(join(ROOT, "audio/clips", `${j.id}.wav`)));
  if (missing.length) errors.push(`audio/clips is missing ${missing.length} clip(s) (e.g. ${missing[0].id}): derived audio cannot be rebuilt`);
} else errors.push("audio/tts-jobs.json not found: cannot prove audio/clips is complete");
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}

// ── plan ──────────────────────────────────────────────────────────────────────
const items = [];
for (const [pattern, why] of rules) {
  for (const p of expand(pattern)) if (!items.some((x) => x.p === p)) items.push({ p, why, bytes: size(p) });
}
const total = items.reduce((n, x) => n + x.bytes, 0);
for (const x of items) console.log(`${mb(x.bytes).padStart(10)}  ${x.p.startsWith(ROOT) ? x.p.slice(ROOT.length + 1) : x.p}  — ${x.why}`);
console.log(`${level}: ${items.length} item(s), ${mb(total)}${apply ? "" : "  (dry run: add --apply to recycle them)"}`);
if (!apply || !items.length) process.exit(0);

// ── apply: Recycle Bin, so a mistake stays recoverable ────────────────────────
const list = join(tmpdir(), `abm-clean-${process.pid}.txt`);
writeFileSync(list, items.map((x) => x.p).join("\n"), "utf8");
const ps = `Add-Type -AssemblyName Microsoft.VisualBasic
foreach ($p in Get-Content -Encoding utf8 '${list}') {
  if (Test-Path -LiteralPath $p -PathType Container) { [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteDirectory($p, 'OnlyErrorDialogs', 'SendToRecycleBin') }
  elseif (Test-Path -LiteralPath $p) { [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile($p, 'OnlyErrorDialogs', 'SendToRecycleBin') }
}`;
execFileSync("pwsh", ["-NoProfile", "-Command", ps], { stdio: "inherit" });
const left = items.filter((x) => existsSync(x.p));
appendFileSync(join(ROOT, "renders/cleanup-log.txt"),
  `${new Date().toISOString()} level=${level} recycled=${items.length - left.length} freed=${mb(total - left.reduce((n, x) => n + x.bytes, 0))}\n` +
  items.filter((x) => !existsSync(x.p)).map((x) => `  ${x.p}\n`).join(""));
if (left.length) {
  console.error(`✗ ${left.length} item(s) still present (locked?): ${left.map((x) => x.p).join(", ")}`);
  process.exit(1);
}
console.log(`recycled ${items.length} item(s), ${mb(total)} → Recycle Bin (log: renders/cleanup-log.txt)`);
