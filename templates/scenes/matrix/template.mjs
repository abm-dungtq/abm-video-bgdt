// matrix — a 2 × 2 matrix of 4 items on two axes (y up, x right); items in reading order: top-left, top-right,
// bottom-left, bottom-right. Every cell shell (number, faint icon) is on stage from the window start; on its keyword a
// cell lights. The axes (arrows and their labels) light on "axes".
// quadrant: four large panels in a grid across the stage, gold axis arrows on the left and bottom, a gold node at the
//   crossing that pulses once all four are lit.
// heat: a legend column on the left (the two axes as headings, a cold → hot scale) and four square tiles on the right
//   that fill from the bottom like a heat map, the high-high tile hottest.
// plot: a drawn chart on the left with numbered dots, one per quadrant (a ripple on its keyword), and a legend list on
//   the right; a dashed target ring turns around the high-high quadrant.

import { fit, keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => [...(slots.x || slots.y ? ["axes"] : []), ...slots.items.map((_, i) => `items.${i}`)];

const num = (i) => String(i + 1).padStart(2, "0");
const HEAT = [0.28, 0.45, 0.1, 0.28]; // TL, TR, BL, BR: share of gold in a tile at full heat

export function render(ctx) {
  const { S, slots, esc, window: w, theme } = ctx;
  const items = slots.items;
  const hasAxes = Boolean(slots.x || slots.y);
  const tA = hasAxes ? ctx.at("axes") : null;
  const t = items.map((_, i) => ctx.at(`items.${i}`));
  const last = Math.max(tA ?? 0, ...t);
  const mono = `"${theme.mono}", monospace`;
  const R = theme.radius ?? 18;
  const clamp = (at, dur) => Math.max(w.a, Math.min(at, w.b - dur - 0.05));
  const m = [];
  const icon = (it) => ctx.icon(it.icon ?? "spark");
  let css, html;

  if (ctx.variant === "heat") {
    const T = 372, G = 16, X0 = 900, Y0 = 16;
    const pos = items.map((_, i) => [X0 + (i % 2) * (T + G), Y0 + Math.floor(i / 2) * (T + G)]);
    const fs = () => Math.min(...items.map((it) => fit(it.label, [[10, 44], [14, 38], [18, 32]])));
    css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-leg { position: absolute; left: 40px; top: 60px; width: 640px; }
.${S}-lk { font-family: ${mono}; font-size: 24px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--cyan); }
.${S}-lv { margin: 10px 0 44px; font-size: 52px; font-weight: 800; line-height: 1.1; color: var(--ink); display: flex; align-items: center; gap: 18px; }
.${S}-la { width: 44px; height: 44px; flex: none; color: var(--gold); }
#${S}-scale { position: absolute; left: 40px; top: 470px; width: 620px; }
#${S}-bar { height: 26px; border-radius: 13px; transform-origin: 0 50%;
  background: linear-gradient(90deg, color-mix(in srgb, var(--cyan) 35%, var(--surface)), color-mix(in srgb, var(--gold) 80%, var(--surface))); }
#${S}-sl { margin-top: 14px; display: flex; justify-content: space-between; font-family: ${mono}; font-size: 24px; color: var(--muted); }
#${S}-ax { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-ax path { fill: none; stroke: color-mix(in srgb, var(--gold) 70%, transparent); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-tile { position: absolute; width: ${T}px; height: ${T}px; box-sizing: border-box; overflow: hidden; border-radius: 6px;
  background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); }
.${S}-fill { position: absolute; inset: 0; transform-origin: 50% 100%; }
.${S}-tn { position: absolute; left: 22px; top: 18px; font-family: ${mono}; font-size: 26px; font-weight: 700; color: var(--cyan); }
.${S}-ti { position: absolute; right: 22px; top: 22px; width: 56px; height: 56px; color: var(--ink); opacity: 0.25; }
.${S}-ti svg, .${S}-la svg { width: 100%; height: 100%; display: block; }
.${S}-tl { position: absolute; left: 22px; right: 22px; bottom: 26px; font-weight: 800; line-height: 1.12; color: var(--ink); }
#${S}-hot { position: absolute; left: ${pos[1][0] - 10}px; top: ${pos[1][1] - 10}px; width: ${T + 20}px; height: ${T + 20}px; box-sizing: border-box;
  border-radius: 12px; border: 3px solid var(--gold); box-shadow: 0 0 28px color-mix(in srgb, var(--gold) 45%, transparent); }
