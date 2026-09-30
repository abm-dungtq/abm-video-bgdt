// sketch-pipeline — a hand-drawn process: wobbly boxes joined by curved marker arrows, after the HyperFrames registry
// block "hw-pipeline" (Apache-2.0). The whole pipeline stands at the window start as a faint dashed pencil draft with
// pencilled step numbers; on each step's keyword the arrow into it and its box are inked over the draft, then its label
// (and note) is written in.
// Everything "boils" (a tiny jitter re-drawn 8 times a second), as hand-drawn animation does. The registry block's
// Caveat font has no Vietnamese, so the text uses the theme font with a slight hand tilt.
// row: the steps in one line across the middle, an optional title with a drawn underline above.
// zigzag (signature): the steps alternate high and low, the arrows swooping between them.

import { keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => [...(slots.title ? ["title"] : []), ...slots.steps.map((_, i) => `steps.${i}`)];

const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
/** deterministic hash in [-1, 1] (the registry block's hwHash) */
const hash = (n, seed) => { const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };

/** a rounded rectangle whose corners and edges wobble like a marker stroke, box-local coordinates */
function wobbleRect(w, h, r, seed, amp = 3.5) {
  const o = (k) => r1(hash(k, seed) * amp);
  return `M${r + o(1)} ${o(2)} L${w / 2 + o(3)} ${o(4)} L${w - r + o(5)} ${o(6)} Q${w + o(7)} ${o(8)} ${w + o(9)} ${r + o(10)}`
    + ` L${w + o(11)} ${h / 2 + o(12)} L${w + o(13)} ${h - r + o(14)} Q${w + o(15)} ${h + o(16)} ${w - r + o(17)} ${h + o(18)}`
    + ` L${w / 2 + o(19)} ${h + o(20)} L${r + o(21)} ${h + o(22)} Q${o(23)} ${h + o(24)} ${o(25)} ${h - r + o(26)}`
    + ` L${o(27)} ${h / 2 + o(28)} L${o(29)} ${r + o(30)} Q${o(31)} ${o(32)} ${r + o(33)} ${o(34)}`;
}

/** a curved arrow from (sx, sy) to (tx, ty) bowing by `bow`, barbs along the incoming tangent (stage coordinates) */
function arrowPath(sx, sy, tx, ty, bow, seed) {
  const qx = r1((sx + tx) / 2 + hash(2, seed) * 14), qy = r1((sy + ty) / 2 - bow - hash(3, seed) * 10);
  const ang = Math.atan2(ty - qy, tx - qx) + Math.PI;
  const B = 24, SP = 0.42;
  const b = (s) => `${r1(tx + B * Math.cos(ang + s))} ${r1(ty + B * Math.sin(ang + s))}`;
  return `M${sx} ${sy} Q${qx} ${qy} ${tx} ${ty} M${tx} ${ty} L${b(-SP)} M${tx} ${ty} L${b(SP)}`;
}

export function render(ctx) {
  const { S, slots, esc, window: w } = ctx;
  const steps = slots.steps;
  const n = steps.length;
  const t = steps.map((_, i) => ctx.at(`steps.${i}`));
  const tT = slots.title ? ctx.at("title") : null;
  const zig = ctx.variant === "zigzag";
  const seed = Math.floor(ctx.rng() * 1000) + 1;
  const hasNote = steps.some((s) => s.note);
  const m = [];

  // layout: box i at (x, y) of size bw × bh
  const gap = zig ? 80 : 96;
  const bw = Math.min(n <= 3 ? 400 : 330, Math.floor((1700 - (n - 1) * gap) / n));
  const bh = zig ? (hasNote ? 230 : 180) : (hasNote ? 280 : 220);
  const x0 = Math.round((1760 - (n * bw + (n - 1) * gap)) / 2);
  const top = slots.title ? 170 : 40;
  const ys = steps.map((_, i) => (zig ? (i % 2 ? 820 - 40 - bh : top + 10) : Math.round(top + (820 - top - bh) / 2)));
  const box = steps.map((_, i) => ({ x: x0 + i * (bw + gap), y: ys[i] }));
  const lFs = n >= 5 ? 34 : n === 4 ? (zig ? 38 : 42) : (zig ? 44 : 50);
  const nFs = n >= 5 ? 24 : zig ? 27 : 30;

  const arrows = steps.slice(1).map((_, k) => {
    const a = box[k], b = box[k + 1];
    const sy = a.y + bh / 2, ty = b.y + bh / 2;
    return arrowPath(a.x + bw + 10, sy, b.x - 12, ty, zig ? 30 : 46, seed + k * 9);
  });
  const rect = steps.map((_, i) => wobbleRect(bw, bh, 24, seed + i * 13));
  const under = slots.title ? (() => {
    const len = Math.min(1400, [...slots.title].length * 56 * 0.55 + 60);
    const sx = r1(880 - len / 2), ex = r1(880 + len / 2);
    return `M${sx} ${112 + r1(hash(5, seed) * 4)} Q${r1(880 + hash(6, seed) * 40)} ${r1(126 + hash(7, seed) * 6)} ${ex} ${112 + r1(hash(8, seed) * 4)}`;
  })() : "";

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
.${S}-draft { fill: none; stroke: color-mix(in srgb, var(--muted) 45%, transparent); stroke-width: 2.5; stroke-dasharray: 7 11; stroke-linecap: round; }
.${S}-ink { fill: none; stroke: var(--ink); stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-arr { fill: none; stroke: var(--gold); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-lay { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-step { position: absolute; width: ${bw}px; height: ${bh}px; }
.${S}-boil { position: absolute; inset: 0; }
.${S}-svg { position: absolute; left: 0; top: 0; width: ${bw}px; height: ${bh}px; overflow: visible; }
.${S}-txt { position: absolute; left: 22px; right: 22px; top: 36px; bottom: 6px; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 12px; text-align: center; }
.${S}-lab { display: inline-block; transform: rotate(-1.5deg); font-size: ${lFs}px; font-weight: 800; line-height: 1.12; color: var(--ink); }
.${S}-note { display: inline-block; transform: rotate(-1deg); font-size: ${nFs}px; font-weight: 600; line-height: 1.25; color: var(--muted); }
.${S}-num { position: absolute; left: 20px; top: 12px; font-family: "${ctx.theme.mono}", monospace; font-size: 26px; font-weight: 700; color: var(--muted); }
#${S}-title { position: absolute; left: 80px; top: 30px; width: 1600px; text-align: center; font-size: 56px; font-weight: 800; color: var(--ink); white-space: nowrap; }
#${S}-und { fill: none; stroke: var(--gold); stroke-width: 6; stroke-linecap: round; stroke-dasharray: 1000; }`;

  const html = `<div id="${S}-root">
 <div id="${S}-grp">
${slots.title ? `  <div id="${S}-title">${esc(slots.title)}</div>
  <svg class="${S}-lay" id="${S}-ul" viewBox="0 0 1760 820"><path id="${S}-und" pathLength="1000" d="${under}"/></svg>` : ""}
${arrows.map((d, k) => `  <div class="${S}-lay" id="${S}-ab${k}"><svg class="${S}-lay" viewBox="0 0 1760 820"><path class="${S}-draft" d="${d}"/><path class="${S}-arr" id="${S}-a${k}" pathLength="1000" d="${d}"/></svg></div>`).join("\n")}
${steps.map((s, i) => `  <div class="${S}-step" id="${S}-s${i}" style="left: ${box[i].x}px; top: ${box[i].y}px"><div class="${S}-boil" id="${S}-b${i}">
    <svg class="${S}-svg" viewBox="0 0 ${bw} ${bh}"><path class="${S}-draft" d="${rect[i]}"/><path class="${S}-ink" id="${S}-r${i}" pathLength="1000" d="${rect[i]}"/></svg>
    <div class="${S}-num">${i + 1}</div>
    <div class="${S}-txt"><div id="${S}-l${i}"><span class="${S}-lab">${esc(s.label)}</span></div>${s.note ? `<div id="${S}-n${i}"><span class="${S}-note">${esc(s.note)}</span></div>` : ""}</div>
  </div></div>`).join("\n")}
 </div>
</div>`;

  // the pencil draft at the window start
  m.push({ prim: "reveal", target: `#${S}-grp`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0, scale: 0.98 }, ease: ctx.ease });
  if (slots.title) {
    const at = Math.max(tT, w.a + 0.1);
    m.push({ prim: "reveal", target: `#${S}-title`, at, dur: 0.45, from: { opacity: 0, y: -16 } },
      { prim: "draw", target: `#${S}-und`, at: at + 0.3, dur: 0.6, ease: "power2.inOut" });
  }
  // inking: the arrow into a step, then its box, then its words
  steps.forEach((s, i) => {
    let at = Math.max(t[i], w.a + 0.1);
    if (i > 0) {
      m.push({ prim: "draw", target: `#${S}-a${i - 1}`, at, dur: 0.4, ease: "power2.inOut" });
      at += 0.3;
    }
    m.push({ prim: "draw", target: `#${S}-r${i}`, at, dur: 0.65, ease: "power2.inOut" },
      { prim: "reveal", target: `#${S}-l${i}`, at: Math.min(at + 0.4, Math.max(w.a, w.b - 0.6)), dur: 0.35, from: { opacity: 0, y: 8 } });
    if (s.note) m.push({ prim: "reveal", target: `#${S}-n${i}`, at: Math.min(at + 0.55, Math.max(w.a, w.b - 0.6)), dur: 0.35, from: { opacity: 0, y: 8 } });
  });
  // boil: every step and arrow wrapper jitters on its own, 8 times a second
  const boil = [...steps.map((_, i) => `#${S}-b${i}`), ...arrows.map((_, k) => `#${S}-ab${k}`)];
  for (let k = 0, at = w.a + 0.1; at < w.b - 0.05; k++, at += 0.125) {
    boil.forEach((tg, j) => m.push({ prim: "swap", target: tg, at: r2(at), props: {
      x: r2(hash(k * 3 + j * 97, seed) * 1.6), y: r2(hash(k * 3 + 1 + j * 97, seed) * 1.6), rotation: r2(hash(k * 3 + 2 + j * 97, seed) * 0.4) } }));
  }
  return { css, html, motions: keepInside(m, w.b) };
}
