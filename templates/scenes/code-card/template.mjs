// code-card — a compact, syntax-coloured code card on the dark ground, after the HyperFrames registry block
// "code-snippet-dark-2026" (heygen-com/hyperframes, Apache-2.0). The card (title bar, file tab, gutter, status bar) is on
// stage at the window start and its lines write in top to bottom; on "focus" the active-line bar sweeps across the chosen
// line, its gutter number lights and the other lines step back.
// float (signature): the card hangs centred in a slight perspective, lit by a soft cyan glow, the caption above it.
// aside: a flat card on the right, the caption set large in a column on the left with the language and line tag.

import { keepInside } from "../_shared/dna-card.mjs";
import { highlight, highlightCss } from "../_shared/code-line.mjs";

export const revealKeys = (slots) => [...(slots.caption ? ["caption"] : []), ...(slots.focus != null ? ["focus"] : [])];

const CHAR = 0.6; // JetBrains Mono advance, em

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const mono = `"${theme.mono}", monospace`;
  const lines = slots.lines;
  const n = lines.length;
  const f = slots.focus ?? null;
  if (f != null && f >= n) throw new Error(`focus ${f} is past the last line (${n} lines, first is 0)`);
  const aside = ctx.variant === "aside";
  const tC = slots.caption ? ctx.at("caption") : null;
  const tF = f != null ? Math.max(ctx.at("focus"), w.a + 0.6) : null;
  const fit = (t, dur) => Math.max(w.a, Math.min(t, w.b - dur - 0.05));
  const maxLen = Math.max(10, ...lines.map((l) => [...l].length));
  const lang = slots.lang ? esc(slots.lang) : "";

  // card geometry
  const cardW = aside ? 1000 : 1120, cardX = aside ? 740 : 320;
  const BAR = 58, TAB = 50, STAT = 42, PAD = 20, GUT = 72;
  const LH = n > 9 ? 40 : n > 6 ? 46 : 54;
  const fs = Math.max(18, Math.min(30, Math.round(LH * 0.64), Math.floor((cardW - GUT - 60) / (maxLen * CHAR))));
  const cardH = BAR + TAB + 2 * PAD + n * LH + STAT;
  const top = aside ? Math.round((820 - cardH) / 2) : Math.max(120, Math.round((820 - cardH) / 2) + 40);

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-glow { position: absolute; left: ${cardX - 120}px; top: ${top - 60}px; width: ${cardW + 240}px; height: ${cardH + 120}px; border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--cyan) 22%, transparent), transparent); }
#${S}-tilt { position: absolute; left: ${cardX}px; top: ${top}px; width: ${cardW}px; height: ${cardH}px;${aside ? "" : `
  transform: perspective(2200px) rotateY(-9deg) rotateX(4deg); transform-origin: 70% 50%;`} }
#${S}-card { position: absolute; inset: 0; box-sizing: border-box; border-radius: ${R}px; overflow: hidden;
  background: color-mix(in srgb, var(--canvas) 55%, var(--surface)); border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent);
  box-shadow: 0 34px 90px color-mix(in srgb, var(--canvas) 80%, transparent); }
#${S}-bar { position: absolute; left: 0; top: 0; right: 0; height: ${BAR}px; display: flex; align-items: center; gap: 12px; padding: 0 24px;
  background: color-mix(in srgb, var(--canvas) 70%, var(--surface)); border-bottom: 2px solid color-mix(in srgb, var(--ink) 8%, transparent); }
.${S}-tl { width: 16px; height: 16px; border-radius: 50%; flex: none; }
#${S}-wt { position: absolute; left: 160px; right: 160px; text-align: center; font-size: 24px; font-weight: 600; color: var(--muted); white-space: nowrap;
  overflow: hidden; }
#${S}-tabs { position: absolute; left: 0; right: 0; top: ${BAR}px; height: ${TAB}px; display: flex; align-items: flex-end;
  border-bottom: 2px solid color-mix(in srgb, var(--ink) 8%, transparent); }
#${S}-tab { height: ${TAB - 2}px; padding: 0 28px; display: flex; align-items: center; gap: 12px; font-family: ${mono}; font-size: 22px; color: var(--ink);
  background: color-mix(in srgb, var(--canvas) 55%, var(--surface)); border-top: 3px solid var(--cyan); white-space: nowrap; }
#${S}-tabdot { width: 12px; height: 12px; border-radius: 50%; background: var(--gold); }
#${S}-code { position: absolute; left: 0; right: 0; top: ${BAR + TAB + PAD}px; height: ${n * LH}px; }
#${S}-hl { position: absolute; left: 0; right: 0; height: ${LH}px; background: color-mix(in srgb, var(--cyan) 13%, transparent);
  border-left: 5px solid var(--cyan); transform-origin: 0 50%; }
.${S}-row { position: absolute; left: 0; right: 0; height: ${LH}px; line-height: ${LH}px; font-family: ${mono}; font-size: ${fs}px; }
.${S}-ln { position: absolute; top: 0; left: 0; width: ${GUT - 18}px; text-align: right; color: color-mix(in srgb, var(--muted) 80%, transparent); }
#${S}-lnon { color: var(--ink); font-weight: 700; }
.${S}-tx { position: absolute; top: 0; left: ${GUT + 6}px; right: 24px; white-space: pre; overflow: hidden; color: var(--ink); }
#${S}-stat { position: absolute; left: 0; right: 0; bottom: 0; height: ${STAT}px; display: flex; align-items: center; gap: 30px; padding: 0 24px;
  background: color-mix(in srgb, var(--canvas) 70%, var(--surface)); border-top: 2px solid color-mix(in srgb, var(--ink) 8%, transparent);
  font-family: ${mono}; font-size: 20px; color: var(--muted); white-space: nowrap; }
#${S}-branch { color: var(--cyan); }
#${S}-pos { margin-left: auto; }
#${S}-cap { position: absolute; left: 80px; top: 26px; width: 1600px; text-align: center; font-size: 48px; font-weight: 800; line-height: 1.15;
  color: var(--ink); white-space: nowrap; }
#${S}-side { position: absolute; left: 20px; top: 0; width: 660px; height: 820px; display: flex; flex-direction: column; justify-content: center; gap: 30px; }
#${S}-lang { align-self: flex-start; padding: 10px 26px; border-radius: 30px; font-family: ${mono}; font-size: 26px; font-weight: 700; color: var(--cyan);
  border: 2px solid color-mix(in srgb, var(--cyan) 55%, transparent); background: color-mix(in srgb, var(--cyan) 10%, transparent); }
#${S}-big { font-size: 58px; font-weight: 800; line-height: 1.16; color: var(--ink); }
#${S}-tag { align-self: flex-start; display: flex; align-items: center; gap: 14px; font-family: ${mono}; font-size: 30px; color: var(--gold); }
#${S}-tagbar { width: 44px; height: 6px; border-radius: 3px; background: var(--gold); }
${highlightCss(S)}`;

  const rows = lines.map((l, i) => `      <div class="${S}-row" id="${S}-r${i}" style="top: ${i * LH}px"><span class="${S}-ln"${i === f ? ` id="${S}-lnon"` : ""}>${i + 1}</span><span class="${S}-tx" id="${S}-t${i}">${highlight(l, esc, S) || " "}</span></div>`).join("\n");
  const card = `<div id="${S}-tilt"><div id="${S}-card">
    <div id="${S}-bar"><span class="${S}-tl" style="background: var(--warn)"></span><span class="${S}-tl" style="background: var(--gold)"></span><span class="${S}-tl" style="background: var(--cyan)"></span>
      <div id="${S}-wt">${esc(slots.file)}</div></div>
    <div id="${S}-tabs"><div id="${S}-tab"><span id="${S}-tabdot"></span>${esc(slots.file)}</div></div>
    <div id="${S}-code">
      ${f != null ? `<div id="${S}-hl" style="top: ${f * LH}px"></div>` : ""}
${rows}
    </div>
    <div id="${S}-stat"><span id="${S}-branch">main</span><span>UTF-8</span>${lang ? `<span>${lang}</span>` : ""}<span id="${S}-pos">Ln ${(f ?? n - 1) + 1}, Col 1</span></div>
  </div></div>`;
  const side = aside ? `<div id="${S}-side">
    ${lang ? `<div id="${S}-lang">${lang}</div>` : ""}
    <div id="${S}-big">${esc(slots.caption ?? slots.file)}</div>
    ${f != null ? `<div id="${S}-tag"><span id="${S}-tagbar"></span><span>Dòng ${f + 1}</span></div>` : ""}
  </div>` : "";
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
  ${aside ? "" : `<div id="${S}-glow"></div>`}
  ${card}
  ${side}
  ${!aside && slots.caption ? `<div id="${S}-cap">${esc(slots.caption)}</div>` : ""}
 </div>