${pos.map(([x, y], i) => `#${S}-c${i + 1} { left: ${x}px; top: ${y}px; }
#${S}-f${i + 1} { background: color-mix(in srgb, var(--gold) ${Math.round(HEAT[i] * 100)}%, var(--surface)); }
#${S}-l${i + 1} { font-size: ${fs()}px; }`).join("\n")}`;
    const yTop = Y0, yBot = Y0 + 2 * T + G, xL = X0, xR = X0 + 2 * T + G;
    html = `<div id="${S}-root">
  <div id="${S}-grp">
    <svg id="${S}-ax" viewBox="0 0 1760 820">
      <path id="${S}-ay" pathLength="1000" d="M${xL - 34} ${yBot} L${xL - 34} ${yTop + 6} M${xL - 46} ${yTop + 22} L${xL - 34} ${yTop + 6} L${xL - 22} ${yTop + 22}"/>
      <path id="${S}-axx" pathLength="1000" d="M${xL} ${yBot + 34} L${xR - 6} ${yBot + 34} M${xR - 22} ${yBot + 22} L${xR - 6} ${yBot + 34} L${xR - 22} ${yBot + 46}"/>
    </svg>
    <div id="${S}-leg">
      ${slots.y ? `<div class="${S}-lk">Trục dọc</div><div class="${S}-lv" id="${S}-ly"><span class="${S}-la">${ctx.icon("arrow")}</span>${esc(slots.y)}</div>` : ""}
      ${slots.x ? `<div class="${S}-lk">Trục ngang</div><div class="${S}-lv" id="${S}-lx"><span class="${S}-la">${ctx.icon("arrow")}</span>${esc(slots.x)}</div>` : ""}
    </div>
    <div id="${S}-scale"><div id="${S}-bar"></div><div id="${S}-sl"><span>thấp</span><span>cao</span></div></div>
    <div id="${S}-hot"></div>
${items.map((it, i) => `    <div class="${S}-tile" id="${S}-c${i + 1}"><div class="${S}-fill" id="${S}-f${i + 1}"></div>
      <div class="${S}-tn">${num(i)}</div><div class="${S}-ti" id="${S}-i${i + 1}">${icon(it)}</div>
      <div class="${S}-tl" id="${S}-l${i + 1}">${esc(it.label)}</div></div>`).join("\n")}
  </div>
