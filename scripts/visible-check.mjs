#!/usr/bin/env node
// visible-check.mjs — prove that the copy of every shot is on screen, not only in scenes.json. For each shot of each
// template frame it seeks the frame's own timeline near the end of the shot and checks, in the real browser, that every
// slot text the voice pins is present, visible (opacity product ≥ 0.3, so a dimmed side still
// reads; not display:none), inside the canvas, above the
// karaoke band (bottom 15 %) and not cut by an overflow:hidden box (unless the box declares data-layout-allow-overflow,
// a tile that shows one slice of a big word). Copy the schema marks "transient" in its reveals (a card flipped away, a
// milestone passed, a line scrolled out) is checked 0.7 s after its cue, before the next cue, not at the end.
// Identifiers are not copy: a value the schema limits to an enum, or a property marked "copy": false.
//
//   node tools/visible-check.mjs [frame numbers…]
//
// Each frame file is a <template>; the check wraps its content in a bare page served from the project (so fonts and
// assets resolve) and drives the chrome-headless-shell HyperFrames installed (~/.cache/hyperframes/chrome, or
// $HF_CHROME) over the DevTools protocol, with Node's own WebSocket: no extra dependency.
// Needs the voice (audio_meta.json) and compiled frames, i.e. the storyboard stage is done.
// Last line: visible-check ok (<n> shots[, <c> custom frames not checked]) | visible-check FAILED (<e> problem(s)); exit 1
// on failure or when the browser cannot run: a check that did not run is not a pass.
// Templates mark drawing that repeats the copy (a flap's passing letters, a glyph's bold twin) aria-hidden="true"; that
// text is not read. Text covered by another element is left to `hyperframes check` (text_not_painted, content_overlap).
// Proven on the fixed grok lesson: #root *{opacity:0.1!important} injected into frame 7 → 13 "opacity" failures;
// #root{transform:translateY(300px)} into frame 3 → 2 "off the canvas" failures.

import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const P = resolve(".");
const W = 1920, H = 1080, KARAOKE_TOP = H * 0.85;
const only = new Set(process.argv.slice(2).map(Number).filter(Boolean));
const fail = (msg) => { console.log(`✗ ${msg}`); console.log("visible-check FAILED (the check did not run)"); process.exit(1); };

const { analyze, copyReveals } = await import(pathToFileURL(join(HERE, "compiler/lint.mjs")).href);
const cfg = JSON.parse(readFileSync(join(P, "video.config.json"), "utf8"));
const res = await analyze({ P, cfg, variety: false });
if (!res.frames.length) fail(`lint could not resolve the frames: ${res.errors.slice(0, 3).join(" | ")}`);

const r2 = (x) => Math.round(x * 100) / 100;
const jobs = [];
let customSkipped = 0;
for (const f of res.frames) {
  if (only.size && !only.has(f.no)) continue;
  if (f.custom) { customSkipped++; continue; } // hand-built: no slots to look for
  const src = f.board.bullets.src;
  if (!src || !existsSync(join(P, src))) fail(`frame ${f.no}: ${src ?? "no src"} is not compiled yet (run the storyboard stage)`);
  f.shots.forEach((s, k) => {
    // each copy leaf (identifiers left out by the schema) must show somewhere on screen: lasting copy at the end of the
    // shot, transient copy (schema reveals "transient": true) 0.7 s after its cue, before the next cue takes the stage
    const copy = copyReveals(s.spec, s.times, s.schema);
    if (!copy.length) return;
    const lasting = copy.filter((r) => !r.transient);
    const cues = [...new Set(Object.values(s.times).map((v) => (Array.isArray(v) ? v[0] : v)))].sort((x, y) => x - y);
    const at = new Map();
    const add = (t, r) => {
      t = r2(t);
      if (!at.has(t)) at.set(t, []);
      at.get(t).push(...r.leaves.filter((x) => /\p{L}/u.test(x)).map((x) => ({ key: r.key, text: x })));
    };
    if (lasting.length) {
      const last = Math.max(...lasting.map((r) => r.at));
      const t = Math.min(s.b - 0.1, Math.max(s.a + 0.85 * (s.b - s.a), last + 0.7));
      for (const r of lasting) add(t, r);
    }
    for (const r of copy.filter((x) => x.transient)) {
      const next = cues.find((c) => c > r.at + 0.05) ?? Infinity;
      add(Math.min(r.at + 0.7, next - 0.05, s.b - 0.1), r);
    }
    const id = src.split("/").pop().replace(/\.html$/, "");
    for (const [t, texts] of [...at].sort((x, y) => x[0] - y[0])) if (texts.length) jobs.push({ frame: f.no, shot: k + 1, template: s.spec.template, src, id, t, texts });
  });
}
if (!jobs.length) fail("no template shot with copy to check");

