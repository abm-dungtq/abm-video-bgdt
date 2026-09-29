// signal-trace — a phosphor trace for signals, latency and response speed, after the HyperFrames registry block
// "oscilloscope-trace" (heygen-com/hyperframes, Apache-2.0). The block paints a canvas every frame; here the waveform is
// computed once into SVG paths: the screen and its graticule are on stage at the window start, on "trace" the beam
// sweeps left to right drawing the curve (a blurred copy is the phosphor glow, a bright dot rides the leading edge),
// the readouts light one by one and on "marker" two dashed cursors drop and a bracket measures the gap between them.
// scope (signature): one square-division CRT face on the left, a readout panel on the right.
// latency: two wide channel strips — the signal and its delayed response — with the cursors spanning both, the
//   readouts as a row of pills beneath.

import { keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["trace", ...slots.readouts.map((_, i) => `readouts.${i}`), ...(slots.marker ? ["marker"] : [])];

const r1 = (x) => Math.round(x * 10) / 10;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/** the waveform: u in [0, 1] across the screen → value in [-1, 1]; and the two cursor positions it measures */
function waveform(shape, rng) {
  if (shape === "square") return { f: (u) => Math.tanh(9 * Math.sin(2 * Math.PI * 3 * u)), cur: [1 / 3, 2 / 3] };
  if (shape === "pulse") {
    const at = [0.16, 0.48, 0.8];
    return { f: (u) => -0.7 + 1.6 * at.reduce((s, c) => s + Math.exp(-(((u - c) / 0.018) ** 2)), 0), cur: [0.16, 0.48] };
  }
  if (shape === "step") {
    const u0 = 0.18;
    return { f: (u) => (u < u0 ? -0.75 : -0.75 + 1.5 * (1 - Math.exp(-(u - u0) / 0.05) * Math.cos((u - u0) * 38))), cur: [u0, 0.42] };
  }
  if (shape === "noise") {
    const knots = Array.from({ length: 25 }, () => rng() * 1.6 - 0.8);
    return { f: (u) => { const x = u * 24, i = Math.min(23, Math.floor(x)), t = x - i, s = t * t * (3 - 2 * t); return knots[i] + (knots[i + 1] - knots[i]) * s; }, cur: [0.3, 0.62] };
  }
  return { f: (u) => Math.sin(2 * Math.PI * 3 * u), cur: [1 / 12, 5 / 12] };
}

/** points of f over [0, 1] mapped into the box (x0, y0, w, h), amplitude a (fraction of half the height) */
const trace = (f, { x0, y0, w, h, a }, N = 260) => Array.from({ length: N + 1 }, (_, k) => {
  const u = k / N;
  return [r1(x0 + u * w), r1(y0 + h / 2 - clamp(f(u), -1.2, 1.2) * a * (h / 2))];
});
const pathOf = (pts) => `M${pts.map((p) => p.join(" ")).join(" L")}`;

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const mono = `"${theme.mono}", monospace`;
  const lat = ctx.variant === "latency";
  const fit = (t, dur) => Math.max(w.a, Math.min(t, w.b - dur - 0.05));
  const { f, cur } = waveform(slots.shape, ctx.rng);
  const reads = slots.readouts;
  const ch = [slots.channels?.[0] ?? "CH1", slots.channels?.[1] ?? "CH2"];

  // screens: scope = one 10 × 8 division face; latency = two 16 × 3 strips, the response delayed by DELAY of the width
  const DELAY = 0.1;
  const screens = lat
    ? [{ x: 80, y: 190, w: 1600, h: 220 }, { x: 80, y: 440, w: 1600, h: 220 }]
    : [{ x: 30, y: 90, w: 1000, h: 640 }];
  const DIV = 100; // px per graticule division
  const boxes = screens.map((s) => ({ x0: s.x, y0: s.y, w: s.w, h: s.h, a: lat ? 0.72 : 0.62 }));
  // the response: the same signal, later, a little smoothed and weaker
  const g = (u) => { let s = 0; for (let k = 0; k < 6; k++) s += f(clamp(u - DELAY - k * 0.004, 0, 1)); return (s / 6) * 0.9; };
  const pts = [trace(f, boxes[0]), ...(lat ? [trace(g, boxes[1])] : [])];
  const [u1, u2] = lat ? [cur[0], cur[0] + DELAY] : cur;
  const cx = (u) => r1(boxes[0].x0 + u * boxes[0].w);
  const top = screens[0].y, bot = screens.at(-1).y + screens.at(-1).h;

  const grid = screens.map((s) => {
    const v = [], hl = [];
    for (let x = s.x + DIV; x < s.x + s.w - 1; x += DIV) v.push(`M${x} ${s.y} L${x} ${s.y + s.h}`);
    const rows = lat ? 4 : 8, dy = s.h / rows;
    for (let k = 1; k < rows; k++) hl.push(`M${s.x} ${r1(s.y + k * dy)} L${s.x + s.w} ${r1(s.y + k * dy)}`);
    const ticks = [];
    for (let x = s.x + DIV / 5; x < s.x + s.w; x += DIV / 5) ticks.push(`M${r1(x)} ${s.y + s.h / 2 - 7} L${r1(x)} ${s.y + s.h / 2 + 7}`);
    return `<rect class="${S}-face" x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="10"/>
      <path class="${S}-grid" d="${[...v, ...hl].join(" ")}"/><path class="${S}-axis" d="M${s.x} ${s.y + s.h / 2} L${s.x + s.w} ${s.y + s.h / 2} ${lat ? "" : `M${s.x + s.w / 2} ${s.y} L${s.x + s.w / 2} ${s.y + s.h}`} ${ticks.join(" ")}"/>`;
  }).join("\n      ");
  const color = (i) => (i ? "var(--gold)" : "var(--cyan)");
  const traces = pts.map((p, i) => `<path class="${S}-glow" id="${S}-g${i}" pathLength="1000" d="${pathOf(p)}" style="stroke: ${color(i)}"/>
      <path class="${S}-tr" id="${S}-t${i}" pathLength="1000" d="${pathOf(p)}" style="stroke: ${color(i)}"/>`).join("\n      ");
  // cursors and the bracket between them
  const x1 = cx(u1), x2 = cx(u2), by = lat ? r1((screens[0].y + screens[0].h + screens[1].y) / 2) : top + 40;
  const cursors = slots.marker ? `<path class="${S}-cur" id="${S}-c1" pathLength="1000" d="M${x1} ${top - 10} L${x1} ${bot + 10}"/>
      <path class="${S}-cur" id="${S}-c2" pathLength="1000" d="M${x2} ${top - 10} L${x2} ${bot + 10}"/>
      <path class="${S}-brk" id="${S}-brk" pathLength="1000" d="M${x1 + 4} ${by} L${x2 - 4} ${by} M${x1 + 18} ${by - 12} L${x1 + 4} ${by} L${x1 + 18} ${by + 12} M${x2 - 18} ${by - 12} L${x2 - 4} ${by} L${x2 - 18} ${by + 12}"/>` : "";
  const labW = 420;
  const labX = Math.round(clamp((x1 + x2) / 2 - labW / 2, screens[0].x + 10, screens[0].x + screens[0].w - labW - 10));
  const labY = lat ? by - 28 : top + 64;

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-face { fill: color-mix(in srgb, var(--canvas) 55%, black); stroke: color-mix(in srgb, var(--cyan) 45%, transparent); stroke-width: 2; }
.${S}-grid { fill: none; stroke: color-mix(in srgb, var(--cyan) 14%, transparent); stroke-width: 1.5; }
.${S}-axis { fill: none; stroke: color-mix(in srgb, var(--cyan) 30%, transparent); stroke-width: 1.5; }
.${S}-tr { fill: none; stroke-width: 4; stroke-linejoin: round; stroke-linecap: round; stroke-dasharray: 1000; }
.${S}-glow { fill: none; stroke-width: 14; stroke-linejoin: round; stroke-linecap: round; stroke-dasharray: 1000; opacity: 0.35; filter: blur(7px); }
.${S}-cur { fill: none; stroke: var(--ink); stroke-width: 3; stroke-dasharray: 1000; opacity: 0.85; }
.${S}-brk { fill: none; stroke: var(--gold); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-dot { position: absolute; left: -11px; top: -11px; width: 22px; height: 22px; border-radius: 50%;
  box-shadow: 0 0 22px 8px color-mix(in srgb, var(--cyan) 55%, transparent); }
#${S}-lab { position: absolute; left: ${labX}px; top: ${labY}px; width: ${labW}px; text-align: center; }
#${S}-labi { display: inline-block; padding: 8px 24px; border-radius: 12px; background: color-mix(in srgb, var(--canvas) 70%, black);
  border: 2px solid var(--gold); font-size: 34px; font-weight: 800; color: var(--gold); white-space: nowrap; }
.${S}-chn { position: absolute; font-family: ${mono}; font-size: 26px; font-weight: 700; padding: 4px 14px; border-radius: 8px;
  background: color-mix(in srgb, var(--canvas) 70%, black); }
#${S}-panel { position: absolute; left: 1090px; top: 90px; width: 650px; height: 640px; box-sizing: border-box; padding: 40px 44px; border-radius: ${R}px;
  background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); }
