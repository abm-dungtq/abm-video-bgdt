// journey — 3–6 stops on a route. The whole route is on stage from the window start as a faint dashed track with
// numbered, outlined stops; on each keyword the next leg is drawn, a spark runs along it, and the stop lights (gold
// disc, label rises). `current` marks "you are here" with a pulsing gold halo.
// stations: a straight line with stops, big cyan numbers above and labels below.
// timeline: a vertical line at the left third; numbers left of it, labels and notes to the right.
// path (signature): a winding S-curve across the stage; labels alternate above and below.

export const revealKeys = (slots) => slots.stops.map((_, i) => `stops.${i}`);

const r1 = (x) => Math.round(x * 10) / 10;
const num = (i) => String(i + 1).padStart(2, "0");

export function render(ctx) {
  const { S, slots, esc, window: w, theme } = ctx;
  const stops = slots.stops;
  const n = stops.length;
  const t = stops.map((_, i) => ctx.at(`stops.${i}`));
  const last = Math.max(...t);
  const cur = Number.isInteger(slots.current) && slots.current < n ? slots.current : null;
  const mono = `"${theme.mono}", monospace`;
  const fit = (at, dur) => Math.max(w.a, Math.min(at, w.b - dur - 0.05));
  const v = ctx.variant;

  // ── geometry: stop centres, leg paths (i-1 → i) and a sampler for the spark ────
  let pts, leg, sample, D;
  if (v === "timeline") {
    const g = Math.min(140, 720 / n);
    pts = stops.map((_, i) => [760, r1(410 + (i - (n - 1) / 2) * g)]);
    D = 48;
    leg = (i) => `M${pts[i - 1][0]} ${pts[i - 1][1]} L${pts[i][0]} ${pts[i][1]}`;
    sample = (i, s) => [pts[i][0], r1(pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * s)];
  } else if (v === "stations") {
    const dx = 1400 / (n - 1);
    pts = stops.map((_, i) => [r1(180 + i * dx), 340]);
    D = 72;
    leg = (i) => `M${pts[i - 1][0]} ${pts[i - 1][1]} L${pts[i][0]} ${pts[i][1]}`;
    sample = (i, s) => [r1(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * s), pts[i][1]];
  } else {
    const dx = 1400 / (n - 1);
    pts = stops.map((_, i) => [r1(180 + i * dx), i % 2 ? 540 : 300]);
    D = 64;
    leg = (i) => { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = r1((x0 + x1) / 2); return `M${x0} ${y0} C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`; };
    sample = (i, s) => {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i], mx = (x0 + x1) / 2, u = 1 - s;
      return [r1(u ** 3 * x0 + 3 * u * u * s * mx + 3 * u * s * s * mx + s ** 3 * x1), r1(u ** 3 * y0 + 3 * u * u * s * y0 + 3 * u * s * s * y1 + s ** 3 * y1)];
    };
  }
  const track = pts.slice(1).map((_, k) => leg(k + 1)).join(" ");

  // ── labels per variant ─────────────────────────────────────────────────────────
  let labelCss;
  const lw = v === "timeline" ? 880 : Math.min(560, (v === "path" ? 2 : 1) * (1400 / (n - 1)) - 24);
  const fs = v === "timeline" ? (n > 5 ? 44 : 48) : v === "path" ? (n > 5 ? 36 : 40) : (n > 5 ? 32 : n > 4 ? 36 : 40);
  // a label box centred under its stop, kept inside the stage (aligned to the edge it would cross)
  const box = (x) => {
    const left = r1(Math.max(0, Math.min(1760 - lw, x - lw / 2)));
    if (x - lw / 2 < 0) return `left: 0px; width: ${lw}px; text-align: left; box-sizing: border-box; padding-left: ${Math.max(0, r1(x - 60))}px;`;
    if (x + lw / 2 > 1760) return `left: ${left}px; width: ${lw}px; text-align: right; box-sizing: border-box; padding-right: ${Math.max(0, r1(1700 - x))}px;`;
    return `left: ${left}px; width: ${lw}px; text-align: center;`;
  };
  if (v === "timeline") {
    labelCss = pts.map(([x, y], i) => `#${S}-t${i + 1} { left: ${x + 60}px; top: ${r1(y - (stops[i].note ? 50 : 30))}px; width: ${lw}px; text-align: left; }
#${S}-q${i + 1} { left: ${x - 200}px; top: ${r1(y - 26)}px; width: 120px; text-align: right; }`).join("\n");
  } else if (v === "stations") {
    labelCss = pts.map(([x, y], i) => `#${S}-t${i + 1} { ${box(x)} top: ${y + D / 2 + 30}px; }
#${S}-q${i + 1} { left: ${r1(x - 60)}px; top: ${y - D / 2 - 92}px; width: 120px; text-align: center; font-size: 56px; }`).join("\n");
  } else {
    labelCss = pts.map(([x, y], i) => i % 2
      ? `#${S}-t${i + 1} { ${box(x)} top: ${y + D / 2 + 26}px; }`
      : `#${S}-t${i + 1} { ${box(x)} bottom: ${820 - (y - D / 2 - 26)}px; }`).join("\n");
  }
  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-track { fill: none; stroke: color-mix(in srgb, var(--ink) 22%, transparent); stroke-width: 3; stroke-dasharray: 4 14; stroke-linecap: round; }
