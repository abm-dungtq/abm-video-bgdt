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
// Last line: visible-check ok (<n> shots[, <w> faint decoration under copy][, <c> custom frames not checked]) | visible-check FAILED (<e> problem(s)); exit 1
// on failure or when the browser cannot run: a check that did not run is not a pass.
// Copy must also be clear of decoration. While the copy is on screen (sampled every 0.35 s through the shot, with the
// project's overlay layer composited above the frame at the frame's video time) a shape with no copy of its own (an svg curve
// or dot, a thin bar) that paints across the middle of a text line is reported: "is crossed by a decoration (#id, over|under
// the text)". Over the letters, or under them with alpha ≥ 0.5, it fails; a faint shape under them (the theme motif) is a ⚠
// line that does not fail. A card or panel holding the line, a thick highlight, anything inside the slot's own element and
// anything under data-layout-allow-overlap (the caret of typed code, a pen writing the text) are not decorations.
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
const W = 1920, H = 1080, KARAOKE_TOP = H * 0.85, SWEEP_S = 0.35;
const only = new Set(process.argv.slice(2).map(Number).filter(Boolean));
const fail = (msg) => { console.log(`✗ ${msg}`); console.log("visible-check FAILED (the check did not run)"); process.exit(1); };

const { analyze, copyReveals } = await import(pathToFileURL(join(HERE, "compiler/lint.mjs")).href);
const cfg = JSON.parse(readFileSync(join(P, "video.config.json"), "utf8"));
const res = await analyze({ P, cfg, variety: false });
if (!res.frames.length) fail(`lint could not resolve the frames: ${res.errors.slice(0, 3).join(" | ")}`);

