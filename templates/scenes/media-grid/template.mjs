// media-grid — a grid of 2–4 screenshot tiles, after the HyperFrames registry block "mk-placeholder-grid"
// (Apache-2.0). As in the registry block the tiles enter one after another ("box, box, box") at the window start as
// soft gradient wells with their index numeral; then, on each tile's keyword, a drawn mock screen of its kind (chat,
// code, chart, document, photo, dashboard, terminal) loads into it with the registry block's slow Ken Burns settle,
// and its label rises in. No external images: every screen is built from theme-coloured shapes.
// grid (signature): equal tiles — two or three side by side, four as 2 × 2.
// hero: the first tile large on the left, the others stacked on the right.

import { keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => [...(slots.title ? ["title"] : []), ...slots.tiles.map((_, i) => `tiles.${i}`)];

const r3 = (x) => Math.round(x * 1000) / 1000;
const WELLS = ["var(--gold)", "var(--cyan)", "var(--warn)", "var(--muted)"];

/** tile rectangles inside the box (x, y, w, h) — the registry block's "2up / 3up / 4up / 1+2" layouts */
function rects(n, hero, box, g) {
  const { x, y, w, h } = box;
  if (hero) {
    const w1 = Math.round((w - g) * 0.58), w2 = w - g - w1, k = n - 1, h2 = (h - (k - 1) * g) / k;
    return [{ x, y, w: w1, h }, ...Array.from({ length: k }, (_, i) => ({ x: x + w1 + g, y: y + i * (h2 + g), w: w2, h: h2 }))];
  }
  const cols = n === 4 ? 2 : n, rows = n === 4 ? 2 : 1;
  const cw = (w - (cols - 1) * g) / cols, ch = (h - (rows - 1) * g) / rows;
  return Array.from({ length: n }, (_, i) => ({ x: x + (i % cols) * (cw + g), y: y + Math.floor(i / cols) * (ch + g), w: cw, h: ch }));
}

/** a mock screen of one kind, drawn with percentage boxes so it fits any tile */
function screen(kind, S, rng) {
  const bar = (l, t, w, h, c, r = 6) => `<i style="left: ${l}%; top: ${t}%; width: ${w}%; height: ${h}%; background: ${c}; border-radius: ${r}px"></i>`;
  const ink = (a) => `color-mix(in srgb, var(--ink) ${a}%, transparent)`;
  const top = `<i class="${S}-top"></i><i class="${S}-dt" style="left: 3%"></i><i class="${S}-dt" style="left: 6.5%"></i><i class="${S}-dt" style="left: 10%"></i>`;
  const v = () => 22 + Math.round(rng() * 40); // chart bar heights stay under the title bar
  switch (kind) {
    case "chat":
      return top + bar(6, 16, 52, 13, ink(12), 14) + bar(42, 34, 52, 17, "color-mix(in srgb, var(--gold) 30%, transparent)", 14)
        + bar(6, 56, 60, 13, ink(12), 14) + bar(6, 82, 76, 9, ink(8), 20) + bar(85, 82, 9, 9, "var(--gold)", 20);
    case "code":
      return top + Array.from({ length: 7 }, (_, i) => bar(5, 17 + i * 10, 4, 4, ink(18), 2)
        + bar(12 + (i % 3 === 1 ? 5 : i % 3 === 2 ? 10 : 0), 17 + i * 10, 10 + Math.round(rng() * 12), 4, i % 2 ? "var(--gold)" : "var(--cyan)", 3)
        + bar(36 + (i % 3) * 5, 17 + i * 10, 12 + Math.round(rng() * 28), 4, ink(40), 3)).join("");
    case "chart":
      return top + bar(8, 84, 84, 1.2, ink(30), 1) + bar(8, 20, 0.8, 64, ink(30), 1)
        + Array.from({ length: 6 }, (_, i) => { const hh = v(); return bar(13 + i * 13, 84 - hh, 8, hh, i === 4 ? "var(--gold)" : "color-mix(in srgb, var(--cyan) 65%, transparent)", 4); }).join("");
    case "doc":
      return top + bar(10, 18, 55, 7, ink(55), 4) + Array.from({ length: 4 }, (_, i) => bar(10, 32 + i * 7, 80 - (i === 3 ? 30 : 0), 3, ink(22), 2)).join("")
        + bar(10, 64, 38, 24, "color-mix(in srgb, var(--cyan) 30%, transparent)", 8) + bar(53, 66, 37, 3, ink(22), 2) + bar(53, 74, 30, 3, ink(22), 2);
    case "photo":
      return `<i style="left: 0; top: 0; width: 100%; height: 100%; background: linear-gradient(180deg, color-mix(in srgb, var(--cyan) 35%, var(--canvas)) 0%, color-mix(in srgb, var(--gold) 30%, var(--canvas)) 100%)"></i>`
        + `<i style="left: 64%; top: 16%; width: 16%; aspect-ratio: 1; border-radius: 50%; background: var(--gold)"></i>`
        + `<svg class="${S}-mnt" viewBox="0 0 100 60" preserveAspectRatio="none"><path d="M0 60 L0 38 L22 16 L40 36 L58 12 L80 34 L100 22 L100 60 Z" fill="color-mix(in srgb, var(--surface) 80%, var(--canvas))"/>`
        + `<path d="M0 60 L0 48 L30 30 L55 50 L78 38 L100 50 L100 60 Z" fill="var(--canvas)"/></svg>`;
    case "dashboard":
      return top + [0, 1, 2].map((i) => bar(5 + i * 31, 17, 27, 22, ink(9), 10) + bar(8 + i * 31, 21, 12, 4, ink(30), 2)
        + bar(8 + i * 31, 29, 16, 7, i === 1 ? "var(--gold)" : "var(--cyan)", 3)).join("") + bar(5, 46, 89, 46, ink(7), 10)
        + `<svg class="${S}-spk" viewBox="0 0 100 40" preserveAspectRatio="none"><path d="M0 34 L12 30 L24 32 L36 22 L48 25 L60 14 L72 18 L84 8 L100 4" fill="none" stroke="var(--gold)" stroke-width="2.4" vector-effect="non-scaling-stroke"/></svg>`;
    default: // terminal
      return `<i style="left: 0; top: 0; width: 100%; height: 100%; background: color-mix(in srgb, var(--canvas) 70%, #000)"></i>` + top
        + Array.from({ length: 6 }, (_, i) => bar(5, 18 + i * 11, 3, 4, "var(--cyan)", 2) + bar(10, 18 + i * 11, 18 + Math.round(rng() * 50), 4, i === 5 ? "var(--gold)" : ink(45), 2)).join("");
  }
}

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = Math.max(16, (theme.radius ?? 18) + 6);
  const tiles = slots.tiles;
  const n = tiles.length;
  const hero = ctx.variant === "hero" && n >= 2;
  const t = tiles.map((_, i) => ctx.at(`tiles.${i}`));
  const tT = slots.title ? ctx.at("title") : null;
  const box = { x: 60, y: slots.title ? 130 : 30, w: 1640, h: slots.title ? 660 : 760 };
  const rs = rects(n, hero, box, 36);
  const m = [];

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-ttl { position: absolute; left: 60px; top: 24px; width: 1640px; height: 80px; display: flex; align-items: center; gap: 22px; font-size: 56px; font-weight: 800;
  color: var(--ink); white-space: nowrap; }
#${S}-ttlb { width: 12px; height: 56px; border-radius: 6px; background: var(--gold); flex: none; }
.${S}-cell { position: absolute; border-radius: ${R}px; overflow: hidden; background: var(--surface);
  box-shadow: 0 24px 64px color-mix(in srgb, var(--canvas) 75%, transparent); border: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); box-sizing: border-box; }