</div>`;
    m.push({ prim: "reveal", target: `#${S}-scale`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0, y: 20 } });
    m.push({ prim: "reveal", target: `#${S}-bar`, at: w.a + 0.15, dur: 0.8, from: { scaleX: 0 }, ease: "power2.out" });
    m.push({ prim: "draw", target: `#${S}-ay`, at: w.a + 0.05, dur: 0.7 });
    m.push({ prim: "draw", target: `#${S}-axx`, at: w.a + 0.15, dur: 0.7 });
    if (hasAxes) {
      m.push({ prim: "reveal", target: `#${S}-leg`, at: clamp(tA, 0.5), dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease });
    }
    items.forEach((it, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-c${k}`, at: w.a + 0.05 + i * 0.07, dur: 0.45, from: { opacity: 0, scale: 0.9 }, ease: ctx.ease });
      m.push({ prim: "reveal", target: `#${S}-f${k}`, at: clamp(t[i], 0.7), dur: 0.7, from: { scaleY: 0 }, ease: "power2.out" });
      m.push({ prim: "reveal", target: `#${S}-i${k}`, at: clamp(t[i] + 0.2, 0.4), dur: 0.4, from: { opacity: 0.25, scale: 0.8 }, to: { opacity: 0.9, scale: 1 }, ease: "back.out(2)" });
      m.push({ prim: "reveal", target: `#${S}-l${k}`, at: clamp(t[i] + 0.2, 0.45), dur: 0.45, from: { opacity: 0, y: 18 }, ease: ctx.ease });
    });
    m.push({ prim: "reveal", target: `#${S}-hot`, at: clamp(t[1] + 0.4, 0.5), dur: 0.5, from: { opacity: 0, scale: 1.08 }, ease: "power2.out" });
  } else if (ctx.variant === "plot") {
    const P = { x0: 120, x1: 980, y0: 30, y1: 740 };
    const mx = (P.x0 + P.x1) / 2, my = (P.y0 + P.y1) / 2;
    const qw = (P.x1 - P.x0) / 2, qh = (P.y1 - P.y0) / 2;
    const dots = items.map((_, i) => {
      const jx = (ctx.rng() - 0.5) * 0.3, jy = (ctx.rng() - 0.5) * 0.3;
      return [Math.round(P.x0 + qw * ((i % 2) + 0.5 + jx)), Math.round(P.y0 + qh * (Math.floor(i / 2) + 0.5 + jy))];
    });
    const D = 72, rowH = 150;
    const fs = () => Math.min(...items.map((it) => fit(it.label, [[12, 44], [16, 38], [18, 34]])));
    const grid = [1, 2, 3, 5, 6, 7].map((k) => `M${P.x0 + (k * 2 * qw) / 8} ${P.y0} L${P.x0 + (k * 2 * qw) / 8} ${P.y1} M${P.x0} ${P.y0 + (k * 2 * qh) / 8} L${P.x1} ${P.y0 + (k * 2 * qh) / 8}`).join(" ");
    css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-ch { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-grid { fill: none; stroke: color-mix(in srgb, var(--ink) 6%, transparent); stroke-width: 2; }
#${S}-mid { fill: none; stroke: color-mix(in srgb, var(--cyan) 40%, transparent); stroke-width: 3; stroke-dasharray: 10 12; }
#${S}-axs { fill: none; stroke: var(--gold); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
#${S}-tgt { position: absolute; left: ${mx + qw / 2 - 170}px; top: ${my - qh / 2 - 170}px; width: 340px; height: 340px; box-sizing: border-box;
  border-radius: 50%; border: 3px dashed color-mix(in srgb, var(--gold) 40%, transparent); }
.${S}-axl { position: absolute; font-family: ${mono}; font-size: 26px; font-weight: 700; letter-spacing: 0.08em; color: var(--gold); white-space: nowrap; }
#${S}-yl { left: ${P.x0 + 24}px; top: ${P.y0 - 6}px; }
#${S}-xl { left: ${P.x1 - 520}px; top: ${P.y1 + 18}px; width: 500px; text-align: right; }
.${S}-dw { position: absolute; width: 0; height: 0; }
.${S}-dot { position: absolute; left: ${-D / 2}px; top: ${-D / 2}px; width: ${D}px; height: ${D}px; box-sizing: border-box; border-radius: 50%;
  background: var(--surface); border: 3px solid color-mix(in srgb, var(--ink) 25%, transparent); display: flex; align-items: center; justify-content: center;
  font-family: ${mono}; font-size: 26px; font-weight: 700; color: var(--cyan); }
.${S}-lit { position: absolute; inset: -3px; border-radius: 50%; background: var(--gold); display: flex; align-items: center; justify-content: center;
  font-family: ${mono}; font-size: 26px; font-weight: 700; color: var(--canvas); }
.${S}-rip { position: absolute; left: ${-D / 2}px; top: ${-D / 2}px; width: ${D}px; height: ${D}px; box-sizing: border-box; border-radius: 50%; border: 3px solid var(--gold); opacity: 0; }
#${S}-list { position: absolute; left: 1080px; top: ${410 - (items.length * rowH) / 2}px; width: 660px; }
.${S}-row { position: relative; height: ${rowH - 18}px; margin-bottom: 18px; box-sizing: border-box; border-radius: ${Math.min(R, 16)}px;
  background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); display: flex; align-items: center; gap: 22px; padding: 0 26px; }
