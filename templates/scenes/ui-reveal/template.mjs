// ui-reveal — a product UI laid into a 3D plane that assembles itself, after the HyperFrames registry block "ui-3d-reveal"
// (heygen-com/hyperframes, Apache-2.0). The block tweens rotationY/z on a hand-drawn Figma mock; here the 3D view is a
// static CSS perspective on a wrapper (only 2D transforms are tweened inside it) and the mock is built from the slots:
// an app window with a sidebar, a headline, metric cards and a trend chart.
// The window rises into place at the window start with its sidebar, headline and chart drawing; each metric card
// starts as a loading skeleton and, on its keyword, the skeleton gives way to the real label and value while the card
// lifts and takes a gold outline.
// tilt (signature): the window lies back on a tilted desk-like plane across the stage, the caption above it.
// angle: the window turned three-quarters to the left on the right side; the headline and caption stand flat in the
//   left column.

import { keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => [...slots.cards.map((_, i) => `cards.${i}`), ...(slots.caption ? ["caption"] : [])];

const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const mono = `"${theme.mono}", monospace`;
  const angle = ctx.variant === "angle";
  const cards = slots.cards;
  const n = cards.length;
  const nav = slots.nav ?? [];
  // a card lifts only after its entrance has settled
  const fit = (t, dur) => Math.max(w.a + 0.35 + n * 0.08 + 0.45, Math.min(t, w.b - dur - 0.05));

  // window geometry (untransformed px); the headline lives inside the window only in tilt
  const W = angle ? 1000 : 1280, H = angle ? 640 : 680;
  const X = angle ? 740 : (1760 - W) / 2, Y = angle ? 90 : slots.caption ? 92 : 60;
  const BAR = 52, SIDE = nav.length ? (angle ? 200 : 240) : 0, PAD = 30;
  const head = !angle && slots.headline;
  const mainW = W - SIDE - PAD * 2;
  const two = n === 4 || (angle && n > 2);
  const cols = two ? 2 : n, rows = Math.ceil(n / cols);
  const GAP = 18;
  const cardW = Math.floor((mainW - GAP * (cols - 1)) / cols);
  const cardH = two ? 128 : 176;
  const headH = head ? 62 : 0;
  const chartY = headH + rows * cardH + (rows - 1) * GAP + GAP + 6;
  const chartH = H - BAR - PAD * 2 - chartY;
  const tilt = angle ? "perspective(2400px) rotateY(-24deg) rotateX(6deg)" : "perspective(2600px) rotateX(24deg)";

  // the trend chart: a smooth deterministic series across the chart panel
  const cw = mainW - 40, ch = Math.max(60, chartH - 36);
  const pts = Array.from({ length: 13 }, (_, i) => [r1(20 + (i * cw) / 12), r1(18 + ch * (0.75 - 0.5 * (i / 12) - 0.18 * Math.sin(i * 1.3 + ctx.rng() * 0.6)))]);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x} ${y}`).join(" ");
  const area = `${line} L${pts.at(-1)[0]} ${18 + ch} L${pts[0][0]} ${18 + ch} Z`;
  const spark = () => Array.from({ length: 7 }, (_, j) => r2(0.3 + 0.7 * ((j * 0.37 + ctx.rng() * 0.5) % 1)));

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-tilt { position: absolute; left: ${X}px; top: ${Y}px; width: ${W}px; height: ${H}px; transform: ${tilt};
  transform-origin: ${angle ? "30% 50%" : "50% 60%"}; }
#${S}-glow { position: absolute; inset: 40px; border-radius: ${R * 2}px; background: color-mix(in srgb, var(--cyan) 22%, transparent); filter: blur(60px); }
#${S}-win { position: absolute; inset: 0; border-radius: ${R}px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--ink) 14%, transparent); box-shadow: 0 40px 80px color-mix(in srgb, black 55%, transparent); }
.${S}-bar { position: absolute; left: 0; right: 0; top: 0; height: ${BAR}px; display: flex; align-items: center; gap: 10px; padding: 0 22px;
  border-bottom: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); box-sizing: border-box; }
.${S}-tl { width: 14px; height: 14px; border-radius: 50%; }
#${S}-app { position: absolute; left: 0; right: 0; text-align: center; font-size: 22px; font-weight: 700; color: var(--muted); }
#${S}-side { position: absolute; left: 0; top: ${BAR}px; bottom: 0; width: ${SIDE}px; box-sizing: border-box; padding: 26px 16px;
  border-right: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); display: flex; flex-direction: column; gap: 10px; }
.${S}-nav { padding: 10px 14px; border-radius: ${Math.round(R * 0.6)}px; font-size: 24px; font-weight: 600; line-height: 1.2; color: var(--muted); }
.${S}-nav.on { background: color-mix(in srgb, var(--gold) 16%, transparent); color: var(--gold); font-weight: 800; }
#${S}-main { position: absolute; left: ${SIDE + PAD}px; top: ${BAR + PAD}px; width: ${mainW}px; height: ${H - BAR - PAD * 2}px; }
#${S}-head { position: absolute; left: 0; top: 0; width: ${mainW}px; font-size: 38px; font-weight: 800; line-height: 1.2; color: var(--ink);
  white-space: nowrap; }
.${S}-card { position: absolute; width: ${cardW}px; height: ${cardH}px; box-sizing: border-box; border-radius: ${R}px;
  background: color-mix(in srgb, var(--canvas) 55%, var(--surface)); border: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-ol { position: absolute; inset: -2px; border-radius: ${R}px; border: 3px solid var(--gold);
  box-shadow: 0 0 24px color-mix(in srgb, var(--gold) 35%, transparent); }
.${S}-sk { position: absolute; inset: 0; padding: 22px; box-sizing: border-box; display: flex; flex-direction: column; gap: 14px; }
.${S}-sk i { display: block; height: 18px; border-radius: 9px; background: color-mix(in srgb, var(--ink) 12%, transparent); }
.${S}-cc { position: absolute; inset: 0; padding: ${two ? "16px 22px" : "20px 22px"}; box-sizing: border-box; display: flex; flex-direction: column;
  justify-content: space-between; }
.${S}-cl { font-size: 26px; font-weight: 700; line-height: 1.2; color: var(--muted); }
.${S}-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
.${S}-cv { font-family: ${mono}; font-size: ${two ? 40 : 44}px; font-weight: 800; line-height: 1; color: var(--gold); white-space: nowrap; }
.${S}-sp { display: flex; align-items: flex-end; gap: 5px; height: 40px; flex: none; }
.${S}-sp b { width: 8px; border-radius: 3px; background: color-mix(in srgb, var(--cyan) 70%, transparent); }
#${S}-chart { position: absolute; left: 0; top: ${chartY}px; width: ${mainW}px; height: ${chartH}px; box-sizing: border-box; border-radius: ${R}px;
  background: color-mix(in srgb, var(--canvas) 55%, var(--surface)); border: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
#${S}-chart svg { position: absolute; left: 0; top: 0; overflow: visible; }
.${S}-gl { stroke: color-mix(in srgb, var(--ink) 8%, transparent); stroke-width: 2; }
#${S}-area { fill: color-mix(in srgb, var(--cyan) 16%, transparent); }
#${S}-line { fill: none; stroke: var(--cyan); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
#${S}-cap { position: absolute; ${angle ? "left: 0; top: 0; width: 640px;" : "left: 180px; top: 0; width: 1400px; text-align: center;"}
  font-size: ${angle ? 36 : 40}px; font-weight: 700; line-height: 1.3; color: var(--ink); }
#${S}-col { position: absolute; left: 0; top: 0; width: 660px; height: 820px; display: flex; flex-direction: column; justify-content: center; gap: 26px; }
#${S}-col #${S}-cap { position: static; }
#${S}-kick { font-size: 26px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--cyan); }
#${S}-big { font-size: 62px; font-weight: 800; line-height: 1.15; color: var(--ink); }`;

  const cardHtml = cards.map((c, i) => {
    const cx = (i % cols) * (cardW + GAP), cy = headH + Math.floor(i / cols) * (cardH + GAP);
    const bars = spark().map((h) => `<b style="height: ${Math.round(h * 40)}px"></b>`).join("");
    return `<div class="${S}-card" id="${S}-c${i}" style="left: ${cx}px; top: ${cy}px">
      <div class="${S}-sk" id="${S}-sk${i}"><i style="width: 62%"></i><i style="width: 38%"></i></div>
      <div class="${S}-cc" id="${S}-cc${i}"><div class="${S}-cl">${esc(c.label)}</div><div class="${S}-row">${c.value ? `<div class="${S}-cv">${esc(c.value)}</div>` : "<div></div>"}<div class="${S}-sp">${bars}</div></div></div>
      <div class="${S}-ol" id="${S}-ol${i}"></div></div>`;
  }).join("\n    ");
  const grid = [1, 2, 3].map((k) => `<line class="${S}-gl" x1="20" x2="${20 + cw}" y1="${r1(18 + (k * ch) / 4)}" y2="${r1(18 + (k * ch) / 4)}"/>`).join("");
  const win = `<div id="${S}-tilt"><div id="${S}-glow"></div><div id="${S}-win">
   <div class="${S}-bar"><span class="${S}-tl" style="background: var(--warn)"></span><span class="${S}-tl" style="background: var(--gold)"></span><span class="${S}-tl" style="background: var(--cyan)"></span><span id="${S}-app">${esc(slots.app)}</span></div>
   ${SIDE ? `<div id="${S}-side">${nav.map((t, i) => `<div class="${S}-nav${i ? "" : " on"}" id="${S}-n${i}">${esc(t)}</div>`).join("")}</div>` : ""}
   <div id="${S}-main">
    ${head ? `<div id="${S}-head">${esc(slots.headline)}</div>` : ""}
    ${cardHtml}
    <div id="${S}-chart"><svg width="${mainW}" height="${chartH}" viewBox="0 0 ${mainW} ${chartH}">${grid}<path id="${S}-area" d="${area}"/><path id="${S}-line" pathLength="1000" d="${line}"/></svg></div>
   </div>
  </div></div>`;
  const cap = slots.caption ? `<div id="${S}-cap">${esc(slots.caption)}</div>` : "";
  const col = angle ? `<div id="${S}-col"><div id="${S}-kick">${esc(slots.app)}</div>${slots.headline ? `<div id="${S}-big">${esc(slots.headline)}</div>` : ""}${cap}</div>` : cap;
  const html = `<div id="${S}-root">
  ${win}
  ${col}
</div>`;

  // ── motion ────────────────────────────────────────────────────────────────────
  const a = w.a;
  const m = [
    { prim: "reveal", target: `#${S}-win`, at: a + 0.05, dur: 0.8, from: { opacity: 0, y: 70, scale: 0.9 }, ease: "power3.out" },
    { prim: "reveal", target: `#${S}-glow`, at: a + 0.2, dur: 0.9, from: { opacity: 0 } },
  ];
  if (SIDE) nav.forEach((_, i) => m.push({ prim: "reveal", target: `#${S}-n${i}`, at: r2(a + 0.4 + i * 0.07), dur: 0.35, from: { opacity: 0, x: -20 }, ease: ctx.ease }));
  if (head) m.push({ prim: "reveal", target: `#${S}-head`, at: a + 0.45, dur: 0.5, from: { opacity: 0, y: 16 }, ease: ctx.ease });
  if (angle) {
    m.push({ prim: "reveal", target: `#${S}-kick`, at: a + 0.1, dur: 0.45, from: { opacity: 0, x: -24 }, ease: ctx.ease });
    if (slots.headline) m.push({ prim: "reveal", target: `#${S}-big`, at: a + 0.25, dur: 0.55, from: { opacity: 0, x: -30 }, ease: ctx.ease });
  }
  m.push({ prim: "reveal", target: `#${S}-chart`, at: a + 0.5, dur: 0.4, from: { opacity: 0 } },
    { prim: "draw", target: `#${S}-line`, at: a + 0.6, dur: Math.min(1.4, Math.max(0.6, w.b - a - 1.6)), ease: "power2.inOut" },
    { prim: "reveal", target: `#${S}-area`, at: a + 0.9, dur: 0.6, from: { opacity: 0 } });
  cards.forEach((_, i) => m.push({ prim: "reveal", target: `#${S}-c${i}`, at: r2(a + 0.35 + i * 0.08), dur: 0.4, from: { opacity: 0, y: 24 }, ease: ctx.ease }));
  let end = a + 1.5;
  cards.forEach((_, i) => {
    const at = r2(fit(ctx.at(`cards.${i}`), 0.9));
    m.push({ prim: "reveal", target: `#${S}-sk${i}`, at, dur: 0.25, from: { opacity: 1 }, to: { opacity: 0 } },
      { prim: "reveal", target: `#${S}-cc${i}`, at: r2(at + 0.1), dur: 0.4, from: { opacity: 0, y: 14 }, ease: ctx.ease },
      { prim: "reveal", target: `#${S}-ol${i}`, at, dur: 0.35, from: { opacity: 0 } },
      { prim: "reveal", target: `#${S}-c${i}`, at, dur: 0.45, from: { y: 0 }, to: { y: -12 }, ease: "back.out(2)" });
    end = Math.max(end, at + 0.5);
  });
  if (slots.caption) {
    const at = r2(Math.max(a + 0.2, Math.min(ctx.at("caption"), w.b - 0.6)));
    m.push({ prim: "reveal", target: `#${S}-cap`, at, dur: 0.5, from: { opacity: 0, y: angle ? 16 : -14 }, ease: ctx.ease });
  }
  const d = ctx.drift(`#${S}-root`, Math.min(end + 0.2, w.b - 0.7), 5);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}
