// code-morph — one snippet of code turns into another, after the HyperFrames registry block "code-morph"
// (Apache-2.0). As in the registry block (Shiki Magic Move), every token the two versions share glides from its old
// place to its new one, the tokens that go away fade out and the new ones fade in. The token matching is a longest
// common subsequence over the token texts; positions come from the monospace grid, so no layout is measured.
// The "before" code stands in the editor from the window start; the morph plays on the `after` keyword.
// flip (signature): one wide editor; a "Trước" tag in the title bar turns into "Sau"; the note lands under it.
// summary: the editor on the left; on the right a card counts the lines before and after, then the note.

import { keepInside } from "../_shared/dna-card.mjs";
import { CHAR, tokenize, tokenCss } from "../_shared/code-tokens.mjs";

export const revealKeys = (slots) => ["after", ...(slots.note ? ["note"] : [])];

const r3 = (x) => Math.round(x * 1000) / 1000;

/** the non-blank tokens of a snippet with their grid place */
function grid(lines) {
  const out = [];
  lines.forEach((l, line) => {
    let col = 0;
    for (const t of tokenize(l)) {
      const w = [...t.text].length;
      if (t.kind !== "sp") out.push({ ...t, line, col });
      col += w;
    }
  });
  return out;
}

/** longest common subsequence over token texts → Map(after index → before index) */
function match(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) {
    dp[i][j] = a[i].text === b[j].text ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const pairs = new Map();
  for (let i = 0, j = 0; i < n && j < m;) {
    if (a[i].text === b[j].text) { pairs.set(j, i); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  return pairs;
}

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const mono = `"${theme.mono}", monospace`;
  const before = slots.before.map((l) => l.normalize("NFC").replace(/\s+$/, ""));
  const after = slots.after.map((l) => l.normalize("NFC").replace(/\s+$/, ""));
  const nb = before.length, na = after.length, rows = Math.max(nb, na);
  const A = grid(before), B = grid(after);
  const pairs = match(A, B);
  const kept = new Set(pairs.values());
  const sum = ctx.variant === "summary";
  const maxLen = Math.max(12, ...[...before, ...after].map((l) => [...l].length));
  const m = [];

  // geometry
  const winX = sum ? 0 : 130, winW = sum ? 1040 : 1500;
  const GUT = 70, PADX = 26, BAR = 60, PAD = 24;
  const fs = Math.max(18, Math.min(sum ? 28 : 34, Math.floor((winW - GUT - PADX - 40) / (maxLen * CHAR))));
  const cw = fs * CHAR, LH = Math.round(fs * 1.6);
  const winH = BAR + 2 * PAD + rows * LH;
  const noteH = slots.note && !sum ? 110 : 0;
  const winY = Math.max(10, Math.round((820 - winH - noteH) / 2));
  const cardX = 1100, cardW = 660, cardH = slots.note ? 560 : 420, cardY = Math.round((820 - cardH) / 2);

  // timing
  const tM = Math.max(ctx.at("after"), w.a + 1.5); // the "before" code stays readable for a moment
  const STEP = Math.max(0.5, Math.min(1.2, w.b - tM - 0.4));
  const enter = tM + STEP * 0.45, fadeD = STEP * 0.5;

  const tok = (t, id) => `<span class="${S}-t ${S}-${t.kind}" id="${id}" style="left: ${r3(t.col * cw)}px; top: ${t.line * LH}px">${esc(t.text)}</span>`;
  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-win { position: absolute; left: ${winX}px; top: ${winY}px; width: ${winW}px; height: ${winH}px; box-sizing: border-box; border-radius: ${R}px;
  overflow: hidden; background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 14%, transparent);
  box-shadow: 0 28px 70px color-mix(in srgb, var(--canvas) 70%, transparent); }
#${S}-bar { position: absolute; left: 0; top: 0; right: 0; height: ${BAR}px; display: flex; align-items: center; gap: 12px; padding: 0 24px;
  background: color-mix(in srgb, var(--ink) 5%, var(--surface)); border-bottom: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-tl { width: 15px; height: 15px; border-radius: 50%; flex: none; background: color-mix(in srgb, var(--muted) 55%, transparent); }
#${S}-ttl { margin-left: 16px; font-family: ${mono}; font-size: 24px; color: var(--muted); white-space: nowrap; overflow: hidden; max-width: ${winW - 360}px; }
#${S}-tags { position: absolute; right: 22px; top: 12px; width: 150px; height: 36px; }
.${S}-tag { position: absolute; right: 0; top: 0; height: 36px; padding: 0 18px; border-radius: 18px; font-size: 22px; font-weight: 800; line-height: 36px;
  letter-spacing: 0.06em; text-transform: uppercase; white-space: nowrap; }
#${S}-tagb { background: color-mix(in srgb, var(--muted) 22%, transparent); color: var(--muted); }
#${S}-taga { background: color-mix(in srgb, var(--gold) 20%, transparent); color: var(--gold); }
.${S}-ln { position: absolute; left: 0; width: ${GUT - 14}px; height: ${LH}px; line-height: ${LH}px; text-align: right; font-family: ${mono}; font-size: ${fs}px;
  color: color-mix(in srgb, var(--muted) 80%, transparent); }
#${S}-code { position: absolute; left: ${GUT + PADX}px; top: ${BAR + PAD}px; right: 20px; height: ${rows * LH}px; }
.${S}-t { position: absolute; height: ${LH}px; line-height: ${LH}px; font-family: ${mono}; font-size: ${fs}px; white-space: pre; }
${tokenCss(S)}
#${S}-note { position: absolute; left: 80px; top: ${winY + winH + 34}px; width: 1600px; text-align: center; }
#${S}-notei { display: inline-block; padding: 14px 34px; border-radius: 40px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--gold) 55%, transparent); font-size: 36px; font-weight: 700; color: var(--ink); white-space: nowrap; }
#${S}-card { position: absolute; left: ${cardX}px; top: ${cardY}px; width: ${cardW}px; height: ${cardH}px; box-sizing: border-box; padding: 40px 44px;
  border-radius: ${R}px; background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); }