.${S}-well { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.${S}-num { font-size: 96px; font-weight: 800; color: color-mix(in srgb, var(--ink) 80%, transparent); }
.${S}-scr { position: absolute; inset: 0; background: var(--surface); }
.${S}-scr i { position: absolute; display: block; }
.${S}-top { left: 0; top: 0; width: 100%; height: 9%; background: color-mix(in srgb, var(--ink) 6%, var(--surface)); }
.${S}-dt { top: 3%; width: 12px; height: 12px; border-radius: 50%; background: color-mix(in srgb, var(--muted) 60%, transparent); }
.${S}-mnt { position: absolute; left: 0; bottom: 0; width: 100%; height: 62%; }
.${S}-spk { position: absolute; left: 8%; top: 52%; width: 83%; height: 34%; overflow: visible; }
.${S}-lab { position: absolute; left: 22px; bottom: 22px; max-width: calc(100% - 44px); box-sizing: border-box; height: 56px; line-height: 52px; padding: 0 22px;
  border-radius: 28px; background: color-mix(in srgb, var(--canvas) 82%, transparent); border: 2px solid color-mix(in srgb, var(--gold) 50%, transparent);
  font-size: 28px; font-weight: 700; color: var(--ink); white-space: nowrap; overflow: hidden; }`;

  const cells = rs.map((r, i) => `  <div class="${S}-cell" id="${S}-cell${i}" style="left: ${Math.round(r.x)}px; top: ${Math.round(r.y)}px; width: ${Math.round(r.w)}px; height: ${Math.round(r.h)}px">
    <div class="${S}-well" id="${S}-well${i}" style="background: linear-gradient(135deg, color-mix(in srgb, ${WELLS[i % 4]} 55%, var(--surface)) 0%, color-mix(in srgb, ${WELLS[i % 4]} 14%, var(--surface)) 100%)"><span class="${S}-num" id="${S}-num${i}">${i + 1}</span></div>
    <div class="${S}-scr" id="${S}-scr${i}" data-layout-allow-overflow data-layout-allow-overlap>${screen(tiles[i].kind, S, ctx.rng)}</div>
    <div class="${S}-lab" id="${S}-lab${i}">${esc(tiles[i].label)}</div>
  </div>`).join("\n");
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
  ${slots.title ? `<div id="${S}-ttl"><span id="${S}-ttlb"></span><span>${esc(slots.title)}</span></div>` : ""}
${cells}
 </div>
</div>`;

  // "box, box, box": the wells enter at the window start
  rs.forEach((_, i) => m.push({ prim: "reveal", target: `#${S}-cell${i}`, at: r3(w.a + 0.05 + i * 0.15), dur: 0.6, from: { opacity: 0, scale: 0.92, y: 28 }, ease: "power3.out" }));
  if (slots.title) m.push({ prim: "reveal", target: `#${S}-ttl`, at: Math.max(tT, w.a + 0.1), dur: 0.5, from: { opacity: 0, x: -30 }, ease: ctx.ease });
  // each screen loads on its keyword, then settles slowly (Ken Burns) until the shot ends
  tiles.forEach((_, i) => {
    const at = r3(Math.min(Math.max(t[i], w.a + 0.4 + i * 0.15), w.b - 0.7));
    m.push({ prim: "reveal", target: `#${S}-scr${i}`, at, dur: 0.45, from: { opacity: 0 }, ease: "power1.out" },
      { prim: "reveal", target: `#${S}-num${i}`, at, dur: 0.3, from: { opacity: 1 }, to: { opacity: 0 } },
      { prim: "reveal", target: `#${S}-lab${i}`, at: r3(at + 0.2), dur: 0.4, from: { opacity: 0, y: 16 }, ease: ctx.ease });
    const kb = r3(w.b - 0.05 - at);
    if (kb > 0.4) m.push({ prim: "slide", target: `#${S}-scr${i}`, at, dur: kb, from: { scale: 1.06 }, to: { scale: 1 }, ease: "sine.out" });
  });
  return { css, html, motions: keepInside(m, w.b) };
}
