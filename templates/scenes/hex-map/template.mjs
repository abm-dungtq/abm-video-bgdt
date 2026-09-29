// hex-map — regional distribution as a hexagon grid, after the HyperFrames registry block "us-map-hex"
// (heygen-com/hyperframes, Apache-2.0), generalised from US states to any 4–20 labelled regions (provinces, countries,
// teams) placed by col/row or packed in order. The grid stands at the window start as ghost hexagons with their names;
// on "fill" the hexagons colour in a left-to-right wave on a five-step theme scale (surface → gold) and show their
// values; on "top" the highest region is outlined in gold, the outline breathing.
// honeycomb (signature): the grid on the left; title, the colour scale and the top-three list in a panel on the right.
// ranked: the same hexagons re-ordered by value, highest first, in one or two rows under a title strip, each with its
//   rank; the colour scale sits by the title.

import { keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => [...(slots.title ? ["title"] : []), "fill", "top"];

const SQ3 = Math.sqrt(3);
const r1 = (x) => Math.round(x * 10) / 10;
const STEPS = [14, 30, 46, 76, 100]; // % of gold mixed into the surface, low → high
const fmt = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const mono = `"${theme.mono}", monospace`;
  const ranked = ctx.variant === "ranked";
  const regs = slots.regions.map((g, i) => ({ ...g, i }));
  const n = regs.length;
  const unit = slots.unit ? ` ${esc(slots.unit)}` : "";
  const fit = (t, dur) => Math.max(w.a, Math.min(t, w.b - dur - 0.05));
  const vals = regs.map((g) => g.value);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const step = (v) => (hi === lo ? STEPS.length - 1 : Math.min(STEPS.length - 1, Math.floor(((v - lo) / (hi - lo)) * STEPS.length)));
  const order = [...regs].sort((a, b) => b.value - a.value || a.i - b.i);
  const top = order[0];

  // grid cells: (col, row) per region
  let cells;
  if (ranked) {
    const per = n > 5 ? Math.ceil(n / 2) : n;
    cells = new Map(order.map((g, k) => [g.i, { col: k % per, row: Math.floor(k / per) }]));
  } else if (regs.every((g) => g.col != null && g.row != null)) {
    cells = new Map(regs.map((g) => [g.i, { col: g.col, row: g.row }]));
  } else {
    const cols = Math.min(n, Math.ceil(Math.sqrt(n * 1.4)));
    const rowsN = Math.ceil(n / cols);
    cells = new Map(regs.map((g, k) => {
      const row = Math.floor(k / cols), inRow = row === rowsN - 1 ? n - row * cols : cols;
      return [g.i, { col: Math.floor((cols - inRow) / 2) + (k % cols), row }];
    }));
  }
  const maxC = Math.max(...[...cells.values()].map((c) => c.col)), maxR = Math.max(...[...cells.values()].map((c) => c.row));
  const odd = [...cells.values()].some((c) => c.row % 2 === 1);
  // pointy-top hexagons: width √3 r, rows 1.5 r apart, odd rows shifted half a width
  const area = ranked ? { x: 80, y: 250, w: 1600, h: 560 } : { x: 20, y: 30, w: 1020, h: 760 };
  const rad = Math.min(ranked ? 130 : 118, area.w / (SQ3 * (maxC + 1 + (odd ? 0.5 : 0))) - 2, area.h / (1.5 * maxR + 2) - 2);
  const gw = SQ3 * rad * (maxC + 1 + (odd ? 0.5 : 0)), gh = rad * (1.5 * maxR + 2);
  const ox = area.x + (area.w - gw) / 2 + (SQ3 * rad) / 2, oy = area.y + (area.h - gh) / 2 + rad;
  const center = (c) => [r1(ox + SQ3 * rad * (c.col + (c.row % 2 ? 0.5 : 0))), r1(oy + 1.5 * rad * c.row)];
  const hexPts = ([cx, cy], r) => Array.from({ length: 6 }, (_, k) => {
    const a = ((-90 + 60 * k) * Math.PI) / 180;
    return `${r1(cx + r * Math.cos(a))},${r1(cy + r * Math.sin(a))}`;
  }).join(" ");
  const lf = Math.round(rad * 0.27), vf = Math.round(rad * 0.3);

  const hexes = regs.map((g) => {
    const c = center(cells.get(g.i)), s = step(g.value), dark = s >= 3;
    const rank = ranked ? order.indexOf(g) + 1 : 0;
    return `<g class="${S}-hx">
      <polygon class="${S}-ghost" points="${hexPts(c, rad - 3)}"/>
      <text class="${S}-bl" id="${S}-b${g.i}" x="${c[0]}" y="${c[1]}" data-layout-allow-overlap>${esc(g.label)}</text>
      <g class="${S}-fg" id="${S}-f${g.i}">
        <polygon points="${hexPts(c, rad - 3)}" style="fill: color-mix(in srgb, var(--gold) ${STEPS[s]}%, var(--surface))"/>
        ${rank ? `<text class="${S}-rk${dark ? ` ${S}-dk` : ""}" x="${c[0]}" y="${r1(c[1] - rad * 0.5)}">${rank}</text>` : ""}
        <text class="${S}-fl${dark ? ` ${S}-dk` : ""}" x="${c[0]}" y="${r1(c[1] - rad * 0.12)}" data-layout-allow-overlap>${esc(g.label)}</text>
        <text class="${S}-fv${dark ? ` ${S}-dk` : ""}" x="${c[0]}" y="${r1(c[1] + rad * 0.3)}">${fmt(g.value)}</text>
      </g>
    </g>`;
  }).join("\n    ");
  const tc = center(cells.get(top.i));
  const outline = `M${hexPts(tc, rad + 4).split(" ").join(" L")} Z`;

  const legend = `<div id="${S}-leg"><span class="${S}-lv">${fmt(lo)}</span>${STEPS.map((p) => `<span class="${S}-sw" style="background: color-mix(in srgb, var(--gold) ${p}%, var(--surface))"></span>`).join("")}<span class="${S}-lv">${fmt(hi)}${unit}</span></div>`;
  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-ghost { fill: var(--surface); stroke: color-mix(in srgb, var(--cyan) 40%, transparent); stroke-width: 2.5; }
.${S}-fg polygon { stroke: var(--canvas); stroke-width: 3; }
.${S}-bl, .${S}-fl { font-size: ${lf}px; font-weight: 800; text-anchor: middle; dominant-baseline: central; fill: var(--ink); }
.${S}-bl { fill: var(--muted); }
.${S}-fv { font-family: ${mono}; font-size: ${vf}px; font-weight: 700; text-anchor: middle; dominant-baseline: central; fill: var(--ink); }
.${S}-rk { font-family: ${mono}; font-size: ${Math.round(rad * 0.22)}px; font-weight: 700; text-anchor: middle; dominant-baseline: central; fill: var(--cyan); }
.${S}-dk { fill: var(--canvas); }
#${S}-out { fill: none; stroke: var(--gold); stroke-width: 7; stroke-linejoin: round; stroke-dasharray: 1000; }
#${S}-leg { display: flex; align-items: center; gap: 10px; }
.${S}-sw { width: 54px; height: 26px; border-radius: 6px; border: 1px solid color-mix(in srgb, var(--ink) 18%, transparent); }
.${S}-lv { font-family: ${mono}; font-size: 26px; color: var(--muted); white-space: nowrap; }
.${S}-lv:first-child { margin-right: 6px; }
.${S}-lv:last-child { margin-left: 6px; }
#${S}-panel { position: absolute; left: 1090px; top: 60px; width: 650px; height: 700px; box-sizing: border-box; padding: 44px 46px; border-radius: ${R}px;
  background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); display: flex; flex-direction: column; gap: 34px; }
