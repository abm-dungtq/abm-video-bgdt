// line-graph — a trend over 3–8 points, one or two series. Ported from the HyperFrames registry block mk-line-graph
// (Apache-2.0, heygen-com/hyperframes) onto the ctx API.
// The axis, the grid and the x labels stand from the window start, so the stage is never empty; on its keyword each
// series draws on left to right while its dots pop as the pen passes them.
// draw: title and legend in the top strip, the plot across the stage, every point carries its value — at each point
//   the higher series labels above its dot and the lower one below, so two close lines never collide.
// area: the plot on the left three quarters, each series draws, then a soft fill settles under it,
//   and it ends in a tag at the right (name and last value); no per-point numbers.

const fmt = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const COLORS = ["var(--gold)", "var(--cyan)"];

export const revealKeys = (slots) => [...(slots.title ? ["title"] : []), ...slots.series.map((_, i) => `series.${i}`)];

export function render(ctx) {
  const { S, slots, esc, window: w } = ctx;
  const labels = slots.labels, series = slots.series, n = labels.length;
  series.forEach((s, i) => {
    if (s.values.length !== n) throw new Error(`series ${i} "${s.name}" has ${s.values.length} values but labels has ${n}`);
  });
  const area = ctx.variant === "area";
  const top = slots.title ? (area ? 150 : 230) : area ? 60 : 150;
  const P = area ? { x: 200, y: top, w: 1100, h: 700 - top } : { x: 150, y: top, w: 1460, h: 700 - top };
  // values map into [P.y, P.y + P.h - 60]; the 60 px above the axis keeps a "below" label off the x labels
  const max = Math.max(1, ...series.flatMap((s) => s.values)) * 1.15;
  const px = (i) => Math.round(P.x + (i / (n - 1)) * P.w);
  const py = (v) => Math.round(P.y + (P.h - 60) * (1 - v / max));
  const base = P.y + P.h;
  // x labels: as wide as the gap between two points allows
  const lw = Math.min(220, Math.floor(P.w / (n - 1)) - 8), lfs = Math.min(28, Math.floor(lw / 6));
  const pathOf = (vals) => vals.map((v, i) => `${i ? "L" : "M"}${px(i)} ${py(v)}`).join(" ");

  // draw times: in key order, each series gets at least 0.35 s after the previous and ends inside the window
  const DRAW_MIN = 0.3;
  const ts = [];
  series.forEach((_, i) => {
    let t = Math.max(ctx.at(`series.${i}`), w.a + 0.3, i ? ts[i - 1] + 0.35 : 0);
    ts.push(Math.min(t, w.b - DRAW_MIN - 0.45));
  });
  const dd = ts.map((t) => Math.max(DRAW_MIN, Math.min(1.3, w.b - t - 0.45)));

  // per point: with two series the higher one labels above, the lower one below
  const above = (si, i) => series.length < 2 || series[si].values[i] > series[1 - si].values[i] || (series[si].values[i] === series[1 - si].values[i] && si === 0);

  const grid = [0.25, 0.5, 0.75, 1].map((f) => `<div class="${S}-grd" style="top: ${Math.round(base - 60 - (P.h - 60) * f / 1.15)}px"></div>`).join("");
  const xl = labels.map((t, i) => `<div class="${S}-xl" id="${S}-x${i + 1}" style="left: ${px(i) - Math.round(lw / 2)}px">${esc(t)}</div>`).join("");
  const svg = series.map((s, si) => `${area ? `<path id="${S}-a${si + 1}" class="${S}-area" d="${pathOf(s.values)} L${px(n - 1)} ${base} L${px(0)} ${base} Z" style="fill: color-mix(in srgb, ${COLORS[si]} 16%, transparent)"/>` : ""}
      <path id="${S}-p${si + 1}" class="${S}-line" pathLength="1000" d="${pathOf(s.values)}" style="stroke: ${COLORS[si]}"/>`).join("\n      ");
  const r = area ? 8 : 10;
  const dots = series.flatMap((s, si) => s.values.map((v, i) =>
    `<div class="${S}-dot" id="${S}-d${si + 1}-${i + 1}" style="left: ${px(i) - r}px; top: ${py(v) - r}px; border-color: ${COLORS[si]}"></div>`)).join("");
  const vals = area ? "" : series.flatMap((s, si) => s.values.map((v, i) =>
    `<div class="${S}-val" id="${S}-v${si + 1}-${i + 1}" style="left: ${px(i) - 100}px; top: ${above(si, i) ? py(v) - 62 : py(v) + 18}px; color: ${COLORS[si]}">${fmt(v)}</div>`)).join("");

  // area: end tags at the right, pushed apart when the two lines end close together
  let tags = "";
  const tagY = series.map((s) => py(s.values[n - 1]) - 50);
  if (area) {
    if (series.length === 2 && Math.abs(tagY[0] - tagY[1]) < 110) {
      const mid = (tagY[0] + tagY[1]) / 2, up = tagY[0] <= tagY[1] ? 0 : 1;
      tagY[up] = mid - 55;
      tagY[1 - up] = mid + 55;
    }
    for (let i = 0; i < tagY.length; i++) tagY[i] = Math.round(Math.max(top - 10, Math.min(base - 100, tagY[i])));
    tags = series.map((s, si) => `<div class="${S}-tag" id="${S}-t${si + 1}" style="top: ${tagY[si]}px; border-color: ${COLORS[si]}">
      <div class="${S}-tn">${esc(s.name)}</div><div class="${S}-tv" style="color: ${COLORS[si]}">${fmt(s.values[n - 1])}${slots.unit ? ` <span class="${S}-tu">${esc(slots.unit)}</span>` : ""}</div></div>`).join("\n    ");
  }
  const legend = area ? "" : `<div id="${S}-leg">${series.map((s, si) => `<span class="${S}-li"><span class="${S}-ld" style="background: ${COLORS[si]}"></span>${esc(s.name)}</span>`).join("")}${slots.unit ? `<span class="${S}-lu">${esc(slots.unit)}</span>` : ""}</div>`;

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-title { position: absolute; left: ${area ? 152 : 80}px; top: 24px; width: ${area ? 1456 : 1600}px; font-size: 54px; font-weight: 800; line-height: 1.15; color: var(--ink); }
#${S}-leg { position: absolute; left: 80px; top: ${slots.title ? 108 : 40}px; width: 1600px; display: flex; align-items: center; gap: 44px;
  font-size: 32px; font-weight: 700; color: var(--ink); white-space: nowrap; }
