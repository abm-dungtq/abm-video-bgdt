// bar-line-chart — 3–6 periods compared as bars, with an optional second measure drawn as a line (e.g. revenue and
// conversion rate per month). Ported from the HyperFrames registry block data-chart (Apache-2.0,
// heygen-com/hyperframes) onto the ctx API.
// The axis, the x labels and the legend stand from the window start, so the stage is never empty; on the "bars" keyword
// the bars rise left to right in one cascade, each with its value on top; on the "line" keyword the line draws across its own band above the bars (its dots and values riding the
// pen), so line labels never sit on bar labels.
// combo: title and legend in the top strip, the chart across the stage, bars in cyan and the line in gold.
// spotlight: the chart on the left, bars dimmed except the tallest in gold, the line in cyan; a side card names the
//   tallest period and its value, and the change from the first to the last period.

const fmt = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const revealKeys = (slots) => [...(slots.title ? ["title"] : []), "bars", ...(slots.lineName ? ["line"] : [])];

export function render(ctx) {
  const { S, slots, esc, window: w } = ctx;
  const R = ctx.theme.radius ?? 18;
  const pts = slots.points, n = pts.length;
  const hasLine = !!slots.lineName;
  const withLine = pts.filter((p) => p.line != null).length;
  if (hasLine && withLine !== n) throw new Error(`lineName is set but ${n - withLine} of ${n} points have no "line" value`);
  if (!hasLine && withLine) throw new Error(`${withLine} points have a "line" value but lineName is not set`);
  const spot = ctx.variant === "spotlight";
  const lsuf = slots.lineSuffix ? `${/^[%‰]$/.test(slots.lineSuffix) ? "" : " "}${esc(slots.lineSuffix)}` : "";
  const barColor = spot ? "color-mix(in srgb, var(--ink) 22%, transparent)" : "color-mix(in srgb, var(--cyan) 70%, transparent)";
  const lineColor = spot ? "var(--cyan)" : "var(--gold)";
  const maxIdx = pts.reduce((b, p, i) => (p.bar > pts[b].bar ? i : b), 0);

  // geometry: the line lives in a band above the bars, the bars below it down to the axis
  const P = spot ? { x: 40, w: 1000 } : { x: 150, w: 1460 };
  const plotTop = spot ? (slots.title ? 190 : 80) : slots.title ? 200 : 130;
  const base = 700;
  const band = hasLine ? { y0: plotTop + 50, y1: plotTop + (spot ? 150 : 170) } : null;
  const barTop = hasLine ? plotTop + (spot ? 230 : 250) : plotTop + 50;
  const slotW = P.w / n, bw = Math.round(Math.min(150, slotW * 0.5));
  const cx = (i) => Math.round(P.x + slotW * (i + 0.5));
  const bmax = Math.max(1, ...pts.map((p) => p.bar));
  const bh = (v) => Math.max(4, Math.round(((base - barTop) * v) / bmax));
  const lmax = hasLine ? Math.max(...pts.map((p) => p.line)) : 0, lmin = hasLine ? Math.min(...pts.map((p) => p.line)) : 0;
  const ly = (v) => Math.round(lmax === lmin ? (band.y0 + band.y1) / 2 : band.y1 - ((v - lmin) / (lmax - lmin)) * (band.y1 - band.y0));
  const lw = Math.floor(slotW) - 10, lfs = Math.min(28, Math.floor(lw / 6));

  // times: one cascade of bars (up to 0.3 s apart) that ends inside the window, the line after the last bar
  const t0 = Math.max(w.a + 0.1, Math.min(ctx.at("bars"), w.b - 1.1));
  const stag = Math.min(0.3, Math.max(0.05, (w.b - 0.8 - t0) / Math.max(1, n - 1)));
  const tb = pts.map((_, i) => t0 + i * stag);
  const tl = hasLine ? Math.max(Math.min(Math.max(ctx.at("line"), Math.max(...tb) + 0.3), w.b - 0.75), w.a + 0.2) : null;
  const dl = hasLine ? Math.max(0.3, Math.min(1.5, w.b - tl - 0.45)) : 0;

  const bars = pts.map((p, i) => `<div class="${S}-bar" id="${S}-b${i + 1}" style="left: ${cx(i) - bw / 2}px; top: ${base - bh(p.bar)}px; height: ${bh(p.bar)}px;${spot && i === maxIdx ? " background: var(--gold);" : ""}"></div>
      <div class="${S}-bv" id="${S}-bv${i + 1}" style="left: ${cx(i) - Math.round(lw / 2)}px; top: ${base - bh(p.bar) - 48}px;${spot && i === maxIdx ? " color: var(--gold);" : ""}">${fmt(p.bar)}</div>
      <div class="${S}-xl" id="${S}-x${i + 1}" style="left: ${cx(i) - Math.round(lw / 2)}px">${esc(p.label)}</div>`).join("\n      ");
  const line = hasLine ? `<svg id="${S}-svg" viewBox="0 0 1760 820" aria-hidden="true"><path id="${S}-lp" pathLength="1000" d="${pts.map((p, i) => `${i ? "L" : "M"}${cx(i)} ${ly(p.line)}`).join(" ")}"/></svg>
      ${pts.map((p, i) => `<div class="${S}-dot" id="${S}-d${i + 1}" style="left: ${cx(i) - 9}px; top: ${ly(p.line) - 9}px"></div>
      <div class="${S}-lv" id="${S}-lv${i + 1}" style="left: ${cx(i) - Math.round(lw / 2)}px; top: ${ly(p.line) - 54}px">${fmt(p.line)}${lsuf}</div>`).join("\n      ")}` : "";
  const legend = `<div id="${S}-leg"><span class="${S}-li"><span class="${S}-lb" style="background: ${spot ? "var(--gold)" : barColor}"></span>${esc(slots.barName)}${slots.unit ? ` <span class="${S}-lu">(${esc(slots.unit)})</span>` : ""}</span>${hasLine ? `<span class="${S}-li"><span class="${S}-ll"></span>${esc(slots.lineName)}</span>` : ""}</div>`;

  // spotlight card: the tallest period, its value, and the change from the first to the last period
  let card = "";
  if (spot) {
    const first = pts[0].bar, last = pts[n - 1].bar;
    const pct = first > 0 ? Math.round(((last - first) / first) * 100) : null;
    card = `<div id="${S}-card">
      <div class="${S}-kick">Cao nhất</div>
      <div id="${S}-cb"><div id="${S}-cl">${esc(pts[maxIdx].label)}</div>
      <div id="${S}-cv">${fmt(pts[maxIdx].bar)}</div>
      ${slots.unit ? `<div id="${S}-cu">${esc(slots.unit)}</div>` : ""}</div>
      ${pct != null ? `<div id="${S}-chg"><span id="${S}-pct" style="color: ${pct < 0 ? "var(--warn)" : "var(--cyan)"}">${pct > 0 ? "+" : pct < 0 ? "-" : ""}${fmt(Math.abs(pct))} %</span><span class="${S}-cs">${esc(pts[n - 1].label)} so với ${esc(pts[0].label)}</span></div>` : ""}
    </div>`;
  }

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-title { position: absolute; left: ${spot ? 40 : 80}px; top: 24px; width: ${spot ? 1000 : 1600}px; font-size: ${spot ? 46 : 54}px; font-weight: 800;
  line-height: 1.15; color: var(--ink); }
#${S}-leg { position: absolute; ${spot ? "left: 1120px; top: 670px; width: 620px; flex-direction: column; align-items: flex-start; gap: 12px;"
    : `left: 80px; top: ${slots.title ? 108 : 40}px; width: 1600px; align-items: center; gap: 44px;`} display: flex;
  font-size: ${spot ? 28 : 32}px; font-weight: 700; color: var(--ink); white-space: nowrap; }