.${S}-leg { fill: none; stroke: var(--gold); stroke-width: ${v === "timeline" ? 6 : 8}; stroke-linecap: round; stroke-dasharray: 1000; }
.${S}-stop { position: absolute; width: ${D}px; height: ${D}px; box-sizing: border-box; border-radius: 50%; background: var(--surface);
  border: 3px solid color-mix(in srgb, var(--cyan) 55%, transparent); display: flex; align-items: center; justify-content: center;
  font-family: ${mono}; font-size: 28px; font-weight: 700; color: var(--cyan); }
.${S}-lit { position: absolute; inset: -3px; border-radius: 50%; background: var(--gold); display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 24px color-mix(in srgb, var(--gold) 50%, transparent); }
.${S}-lit svg { width: ${Math.round(D * 0.55)}px; height: ${Math.round(D * 0.55)}px; color: var(--canvas); }
.${S}-halo { position: absolute; width: ${D + 56}px; height: ${D + 56}px; box-sizing: border-box; border-radius: 50%; border: 4px solid var(--gold);
  box-shadow: 0 0 0 10px color-mix(in srgb, var(--gold) 12%, transparent); }
.${S}-dot { position: absolute; left: -11px; top: -11px; width: 22px; height: 22px; border-radius: 50%; background: var(--ink);
  box-shadow: 0 0 20px color-mix(in srgb, var(--gold) 80%, transparent); }
.${S}-txt { position: absolute; }
.${S}-lab { font-size: ${fs}px; font-weight: 800; line-height: 1.15; color: var(--ink); }
.${S}-note { margin-top: 10px; font-size: 28px; font-weight: 500; line-height: 1.3; color: var(--muted); }
.${S}-q { position: absolute; font-family: ${mono}; font-size: 44px; font-weight: 700; color: var(--cyan); }
${pts.map(([x, y], i) => `#${S}-s${i + 1} { left: ${r1(x - D / 2)}px; top: ${r1(y - D / 2)}px; }`).join("\n")}
${cur != null ? `#${S}-halo { left: ${r1(pts[cur][0] - D / 2 - 28)}px; top: ${r1(pts[cur][1] - D / 2 - 28)}px; }` : ""}
${labelCss}
${v === "timeline" ? `#${S}-gauge { position: absolute; left: 110px; top: 220px; width: 380px; height: 380px; overflow: visible; }
#${S}-gtrack { fill: none; stroke: color-mix(in srgb, var(--ink) 12%, transparent); stroke-width: 22; stroke-dasharray: 1000; }
.${S}-arc { fill: none; stroke: var(--gold); stroke-width: 22; stroke-dasharray: 1000; }
#${S}-cnt { position: absolute; left: 110px; top: 322px; width: 380px; text-align: center; font-family: ${mono}; font-size: 128px;
  font-weight: 700; line-height: 1; color: var(--gold); }
#${S}-of { position: absolute; left: 110px; top: 462px; width: 380px; text-align: center; font-family: ${mono}; font-size: 36px; color: var(--muted); }` : ""}`;
  // progress gauge (timeline): one arc per stop around a 170 px ring, 4° gaps, clockwise from the top
  const arc = (i) => {
    const a0 = -90 + (360 * i) / n + 2, a1 = -90 + (360 * (i + 1)) / n - 2, rr = 170;
    const p = (a) => `${r1(190 + rr * Math.cos((a * Math.PI) / 180))} ${r1(190 + rr * Math.sin((a * Math.PI) / 180))}`;
    return `M${p(a0)} A${rr} ${rr} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${p(a1)}`;
  };
  const html = `<div id="${S}-root">
  <svg id="${S}-svg" viewBox="0 0 1760 820">
    <path id="${S}-track" d="${track}"/>
${pts.slice(1).map((_, k) => `    <path class="${S}-leg" id="${S}-g${k + 2}" pathLength="1000" d="${leg(k + 1)}"/>`).join("\n")}
  </svg>
${v === "timeline" ? `  <svg id="${S}-gauge" viewBox="0 0 380 380">
    <circle id="${S}-gtrack" pathLength="1000" cx="190" cy="190" r="170"/>
${stops.map((_, i) => `    <path class="${S}-arc" id="${S}-a${i + 1}" pathLength="1000" d="${arc(i)}"/>`).join("\n")}
  </svg>
  <div id="${S}-cnt">0</div>
  <div id="${S}-of">/ ${n}</div>` : ""}
  <div class="${S}-dot" id="${S}-dot"></div>