const r2 = (x) => Math.round(x * 100) / 100;
// where each frame starts in the video: the overlay (progress bar, courier trail, callouts) runs on video time
const startOf = new Map();
res.frames.reduce((t, f) => { startOf.set(f.no, t); return t + f.duration; }, 0);
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
    let sweep = null; // [t, times]: lasting copy is also looked at every SWEEP_S through the shot, for decoration passing over it
    if (lasting.length) {
      const last = Math.max(...lasting.map((r) => r.at));
      const t = Math.min(s.b - 0.1, Math.max(s.a + 0.85 * (s.b - s.a), last + 0.7));
      for (const r of lasting) add(t, r);
      const times = [];
      for (let x = s.a + 0.1; x < s.b - 0.05; x += SWEEP_S) times.push(r2(x));
      sweep = [r2(t), [...times, r2(s.b - 0.05)]];
    }
    for (const r of copy.filter((x) => x.transient)) {
      const next = cues.find((c) => c > r.at + 0.05) ?? Infinity;
      add(Math.min(r.at + 0.7, next - 0.05, s.b - 0.1), r);
    }
    const id = src.split("/").pop().replace(/\.html$/, "");
    for (const [t, texts] of [...at].sort((x, y) => x[0] - y[0])) if (texts.length) jobs.push({ frame: f.no, shot: k + 1, template: s.spec.template, src, id, t, texts, ov: startOf.get(f.no), sweep: sweep && sweep[0] === t ? sweep[1] : [] });
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
      // the overlay layer sits above the frames in the video, so a shape it draws can cross a frame's copy
      const over = existsSync(join(P, "compositions/overlay.html"))
        ? readFileSync(join(P, "compositions/overlay.html"), "utf8").replace(/^[\s\S]*?<template[^>]*>/, "").replace(/<\/template>\s*$/, "") : "";
      // <base> keeps the frame's relative asset paths (assets/fonts/…) resolving from the project root
      return rsp.end(`<!doctype html><html><head><meta charset="utf-8"><base href="/"><style>html,body{margin:0;width:${W}px;height:${H}px;overflow:hidden;background:#000}</style></head><body>${inner}${over}</body></html>`);
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
async function probe({ id, t, ov, sweep, texts, karaokeTop, w, h }) {
  const tl = window.__timelines[id];
  tl.pause();
  let painters = null; // the painted elements of decorationAcross, dropped whenever the time moves
  const shownMemo = new Map(); // shown(): opacity down the ancestor chain, computed once per element and moment
  // settle: wait two frames so the page has painted (the moment the copy is read); the sweep samples only need styles and
  // layout, which a seek makes current synchronously
  const seek = async (at, settle = true) => {
    tl.seek(at, false);
    if (ov != null && window.__timelines.overlay) { window.__timelines.overlay.pause(); window.__timelines.overlay.seek(ov + at, false); }
    painters = null;
    shownMemo.clear();
    await document.fonts.ready;
    if (settle) await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  };
  await seek(t);
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
  // A decoration is a shape with no copy of its own (an svg stroke or fill, a thin bar, a dot, an image) that paints across the
  // middle band of a text line, over or under the letters: a curve struck through a sentence, a dot sitting on a word. A
  // candidate whose box meets the band is confirmed by hit-testing a lattice there (elementsFromPoint returns the paint order,
  // so "over" and "under" are known, and a shape hidden behind an opaque card is not counted). Not decorations: a box holding
  // the whole line (card, panel, full-stage texture), a thick block (a highlight), anything inside the slot's own element,
  // anything under data-layout-allow-overlap.
  if (!document.getElementById("vc-hit")) {
    const guard = document.createElement("style");
    guard.id = "vc-hit";
    guard.textContent = "*{pointer-events:auto!important}"; // hit-testing skips pointer-events:none layers such as the motif
    document.head.appendChild(guard);
  }
  const alphaOf = (c) => {
    if (!c || c === "none" || c === "transparent") return 0;
    // a colour the browser left as color-mix(in srgb, <colour> 14%, transparent): the share is its opacity
    const mix = c.match(/^color-mix\(\s*in [^,]+,\s*(.+?)\s+([\d.]+)%\s*,\s*transparent\s*\)$/);
    if (mix) return (parseFloat(mix[2]) / 100) * alphaOf(mix[1]);
    const m = c.match(/\/\s*([\d.]+%?)\s*\)$/) ?? c.match(/^rgba\([^)]*,\s*([\d.]+)\s*\)$/);
    if (!m) return 1;
    return m[1].endsWith("%") ? parseFloat(m[1]) / 100 : Number(m[1]);
  };
  const shown = (n) => {
    if (!n || n === document.body) return 1;
    let v = shownMemo.get(n);
    if (v === undefined) {
      const cs = getComputedStyle(n);
      v = cs.display === "none" || cs.visibility === "hidden" ? 0 : Number(cs.opacity) * shown(n.parentElement);
      shownMemo.set(n, v);
    }
    return v;
  };
  const SHAPES = ["path", "line", "polyline", "polygon", "circle", "ellipse", "rect"];
  const RASTER = ["IMG", "CANVAS", "VIDEO"];
  // how an element paints: null when it draws nothing, else { line: stroke width in px (0 for a filled shape or a box), box }
  const painted = (d) => {
    const cs = getComputedStyle(d);
    if (d instanceof SVGElement) {
      if (!SHAPES.includes(d.tagName.toLowerCase())) return null;
      // a <line> has no area for its fill (the default black) to paint
      const fill = cs.fill === "none" || d.tagName.toLowerCase() === "line" ? 0 : alphaOf(cs.fill) * Number(cs.fillOpacity);
      const stroke = cs.stroke === "none" ? 0 : alphaOf(cs.stroke) * Number(cs.strokeOpacity);
      const line = fill >= 0.1 ? 0 : stroke >= 0.1 ? parseFloat(cs.strokeWidth) * (d.getScreenCTM()?.a ?? 1) : null;
      if (line == null) return null;
      const r = d.getBoundingClientRect(), pad = line / 2;
      return { line, alpha: fill >= 0.1 ? fill : stroke, box: { left: r.left - pad, right: r.right + pad, top: r.top - pad, bottom: r.bottom + pad, width: r.width + line, height: r.height + line } };
    }
    const bg = alphaOf(cs.backgroundColor) >= 0.1 || cs.backgroundImage !== "none" || RASTER.includes(d.tagName);
    const border = ["Top", "Right", "Bottom", "Left"].some((s) => parseFloat(cs["border" + s + "Width"]) > 0 && alphaOf(cs["border" + s + "Color"]) >= 0.1);
    return bg || border ? { line: 0, alpha: alphaOf(cs.backgroundColor) >= 0.1 ? alphaOf(cs.backgroundColor) : 1, box: d.getBoundingClientRect() } : null;
  };
  // every painted, visible element without copy at the current time (refreshed by seek)
  const paintersNow = () => painters ??= [...document.body.querySelectorAll("*")]
    .filter((d) => !d.textContent.trim() && !d.closest("[data-layout-allow-overlap]") && shown(d) >= 0.3)
    .map((d) => ({ d, p: painted(d) })).filter((x) => x.p);
  const decorationAcross = (e) => {
    if (shown(e) < 0.9) return null; // copy still fading in or out (a typing bubble giving way to its turn) is not settled on screen
    const range = document.createRange();
    range.selectNodeContents(e);
    const lines = [...range.getClientRects()].filter((r) => r.width > 8 && r.height > 8).slice(0, 12);
    for (const L of lines) {
      const lo = L.top + 0.28 * L.height, hi = L.bottom - 0.28 * L.height;
      // the shapes that could meet this line, then one lattice over their union: each point is hit-tested once for all of them
      const near = [];
      for (const { d, p } of paintersNow()) {
        if (e.contains(d) || d.contains(e)) continue;
        const b = p.box;
        const holdsLine = b.left <= L.left + 2 && b.right >= L.right - 2 && b.top <= L.top + 2 && b.bottom >= L.bottom - 2;
        const thin = p.line ? p.line <= 0.4 * L.height : Math.min(b.width, b.height) <= 0.4 * L.height;
        const small = Math.max(b.width, b.height) <= 1.5 * L.height;
        if ((p.line === 0 && holdsLine) || !(thin || small)) continue;
        if (Math.max(L.left + 2, b.left) > Math.min(L.right - 2, b.right) || Math.max(lo, b.top) > Math.min(hi, b.bottom)) continue;
        near.push({ d, p, b });
      }
      if (!near.length) continue;
      // Where to look: along the line of a stroke (a path is walked every 5 px, so a long curve costs its length, not its
      // bounding box), on a lattice inside the box of anything else. Each point is hit-tested once for every shape sharing it.
      const spots = new Map();
      const spot = (x, y, n) => {
        if (x < L.left + 2 || x > L.right - 2 || y < lo || y > hi || x < 0 || y < 0 || x >= w || y >= h) return;
        const k = Math.round(x) + "," + Math.round(y);
        if (!spots.has(k)) spots.set(k, { x, y, ds: [] });
        spots.get(k).ds.push(n);
      };
      for (const n of near) {
        const { d, p, b } = n;
        if (p.line > 0 && typeof d.getTotalLength === "function" && d.getScreenCTM()) {
          const m = d.getScreenCTM(), step = 5 / (Math.hypot(m.a, m.b) || 1), total = d.getTotalLength();
          for (let len = 0, k = 0; len <= total && k < 800; len += step, k++) {
            const q = d.getPointAtLength(len);
            spot(m.a * q.x + m.c * q.y + m.e, m.b * q.x + m.d * q.y + m.f, n);
          }
          continue;
        }
        const y0 = Math.max(lo, b.top), y1 = Math.min(hi, b.bottom), x0 = Math.max(L.left + 2, b.left), x1 = Math.min(L.right - 2, b.right);
        for (let y = y0, row = 0; y <= y1 + 0.01; y += 3, row++) for (let x = x0 + ((row * 3) % 10); x <= x1 + 0.01; x += 10) spot(x, y, n);
      }
      for (const { x, y, ds } of spots.values()) {
        const stack = document.elementsFromPoint(x, y);
        // only where the text itself is hit: the box of rotated or wrapped text is wider than its lines
        const textAt = stack.findIndex((n) => e.contains(n));
        if (textAt < 0) continue;
        for (const { d, p } of ds) {
          const i = stack.indexOf(d);
          if (i < 0) continue;
          const under = textAt < i;
          // under the letters, an opaque box from the copy down to the shape (the text's own backing, a card) hides the shape there
          if (under && stack.slice(textAt, i).some((n) => alphaOf(getComputedStyle(n).backgroundColor) >= 0.9 && shown(n) >= 0.9)) continue;
          const owner = d.id ? "" : d.closest("[id]")?.id;
          const name = d.id ? "#" + d.id : (owner ? "#" + owner + " " : "") + d.tagName.toLowerCase();
          // a faint shape under the letters (the theme motif, 22 % gold) is texture: reported, not failed
          const soft = under && p.alpha * shown(d) < 0.5;
          return { soft, why: "is crossed by a decoration (" + name + ", " + (under ? "under" : "over") + " the text)" + (soft ? "" : ": keep shapes off the copy, or mark an intended overlap data-layout-allow-overlap") };
        }
      }
    }
    return null;
  };
  // the element that shows this text now: { e } or { why }
  const locate = (text) => {
    const want = norm(text);
    // an element holding exactly this text wins; a containing one only when none does (a short slot like "AI" is not
    // rescued by some other visible line that happens to contain it)
    const exact = all.filter((e) => textOf(e) === want);
    const hits = exact.length ? exact : all.filter((e) => textOf(e).includes(want));
    if (!hits.length) return { why: "is not on the page" };
    const deepest = hits.filter((e) => ![...e.children].some((c) => hits.includes(c)));
    let why = null;
    for (const e of deepest) { const w2 = check(e); if (!w2) return { e }; why ??= w2; }
    return { why };
  };
  // decoration that crosses the copy before the end of the shot (a spark orbiting over a label, a curve still being drawn)
  const passing = new Map(), faint = new Map();
  for (const at of sweep ?? []) {
    await seek(at, false);
    for (const { key, text } of texts) {
      if (passing.has(key)) continue;
      const l = locate(text);
      const d = l.e ? decorationAcross(l.e) : null;
      if (d) (d.soft ? faint : passing).set(key, { soft: d.soft, why: d.why + " (seen at " + at + " s)" });
    }
  }
  await seek(t);
  return texts.map(({ key, text }) => {
    const l = locate(text);
    if (!l.e) return { key, text, why: l.why };
    const d = decorationAcross(l.e);
    const hit = (d && !d.soft ? d : null) ?? passing.get(key) ?? d ?? faint.get(key);
    return { key, text, why: hit?.why ?? null, soft: hit?.soft ?? false };
  });
}