#${S}-ttl { font-size: 48px; font-weight: 800; line-height: 1.15; color: var(--ink); }
#${S}-list { display: flex; flex-direction: column; gap: 18px; padding-top: 26px; border-top: 2px solid color-mix(in srgb, var(--gold) 35%, transparent); }
.${S}-li { display: flex; align-items: center; gap: 20px; }
.${S}-ln { width: 52px; height: 52px; border-radius: 50%; flex: none; display: flex; align-items: center; justify-content: center; font-family: ${mono};
  font-size: 28px; font-weight: 700; color: var(--canvas); background: var(--gold); }
.${S}-lt { font-size: 38px; font-weight: 800; color: var(--ink); white-space: nowrap; }
.${S}-lvv { margin-left: auto; font-family: ${mono}; font-size: 34px; font-weight: 700; color: var(--gold); white-space: nowrap; }
#${S}-lh { font-size: 30px; font-weight: 700; color: var(--muted); }
#${S}-head { position: absolute; left: 80px; top: 40px; width: 1600px; display: flex; align-items: center; gap: 40px; }
#${S}-head #${S}-ttl { font-size: 58px; white-space: nowrap; }
#${S}-head #${S}-leg { margin-left: auto; }`;

  const list = order.slice(0, 3).map((g, k) => `<div class="${S}-li"><span class="${S}-ln">${k + 1}</span><span class="${S}-lt" id="${S}-l${k}">${esc(g.label)}</span><span class="${S}-lvv" id="${S}-v${k}">${fmt(g.value)}</span></div>`).join("");
  const title = slots.title ? `<div id="${S}-ttl">${esc(slots.title)}</div>` : "";
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
  <svg id="${S}-svg" viewBox="0 0 1760 820">
    ${hexes}
    <path id="${S}-out" pathLength="1000" d="${outline}"/>
  </svg>
  ${ranked ? `<div id="${S}-head">${title}${legend}</div>` : `<div id="${S}-panel">${title}${legend}<div id="${S}-list"><div id="${S}-lh">Cao nhất</div>${list}</div></div>`}
 </div>