.${S}-rb { position: absolute; left: -2px; top: -2px; bottom: -2px; width: 8px; border-radius: 4px; background: var(--gold); transform-origin: 50% 0; }
.${S}-rn { font-family: ${mono}; font-size: 30px; font-weight: 700; color: var(--cyan); flex: none; }
.${S}-ri { width: 52px; height: 52px; color: var(--gold); flex: none; }
.${S}-ri svg { width: 52px; height: 52px; display: block; }
.${S}-rl { font-weight: 800; line-height: 1.1; color: var(--ink); }
${dots.map(([x, y], i) => `#${S}-d${i + 1} { left: ${x}px; top: ${y}px; }
#${S}-rl${i + 1} { font-size: ${fs()}px; }`).join("\n")}`;
    html = `<div id="${S}-root">
  <div id="${S}-grp">
    <svg id="${S}-ch" viewBox="0 0 1760 820">
      <path id="${S}-grid" d="${grid}"/>
      <path id="${S}-mid" d="M${mx} ${P.y0} L${mx} ${P.y1} M${P.x0} ${my} L${P.x1} ${my}"/>
      <path id="${S}-axs" pathLength="1000" d="M${P.x0} ${P.y0 + 10} L${P.x0} ${P.y1} L${P.x1 - 10} ${P.y1} M${P.x1 - 28} ${P.y1 - 14} L${P.x1 - 10} ${P.y1} L${P.x1 - 28} ${P.y1 + 14} M${P.x0 - 14} ${P.y0 + 28} L${P.x0} ${P.y0 + 10} L${P.x0 + 14} ${P.y0 + 28}"/>
    </svg>
    <div id="${S}-tgt"></div>
    ${slots.y ? `<div class="${S}-axl" id="${S}-yl">${esc(slots.y)}</div>` : ""}
    ${slots.x ? `<div class="${S}-axl" id="${S}-xl">${esc(slots.x)}</div>` : ""}
${items.map((_, i) => `    <div class="${S}-dw" id="${S}-d${i + 1}"><div class="${S}-rip" id="${S}-p${i + 1}"></div><div class="${S}-dot" id="${S}-o${i + 1}">${num(i)}<div class="${S}-lit" id="${S}-k${i + 1}">${num(i)}</div></div></div>`).join("\n")}
    <div id="${S}-list">
${items.map((it, i) => `      <div class="${S}-row" id="${S}-r${i + 1}"><div class="${S}-rb" id="${S}-rb${i + 1}"></div><span class="${S}-rn">${num(i)}</span>
        <span class="${S}-ri" id="${S}-ri${i + 1}">${icon(it)}</span><span class="${S}-rl" id="${S}-rl${i + 1}">${esc(it.label)}</span></div>`).join("\n")}
    </div>
  </div>