.${S}-st { display: flex; align-items: baseline; gap: 22px; height: 150px; }
.${S}-sl { width: 150px; font-size: 34px; font-weight: 700; color: var(--muted); white-space: nowrap; }
.${S}-sn { position: relative; font-size: 120px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.${S}-su { font-size: 34px; font-weight: 600; color: var(--muted); }
#${S}-snb { color: var(--muted); }
#${S}-sna { color: var(--gold); }
#${S}-strike { position: absolute; left: -8px; top: 56px; width: calc(100% + 16px); height: 8px; overflow: visible; }
#${S}-strike path { fill: none; stroke: var(--warn); stroke-width: 7; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-cnote { margin-top: 34px; padding-top: 26px; border-top: 2px solid color-mix(in srgb, var(--ink) 12%, transparent);
  font-size: 36px; font-weight: 700; line-height: 1.3; color: var(--ink); }`;

  const gutter = Array.from({ length: rows }, (_, i) => `<div class="${S}-ln" id="${S}-g${i}" style="top: ${BAR + PAD + i * LH}px">${i + 1}</div>`).join("");
  const toks = [
    ...A.map((t, k) => (kept.has(k) ? "" : tok(t, `${S}-b${k}`))),
    ...B.map((t, k) => tok(t, `${S}-a${k}`)),
  ].filter(Boolean).join("\n      ");
  const card = sum ? `
  <div id="${S}-card">
    <div class="${S}-st"><span class="${S}-sl">Trước</span><span class="${S}-sn" id="${S}-snb">${nb}<svg id="${S}-strike" viewBox="0 0 100 8" preserveAspectRatio="none"><path id="${S}-strikep" pathLength="1000" vector-effect="non-scaling-stroke" d="M2 4 L98 4"/></svg></span><span class="${S}-su">dòng</span></div>
    <div class="${S}-st" id="${S}-sta"><span class="${S}-sl">Sau</span><span class="${S}-sn" id="${S}-sna">0</span><span class="${S}-su">dòng</span></div>
    ${slots.note ? `<div id="${S}-cnote">${esc(slots.note)}</div>` : ""}
  </div>` : "";
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
  <div id="${S}-win">
    <div id="${S}-bar"><span class="${S}-tl"></span><span class="${S}-tl"></span><span class="${S}-tl"></span><div id="${S}-ttl">${esc(slots.file)}</div>
      <div id="${S}-tags"><span class="${S}-tag" id="${S}-tagb">Trước</span><span class="${S}-tag" id="${S}-taga">Sau</span></div></div>
    ${gutter}
    <div id="${S}-code">
      ${toks}
    </div>
  </div>${card}
  ${slots.note && !sum ? `<div id="${S}-note"><span id="${S}-notei">${esc(slots.note)}</span></div>` : ""}
 </div>
</div>`;

  // the "before" code at the window start
  m.push({ prim: "reveal", target: `#${S}-win`, at: w.a + 0.05, dur: 0.5, from: sum ? { opacity: 0, x: -40 } : { opacity: 0, scale: 0.97 }, ease: ctx.ease },
    { prim: "reveal", target: `#${S}-tagb`, at: w.a + 0.3, dur: 0.3, from: { opacity: 0 } },
    { prim: "reveal", target: `#${S}-tagb`, at: tM, dur: 0.3, from: { opacity: 1 }, to: { opacity: 0 } },
    { prim: "reveal", target: `#${S}-taga`, at: tM + 0.1, dur: 0.35, from: { opacity: 0, scale: 0.7 }, ease: "back.out(2)" });
  // the morph: shared tokens glide, old ones leave, new ones arrive
  B.forEach((t, k) => {
    const id = `#${S}-a${k}`;
    if (!pairs.has(k)) { m.push({ prim: "reveal", target: id, at: r3(enter), dur: r3(fadeD), from: { opacity: 0 }, ease: "power1.out" }); return; }
    const o = A[pairs.get(k)];
    const dx = r3((o.col - t.col) * cw), dy = (o.line - t.line) * LH;
    if (dx || dy) m.push({ prim: "slide", target: id, at: tM, dur: STEP, from: { x: dx, y: dy }, to: { x: 0, y: 0 }, ease: "power2.inOut" });
  });
  A.forEach((_, k) => { if (!kept.has(k)) m.push({ prim: "reveal", target: `#${S}-b${k}`, at: tM, dur: r3(fadeD), from: { opacity: 1 }, to: { opacity: 0 }, ease: "power1.in" }); });
  for (let i = na; i < nb; i++) m.push({ prim: "reveal", target: `#${S}-g${i}`, at: tM, dur: r3(fadeD), from: { opacity: 1 }, to: { opacity: 0 } });
  for (let i = nb; i < na; i++) m.push({ prim: "reveal", target: `#${S}-g${i}`, at: r3(enter), dur: r3(fadeD), from: { opacity: 0 } });
  let end = tM + STEP;
  if (sum) {
    m.push({ prim: "reveal", target: `#${S}-card`, at: w.a + 0.2, dur: 0.5, from: { opacity: 0, x: 40 }, ease: ctx.ease },
      { prim: "draw", target: `#${S}-strikep`, at: tM, dur: 0.4, ease: "power2.out" },
      { prim: "reveal", target: `#${S}-sta`, at: tM + 0.2, dur: 0.4, from: { opacity: 0, y: 20 }, ease: ctx.ease },
      { prim: "count", target: `#${S}-sna`, at: tM + 0.3, dur: Math.max(0.3, Math.min(0.8, STEP)), to: na });
    if (slots.note) {
      const at = Math.max(ctx.at("note"), tM + 0.6);
      m.push({ prim: "reveal", target: `#${S}-cnote`, at, dur: 0.45, from: { opacity: 0, y: 16 } });
      end = Math.max(end, at + 0.45);
    }
  } else if (slots.note) {
    const at = Math.max(ctx.at("note"), tM + STEP * 0.6);
    m.push({ prim: "reveal", target: `#${S}-note`, at, dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease });
    end = Math.max(end, at + 0.5);
  }
  const d = ctx.drift(`#${S}-grp`, Math.min(end + ctx.gap, w.b - 0.7), 8);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}
