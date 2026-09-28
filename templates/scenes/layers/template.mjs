// layers — 3–5 layers from outer to inner (or top to bottom), each with a label, an optional note and icon, lit on
// its cue; an optional title. The whole structure stands from the window start, so the frame is never bare.
// exploded: isometric plates stacked tight at the left; on its cue each plate lifts out to its place in an exploded
//   view and a leader line draws to its label in the right column; a dashed axis runs through the stack.
// slices: a frontal block cut into horizontal strata (index and icon inside each band) with the labels at the right;
//   each band slides in on its cue while a gold marker at the block edge moves to it, then keeps sweeping the block.
// onion: concentric rings at the left, outermost first; each ring fills in on its cue and a leader line runs from
//   its band to its label in the right column; a spark circles the outer ring.

import { keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => slots.layers.map((_, i) => `layers.${i}`);

const r1 = (x) => Math.round(x * 10) / 10;
const num = (i) => String(i + 1).padStart(2, "0");
const size = (text, steps) => steps.find(([n]) => [...String(text)].length <= n)?.[1] ?? steps.at(-1)[1];
/** layer colour: cyan (outer / top) blending to gold (inner / bottom) */
const tone = (i, n) => `color-mix(in srgb, var(--gold) ${Math.round((100 * i) / Math.max(1, n - 1))}%, var(--cyan))`;

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const mono = `"${theme.mono}", monospace`;
  const R = theme.radius ?? 18;
  const L = slots.layers;
  const n = L.length;
  const t = L.map((_, i) => ctx.at(`layers.${i}`));
  const last = Math.max(...t);
  const clamp = (at, dur) => Math.max(w.a, Math.min(at, w.b - dur - 0.05));
  const m = [];
  const titleCss = (x, y, width) => `
#${S}-ttl { position: absolute; left: ${x}px; top: ${y}px; width: ${width}px; display: flex; align-items: center; gap: 18px; }
#${S}-tb { width: 48px; height: 6px; border-radius: 3px; background: var(--gold); flex: none; }
#${S}-tt { font-family: ${mono}; font-size: 26px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--gold); white-space: nowrap; }`;
  const titleHtml = slots.title ? `<div id="${S}-ttl"><div id="${S}-tb"></div><div id="${S}-tt">${esc(slots.title)}</div></div>` : "";
  if (slots.title) m.push({ prim: "reveal", target: `#${S}-ttl`, at: w.a + 0.1, dur: 0.5, from: { opacity: 0, x: -24 }, ease: ctx.ease });
  // a label row: index, label, optional note
  const rowCss = (lfs) => `
.${S}-row { position: absolute; display: flex; align-items: center; gap: 22px; }
.${S}-ix { font-family: ${mono}; font-size: 28px; font-weight: 700; flex: none; }
.${S}-lb { font-size: ${lfs}px; font-weight: 800; color: var(--ink); white-space: nowrap; line-height: 1.15; }
.${S}-nt { font-size: 28px; font-weight: 600; color: var(--muted); white-space: nowrap; line-height: 1.3; margin-top: 4px; }`;
  const lfs = Math.min(...L.map((x) => size(x.label, [[16, 44], [19, 40], [22, 36]])));
  const rows = (left, ys) => L.map((x, i) => `  <div class="${S}-row" id="${S}-w${i}" style="left: ${left}px; top: ${r1(ys[i] - 50)}px; height: 100px">
    <span class="${S}-ix" id="${S}-x${i}" style="color: ${tone(i, n)}">${num(i)}</span>
    <div id="${S}-r${i}"><div class="${S}-lb">${esc(x.label)}</div>${x.note ? `<div class="${S}-nt">${esc(x.note)}</div>` : ""}</div>
  </div>`).join("\n");
  let css, html;

  if (ctx.variant === "slices") {
    const BX = 90, BW = 780, BY = slots.title ? 110 : 60, BH = 760 - (slots.title ? 110 : 60);
    const g = 10, bh = (BH - g * (n - 1)) / n;
    const cy = L.map((_, i) => r1(BY + i * (bh + g) + bh / 2));
    const COL = 960;
    css = `${titleCss(BX, 36, 1500)}${rowCss(lfs)}
#${S}-grp { position: absolute; inset: 0; }
#${S}-frame { position: absolute; left: ${BX - 12}px; top: ${BY - 12}px; width: ${BW + 24}px; height: ${BH + 24}px; box-sizing: border-box; border-radius: ${R + 6}px;
  border: 2px dashed color-mix(in srgb, var(--ink) 22%, transparent); }
.${S}-band { position: absolute; left: ${BX}px; width: ${BW}px; height: ${r1(bh)}px; box-sizing: border-box; border-radius: 12px; overflow: hidden;
  display: flex; align-items: center; justify-content: space-between; padding: 0 34px; }
.${S}-bf { position: absolute; inset: 0; }
#${S}-gh { position: absolute; inset: 0; }
.${S}-gb { position: absolute; left: ${BX}px; width: ${BW}px; height: ${r1(bh)}px; box-sizing: border-box; border-radius: 12px;
  border: 2px dashed color-mix(in srgb, var(--ink) 18%, transparent); background: color-mix(in srgb, var(--surface) 55%, transparent); }
.${S}-bs { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: repeating-linear-gradient(135deg, transparent 0 18px, color-mix(in srgb, var(--ink) 5%, transparent) 18px 20px); }
.${S}-bn { position: relative; font-family: ${mono}; font-size: ${bh > 120 ? 64 : 48}px; font-weight: 700; color: var(--ink); opacity: 0.85; }
.${S}-bi { position: relative; width: ${Math.min(72, bh - 30)}px; height: ${Math.min(72, bh - 30)}px; color: var(--ink); }
.${S}-bi svg { width: 100%; height: 100%; display: block; }
.${S}-tick { position: absolute; left: ${BX + BW + 12}px; width: ${COL - BX - BW - 34}px; height: 3px; border-radius: 2px; transform-origin: 0 50%; }
#${S}-scan { position: absolute; left: ${BX - 50}px; top: ${cy[0] - 26}px; width: 22px; height: 52px; border-radius: 11px; background: var(--gold);
  box-shadow: 0 0 18px color-mix(in srgb, var(--gold) 60%, transparent); }`;
    html = `<div id="${S}-grp">
  ${titleHtml}
  <div id="${S}-frame"></div>
  <div id="${S}-gh">${L.map((_, i) => `<div class="${S}-gb" style="top: ${r1(BY + i * (bh + g))}px"></div>`).join("")}</div>
${L.map((x, i) => `  <div class="${S}-band" id="${S}-b${i}" style="top: ${r1(BY + i * (bh + g))}px"><div class="${S}-bf" style="background: color-mix(in srgb, ${tone(i, n)} 42%, var(--surface))"></div><div class="${S}-bs"></div>
    <span class="${S}-bn">${num(i)}</span>${x.icon ? `<span class="${S}-bi">${ctx.icon(x.icon)}</span>` : ""}</div>
  <div class="${S}-tick" id="${S}-k${i}" style="top: ${cy[i] - 1.5}px; background: ${tone(i, n)}"></div>`).join("\n")}
${rows(COL, cy)}
  <div id="${S}-scan"></div>
</div>`;
    m.push({ prim: "reveal", target: `#${S}-frame`, at: w.a, dur: 0.5, from: { opacity: 0, scale: 0.96 }, ease: ctx.ease });
    m.push({ prim: "reveal", target: `#${S}-gh`, at: w.a + 0.1, dur: 0.5, from: { opacity: 0 } });
    L.forEach((_, i) => {
      m.push({ prim: "reveal", target: `#${S}-b${i}`, at: clamp(t[i], 0.5), dur: 0.5, from: { opacity: 0, x: -140 }, ease: ctx.ease });
      m.push({ prim: "reveal", target: `#${S}-k${i}`, at: clamp(t[i] + 0.25, 0.4), dur: 0.4, from: { scaleX: 0 }, ease: "power2.out" });
      m.push({ prim: "reveal", target: `#${S}-r${i}`, at: clamp(t[i] + 0.3, 0.45), dur: 0.45, from: { opacity: 0, x: 30 }, ease: ctx.ease });
    });
    // the scanner: in at the start, to each band on its cue, then sweeping the block until the shot ends
    m.push({ prim: "reveal", target: `#${S}-scan`, at: w.a + 0.1, dur: 0.4, from: { opacity: 0, scaleY: 0.3 }, ease: ctx.ease });
    let y = 0, free = w.a + 0.52;
    const move = (to, at, dur) => {
      if (at + dur > w.b - 0.06) return false;
      m.push({ prim: "slide", target: `#${S}-scan`, at, dur, from: { y }, to: { y: to }, ease: "power2.inOut" });
      y = to;
      free = at + dur + 0.03;
      return true;
    };
    L.forEach((_, i) => { if (i > 0) move(r1(cy[i] - cy[0]), Math.max(t[i], free), 0.4); });
    for (let k = 0; k < 6; k++) if (!move(y === 0 ? r1(cy[n - 1] - cy[0]) : 0, free + 0.2, 1.4)) break;
  } else if (ctx.variant === "onion") {
    const cx = 450, cy = 410, RO = 380, RI = 100;
    const rr = L.map((_, i) => r1(RO - ((RO - RI) * i) / Math.max(1, n - 1)));
    const COL = 1000;
    const top0 = slots.title ? 150 : 90, bot = 730;
    const ry = L.map((_, i) => r1(top0 + ((bot - top0) * i) / Math.max(1, n - 1)));
    // a point in each ring's band, as level with its label as the band allows
    const pts = L.map((_, i) => {
      const rm = i < n - 1 ? (rr[i] + rr[i + 1]) / 2 : rr[i] * 0.55;
      const s = Math.max(-0.75, Math.min(0.75, (ry[i] - cy) / rm));
      return [r1(cx + rm * Math.sqrt(1 - s * s)), r1(cy + rm * s)];
    });
    css = `${titleCss(COL, 60, 740)}${rowCss(lfs)}
#${S}-grp { position: absolute; inset: 0; }
#${S}-svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-ghost { fill: none; stroke: color-mix(in srgb, var(--ink) 20%, transparent); stroke-width: 2; stroke-dasharray: 8 12; }
.${S}-ring { position: absolute; border-radius: 50%; box-sizing: border-box; }
.${S}-ld { fill: none; stroke-width: 3; stroke-dasharray: 1000; }
.${S}-dot { stroke: var(--surface); stroke-width: 4; }
#${S}-core { position: absolute; left: ${cx - 44}px; top: ${cy - 44}px; width: 88px; height: 88px; color: var(--surface); }
#${S}-core svg { width: 88px; height: 88px; display: block; }
#${S}-rot { position: absolute; left: ${cx - RO - 24}px; top: ${cy - RO - 24}px; width: ${2 * RO + 48}px; height: ${2 * RO + 48}px; }
#${S}-rot svg { width: 100%; height: 100%; display: block; overflow: visible; }
#${S}-rot circle { fill: none; stroke: color-mix(in srgb, var(--cyan) 30%, transparent); stroke-width: 3; stroke-dasharray: 3 22; stroke-linecap: round; }
#${S}-spk { position: absolute; left: -11px; top: -11px; width: 22px; height: 22px; border-radius: 50%; background: var(--gold);
  box-shadow: 0 0 18px color-mix(in srgb, var(--gold) 70%, transparent); }`;
    const inner = L.at(-1).icon;
    const s0 = w.a + 0.3, sd = w.b - 0.08 - s0;
    html = `<div id="${S}-grp">
  ${titleHtml}
  <div id="${S}-rot"><svg viewBox="0 0 ${2 * RO + 48} ${2 * RO + 48}"><circle cx="${RO + 24}" cy="${RO + 24}" r="${RO + 14}"/></svg></div>
${rr.map((r, i) => `  <div class="${S}-ring" id="${S}-c${i}" style="left: ${r1(cx - r)}px; top: ${r1(cy - r)}px; width: ${2 * r}px; height: ${2 * r}px;
    background: color-mix(in srgb, ${tone(i, n)} ${i === n - 1 ? 85 : 20 + 8 * i}%, var(--surface)); border: 3px solid ${tone(i, n)}"></div>`).join("\n")}
  <svg id="${S}-svg" viewBox="0 0 1760 820">
${rr.map((r, i) => `    <circle class="${S}-ghost" id="${S}-g${i}" cx="${cx}" cy="${cy}" r="${r}"/>`).join("\n")}
  </svg>
  ${inner ? `<div id="${S}-core">${ctx.icon(inner)}</div>` : ""}
  <svg id="${S}-ls" style="position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible" viewBox="0 0 1760 820">
${pts.map(([x, y], i) => `    <path class="${S}-ld" id="${S}-l${i}" pathLength="1000" style="stroke: ${tone(i, n)}" d="M${x} ${y} L${COL - 90} ${ry[i]} L${COL - 20} ${ry[i]}"/>
    <circle class="${S}-dot" id="${S}-d${i}" cx="${x}" cy="${y}" r="10" style="fill: ${tone(i, n)}"/>`).join("\n")}
  </svg>
${rows(COL, ry)}
  ${sd >= 0.6 ? `<div id="${S}-spk"></div>` : ""}
</div>`;
    m.push({ prim: "reveal", target: `#${S}-svg`, at: w.a, dur: 0.5, from: { opacity: 0, scale: 0.9 }, ease: ctx.ease });
    m.push({ prim: "reveal", target: `#${S}-rot`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0 } });
    if (w.b - (w.a + 0.6) > 0.8) m.push({ prim: "slide", target: `#${S}-rot`, at: w.a + 0.6, dur: w.b - 0.05 - (w.a + 0.6), from: { rotation: 0 }, to: { rotation: 60 }, ease: "none" });
    L.forEach((_, i) => {
      m.push({ prim: "reveal", target: `#${S}-c${i}`, at: clamp(t[i], 0.5), dur: 0.5, from: { opacity: 0, scale: 0.8 }, ease: "back.out(1.5)" });
      m.push({ prim: "draw", target: `#${S}-l${i}`, at: clamp(t[i] + 0.25, 0.5), dur: 0.5 });
      m.push({ prim: "reveal", target: `#${S}-d${i}`, at: clamp(t[i] + 0.2, 0.3), dur: 0.3, from: { opacity: 0 } });
      m.push({ prim: "reveal", target: `#${S}-r${i}`, at: clamp(t[i] + 0.45, 0.45), dur: 0.45, from: { opacity: 0, x: -24 }, ease: ctx.ease });
    });
    if (inner) m.push({ prim: "reveal", target: `#${S}-core`, at: clamp(t[n - 1] + 0.2, 0.45), dur: 0.45, from: { opacity: 0, scale: 0.4 }, ease: "back.out(2)" });
    // the spark circles the outer ring for the whole shot
    if (sd >= 0.6) {
      const loops = Math.max(1, Math.round(sd / 5)), per = 36, ro = RO + 14;
      const pts2 = Array.from({ length: loops * per + 1 }, (_, k) => {
        const a = (-Math.PI / 2) + (2 * Math.PI * k) / per;
        return [r1(cx + ro * Math.cos(a)), r1(cy + ro * Math.sin(a))];
      });
      m.push({ prim: "reveal", target: `#${S}-spk`, at: w.a + 0.1, dur: 0.2, from: { opacity: 0 } });
      m.push({ prim: "orbit", target: `#${S}-spk`, points: pts2, at: s0, dur: sd });
    }
  } else {
    // exploded
    const cx = 400, HW = 290, HH = 92, DEP = 26;
    const top0 = 170, bot = 670;
    const yf = L.map((_, i) => r1(top0 + ((bot - top0) * i) / Math.max(1, n - 1)));
    const yc = L.map((_, i) => r1(420 + (i - (n - 1) / 2) * 34));
    const COL = 860;
    const PWD = 2 * HW + 8, PHT = 2 * HH + DEP + 8;
    css = `${titleCss(COL, 40, 880)}${rowCss(lfs)}
#${S}-grp { position: absolute; inset: 0; }
#${S}-axis { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-ax { stroke: color-mix(in srgb, var(--ink) 26%, transparent); stroke-width: 3; stroke-dasharray: 10 12; }
.${S}-ld { fill: none; stroke-width: 3; stroke-dasharray: 1000; }
.${S}-pl { position: absolute; left: ${cx - HW - 4}px; width: ${PWD}px; height: ${PHT}px; }
.${S}-pl svg { width: ${PWD}px; height: ${PHT}px; display: block; overflow: visible; }
.${S}-pi { position: absolute; left: ${HW + 4 - 30}px; top: ${HH + 4 - 30}px; width: 60px; height: 60px; color: var(--ink); }
.${S}-pi svg { width: 60px; height: 60px; display: block; }`;
    const plate = (i) => {
      const c = tone(i, n);
      const X = (x) => r1(x + 4), Y = (y) => r1(y + 4);
      return `  <div class="${S}-pl" id="${S}-p${i}" style="top: ${r1(yf[i] - HH - 4)}px"><svg viewBox="0 0 ${PWD} ${PHT}">
    <path d="M${X(0)} ${Y(HH)} L${X(HW)} ${Y(2 * HH)} L${X(2 * HW)} ${Y(HH)} L${X(2 * HW)} ${Y(HH + DEP)} L${X(HW)} ${Y(2 * HH + DEP)} L${X(0)} ${Y(HH + DEP)} Z" style="fill: color-mix(in srgb, ${c} 55%, #000); stroke: ${c}; stroke-width: 2"/>
    <path d="M${X(0)} ${Y(HH)} L${X(HW)} ${Y(0)} L${X(2 * HW)} ${Y(HH)} L${X(HW)} ${Y(2 * HH)} Z" style="fill: color-mix(in srgb, ${c} 30%, var(--surface)); stroke: ${c}; stroke-width: 3"/>
  </svg>${L[i].icon ? `<span class="${S}-pi">${ctx.icon(L[i].icon)}</span>` : ""}</div>`;
    };
    html = `<div id="${S}-grp">
  ${titleHtml}
  <svg id="${S}-axis" viewBox="0 0 1760 820">
    <line id="${S}-ax" x1="${cx}" y1="40" x2="${cx}" y2="800"/>
${yf.map((y, i) => `    <path class="${S}-ld" id="${S}-l${i}" pathLength="1000" style="stroke: ${tone(i, n)}" d="M${cx + HW + 10} ${y} L${COL - 24} ${y}"/>`).join("\n")}
  </svg>
${L.map((_, i) => plate(n - 1 - i)).join("\n")}
${rows(COL, yf)}
</div>`;
    m.push({ prim: "reveal", target: `#${S}-axis`, at: w.a, dur: 0.5, from: { opacity: 0 } });
    L.forEach((_, i) => {
      const d = r1(yc[i] - yf[i]);
      const enter = w.a + 0.05 + (n - 1 - i) * 0.07;
      const lift = Math.max(clamp(t[i], 0.7), enter + 0.45 + ctx.gap + 0.01);
      // in, stacked tight; then out to the exploded place on its cue
      m.push({ prim: "reveal", target: `#${S}-p${i}`, at: enter, dur: 0.45, from: { opacity: 0, y: d + 40 }, to: { opacity: 1, y: d }, ease: ctx.ease });
      m.push({ prim: "slide", target: `#${S}-p${i}`, at: lift, dur: 0.7, from: { y: d }, to: { y: 0 }, ease: "back.out(1.3)" });
      m.push({ prim: "draw", target: `#${S}-l${i}`, at: clamp(lift + 0.4, 0.45), dur: 0.45 });
      m.push({ prim: "reveal", target: `#${S}-r${i}`, at: clamp(lift + 0.5, 0.45), dur: 0.45, from: { opacity: 0, x: -24 }, ease: ctx.ease });
    });
  }

  // the index of every row stands from the start; its label comes on the cue
  L.forEach((_, i) => m.push({ prim: "reveal", target: `#${S}-x${i}`, at: Math.min(t[i], w.a + 0.15 + i * 0.06), dur: 0.4, from: { opacity: 0 } }));
  const d = ctx.drift(`#${S}-grp`, clamp(last + 1.2 + ctx.gap, 0.7), 12);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}