</div>`;
    m.push({ prim: "reveal", target: `#${S}-grid`, at: w.a + 0.05, dur: 0.6, from: { opacity: 0 } });
    m.push({ prim: "draw", target: `#${S}-axs`, at: w.a + 0.05, dur: 0.9 });
    m.push({ prim: "reveal", target: `#${S}-mid`, at: w.a + 0.3, dur: 0.6, from: { opacity: 0 } });
    m.push({ prim: "reveal", target: `#${S}-tgt`, at: w.a + 0.4, dur: 0.6, from: { opacity: 0, scale: 0.7 }, ease: ctx.ease });
    if (w.b - (w.a + 1.1) > 0.8) m.push({ prim: "slide", target: `#${S}-tgt`, at: w.a + 1.1, dur: w.b - w.a - 1.15, from: { rotation: 0 }, to: { rotation: 90 }, ease: "none" });
    if (hasAxes) {
      for (const id of [slots.y && "yl", slots.x && "xl"].filter(Boolean)) m.push({ prim: "reveal", target: `#${S}-${id}`, at: clamp(tA, 0.45), dur: 0.45, from: { opacity: 0, y: 12 } });
    }
    items.forEach((it, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-o${k}`, at: w.a + 0.2 + i * 0.08, dur: 0.4, from: { opacity: 0, scale: 0.5 }, ease: "back.out(2)" });
      m.push({ prim: "reveal", target: `#${S}-r${k}`, at: w.a + 0.1 + i * 0.07, dur: 0.45, from: { opacity: 0, x: 40 }, ease: ctx.ease });
      m.push({ prim: "reveal", target: `#${S}-k${k}`, at: clamp(t[i], 0.35), dur: 0.35, from: { opacity: 0, scale: 0.4 }, ease: "back.out(2)" });
      m.push({ prim: "reveal", target: `#${S}-p${k}`, at: clamp(t[i], 0.8), dur: 0.8, from: { opacity: 0.9, scale: 0.8 }, to: { opacity: 0, scale: 2.6 }, ease: "power2.out" });
      m.push({ prim: "reveal", target: `#${S}-rb${k}`, at: clamp(t[i] + 0.15, 0.4), dur: 0.4, from: { scaleY: 0 }, ease: "power2.out" });
      m.push({ prim: "reveal", target: `#${S}-ri${k}`, at: clamp(t[i] + 0.15, 0.4), dur: 0.4, from: { opacity: 0.25, scale: 0.8 }, ease: "back.out(2)" });
      m.push({ prim: "reveal", target: `#${S}-rl${k}`, at: clamp(t[i] + 0.15, 0.45), dur: 0.45, from: { opacity: 0, x: -20 }, ease: ctx.ease });
    });
  } else {
    // quadrant (signature)
    const X0 = 250, X1 = 1600, Y0 = 10, Y1 = 700, G = 24;
    const cw = (X1 - X0 - G) / 2, ch = (Y1 - Y0 - G) / 2;
    const pos = items.map((_, i) => [X0 + (i % 2) * (cw + G), Y0 + Math.floor(i / 2) * (ch + G)]);
    const cx = X0 + cw + G / 2, cy = Y0 + ch + G / 2;
    const fs = () => Math.min(...items.map((it) => fit(it.label, [[10, 56], [14, 48], [18, 42]])));
    css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-ax { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-dots { fill: none; stroke: color-mix(in srgb, var(--ink) 9%, transparent); stroke-width: 5; stroke-linecap: round; }
#${S}-ax .${S}-a { fill: none; stroke: var(--gold); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-cell { position: absolute; width: ${cw}px; height: ${ch}px; box-sizing: border-box; border-radius: ${R}px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); }
.${S}-lit { position: absolute; inset: -2px; border-radius: inherit; border: 3px solid var(--gold);
  box-shadow: 0 0 0 8px color-mix(in srgb, var(--gold) 10%, transparent), inset 0 -120px 120px -80px color-mix(in srgb, var(--gold) 18%, transparent); }
.${S}-cn { position: absolute; left: 30px; top: 24px; font-family: ${mono}; font-size: 30px; font-weight: 700; color: var(--cyan); }
.${S}-ci { position: absolute; right: 34px; top: 30px; width: 84px; height: 84px; color: var(--gold); }
.${S}-ci svg { width: 84px; height: 84px; display: block; }
.${S}-cl { position: absolute; left: 30px; right: 30px; bottom: 34px; font-weight: 800; line-height: 1.1; color: var(--ink); }
.${S}-axl { position: absolute; font-family: ${mono}; font-size: 28px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--gold); white-space: nowrap; }
#${S}-ylw { position: absolute; left: 150px; top: ${Y0}px; width: 0; height: 0; }
#${S}-yl { position: absolute; left: 0; top: 0; transform-origin: 0 0; transform: rotate(90deg); }
#${S}-xl { left: ${X1 - 900}px; top: ${Y1 + 50}px; width: 900px; text-align: right; }
#${S}-node { position: absolute; left: ${cx - 30}px; top: ${cy - 30}px; width: 60px; height: 60px; box-sizing: border-box; border-radius: 50%;
  background: var(--canvas); border: 5px solid var(--gold); box-shadow: 0 0 22px color-mix(in srgb, var(--gold) 55%, transparent); }
