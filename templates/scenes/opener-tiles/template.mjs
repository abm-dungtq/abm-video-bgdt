// opener-tiles — an opener for a technical chapter after the HyperFrames registry block "code-slice-hero" (Apache-2.0,
// heygen-com/hyperframes). One headline is printed across a surface of square tiles; a light (the "cursor") crosses the
// surface and the tiles under either headline turn over one by one, with a small lift, to show the rear headline.
// The registry block draws the tiles as one instanced WebGL 2 mesh; here each tile is a two-faced preserve-3d card under
// one shared perspective. The emitter tweens 2D transforms only, so each tile turns about its vertical axis through a
// static sandwich: rotateX(90deg) → tweened 2D `rotation` 0 → 180 → rotateX(-90deg). Tiles outside both headlines stay.
// sweep (signature): the light moves left to right and the tiles turn column by column behind it.
// ripple: the light blooms from the centre and the tiles turn outward by their distance from it.

import { fit, keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => [...(slots.kicker ? ["kicker"] : []), "headline", "reverse"];

const r3 = (x) => Math.round(x * 1000) / 1000;
const CX = 880, CY = 420;

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const ripple = ctx.variant === "ripple";
  const tHead = ctx.at("headline"), tRev = ctx.at("reverse"), tKick = slots.kicker ? ctx.at("kicker") : null;
  const longest = [slots.headline, slots.reverse].reduce((a, b) => ([...a].length >= [...b].length ? a : b));
  const fs = fit(longest, [[6, 250], [9, 210], [12, 170], [16, 132]]);
  const C = fs >= 200 ? 112 : 96; // square cell
  const cols = Math.min(16, Math.ceil(1600 / C)), rows = Math.max(2, Math.ceil((fs * 1.25) / C));
  const GW = cols * C, GH = rows * C;
  const gx = CX - GW / 2, gy = CY - GH / 2;
  const half = (t) => Math.min(GW, [...t].length * fs * 0.6) / 2 + C * 0.3;
  const reach = Math.max(half(slots.headline), half(slots.reverse));
  const turns = (c) => Math.abs(gx + c * C + C / 2 - CX) <= reach + C / 2; // the column crosses either headline

  const face = (cls, c, r, text) => `<div class="${S}-face ${cls}" data-layout-allow-overflow><div class="${S}-tx" style="left: ${-c * C}px; top: ${-r * C}px" data-layout-allow-overflow>${text}</div></div>`;
  const cells = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push({ r, c, id: `${S}-c${r}x${c}`, turn: turns(c) });
  const head = esc(slots.headline), rev = esc(slots.reverse);
  const cellHtml = (k) => `<div class="${S}-lift" id="${k.id}l" style="left: ${gx + k.c * C}px; top: ${gy + k.r * C}px" data-layout-allow-overlap data-layout-allow-occlusion>`
    + `<div class="${S}-yp"><div class="${S}-ys" id="${k.id}"><div class="${S}-yb">`
    + face(`${S}-front`, k.c, k.r, `<span class="${S}-ft">${head}</span>`)
    + (k.turn ? face(`${S}-rear`, k.c, k.r, `<span class="${S}-rt">${rev}</span>`) : "")
    + `</div></div></div></div>`;

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grid { position: absolute; inset: 0; perspective: 1400px; perspective-origin: ${CX}px ${CY}px; transform-style: preserve-3d; }
.${S}-lift { position: absolute; width: ${C}px; height: ${C}px; transform-style: preserve-3d; }
.${S}-yp { position: absolute; left: ${C / 2}px; top: ${C / 2}px; width: 0; height: 0; transform-style: preserve-3d; transform: rotateX(90deg); }
.${S}-ys { position: absolute; left: 0; top: 0; width: 0; height: 0; transform-style: preserve-3d; }
.${S}-yb { position: absolute; left: ${-C / 2}px; top: ${-C / 2}px; width: ${C}px; height: ${C}px; transform-style: preserve-3d; transform: rotateX(-90deg); }
.${S}-face { position: absolute; inset: 1px; overflow: hidden; border-radius: 6px; backface-visibility: hidden; }
.${S}-front { background: linear-gradient(160deg, color-mix(in srgb, var(--surface) 88%, var(--ink)) 0%, var(--surface) 100%);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--ink) 9%, transparent); }
.${S}-rear { transform: rotateY(180deg); background: color-mix(in srgb, var(--canvas) 70%, #000); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--gold) 22%, transparent); }
.${S}-tx { position: absolute; width: ${GW}px; height: ${GH}px; display: flex; align-items: center; justify-content: center;
  font-size: ${fs}px; font-weight: 800; line-height: 1; letter-spacing: -0.02em; white-space: nowrap; }
.${S}-ft { color: var(--ink); }
.${S}-rt { color: var(--gold); }
#${S}-cur { position: absolute; left: ${CX - 260}px; top: ${CY - 260}px; width: 520px; height: 520px; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--cyan) 38%, transparent) 0%, color-mix(in srgb, var(--cyan) 10%, transparent) 40%, transparent 70%); }
#${S}-kick { position: absolute; left: ${gx}px; top: ${gy - 76}px; font-family: "${theme.mono}", monospace; font-size: 30px; letter-spacing: 0.2em;
  text-transform: uppercase; color: var(--cyan); white-space: nowrap; }
#${S}-bar { position: absolute; left: ${gx}px; top: ${gy + GH + 34}px; width: ${GW}px; height: 8px; overflow: visible; }
#${S}-bar path { fill: none; stroke: var(--gold); stroke-width: 4; stroke-linecap: round; stroke-dasharray: 1000; }`;

  const html = `<div id="${S}-root">
 ${slots.kicker ? `<div id="${S}-kick">${esc(slots.kicker)}</div>` : ""}
 <div id="${S}-grid">
${cells.map(cellHtml).join("\n")}
 </div>
 <div id="${S}-cur"></div>
 <svg id="${S}-bar" viewBox="0 0 ${GW} 8"><path id="${S}-barp" pathLength="1000" d="M2 4 L${GW - 2} 4"/></svg>
</div>`;

  const m = [];
  // the surface assembles at the window start, column by column; the front headline prints onto it on its keyword
  cells.forEach((k) => m.push({ prim: "reveal", target: `#${k.id}l`, at: r3(w.a + k.c * 0.025 + k.r * 0.03), dur: 0.45, from: { opacity: 0, y: 26 }, ease: ctx.ease }));
  m.push({ prim: "reveal", target: `.${S}-ft`, at: Math.max(tHead, w.a + 0.3), dur: 0.5, from: { opacity: 0 }, ease: "power1.out" });
  m.push({ prim: "draw", target: `#${S}-barp`, at: Math.max(tHead, w.a + 0.3), dur: 0.9 });
  if (slots.kicker) m.push({ prim: "reveal", target: `#${S}-kick`, at: Math.max(tKick, w.a + 0.2), dur: 0.45, from: { opacity: 0, x: -20 }, ease: ctx.ease });

  // the turn: a light crosses (sweep) or blooms (ripple); every tile it passes turns over with a lift
  const setUp = w.a + (cols * 0.025 + rows * 0.03 + 0.45) + ctx.gap;
  const start = Math.max(tRev - 0.3, setUp, Math.max(tHead, w.a + 0.3) + 0.55);
  // every turn (sweep delay + row stagger + jitter + the turn itself) ends inside the shot
  const tail = rows * 0.035 + 0.05;
  const flip = Math.max(0.3, Math.min(0.6, w.b - 0.05 - start - tail));
  const span = Math.max(0, Math.min(1.6, w.b - 0.05 - start - tail - flip));
  const dmax = Math.hypot(GW / 2, GH / 2);
  if (ripple) {
    m.push({ prim: "reveal", target: `#${S}-cur`, at: start, dur: span + 0.4, from: { opacity: 0.9, scale: 0.1 }, to: { opacity: 0, scale: 2.2 }, ease: "power1.out" });
  } else {
    m.push({ prim: "reveal", target: `#${S}-cur`, at: start, dur: span + 0.3, from: { opacity: 0, x: -GW / 2 - 200 }, to: { opacity: 1, x: GW / 2 + 200 }, ease: "power1.inOut" });
  }
  cells.filter((k) => k.turn).forEach((k) => {
    const cx = gx + k.c * C + C / 2 - CX, cy = gy + k.r * C + C / 2 - CY;
    const f = ripple ? Math.hypot(cx, cy) / dmax : (k.c + 0.5) / cols;
    const at = r3(start + f * span + k.r * 0.035 + ctx.rng() * 0.04);
    m.push({ prim: "slide", target: `#${k.id}`, at, dur: flip, from: { rotation: 0 }, to: { rotation: 180 }, ease: "back.out(1.3)" });
    m.push({ prim: "slide", target: `#${k.id}l`, at, dur: r3(flip / 2 - 0.01), from: { scale: 1 }, to: { scale: 1.1 }, ease: "power2.out" });
    m.push({ prim: "slide", target: `#${k.id}l`, at: r3(at + flip / 2), dur: r3(flip / 2 - 0.01), from: { scale: 1.1 }, to: { scale: 1 }, ease: "power2.in" });
  });
  return { css, html, motions: keepInside(m, w.b) };
}
