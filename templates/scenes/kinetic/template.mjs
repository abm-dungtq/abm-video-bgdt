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

  if (ctx.variant === "off-axis") {
    // a staircase of words on an axis tilted −7°, each sliding in along it; a gold rule is drawn down the steps
    const L = Math.max(...words.map((x) => [...x].length));
    const n = words.length;
    const fs = Math.min(L <= 8 ? 132 : L <= 12 ? 112 : 92, n >= 4 ? 100 : 140);
    const lh = Math.round(fs * 1.12);
    const W = 1440, H = lh * n;
    const ww = Math.round(L * fs * 0.6);
    const step = n > 1 ? Math.max(0, Math.min(360, (W - ww) / (n - 1))) : 0;
    const top = Math.round((slots.sub ? 740 : 820) / 2 - H / 2);
    // the rule steps down from each row's tick to the next one: down the gap, then across to the next word
    const stairs = n > 1
      ? `M0 ${Math.round(lh / 2)}` + words.slice(1).map((_, k) => ` V${Math.round((k + 1) * lh + lh / 2)} H${Math.round((k + 1) * step)}`).join("")
      : `M0 ${Math.round(lh / 2)} V${Math.round(lh / 2 + 1)}`;
    const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-drift { position: absolute; inset: 0; }
#${S}-axis { position: absolute; left: 160px; top: ${top}px; width: ${W}px; height: ${H}px; transform: rotate(-7deg); transform-origin: 50% 50%; }
#${S}-rule { position: absolute; left: -44px; top: 0; width: ${Math.round((n - 1) * step) + 20}px; height: ${H}px; overflow: visible; }
#${S}-rule path { fill: none; stroke: var(--gold); stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-tick { position: absolute; left: -56px; width: 24px; height: 24px; border-radius: 50%; background: var(--cyan); }
.${S}-w { position: absolute; left: 0; height: ${lh}px; font-size: ${fs}px; line-height: ${lh}px; font-weight: 800; letter-spacing: -0.01em;
  white-space: nowrap; color: var(--ink); }
.${S}-w:last-of-type { color: var(--gold); }
#${S}-sub { position: absolute; right: 90px; top: 680px; width: 900px; text-align: right; font-size: 40px; font-weight: 600; line-height: 1.3; color: var(--muted); }
${words.map((_, i) => `#${S}-w${i + 1} { top: ${i * lh}px; margin-left: ${Math.round(i * step)}px; }
#${S}-t${i + 1} { top: ${Math.round(i * lh + lh / 2 - 12)}px; margin-left: ${Math.round(i * step)}px; }`).join("\n")}`;
    const html = `<div id="${S}-root">
  <div id="${S}-drift"><div id="${S}-axis">
    <svg id="${S}-rule" viewBox="0 0 ${Math.round((n - 1) * step) + 20} ${H}"><path id="${S}-rp" pathLength="1000" d="${stairs}"/></svg>
${words.map((_, i) => `    <div class="${S}-tick" id="${S}-t${i + 1}"></div>`).join("\n")}
${words.map((x, i) => `    <div class="${S}-w" id="${S}-w${i + 1}">${esc(x)}</div>`).join("\n")}
  </div></div>
  ${slots.sub ? `<div id="${S}-sub">${esc(slots.sub)}</div>` : ""}
</div>`;
    const m = [
      { prim: "draw", target: `#${S}-rp`, at: w.a + 0.05, dur: Math.max(0.5, Math.min(1.2, last - w.a)) },
      ...words.map((_, i) => ({ prim: "reveal", target: `#${S}-t${i + 1}`, at: w.a + 0.1 + i * 0.08, dur: 0.35, from: { opacity: 0, scale: 0.3 } })),
      ...words.map((_, i) => ({ prim: "reveal", target: `#${S}-w${i + 1}`, at: t[i], dur: 0.5, from: { opacity: 0, x: -140 }, ease: ctx.ease })),
    ];
    const drift = ctx.drift(`#${S}-drift`, last + 0.5 + ctx.gap, 16);
    if (drift) m.push(drift);
    if (slots.sub) m.push({ prim: "reveal", target: `#${S}-sub`, at: ctx.at("sub"), dur: 0.5, from: { opacity: 0, y: 20 } });
    return { css, html, motions: m };
  }

  if (ctx.variant === "word-rain") {
    // words drop out of a light rain of drawn streaks and land in a zigzag, alternately left and right aligned
    const L = Math.max(...words.map((x) => [...x].length));
    const n = words.length;
    const fs = Math.min([140, 140, 120, 100, 86][n - 1], Math.floor(1400 / (0.6 * L)));
    const lh = Math.round(fs * 1.18);
    const top = Math.round((slots.sub ? 690 : 820) / 2 - (lh * n) / 2);
    const streaks = Array.from({ length: 12 }, (_, k) => {
      const x = Math.round(60 + (k + ctx.rng() * 0.8) * (1640 / 12));
      const y0 = Math.round(20 + ctx.rng() * 360), len = Math.round(90 + ctx.rng() * 170);
      return { x, y0, len };
    });
    const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-sky { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-st { fill: none; stroke-width: 3; stroke-linecap: round; stroke-dasharray: 1000; }
.${S}-st:nth-of-type(3n) { stroke: color-mix(in srgb, var(--cyan) 55%, transparent); }
.${S}-st:nth-of-type(3n+1), .${S}-st:nth-of-type(3n+2) { stroke: color-mix(in srgb, var(--ink) 22%, transparent); }
#${S}-rain { position: absolute; inset: 0; }
.${S}-row { position: absolute; height: ${lh}px; font-size: ${fs}px; line-height: ${lh}px; font-weight: 800; letter-spacing: -0.01em; white-space: nowrap; color: var(--ink); }
.${S}-row:last-child { color: var(--gold); }
#${S}-sub { position: absolute; left: 180px; top: 700px; width: 1400px; text-align: center; font-size: 40px; font-weight: 600; line-height: 1.3; color: var(--muted); }
${words.map((_, i) => `#${S}-w${i + 1} { top: ${top + i * lh}px; ${n === 1 ? "left: 0; width: 1760px; text-align: center;" : i % 2 ? "right: 140px; text-align: right;" : "left: 140px;"} }`).join("\n")}`;
    const html = `<div id="${S}-root">
  <svg id="${S}-sky" viewBox="0 0 1760 820">
${streaks.map((s, k) => `    <path class="${S}-st" id="${S}-r${k + 1}" pathLength="1000" d="M${s.x} ${s.y0} L${s.x} ${s.y0 + s.len}"/>`).join("\n")}
  </svg>
  <div id="${S}-rain">${words.map((x, i) => `<div class="${S}-row" id="${S}-w${i + 1}">${esc(x)}</div>`).join("")}</div>
  ${slots.sub ? `<div id="${S}-sub">${esc(slots.sub)}</div>` : ""}
</div>`;
    const m = [];
    streaks.forEach((s, k) => {
      const at = w.a + 0.03 + k * 0.04;
      m.push({ prim: "draw", target: `#${S}-r${k + 1}`, at, dur: 0.5, ease: "power1.in" });
      const fall = at + 0.5 + ctx.gap + 0.01;
      if (w.b - 0.05 - fall > 0.6) m.push({ prim: "slide", target: `#${S}-r${k + 1}`, at: fall, dur: w.b - 0.05 - fall, from: { y: 0 }, to: { y: Math.min(160, 780 - s.y0 - s.len) }, ease: "none" });
    });
    words.forEach((_, i) => m.push({ prim: "reveal", target: `#${S}-w${i + 1}`, at: t[i], dur: 0.6, from: { opacity: 0, y: -120 }, ease: "bounce.out" }));
    const drift = ctx.drift(`#${S}-rain`, last + 0.6 + ctx.gap, 14);
    if (drift) m.push(drift);
    if (slots.sub) m.push({ prim: "reveal", target: `#${S}-sub`, at: ctx.at("sub"), dur: 0.5, from: { opacity: 0, y: 20 } });
    return { css, html, motions: m };
  }

  // center-punch
  const fs =chars <= 14 ? 150 : chars <= 26 ? 120 : 92;
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
