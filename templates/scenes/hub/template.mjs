// hub — one centre and 3–8 satellites joined by spokes; a spark keeps moving so the frame never freezes.
// The centre and every satellite shell (cyan number, faint icon, outline) are on stage from the window start; on its
// keyword a satellite lights (label rises, icon brightens, gold outline) and its spoke is drawn from the centre.
// constellation: pills on an ellipse around a central disc, dashed orbits, a spark circling the inner orbit.
// orbit: the centre sits left inside a drawn ring; satellites are round badges on the ring's right arc; the spark
//   runs the ring.
// spokes: a large disc at the left; satellites are rows at the right, reached by curved spokes that a spark rides as
//   each row lights.

export const revealKeys = (slots) => ["center", ...slots.nodes.map((_, i) => `nodes.${i}`)];

const r1 = (x) => Math.round(x * 10) / 10;
const rad = (d) => (d * Math.PI) / 180;
const num = (i) => String(i + 1).padStart(2, "0");

/** points of an ellipse loop from angle a0 (deg), `per` points per loop, `loops` loops */
function loopPoints(cx, cy, rx, ry, a0, loops, per) {
  const pts = [];
  for (let k = 0; k <= loops * per; k++) {
    const a = rad(a0 + (360 * k) / per);
    pts.push([r1(cx + rx * Math.cos(a)), r1(cy + ry * Math.sin(a))]);
  }
  return pts;
}

/** a continuous spark around an ellipse from `from` to the shot end */
function spark(ctx, target, cx, cy, rx, ry, from, a0 = 180) {
  const dur = ctx.window.b - 0.05 - from;
  if (dur < 0.6) return [];
  const loops = Math.max(1, Math.round(dur / 4.5));
  return [{ prim: "orbit", target, points: loopPoints(cx, cy, rx, ry, a0, loops, 30), at: from, dur }];
}

