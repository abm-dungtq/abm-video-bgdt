// opener-shard — a chapter opener / climax after the HyperFrames registry block "glass-shard-title" (heygen-com/hyperframes,
// Apache-2.0). The registry block is WebGL; this port keeps the idea in the DOM: the title box is cut into glass shards
// (a jittered grid of triangles, each a clip-path of the title), the shards fly in from depth and tile themselves into
// the headline, fine glass edges stay where they met, then the single readable title takes over from the shard copies.
// Every shard holds a decorative copy of the title and is aria-hidden; exactly one copy (#title) is the readable one.
// center (signature): the title centred and large, the kicker above; shards fly in from all around.
// sweep: the title left-aligned; the shards slide in from the right in a flat, fast sweep.

import { fit, keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => [...(slots.kicker ? ["kicker"] : []), "title"];

const COLS = 4, ROWS = 2;

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const title = esc(slots.title);
  const sweep = ctx.variant === "sweep";
  const tTitle = ctx.at("title"), tKick = slots.kicker ? ctx.at("kicker") : null;
  const fs = sweep ? fit(slots.title, [[10, 190], [16, 156], [24, 128], [32, 112]]) : fit(slots.title, [[10, 210], [16, 168], [24, 136], [32, 118]]);
  const B = sweep ? { x: 120, y: 250, w: 1520, h: 380 } : { x: 80, y: 190, w: 1600, h: 420 };

  // the shard mesh: a jittered grid, every cell split into two triangles (deterministic through ctx.rng)
  const pt = [];
  for (let r = 0; r <= ROWS; r++) {
    for (let c = 0; c <= COLS; c++) {
      const jx = c === 0 || c === COLS ? 0 : (ctx.rng() - 0.5) * 0.12;
      const jy = r === 0 || r === ROWS ? 0 : (ctx.rng() - 0.5) * 0.3;
      pt.push([(c / COLS + jx) * B.w, (r / ROWS + jy) * B.h]);
    }
  }
  const P = (r, c) => pt[r * (COLS + 1) + c];
  const tris = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const a = P(r, c), b = P(r, c + 1), d = P(r + 1, c), e = P(r + 1, c + 1);
      tris.push((r + c) % 2 ? [a, b, d] : [a, b, e], (r + c) % 2 ? [b, e, d] : [a, e, d]);
    }
  }
  const N = tris.length;
  const cen = tris.map((t) => [(t[0][0] + t[1][0] + t[2][0]) / 3, (t[0][1] + t[1][1] + t[2][1]) / 3]);
  const pct = (p) => `${((p[0] / B.w) * 100).toFixed(2)}% ${((p[1] / B.h) * 100).toFixed(2)}%`;

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-fog { position: absolute; left: ${B.x - 160}px; top: ${B.y - 160}px; width: ${B.w + 320}px; height: ${B.h + 320}px; border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--cyan) 20%, transparent), transparent); }
#${S}-box { position: absolute; left: ${B.x}px; top: ${B.y}px; width: ${B.w}px; height: ${B.h}px; }
.${S}-tx, .${S}-shard { position: absolute; inset: 0; display: flex; align-items: center; justify-content: ${sweep ? "flex-start" : "center"};
  text-align: ${sweep ? "left" : "center"}; }