.${S}-li { display: inline-flex; align-items: center; gap: 14px; }
.${S}-lb { width: 22px; height: 22px; border-radius: 4px; }
.${S}-ll { width: 34px; height: 6px; border-radius: 3px; background: ${lineColor}; }
.${S}-lu { font-weight: 500; color: var(--muted); }
#${S}-chart { position: absolute; inset: 0; }
#${S}-axis { position: absolute; left: ${P.x - 20}px; top: ${base}px; width: ${P.w + 40}px; height: 3px; background: color-mix(in srgb, var(--ink) 30%, transparent); }
.${S}-bar { position: absolute; width: ${bw}px; border-radius: 10px 10px 0 0; background: ${barColor}; transform-origin: 50% 100%; }
.${S}-bv { position: absolute; width: ${lw}px; text-align: center; font-size: 30px; font-weight: 800; line-height: 44px; color: var(--ink);
  font-variant-numeric: tabular-nums; white-space: nowrap; }
.${S}-xl { position: absolute; top: ${base + 16}px; width: ${lw}px; text-align: center; font-size: ${lfs}px; font-weight: 600; color: var(--muted); white-space: nowrap; }
#${S}-svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-lp { fill: none; stroke: ${lineColor}; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-dot { position: absolute; width: 18px; height: 18px; box-sizing: border-box; border-radius: 50%; border: 5px solid ${lineColor}; background: var(--canvas); }
.${S}-lv { position: absolute; width: ${lw}px; text-align: center; font-size: 28px; font-weight: 800; line-height: 40px; color: ${lineColor};
  font-variant-numeric: tabular-nums; white-space: nowrap; }
