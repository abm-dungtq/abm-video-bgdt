// funnel — 3–5 stages that narrow; a stage may carry a number (value + suffix) that counts up on its keyword.
// When every stage has a value the widths follow the values, else they narrow in even steps.
// Every stage shell is on stage from the window start; on its keyword a stage lights, its label enters, its number counts.
// pour: a vertical cone of trapezoid bands (left) with dashed streams pouring through it; each band ties to its label
//   on the right by a drawn leader.
// stages: a horizontal funnel of bars left → right, centred on a flowing axis; each bar grows on its keyword and a
//   translucent throat joins it to the bar before.
// drop-off: stacked horizontal bars; as a bar arrives, the part it lost against the stage above breaks off and falls,
//   with the drop in percent when both stages carry numbers.

import { fit as sizeFor, keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => slots.stages.map((_, i) => `stages.${i}`);

const r1 = (x) => Math.round(x * 10) / 10;
const num = (i) => String(i + 1).padStart(2, "0");

/** relative width of each stage in (lo, 1]: by value when every stage has one (a funnel only narrows), else even steps */
function widths(stages, lo) {
  const v = stages.map((s) => s.value);
  if (v.every((x) => Number.isInteger(x)) && v[0] > 0) {
    let prev = 1;
    return v.map((x) => (prev = Math.max(lo, Math.min(prev, x / v[0]))));
  }
  const n = stages.length;
  return stages.map((_, i) => 1 - ((1 - lo * 1.6) * i) / (n - 1));
}
const hasValues = (stages) => stages.every((s) => Number.isInteger(s.value));

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const stages = slots.stages;
  const n = stages.length;
  const t = stages.map((_, i) => ctx.at(`stages.${i}`));
  const last = Math.max(...t);
  const R = theme.radius ?? 18;
  const mono = `"${theme.mono}", monospace`;
  const clamp = (at, dur) => Math.max(w.a, Math.min(at, w.b - dur - 0.05));
  const enter = (i) => Math.min(t[i], w.a + 0.05 + i * 0.07);
  const m = [];
  const valueHtml = (s, i, cls) => (Number.isInteger(s.value)
    ? `<div class="${S}-${cls}" id="${S}-q${i + 1}"><span id="${S}-v${i + 1}">0</span>${s.suffix ? `<span class="${S}-suf">${esc(s.suffix)}</span>` : ""}</div>` : "");
  const count = (i, at) => {
    if (!Number.isInteger(stages[i].value)) return;
    const d = Math.max(0.3, Math.min(0.9, w.b - at - 0.1));
    m.push({ prim: "count", target: `#${S}-v${i + 1}`, at: clamp(at, d), dur: d, to: stages[i].value });
  };
  // a dashed stroke whose dashes travel along its path for the whole shot (strokeDashoffset, one tween)
  const flow = (target, period, speed = 70) => {
    const dur = w.b - 0.08 - (w.a + 0.05);
    if (dur < 0.6) return;
    m.push({ prim: "reveal", target, at: w.a + 0.05, dur, from: { strokeDashoffset: 0 },
      to: { strokeDashoffset: -Math.max(1, Math.round((speed * dur) / period)) * period }, ease: "none" });
  };
  const baseCss = `
#${S}-grp { position: absolute; inset: 0; }
#${S}-svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-suf { font-size: 0.55em; margin-left: 6px; color: color-mix(in srgb, var(--gold) 75%, transparent); }
.${S}-num { font-family: ${mono}; font-weight: 700; color: var(--cyan); }`;

  let css, html;

  // ── stages: horizontal funnel of bars ───────────────────────────────────────
  if (ctx.variant === "stages") {
    const W = widths(stages, 0.2);
    const x0 = 80, span = 1600, colW = span / n, bw = Math.min(170, colW * 0.46), cy = 390, H = 420;
    const cx = stages.map((_, i) => r1(x0 + colW * (i + 0.5)));
    const h = W.map((f) => r1(H * f));
    const vfs = Math.min(...stages.map((s) => sizeFor(`${s.value ?? ""}${s.suffix ?? ""}`, [[4, 64], [6, 54], [9, 44]])));
    const lfs = sizeFor(stages.reduce((a, s) => (s.label.length > a.length ? s.label : a), ""), n >= 5 ? [[10, 36], [16, 32], [22, 28]] : [[12, 40], [18, 36], [22, 34]]);
    const throat = (i) => {
      const a = cx[i - 1] + bw / 2, b = cx[i] - bw / 2;
      return `${r1(a)},${r1(cy - h[i - 1] / 2)} ${r1(b)},${r1(cy - h[i] / 2)} ${r1(b)},${r1(cy + h[i] / 2)} ${r1(a)},${r1(cy + h[i - 1] / 2)}`;
    };
    css = `${baseCss}
#${S}-axis { fill: none; stroke: var(--cyan); stroke-width: 6; stroke-linecap: round; stroke-dasharray: 2 28; opacity: 0.55; }
.${S}-thr { fill: color-mix(in srgb, var(--cyan) 16%, transparent); stroke: color-mix(in srgb, var(--cyan) 45%, transparent); stroke-width: 2; }
.${S}-trk { position: absolute; top: ${cy - H / 2}px; width: ${r1(bw)}px; height: ${H}px; box-sizing: border-box; border-radius: ${R}px;
  border: 2px dashed color-mix(in srgb, var(--ink) 20%, transparent); }
.${S}-bar { position: absolute; width: ${r1(bw)}px; border-radius: ${R}px; transform-origin: 50% 50%;
  background: linear-gradient(180deg, var(--gold), color-mix(in srgb, var(--gold) 55%, var(--surface)));
  box-shadow: 0 0 36px color-mix(in srgb, var(--gold) 28%, transparent); }
.${S}-col { position: absolute; width: ${r1(colW - 24)}px; text-align: center; }
.${S}-num { font-size: 26px; margin-bottom: 14px; }
.${S}-val { font-size: ${vfs}px; font-weight: 800; line-height: 1.2; color: var(--gold); font-variant-numeric: tabular-nums; white-space: nowrap; }
.${S}-lab { font-size: ${lfs}px; font-weight: 800; line-height: 1.15; color: var(--ink); }
${cx.map((x, i) => `#${S}-t${i + 1} { left: ${r1(x - bw / 2)}px; }
#${S}-b${i + 1} { left: ${r1(x - bw / 2)}px; top: ${r1(cy - h[i] / 2)}px; height: ${h[i]}px; }
#${S}-h${i + 1} { left: ${r1(x - (colW - 24) / 2)}px; top: 24px; }
#${S}-l${i + 1} { left: ${r1(x - (colW - 24) / 2)}px; top: ${cy + H / 2 + 26}px; }`).join("\n")}`;
    html = `<div id="${S}-grp">
  <svg id="${S}-svg" viewBox="0 0 1760 820">
    <path id="${S}-axis" d="M${x0 - 40} ${cy} L${x0 + span + 40} ${cy}"/>
${cx.slice(1).map((_, k) => `    <polygon class="${S}-thr" id="${S}-j${k + 2}" points="${throat(k + 1)}"/>`).join("\n")}
  </svg>
${stages.map((s, i) => `  <div class="${S}-trk" id="${S}-t${i + 1}"></div>
  <div class="${S}-bar" id="${S}-b${i + 1}"></div>
  <div class="${S}-col" id="${S}-h${i + 1}"><div class="${S}-num">${num(i)}</div>${valueHtml(s, i, "val")}</div>
  <div class="${S}-col ${S}-lab" id="${S}-l${i + 1}">${esc(s.label)}</div>`).join("\n")}
</div>`;
    m.push({ prim: "reveal", target: `#${S}-axis`, at: w.a, dur: 0.5, from: { opacity: 0 }, to: { opacity: 0.55 } });
    flow(`#${S}-axis`, 30);
    stages.forEach((_, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-t${k}`, at: enter(i), dur: 0.45, from: { opacity: 0, y: 30 }, ease: ctx.ease });
      m.push({ prim: "reveal", target: `#${S}-h${k}`, at: enter(i) + 0.05, dur: 0.4, from: { opacity: 0 } });
      m.push({ prim: "reveal", target: `#${S}-b${k}`, at: clamp(t[i], 0.55), dur: 0.55, from: { scaleY: 0, opacity: 0 }, ease: "power3.out" });
      if (Number.isInteger(stages[i].value)) m.push({ prim: "reveal", target: `#${S}-q${k}`, at: clamp(t[i] + 0.1, 0.4), dur: 0.4, from: { opacity: 0, y: 16 } });
      if (i) m.push({ prim: "reveal", target: `#${S}-j${k}`, at: clamp(t[i] + 0.1, 0.5), dur: 0.5, from: { opacity: 0 } });
      m.push({ prim: "reveal", target: `#${S}-l${k}`, at: clamp(t[i] + 0.15, 0.45), dur: 0.45, from: ctx.motionFrom(), ease: ctx.ease });
      count(i, t[i] + 0.1);
    });
  } else if (ctx.variant === "drop-off") {
    // ── drop-off: stacked bars; the lost part breaks off and falls ───────────
    const W = widths(stages, 0.18);
    const X = 80, BW = 1080, area = 780, rowH = Math.min(190, area / n), y0 = 20 + (area - rowH * n) / 2;
    const bh = Math.max(44, Math.min(70, rowH - 76));
    const vals = hasValues(stages);
    const pct = (i) => Math.max(0, Math.round((1 - stages[i].value / Math.max(1, stages[i - 1].value)) * 100));
    const lfs = sizeFor(stages.reduce((a, s) => (s.label.length > a.length ? s.label : a), ""), [[14, 40], [22, 36]]);
    const ys = stages.map((_, i) => r1(y0 + i * rowH));
    const bx = (i) => r1(X + BW * W[i]);
    // the part a bar lost against the bar above (when wide enough to see), and the drop arrow (with a percent when known)
    const chunk = (i) => i > 0 && bx(i - 1) - bx(i) > 12;
    const badge = (i) => i > 0 && (chunk(i) || vals);
    css = `${baseCss}
.${S}-row { position: absolute; left: ${X}px; width: 1600px; height: ${r1(rowH)}px; }
.${S}-lab { position: absolute; left: 0; top: 0; height: 52px; display: flex; align-items: center; gap: 18px; white-space: nowrap;
  font-size: ${lfs}px; font-weight: 800; color: var(--ink); }
.${S}-num { font-size: 26px; }
.${S}-trk { position: absolute; left: 0; top: 60px; width: ${BW}px; height: ${bh}px; box-sizing: border-box; border-radius: ${Math.min(R, bh / 2)}px;
  border: 2px dashed color-mix(in srgb, var(--ink) 18%, transparent); }
.${S}-bar { position: absolute; left: 0; top: 60px; height: ${bh}px; border-radius: ${Math.min(R, bh / 2)}px; transform-origin: 0 50%;
  background: linear-gradient(90deg, color-mix(in srgb, var(--gold) 70%, var(--surface)), var(--gold)); }
.${S}-lost { position: absolute; top: 60px; height: ${bh}px; border-radius: ${Math.min(R, bh / 2)}px;
  background: repeating-linear-gradient(135deg, color-mix(in srgb, var(--warn) 55%, transparent) 0 14px, color-mix(in srgb, var(--warn) 30%, transparent) 14px 28px); }
.${S}-val { position: absolute; left: 0; top: 0; width: ${BW}px; height: 52px; display: flex; align-items: center; justify-content: flex-end;
  font-size: 44px; font-weight: 800; color: var(--gold); font-variant-numeric: tabular-nums; white-space: nowrap; }
.${S}-drop { position: absolute; left: ${BW + 90}px; top: 44px; height: ${bh + 32}px; display: flex; align-items: center; gap: 16px; }
.${S}-drop svg { width: 44px; height: 56px; overflow: visible; }
.${S}-drop path { fill: none; stroke: var(--warn); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
.${S}-pct { font-size: 52px; font-weight: 800; color: var(--warn); font-variant-numeric: tabular-nums; white-space: nowrap; }
${ys.map((y, i) => `#${S}-r${i + 1} { top: ${y}px; }
#${S}-b${i + 1} { width: ${bx(i) - X}px; }
${i ? `
#${S}-x${i + 1} { left: ${bx(i) - X + 6}px; width: ${Math.max(0, r1(bx(i - 1) - bx(i) - 6))}px; }` : ""}`).join("\n")}`;
    html = `<div id="${S}-grp">
${stages.map((s, i) => `  <div class="${S}-row" id="${S}-r${i + 1}">
    <div class="${S}-lab" id="${S}-l${i + 1}"><span class="${S}-num">${num(i)}</span><span id="${S}-lt${i + 1}">${esc(s.label)}</span></div>
    <div class="${S}-trk"></div>
    <div class="${S}-bar" id="${S}-b${i + 1}"></div>
${chunk(i) ? `    <div class="${S}-lost" id="${S}-x${i + 1}"></div>
` : ""}${badge(i) ? `    <div class="${S}-drop" id="${S}-d${i + 1}"><svg viewBox="0 0 44 56"><path d="M22 4 L22 48 M8 34 L22 50 L36 34"/></svg>${vals ? `<span class="${S}-pct">-${pct(i)}%</span>` : ""}</div>\n` : ""}${Number.isInteger(s.value) ? `    <div class="${S}-val" id="${S}-q${i + 1}"><span id="${S}-v${i + 1}">0</span>${s.suffix ? `<span class="${S}-suf">${esc(s.suffix)}</span>` : ""}</div>\n` : ""}  </div>`).join("\n")}
</div>`;
    stages.forEach((s, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-r${k}`, at: enter(i), dur: 0.45, from: { opacity: 0, x: -40 }, ease: ctx.ease });
      m.push({ prim: "reveal", target: `#${S}-b${k}`, at: clamp(t[i], 0.55), dur: 0.55, from: { scaleX: 0 }, ease: "power3.out" });
      m.push({ prim: "reveal", target: `#${S}-lt${k}`, at: clamp(t[i], 0.45), dur: 0.45, from: { opacity: 0, x: -20 }, ease: ctx.ease });
      if (Number.isInteger(s.value)) {
        m.push({ prim: "reveal", target: `#${S}-q${k}`, at: clamp(t[i] + 0.2, 0.3), dur: 0.3, from: { opacity: 0 } });
        count(i, t[i] + 0.2);
      }
      if (chunk(i)) {
        const tIn = clamp(t[i] + 0.4, 0.2), tDrop = clamp(t[i] + 0.8, 0.6);
        m.push({ prim: "reveal", target: `#${S}-x${k}`, at: tIn, dur: 0.2, from: { opacity: 0 } });
        if (tDrop > tIn + 0.24) {
          m.push({ prim: "reveal", target: `#${S}-x${k}`, at: tDrop, dur: 0.6, from: { opacity: 1, y: 0, rotation: 0 }, to: { opacity: 0, y: 70, rotation: 4 }, ease: "power2.in" });
        }
      }
      if (badge(i)) m.push({ prim: "reveal", target: `#${S}-d${k}`, at: clamp(t[i] + 0.8, 0.45), dur: 0.45, from: { opacity: 0, y: -24 }, ease: "power2.out" });
    });
  } else {
    // ── pour (signature): a cone of bands, dashed streams pouring through ────
    const cx = 440, y0 = 24, y1 = 704, g = 12, topW = 820, botW = 200;
    const H = (y1 - y0 - (n - 1) * g) / n;
    const hw = (y) => (topW - ((topW - botW) * (y - y0)) / (y1 - y0)) / 2;
    const bands = stages.map((_, i) => { const a = y0 + i * (H + g); return { a: r1(a), b: r1(a + H), mid: r1(a + H / 2) }; });
    const poly = ({ a, b }) => `${r1(cx - hw(a))},${a} ${r1(cx + hw(a))},${a} ${r1(cx + hw(b))},${b} ${r1(cx - hw(b))},${b}`;
    const LX = 1010;
    const lfs = sizeFor(stages.reduce((a, s) => (s.label.length > a.length ? s.label : a), ""), [[14, 46], [18, 40], [22, 36]]);
    const vfs = n >= 5 ? 50 : 60;
    const streams = [-250, -90, 90, 250].map((d) => `M${cx + d} 0 C${cx + d} 260 ${r1(cx + d * 0.18)} 520 ${r1(cx + d * 0.1)} 800`);
    css = `${baseCss}
.${S}-band { fill: color-mix(in srgb, var(--ink) 5%, transparent); stroke: color-mix(in srgb, var(--ink) 22%, transparent); stroke-width: 2; }
.${S}-lit { fill: color-mix(in srgb, var(--gold) 26%, transparent); stroke: var(--gold); stroke-width: 4; }
.${S}-str { fill: none; stroke: var(--cyan); stroke-width: 5; stroke-linecap: round; stroke-dasharray: 2 22; }
#${S}-spout { fill: color-mix(in srgb, var(--cyan) 12%, transparent); stroke: color-mix(in srgb, var(--cyan) 50%, transparent); stroke-width: 2; }
.${S}-lead { fill: none; stroke: color-mix(in srgb, var(--gold) 70%, transparent); stroke-width: 2; stroke-dasharray: 1000; }
.${S}-bn { position: absolute; width: 120px; height: 40px; text-align: center; font-size: 28px; line-height: 40px; }
.${S}-lb { position: absolute; left: ${LX}px; width: 740px; height: ${r1(H)}px; display: flex; flex-direction: column; justify-content: center; gap: 8px; }
.${S}-val { font-size: ${vfs}px; font-weight: 800; line-height: 1.15; color: var(--gold); font-variant-numeric: tabular-nums; white-space: nowrap; }
.${S}-lab { font-size: ${lfs}px; font-weight: 800; line-height: 1.15; color: var(--ink); white-space: nowrap; }
${bands.map((b, i) => `#${S}-n${i + 1} { left: ${cx - 60}px; top: ${r1(b.mid - 20)}px; }
#${S}-l${i + 1} { top: ${b.a}px; }`).join("\n")}`;
    html = `<div id="${S}-grp">
  <svg id="${S}-svg" viewBox="0 0 1760 820">
${bands.map((b, i) => `    <polygon class="${S}-band" id="${S}-p${i + 1}" points="${poly(b)}"/>
    <polygon class="${S}-lit" id="${S}-k${i + 1}" points="${poly(b)}"/>`).join("\n")}
    <polygon id="${S}-spout" points="${cx - botW / 2 + 30},${y1 + 10} ${cx + botW / 2 - 30},${y1 + 10} ${cx + 34},796 ${cx - 34},796"/>
${streams.map((d, i) => `    <path class="${S}-str" id="${S}-s${i + 1}" d="${d}"/>`).join("\n")}
${bands.map((b, i) => `    <path class="${S}-lead" id="${S}-e${i + 1}" pathLength="1000" d="M${r1(cx + hw(b.mid) + 18)} ${b.mid} L${LX - 24} ${b.mid}"/>`).join("\n")}
  </svg>
${stages.map((s, i) => `  <div class="${S}-num ${S}-bn" id="${S}-n${i + 1}">${num(i)}</div>
  <div class="${S}-lb" id="${S}-l${i + 1}">${valueHtml(s, i, "val")}<div class="${S}-lab">${esc(s.label)}</div></div>`).join("\n")}
</div>`;
    m.push({ prim: "reveal", target: `#${S}-spout`, at: w.a + 0.1, dur: 0.5, from: { opacity: 0 } });
    streams.forEach((_, i) => {
      m.push({ prim: "reveal", target: `#${S}-s${i + 1}`, at: w.a + 0.05 + i * 0.06, dur: 0.6, from: { opacity: 0 }, to: { opacity: 0.5 } });
      flow(`#${S}-s${i + 1}`, 24, 90 + i * 12);
    });
    stages.forEach((_, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-p${k}`, at: enter(i), dur: 0.45, from: { opacity: 0 } });
      m.push({ prim: "reveal", target: `#${S}-n${k}`, at: enter(i) + 0.05, dur: 0.4, from: { opacity: 0 } });
      m.push({ prim: "reveal", target: `#${S}-k${k}`, at: clamp(t[i], 0.5), dur: 0.5, from: { opacity: 0 }, ease: "power2.out" });
      m.push({ prim: "draw", target: `#${S}-e${k}`, at: clamp(t[i] + 0.1, 0.4), dur: 0.4 });
      m.push({ prim: "reveal", target: `#${S}-l${k}`, at: clamp(t[i] + 0.2, 0.45), dur: 0.45, from: { opacity: 0, x: -30 }, ease: ctx.ease });
      count(i, t[i] + 0.2);
    });
  }
  const d = ctx.drift(`#${S}-grp`, clamp(last + 1.0, 0.7), 12);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}
