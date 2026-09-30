// path-text — a phrase written along a curved path, after the HyperFrames registry block "hw-path-text"
// (Apache-2.0). As in the registry block the text is an SVG textPath with one tspan per character: a dotted guide is
// laid first, then the characters appear one by one along it over the `text` range while a pen dot runs ahead of
// them, and the drawing boils (a tiny jitter re-drawn 8 times a second). The registry block's Caveat font has no
// Vietnamese, so the text uses the theme font. Optional `from` / `to` labels mark the two ends of the path.
// wave (signature): an S-curve across the stage, rising left to right.
// arc: a high arch from the lower left to the lower right, drawn as a solid line under the dotted guide.

import { keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["text", ...(slots.to ? ["to"] : [])];

const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const r3 = (x) => Math.round(x * 1000) / 1000;
const hash = (n, seed) => { const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };

// cubic segments [p0, c1, c2, p1] in stage coordinates (x 0–1760, y 0–820)
const PATHS = {
  wave: [[[140, 600], [460, 330], [800, 760], [1150, 470]], [[1150, 470], [1380, 280], [1560, 270], [1640, 300]]],
  arc: [[[190, 690], [360, 140], [1400, 140], [1570, 690]]],
};

const bez = ([a, b, c, d], t) => {
  const u = 1 - t;
  return [0, 1].map((k) => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]);
};
/** dense samples of the whole path with their running length */
function sample(segs) {
  const pts = [];
  let L = 0, prev = null;
  segs.forEach((s) => {
    for (let i = 0; i <= 200; i++) {
      const p = bez(s, i / 200);
      if (prev) L += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
      pts.push({ p, L });
      prev = p;
    }
  });
  return { pts, L };
}
const pointAt = (pts, len) => (pts.find((x) => x.L >= len) ?? pts.at(-1)).p;

export function render(ctx) {
  const { S, slots, esc, window: w } = ctx;
  const chars = [...slots.text.normalize("NFC").trim().replace(/\s+/g, " ")];
  const n = chars.length;
  const arc = ctx.variant === "arc";
  const segs = PATHS[arc ? "arc" : "wave"];
  const { pts, L } = sample(segs);
  const d = `M${segs[0][0].join(" ")} ${segs.map((s) => `C${s[1].join(" ")} ${s[2].join(" ")} ${s[3].join(" ")}`).join(" ")}`;
  const seed = Math.floor(ctx.rng() * 1000) + 1;
  const m = [];

  // the text fills at most 86 % of the path (Be Vietnam Pro ExtraBold ≈ 0.6 em per character), centred on it
  const fs = Math.max(34, Math.min(arc ? 88 : 96, Math.floor((0.86 * L) / (n * 0.6))));
  const textLen = Math.min(0.86 * L, n * fs * 0.6);
  const a0 = (L - textLen) / 2, a1 = (L + textLen) / 2;
  const [sx, sy] = segs[0][0], [ex, ey] = segs.at(-1)[3];
  // the pen dot: sampled along the written stretch of the path (it sits on the first point, so it moves relative to it)
  const K = 16;
  const penPts = Array.from({ length: K + 1 }, (_, i) => pointAt(pts, a0 + ((a1 - a0) * i) / K).map(r1));

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-boil { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; }
#${S}-svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-p { fill: none; }
#${S}-rail { fill: none; stroke: color-mix(in srgb, var(--cyan) 45%, transparent); stroke-width: 4; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-guide { fill: none; stroke: color-mix(in srgb, var(--ink) 30%, transparent); stroke-width: 3; stroke-dasharray: 2 14; stroke-linecap: round; }
#${S}-txt { font-weight: 800; font-size: ${fs}px; fill: var(--ink); }
.${S}-end { fill: var(--gold); }
#${S}-endb { fill: var(--cyan); }
#${S}-pen { position: absolute; left: ${penPts[0][0] - 12}px; top: ${penPts[0][1] - 12}px; width: 24px; height: 24px; border-radius: 50%; background: var(--gold);
  box-shadow: 0 0 22px color-mix(in srgb, var(--gold) 70%, transparent); }
