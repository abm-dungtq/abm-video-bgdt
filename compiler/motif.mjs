// motif.mjs — the theme's background motif: a layer under every shot of a compiled frame that keeps moving for the
// whole frame, so the stage never stands still while it waits for a keyword. design.motif picks the kind:
//   trail  two slow curves drawn across the stage + a soft orb drifting
//   spark  a few seeded dots drifting upwards
//   stroke thin diagonal strokes drawn in + a soft orb drifting
//   none   nothing
// Placement is seeded per frame and mirrored on odd chapters. Only x/y/opacity/strokeDashoffset are tweened.

export function renderMotif(kind, pfx, { duration, chapterIndex = 0, rng }) {
  if (!kind || kind === "none" || duration < 1.5) return null;
  const M = `${pfx}-motif`;
  const flip = chapterIndex % 2 === 1;
  const X = (x) => (flip ? 1760 - x : x);
  const r = (a, b) => a + (b - a) * rng();
  const end = duration - 0.1;
  const css = [`#${M} { position: absolute; inset: 0; pointer-events: none; }`,
    `#${M} svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }`,
    `#${M} path { fill: none; stroke-linecap: round; stroke-dasharray: 1000; }`,
    `#${M}-orb { position: absolute; left: ${Math.round(X(r(1150, 1350)) - 260)}px; top: ${Math.round(r(60, 300))}px; width: 520px; height: 520px;
  border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--cyan) 16%, transparent), transparent 68%); }`];
  const parts = [];
  const motions = [];
  if (kind === "trail" || kind === "stroke") {
    const paths = kind === "trail"
      ? [0, 1].map((i) => {
        const y0 = r(560, 760) - i * 120, y1 = r(120, 360);
        return `M${X(-40)} ${y0.toFixed(0)} C${X(r(420, 640)).toFixed(0)} ${(y0 - r(260, 420)).toFixed(0)} ${X(r(1000, 1240)).toFixed(0)} ${(y1 + r(260, 420)).toFixed(0)} ${X(1800)} ${y1.toFixed(0)}`;
      })
      : [0, 1, 2].map((i) => {
        const x0 = r(-100, 300) + i * 520;
        return `M${X(x0).toFixed(0)} 860 L${X(x0 + 420).toFixed(0)} -40`;
      });
    parts.push(`<svg viewBox="0 0 1760 820">${paths.map((d, i) => `<path id="${M}-p${i + 1}" pathLength="1000" d="${d}" style="stroke: color-mix(in srgb, var(--${i === 0 ? "gold" : "cyan"}) ${i === 0 ? 22 : 16}%, transparent); stroke-width: ${i === 0 ? 3 : 2}"/>`).join("")}</svg>`);
    paths.forEach((_, i) => motions.push({ prim: "draw", target: `#${M}-p${i + 1}`, at: 0.05 + i * 0.15, dur: Math.max(1, end - 0.05 - i * 0.15), ease: "none" }));
    parts.push(`<div id="${M}-orb"></div>`);
    motions.push({ prim: "reveal", target: `#${M}-orb`, at: 0.05, dur: 0.8, from: { opacity: 0 } });
    motions.push({ prim: "slide", target: `#${M}-orb`, at: 0.05, dur: end - 0.05, from: { x: 0, y: 0 }, to: { x: flip ? 60 : -60, y: 30 }, ease: "none" });
  } else if (kind === "spark") {
    const n = 6;
    css.push(`.${M}-dot { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: var(--gold); }`,
      `.${M}-dot:nth-child(3n) { background: var(--cyan); }`);
    const dots = Array.from({ length: n }, (_, i) => ({ x: Math.round(X(r(80, 1680))), y: Math.round(r(120, 760)), i }));
    parts.push(`<div id="${M}-dots">${dots.map((d) => `<div class="${M}-dot" id="${M}-d${d.i + 1}" style="left:${d.x}px;top:${d.y}px"></div>`).join("")}</div>`);
    for (const d of dots) {
      motions.push({ prim: "reveal", target: `#${M}-d${d.i + 1}`, at: 0.05 + d.i * 0.1, dur: 0.6, from: { opacity: 0 }, to: { opacity: 0.45 } });
      motions.push({ prim: "slide", target: `#${M}-d${d.i + 1}`, at: 0.05, dur: end - 0.05, from: { y: 0 }, to: { y: -Math.round(r(30, 70)) }, ease: "none" });
    }
  }
  return { css: css.join("\n"), html: `<div id="${M}">${parts.join("")}</div>`, motions };
}
