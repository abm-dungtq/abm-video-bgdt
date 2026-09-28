// screen — a screenshot (assets/screens/…) or, for "placeholder", a neutral mock browser window. The window frame is
// on stage at the window start; the picture fades in on "image", the optional region is outlined and the rest dimmed,
// callout pins pop on their keywords and steps light one by one.
// focus (signature): the screenshot fills the stage; the camera pushes in on the region; steps float in a panel.
// steps: the screenshot at the left, a numbered step list at the right joined by a line that fills as steps light.
// callout: a smaller screenshot in the middle; callouts are cards in the side columns joined to their pins by
//   drawn leader lines; steps are chips under the screenshot.
// Callout, region and pin coordinates are fractions (0–1) of the screenshot.

export const revealKeys = (slots) => [
  "image",
  ...(slots.callouts ?? []).map((_, i) => `callouts.${i}`),
  ...(slots.steps ?? []).map((_, i) => `steps.${i}`),
];

const r1 = (x) => Math.round(x * 10) / 10;
const pc = (f) => `${r1(f * 100)}%`;
const num = (i) => String(i + 1).padStart(2, "0");

export function render(ctx) {
  const { S, slots, esc, window: w, theme } = ctx;
  const v = ctx.variant;
  const calls = slots.callouts ?? [];
  const steps = slots.steps ?? [];
  const reg = slots.region ?? null;
  const ta = ctx.at("image");
  const tc = calls.map((_, i) => ctx.at(`callouts.${i}`));
  const ts = steps.map((_, i) => ctx.at(`steps.${i}`));
  const last = Math.max(ta, ...tc, ...ts);
  const mono = `"${theme.mono}", monospace`;
  const fit = (at, dur) => Math.max(w.a, Math.min(at, w.b - dur - 0.05));
  const box = v === "steps" ? { x: 0, y: 84, w: 1180, h: 664 } : v === "callout" ? { x: 360, y: 40, w: 1040, h: 585 } : { x: 180, y: 16, w: 1400, h: 788 };
  const m = [];

  // ── the picture: a real screenshot, or a mock browser window ─────────────────
  const shot = slots.image === "placeholder"
    ? `<div class="${S}-mock" id="${S}-shot">
      <div class="${S}-mbar"><span class="${S}-mdot"></span><span class="${S}-mdot"></span><span class="${S}-mdot"></span><span class="${S}-murl"></span></div>
      <div class="${S}-mside">${[0, 1, 2, 3, 4, 5].map(() => `<span class="${S}-mrow"></span>`).join("")}</div>
      <div class="${S}-mhead"></div>
      <div class="${S}-minput"><span class="${S}-mline"></span><span class="${S}-mbtn"></span></div>
      <div class="${S}-mcards"><span class="${S}-mcard"></span><span class="${S}-mcard"></span><span class="${S}-mcard"></span></div>
    </div>`
    : `<img class="${S}-img" id="${S}-shot" src="${esc(slots.image)}" alt="">`;
  const shade = (k) => `color-mix(in srgb, var(--ink) ${Math.round(k * 1.6)}%, var(--surface))`;
  const mockCss = `
.${S}-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.${S}-mock { position: absolute; inset: 0; background: ${shade(3)}; }
.${S}-mbar { position: absolute; left: 0; top: 0; right: 0; height: 7%; background: ${shade(8)}; display: flex; align-items: center; gap: 1.2%; padding-left: 2%; }
.${S}-mdot { width: 1.1%; aspect-ratio: 1; border-radius: 50%; background: color-mix(in srgb, var(--muted) 60%, transparent); }
.${S}-murl { margin-left: 18%; width: 40%; height: 44%; border-radius: 99px; background: ${shade(4)}; }
.${S}-mside { position: absolute; left: 0; top: 7%; bottom: 0; width: 16%; background: ${shade(6)}; display: flex; flex-direction: column; gap: 4%; padding: 3% 1.6%; box-sizing: border-box; }
.${S}-mrow { height: 3.4%; border-radius: 6px; background: ${shade(13)}; }
.${S}-mrow:nth-child(odd) { width: 72%; }
.${S}-mhead { position: absolute; left: 36%; top: 30%; width: 28%; height: 4.5%; border-radius: 10px; background: ${shade(16)}; }
.${S}-minput { position: absolute; left: 30%; top: 41%; width: 40%; height: 12%; box-sizing: border-box; border-radius: 16px; background: ${shade(9)};
  border: 2px solid ${shade(18)}; }
.${S}-mline { position: absolute; left: 5%; top: 24%; width: 46%; height: 16%; border-radius: 6px; background: ${shade(20)}; }
.${S}-mbtn { position: absolute; right: 3%; bottom: 14%; width: 7%; aspect-ratio: 1; border-radius: 10px; background: color-mix(in srgb, var(--gold) 55%, var(--surface)); }
.${S}-mcards { position: absolute; left: 30%; top: 60%; width: 40%; height: 12%; display: flex; gap: 3%; }
.${S}-mcard { flex: 1; border-radius: 12px; background: ${shade(7)}; border: 2px solid ${shade(11)}; }`;

  // ── region outline (px inside the frame) and callout pins (inside the zoom layer) ──
  const rr = reg && { x: r1(reg.x * box.w), y: r1(reg.y * box.h), w: r1(reg.w * box.w), h: r1(reg.h * box.h) };
  const rect = rr && (() => {
    const k = Math.min(16, rr.w / 4, rr.h / 4), { x, y, w: rw, h: rh } = rr;
    return `M${r1(x + k)} ${y} H${r1(x + rw - k)} Q${r1(x + rw)} ${y} ${r1(x + rw)} ${r1(y + k)} V${r1(y + rh - k)} Q${r1(x + rw)} ${r1(y + rh)} ${r1(x + rw - k)} ${r1(y + rh)} H${r1(x + k)} Q${x} ${r1(y + rh)} ${x} ${r1(y + rh - k)} V${r1(y + k)} Q${x} ${y} ${r1(x + k)} ${y}`;
  })();
  const pinLabels = v !== "callout";
  // a pin label points away from the middle, unless the pin is too near that edge for the label to fit
  const labelLeft = (x) => (x < 0.5 ? x >= 0.22 : x > 0.78);
  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-frame { position: absolute; left: ${box.x}px; top: ${box.y}px; width: ${box.w}px; height: ${box.h}px; box-sizing: border-box; overflow: hidden;
  border-radius: 16px; background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 16%, transparent);
  box-shadow: 0 24px 60px color-mix(in srgb, var(--canvas) 70%, transparent); }
