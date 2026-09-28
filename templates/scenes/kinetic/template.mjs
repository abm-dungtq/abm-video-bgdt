// kinetic — 1–5 short words land on the voice. center-punch: words punch into a centred line (scale 1.25 → 1),
// the last one in the accent colour, then earlier words dim. stack-words: words stack as lines that slide in
// beside a drawn bar, with an optional side note.

export const revealKeys = (slots) => [...slots.words.map((_, i) => `words.${i}`), ...(slots.sub ? ["sub"] : [])];

export function render(ctx) {
  const { S, slots, esc, window: w } = ctx;
  const words = slots.words;
  const t = words.map((_, i) => ctx.at(`words.${i}`));
  const last = Math.max(...t);
  const chars = words.join(" ").length;

  if (ctx.variant === "stack-words") {
    const fs = words.length <= 3 ? 112 : 88;
    const lh = Math.round(fs * 1.16);
    const top = Math.round((820 - lh * words.length) / 2);
    const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-stack { position: absolute; left: 150px; top: ${top}px; width: 1000px; }
.${S}-w { display: block; font-size: ${fs}px; line-height: ${lh}px; font-weight: 800; letter-spacing: -0.01em; white-space: nowrap; }
.${S}-w:nth-child(odd) { color: var(--ink); }
.${S}-w:nth-child(even) { color: var(--gold); }
#${S}-bar { position: absolute; left: 90px; top: ${top}px; width: 12px; height: ${lh * words.length}px; overflow: visible; }
#${S}-bar path { stroke: var(--gold); stroke-width: 8; stroke-linecap: round; fill: none; stroke-dasharray: 1000; }
#${S}-sub { position: absolute; left: 1130px; top: ${top + lh * words.length - 150}px; width: 560px; font-size: 40px;
  font-weight: 600; line-height: 1.3; color: var(--muted); }
#${S}-sub svg { width: 44px; height: 44px; color: var(--cyan); display: block; margin-bottom: 14px; }`;
    const html = `<div id="${S}-root">
  <svg id="${S}-bar" viewBox="0 0 12 ${lh * words.length}"><path id="${S}-barp" pathLength="1000" d="M6 4 L6 ${lh * words.length - 4}"/></svg>
  <div id="${S}-stack">${words.map((x, i) => `<span class="${S}-w" id="${S}-w${i + 1}">${esc(x)}</span>`).join("")}</div>
  ${slots.sub ? `<div id="${S}-sub">${ctx.icon("spark")}${esc(slots.sub)}</div>` : ""}
</div>`;
    const m = [
      { prim: "draw", target: `#${S}-barp`, at: w.a + 0.1, dur: Math.max(0.4, Math.min(1.2, last - w.a)) },
      ...words.map((_, i) => ({ prim: "reveal", target: `#${S}-w${i + 1}`, at: t[i], dur: 0.5, from: { opacity: 0, x: -90 } })),
    ];
    const drift = ctx.drift(`#${S}-stack`, last + 0.5 + ctx.gap, 18);
    if (drift) m.push(drift);
    if (slots.sub) m.push({ prim: "reveal", target: `#${S}-sub`, at: ctx.at("sub"), dur: 0.5, from: { opacity: 0, y: 20 } });
    return { css, html, motions: m };
  }

  // center-punch
  const fs = chars <= 14 ? 150 : chars <= 26 ? 120 : 92;
  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-halo { position: absolute; left: 530px; top: 60px; width: 700px; height: 700px; border-radius: 50%;
  border: 2px solid color-mix(in srgb, var(--gold) 28%, transparent); }
#${S}-line { position: absolute; left: 100px; top: 180px; width: 1560px; height: 380px; display: flex; flex-wrap: wrap;
  align-items: center; align-content: center; justify-content: center; column-gap: ${Math.round(fs * 0.3)}px; }
.${S}-w { display: block; font-size: ${fs}px; font-weight: 800; line-height: 1.1; color: var(--ink); white-space: nowrap; }
.${S}-w:last-child { color: var(--gold); }
#${S}-sub { position: absolute; left: 180px; top: 600px; width: 1400px; text-align: center; font-size: 44px; font-weight: 600;
  line-height: 1.3; color: var(--muted); }`;
  const html = `<div id="${S}-root">
  <div id="${S}-halo"></div>
  <div id="${S}-line">${words.map((x, i) => `<span class="${S}-w" id="${S}-w${i + 1}">${esc(x)}</span>`).join("")}</div>
  ${slots.sub ? `<div id="${S}-sub">${esc(slots.sub)}</div>` : ""}
</div>`;
  const m = [
    { prim: "reveal", target: `#${S}-halo`, at: w.a + 0.05, dur: 0.8, from: { opacity: 0, scale: 0.7 }, to: { opacity: 1, scale: 0.9 } },
    ...words.map((_, i) => ({ prim: "reveal", target: `#${S}-w${i + 1}`, at: t[i], dur: 0.45, from: { opacity: 0, scale: 1.25 }, ease: "back.out(1.7)" })),
  ];
  const haloFrom = w.a + 0.05 + 0.8 + ctx.gap;
  if (w.b - haloFrom > 0.6) m.push({ prim: "slide", target: `#${S}-halo`, at: haloFrom, dur: w.b - haloFrom - 0.05, from: { scale: 0.9 }, to: { scale: 1.08 }, ease: "none" });
  const dimAt = last + 0.6;
  if (words.length > 1 && dimAt + 0.3 < w.b) m.push({ prim: "dim", targets: words.slice(0, -1).map((_, i) => `#${S}-w${i + 1}`), at: dimAt, to: 0.5 });
  if (slots.sub) m.push({ prim: "reveal", target: `#${S}-sub`, at: ctx.at("sub"), dur: 0.5, from: { opacity: 0, y: 20 } });
  return { css, html, motions: m };
}
