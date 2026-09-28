// anchor — the chapter summary ("Tóm tắt chương …"): a title and 2–5 points to remember. Every point's shell
// (cyan number, outlined check or badge, faint track) is on stage from the window start; each lights on its keyword.
// checklist: title with a spark in a left column, a drawn divider, rows on the right whose check marks are drawn.
// cycle (signature): a thick ring split into one arc per point around a big gold counter; labels sit outside the
//   ring, a spark circles it.
// badge-row: title on top with a drawn underline, a row of round badges joined by a line that fills gold as each
//   badge lights.

export const revealKeys = (slots) => ["title", ...slots.items.map((_, i) => `items.${i}`)];

const r1 = (x) => Math.round(x * 10) / 10;
const rad = (d) => (d * Math.PI) / 180;
const num = (i) => String(i + 1).padStart(2, "0");
const size = (s, steps) => steps.find(([n]) => [...s].length <= n)?.[1] ?? steps.at(-1)[1];

export function render(ctx) {
  const { S, slots, esc, window: w, theme } = ctx;
  const items = slots.items;
  const n = items.length;
  const tt = ctx.at("title");
  const t = items.map((_, i) => ctx.at(`items.${i}`));
  const last = Math.max(tt, ...t);
  const mono = `"${theme.mono}", monospace`;
  const radius = theme.radius ?? 18;
  const fit = (at, dur) => Math.max(w.a, Math.min(at, w.b - dur - 0.05));
  const enter = (i) => Math.min(t[i], w.a + 0.12 + i * 0.08);
  const m = [];
  const check = `<svg viewBox="0 0 64 64"><path pathLength="1000" d="M18 33 L28 43 L47 23"/></svg>`;

  // ── cycle ──────────────────────────────────────────────────────────────────────
  if (ctx.variant === "cycle") {
    const cx = 880, cy = 450, R = 210, gap = n > 3 ? 5 : 4;
    const P = (a, r = R) => [r1(cx + r * Math.cos(rad(a))), r1(cy + r * Math.sin(rad(a)))];
    const arcs = items.map((_, i) => {
      const a0 = -90 + (360 * i) / n + gap, a1 = -90 + (360 * (i + 1)) / n - gap;
      const [x0, y0] = P(a0), [x1, y1] = P(a1);
      return { d: `M${x0} ${y0} A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`, mid: (a0 + a1) / 2 };
    });
    const tags = arcs.map(({ mid }) => {
      const [x, y] = P(mid, R + 58), c = Math.cos(rad(mid)), s = Math.sin(rad(mid));
      const tx = Math.abs(c) < 0.35 ? "-50%" : c > 0 ? "0" : "-100%";
      const ty = Math.abs(c) < 0.35 ? (s < 0 ? "-100%" : "0") : "-50%";
      return { x, y, tx, ty };
    });
    const loops = Math.max(1, Math.round((w.b - w.a - 0.4) / 5));
    const orbitPts = Array.from({ length: loops * 36 + 1 }, (_, k) => P(-90 + k * 10));
    const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-title { position: absolute; left: 180px; top: 0; width: 1400px; text-align: center; font-size: 60px; font-weight: 800; color: var(--ink); }
#${S}-svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-trk { fill: none; stroke: color-mix(in srgb, var(--ink) 10%, transparent); stroke-width: 30; stroke-dasharray: 1000; }
.${S}-arc { fill: none; stroke-width: 30; stroke-linecap: butt; stroke-dasharray: 1000; }
.${S}-arc:nth-of-type(odd) { stroke: var(--gold); }
.${S}-arc:nth-of-type(even) { stroke: var(--cyan); }
#${S}-halo { fill: none; stroke: color-mix(in srgb, var(--gold) 16%, transparent); stroke-width: 2; stroke-dasharray: 5 12; }
#${S}-cnt { position: absolute; left: ${cx - 150}px; top: ${cy - 86}px; width: 300px; text-align: center; font-family: ${mono}; font-size: 140px;
  font-weight: 700; line-height: 1; color: var(--gold); }
#${S}-of { position: absolute; left: ${cx - 150}px; top: ${cy + 95}px; width: 300px; text-align: center; font-family: ${mono}; font-size: 32px; color: var(--muted); }
.${S}-dot { position: absolute; left: -11px; top: -11px; width: 22px; height: 22px; border-radius: 50%; background: var(--ink);
  box-shadow: 0 0 20px color-mix(in srgb, var(--gold) 80%, transparent); }
.${S}-anc { position: absolute; width: 0; height: 0; }
.${S}-tag { position: absolute; left: 0; top: 0; width: max-content; max-width: 460px; display: flex; align-items: center; gap: 14px;
  padding: 12px 22px; border-radius: ${Math.min(radius, 14)}px; background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); }