</div>`;

  const m = [];
  m.push({ prim: "reveal", target: `#${S}-card`, at: w.a + 0.05, dur: 0.55, from: aside ? { opacity: 0, x: 50 } : { opacity: 0, y: 40, scale: 0.94 }, ease: ctx.ease });
  if (!aside) m.push({ prim: "reveal", target: `#${S}-glow`, at: w.a + 0.1, dur: 0.8, from: { opacity: 0, scale: 0.8 } });
  // the lines write in, top to bottom, finishing before the focus lands
  const start = w.a + 0.35;
  const doneBy = tF != null ? tF - 0.25 : Math.min(w.b - 0.8, start + n * 0.14);
  const step = Math.max(0.03, Math.min(0.14, (doneBy - start) / n));
  lines.forEach((_, i) => m.push({ prim: "reveal", target: `#${S}-t${i}`, at: fit(start + i * step, 0.3), dur: 0.3, from: { opacity: 0, x: -14 } }));
  let end = start + n * step + 0.3;
  if (tF != null) {
    const at = fit(tF, 0.6);
    m.push({ prim: "reveal", target: `#${S}-hl`, at, dur: 0.6, from: { scaleX: 0, opacity: 0.3 }, ease: "power2.inOut" },
      { prim: "dim", targets: lines.map((_, i) => i).filter((i) => i !== f).map((i) => `#${S}-t${i}`), at: at + 0.25, to: 0.5 });
    if (aside) m.push({ prim: "reveal", target: `#${S}-tag`, at: at + 0.1, dur: 0.45, from: { opacity: 0, x: -24 }, ease: ctx.ease });
    end = Math.max(end, at + 0.6);
  }
  if (slots.caption) {
    const at = fit(tC, 0.5);
    m.push({ prim: "reveal", target: aside ? `#${S}-big` : `#${S}-cap`, at, dur: 0.5, from: aside ? ctx.motionFrom() : { opacity: 0, y: -20 }, ease: ctx.ease });
    end = Math.max(end, at + 0.5);
  }
  if (aside) m.push({ prim: "reveal", target: `#${S}-side`, at: w.a + 0.1, dur: 0.5, from: { opacity: 0, x: -30 } });
  const d = ctx.drift(`#${S}-grp`, Math.min(end + ctx.gap, w.b - 0.7), 10);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}
