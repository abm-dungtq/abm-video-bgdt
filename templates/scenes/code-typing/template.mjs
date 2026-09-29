// code-typing — a command, a prompt or a few lines of code type themselves out, after the HyperFrames registry block
// "code-typing" (Apache-2.0). The window and its empty rows are on stage at the window start; over the `lines` range
// every character appears in turn (syntax-coloured by _shared/code-tokens.mjs) while a caret glides at constant speed along each
// line, as in the registry block. After the last character the caret blinks and the optional note lands.
// editor (signature): an editor window with a gutter; an active-line band follows the caret row by row.
// palette: a large floating prompt bar (a command palette or an AI prompt box) with a mode chip above it; a progress
//   line under the bar tracks the typing and an Enter key cap lights when it is done.

import { keepInside } from "../_shared/dna-card.mjs";
import { CHAR, tokenize, tokenCss } from "../_shared/code-tokens.mjs";

export const revealKeys = (slots) => ["lines", ...(slots.note ? ["note"] : [])];

const r3 = (x) => Math.round(x * 1000) / 1000;
const LINE_GAP = 0.06; // pause between two typed lines (also keeps caret tweens apart)

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const mono = `"${theme.mono}", monospace`;
  const lines = slots.lines.map((l) => l.normalize("NFC").replace(/\s+$/, ""));
  const n = lines.length;
  const len = lines.map((l) => [...l].length);
  const N = Math.max(1, len.reduce((s, x) => s + x, 0));
  const maxLen = Math.max(10, ...len);
  const pal = ctx.variant === "palette";
  const m = [];

  // ── geometry ────────────────────────────────────────────────────────────────
  const winW = pal ? 1480 : 1520, winX = Math.round((1760 - winW) / 2);
  const GUT = pal ? 90 : 76, PADX = pal ? 40 : 28;
  const textW = winW - GUT - PADX - 40;
  const fs = Math.max(20, Math.min(pal ? 46 : 32, Math.floor(textW / (maxLen * CHAR))));
  const cw = fs * CHAR;
  const LH = Math.round(fs * (pal ? 1.55 : 1.6));
  const BAR = pal ? 0 : 60, PAD = pal ? 34 : 24;
  const winH = BAR + 2 * PAD + n * LH + (pal ? 64 : 0); // the palette keeps a strip for its Enter key
  const chipH = pal ? 76 : 0, noteH = slots.note ? 110 : 0, progH = pal ? 40 : 0;
  const winY = Math.max(10, Math.round((820 - chipH - winH - progH - noteH) / 2) + chipH);
  const rowTop = (i) => BAR + PAD + i * LH;

  // ── html ────────────────────────────────────────────────────────────────────
  const rowHtml = (l, i) => {
    const chars = tokenize(l).flatMap((t) => [...t.text].map((c) => `<span class="${S}-k${i} ${S}-${t.kind}">${esc(c)}</span>`)).join("");
    return `    <div class="${S}-row" style="top: ${rowTop(i)}px"><span class="${S}-ln">${pal ? (i ? "" : "&gt;") : i + 1}</span><span class="${S}-tx" id="${S}-L${i}">${chars}</span></div>`;
  };
  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-win { position: absolute; left: ${winX}px; top: ${winY}px; width: ${winW}px; height: ${winH}px; box-sizing: border-box; overflow: hidden;
  border-radius: ${pal ? R + 8 : R}px; background: ${pal ? "color-mix(in srgb, var(--surface) 88%, var(--canvas))" : "var(--surface)"};
  border: 2px solid color-mix(in srgb, ${pal ? "var(--gold) 45%" : "var(--ink) 14%"}, transparent);
  box-shadow: 0 30px 80px color-mix(in srgb, var(--canvas) 75%, transparent); }
#${S}-bar { position: absolute; left: 0; top: 0; right: 0; height: ${BAR}px; display: flex; align-items: center; gap: 12px; padding: 0 24px;
  background: color-mix(in srgb, var(--ink) 5%, var(--surface)); border-bottom: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-tl { width: 15px; height: 15px; border-radius: 50%; flex: none; }