// ── a static server for the project, plus one wrapper page per frame ─────────────────────────────────────────────────
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".ttf": "font/ttf", ".otf": "font/otf",
  ".woff2": "font/woff2", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".json": "application/json" };
const server = createServer((req, rsp) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const wrap = url.match(/^\/__vc\/(.+)\.html$/);
  try {
    if (wrap) {
      const html = readFileSync(join(P, "compositions/frames", `${wrap[1]}.html`), "utf8");
      const inner = html.replace(/^[\s\S]*?<template[^>]*>/, "").replace(/<\/template>\s*$/, "");
      rsp.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      // <base> keeps the frame's relative asset paths (assets/fonts/…) resolving from the project root
      return rsp.end(`<!doctype html><html><head><meta charset="utf-8"><base href="/"><style>html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#000}</style></head><body>${inner}</body></html>`);
    }
    const file = join(P, url);
    if (!file.startsWith(P) || !existsSync(file)) { rsp.writeHead(404); return rsp.end(); }
    rsp.writeHead(200, { "content-type": TYPES[extname(file).toLowerCase()] ?? "application/octet-stream" });
    rsp.end(readFileSync(file));
  } catch (e) { rsp.writeHead(500); rsp.end(String(e)); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${server.address().port}`;

// ── the browser ───────────────────────────────────────────────────────────────────────────────────────────────────────
function findChrome() {
  if (process.env.HF_CHROME && existsSync(process.env.HF_CHROME)) return process.env.HF_CHROME;
  const root = join(homedir(), ".cache/hyperframes/chrome/chrome-headless-shell");
  if (!existsSync(root)) return null;
  for (const v of readdirSync(root).sort().reverse()) {
    for (const d of readdirSync(join(root, v))) {
      for (const exe of ["chrome-headless-shell.exe", "chrome-headless-shell"]) if (existsSync(join(root, v, d, exe))) return join(root, v, d, exe);
    }
  }
  return null;
}
const chrome = findChrome();
if (!chrome) { server.close(); fail("chrome-headless-shell not found: run any hyperframes check once, or set HF_CHROME"); }
const profile = mkdtempSync(join(tmpdir(), "abm-visible-"));
const proc = spawn(chrome, ["--headless", "--remote-debugging-port=0", `--user-data-dir=${profile}`, `--window-size=${W},${H}`,
  "--hide-scrollbars", "--mute-audio", "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: "ignore" });
const cleanup = () => { try { proc.kill(); } catch {} server.close(); try { rmSync(profile, { recursive: true, force: true }); } catch {} };
process.on("exit", cleanup);
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => process.exit(130)); // exit runs cleanup: no orphan browser

const until = async (fn, ms, what) => {
  const end = Date.now() + ms;
  for (;;) {
    const v = await fn().catch(() => null);
    if (v) return v;
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 150));
  }
};
let wsUrl;
try {
  const port = await until(async () => readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n"), 20000, "the browser to start");
  wsUrl = `ws://127.0.0.1:${port[0].trim()}${port[1].trim()}`;
} catch (e) { cleanup(); fail(e.message); }

const ws = new WebSocket(wsUrl);
await new Promise((ok, ko) => { ws.onopen = ok; ws.onerror = () => ko(new Error("DevTools socket error")); }).catch((e) => { cleanup(); fail(e.message); });
let seq = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (!m.id || !pending.has(m.id)) return;
  const { ok, ko } = pending.get(m.id);
  pending.delete(m.id);
  m.error ? ko(new Error(m.error.message)) : ok(m.result);
};
const send = (method, params = {}, sessionId) => new Promise((ok, ko) => {
  const id = ++seq;
  pending.set(id, { ok, ko });
  ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
});
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
const cdp = (method, params) => send(method, params, sessionId);
await cdp("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
const evaluate = async (fn, arg) => {
  const r = await cdp("Runtime.evaluate", { expression: `(${fn})(${JSON.stringify(arg)})`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};

// runs in the page: seek the frame's timeline, then look for each text
async function probe({ id, t, texts, karaokeTop, w, h }) {
  const tl = window.__timelines[id];
  tl.pause();
  tl.seek(t, false);
  await document.fonts.ready;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  // spaces dropped: letter-by-letter templates (flap-board, split text) put each glyph in its own box
  const norm = (s) => s.normalize("NFC").replace(/\s+/g, "").toLowerCase();
  // aria-hidden marks drawing that repeats the copy (a flap's passing letters, a glyph's bold twin): not read as text
  const all = [...document.body.querySelectorAll("*")].filter((e) => !["SCRIPT", "STYLE", "TEMPLATE", "BASE"].includes(e.tagName) && !e.closest("[aria-hidden=true]"));
  const textOf = (e) => {
    let out = "";
    const walk = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) if (!n.parentElement.closest("[aria-hidden=true]")) out += n.data;
    return norm(out);
  };
  const check = (e) => {
    let op = 1;
    for (let n = e; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === "none" || cs.visibility === "hidden") return "hidden";
      op *= Number(cs.opacity);
    }
    if (op < 0.3) return `opacity ${op.toFixed(2)}`;
    // the box of the content, not of e: a row of absolutely placed cells has no size of its own
    const range = document.createRange();
    range.selectNodeContents(e);
    const r = range.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return "zero size";
    if (r.left < -2 || r.top < -2 || r.right > w + 2 || r.bottom > h + 2) return "off the canvas";
    if (r.bottom > karaokeTop + 2) return `in the karaoke band (bottom ${Math.round(r.bottom)} px)`;
    for (let n = e.parentElement; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.overflow === "visible" && cs.overflowX === "visible" && cs.overflowY === "visible") continue;
      // a box the template declares clipping on purpose (a tile that shows one slice of a big word)
      if (n.hasAttribute("data-layout-allow-overflow")) continue;
      const b = n.getBoundingClientRect();
      if (r.left < b.left - 2 || r.top < b.top - 2 || r.right > b.right + 2 || r.bottom > b.bottom + 2) return `cut by ${n.id ? `#${n.id}` : n.className || n.tagName}`;
    }
    if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== "visible") return "text cut off";
    return null;
  };
  return texts.map(({ key, text }) => {
    const want = norm(text);
    // an element holding exactly this text wins; a containing one only when none does (a short slot like "AI" is not
    // rescued by some other visible line that happens to contain it)
    const exact = all.filter((e) => textOf(e) === want);
    const hits = exact.length ? exact : all.filter((e) => textOf(e).includes(want));
    if (!hits.length) return { key, text, why: "is not on the page" };
    const deepest = hits.filter((e) => ![...e.children].some((c) => hits.includes(c)));
    let why = null;
    for (const e of deepest) { const w2 = check(e); if (!w2) return { key, text, why: null }; why ??= w2; }
    return { key, text, why };
  });
}

const problems = [];
let current = null;
try {
  for (const j of jobs) {
    if (current !== j.id) {
      await cdp("Page.navigate", { url: `${base}/__vc/${encodeURIComponent(j.id)}.html` });
      await until(() => evaluate(`(id) => !!(window.__timelines && window.__timelines[id]) && document.readyState === "complete"`, j.id), 30000, `frame ${j.frame} to load`);
      current = j.id;
    }
    for (const r of await evaluate(probe.toString(), { id: j.id, t: j.t, texts: j.texts, karaokeTop: KARAOKE_TOP, w: W, h: H })) {
      if (r.why) problems.push(`frame ${j.frame} shot ${j.shot} (${j.template}) at ${j.t} s: ${r.key} "${r.text.slice(0, 40)}" ${r.why}`);
    }
  }
} catch (e) {
  ws.close();
  cleanup();
  fail(e.message);
}
ws.close();
for (const p of problems) console.log(`✗ ${p}`);
console.log(problems.length ? `visible-check FAILED (${problems.length} problem(s))` : `visible-check ok (${jobs.length} shots${customSkipped ? `, ${customSkipped} custom frame(s) not checked` : ""})`);
process.exit(problems.length ? 1 : 0);