#${S}-zoom { position: absolute; inset: 0; transform-origin: ${reg ? `${pc(reg.x + reg.w / 2)} ${pc(reg.y + reg.h / 2)}` : "50% 50%"}; }
${mockCss}
#${S}-spot { position: absolute; ${rr ? `left: ${rr.x}px; top: ${rr.y}px; width: ${rr.w}px; height: ${rr.h}px;` : ""} border-radius: 16px;
  box-shadow: 0 0 0 3000px color-mix(in srgb, var(--canvas) 55%, transparent); }
#${S}-rsvg { position: absolute; left: 0; top: 0; width: ${box.w}px; height: ${box.h}px; overflow: visible; }
#${S}-rect { fill: none; stroke: var(--gold); stroke-width: 5; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-pin { position: absolute; width: 0; height: 0; }
.${S}-dot { position: absolute; left: -14px; top: -14px; width: 28px; height: 28px; box-sizing: border-box; border-radius: 50%; background: var(--gold);
  border: 5px solid color-mix(in srgb, var(--gold) 40%, var(--canvas)); box-shadow: 0 0 0 10px color-mix(in srgb, var(--gold) 22%, transparent); }
.${S}-lbl { position: absolute; top: -28px; height: 56px; box-sizing: border-box; display: flex; align-items: center; gap: 10px; padding: 0 20px;
  white-space: nowrap; border-radius: 12px; background: var(--surface); border: 2px solid var(--gold); font-size: 30px; font-weight: 800; color: var(--ink); }
.${S}-lbl.${S}-r { left: 30px; }
.${S}-lbl.${S}-l { right: 30px; }
.${S}-num { font-family: ${mono}; font-size: 28px; font-weight: 700; color: var(--cyan); }
${calls.map((c, i) => `#${S}-p${i + 1} { left: ${pc(c.x)}; top: ${pc(c.y)}; }`).join("\n")}`;
  const pins = calls.map((c, i) => `        <div class="${S}-pin" id="${S}-p${i + 1}"><div class="${S}-dot" id="${S}-d${i + 1}"></div>${pinLabels
    ? `<div class="${S}-lbl ${S}-${labelLeft(c.x) ? "l" : "r"}" id="${S}-b${i + 1}">${esc(c.label)}</div>` : ""}</div>`).join("\n");
  const frame = `  <div id="${S}-frame">
    <div id="${S}-zoom">
      ${shot}