.${S}-li { display: inline-flex; align-items: center; gap: 14px; }
.${S}-ld { width: 22px; height: 22px; border-radius: 50%; }
.${S}-lu { font-weight: 500; color: var(--muted); }
#${S}-plot { position: absolute; inset: 0; }
.${S}-grd { position: absolute; left: ${P.x - 30}px; width: ${P.w + 60}px; height: 2px; background: color-mix(in srgb, var(--ink) 7%, transparent); }
#${S}-axis { position: absolute; left: ${P.x - 30}px; top: ${base}px; width: ${P.w + 60}px; height: 3px; background: color-mix(in srgb, var(--ink) 30%, transparent); }
.${S}-xl { position: absolute; top: ${base + 16}px; width: ${lw}px; text-align: center; font-size: ${lfs}px; font-weight: 600; color: var(--muted); white-space: nowrap; }
#${S}-svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-line { fill: none; stroke-width: ${area ? 7 : 6}; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-dot { position: absolute; width: ${2 * r}px; height: ${2 * r}px; box-sizing: border-box; border-radius: 50%; border: 5px solid; background: var(--canvas); }
.${S}-val { position: absolute; width: 200px; text-align: center; font-size: 30px; font-weight: 800; line-height: 44px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.${S}-tag { position: absolute; left: ${P.x + P.w + 40}px; width: 420px; box-sizing: border-box; padding-left: 22px; border-left: 5px solid; }
.${S}-tn { font-size: 30px; font-weight: 700; line-height: 1.2; color: var(--ink); white-space: nowrap; }
.${S}-tv { font-size: 44px; font-weight: 800; line-height: 1.15; font-variant-numeric: tabular-nums; white-space: nowrap; }
.${S}-tu { font-size: 24px; font-weight: 600; color: var(--muted); }`;
  const html = `<div id="${S}-root">
  <div id="${S}-grp">
    ${slots.title ? `<div id="${S}-title">${esc(slots.title)}</div>` : ""}
    ${legend}
    <div id="${S}-plot">
      <div id="${S}-grid">${grid}</div>
      <div id="${S}-axis"></div>
      ${xl}
      <svg id="${S}-svg" viewBox="0 0 1760 820" aria-hidden="true">
      ${svg}
      </svg>
      ${dots}
      ${vals}
    </div>
    ${tags}
  </div>
</div>`;

  const m = [
    { prim: "reveal", target: `#${S}-axis`, at: w.a, dur: 0.5, from: { opacity: 0, scaleX: 0.7 }, ease: ctx.ease },
    { prim: "reveal", target: `#${S}-grid`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0 } },
    ...labels.map((_, i) => ({ prim: "reveal", target: `#${S}-x${i + 1}`, at: w.a + 0.05 + i * 0.05, dur: 0.4, from: { opacity: 0, y: 10 } })),
  ];
  if (legend) m.push({ prim: "reveal", target: `#${S}-leg`, at: w.a + 0.1, dur: 0.45, from: { opacity: 0, y: -12 } });
  if (slots.title) m.push({ prim: "reveal", target: `#${S}-title`, at: ctx.at("title"), dur: 0.5, from: { opacity: 0, y: -20 } });
  series.forEach((s, si) => {
    const t0 = ts[si], d = dd[si];
    m.push({ prim: "draw", target: `#${S}-p${si + 1}`, at: t0, dur: d, ease: "power2.inOut" });
    if (area) m.push({ prim: "reveal", target: `#${S}-a${si + 1}`, at: t0 + d * 0.9, dur: 0.4, from: { opacity: 0 }, ease: "power1.out" });
    s.values.forEach((_, i) => {
      const td = t0 + (i / (n - 1)) * d * 0.92;
      m.push({ prim: "reveal", target: `#${S}-d${si + 1}-${i + 1}`, at: td, dur: 0.3, from: { opacity: 0, scale: 0 }, ease: "back.out(1.6)" });
      if (!area) m.push({ prim: "reveal", target: `#${S}-v${si + 1}-${i + 1}`, at: td + 0.06, dur: 0.3, from: { opacity: 0, y: 8 } });
    });
    if (area) m.push({ prim: "reveal", target: `#${S}-t${si + 1}`, at: t0 + d * 0.85, dur: 0.4, from: { opacity: 0, x: -24 }, ease: ctx.ease });
  });
  const end = Math.max(...ts.map((t, i) => t + dd[i] + 0.45));
  const drift = ctx.drift(`#${S}-grp`, end + ctx.gap, 10);
  if (drift) m.push(drift);
  return { css, html, motions: m };
}