#${S}-card { position: absolute; left: 1100px; top: 150px; width: 640px; height: 490px; box-sizing: border-box; padding: 44px 48px; border-radius: ${R}px;
  background: var(--surface); border-top: 4px solid var(--gold); }
.${S}-kick { font-size: 30px; font-weight: 700; color: var(--muted); }
#${S}-cl { margin-top: 6px; font-size: 44px; font-weight: 800; line-height: 1.15; color: var(--ink); white-space: nowrap; }
#${S}-cv { margin-top: 18px; transform-origin: 0 60%; font-size: 104px; font-weight: 800; line-height: 1; color: var(--gold); font-variant-numeric: tabular-nums; white-space: nowrap; }
#${S}-cu { margin-top: 10px; font-size: 32px; font-weight: 600; color: var(--muted); white-space: nowrap; }
#${S}-chg { position: absolute; left: 48px; bottom: 40px; width: 544px; display: flex; flex-direction: column; gap: 4px; }
#${S}-pct { font-size: 56px; font-weight: 800; line-height: 1.1; font-variant-numeric: tabular-nums; }
.${S}-cs { font-size: 28px; font-weight: 600; color: var(--muted); white-space: nowrap; }`;
  const html = `<div id="${S}-root">
  <div id="${S}-grp">
    ${slots.title ? `<div id="${S}-title">${esc(slots.title)}</div>` : ""}
    ${legend}
    <div id="${S}-chart">
      <div id="${S}-axis"></div>
      ${bars}
      ${line}
    </div>
    ${card}
  </div>
</div>`;

  const m = [
    { prim: "reveal", target: `#${S}-axis`, at: w.a, dur: 0.5, from: { opacity: 0, scaleX: 0.7 }, ease: ctx.ease },
    { prim: "reveal", target: `#${S}-leg`, at: w.a + 0.1, dur: 0.45, from: { opacity: 0, y: -12 } },
    ...pts.map((_, i) => ({ prim: "reveal", target: `#${S}-x${i + 1}`, at: w.a + 0.05 + i * 0.05, dur: 0.4, from: { opacity: 0, y: 10 } })),
    ...pts.flatMap((_, i) => [
      { prim: "reveal", target: `#${S}-b${i + 1}`, at: tb[i], dur: 0.6, from: { scaleY: 0 }, ease: "power2.out" },
      { prim: "reveal", target: `#${S}-bv${i + 1}`, at: tb[i] + 0.45, dur: 0.3, from: { opacity: 0, y: 10 } },
    ]),
  ];
  if (slots.title) m.push({ prim: "reveal", target: `#${S}-title`, at: ctx.at("title"), dur: 0.5, from: { opacity: 0, y: -20 } });
  if (hasLine) {
    m.push({ prim: "draw", target: `#${S}-lp`, at: tl, dur: dl, ease: "power1.inOut" });
    pts.forEach((_, i) => {
      const td = tl + (i / (n - 1)) * dl * 0.92;
      m.push({ prim: "reveal", target: `#${S}-d${i + 1}`, at: td, dur: 0.3, from: { opacity: 0, scale: 0 }, ease: "back.out(1.6)" },
        { prim: "reveal", target: `#${S}-lv${i + 1}`, at: td + 0.06, dur: 0.3, from: { opacity: 0, y: 8 } });
    });
  }
  if (spot) {
    const tm = tb[maxIdx];
    m.push({ prim: "reveal", target: `#${S}-card`, at: w.a + 0.1, dur: 0.5, from: { opacity: 0, x: 40 }, ease: ctx.ease },
      { prim: "reveal", target: `#${S}-cv`, at: tm + 0.3, dur: 0.45, from: { scale: 0.8 }, ease: "back.out(1.6)" });
    // the card body waits dimmed from the start and lights when the tallest bar lands
    const ghost = tm + 0.2 >= w.a + 0.7;
    if (ghost) m.push({ prim: "reveal", target: `#${S}-cb`, at: w.a + 0.2, dur: 0.4, from: { opacity: 0 }, to: { opacity: 0.3 } });
    m.push({ prim: "reveal", target: `#${S}-cb`, at: tm + 0.2, dur: 0.4, from: { opacity: ghost ? 0.3 : 0 }, to: { opacity: 1 } });
    if (card.includes(`${S}-chg`)) m.push({ prim: "reveal", target: `#${S}-chg`, at: Math.min(tb[n - 1] + 0.4, w.b - 0.5), dur: 0.45, from: { opacity: 0, y: 16 } });
  }
  const end = Math.max(...tb.map((t) => t + 0.75), hasLine ? tl + dl + 0.45 : 0, spot ? tb[maxIdx] + 0.75 : 0);
  const drift = ctx.drift(`#${S}-grp`, end + ctx.gap, 10);
  if (drift) m.push(drift);
  return { css, html, motions: m };
}