${rr ? `      <div id="${S}-spot"></div>
      <svg id="${S}-rsvg" viewBox="0 0 ${box.w} ${box.h}"><path id="${S}-rect" pathLength="1000" d="${rect}"/></svg>` : ""}
${pins}
    </div>
  </div>`;

  // shared motions: frame, picture, region, pins
  const rg = tc.length ? tc[0] : fit(ta + 0.8, 0.6);
  m.push({ prim: "reveal", target: `#${S}-frame`, at: w.a + 0.05, dur: 0.6, from: { opacity: 0, scale: 0.96 }, ease: ctx.ease });
  m.push({ prim: "reveal", target: `#${S}-shot`, at: ta, dur: 0.6, from: { opacity: 0 } });
  if (rr) {
    m.push({ prim: "reveal", target: `#${S}-spot`, at: fit(rg, 0.5), dur: 0.5, from: { opacity: 0 } });
    m.push({ prim: "draw", target: `#${S}-rect`, at: fit(rg, 0.6), dur: 0.6 });
  }
  calls.forEach((_, i) => {
    m.push({ prim: "reveal", target: `#${S}-d${i + 1}`, at: fit(tc[i], 0.45), dur: 0.45, from: { opacity: 0, scale: 0.3 }, ease: "back.out(2.4)" });
    if (pinLabels) m.push({ prim: "reveal", target: `#${S}-b${i + 1}`, at: fit(tc[i] + 0.1, 0.45), dur: 0.45, from: { opacity: 0, y: 12 }, ease: ctx.ease });
  });
  // camera: push in on the region (focus), else a slow drift in scale
  // the push-in stops before any pin would leave the frame (5 % margin); too little room -> a slow drift in scale
  let zPush = 0;
  if (v === "focus" && rr) {
    const ox = reg.x + reg.w / 2, oy = reg.y + reg.h / 2;
    const room = (p, o) => (p > o + 1e-3 ? (0.95 - o) / (p - o) : p < o - 1e-3 ? (o - 0.05) / (o - p) : 9);
    zPush = Math.min(1.45, Math.max(1.15, 0.55 / Math.max(reg.w, reg.h)), ...calls.map((c) => Math.min(room(c.x, ox), room(c.y, oy))));
  }
  const push = zPush >= 1.1;
  const zFrom = push ? fit(rg + 0.3, 1.2) : fit(ta + 0.6, 0.8);
  const zDur = Math.min(push ? 1.2 : 99, w.b - 0.05 - zFrom);
  if (v !== "callout" && zDur >= 0.4) {
    const z = push ? zPush : 1.05;
    m.push({ prim: "slide", target: `#${S}-zoom`, at: zFrom, dur: zDur, from: { scale: 1 }, to: { scale: r1(z * 100) / 100 }, ease: push ? "power2.inOut" : "none" });
  }

  // ── focus ──────────────────────────────────────────────────────────────────────
  if (v === "focus") {
    const ph = 40 + steps.length * 60;
    const panelCss = steps.length ? `
#${S}-panel { position: absolute; left: ${box.x + 32}px; top: ${box.y + box.h - 32 - ph}px; width: 600px; height: ${ph}px; box-sizing: border-box;
  padding: 20px 26px; border-radius: 16px; background: color-mix(in srgb, var(--surface) 94%, transparent);
  border: 2px solid color-mix(in srgb, var(--ink) 16%, transparent); display: flex; flex-direction: column; justify-content: space-between; }
.${S}-srow { height: 50px; display: flex; align-items: center; gap: 16px; }
.${S}-stxt { font-size: 30px; font-weight: 700; color: var(--ink); white-space: nowrap; }` : "";
    const html = `<div id="${S}-root">
${frame}
${steps.length ? `  <div id="${S}-panel">${steps.map((s, i) => `<div class="${S}-srow"><span class="${S}-num">${num(i)}</span><span class="${S}-stxt" id="${S}-s${i + 1}">${esc(s)}</span></div>`).join("")}</div>` : ""}
</div>`;
    if (steps.length) {
      m.push({ prim: "reveal", target: `#${S}-panel`, at: Math.min(ts[0], w.a + 0.4), dur: 0.45, from: { opacity: 0, x: -40 }, ease: ctx.ease });
      steps.forEach((_, i) => m.push({ prim: "reveal", target: `#${S}-s${i + 1}`, at: fit(ts[i], 0.45), dur: 0.45, from: { opacity: 0, x: -20 } }));
    }
    const d = ctx.drift(`#${S}-root`, Math.max(last + 0.6, zFrom + zDur) + ctx.gap, 10);
    if (d) m.push(d);
    return { css: css + panelCss, html, motions: m };
  }

  // ── steps ──────────────────────────────────────────────────────────────────────
  if (v === "steps") {
    const n = steps.length, g = n ? Math.min(170, 664 / n) : 0;
    const ys = steps.map((_, i) => r1(416 + (i - (n - 1) / 2) * g));
    const bx = 1262;
    const stepsCss = `
#${S}-ssvg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-strk { fill: none; stroke: color-mix(in srgb, var(--ink) 14%, transparent); stroke-width: 4; }
.${S}-sseg { fill: none; stroke: var(--gold); stroke-width: 4; stroke-dasharray: 1000; }
.${S}-sb { position: absolute; width: 64px; height: 64px; box-sizing: border-box; border-radius: 50%; background: var(--surface);
  border: 3px solid color-mix(in srgb, var(--cyan) 50%, transparent); display: flex; align-items: center; justify-content: center;
  font-family: ${mono}; font-size: 28px; font-weight: 700; color: var(--cyan); }
.${S}-sf { position: absolute; inset: -3px; border-radius: 50%; background: var(--gold); display: flex; align-items: center; justify-content: center;
  font-family: ${mono}; font-size: 28px; font-weight: 700; color: var(--canvas); }
.${S}-st { position: absolute; left: ${bx + 60}px; width: 430px; font-size: 34px; font-weight: 800; line-height: 1.2; color: var(--ink); }
${ys.map((y, i) => `#${S}-sb${i + 1} { left: ${bx - 32}px; top: ${r1(y - 32)}px; }
#${S}-s${i + 1} { top: ${r1(y - 22)}px; }`).join("\n")}`;
    const html = `<div id="${S}-root">
${frame}
${n ? `  <svg id="${S}-ssvg" viewBox="0 0 1760 820">
    <path id="${S}-strk" d="M${bx} ${ys[0]} L${bx} ${ys[n - 1]}"/>
${ys.slice(1).map((y, i) => `    <path class="${S}-sseg" id="${S}-g${i + 2}" pathLength="1000" d="M${bx} ${ys[i]} L${bx} ${y}"/>`).join("\n")}
  </svg>
${steps.map((s, i) => `  <div class="${S}-sb" id="${S}-sb${i + 1}">${num(i)}<div class="${S}-sf" id="${S}-sf${i + 1}">${num(i)}</div></div>
  <div class="${S}-st" id="${S}-s${i + 1}">${esc(s)}</div>`).join("\n")}` : ""}
</div>`;
    if (n) m.push({ prim: "reveal", target: `#${S}-strk`, at: w.a + 0.1, dur: 0.6, from: { opacity: 0 } });
    steps.forEach((_, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-sb${k}`, at: Math.min(ts[i], w.a + 0.15 + i * 0.08), dur: 0.45, from: { opacity: 0, scale: 0.5 }, ease: ctx.ease });
      if (i) m.push({ prim: "draw", target: `#${S}-g${k}`, at: Math.max(w.a + 0.1, fit(ts[i] - 0.35, 0.4)), dur: 0.4 });
      m.push({ prim: "reveal", target: `#${S}-sf${k}`, at: fit(ts[i], 0.4), dur: 0.4, from: { opacity: 0, scale: 0.3 }, ease: "back.out(2)" });
      m.push({ prim: "reveal", target: `#${S}-s${k}`, at: fit(ts[i] + 0.05, 0.45), dur: 0.45, from: ctx.motionFrom(), ease: ctx.ease });
    });
    return { css: css + stepsCss, html, motions: m };
  }

  // ── callout: cards in the side columns, leader lines to the pins ──────────────
  const side = calls.map((c) => (c.x < 0.5 ? "l" : "r"));
  const cy = calls.map(() => 0);
  for (const s of ["l", "r"]) {
    const idx = calls.map((_, i) => i).filter((i) => side[i] === s).sort((a, b) => calls[a].y - calls[b].y);
    let prev = -1e9;
    for (const i of idx) { cy[i] = Math.max(box.y + 60, prev + 150, Math.min(box.y + box.h - 60, box.y + calls[i].y * box.h)); prev = cy[i]; }
  }
  const px = calls.map((c) => r1(box.x + c.x * box.w)), py = calls.map((c) => r1(box.y + c.y * box.h));
  const cw = 310;
  const ns = steps.length, chipW = ns ? Math.min(520, (1760 - (ns - 1) * 20) / ns) : 0, chip0 = r1(880 - (ns * chipW + (ns - 1) * 20) / 2);
  const calloutCss = `
#${S}-csvg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-lead { fill: none; stroke: var(--gold); stroke-width: 3; stroke-dasharray: 1000; }
.${S}-card { position: absolute; width: ${cw}px; box-sizing: border-box; padding: 16px 20px; border-radius: 14px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--ink) 14%, transparent); }
.${S}-lit { position: absolute; inset: -2px; border-radius: inherit; border: 2px solid var(--gold); }
.${S}-ct { margin-top: 6px; font-size: 30px; font-weight: 800; line-height: 1.2; color: var(--ink); }
.${S}-chip { position: absolute; top: ${box.y + box.h + 40}px; width: ${r1(chipW)}px; height: 100px; box-sizing: border-box; padding: 0 22px; border-radius: 14px;
  background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); display: flex; align-items: center; gap: 14px; }
.${S}-cht { font-size: 28px; font-weight: 700; line-height: 1.2; color: var(--ink); }
${calls.map((_, i) => `#${S}-c${i + 1} { ${side[i] === "l" ? "left: 16px;" : `left: ${1760 - 16 - cw}px;`} top: ${r1(cy[i] - 50)}px; }`).join("\n")}
${steps.map((_, i) => `#${S}-h${i + 1} { left: ${r1(chip0 + i * (chipW + 20))}px; }`).join("\n")}`;
  const html = `<div id="${S}-root">