${cur != null ? `  <div class="${S}-halo" id="${S}-halo"></div>` : ""}
${stops.map((s, i) => `  <div class="${S}-stop" id="${S}-s${i + 1}">${v === "path" ? num(i) : ""}<div class="${S}-lit" id="${S}-k${i + 1}">${ctx.icon(i === cur ? "target" : "check")}</div></div>
${v === "path" ? "" : `  <div class="${S}-q" id="${S}-q${i + 1}">${num(i)}</div>`}
  <div class="${S}-txt" id="${S}-t${i + 1}"><div class="${S}-lab" id="${S}-l${i + 1}">${esc(s.label)}</div>${s.note ? `<div class="${S}-note" id="${S}-o${i + 1}">${esc(s.note)}</div>` : ""}</div>`).join("\n")}
</div>`;

  const m = [{ prim: "reveal", target: `#${S}-track`, at: w.a + 0.05, dur: 0.7, from: { opacity: 0 } }];
  // stops enter as outlined, numbered shells; they light on their keyword
  stops.forEach((s, i) => {
    const k = i + 1;
    const enter = Math.min(t[i], w.a + 0.1 + i * 0.08);
    m.push({ prim: "reveal", target: `#${S}-s${k}`, at: enter, dur: 0.45, from: { opacity: 0, scale: 0.5 }, ease: ctx.ease });
    if (v !== "path") m.push({ prim: "reveal", target: `#${S}-q${k}`, at: enter + 0.1, dur: 0.4, from: { opacity: 0, y: 12 } });
    m.push({ prim: "reveal", target: `#${S}-k${k}`, at: fit(t[i], 0.45), dur: 0.45, from: { opacity: 0, scale: 0.3 }, ease: "back.out(2)" });
    m.push({ prim: "reveal", target: `#${S}-l${k}`, at: fit(t[i] + 0.05, 0.5), dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease });
    if (s.note) m.push({ prim: "reveal", target: `#${S}-o${k}`, at: fit(t[i] + 0.2, 0.45), dur: 0.45, from: { opacity: 0 } });
  });
  if (v === "timeline") {
    m.push({ prim: "draw", target: `#${S}-gtrack`, at: w.a + 0.05, dur: 0.9 });
    m.push({ prim: "reveal", target: `#${S}-cnt`, at: w.a + 0.15, dur: 0.5, from: { opacity: 0, scale: 0.7 }, ease: ctx.ease });
    m.push({ prim: "reveal", target: `#${S}-of`, at: w.a + 0.3, dur: 0.4, from: { opacity: 0 } });
    stops.forEach((_, i) => {
      m.push({ prim: "draw", target: `#${S}-a${i + 1}`, at: fit(t[i], 0.45), dur: 0.45 });
      m.push({ prim: "swap", target: `#${S}-cnt`, at: Math.max(w.a + 0.7, fit(t[i] + 0.1, 0)), props: { textContent: String(i + 1) } });
    });
  }
  // legs: drawn just before each stop lights; the spark rides a leg when the previous ride has finished
  let free = w.a;
  for (let i = 1; i < n; i++) {
    const start = Math.max(w.a + 0.05, t[i] - 0.3);
    const dur = Math.max(0.12, Math.min(0.45, w.b - 0.05 - start));
    m.push({ prim: "draw", target: `#${S}-g${i + 1}`, at: start, dur });
    if (start >= free + ctx.gap + 0.01 && dur >= 0.2) {
      m.push({ prim: "orbit", target: `#${S}-dot`, points: [0, 0.2, 0.4, 0.6, 0.8, 1].map((s) => sample(i, s)), at: start, dur });
      free = start + dur;
    }
  }
  // "you are here"
  if (cur != null) {
    const on = fit(t[cur] + 0.3, 0.5);
    m.push({ prim: "reveal", target: `#${S}-halo`, at: on, dur: 0.5, from: { opacity: 0, scale: 1.6 }, to: { opacity: 1, scale: 1 }, ease: "power3.out" });
    const p = on + 0.5 + ctx.gap + 0.01;
    if (w.b - 0.05 - p >= 1.2) m.push({ prim: "pulse", target: `#${S}-halo`, at: p, dur: w.b - 0.05 - p });
  }
  const drift = ctx.drift(`#${S}-root`, last + 0.7 + ctx.gap);
  if (drift) m.push(drift);
  // no ride fitted (a very short shot): leave the spark out rather than parked at the stage corner
  const rides = m.some((x) => x.prim === "orbit");
  return { css, html: rides ? html : html.replace(`<div class="${S}-dot" id="${S}-dot"></div>`, ""), motions: m };
}