export function render(ctx) {
  const { S, slots, esc, window: w, theme } = ctx;
  const nodes = slots.nodes;
  const n = nodes.length;
  const tc = ctx.at("center");
  const t = nodes.map((_, i) => ctx.at(`nodes.${i}`));
  const last = Math.max(tc, ...t);
  const mono = `"${theme.mono}", monospace`;
  const radius = theme.radius ?? 18;
  const m = [];
  const enter = (i) => Math.min(t[i], w.a + 0.15 + i * 0.07);
  // a follow-up tween that starts `d` s after a reveal still ends inside the window
  const fit = (at, dur) => Math.max(w.a, Math.min(at, w.b - dur - 0.05));
  // the centre lights: a gold ring flashes on, then widens and fades
  const flash = (scale) => [
    { prim: "reveal", target: `#${S}-cring`, at: fit(tc, 1.0), dur: 0.15, from: { opacity: 0, scale: 1 }, to: { opacity: 0.9, scale: 1 } },
    { prim: "reveal", target: `#${S}-cring`, at: fit(tc, 1.0) + 0.15 + ctx.gap + 0.01, dur: 0.75, from: { opacity: 0.9, scale: 1 }, to: { opacity: 0, scale }, ease: "power2.out" },
  ];

  const baseCss = `
#${S}-hub { position: absolute; inset: 0; }
#${S}-svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-spoke { fill: none; stroke: var(--cyan); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 1000; opacity: 0.8; }
.${S}-track { fill: none; stroke: color-mix(in srgb, var(--ink) 12%, transparent); stroke-width: 2; }
.${S}-dot { position: absolute; left: -10px; top: -10px; width: 20px; height: 20px; border-radius: 50%; background: var(--gold);
  box-shadow: 0 0 18px color-mix(in srgb, var(--gold) 70%, transparent); }
.${S}-num { font-family: ${mono}; font-size: 28px; font-weight: 700; color: var(--cyan); }
.${S}-lit { position: absolute; inset: -2px; border: 2px solid var(--gold); border-radius: inherit;
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--gold) 12%, transparent); }`;

  // ── spokes: disc left, rows right, a spark rides each curved spoke ─────────────
  if (ctx.variant === "spokes") {
    const cx = 330, cy = 390, R = 160;
    const g = Math.min(118, 740 / n), rh = Math.max(64, Math.min(92, g - 18));
    const ys = nodes.map((_, i) => r1(cy + (i - (n - 1) / 2) * g));
    const x0 = cx + R - 4, x1 = 900;
    const curve = (y) => `M${x0} ${cy} C${x0 + 230} ${cy} ${x1 - 230} ${y} ${x1} ${y}`;
    const bez = (y, s) => { const u = 1 - s; return [r1(u ** 3 * x0 + 3 * u * u * s * (x0 + 230) + 3 * u * s * s * (x1 - 230) + s ** 3 * x1), r1(u ** 3 * cy + 3 * u * u * s * cy + 3 * u * s * s * y + s ** 3 * y)]; };
    const css = `${baseCss}
#${S}-core { position: absolute; left: ${cx - R}px; top: ${cy - R}px; width: ${2 * R}px; height: ${2 * R}px; }
#${S}-disc { position: absolute; inset: 0; border-radius: 50%; background: var(--surface); border: 4px solid color-mix(in srgb, var(--gold) 45%, transparent);
  box-shadow: 0 0 0 16px color-mix(in srgb, var(--gold) 7%, transparent); }
#${S}-cin { position: absolute; left: ${R - 60}px; top: ${R - 60}px; width: 120px; height: 120px; color: var(--gold); }
#${S}-cin svg { width: 120px; height: 120px; }
#${S}-cring { position: absolute; left: ${cx - R}px; top: ${cy - R}px; width: ${2 * R}px; height: ${2 * R}px; border-radius: 50%; border: 4px solid var(--gold); }
#${S}-clab { position: absolute; left: 30px; top: ${cy + R + 34}px; width: 600px; text-align: center; font-size: 48px; font-weight: 800; color: var(--ink); }
.${S}-row { position: absolute; left: ${x1}px; width: 760px; height: ${rh}px; box-sizing: border-box; border-radius: ${Math.min(radius, 16)}px;
  background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); display: flex; align-items: center; gap: 22px; padding: 0 28px; }
.${S}-bar { position: absolute; left: -2px; top: -2px; bottom: -2px; width: 8px; border-radius: 4px; background: var(--gold); transform-origin: 50% 0; }
.${S}-ni { width: 46px; height: 46px; color: var(--gold); flex: none; }
.${S}-ni svg { width: 46px; height: 46px; }
.${S}-nl { font-size: ${n > 6 ? 34 : 38}px; font-weight: 800; color: var(--ink); white-space: nowrap; }
${ys.map((y, i) => `#${S}-n${i + 1} { top: ${r1(y - rh / 2)}px; }`).join("\n")}`;
    const html = `<div id="${S}-hub">
  <svg id="${S}-svg" viewBox="0 0 1760 820">
${ys.map((y, i) => `    <path class="${S}-track" id="${S}-tr${i + 1}" d="${curve(y)}"/>`).join("\n")}
${ys.map((y, i) => `    <path class="${S}-spoke" id="${S}-sp${i + 1}" pathLength="1000" d="${curve(y)}"/>`).join("\n")}
  </svg>
${ys.map((_, i) => `  <div class="${S}-dot" id="${S}-d${i + 1}"></div>`).join("\n")}
  <div id="${S}-cring"></div>
  <div id="${S}-core"><div id="${S}-disc"></div><div id="${S}-cin">${ctx.icon(slots.center.icon)}</div></div>
  <div id="${S}-clab">${esc(slots.center.label)}</div>
${nodes.map((it, i) => `  <div class="${S}-row" id="${S}-n${i + 1}">
    <div class="${S}-bar" id="${S}-nk${i + 1}"></div>
    <span class="${S}-num">${num(i)}</span>
    ${it.icon ? `<span class="${S}-ni" id="${S}-ni${i + 1}">${ctx.icon(it.icon)}</span>` : ""}
    <span class="${S}-nl" id="${S}-nl${i + 1}">${esc(it.label)}</span>
  </div>`).join("\n")}
</div>`;
    m.push({ prim: "reveal", target: `#${S}-core`, at: w.a + 0.05, dur: 0.6, from: { opacity: 0, scale: 0.7 }, ease: ctx.ease });
    m.push({ prim: "reveal", target: `#${S}-cin`, at: tc, dur: 0.5, from: { opacity: 0.3, scale: 0.8 }, ease: "back.out(2)" });
    m.push({ prim: "reveal", target: `#${S}-clab`, at: fit(tc + 0.1, 0.5), dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease });
    m.push(...flash(1.4));
    ys.forEach((y, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-tr${k}`, at: w.a + 0.1, dur: 0.6, from: { opacity: 0 } });
      m.push({ prim: "reveal", target: `#${S}-n${k}`, at: enter(i), dur: 0.45, from: { opacity: 0, x: 50 }, ease: ctx.ease });
      m.push({ prim: "draw", target: `#${S}-sp${k}`, at: fit(t[i], 0.5), dur: 0.5 });
      m.push({ prim: "orbit", target: `#${S}-d${k}`, points: [0, 0.2, 0.4, 0.6, 0.8, 1].map((s) => bez(y, s)), at: fit(t[i], 0.5), dur: 0.5 });
      m.push({ prim: "reveal", target: `#${S}-nk${k}`, at: fit(t[i] + 0.35, 0.4), dur: 0.4, from: { scaleY: 0 }, ease: "power2.out" });
      if (nodes[i].icon) m.push({ prim: "reveal", target: `#${S}-ni${k}`, at: fit(t[i] + 0.35, 0.4), dur: 0.4, from: { opacity: 0.3, scale: 0.8 }, ease: "back.out(2)" });
      m.push({ prim: "reveal", target: `#${S}-nl${k}`, at: fit(t[i] + 0.35, 0.4), dur: 0.45, from: { opacity: 0, x: -24 } });
    });
    const drift = ctx.drift(`#${S}-hub`, last + 0.85 + ctx.gap);
    if (drift) m.push(drift);
    return { css, html, motions: m };
  }

  // ── orbit: centre inside a drawn ring, badges on the right arc ─────────────────
  if (ctx.variant === "orbit") {
    const cx = 700, cy = 410, R = 330, D = 150, B = 92;
    const span = n <= 4 ? 110 : 140;
    const pts = nodes.map((_, i) => {
      const a = rad(-span / 2 + (span * i) / (n - 1));
      return [r1(cx + R * Math.cos(a)), r1(cy + R * Math.sin(a))];
    });
    const ring = `M${cx - R} ${cy} A${R} ${R} 0 1 1 ${cx + R} ${cy} A${R} ${R} 0 1 1 ${cx - R} ${cy}`;
    const css = `${baseCss}
#${S}-ring { fill: none; stroke: color-mix(in srgb, var(--ink) 22%, transparent); stroke-width: 3; stroke-dasharray: 1000; }
#${S}-halo { fill: none; stroke: color-mix(in srgb, var(--gold) 14%, transparent); stroke-width: 2; stroke-dasharray: 5 12; }
#${S}-core { position: absolute; left: ${cx - D}px; top: ${cy - D}px; width: ${2 * D}px; height: ${2 * D}px; }
#${S}-disc { position: absolute; inset: 0; border-radius: 50%; background: var(--surface); border: 4px solid var(--gold);
  box-shadow: 0 0 0 16px color-mix(in srgb, var(--gold) 8%, transparent); }
#${S}-cin { position: absolute; left: ${D - 44}px; top: 44px; width: 88px; height: 88px; color: var(--gold); }
#${S}-cin svg { width: 88px; height: 88px; }
#${S}-clab { position: absolute; left: 30px; top: 144px; width: ${2 * D - 60}px; text-align: center; font-size: 36px; font-weight: 800;
  line-height: 1.12; color: var(--ink); }
#${S}-cring { position: absolute; left: ${cx - D}px; top: ${cy - D}px; width: ${2 * D}px; height: ${2 * D}px; border-radius: 50%; border: 4px solid var(--gold); }
.${S}-badge { position: absolute; width: ${B}px; height: ${B}px; box-sizing: border-box; border-radius: 50%; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--ink) 18%, transparent); display: flex; align-items: center; justify-content: center; }
.${S}-ni { width: 48px; height: 48px; color: var(--gold); }
.${S}-ni svg { width: 48px; height: 48px; }
.${S}-tag { position: absolute; height: 52px; display: flex; align-items: center; gap: 14px; white-space: nowrap; }
.${S}-nl { font-size: 36px; font-weight: 800; color: var(--ink); }
${pts.map(([x, y], i) => `#${S}-n${i + 1} { left: ${r1(x - B / 2)}px; top: ${r1(y - B / 2)}px; }
#${S}-g${i + 1} { left: ${r1(x + B / 2 + 22)}px; top: ${r1(y - 26)}px; }`).join("\n")}`;
    const html = `<div id="${S}-hub">
  <svg id="${S}-svg" viewBox="0 0 1760 820">
    <circle id="${S}-halo" cx="${cx}" cy="${cy}" r="${R + 46}"/>
    <path id="${S}-ring" pathLength="1000" d="${ring}"/>
${pts.map(([x, y], i) => `    <path class="${S}-spoke" id="${S}-sp${i + 1}" pathLength="1000" d="M${cx} ${cy} L${x} ${y}"/>`).join("\n")}
  </svg>
  <div class="${S}-dot" id="${S}-dot"></div>
  <div id="${S}-cring"></div>
  <div id="${S}-core"><div id="${S}-disc"></div><div id="${S}-cin">${ctx.icon(slots.center.icon)}</div>
    <div id="${S}-clab">${esc(slots.center.label)}</div></div>
${nodes.map((it, i) => `  <div class="${S}-badge" id="${S}-n${i + 1}"><div class="${S}-lit" id="${S}-nk${i + 1}"></div>${it.icon
      ? `<span class="${S}-ni" id="${S}-ni${i + 1}">${ctx.icon(it.icon)}</span>` : `<span class="${S}-num">${num(i)}</span>`}</div>
  <div class="${S}-tag" id="${S}-g${i + 1}">${it.icon ? `<span class="${S}-num">${num(i)}</span>` : ""}<span class="${S}-nl" id="${S}-nl${i + 1}">${esc(it.label)}</span></div>`).join("\n")}
</div>`;
    m.push({ prim: "draw", target: `#${S}-ring`, at: w.a + 0.05, dur: 1.0 });
    m.push({ prim: "reveal", target: `#${S}-halo`, at: w.a + 0.2, dur: 0.8, from: { opacity: 0 } });
    m.push({ prim: "reveal", target: `#${S}-core`, at: w.a + 0.1, dur: 0.6, from: { opacity: 0, scale: 0.7 }, ease: ctx.ease });
    m.push({ prim: "reveal", target: `#${S}-cin`, at: tc, dur: 0.5, from: { opacity: 0.3, scale: 0.8 }, ease: "back.out(2)" });
    m.push({ prim: "reveal", target: `#${S}-clab`, at: fit(tc + 0.1, 0.5), dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease });
    m.push(...flash(1.35));
    m.push(...spark(ctx, `#${S}-dot`, cx, cy, R, R, w.a + 0.3));
    pts.forEach((_, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-n${k}`, at: enter(i), dur: 0.45, from: { opacity: 0, scale: 0.6 }, ease: ctx.ease });
      m.push({ prim: "draw", target: `#${S}-sp${k}`, at: fit(t[i], 0.45), dur: 0.45 });
      m.push({ prim: "reveal", target: `#${S}-nk${k}`, at: fit(t[i] + 0.3, 0.4), dur: 0.4, from: { opacity: 0 } });
      if (nodes[i].icon) {
        m.push({ prim: "reveal", target: `#${S}-g${k}`, at: enter(i) + 0.1, dur: 0.4, from: { opacity: 0 }, to: { opacity: 1 } });
        m.push({ prim: "reveal", target: `#${S}-ni${k}`, at: fit(t[i] + 0.3, 0.4), dur: 0.4, from: { opacity: 0.3, scale: 0.8 }, ease: "back.out(2)" });
      }
      m.push({ prim: "reveal", target: `#${S}-nl${k}`, at: fit(t[i] + 0.3, 0.4), dur: 0.45, from: { opacity: 0, x: -24 } });
    });
    const drift = ctx.drift(`#${S}-hub`, last + 0.8 + ctx.gap);
    if (drift) m.push(drift);
    return { css, html, motions: m };
  }

  // ── constellation (signature): pills on an ellipse around a central disc ───────
  const cx = 880, cy = 400, R = 115;
  const pts = nodes.map((_, i) => {
    const a = rad(-90 + 180 / n + (360 * i) / n);
    const j = 1 + (ctx.rng() - 0.5) * 0.08;
    return [r1(cx + 600 * j * Math.cos(a)), r1(cy + 285 * j * Math.sin(a))];
  });
  const css = `${baseCss}
.${S}-orb { fill: none; stroke: color-mix(in srgb, var(--ink) 16%, transparent); stroke-width: 2; stroke-dasharray: 6 14; }
#${S}-core { position: absolute; left: ${cx - R}px; top: ${cy - R}px; width: ${2 * R}px; height: ${2 * R}px; }
#${S}-disc { position: absolute; inset: 0; border-radius: 50%; background: var(--surface); border: 4px solid var(--gold);
  box-shadow: 0 0 0 14px color-mix(in srgb, var(--gold) 8%, transparent); }
#${S}-cin { position: absolute; left: ${R - 56}px; top: ${R - 56}px; width: 112px; height: 112px; color: var(--gold); }
#${S}-cin svg { width: 112px; height: 112px; }
#${S}-cring { position: absolute; left: ${cx - R}px; top: ${cy - R}px; width: ${2 * R}px; height: ${2 * R}px; border-radius: 50%; border: 4px solid var(--gold); }
#${S}-clab { position: absolute; left: ${cx - 320}px; top: ${cy + R + 22}px; width: 640px; text-align: center; font-family: ${mono};
  font-size: 34px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--gold); }
/* solid backing: the spokes run behind the label instead of through its letters */
#${S}-clab span { display: inline-block; padding: 4px 26px; border-radius: ${radius}px; background: var(--surface); }
.${S}-anc { position: absolute; width: 0; height: 0; }
.${S}-pill { position: absolute; left: 0; top: 0; transform: translate(-50%, -50%); display: flex; align-items: center; gap: 16px;
  padding: 16px 28px; border-radius: ${radius}px; background: var(--surface); border: 2px solid color-mix(in srgb, var(--cyan) 30%, transparent);
  white-space: nowrap; }
.${S}-ni { width: 44px; height: 44px; color: var(--cyan); }
.${S}-ni svg { width: 44px; height: 44px; }
.${S}-nl { font-size: 38px; font-weight: 800; color: var(--ink); }
${pts.map(([x, y], i) => `#${S}-n${i + 1} { left: ${x}px; top: ${y}px; }`).join("\n")}`;
  const html = `<div id="${S}-hub">
  <svg id="${S}-svg" viewBox="0 0 1760 820">
    <ellipse class="${S}-orb" id="${S}-o1" cx="${cx}" cy="${cy}" rx="600" ry="285"/>
    <ellipse class="${S}-orb" id="${S}-o2" cx="${cx}" cy="${cy}" rx="420" ry="200"/>
${pts.map(([x, y], i) => `    <path class="${S}-spoke" id="${S}-sp${i + 1}" pathLength="1000" d="M${cx} ${cy} L${x} ${y}"/>`).join("\n")}
  </svg>
  <div class="${S}-dot" id="${S}-dot"></div>
  <div id="${S}-cring"></div>
  <div id="${S}-core"><div id="${S}-disc"></div><div id="${S}-cin">${ctx.icon(slots.center.icon)}</div></div>
  <div id="${S}-clab"><span>${esc(slots.center.label)}</span></div>
${nodes.map((it, i) => `  <div class="${S}-anc" id="${S}-n${i + 1}"><div class="${S}-pill"><div class="${S}-lit" id="${S}-nk${i + 1}"></div>
    <span class="${S}-num">${num(i)}</span>${it.icon ? `<span class="${S}-ni" id="${S}-ni${i + 1}">${ctx.icon(it.icon)}</span>` : ""}<span class="${S}-nl" id="${S}-nl${i + 1}">${esc(it.label)}</span></div></div>`).join("\n")}
</div>`;
  m.push({ prim: "reveal", target: `#${S}-o1`, at: w.a + 0.05, dur: 0.8, from: { opacity: 0 } });
  m.push({ prim: "reveal", target: `#${S}-o2`, at: w.a + 0.15, dur: 0.8, from: { opacity: 0 } });
  m.push({ prim: "reveal", target: `#${S}-core`, at: w.a + 0.05, dur: 0.6, from: { opacity: 0, scale: 0.7 }, ease: ctx.ease });
  m.push({ prim: "reveal", target: `#${S}-cin`, at: tc, dur: 0.5, from: { opacity: 0.3, scale: 0.8 }, ease: "back.out(2)" });
  m.push({ prim: "reveal", target: `#${S}-clab`, at: fit(tc + 0.1, 0.5), dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease });
  m.push(...flash(1.45));
  m.push(...spark(ctx, `#${S}-dot`, cx, cy, 420, 200, w.a + 0.3));
  pts.forEach((_, i) => {
    const k = i + 1;
    m.push({ prim: "reveal", target: `#${S}-n${k}`, at: enter(i), dur: 0.45, from: { opacity: 0, scale: 0.8 }, ease: ctx.ease });
    m.push({ prim: "draw", target: `#${S}-sp${k}`, at: fit(t[i], 0.45), dur: 0.45 });
    m.push({ prim: "reveal", target: `#${S}-nk${k}`, at: fit(t[i] + 0.3, 0.4), dur: 0.4, from: { opacity: 0 } });
    if (nodes[i].icon) m.push({ prim: "reveal", target: `#${S}-ni${k}`, at: fit(t[i] + 0.3, 0.4), dur: 0.4, from: { opacity: 0.3, scale: 0.8 }, ease: "back.out(2)" });
    m.push({ prim: "reveal", target: `#${S}-nl${k}`, at: fit(t[i] + 0.3, 0.4), dur: 0.45, from: { opacity: 0, y: 14 } });
  });
  const drift = ctx.drift(`#${S}-hub`, last + 0.8 + ctx.gap);
  if (drift) m.push(drift);
  return { css, html, motions: m };
}
