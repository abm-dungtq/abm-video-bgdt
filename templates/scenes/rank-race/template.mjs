// rank-race — a ranking that changes across 2–5 milestones (model versions, years): 3–6 entries, one value each per
// milestone. Ported from the HyperFrames registry block bar-chart-race (Apache-2.0, heygen-com/hyperframes) onto the
// ctx API: the block's per-frame render loop becomes discrete steps, one per milestone keyword — at each step the bars
// resize, the values cross-fade, the rows glide to their new rank and the leader's bar turns gold. The scale is fixed
// to the largest value of all milestones, so bar lengths compare honestly across steps.
// The rows (names and empty tracks) and the first milestone name stand from the window start, so the stage is never
// empty; the bars first grow on the first milestone's keyword.
// race: horizontal bars ranked top to bottom, the milestone name large at the top right.
// columns: vertical columns ranked left to right, names under the axis, values above the columns.

const fmt = (v) => String(v).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export const revealKeys = (slots) => [...(slots.title ? ["title"] : []), ...slots.milestones.map((_, i) => `milestones.${i}`)];

export function render(ctx) {
  const { S, slots, esc, window: w } = ctx;
  const ms = slots.milestones, items = slots.items;
  const k = ms.length, n = items.length;
  items.forEach((it, i) => {
    if (it.values.length !== k) throw new Error(`item ${i} "${it.name}" has ${it.values.length} values but there are ${k} milestones`);
  });
  const cols = ctx.variant === "columns";
  const unit = slots.unit ? ` ${esc(slots.unit)}` : "";

  // ranks[j][i]: rank of item i at milestone j (0 = leader); ties keep the item order
  const ranks = ms.map((_, j) => {
    const order = items.map((_, i) => i).sort((a, b) => items[b].values[j] - items[a].values[j] || a - b);
    const r = new Array(n);
    order.forEach((i, pos) => { r[i] = pos; });
    return r;
  });
  const gmax = Math.max(1, ...items.flatMap((it) => it.values));

  // milestone times: in order, at least `gap` apart, the last one leaving room for its transition
  const first = w.a + 0.1, last = w.b - 0.75;
  const gap = Math.max(0.3, Math.min(0.45, (last - first) / Math.max(1, k - 1)));
  const tm = [];
  ms.forEach((_, j) => {
    const lo = j ? tm[j - 1] + gap : first, hi = last - (k - 1 - j) * gap;
    tm.push(Math.max(lo, Math.min(ctx.at(`milestones.${j}`), hi)));
  });
  const span = tm.map((t, j) => (j < k - 1 ? tm[j + 1] : w.b) - t);
  const tr = span.map((s) => Math.max(0.1, Math.min(0.7, s - 0.05)));
  const fd = span.map((s) => Math.max(0.08, Math.min(0.3, s - 0.05)));

  // geometry
  const top = cols ? 0 : 200;
  const pitch = cols ? Math.floor(1456 / n) : Math.min(110, Math.floor(600 / n));
  const TRACK = cols ? 340 : 1040;
  const thick = cols ? Math.round(Math.min(150, pitch * 0.55)) : Math.round(pitch * 0.62);
  const base = 640; // columns: the axis
  const pos = (r) => (cols ? 152 + r * pitch : top + r * pitch);
  const len = (v) => Math.round((TRACK * v) / gmax);

  // two rows mid-overtake share a band for a moment: their name and value are marked as intended overlap
  const rows = items.map((it, i) => {
    const spans = it.values.map((v, j) => `<span class="${S}-v" id="${S}-v${i + 1}-${j + 1}" data-layout-allow-overlap>${fmt(v)}${unit}</span>`).join("");
    return `    <div class="${S}-row" id="${S}-r${i + 1}" style="${cols ? `left: ${pos(ranks[0][i])}px` : `top: ${pos(ranks[0][i])}px`}">
      <div class="${S}-name" data-layout-allow-overlap>${esc(it.name)}</div>
      <div class="${S}-trk"></div>
      <div class="${S}-bar" id="${S}-b${i + 1}"><div class="${S}-lead" id="${S}-g${i + 1}"></div></div>
      <div class="${S}-vh" id="${S}-h${i + 1}">${spans}</div>
    </div>`;
  }).join("\n");
  const labels = ms.map((t, j) => `<div class="${S}-ms" id="${S}-m${j + 1}">${esc(t)}</div>`).join("");

  const css = cols ? `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-title { position: absolute; left: 152px; top: 24px; width: 880px; font-size: 50px; font-weight: 800; line-height: 1.15; color: var(--ink); }
.${S}-ms { position: absolute; left: 1008px; top: 10px; width: 600px; text-align: right; font-size: 84px; font-weight: 800; line-height: 1.1;
  color: var(--gold); white-space: nowrap; }
#${S}-axis { position: absolute; left: 132px; top: ${base}px; width: 1496px; height: 3px; background: color-mix(in srgb, var(--ink) 30%, transparent); }
.${S}-row { position: absolute; top: 0; width: ${pitch}px; height: 820px; }
.${S}-name { position: absolute; left: 6px; top: ${base + 18}px; width: ${pitch - 12}px; text-align: center; font-size: 28px; font-weight: 700;
  line-height: 1.2; color: var(--ink); }
.${S}-trk { position: absolute; left: ${Math.round((pitch - thick) / 2)}px; top: ${base - TRACK}px; width: ${thick}px; height: ${TRACK}px;
  border-radius: 10px 10px 0 0; background: color-mix(in srgb, var(--ink) 6%, transparent); }
.${S}-bar { position: absolute; left: ${Math.round((pitch - thick) / 2)}px; top: ${base - TRACK}px; width: ${thick}px; height: ${TRACK}px;
  border-radius: 10px 10px 0 0; overflow: hidden; background: color-mix(in srgb, var(--cyan) 70%, transparent); transform-origin: 50% 100%; }
.${S}-lead { position: absolute; inset: 0; background: var(--gold); opacity: 0; }
.${S}-vh { position: absolute; left: 0; top: ${base - 52}px; width: ${pitch}px; height: 44px; }
.${S}-v { position: absolute; left: 0; top: 0; width: ${pitch}px; text-align: center; font-size: 25px; font-weight: 800; line-height: 44px;
  color: var(--ink); font-variant-numeric: tabular-nums; white-space: nowrap; }` : `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-title { position: absolute; left: 60px; top: 24px; width: 920px; font-size: 50px; font-weight: 800; line-height: 1.15; color: var(--ink); }
.${S}-ms { position: absolute; left: 1060px; top: 14px; width: 640px; text-align: right; font-size: 84px; font-weight: 800; line-height: 1.1;
  color: var(--gold); white-space: nowrap; }
.${S}-row { position: absolute; left: 0; width: 1760px; height: ${pitch}px; }
.${S}-name { position: absolute; left: 0; top: 0; width: 330px; height: ${pitch}px; display: flex; align-items: center; justify-content: flex-end;
  text-align: right; font-size: 34px; font-weight: 700; color: var(--ink); white-space: nowrap; }
.${S}-trk { position: absolute; left: 360px; top: ${Math.round((pitch - thick) / 2)}px; width: ${TRACK}px; height: ${thick}px; border-radius: 8px;
  background: color-mix(in srgb, var(--ink) 6%, transparent); }
.${S}-bar { position: absolute; left: 360px; top: ${Math.round((pitch - thick) / 2)}px; width: ${TRACK}px; height: ${thick}px; border-radius: 8px;
  overflow: hidden; background: color-mix(in srgb, var(--cyan) 70%, transparent); transform-origin: 0 50%; }
.${S}-lead { position: absolute; inset: 0; background: var(--gold); opacity: 0; }
.${S}-vh { position: absolute; left: 360px; top: 0; width: 330px; height: ${pitch}px; }
.${S}-v { position: absolute; left: 0; top: 0; height: ${pitch}px; display: flex; align-items: center; font-size: 32px; font-weight: 800;
  color: var(--ink); font-variant-numeric: tabular-nums; white-space: nowrap; }`;
  const html = `<div id="${S}-root">
  <div id="${S}-grp">
    ${slots.title ? `<div id="${S}-title">${esc(slots.title)}</div>` : ""}
    ${labels}
    ${cols ? `<div id="${S}-axis"></div>` : ""}
    <div id="${S}-rows">
${rows}
    </div>
  </div>
</div>`;

  // the value holder rides the bar end: x (race) or y (columns) offset from the bar's zero
  const hold = (v) => (cols ? { y: -len(v) } : { x: len(v) + 16 });
  const scale = (v) => (cols ? { scaleY: v / gmax } : { scaleX: v / gmax });
  const m = [];
  if (cols) m.push({ prim: "reveal", target: `#${S}-axis`, at: w.a, dur: 0.5, from: { opacity: 0, scaleX: 0.7 }, ease: ctx.ease });
  if (slots.title) m.push({ prim: "reveal", target: `#${S}-title`, at: ctx.at("title"), dur: 0.5, from: { opacity: 0, y: -20 } });
  // milestone names cross-fade; the first one is there from the start
  ms.forEach((_, j) => {
    m.push({ prim: "reveal", target: `#${S}-m${j + 1}`, at: j ? tm[j] : w.a + 0.05, dur: j ? fd[j] : 0.3, from: { opacity: 0, y: j ? 24 : 0 }, ease: ctx.ease });
    if (j < k - 1) m.push({ prim: "reveal", target: `#${S}-m${j + 1}`, at: tm[j + 1], dur: fd[j + 1], from: { opacity: 1, y: 0 }, to: { opacity: 0, y: -24 } });
  });
  items.forEach((it, i) => {
    m.push({ prim: "reveal", target: `#${S}-r${i + 1}`, at: w.a + 0.05 + i * 0.05, dur: 0.45, from: cols ? { opacity: 0, y: 30 } : { opacity: 0, x: -30 }, ease: ctx.ease });
    it.values.forEach((v, j) => {
      const prev = j ? it.values[j - 1] : 0;
      const ease = j ? "power2.inOut" : "power2.out";
      m.push({ prim: "reveal", target: `#${S}-b${i + 1}`, at: tm[j], dur: tr[j], from: scale(prev), to: scale(v), ease },
        { prim: "slide", target: `#${S}-h${i + 1}`, at: tm[j], dur: tr[j], from: hold(prev), to: hold(v), ease },
        { prim: "reveal", target: `#${S}-v${i + 1}-${j + 1}`, at: tm[j], dur: fd[j], from: { opacity: 0 } });
      if (j < k - 1) m.push({ prim: "reveal", target: `#${S}-v${i + 1}-${j + 1}`, at: tm[j + 1], dur: fd[j + 1], from: { opacity: 1 }, to: { opacity: 0 } });
      // rank change: glide to the new place
      if (j && ranks[j][i] !== ranks[j - 1][i]) {
        const off = (r) => pos(r) - pos(ranks[0][i]);
        const ax = cols ? "x" : "y";
        m.push({ prim: "slide", target: `#${S}-r${i + 1}`, at: tm[j], dur: tr[j], from: { [ax]: off(ranks[j - 1][i]) }, to: { [ax]: off(ranks[j][i]) }, ease: "power2.inOut" });
      }
      // leader colour: on when the item takes first place, off when it loses it
      const lead = ranks[j][i] === 0, was = j ? ranks[j - 1][i] === 0 : false;
      if (lead !== was) m.push({ prim: "reveal", target: `#${S}-g${i + 1}`, at: tm[j], dur: fd[j], from: { opacity: was ? 1 : 0 }, to: { opacity: lead ? 1 : 0 } });
    });
  });
  const drift = ctx.drift(`#${S}-grp`, tm[k - 1] + tr[k - 1] + ctx.gap, 8);
  if (drift) m.push(drift);
  return { css, html, motions: m };
}