.${S}-tx { box-sizing: border-box; padding: 0 ${sweep ? 20 : 20}px; font-size: ${fs}px; font-weight: 800; line-height: 1.06; letter-spacing: -0.02em; color: var(--ink); }
.${S}-shard { background: linear-gradient(135deg, color-mix(in srgb, var(--cyan) 26%, transparent), color-mix(in srgb, var(--ink) 6%, transparent)); }
#${S}-edges { position: absolute; left: 0; top: 0; width: ${B.w}px; height: ${B.h}px; overflow: visible; }
#${S}-edges path { fill: none; stroke: var(--cyan); stroke-width: 2; stroke-linejoin: round; }
#${S}-kick { position: absolute; font-family: "${theme.mono}", monospace; font-size: 32px; letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--gold); white-space: nowrap; ${sweep ? `left: ${B.x + 20}px; top: 190px;` : "left: 0; width: 1760px; top: 96px; text-align: center;"} }
#${S}-rule { position: absolute; overflow: visible; ${sweep ? `left: ${B.x + 20}px; top: 660px; width: 520px;` : "left: 480px; top: 660px; width: 800px;"} height: 8px; }
#${S}-rule path { fill: none; stroke: var(--gold); stroke-width: 5; stroke-linecap: round; stroke-dasharray: 1000; }`;

  const shards = tris.map((t, i) => `<div class="${S}-shard" id="${S}-sh${i + 1}" aria-hidden="true" data-layout-allow-overlap
      style="clip-path: polygon(${t.map(pct).join(", ")}); transform-origin: ${pct(cen[i])}"><div class="${S}-tx" aria-hidden="true">${title}</div></div>`).join("\n    ");
  const edges = tris.map((t) => `<path d="M${t.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" L")} Z"/>`).join("");
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
  <div id="${S}-fog"></div>
  ${slots.kicker ? `<div id="${S}-kick">${esc(slots.kicker)}</div>` : ""}
  <div id="${S}-box">
    <div id="${S}-shards" aria-hidden="true" data-layout-allow-overlap>
    ${shards}
    </div>
    <svg id="${S}-edges" viewBox="0 0 ${B.w} ${B.h}" aria-hidden="true">${edges}</svg>
    <div class="${S}-tx" id="${S}-title">${title}</div>
  </div>
  <svg id="${S}-rule" viewBox="0 0 ${sweep ? 520 : 800} 8"><path id="${S}-rulep" pathLength="1000" d="M0 4 L${sweep ? 520 : 800} 4"/></svg>
 </div>
</div>`;

  const m = [];
  // the shards land together on the title keyword (never before the flight has room to read as a flight)
  const landBy = Math.max(tTitle, w.a + 1.25);
  const dur = 0.75, spread = 0.4;
  const t0 = landBy - 0.05 - spread - dur;
  m.push({ prim: "reveal", target: `#${S}-fog`, at: w.a + 0.05, dur: 0.9, from: { opacity: 0, scale: 0.8 } });
  m.push({ prim: "draw", target: `#${S}-rulep`, at: w.a + 0.05, dur: 0.9, ease: "power2.inOut" });
  const order = tris.map((_, i) => i).sort((a, b) => (sweep ? cen[a][0] - cen[b][0] : ctx.rng() - 0.5));
  order.forEach((i, k) => {
    const from = sweep
      ? { opacity: 0, x: 900 + Math.round(ctx.rng() * 500), y: Math.round((ctx.rng() - 0.5) * 120), rotation: Math.round((ctx.rng() - 0.5) * 24), scale: 1.1 }
      : { opacity: 0, x: Math.round((cen[i][0] / B.w - 0.5) * 1500), y: Math.round((cen[i][1] / B.h - 0.5) * 900), rotation: Math.round((ctx.rng() - 0.5) * 60), scale: 1.8 + Math.round(ctx.rng() * 8) / 10 };
    m.push({ prim: "reveal", target: `#${S}-sh${i + 1}`, at: t0 + (k * spread) / (N - 1), dur, from, ease: "power3.out" });
  });
  m.push({ prim: "reveal", target: `#${S}-edges`, at: landBy - 0.1, dur: 0.4, from: { opacity: 0 }, to: { opacity: 0.3 } });
  m.push({ prim: "reveal", target: `#${S}-title`, at: landBy, dur: 0.3, from: { opacity: 0 }, ease: "power1.out" });
  m.push({ prim: "reveal", target: `#${S}-shards`, at: landBy + 0.1, dur: 0.3, from: { opacity: 1 }, to: { opacity: 0 }, ease: "power1.in" });
  m.push({ prim: "slide", target: `#${S}-box`, at: landBy, dur: Math.max(0.5, w.b - landBy - 0.1), from: { scale: 1 }, to: { scale: 1.03 }, ease: "sine.out" });
  if (slots.kicker) m.push({ prim: "reveal", target: `#${S}-kick`, at: Math.max(w.a + 0.15, tKick), dur: 0.5, from: { opacity: 0, y: -16 }, ease: ctx.ease });
  return { css, html, motions: keepInside(m, w.b) };
}