const problems = [], warnings = [];
let current = null;
try {
  for (const j of jobs) {
    if (current !== j.id) {
      await cdp("Page.navigate", { url: `${base}/__vc/${encodeURIComponent(j.id)}.html` });
      await until(() => evaluate(`(id) => !!(window.__timelines && window.__timelines[id]) && document.readyState === "complete"`, j.id), 30000, `frame ${j.frame} to load`);
      current = j.id;
    }
    for (const r of await evaluate(probe.toString(), { id: j.id, t: j.t, ov: j.ov, sweep: j.sweep, texts: j.texts, karaokeTop: KARAOKE_TOP, w: W, h: H })) {
      if (r.why) (r.soft ? warnings : problems).push(`frame ${j.frame} shot ${j.shot} (${j.template}) at ${j.t} s: ${r.key} "${r.text.slice(0, 40)}" ${r.why}`);
    }
  }
} catch (e) {
  ws.close();
  cleanup();
  fail(e.message);
}
ws.close();
for (const p of warnings.slice(0, 3)) console.log(`⚠ ${p}`);
if (warnings.length > 3) console.log(`⚠ … ${warnings.length - 3} more faint decorations under copy (they do not fail the check)`);
for (const p of problems) console.log(`✗ ${p}`);
console.log(problems.length ? `visible-check FAILED (${problems.length} problem(s))` : `visible-check ok (${jobs.length} shots${warnings.length ? `, ${warnings.length} faint decoration under copy` : ""}${customSkipped ? `, ${customSkipped} custom frame(s) not checked` : ""})`);
process.exit(problems.length ? 1 : 0);