#${S}-ttl { margin-left: 16px; font-family: ${mono}; font-size: 24px; color: var(--muted); white-space: nowrap; overflow: hidden; }
#${S}-cy { position: absolute; left: 0; top: ${rowTop(0)}px; width: ${winW}px; height: ${LH}px; }
#${S}-band { position: absolute; left: 0; top: 0; width: ${winW}px; height: ${LH}px; background: color-mix(in srgb, var(--ink) 5%, transparent);
  border-left: 4px solid color-mix(in srgb, var(--cyan) 60%, transparent); box-sizing: border-box; }
#${S}-cx { position: absolute; left: ${GUT + PADX}px; top: ${Math.round((LH - fs * 1.15) / 2)}px; width: ${pal ? 5 : 3}px; height: ${Math.round(fs * 1.15)}px;
  border-radius: 2px; background: var(--cyan); }
.${S}-row { position: absolute; left: 0; width: ${winW}px; height: ${LH}px; line-height: ${LH}px; font-family: ${mono}; font-size: ${fs}px; }
.${S}-ln { position: absolute; left: 0; top: 0; width: ${GUT - 14}px; text-align: right; color: ${pal ? "var(--gold)" : "color-mix(in srgb, var(--muted) 80%, transparent)"};
  ${pal ? "font-weight: 700;" : ""} }
.${S}-tx { position: absolute; left: ${GUT + PADX}px; top: 0; white-space: pre; }
${tokenCss(S)}
#${S}-chip { position: absolute; left: ${winX + 8}px; top: ${winY - chipH}px; height: 56px; display: flex; align-items: center; gap: 14px; padding: 0 26px 0 16px;
  border-radius: 28px; background: color-mix(in srgb, var(--gold) 14%, var(--surface)); color: var(--gold); font-size: 30px; font-weight: 700; white-space: nowrap; }
#${S}-chip svg { width: 34px; height: 34px; }
#${S}-key { position: absolute; left: ${winW - 190}px; top: ${winH - 74}px; width: 160px; height: 56px; border-radius: 12px; box-sizing: border-box;
  border: 2px solid var(--gold); background: color-mix(in srgb, var(--gold) 18%, var(--surface)); color: var(--gold);
  font-family: ${mono}; font-size: 26px; font-weight: 700; line-height: 52px; text-align: center; }
#${S}-prog { position: absolute; left: ${winX}px; top: ${winY + winH + 18}px; width: ${winW}px; height: 8px; overflow: visible; }
#${S}-prog line { stroke: color-mix(in srgb, var(--ink) 12%, transparent); stroke-width: 3; }
#${S}-prog path { fill: none; stroke: var(--cyan); stroke-width: 5; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-note { position: absolute; left: 80px; top: ${winY + winH + progH + 34}px; width: 1600px; text-align: center; }
#${S}-notei { display: inline-block; padding: 14px 34px; border-radius: 40px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--gold) 55%, transparent); font-size: 36px; font-weight: 700; color: var(--ink); white-space: nowrap; }`;

  const dots = ["var(--warn)", "var(--gold)", "var(--cyan)"].map((c) => `<span class="${S}-tl" style="background: color-mix(in srgb, ${c} 70%, transparent)"></span>`).join("");
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
  ${pal ? `<div id="${S}-chip">${ctx.icon("spark")}<span>${esc(slots.file)}</span></div>` : ""}
  <div id="${S}-win">
    ${pal ? "" : `<div id="${S}-bar">${dots}<div id="${S}-ttl">${esc(slots.file)}</div></div>`}
    <div id="${S}-cy">${pal ? "" : `<div id="${S}-band"></div>`}<div id="${S}-cx"></div></div>