</div>`;

  // ── motion ────────────────────────────────────────────────────────────────────
  const m = [{ prim: "reveal", target: `#${S}-svg`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0, scale: 0.96 }, ease: ctx.ease }];
  m.push({ prim: "reveal", target: ranked ? `#${S}-head` : `#${S}-panel`, at: w.a + 0.15, dur: 0.5, from: ranked ? { opacity: 0, y: -20 } : { opacity: 0, x: 40 }, ease: ctx.ease });
  if (slots.title) m.push({ prim: "reveal", target: `#${S}-ttl`, at: fit(ctx.at("title"), 0.45), dur: 0.45, from: { opacity: 0, y: 12 } });
  const tF = fit(Math.max(ctx.at("fill"), w.a + 0.55), 1.3);
  const xs = regs.map((g) => center(cells.get(g.i))[0]);
  const x0 = Math.min(...xs), xw = Math.max(1, Math.max(...xs) - x0);
  regs.forEach((g, k) => {
    const at = Math.round((tF + ((xs[k] - x0) / xw) * 0.8) * 100) / 100;
    m.push({ prim: "reveal", target: `#${S}-f${g.i}`, at, dur: 0.4, from: { opacity: 0 }, ease: "power2.out" },
      { prim: "reveal", target: `#${S}-b${g.i}`, at, dur: 0.25, from: { opacity: 1 }, to: { opacity: 0 } });
  });
  const filled = tF + 1.2;
  const tT = fit(Math.max(ctx.at("top"), filled), 0.9);
  m.push({ prim: "draw", target: `#${S}-out`, at: tT, dur: 0.6, ease: "power2.out" });
  if (!ranked) order.slice(0, 3).forEach((_, k) => m.push({ prim: "reveal", target: `#${S}-l${k}`, at: tT + 0.1 + k * 0.12, dur: 0.4, from: { opacity: 0, x: 24 } },
    { prim: "reveal", target: `#${S}-v${k}`, at: tT + 0.2 + k * 0.12, dur: 0.4, from: { opacity: 0 } }));
  // the outline breathes once it is drawn (opacity only: an SVG scale would pivot on the wrong origin)
  for (let k = 0, at = tT + 0.8; at + 0.5 < w.b - 0.05; k++, at += 0.6) {
    m.push({ prim: "reveal", target: `#${S}-out`, at: Math.round(at * 100) / 100, dur: 0.5, from: { opacity: k % 2 ? 0.45 : 1 }, to: { opacity: k % 2 ? 1 : 0.45 }, ease: "sine.inOut" });
  }
  return { css, html, motions: keepInside(m, w.b) };
}