#${S}-ptitle { font-size: 44px; font-weight: 800; line-height: 1.15; color: var(--ink); padding-bottom: 22px; margin-bottom: 18px;
  border-bottom: 2px solid color-mix(in srgb, var(--cyan) 35%, transparent); }
.${S}-rd { display: flex; justify-content: space-between; align-items: baseline; gap: 20px; padding: 16px 0; }
.${S}-rl { font-size: 32px; font-weight: 600; color: var(--muted); white-space: nowrap; }
.${S}-rv { font-family: ${mono}; font-size: 36px; font-weight: 700; color: var(--cyan); white-space: nowrap; }
#${S}-head { position: absolute; left: 80px; top: 40px; width: 1600px; font-size: 60px; font-weight: 800; color: var(--ink); white-space: nowrap; }
#${S}-pills { position: absolute; left: 80px; top: 700px; width: 1600px; display: flex; gap: 24px; }
.${S}-pill { flex: 1; display: flex; justify-content: space-between; align-items: baseline; gap: 14px; padding: 16px 26px; border-radius: 40px;
  background: var(--surface); border: 2px solid color-mix(in srgb, var(--cyan) 35%, transparent); }
.${S}-pill .${S}-rl { font-size: 28px; }
.${S}-pill .${S}-rv { font-size: 30px; }${reads.length > 2 ? `
/* three or four pills share the row: each stacks its label over its value so the longest pair still fits */
.${S}-pill { flex-direction: column; justify-content: center; gap: 4px; padding: 12px 26px; border-radius: ${R}px; min-width: 0; }` : ""}`;

  const dots = pts.map((p, i) => `<div class="${S}-dot" id="${S}-d${i}" style="background: ${color(i)}"></div>`).join("");
  const chanTags = screens.map((s, i) => `<div class="${S}-chn" id="${S}-ch${i}" style="right: ${1760 - s.x - s.w + 16}px; top: ${s.y + 14}px; color: ${color(i)}">${esc(ch[i])}</div>`).join("");
  const readHtml = reads.map((r, i) => `<div class="${S}-${lat ? "pill" : "rd"}" id="${S}-r${i}"><span class="${S}-rl">${esc(r.label)}</span><span class="${S}-rv">${esc(r.value)}</span></div>`).join("");
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
  ${lat && slots.title ? `<div id="${S}-head">${esc(slots.title)}</div>` : ""}
  <svg id="${S}-svg" viewBox="0 0 1760 820">
      ${grid}
      ${traces}
      ${cursors}
  </svg>
  ${dots}
  ${chanTags}
  ${slots.marker ? `<div id="${S}-lab"><span id="${S}-labi">${esc(slots.marker)}</span></div>` : ""}
  ${lat ? `<div id="${S}-pills">${readHtml}</div>` : `<div id="${S}-panel">${slots.title ? `<div id="${S}-ptitle">${esc(slots.title)}</div>` : ""}${readHtml}</div>`}
 </div>
</div>`;

  // ── motion ────────────────────────────────────────────────────────────────────
  const m = [{ prim: "reveal", target: `#${S}-svg`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0 }, ease: "power2.out" }];
  screens.forEach((_, i) => m.push({ prim: "reveal", target: `#${S}-ch${i}`, at: w.a + 0.2 + i * 0.1, dur: 0.4, from: { opacity: 0, x: 16 } }));
  if (!lat) m.push({ prim: "reveal", target: `#${S}-panel`, at: w.a + 0.15, dur: 0.5, from: { opacity: 0, x: 40 }, ease: ctx.ease });
  if (lat && slots.title) m.push({ prim: "reveal", target: `#${S}-head`, at: w.a + 0.1, dur: 0.5, from: { opacity: 0, y: -20 }, ease: ctx.ease });
  // the sweep
  const tT = fit(Math.max(ctx.at("trace"), w.a + 0.3), 1);
  const tM = slots.marker ? ctx.at("marker") : null;
  const sweep = Math.max(0.8, Math.min(2.4, (tM != null ? Math.max(tM, tT + 1) : w.b - 0.4) - tT - 0.1, w.b - 0.3 - tT));
  pts.forEach((p, i) => {
    const at = tT + (lat ? i * 0.15 : 0);
    const dur = Math.max(0.6, Math.min(sweep, w.b - 0.2 - at));
    m.push({ prim: "draw", target: `#${S}-t${i}`, at, dur, ease: "none" },
      { prim: "draw", target: `#${S}-g${i}`, at, dur, ease: "none" },
      { prim: "reveal", target: `#${S}-d${i}`, at, dur: 0.15, from: { opacity: 0 } });
    const way = p.filter((_, k) => k % 10 === 0);
    m.push({ prim: "orbit", target: `#${S}-d${i}`, at, dur, points: way });
    m.push({ prim: "reveal", target: `#${S}-d${i}`, at: at + dur + 0.02, dur: 0.3, from: { opacity: 1 }, to: { opacity: 0 } });
  });
  const traceEnd = tT + sweep + (lat ? 0.15 : 0);
  reads.forEach((_, i) => m.push({ prim: "reveal", target: `#${S}-r${i}`, at: fit(ctx.at(`readouts.${i}`), 0.4), dur: 0.4, from: { opacity: 0, y: 14 } }));
  let end = traceEnd;
  if (slots.marker) {
    const at = fit(Math.max(tM, Math.min(traceEnd, w.b - 1.2)), 0.9);
    m.push({ prim: "draw", target: `#${S}-c1`, at, dur: 0.45, ease: "power2.out" },
      { prim: "draw", target: `#${S}-c2`, at: at + 0.1, dur: 0.45, ease: "power2.out" },
      { prim: "draw", target: `#${S}-brk`, at: at + 0.35, dur: 0.4, ease: "power2.out" },
      { prim: "reveal", target: `#${S}-lab`, at: at + 0.45, dur: 0.4, from: { opacity: 0, scale: 0.85 }, ease: "back.out(2)" });
    end = Math.max(end, at + 0.85);
  }
  const d = ctx.drift(`#${S}-grp`, Math.min(end + 0.2, w.b - 0.7), 6);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}
