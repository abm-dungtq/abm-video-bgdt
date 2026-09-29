// world-map — coverage by country or region on a world map, after the HyperFrames registry block "world-map"
// (heygen-com/hyperframes, Apache-2.0). The block loads d3, topojson and the world atlas from a CDN at render time; here
// the world is vendored as pre-projected, simplified SVG paths (world-data.mjs), so a frame never fetches anything.
// The whole world stands at the window start as muted land; on each region's keyword the region fills gold, a cyan
// beacon pings on it and its label arrives.
// callouts (signature): the map across the middle, each label a card in a side column (west on the left, east on the
//   right) tied to its region by a drawn elbow leader.
// pins: the map on the left with numbered pins (spread apart when regions sit close), a numbered legend on the right
//   whose rows light with their regions.

import { keepInside } from "../_shared/dna-card.mjs";
import { VIEW, SHAPES, REGIONS } from "./world-data.mjs";

export const revealKeys = (slots) => [...(slots.title ? ["title"] : []), ...slots.regions.map((_, i) => `regions.${i}`)];

const r1 = (x) => Math.round(x * 10) / 10;

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const mono = `"${theme.mono}", monospace`;
  const regs = slots.regions;
  const n = regs.length;
  const pins = ctx.variant === "pins";
  const fit = (t, dur) => Math.max(w.a, Math.min(t, w.b - dur - 0.05));
  for (const g of regs) if (!REGIONS[g.region]) throw new Error(`unknown region "${g.region}"`);
  const t = regs.map((_, i) => ctx.at(`regions.${i}`));

  // the map box in stage px
  const map = pins ? { x: 10, w: 1040 } : { x: 300, w: 1160 };
  map.h = Math.round((map.w * VIEW.h) / VIEW.w);
  map.y = pins ? Math.round((820 - map.h) / 2) + 20 : slots.title ? 180 : 150;
  const k = map.w / VIEW.w;
  const anchor = (g) => [r1(map.x + REGIONS[g.region].at[0] * k), r1(map.y + REGIONS[g.region].at[1] * k)];
  const A = regs.map(anchor);
  const land = SHAPES.join("");
  const fills = regs.map((g, i) => `<path class="${S}-hit" id="${S}-h${i}" d="${REGIONS[g.region].m.map((j) => SHAPES[j]).join("")}"/>`).join("\n      ");

  // ── label placement ─────────────────────────────────────────────────────────
  let placed = [];
  if (pins) {
    // spread pins that would touch; a short stem keeps each tied to its anchor
    const P = A.map(([x, y]) => [x, y - 44]);
    for (let it = 0; it < 60; it++) {
      for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
        const dx = P[b][0] - P[a][0], dy = P[b][1] - P[a][1], d = Math.hypot(dx, dy) || 0.01, need = 64;
        if (d < need) {
          const push = (need - d) / 2, ux = d > 0.01 ? dx / d : 1, uy = d > 0.01 ? dy / d : 0;
          P[a] = [P[a][0] - ux * push, P[a][1] - uy * push]; P[b] = [P[b][0] + ux * push, P[b][1] + uy * push];
        }
      }
    }
    placed = P.map(([x, y]) => [r1(Math.max(map.x + 30, Math.min(map.x + map.w - 30, x))), r1(Math.max(map.y - 10, Math.min(map.y + map.h, y)))]);
  } else {
    // west of the map middle → left column, east → right; at most 3 per side, the nearest to the middle moves over
    const idx = regs.map((_, i) => i);
    let left = idx.filter((i) => A[i][0] < map.x + map.w / 2), right = idx.filter((i) => A[i][0] >= map.x + map.w / 2);
    while (left.length > 3) { left.sort((a, b) => A[a][0] - A[b][0]); right.push(left.pop()); }
    while (right.length > 3) { right.sort((a, b) => A[a][0] - A[b][0]); left.push(right.shift()); }
    const CH = 140, GAP = 18, lo = map.y - 20, hi = 810;
    const column = (list) => {
      const sorted = [...list].sort((a, b) => A[a][1] - A[b][1]);
      const ys = sorted.map((i) => A[i][1] - CH / 2);
      for (let q = 0; q < ys.length; q++) ys[q] = Math.max(ys[q], q ? ys[q - 1] + CH + GAP : lo);
      const over = ys.length ? ys.at(-1) + CH - hi : 0;
      if (over > 0) for (let q = ys.length - 1; q >= 0; q--) ys[q] = Math.min(ys[q], (q === ys.length - 1 ? hi - CH : ys[q + 1] - CH - GAP));
      return sorted.map((i, q) => [i, Math.round(Math.max(lo, ys[q]))]);
    };
    placed = new Array(n);
    for (const [i, y] of column(left)) placed[i] = { side: "l", y };
    for (const [i, y] of column(right)) placed[i] = { side: "r", y };
  }
  const CW = 280, CH = 140;
  const leaders = regs.map((_, i) => {
    const [ax, ay] = A[i];
    if (pins) {
      const [px, py] = placed[i];
      return `<path class="${S}-ld" id="${S}-ld${i}" pathLength="1000" d="M${ax} ${ay} L${px} ${r1(py + 24)}"/>`;
    }
    const { side, y } = placed[i];
    const cx = side === "l" ? CW : 1760 - CW, cy = y + CH / 2;
    const ex = side === "l" ? map.x - 10 : map.x + map.w + 10;
    return `<path class="${S}-ld" id="${S}-ld${i}" pathLength="1000" d="M${cx} ${cy} L${ex} ${cy} L${ax} ${ay}"/>`;
  }).join("\n      ");

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-map { position: absolute; left: ${map.x}px; top: ${map.y}px; width: ${map.w}px; height: ${map.h}px; overflow: visible; }
#${S}-land { fill: color-mix(in srgb, var(--ink) 16%, var(--canvas)); stroke: var(--canvas); stroke-width: ${r1(0.9 / k * 1.2)}; stroke-linejoin: round; }
.${S}-hit { fill: var(--gold); stroke: color-mix(in srgb, var(--gold) 60%, var(--canvas)); stroke-width: ${r1(0.9 / k * 1.2)}; stroke-linejoin: round; }
#${S}-ov { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-ld { fill: none; stroke: var(--cyan); stroke-width: 3; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-dot { position: absolute; width: 18px; height: 18px; margin: -9px 0 0 -9px; border-radius: 50%; background: var(--cyan);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--canvas) 80%, transparent); }
.${S}-ring { position: absolute; width: 90px; height: 90px; margin: -45px 0 0 -45px; border-radius: 50%; border: 4px solid var(--cyan); }
.${S}-card { position: absolute; width: ${CW}px; height: ${CH}px; box-sizing: border-box; padding: 16px 22px; border-radius: ${R}px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--cyan) 50%, transparent); display: flex; flex-direction: column; justify-content: center; gap: 6px; }
.${S}-cl { font-size: 30px; font-weight: 800; line-height: 1.15; color: var(--ink); }
.${S}-cv { font-family: ${mono}; font-size: 30px; font-weight: 700; color: var(--gold); white-space: nowrap; }
#${S}-ttl { position: absolute; left: 80px; top: 36px; width: 1600px; text-align: center; font-size: 58px; font-weight: 800; line-height: 1.15; color: var(--ink); }
.${S}-pin { position: absolute; width: 48px; height: 48px; margin: -24px 0 0 -24px; border-radius: 50%; background: var(--gold); color: var(--canvas);
  font-family: ${mono}; font-size: 26px; font-weight: 700; display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 0 4px var(--canvas); }