.${S}-num { font-family: ${mono}; font-size: 28px; font-weight: 700; color: var(--cyan); flex: none; }
.${S}-txt { font-size: 32px; font-weight: 800; line-height: 1.2; color: var(--ink); }
${tags.map(({ x, y, tx, ty }, i) => `#${S}-n${i + 1} { left: ${x}px; top: ${y}px; }
#${S}-n${i + 1} .${S}-tag { transform: translate(${tx}, ${ty}); }`).join("\n")}`;
    const html = `<div id="${S}-root">
  <div id="${S}-title">${esc(slots.title)}</div>
  <svg id="${S}-svg" viewBox="0 0 1760 820">
    <circle id="${S}-halo" cx="${cx}" cy="${cy}" r="${R + 34}"/>
    <circle id="${S}-trk" pathLength="1000" cx="${cx}" cy="${cy}" r="${R}" transform="rotate(-90 ${cx} ${cy})"/>
${arcs.map((a, i) => `    <path class="${S}-arc" id="${S}-a${i + 1}" pathLength="1000" d="${a.d}"/>`).join("\n")}
  </svg>
  <div class="${S}-dot" id="${S}-dot"></div>
  <div id="${S}-cnt">0</div>
  <div id="${S}-of">/ ${n}</div>
${items.map((x, i) => `  <div class="${S}-anc" id="${S}-n${i + 1}"><div class="${S}-tag"><span class="${S}-num">${num(i)}</span><span class="${S}-txt" id="${S}-x${i + 1}">${esc(x)}</span></div></div>`).join("\n")}
</div>`;
    m.push({ prim: "draw", target: `#${S}-trk`, at: w.a + 0.05, dur: 0.9 });
    m.push({ prim: "reveal", target: `#${S}-halo`, at: w.a + 0.2, dur: 0.8, from: { opacity: 0 } });
    m.push({ prim: "reveal", target: `#${S}-cnt`, at: w.a + 0.15, dur: 0.5, from: { opacity: 0, scale: 0.7 }, ease: ctx.ease });
    m.push({ prim: "reveal", target: `#${S}-of`, at: w.a + 0.3, dur: 0.4, from: { opacity: 0 } });
    m.push({ prim: "reveal", target: `#${S}-title`, at: tt, dur: 0.55, from: ctx.motionFrom(), ease: ctx.ease });
    const od = w.b - 0.05 - (w.a + 0.4);
    if (od > 0.6) m.push({ prim: "orbit", target: `#${S}-dot`, points: orbitPts, at: w.a + 0.4, dur: od });
    items.forEach((_, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-n${k}`, at: enter(i), dur: 0.45, from: { opacity: 0, scale: 0.8 }, ease: ctx.ease });
      m.push({ prim: "draw", target: `#${S}-a${k}`, at: fit(t[i], 0.5), dur: 0.5 });
      m.push({ prim: "reveal", target: `#${S}-x${k}`, at: fit(t[i] + 0.1, 0.45), dur: 0.45, from: { opacity: 0, y: 12 } });
      m.push({ prim: "swap", target: `#${S}-cnt`, at: Math.max(w.a + 0.7, fit(t[i] + 0.2, 0)), props: { textContent: String(k) } });
    });
    const drift = ctx.drift(`#${S}-root`, last + 0.6 + ctx.gap, 10);
    if (drift) m.push(drift);
    return { css, html, motions: m };
  }

  // ── badge-row ──────────────────────────────────────────────────────────────────
  if (ctx.variant === "badge-row") {
    const cw = Math.min(360, 1680 / n), B = 150, by = 400;
    const xs = items.map((_, i) => r1(880 + (i - (n - 1) / 2) * cw));
    const fs = size(slots.title, [[18, 80], [24, 68], [30, 60]]);
    const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-title { position: absolute; left: 130px; top: 40px; width: 1500px; text-align: center; font-size: ${fs}px; font-weight: 800; color: var(--ink); }
#${S}-svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-ul { fill: none; stroke: var(--gold); stroke-width: 6; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-base { fill: none; stroke: color-mix(in srgb, var(--ink) 16%, transparent); stroke-width: 4; stroke-dasharray: 1000; }
.${S}-seg { fill: none; stroke: var(--gold); stroke-width: 6; stroke-dasharray: 1000; }
.${S}-ring { fill: none; stroke: var(--gold); stroke-width: 6; stroke-dasharray: 1000; }
.${S}-badge { position: absolute; width: ${B}px; height: ${B}px; box-sizing: border-box; border-radius: 50%; background: var(--surface);
  border: 3px solid color-mix(in srgb, var(--cyan) 40%, transparent); display: flex; align-items: center; justify-content: center;
  font-family: ${mono}; font-size: 56px; font-weight: 700; color: var(--cyan); }
.${S}-fill { position: absolute; inset: 14px; border-radius: 50%; background: var(--gold); display: flex; align-items: center; justify-content: center; }
.${S}-fill svg { width: 70px; height: 70px; }
.${S}-fill path { fill: none; stroke: var(--canvas); stroke-width: 7; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-lab { position: absolute; top: ${by + B / 2 + 36}px; width: ${r1(cw - 28)}px; text-align: center; font-size: ${n > 4 ? 32 : 36}px;
  font-weight: 800; line-height: 1.2; color: var(--ink); }
${xs.map((x, i) => `#${S}-b${i + 1} { left: ${r1(x - B / 2)}px; top: ${by - B / 2}px; }
#${S}-l${i + 1} { left: ${r1(x - (cw - 28) / 2)}px; }`).join("\n")}`;
    const ring = (x) => `M${x} ${by - B / 2 - 10} A${B / 2 + 10} ${B / 2 + 10} 0 1 1 ${x - 0.1} ${by - B / 2 - 10}`;
    const html = `<div id="${S}-root">
  <div id="${S}-title">${esc(slots.title)}</div>
  <svg id="${S}-svg" viewBox="0 0 1760 820">
    <path id="${S}-ul" pathLength="1000" d="M680 ${40 + fs * 1.3 + 14} L1080 ${40 + fs * 1.3 + 14}"/>
    <path id="${S}-base" pathLength="1000" d="M${xs[0]} ${by} L${xs[n - 1]} ${by}"/>
${xs.slice(1).map((x, i) => `    <path class="${S}-seg" id="${S}-g${i + 2}" pathLength="1000" d="M${xs[i]} ${by} L${x} ${by}"/>`).join("\n")}
${xs.map((x, i) => `    <path class="${S}-ring" id="${S}-r${i + 1}" pathLength="1000" d="${ring(x)}"/>`).join("\n")}
  </svg>
${items.map((x, i) => `  <div class="${S}-badge" id="${S}-b${i + 1}">${num(i)}<div class="${S}-fill" id="${S}-f${i + 1}">${check.replace("<path ", `<path id="${S}-c${i + 1}" `)}</div></div>
  <div class="${S}-lab" id="${S}-l${i + 1}">${esc(x)}</div>`).join("\n")}
</div>`;
    m.push({ prim: "draw", target: `#${S}-base`, at: w.a + 0.05, dur: 0.9 });
    m.push({ prim: "reveal", target: `#${S}-title`, at: tt, dur: 0.55, from: ctx.motionFrom(), ease: ctx.ease });
    m.push({ prim: "draw", target: `#${S}-ul`, at: fit(tt + 0.3, 0.6), dur: 0.6 });
    items.forEach((_, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-b${k}`, at: enter(i), dur: 0.45, from: { opacity: 0, scale: 0.6 }, ease: ctx.ease });
      if (i) m.push({ prim: "draw", target: `#${S}-g${k}`, at: fit(t[i] - 0.3 > w.a ? t[i] - 0.3 : t[i], 0.4), dur: 0.4 });
      m.push({ prim: "draw", target: `#${S}-r${k}`, at: fit(t[i], 0.5), dur: 0.5 });
      m.push({ prim: "reveal", target: `#${S}-f${k}`, at: fit(t[i], 0.4), dur: 0.4, from: { opacity: 0, scale: 0.4 }, ease: "back.out(2)" });
      m.push({ prim: "draw", target: `#${S}-c${k}`, at: fit(t[i] + 0.2, 0.35), dur: 0.35 });
      m.push({ prim: "reveal", target: `#${S}-l${k}`, at: fit(t[i] + 0.1, 0.45), dur: 0.45, from: ctx.motionFrom(), ease: ctx.ease });
    });
    const drift = ctx.drift(`#${S}-root`, last + 0.6 + ctx.gap, 10);
    if (drift) m.push(drift);
    return { css, html, motions: m };
  }

  // ── checklist ──────────────────────────────────────────────────────────────────
  const g = Math.min(150, 720 / n), rh = Math.min(118, g - 22);
  const ys = items.map((_, i) => r1(410 + (i - (n - 1) / 2) * g));
  const fs = size(slots.title, [[12, 88], [20, 76], [30, 62]]);
  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-list { position: absolute; inset: 0; }
#${S}-spark { position: absolute; left: 100px; top: 200px; width: 72px; height: 72px; color: var(--gold); }
#${S}-spark svg { width: 72px; height: 72px; }
#${S}-title { position: absolute; left: 100px; top: 296px; width: 420px; font-size: ${fs}px; font-weight: 800; line-height: 1.1; color: var(--ink); }
#${S}-svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-div { fill: none; stroke: color-mix(in srgb, var(--ink) 22%, transparent); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 1000; }
.${S}-row { position: absolute; left: 640px; width: 1060px; height: ${rh}px; box-sizing: border-box; border-radius: ${radius}px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-lit { position: absolute; inset: -2px; border-radius: inherit; border: 2px solid color-mix(in srgb, var(--gold) 70%, transparent);
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--gold) 10%, transparent); }
.${S}-chk { position: absolute; left: 30px; top: ${r1(rh / 2 - 32)}px; width: 64px; height: 64px; overflow: visible; }
.${S}-chk circle { fill: none; stroke-width: 4; }
.${S}-trk { stroke: color-mix(in srgb, var(--muted) 45%, transparent); }
.${S}-cir { stroke: var(--gold); stroke-dasharray: 1000; }
.${S}-chk path { fill: none; stroke: var(--gold); stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-txt { position: absolute; left: 124px; top: 0; height: ${rh}px; width: 800px; display: flex; align-items: center; font-size: ${n > 4 ? 38 : 42}px;
  font-weight: 800; line-height: 1.15; color: var(--ink); }
.${S}-num { position: absolute; right: 30px; top: ${r1(rh / 2 - 20)}px; font-family: ${mono}; font-size: 32px; font-weight: 700; color: var(--cyan); }
${ys.map((y, i) => `#${S}-n${i + 1} { top: ${r1(y - rh / 2)}px; }`).join("\n")}`;
  const html = `<div id="${S}-root">
  <div id="${S}-spark">${ctx.icon("spark")}</div>
  <div id="${S}-title">${esc(slots.title)}</div>
  <svg id="${S}-svg" viewBox="0 0 1760 820"><path id="${S}-div" pathLength="1000" d="M570 70 L570 750"/></svg>
  <div id="${S}-list">
${items.map((x, i) => `    <div class="${S}-row" id="${S}-n${i + 1}"><div class="${S}-lit" id="${S}-k${i + 1}"></div>
      <svg class="${S}-chk" viewBox="0 0 64 64"><circle class="${S}-trk" cx="32" cy="32" r="28"/><circle class="${S}-cir" id="${S}-o${i + 1}" pathLength="1000" cx="32" cy="32" r="28" transform="rotate(-90 32 32)"/><path id="${S}-c${i + 1}" pathLength="1000" d="M19 33 L28 42 L46 23"/></svg>
      <div class="${S}-txt" id="${S}-x${i + 1}">${esc(x)}</div><div class="${S}-num">${num(i)}</div></div>`).join("\n")}
  </div>
</div>`;
  m.push({ prim: "reveal", target: `#${S}-spark`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0, scale: 0.4 }, ease: "back.out(2)" });
  m.push({ prim: "draw", target: `#${S}-div`, at: w.a + 0.1, dur: 0.9 });
  m.push({ prim: "reveal", target: `#${S}-title`, at: tt, dur: 0.55, from: ctx.motionFrom(), ease: ctx.ease });
  items.forEach((_, i) => {
    const k = i + 1;
    m.push({ prim: "reveal", target: `#${S}-n${k}`, at: enter(i), dur: 0.45, from: { opacity: 0, x: 60 }, ease: ctx.ease });
    m.push({ prim: "draw", target: `#${S}-o${k}`, at: fit(t[i], 0.4), dur: 0.4 });
    m.push({ prim: "draw", target: `#${S}-c${k}`, at: fit(t[i] + 0.2, 0.35), dur: 0.35 });
    m.push({ prim: "reveal", target: `#${S}-k${k}`, at: fit(t[i], 0.4), dur: 0.4, from: { opacity: 0 } });
    m.push({ prim: "reveal", target: `#${S}-x${k}`, at: fit(t[i] + 0.05, 0.45), dur: 0.45, from: { opacity: 0, x: -24 } });
  });
  const drift = ctx.drift(`#${S}-list`, last + 0.6 + ctx.gap, 10);
  if (drift) m.push(drift);
  return { css, html, motions: m };
}
