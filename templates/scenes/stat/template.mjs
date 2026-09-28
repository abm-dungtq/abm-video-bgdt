// stat — one number that counts up on its keyword (suffix in a static sibling span), a label, an optional comparison.
// The number stands at "0" (30 %) from the window start inside its frame, so the stage is never empty.
// countup: a huge centred number inside drawn cyan corner brackets, a gauge line fills while it counts, label below,
//   comparison as a pill underneath.
// bar: the label as a heading strip, the number above a long gold bar that grows to scale; the comparison as a
//   thinner second bar on the same scale.
// ring: a gold progress ring (left) draws around the counting number, the comparison as an inner cyan ring; label and
//   comparison stand in a column on the right.

export const revealKeys = (slots) => ["value", "label", ...(slots.compare ? ["compare"] : [])];

const arcPath = (cx, cy, r, f) => {
  if (f >= 0.999) return `M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx} ${cy + r} A${r} ${r} 0 1 1 ${cx} ${cy - r}`;
  const a = ((-90 + 360 * f) * Math.PI) / 180;
  return `M${cx} ${cy - r} A${r} ${r} 0 ${f > 0.5 ? 1 : 0} 1 ${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;
};

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const cmp = slots.compare ?? null;
  const tV = ctx.at("value"), tL = ctx.at("label");
  const tC = cmp ? ctx.at("compare") : null;
  const fit = (x, dur) => Math.max(w.a, Math.min(x, w.b - dur - 0.05));
  const suf = slots.suffix ? esc(slots.suffix) : "";
  const top = Math.max(slots.value, cmp?.value ?? 0, 1);
  const frac = (v) => Math.max(0.02, cmp ? v / top : slots.suffix === "%" ? Math.min(v, 100) / 100 : 1);
  const digits = String(slots.value).length;
  const m = [];
  let css, html;

  // the number: faint "0" at the start, then bright and counting on its keyword
  const lit = Math.max(tV, w.a + 0.47);
  const cdur = Math.max(0.3, Math.min(1.5, w.b - lit - 0.1));
  const number = (id) => [
    { prim: "reveal", target: `#${S}-${id}`, at: w.a + 0.05, dur: 0.4, from: { opacity: 0 }, to: { opacity: 0.3 } },
    { prim: "reveal", target: `#${S}-${id}`, at: fit(lit, 0.35), dur: 0.35, from: { opacity: 0.3 }, to: { opacity: 1 } },
    { prim: "count", target: `#${S}-${id}v`, at: fit(lit, cdur), dur: cdur, to: slots.value },
  ];
  const cmpCount = (target, at) => ({ prim: "count", target, at, dur: Math.max(0.3, Math.min(1, w.b - at - 0.1)), to: cmp.value });
  const tc = cmp ? fit(Math.max(tC, lit + 0.3), 0.6) : null;
  const tl = fit(tL, 0.5);
  let end = Math.max(lit + cdur, tl + 0.5, tc ? tc + 0.6 : 0);

  if (ctx.variant === "ring") {
    const C = { x: 470, y: 410 }, r1 = 300, r2 = 232;
    const fs = digits <= 3 ? 150 : digits <= 4 ? 120 : 92;
    const ticks = Array.from({ length: 24 }, (_, k) => {
      const a = (k * 15 * Math.PI) / 180;
      return `M${(C.x + (r1 + 30) * Math.cos(a)).toFixed(1)} ${(C.y + (r1 + 30) * Math.sin(a)).toFixed(1)} L${(C.x + (r1 + 44) * Math.cos(a)).toFixed(1)} ${(C.y + (r1 + 44) * Math.sin(a)).toFixed(1)}`;
    }).join(" ");
    css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-gauge { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-gauge .${S}-trk { fill: none; stroke: color-mix(in srgb, var(--ink) 9%, transparent); }
#${S}-ticks { fill: none; stroke: color-mix(in srgb, var(--cyan) 45%, transparent); stroke-width: 3; stroke-linecap: round; }
#${S}-arc1 { fill: none; stroke: var(--gold); stroke-width: 34; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-arc2 { fill: none; stroke: var(--cyan); stroke-width: 18; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-n { position: absolute; left: ${C.x - 220}px; top: ${C.y - fs * 0.62}px; width: 440px; text-align: center; font-size: ${fs}px; font-weight: 800;
  line-height: 1; color: var(--gold); font-variant-numeric: tabular-nums; white-space: nowrap; }
.${S}-suf { font-size: ${Math.round(fs * 0.5)}px; margin-left: 6px; color: color-mix(in srgb, var(--gold) 75%, transparent); }
#${S}-col { position: absolute; left: 930px; top: 190px; width: 800px; }
#${S}-lab { font-size: 64px; font-weight: 800; line-height: 1.12; color: var(--ink); }
#${S}-cmp { margin-top: 70px; display: flex; align-items: center; gap: 26px; }
#${S}-dot { width: 26px; height: 26px; border-radius: 50%; background: var(--cyan); flex: none; }
#${S}-cv { font-size: 76px; font-weight: 800; color: var(--cyan); font-variant-numeric: tabular-nums; }
#${S}-cl { font-size: 38px; font-weight: 600; line-height: 1.2; color: var(--muted); }`;
    html = `<div id="${S}-root">
  <div id="${S}-grp">
    <svg id="${S}-gauge" viewBox="0 0 1760 820">
      <circle class="${S}-trk" cx="${C.x}" cy="${C.y}" r="${r1}" stroke-width="34"/>
      ${cmp ? `<circle class="${S}-trk" cx="${C.x}" cy="${C.y}" r="${r2}" stroke-width="18"/>` : ""}
      <path id="${S}-ticks" d="${ticks}"/>
      <path id="${S}-arc1" pathLength="1000" d="${arcPath(C.x, C.y, r1, frac(slots.value))}"/>
      ${cmp ? `<path id="${S}-arc2" pathLength="1000" d="${arcPath(C.x, C.y, r2, frac(cmp.value))}"/>` : ""}
    </svg>
    <div id="${S}-n"><span id="${S}-nv">0</span>${suf ? `<span class="${S}-suf">${suf}</span>` : ""}</div>
    <div id="${S}-col">
      <div id="${S}-lab">${esc(slots.label)}</div>
      ${cmp ? `<div id="${S}-cmp"><div id="${S}-dot"></div><div><span id="${S}-cv">0</span>${suf ? `<span class="${S}-suf" style="color: var(--cyan)">${suf}</span>` : ""}</div><div id="${S}-cl">${esc(cmp.label)}</div></div>` : ""}
    </div>
  </div>
</div>`;
    m.push(
      { prim: "reveal", target: `#${S}-gauge`, at: w.a, dur: 0.5, from: { opacity: 0, scale: 0.9 }, ease: ctx.ease },
      ...number("n"),
      { prim: "draw", target: `#${S}-arc1`, at: fit(lit, cdur), dur: cdur, ease: "power1.out" },
      { prim: "reveal", target: `#${S}-lab`, at: tl, dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease },
    );
    if (cmp) m.push({ prim: "reveal", target: `#${S}-cmp`, at: tc, dur: 0.45, from: { opacity: 0, x: -30 } },
      cmpCount(`#${S}-cv`, tc), { prim: "draw", target: `#${S}-arc2`, at: tc, dur: Math.max(0.3, Math.min(1, w.b - tc - 0.1)) });
  } else if (ctx.variant === "bar") {
    const fs = digits <= 4 ? 150 : 120;
    const W = 1600;
    css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-lab { position: absolute; left: 80px; top: 40px; width: 1600px; font-size: 60px; font-weight: 800; line-height: 1.1; color: var(--ink); }
#${S}-rule { position: absolute; left: 80px; top: 140px; width: 1600px; height: 6px; overflow: visible; }
#${S}-rule path { stroke: color-mix(in srgb, var(--gold) 60%, transparent); stroke-width: 3; fill: none; stroke-dasharray: 1000; }
#${S}-n { position: absolute; left: 80px; top: ${cmp ? 180 : 230}px; font-size: ${fs}px; font-weight: 800; line-height: 1; color: var(--gold);
  font-variant-numeric: tabular-nums; white-space: nowrap; }
