// pyramid — 3–5 levels in order: levels[0] is the base (the foundation), the last level the top. Each level appears on
// its keyword, base first. The empty outline of every level is on stage from the window start.
// stack-up: a truncated pyramid of trapezoid bands, warmer towards the top; each band drops onto the one below;
//   numbered tags on the left, a gold spark over the apex pulses at the end.
// inverted: the pyramid upside down, widest level on top narrowing to a point; bands slide in from alternating sides
//   and a depth gauge on the right fills one segment per level.
// side-labels: a tall solid triangle on the left cut into slices; each slice lights and a leader line draws to its
//   label on the right.

import { keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => slots.levels.map((_, i) => `levels.${i}`);

const num = (i) => String(i + 1).padStart(2, "0");
const r1 = (x) => Math.round(x * 10) / 10;
/** the largest size in `steps` at which every label sits on one line in its width (bold, ≈ 0.58 em per character) */
const oneLine = (labels, widths, steps) => steps.find((fs) => labels.every((l, i) => [...l].length * fs * 0.58 <= widths[i])) ?? steps.at(-1);
const pts = (a) => a.map(([x, y]) => `${r1(x)},${r1(y)}`).join(" ");

export function render(ctx) {
  const { S, slots, esc, window: w, theme } = ctx;
  const lv = slots.levels;
  const n = lv.length;
  const t = lv.map((_, i) => ctx.at(`levels.${i}`));
  const last = Math.max(...t);
  const mono = `"${theme.mono}", monospace`;
  const clamp = (at, dur) => Math.max(w.a, Math.min(at, w.b - dur - 0.05));
  const heat = (i) => Math.round(10 + (34 * i) / Math.max(1, n - 1)); // % gold in a band, base → top
  const m = [];
  let css, html;

  if (ctx.variant === "inverted") {
    const CX = 860, TOPW = 1300, BOTW = 520, Y0 = 10, Y1 = 760, G = 12;
    const bh = (Y1 - Y0 - (n - 1) * G) / n;
    const half = (y) => (TOPW - ((TOPW - BOTW) * (y - Y0)) / (Y1 - Y0)) / 2;
    const band = (i) => { const a = Y0 + i * (bh + G), b = a + bh; return [[CX - half(a), a], [CX + half(a), a], [CX + half(b), b], [CX - half(b), b]]; };
    const fsOf = lv.map((l, i) => oneLine([l.label], [2 * half(Y0 + i * (bh + G) + bh) - 110 - (l.icon ? 60 : 0)], [48, 42, 38, 34, 30, 28]));
    const GX = 1640, GW = 36;
    css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-sh { fill: none; stroke: color-mix(in srgb, var(--ink) 20%, transparent); stroke-width: 2; stroke-dasharray: 8 10; }
.${S}-bw { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; }
.${S}-bs { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-bs polygon { stroke: var(--gold); stroke-width: 2; stroke-linejoin: round; }
.${S}-bl { position: absolute; left: ${CX - 500}px; width: 1000px; height: ${bh}px; display: flex; align-items: center; justify-content: center; gap: 18px;
  font-weight: 800; color: var(--ink); white-space: nowrap; }
.${S}-bi { width: 1.05em; height: 1.05em; color: var(--gold); flex: none; }
.${S}-bi svg { width: 100%; height: 100%; display: block; }
#${S}-gt { position: absolute; left: ${GX}px; top: ${Y0}px; width: ${GW}px; height: ${Y1 - Y0}px; box-sizing: border-box; border-radius: ${GW / 2}px;
  border: 2px solid color-mix(in srgb, var(--ink) 18%, transparent); }
.${S}-seg { position: absolute; left: ${GX + 6}px; width: ${GW - 12}px; height: ${bh - 6}px; border-radius: 10px; background: var(--gold); transform-origin: 50% 0; }
.${S}-gn { position: absolute; left: ${GX - 70}px; width: 60px; text-align: right; font-family: ${mono}; font-size: 26px; font-weight: 700; color: var(--cyan); }
#${S}-drop { position: absolute; left: ${CX - 14}px; top: ${Y1 + 2}px; width: 28px; height: 28px; }
#${S}-drop path { fill: var(--gold); }
${lv.map((_, i) => { const y = Y0 + i * (bh + G); return `#${S}-l${i + 1} { top: ${r1(y)}px; font-size: ${fsOf[i]}px; }
#${S}-g${i + 1} { top: ${r1(y + 3)}px; }
#${S}-n${i + 1} { top: ${r1(y + bh / 2 - 16)}px; }
#${S}-p${i + 1} { fill: color-mix(in srgb, var(--gold) ${heat(n - 1 - i)}%, var(--surface)); }`; }).join("\n")}`;
    html = `<div id="${S}-root">
  <div id="${S}-grp">
    <svg id="${S}-svg" viewBox="0 0 1760 820">
${lv.map((_, i) => `      <polygon class="${S}-sh" points="${pts(band(i))}"/>`).join("\n")}
    </svg>
    <div id="${S}-gt"></div>
${lv.map((l, i) => `    <div class="${S}-bw" id="${S}-b${i + 1}"><svg class="${S}-bs" viewBox="0 0 1760 820"><polygon id="${S}-p${i + 1}" points="${pts(band(i))}"/></svg>
      <div class="${S}-bl" id="${S}-l${i + 1}">${l.icon ? `<span class="${S}-bi">${ctx.icon(l.icon)}</span>` : ""}${esc(l.label)}</div></div>
    <div class="${S}-seg" id="${S}-g${i + 1}"></div><div class="${S}-gn" id="${S}-n${i + 1}">${num(i)}</div>`).join("\n")}
    <svg id="${S}-drop" viewBox="0 0 28 28"><path d="M14 2 C18 10 24 14 24 19 A10 10 0 0 1 4 19 C4 14 10 10 14 2 Z"/></svg>
  </div>
</div>`;
    m.push({ prim: "reveal", target: `#${S}-svg`, at: w.a + 0.05, dur: 0.6, from: { opacity: 0, y: -20 }, ease: ctx.ease });
    m.push({ prim: "reveal", target: `#${S}-gt`, at: w.a + 0.1, dur: 0.5, from: { opacity: 0, scaleY: 0.3 }, ease: ctx.ease });
    lv.forEach((_, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-n${k}`, at: w.a + 0.2 + i * 0.07, dur: 0.4, from: { opacity: 0, x: 12 } });
      m.push({ prim: "reveal", target: `#${S}-b${k}`, at: clamp(t[i], 0.55), dur: 0.55, from: { opacity: 0, x: i % 2 ? 260 : -260 }, ease: ctx.ease });
      m.push({ prim: "reveal", target: `#${S}-g${k}`, at: clamp(t[i] + 0.1, 0.45), dur: 0.45, from: { scaleY: 0 }, ease: "power2.out" });
    });
    const dAt = clamp(t[n - 1] + 0.4, 0.5);
    m.push({ prim: "reveal", target: `#${S}-drop`, at: dAt, dur: 0.5, from: { opacity: 0, y: -40 }, ease: "bounce.out" });
    if (w.b - (dAt + 0.6) > 1.3) m.push({ prim: "pulse", target: `#${S}-drop`, at: dAt + 0.6, dur: w.b - dAt - 0.65 });
  } else if (ctx.variant === "side-labels") {
    const AX = 330, AY = 20, BY = 800, HW = 290;
    const h = (BY - AY) / n;
    const hw = (y) => (HW * (y - AY)) / (BY - AY);
    const slice = (i) => { const b = BY - i * h, a = b - h; return a <= AY + 0.5
      ? [[AX, AY], [AX + hw(b), b], [AX - hw(b), b]] : [[AX - hw(a), a], [AX + hw(a), a], [AX + hw(b), b], [AX - hw(b), b]]; };
    const yc = (i) => BY - (i + 0.5) * h;
    const LX = 800, rowH = Math.min(120, h - 16);
    const fs = oneLine(lv.map((l) => l.label), lv.map(() => 1760 - LX - 190), [52, 46, 42, 38, 34, 30]);
    const seps = lv.slice(1).map((_, i) => { const y = BY - (i + 1) * h; return `M${r1(AX - hw(y) - 4)} ${r1(y)} L${r1(AX + hw(y) + 4)} ${r1(y)}`; }).join(" ");
    css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-tri { fill: none; stroke: color-mix(in srgb, var(--gold) 60%, transparent); stroke-width: 3; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-base { fill: color-mix(in srgb, var(--ink) 5%, transparent); }
#${S}-seps { fill: none; stroke: var(--canvas); stroke-width: 10; }
.${S}-lead { fill: none; stroke: var(--gold); stroke-width: 3; stroke-dasharray: 1000; }
.${S}-knot { fill: var(--gold); }
#${S}-glow { position: absolute; left: ${AX - 40}px; top: ${AY - 40}px; width: 80px; height: 80px; border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--gold) 80%, transparent), transparent); }
.${S}-row { position: absolute; left: ${LX}px; width: ${1760 - LX}px; height: ${rowH}px; box-sizing: border-box; border-radius: 14px; padding: 0 30px;
  display: flex; align-items: center; gap: 24px; background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-rn { font-family: ${mono}; font-size: 28px; font-weight: 700; color: var(--cyan); flex: none; }
.${S}-ri { width: 52px; height: 52px; color: var(--gold); flex: none; }
.${S}-ri svg { width: 52px; height: 52px; display: block; }
.${S}-rl { font-size: ${fs}px; font-weight: 800; color: var(--ink); white-space: nowrap; }
${lv.map((_, i) => `#${S}-r${i + 1} { top: ${r1(yc(i) - rowH / 2)}px; }
#${S}-f${i + 1} { fill: color-mix(in srgb, var(--gold) ${heat(i) + 30}%, var(--surface)); }`).join("\n")}`;
    const tri = `M${AX} ${AY} L${AX + HW} ${BY} L${AX - HW} ${BY} Z`;
    html = `<div id="${S}-root">
  <div id="${S}-grp">
    <svg id="${S}-svg" viewBox="0 0 1760 820">
${lv.map((_, i) => `      <polygon class="${S}-base" points="${pts(slice(i))}"/>`).join("\n")}
${lv.map((_, i) => `      <polygon id="${S}-f${i + 1}" points="${pts(slice(i))}"/>`).join("\n")}
      <path id="${S}-seps" d="${seps}"/>
      <path id="${S}-tri" pathLength="1000" d="${tri}"/>
${lv.map((_, i) => `      <path class="${S}-lead" id="${S}-d${i + 1}" pathLength="1000" d="M${r1(AX + hw(yc(i)) + 14)} ${r1(yc(i))} L${LX - 10} ${r1(yc(i))}"/>
      <circle class="${S}-knot" id="${S}-k${i + 1}" cx="${r1(AX + hw(yc(i)) + 14)}" cy="${r1(yc(i))}" r="8"/>`).join("\n")}
    </svg>
    <div id="${S}-glow"></div>
${lv.map((l, i) => `    <div class="${S}-row" id="${S}-r${i + 1}"><span class="${S}-rn">${num(i)}</span>${l.icon ? `<span class="${S}-ri">${ctx.icon(l.icon)}</span>` : ""}
      <span class="${S}-rl" id="${S}-l${i + 1}">${esc(l.label)}</span></div>`).join("\n")}
  </div>
</div>`;
    m.push({ prim: "draw", target: `#${S}-tri`, at: w.a + 0.05, dur: 0.9 });
    lv.forEach((_, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-r${k}`, at: w.a + 0.15 + i * 0.07, dur: 0.45, from: { opacity: 0, x: 40 }, ease: ctx.ease });
      m.push({ prim: "reveal", target: `#${S}-f${k}`, at: clamp(t[i], 0.5), dur: 0.5, from: { opacity: 0 } });
      m.push({ prim: "reveal", target: `#${S}-k${k}`, at: clamp(t[i] + 0.1, 0.3), dur: 0.3, from: { opacity: 0, scale: 0 }, ease: "back.out(2)" });
      m.push({ prim: "draw", target: `#${S}-d${k}`, at: clamp(t[i] + 0.1, 0.45), dur: 0.45 });
      m.push({ prim: "reveal", target: `#${S}-l${k}`, at: clamp(t[i] + 0.3, 0.45), dur: 0.45, from: { opacity: 0, x: -24 }, ease: ctx.ease });
    });
    const gAt = clamp(t[n - 1] + 0.3, 0.5);
    m.push({ prim: "reveal", target: `#${S}-glow`, at: gAt, dur: 0.5, from: { opacity: 0, scale: 0.3 }, ease: "back.out(2)" });
    if (w.b - (gAt + 0.55) > 1.3) m.push({ prim: "pulse", target: `#${S}-glow`, at: gAt + 0.55, dur: w.b - gAt - 0.6 });
  } else {
    // stack-up (signature)
    const CX = 950, BOTW = 1420, TOPW = 470, Y0 = 64, Y1 = 800, G = 10;
    const bh = (Y1 - Y0 - (n - 1) * G) / n;
    const half = (y) => (TOPW + ((BOTW - TOPW) * (y - Y0)) / (Y1 - Y0)) / 2;
    const top = (i) => Y1 - (i + 1) * bh - i * G; // level 0 at the bottom
    const band = (i) => { const a = top(i), b = a + bh; return [[CX - half(a), a], [CX + half(a), a], [CX + half(b), b], [CX - half(b), b]]; };
    const fs = oneLine(lv.map((l) => l.label), lv.map((l, i) => 2 * half(top(i)) - 90 - (l.icon ? 60 : 0)), [50, 44, 40, 36, 32, 28]);
    css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-sh { fill: color-mix(in srgb, var(--ink) 3%, transparent); stroke: color-mix(in srgb, var(--ink) 22%, transparent); stroke-width: 2; stroke-dasharray: 8 10; }
.${S}-bw { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; }
.${S}-bs { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-bs polygon { stroke: color-mix(in srgb, var(--gold) 70%, transparent); stroke-width: 2; stroke-linejoin: round; }
.${S}-bl { position: absolute; left: ${CX - 600}px; width: 1200px; height: ${bh}px; display: flex; align-items: center; justify-content: center; gap: 16px;
  font-size: ${fs}px; font-weight: 800; color: var(--ink); white-space: nowrap; }
.${S}-bi { width: ${Math.round(fs * 1.05)}px; height: ${Math.round(fs * 1.05)}px; color: var(--gold); flex: none; }
.${S}-bi svg { width: 100%; height: 100%; display: block; }
.${S}-tag { position: absolute; width: 90px; text-align: right; font-family: ${mono}; font-size: 28px; font-weight: 700; color: var(--cyan); }
#${S}-apex { position: absolute; left: ${CX - 22}px; top: 12px; width: 44px; height: 44px; }
#${S}-apex path { fill: var(--gold); }
${lv.map((_, i) => `#${S}-l${i + 1} { top: ${r1(top(i))}px; }
#${S}-n${i + 1} { left: ${r1(CX - half(top(i) + bh / 2) - 130)}px; top: ${r1(top(i) + bh / 2 - 18)}px; }
#${S}-p${i + 1} { fill: color-mix(in srgb, var(--gold) ${heat(i)}%, var(--surface)); }`).join("\n")}`;
    html = `<div id="${S}-root">
  <div id="${S}-grp">
    <svg id="${S}-svg" viewBox="0 0 1760 820">
${lv.map((_, i) => `      <polygon class="${S}-sh" points="${pts(band(i))}"/>`).join("\n")}
    </svg>
${lv.map((l, i) => `    <div class="${S}-tag" id="${S}-n${i + 1}">${num(i)}</div>
    <div class="${S}-bw" id="${S}-b${i + 1}"><svg class="${S}-bs" viewBox="0 0 1760 820"><polygon id="${S}-p${i + 1}" points="${pts(band(i))}"/></svg>
      <div class="${S}-bl" id="${S}-l${i + 1}">${l.icon ? `<span class="${S}-bi">${ctx.icon(l.icon)}</span>` : ""}${esc(l.label)}</div></div>`).join("\n")}
    <svg id="${S}-apex" viewBox="0 0 44 44"><path d="M22 2 L27 17 L42 22 L27 27 L22 42 L17 27 L2 22 L17 17 Z"/></svg>
  </div>
</div>`;
    m.push({ prim: "reveal", target: `#${S}-svg`, at: w.a + 0.05, dur: 0.6, from: { opacity: 0, y: 20 }, ease: ctx.ease });
    lv.forEach((_, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-n${k}`, at: w.a + 0.15 + i * 0.07, dur: 0.4, from: { opacity: 0, x: -16 } });
      m.push({ prim: "reveal", target: `#${S}-b${k}`, at: clamp(t[i], 0.55), dur: 0.55, from: { opacity: 0, y: -120 }, ease: "back.out(1.3)" });
    });
    const aAt = clamp(t[n - 1] + 0.35, 0.5);
    m.push({ prim: "reveal", target: `#${S}-apex`, at: aAt, dur: 0.5, from: { opacity: 0, scale: 0.2, rotation: -90 }, ease: "back.out(2)" });
    if (w.b - (aAt + 0.55) > 1.3) m.push({ prim: "pulse", target: `#${S}-apex`, at: aAt + 0.55, dur: w.b - aAt - 0.6 });
  }
  const d = ctx.drift(`#${S}-grp`, clamp(last + 0.9, 0.7), 10);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}
