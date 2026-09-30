// flow-vertical — a top-down process of 3–6 steps, after the HyperFrames registry block "flowchart-vertical"
// (heygen-com/hyperframes, Apache-2.0): nodes pop in level by level and drawn connectors run between them.
// Every step enters at the window start as a numbered shell with a faint icon; on its keyword it lights (gold ring,
// icon, label) and the connector into it draws.
// stack (signature): a centred column of cards, a drawn arrow from each card down to the next.
// rail: a vertical spine on the left with round nodes; the step labels sit large on the right of each node.

export const revealKeys = (slots) => slots.steps.map((_, i) => `steps.${i}`);

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const steps = slots.steps;
  const n = steps.length;
  const t = steps.map((_, i) => ctx.at(`steps.${i}`));
  const last = Math.max(...t);
  const rail = ctx.variant === "rail";
  const fit = (x, dur) => Math.max(w.a, Math.min(x, w.b - dur - 0.05));
  const num = (i) => String(i + 1).padStart(2, "0");
  const m = [];

  // geometry (stage px, 1760 × 820)
  const cardW = 900, cardH = n <= 4 ? 112 : n === 5 ? 100 : 88;
  const gap = Math.min(60, Math.floor((700 - n * cardH) / (n - 1)));
  const top0 = Math.round((820 - (n * cardH + (n - 1) * gap)) / 2);
  const cx = 880;
  const pitch = Math.min(150, Math.floor(640 / (n - 1)));
  const ry = steps.map((_, i) => Math.round(410 + (i - (n - 1) / 2) * pitch));
  const SX = 380, D = 88;

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-web { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-trk { fill: none; stroke: color-mix(in srgb, var(--ink) 12%, transparent); stroke-width: 3; stroke-dasharray: 8 10; }
.${S}-cn { fill: none; stroke: var(--gold); stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-lit { position: absolute; border: 4px solid var(--gold); box-shadow: 0 0 24px color-mix(in srgb, var(--gold) 35%, transparent); }
.${S}-num { font-family: "${theme.mono}", monospace; color: var(--cyan); }
.${S}-ico { color: var(--gold); }
.${S}-lab { font-weight: 800; color: var(--ink); white-space: nowrap; }
${rail ? `
.${S}-node { position: absolute; left: ${SX - D / 2}px; width: ${D}px; height: ${D}px; box-sizing: border-box; border-radius: 50%;
  background: var(--surface); border: 3px solid color-mix(in srgb, var(--ink) 14%, transparent); }
.${S}-node .${S}-lit { inset: -3px; border-radius: 50%; }
.${S}-node .${S}-ico { position: absolute; left: 19px; top: 19px; width: 44px; height: 44px; }
.${S}-node .${S}-ico svg { width: 44px; height: 44px; }
.${S}-num { position: absolute; left: 150px; width: 90px; text-align: right; font-size: 40px; line-height: 60px; }
.${S}-lab { position: absolute; left: ${SX + D / 2 + 44}px; height: 60px; line-height: 60px; font-size: ${n >= 5 ? 50 : 58}px; }`
    : `
.${S}-node { position: absolute; left: ${cx - cardW / 2}px; width: ${cardW}px; height: ${cardH}px; box-sizing: border-box; border-radius: ${R}px;
  background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); }
.${S}-node .${S}-lit { inset: -2px; border-radius: ${R}px; }
.${S}-num { position: absolute; left: 32px; top: 0; height: ${cardH}px; display: flex; align-items: center; font-size: 32px; }
.${S}-ico { position: absolute; left: 112px; top: ${(cardH - 56) / 2}px; width: 56px; height: 56px; }
.${S}-ico svg { width: 56px; height: 56px; }
.${S}-lab { position: absolute; left: 196px; top: 0; height: ${cardH}px; display: flex; align-items: center; font-size: ${n >= 5 ? 36 : 40}px; }`}`;

  const stepHtml = (s, i) => {
    if (rail) {
      return `<div class="${S}-node" id="${S}-n${i + 1}" style="top: ${ry[i] - D / 2}px"><div class="${S}-lit" id="${S}-k${i + 1}"></div>
      <div class="${S}-ico" id="${S}-i${i + 1}">${ctx.icon(s.icon)}</div></div>
    <div class="${S}-num" id="${S}-u${i + 1}" style="top: ${ry[i] - 30}px">${num(i)}</div>
    <div class="${S}-lab" id="${S}-l${i + 1}" style="top: ${ry[i] - 30}px">${esc(s.label)}</div>`;
    }
    return `<div class="${S}-node" id="${S}-n${i + 1}" style="top: ${top0 + i * (cardH + gap)}px"><div class="${S}-lit" id="${S}-k${i + 1}"></div>
      <div class="${S}-num" id="${S}-u${i + 1}">${num(i)}</div><div class="${S}-ico" id="${S}-i${i + 1}">${ctx.icon(s.icon)}</div>
      <div class="${S}-lab" id="${S}-l${i + 1}">${esc(s.label)}</div></div>`;
  };

  // connector i joins step i to step i + 1
  const link = (i) => {
    if (rail) return `M${SX} ${ry[i] + D / 2 + 6} L${SX} ${ry[i + 1] - D / 2 - 6}`;
    const y0 = top0 + i * (cardH + gap) + cardH + 4, y1 = top0 + (i + 1) * (cardH + gap) - 4;
    return `M${cx} ${y0} L${cx} ${y1} M${cx - 12} ${y1 - 14} L${cx} ${y1} L${cx + 12} ${y1 - 14}`;
  };
  const trk = rail ? `M${SX} ${ry[0]} L${SX} ${ry[n - 1]}` : `M${cx} ${top0 + cardH / 2} L${cx} ${top0 + (n - 1) * (cardH + gap) + cardH / 2}`;
  const html = `<div id="${S}-root">
  <div id="${S}-grp">
    <svg id="${S}-web" viewBox="0 0 1760 820">
      <path class="${S}-trk" d="${trk}"/>
      ${steps.slice(1).map((_, i) => `<path class="${S}-cn" id="${S}-c${i + 2}" pathLength="1000" d="${link(i)}"/>`).join("")}
    </svg>
    ${steps.map(stepHtml).join("\n    ")}
  </div>
</div>`;

  steps.forEach((_, i) => {
    const enter = Math.min(t[i], w.a + 0.05 + i * 0.07);
    const ghost = t[i] - enter >= 0.7;
    m.push({ prim: "reveal", target: `#${S}-n${i + 1}`, at: enter, dur: 0.45, from: rail ? { opacity: 0, x: -40 } : { opacity: 0, y: 36 }, ease: ctx.ease });
    m.push({ prim: "reveal", target: `#${S}-u${i + 1}`, at: enter, dur: 0.45, from: { opacity: 0 } });
    if (ghost) m.push({ prim: "reveal", target: `#${S}-i${i + 1}`, at: enter + 0.1, dur: 0.35, from: { opacity: 0 }, to: { opacity: 0.3 } });
    m.push({ prim: "reveal", target: `#${S}-i${i + 1}`, at: fit(ghost ? t[i] : Math.max(t[i], enter + 0.1), 0.45), dur: 0.45, from: { opacity: ghost ? 0.3 : 0, scale: 0.7 }, ease: "back.out(2)" });
    m.push({ prim: "reveal", target: `#${S}-k${i + 1}`, at: fit(t[i], 0.4), dur: 0.4, from: { opacity: 0, scale: 1.08 } });
    m.push({ prim: "reveal", target: `#${S}-l${i + 1}`, at: fit(t[i] + 0.1, 0.45), dur: 0.45, from: ctx.motionFrom(), ease: ctx.ease });
    if (i > 0) m.push({ prim: "draw", target: `#${S}-c${i + 1}`, at: fit(t[i] - 0.3, 0.4), dur: 0.4 });
  });
  const d = ctx.drift(`#${S}-grp`, fit(last + 0.7, 0.7), 8);
  if (d) m.push(d);
  return { css, html, motions: m };
}