.${S}-suf { font-size: ${Math.round(fs * 0.45)}px; margin-left: 8px; color: color-mix(in srgb, var(--gold) 75%, transparent); }
.${S}-trk { position: absolute; left: 80px; width: ${W}px; border-radius: 14px; background: color-mix(in srgb, var(--ink) 8%, transparent); overflow: hidden; }
.${S}-fill { position: absolute; left: 0; top: 0; height: 100%; border-radius: 14px; transform-origin: 0 50%; }
#${S}-f1 { background: var(--gold); }
#${S}-f2 { background: color-mix(in srgb, var(--cyan) 75%, transparent); }
.${S}-tick { position: absolute; top: 0; width: 2px; height: 100%; background: color-mix(in srgb, var(--ink) 16%, transparent); }
#${S}-cmp { position: absolute; left: 80px; top: 520px; width: 1600px; display: flex; align-items: baseline; gap: 22px; }
#${S}-cv { font-size: 64px; font-weight: 800; color: var(--cyan); font-variant-numeric: tabular-nums; }
#${S}-cl { font-size: 38px; font-weight: 600; color: var(--muted); }`;
    const y1 = cmp ? 360 : 430, y2 = 610;
    const tick = [0.25, 0.5, 0.75].map((f) => `<div class="${S}-tick" style="left: ${f * W}px"></div>`).join("");
    html = `<div id="${S}-root">
  <div id="${S}-grp">
    <div id="${S}-lab">${esc(slots.label)}</div>
    <svg id="${S}-rule" viewBox="0 0 1600 6"><path id="${S}-rulep" pathLength="1000" d="M2 3 L1598 3"/></svg>
    <div id="${S}-n"><span id="${S}-nv">0</span>${suf ? `<span class="${S}-suf">${suf}</span>` : ""}</div>
    <div class="${S}-trk" id="${S}-t1" style="top: ${y1}px; height: 96px">${tick}<div class="${S}-fill" id="${S}-f1" style="width: ${Math.round(frac(slots.value) * W)}px"></div></div>
    ${cmp ? `<div id="${S}-cmp"><span><span id="${S}-cv">0</span>${suf ? `<span class="${S}-suf" style="color: var(--cyan)">${suf}</span>` : ""}</span><span id="${S}-cl">${esc(cmp.label)}</span></div>
    <div class="${S}-trk" id="${S}-t2" style="top: ${y2}px; height: 56px">${tick}<div class="${S}-fill" id="${S}-f2" style="width: ${Math.round(frac(cmp.value) * W)}px"></div></div>` : ""}
  </div>
</div>`;
    m.push(
      { prim: "reveal", target: `#${S}-t1`, at: w.a, dur: 0.45, from: { opacity: 0, x: -40 }, ease: ctx.ease },
      { prim: "draw", target: `#${S}-rulep`, at: w.a + 0.1, dur: 0.8 },
      ...number("n"),
      { prim: "reveal", target: `#${S}-f1`, at: fit(lit, cdur), dur: cdur, from: { scaleX: 0 }, ease: "power2.out" },
      { prim: "reveal", target: `#${S}-lab`, at: tl, dur: 0.5, from: { opacity: 0, y: -20 }, ease: ctx.ease },
    );
    if (cmp) {
      const cd = Math.max(0.3, Math.min(1, w.b - tc - 0.1));
      m.push({ prim: "reveal", target: `#${S}-t2`, at: w.a + 0.1, dur: 0.45, from: { opacity: 0, x: -40 } },
        { prim: "reveal", target: `#${S}-cmp`, at: tc, dur: 0.45, from: { opacity: 0, y: 16 } },
        cmpCount(`#${S}-cv`, tc), { prim: "reveal", target: `#${S}-f2`, at: tc, dur: cd, from: { scaleX: 0 }, ease: "power2.out" });
    }
  } else {
    // countup
    const fs = digits <= 3 ? 280 : digits <= 4 ? 230 : 180;
    css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-frame { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-frame path { fill: none; stroke: var(--cyan); stroke-width: 5; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-frame .${S}-trk { stroke: color-mix(in srgb, var(--ink) 10%, transparent); stroke-width: 8; stroke-dasharray: none; }
#${S}-frame #${S}-gp { stroke: var(--gold); stroke-width: 8; }
#${S}-n { position: absolute; left: 0; top: ${250 - fs * 0.5}px; width: 1760px; text-align: center; font-size: ${fs}px; font-weight: 800;
  line-height: 1; color: var(--gold); font-variant-numeric: tabular-nums; white-space: nowrap; }
.${S}-suf { font-size: ${Math.round(fs * 0.45)}px; margin-left: 10px; color: color-mix(in srgb, var(--gold) 75%, transparent); }
#${S}-lab { position: absolute; left: 80px; top: 500px; width: 1600px; text-align: center; font-size: 60px; font-weight: 800; line-height: 1.12; color: var(--ink); }
#${S}-cmp { position: absolute; left: 480px; top: 640px; width: 800px; height: 96px; box-sizing: border-box; border-radius: 48px;
  border: 2px solid color-mix(in srgb, var(--cyan) 55%, transparent); background: var(--surface);
  display: flex; align-items: center; justify-content: center; gap: 22px; }
#${S}-cv { font-size: 50px; font-weight: 800; color: var(--cyan); font-variant-numeric: tabular-nums; }
#${S}-cl { font-size: 36px; font-weight: 600; color: var(--muted); white-space: nowrap; }`;
    const br = "M420 150 L420 90 L480 90 M1280 90 L1340 90 L1340 150 M1340 360 L1340 420 L1280 420 M480 420 L420 420 L420 360";
    html = `<div id="${S}-root">
  <div id="${S}-grp">
    <svg id="${S}-frame" viewBox="0 0 1760 820">
      <path id="${S}-br" pathLength="1000" d="${br}"/>
      <line class="${S}-trk" x1="580" y1="462" x2="1180" y2="462" stroke-linecap="round"/>
      <path id="${S}-gp" pathLength="1000" d="M580 462 L${Math.round(580 + 600 * frac(slots.value))} 462"/>
    </svg>
    <div id="${S}-n"><span id="${S}-nv">0</span>${suf ? `<span class="${S}-suf">${suf}</span>` : ""}</div>
    <div id="${S}-lab">${esc(slots.label)}</div>
    ${cmp ? `<div id="${S}-cmp"><span><span id="${S}-cv">0</span>${suf ? `<span class="${S}-suf" style="font-size: 26px; color: var(--cyan)">${suf}</span>` : ""}</span><span id="${S}-cl">${esc(cmp.label)}</span></div>` : ""}
  </div>
</div>`;
    m.push(
      { prim: "draw", target: `#${S}-br`, at: w.a, dur: 0.8 },
      ...number("n"),
      { prim: "draw", target: `#${S}-gp`, at: fit(lit, cdur), dur: cdur, ease: "power1.out" },
      { prim: "reveal", target: `#${S}-lab`, at: tl, dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease },
    );
    if (cmp) m.push({ prim: "reveal", target: `#${S}-cmp`, at: tc, dur: 0.45, from: { opacity: 0, y: 20 } }, cmpCount(`#${S}-cv`, tc));
  }
  const d = ctx.drift(`#${S}-grp`, fit(end + 0.3, 0.7), 10);
  if (d) m.push(d);
  return { css, html, motions: m };
}