${lines.map(rowHtml).join("\n")}
    ${pal ? `<div id="${S}-key">Enter ↵</div>` : ""}
  </div>
  ${pal ? `<svg id="${S}-prog" viewBox="0 0 ${winW} 8"><line x1="4" y1="4" x2="${winW - 4}" y2="4"/><path id="${S}-progp" pathLength="1000" d="M4 4 L${winW - 4} 4"/></svg>` : ""}
  ${slots.note ? `<div id="${S}-note"><span id="${S}-notei">${esc(slots.note)}</span></div>` : ""}
 </div>
</div>`;

  // ── timing: characters spread evenly over the `lines` range, clipped to the shot ──
  const [r0, r1] = ctx.at("lines");
  const t0 = Math.max(r0, w.a + 0.5);
  // finish by 70 % of the range, so the whole text stands still long enough to be read
  const room = Math.max(0.3, 0.7 * (Math.min(r1, w.b - 0.35) - t0) - LINE_GAP * (n - 1));
  const d = Math.max(0.008, Math.min(0.05, room / N));
  const starts = [];
  let t = t0;
  for (let i = 0; i < n; i++) { starts.push(t); t += len[i] * d + LINE_GAP; }
  const done = t - LINE_GAP;

  m.push({ prim: "reveal", target: `#${S}-win`, at: w.a + 0.05, dur: 0.5, from: pal ? { opacity: 0, y: 30 } : { opacity: 0, scale: 0.97 }, ease: ctx.ease },
    { prim: "reveal", target: `#${S}-cx`, at: w.a + 0.3, dur: 0.2, from: { opacity: 0 } });
  if (pal) m.push({ prim: "reveal", target: `#${S}-chip`, at: w.a + 0.15, dur: 0.45, from: { opacity: 0, y: -16 }, ease: ctx.ease },
    { prim: "draw", target: `#${S}-progp`, at: t0, dur: Math.max(0.2, done - t0), ease: "none" });

  lines.forEach((_, i) => {
    const s = r3(starts[i]), dur = r3(len[i] * d);
    if (i > 0) m.push({ prim: "swap", target: `#${S}-cy`, at: s, props: { y: i * LH } });
    if (len[i]) {
      m.push({ prim: "type", target: `#${S}-L${i}`, chars: `.${S}-k${i}`, count: len[i], at: s, dur },
        { prim: "slide", target: `#${S}-cx`, at: s, dur, from: { x: 0 }, to: { x: r3(len[i] * cw) }, ease: "none" });
    } else if (i > 0 && len[i - 1]) {
      m.push({ prim: "swap", target: `#${S}-cx`, at: s, props: { x: 0 } });
    }
  });
  // the caret blinks after the last character
  for (let k = 1, at = done + 0.45; at < w.b - 0.05; k++, at += 0.45) {
    m.push({ prim: "swap", target: `#${S}-cx`, at: r3(at), props: { opacity: k % 2 ? 0 : 1 } });
  }
  let end = done;
  if (pal) {
    const at = Math.min(done + 0.1, w.b - 0.45);
    m.push({ prim: "reveal", target: `#${S}-key`, at: w.a + 0.2, dur: 0.3, from: { opacity: 0, scale: 0.8 }, to: { opacity: 0.35, scale: 0.8 } },
      { prim: "reveal", target: `#${S}-key`, at: Math.max(at, w.a + 0.55), dur: 0.4, from: { opacity: 0.35, scale: 0.8 }, to: { opacity: 1, scale: 1 }, ease: "back.out(2.2)" });
    end = Math.max(end, at + 0.4);
  }
  if (slots.note) {
    const at = Math.max(ctx.at("note"), done + 0.15);
    m.push({ prim: "reveal", target: `#${S}-note`, at, dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease });
    end = Math.max(end, at + 0.5);
  }
  const dr = ctx.drift(`#${S}-grp`, Math.min(end + ctx.gap, w.b - 0.7), 8);
  if (dr) m.push(dr);
  return { css, html, motions: keepInside(m, w.b) };
}