${pos.map(([x, y], i) => `#${S}-c${i + 1} { left: ${x}px; top: ${y}px; }
#${S}-l${i + 1} { font-size: ${fs()}px; }`).join("\n")}`;
    const dots = [];
    for (let x = 40; x < 1760; x += 80) for (let y = 30; y < 820; y += 80) dots.push(`M${x} ${y}h0.01`);
    html = `<div id="${S}-root">
  <div id="${S}-grp">
    <svg id="${S}-ax" viewBox="0 0 1760 820">
      <path id="${S}-dots" d="${dots.join("")}"/>
      <path class="${S}-a" id="${S}-ay" pathLength="1000" d="M${X0 - 40} ${Y1} L${X0 - 40} ${Y0 + 4} M${X0 - 56} ${Y0 + 24} L${X0 - 40} ${Y0 + 4} L${X0 - 24} ${Y0 + 24}"/>
      <path class="${S}-a" id="${S}-axx" pathLength="1000" d="M${X0 - 40} ${Y1 + 30} L${X1 - 4} ${Y1 + 30} M${X1 - 24} ${Y1 + 14} L${X1 - 4} ${Y1 + 30} L${X1 - 24} ${Y1 + 46}"/>
    </svg>
${items.map((it, i) => `    <div class="${S}-cell" id="${S}-c${i + 1}"><div class="${S}-lit" id="${S}-k${i + 1}"></div>
      <div class="${S}-cn">${num(i)}</div><div class="${S}-ci" id="${S}-i${i + 1}">${icon(it)}</div>
      <div class="${S}-cl" id="${S}-l${i + 1}">${esc(it.label)}</div></div>`).join("\n")}
    <div id="${S}-node"></div>
    ${slots.y ? `<div id="${S}-ylw"><div class="${S}-axl" id="${S}-yl">${esc(slots.y)}</div></div>` : ""}
    ${slots.x ? `<div class="${S}-axl" id="${S}-xl">${esc(slots.x)}</div>` : ""}
  </div>
</div>`;
    m.push({ prim: "reveal", target: `#${S}-dots`, at: w.a + 0.05, dur: 0.8, from: { opacity: 0 } });
    m.push({ prim: "draw", target: `#${S}-ay`, at: w.a + 0.1, dur: 0.7 });
    m.push({ prim: "draw", target: `#${S}-axx`, at: w.a + 0.2, dur: 0.7 });
    m.push({ prim: "reveal", target: `#${S}-node`, at: w.a + 0.35, dur: 0.5, from: { opacity: 0, scale: 0.3 }, ease: "back.out(2)" });
    if (hasAxes) {
      if (slots.y) m.push({ prim: "reveal", target: `#${S}-ylw`, at: clamp(tA, 0.45), dur: 0.45, from: { opacity: 0, y: -16 } });
      if (slots.x) m.push({ prim: "reveal", target: `#${S}-xl`, at: clamp(tA + 0.1, 0.45), dur: 0.45, from: { opacity: 0, x: 24 } });
    }
    items.forEach((it, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-c${k}`, at: w.a + 0.05 + i * 0.08, dur: 0.5, from: { opacity: 0, scale: 0.94 }, ease: ctx.ease });
      m.push({ prim: "reveal", target: `#${S}-k${k}`, at: clamp(t[i], 0.4), dur: 0.4, from: { opacity: 0 } });
      m.push({ prim: "reveal", target: `#${S}-i${k}`, at: w.a + 0.2 + i * 0.08, dur: 0.4, from: { opacity: 0 }, to: { opacity: 0.22 } });
      m.push({ prim: "reveal", target: `#${S}-i${k}`, at: clamp(Math.max(t[i], w.a + 0.64 + i * 0.08), 0.45), dur: 0.45, from: { opacity: 0.22, scale: 0.8 }, to: { opacity: 1, scale: 1 }, ease: "back.out(2)" });
      m.push({ prim: "reveal", target: `#${S}-l${k}`, at: clamp(t[i] + 0.1, 0.5), dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease });
    });
    const pAt = last + 0.9;
    if (w.b - pAt > 1.3) m.push({ prim: "pulse", target: `#${S}-node`, at: pAt, dur: w.b - pAt - 0.05 });
  }
  const d = ctx.drift(`#${S}-grp`, clamp(last + 0.9, 0.7), 12);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}