${frame}
  <svg id="${S}-csvg" viewBox="0 0 1760 820">
${calls.map((_, i) => { const ex = side[i] === "l" ? 16 + cw : 1760 - 16 - cw; return `    <path class="${S}-lead" id="${S}-e${i + 1}" pathLength="1000" d="M${ex} ${cy[i]} L${r1((ex + px[i]) / 2)} ${cy[i]} L${px[i]} ${py[i]}"/>`; }).join("\n")}
  </svg>
${calls.map((c, i) => `  <div class="${S}-card" id="${S}-c${i + 1}"><div class="${S}-lit" id="${S}-k${i + 1}"></div><span class="${S}-num">${num(i)}</span><div class="${S}-ct" id="${S}-x${i + 1}">${esc(c.label)}</div></div>`).join("\n")}
${steps.map((s, i) => `  <div class="${S}-chip" id="${S}-h${i + 1}"><span class="${S}-num">${num(i)}</span><span class="${S}-cht" id="${S}-s${i + 1}">${esc(s)}</span></div>`).join("\n")}
</div>`;
  calls.forEach((_, i) => {
    const k = i + 1;
    m.push({ prim: "reveal", target: `#${S}-c${k}`, at: Math.min(tc[i], w.a + 0.2 + i * 0.08), dur: 0.45, from: { opacity: 0, x: side[i] === "l" ? -40 : 40 }, ease: ctx.ease });
    m.push({ prim: "draw", target: `#${S}-e${k}`, at: fit(tc[i], 0.5), dur: 0.5 });
    m.push({ prim: "reveal", target: `#${S}-k${k}`, at: fit(tc[i], 0.4), dur: 0.4, from: { opacity: 0 } });
    m.push({ prim: "reveal", target: `#${S}-x${k}`, at: fit(tc[i] + 0.1, 0.45), dur: 0.45, from: { opacity: 0, y: 12 } });
  });
  steps.forEach((_, i) => {
    m.push({ prim: "reveal", target: `#${S}-h${i + 1}`, at: Math.min(ts[i], w.a + 0.3 + i * 0.08), dur: 0.45, from: { opacity: 0, y: 30 }, ease: ctx.ease });
    m.push({ prim: "reveal", target: `#${S}-s${i + 1}`, at: fit(ts[i], 0.45), dur: 0.45, from: { opacity: 0, x: -16 } });
  });
  const d = ctx.drift(`#${S}-root`, last + 0.6 + ctx.gap, 10);
  if (d) m.push(d);
  return { css: css + calloutCss, html, motions: m };
}