.${S}-lab { position: absolute; height: 58px; line-height: 58px; padding: 0 24px; border-radius: 29px; font-size: 32px; font-weight: 700; white-space: nowrap; }
#${S}-la { left: ${sx - 30}px; top: ${sy + 34}px; background: var(--surface); color: var(--ink); border: 2px solid color-mix(in srgb, var(--gold) 55%, transparent); }
#${S}-lb { ${arc ? `right: ${1760 - ex - 30}px; top: ${ey + 34}px;` : `right: ${1760 - ex - 30}px; top: ${ey - 96}px;`}
  background: color-mix(in srgb, var(--cyan) 18%, var(--surface)); color: var(--cyan); border: 2px solid color-mix(in srgb, var(--cyan) 60%, transparent); }`;

  // glyph boxes of neighbouring characters overlap on a curve (accents, tight turns), hence data-layout-allow-overlap
  const tspans = chars.map((c) => `<tspan class="${S}-c">${esc(c)}</tspan>`).join("");
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
  <div id="${S}-boil">
    <svg id="${S}-svg" viewBox="0 0 1760 820">
      <path id="${S}-p" d="${d}"/>
      ${arc ? `<path id="${S}-rail" pathLength="1000" d="${d}"/>` : ""}
      <path id="${S}-guide" d="${d}"/>
      <circle class="${S}-end" id="${S}-enda" cx="${sx}" cy="${sy}" r="12"/>
      <circle class="${S}-end" id="${S}-endb" cx="${ex}" cy="${ey}" r="12"/>
      <text id="${S}-txt" text-anchor="middle" data-layout-allow-overlap><textPath id="${S}-tp" href="#${S}-p" startOffset="50%">${tspans}</textPath></text>
    </svg>
    <div id="${S}-pen" data-layout-allow-overlap></div>
  </div>
  ${slots.from ? `<div class="${S}-lab" id="${S}-la">${esc(slots.from)}</div>` : ""}
  ${slots.to ? `<div class="${S}-lab" id="${S}-lb">${esc(slots.to)}</div>` : ""}
 </div>
</div>`;

  // the guide first, then the writing over the `text` range with the pen ahead of it
  const [s0, s1] = ctx.at("text");
  const t0 = Math.max(s0, w.a + 0.8);
  const D = r3(Math.max(0.5, Math.min(n * 0.07, 0.75 * (Math.min(s1, w.b - 0.5) - t0))));
  m.push({ prim: "reveal", target: `#${S}-guide`, at: w.a + 0.05, dur: 0.6, from: { opacity: 0 } },
    { prim: "reveal", target: `#${S}-enda`, at: w.a + 0.1, dur: 0.4, from: { opacity: 0 } });
  if (arc) m.push({ prim: "draw", target: `#${S}-rail`, at: w.a + 0.1, dur: 0.8, ease: "power2.inOut" });
  if (slots.from) m.push({ prim: "reveal", target: `#${S}-la`, at: w.a + 0.2, dur: 0.45, from: { opacity: 0, y: 14 }, ease: ctx.ease });
  m.push({ prim: "type", target: `#${S}-tp`, chars: `.${S}-c`, count: n, at: r3(t0), dur: D });
  m.push({ prim: "reveal", target: `#${S}-pen`, at: r3(t0 - 0.25), dur: 0.2, from: { opacity: 0 } },
    { prim: "orbit", target: `#${S}-pen`, at: r3(t0), dur: D, points: penPts.map(([x, y]) => [r1(x - penPts[0][0]), r1(y - penPts[0][1])]) },
    { prim: "reveal", target: `#${S}-pen`, at: r3(t0 + D + 0.05), dur: 0.3, from: { opacity: 1 }, to: { opacity: 0 } });
  const tEnd = Math.min(t0 + D + 0.1, w.b - 0.5);
  m.push({ prim: "reveal", target: `#${S}-endb`, at: r3(tEnd), dur: 0.4, from: { opacity: 0 } });
  if (slots.to) m.push({ prim: "reveal", target: `#${S}-lb`, at: Math.max(ctx.at("to"), tEnd), dur: 0.45, from: { opacity: 0, y: 14 }, ease: ctx.ease });
  // boil: the drawing jitters, 8 times a second
  for (let k = 0, at = w.a + 0.1; at < w.b - 0.05; k++, at += 0.125) {
    m.push({ prim: "swap", target: `#${S}-boil`, at: r2(at), props: {
      x: r2(hash(k * 3, seed) * 1.4), y: r2(hash(k * 3 + 1, seed) * 1.4), rotation: r2(hash(k * 3 + 2, seed) * 0.2) } });
  }
  return { css, html, motions: keepInside(m, w.b) };
}