#${S}-panel { position: absolute; left: 1100px; top: 40px; width: 640px; height: 740px; box-sizing: border-box; padding: 40px 42px; border-radius: ${R}px;
  background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); display: flex; flex-direction: column; gap: 18px; }
#${S}-panel #${S}-ttl { position: static; width: auto; text-align: left; font-size: 40px; padding-bottom: 18px;
  border-bottom: 2px solid color-mix(in srgb, var(--gold) 35%, transparent); }
.${S}-row { display: flex; align-items: center; gap: 20px; }
.${S}-rn { width: 52px; height: 52px; flex: none; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-family: ${mono};
  font-size: 26px; font-weight: 700; color: var(--gold); border: 3px solid var(--gold); box-sizing: border-box; }
.${S}-rb { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.${S}-rt { font-size: 30px; font-weight: 800; line-height: 1.2; color: var(--ink); }
.${S}-rv { font-family: ${mono}; font-size: 26px; font-weight: 700; line-height: 1.2; color: var(--gold); white-space: nowrap; }`;

  const dots = A.map(([x, y], i) => `<div class="${S}-ring" id="${S}-rg${i}" style="left: ${x}px; top: ${y}px"></div><div class="${S}-dot" id="${S}-dt${i}" style="left: ${x}px; top: ${y}px"></div>`).join("");
  const labels = pins
    ? placed.map(([x, y], i) => `<div class="${S}-pin" id="${S}-pn${i}" style="left: ${x}px; top: ${y}px">${i + 1}</div>`).join("")
    : regs.map((g, i) => {
      const { side, y } = placed[i];
      return `<div class="${S}-card" id="${S}-c${i}" style="left: ${side === "l" ? 0 : 1760 - CW}px; top: ${y}px"><div class="${S}-cl">${esc(g.label)}</div>${g.value ? `<div class="${S}-cv">${esc(g.value)}</div>` : ""}</div>`;
    }).join("");
  const title = slots.title ? `<div id="${S}-ttl">${esc(slots.title)}</div>` : "";
  const panel = pins ? `<div id="${S}-panel">${title}${regs.map((g, i) => `<div class="${S}-row" id="${S}-r${i}"><span class="${S}-rn">${i + 1}</span><span class="${S}-rb"><span class="${S}-rt" id="${S}-rt${i}">${esc(g.label)}</span>${g.value ? `<span class="${S}-rv" id="${S}-rv${i}">${esc(g.value)}</span>` : ""}</span></div>`).join("")}</div>` : title;
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
  <svg id="${S}-map" viewBox="0 0 ${VIEW.w} ${VIEW.h}">
      <path id="${S}-land" d="${land}"/>
      ${fills}
  </svg>
  <svg id="${S}-ov" viewBox="0 0 1760 820">
      ${leaders}
  </svg>
  ${dots}
  ${labels}
  ${panel}
 </div>
</div>`;

  // ── motion ────────────────────────────────────────────────────────────────────
  const m = [{ prim: "reveal", target: `#${S}-map`, at: w.a + 0.05, dur: 0.7, from: { opacity: 0, scale: 0.97 }, ease: ctx.ease }];
  if (slots.title) m.push({ prim: "reveal", target: `#${S}-ttl`, at: fit(ctx.at("title"), 0.5), dur: 0.5, from: { opacity: 0, y: -18 }, ease: ctx.ease });
  if (pins) {
    m.push({ prim: "reveal", target: `#${S}-panel`, at: w.a + 0.1, dur: 0.5, from: { opacity: 0, x: 40 }, ease: ctx.ease });
    regs.forEach((_, i) => m.push({ prim: "reveal", target: `#${S}-r${i}`, at: w.a + 0.2 + i * 0.06, dur: 0.4, from: { opacity: 0, y: 12 }, to: { opacity: 0.35, y: 0 } }));
  }
  let end = w.a + 0.8;
  regs.forEach((g, i) => {
    const at = fit(Math.max(t[i], w.a + 0.45), 1);
    m.push({ prim: "reveal", target: `#${S}-h${i}`, at, dur: 0.5, from: { opacity: 0 }, to: { opacity: 0.92 }, ease: "power2.out" },
      { prim: "reveal", target: `#${S}-dt${i}`, at, dur: 0.3, from: { opacity: 0, scale: 0.3 }, ease: "back.out(2.5)" },
      { prim: "reveal", target: `#${S}-rg${i}`, at, dur: 0.15, from: { opacity: 0, scale: 0.2 }, to: { opacity: 1, scale: 0.5 } },
      { prim: "reveal", target: `#${S}-rg${i}`, at: Math.round((at + 0.16) * 100) / 100, dur: 0.64, from: { opacity: 1, scale: 0.5 }, to: { opacity: 0, scale: 1.4 }, ease: "power2.out" },
      { prim: "draw", target: `#${S}-ld${i}`, at: at + 0.1, dur: 0.45, ease: "power2.out" });
    if (pins) {
      m.push({ prim: "reveal", target: `#${S}-pn${i}`, at: at + 0.3, dur: 0.35, from: { opacity: 0, scale: 0.4 }, ease: "back.out(2)" },
        { prim: "reveal", target: `#${S}-r${i}`, at: at + 0.3, dur: 0.35, from: { opacity: 0.35 }, to: { opacity: 1 } });
    } else {
      const side = placed[i].side === "l" ? -30 : 30;
      m.push({ prim: "reveal", target: `#${S}-c${i}`, at: at + 0.35, dur: 0.45, from: { opacity: 0, x: side }, ease: ctx.ease });
    }
    end = Math.max(end, at + 0.8);
  });
  const d = ctx.drift(`#${S}-grp`, Math.min(end + 0.2, w.b - 0.7), 6);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}
