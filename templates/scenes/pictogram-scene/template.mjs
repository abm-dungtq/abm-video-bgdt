// pictogram-scene — a visual metaphor told with 1–5 line pictograms (names from compiler/pictograms/), each with an
// optional short label (labels[i] belongs to pictos[i]) and an optional badge that sums the metaphor up.
// triptych: numbered panels side by side wait with faint icons; on its cue each icon pops to full, its label rises, the
//   panel's top bar lights and an arrow is drawn from the previous panel. The badge is a gold pill above.
// scene-row: the pictograms stand on a drawn ground line (no panels) as faint silhouettes; on its cue each one hops up
//   into full colour while a spark jumps from the previous one; the last is the largest. The badge hangs above on a
//   drawn leader line to the last pictogram.
// transform: the first pictogram in a ring at the left turns into the last one in a ring at the right along a drawn
//   arc; pictograms in between ride the arc as small steps; the first dims when the last lands. Badge below the arc.

import { keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => [...slots.pictos.map((_, i) => `pictos.${i}`), ...(slots.badge ? ["badge"] : [])];

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const pictos = slots.pictos;
  const labels = slots.labels ?? [];
  const n = pictos.length;
  const t = pictos.map((_, i) => ctx.at(`pictos.${i}`));
  const last = Math.max(...t);
  const tB = slots.badge ? ctx.at("badge") : null;
  const mono = `"${theme.mono}", monospace`;
  const r = theme.radius ?? 18;
  const end = Math.max(last, tB ?? 0);
  const badgeCss = `
#${S}-badge { position: absolute; height: 70px; display: flex; align-items: center; gap: 14px; padding: 0 30px; border-radius: 35px;
  border: 2px solid color-mix(in srgb, var(--gold) 55%, transparent); background: color-mix(in srgb, var(--gold) 14%, transparent);
  font-size: 32px; font-weight: 800; color: var(--gold); white-space: nowrap; }
#${S}-badge svg { width: 34px; height: 34px; }`;
  const badgeHtml = slots.badge ? `  <div id="${S}-badge">${ctx.icon("spark")}${esc(slots.badge)}</div>` : "";
  const m = [];

  if (ctx.variant === "scene-row") {
    const base = Math.min(240, Math.floor(1400 / n) - 70);
    const size = pictos.map((_, i) => (i === n - 1 ? Math.min(310, Math.round(base * 1.3)) : base));
    const span = 1400;
    const cx = pictos.map((_, i) => (n === 1 ? 880 : Math.round(180 + (span * i) / (n - 1))));
    const ground = 600;
    const bw = slots.badge ? Math.round([...slots.badge].length * 32 * 0.6) + 120 : 0;
    const css = `${badgeCss}
#${S}-root { position: absolute; inset: 0; }
#${S}-gl { position: absolute; left: 80px; top: ${ground - 4}px; width: 1600px; height: 8px; overflow: visible; }
#${S}-gl path { fill: none; stroke: color-mix(in srgb, var(--ink) 30%, transparent); stroke-width: 4; stroke-linecap: round; stroke-dasharray: 1000; }
.${S}-sh { position: absolute; top: ${ground - 14}px; height: 28px; border-radius: 50%; background: color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-p { position: absolute; color: var(--ink); }
.${S}-p svg { width: 100%; height: 100%; display: block; }
#${S}-p${n} { color: var(--gold); }
.${S}-lb { position: absolute; top: ${ground + 30}px; width: 300px; text-align: center; font-family: ${mono}; font-size: 28px;
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--cyan); }
#${S}-spark { position: absolute; left: ${cx[0] - 12}px; top: ${ground - size[0] - 60}px; width: 24px; height: 24px; border-radius: 50%;
  background: var(--gold); box-shadow: 0 0 22px var(--gold); }
#${S}-lead { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-lead path { fill: none; stroke: color-mix(in srgb, var(--gold) 60%, transparent); stroke-width: 3; stroke-dasharray: 1000; }
#${S}-badge { left: ${880 - bw / 2}px; top: 40px; }
${pictos.map((_, i) => `#${S}-p${i + 1} { left: ${cx[i] - size[i] / 2}px; top: ${ground - size[i] - 10}px; width: ${size[i]}px; height: ${size[i]}px; }
#${S}-s${i + 1} { left: ${cx[i] - size[i] * 0.4}px; width: ${Math.round(size[i] * 0.8)}px; }
#${S}-l${i + 1} { left: ${cx[i] - 150}px; }`).join("\n")}`;
    const tip = [cx[n - 1], ground - size[n - 1] - 24];
    const html = `<div id="${S}-root">
  <div id="${S}-grp">
  <svg id="${S}-gl" viewBox="0 0 1600 8"><path id="${S}-glp" pathLength="1000" d="M4 4 L1596 4"/></svg>
${pictos.map((_, i) => `  <div class="${S}-sh" id="${S}-s${i + 1}"></div>`).join("\n")}
${pictos.map((p, i) => `  <div class="${S}-p" id="${S}-p${i + 1}">${ctx.icon(p)}</div>`).join("\n")}
${labels.slice(0, n).map((l, i) => `  <div class="${S}-lb" id="${S}-l${i + 1}">${esc(l)}</div>`).join("\n")}
  <div id="${S}-spark"></div>
  </div>
${slots.badge ? `  <svg id="${S}-lead" viewBox="0 0 1760 820"><path id="${S}-leadp" pathLength="1000" d="M880 110 C880 ${Math.round((110 + tip[1]) / 2)} ${tip[0]} ${Math.round((110 + tip[1]) / 2)} ${tip[0]} ${tip[1]}"/></svg>` : ""}
${badgeHtml}
</div>`;
    m.push({ prim: "draw", target: `#${S}-glp`, at: w.a + 0.05, dur: 0.9 });
    pictos.forEach((_, i) => {
      const enter = Math.min(t[i], w.a + 0.2 + i * 0.1);
      const ghost = t[i] - enter >= 0.7;
      m.push({ prim: "reveal", target: `#${S}-s${i + 1}`, at: enter, dur: 0.4, from: { opacity: 0, scaleX: 0.3 } });
      if (ghost) {
        m.push({ prim: "reveal", target: `#${S}-p${i + 1}`, at: enter + 0.05, dur: 0.4, from: { opacity: 0 }, to: { opacity: 0.18 } });
        m.push({ prim: "reveal", target: `#${S}-p${i + 1}`, at: t[i], dur: 0.55, from: { opacity: 0.18, y: -70 }, to: { opacity: 1, y: 0 }, ease: "bounce.out" });
      } else {
        m.push({ prim: "reveal", target: `#${S}-p${i + 1}`, at: t[i], dur: 0.55, from: { opacity: 0, y: -70 }, ease: "bounce.out" });
      }
      if (labels[i]) m.push({ prim: "reveal", target: `#${S}-l${i + 1}`, at: t[i] + 0.2, dur: 0.4, from: { opacity: 0, y: 14 } });
    });
    // the spark appears over the first pictogram and hops to each next one on its cue
    m.push({ prim: "reveal", target: `#${S}-spark`, at: t[0], dur: 0.3, from: { opacity: 0, scale: 0.3 } });
    const top = (i) => ground - size[i] - 60;
    const off = (i) => [cx[i] - cx[0], top(i) - top(0)];
    for (let i = 1; i < n; i++) {
      const dur = Math.min(0.6, t[i] - t[i - 1] - 0.05);
      if (dur < 0.2) continue;
      const [x0, y0] = off(i - 1), [x1, y1] = off(i);
      const at = Math.max(t[i - 1] + 0.02, t[i] - dur);
      m.push({ prim: "orbit", target: `#${S}-spark`, points: [[x0, y0], [(x0 + x1) / 2, Math.min(y0, y1) - 110], [x1, y1]], at, dur });
    }
    if (slots.badge) {
      m.push(
        { prim: "reveal", target: `#${S}-badge`, at: tB, dur: 0.5, from: { opacity: 0, y: -24 }, ease: ctx.ease },
        { prim: "draw", target: `#${S}-leadp`, at: tB + 0.2, dur: 0.5 },
      );
    }
    const d = ctx.drift(`#${S}-grp`, end + 0.75, 12);
    if (d) m.push(d);
    return { css, html, motions: keepInside(m, w.b) };
  }

  if (ctx.variant === "transform") {
    const L = { x: n === 1 ? 880 : 330, y: 360 }, R = { x: 1430, y: 360 }, D = 320;
    const mid = pictos.slice(1, -1);
    const arcY = 150;
    // points on the arc (quadratic from the left ring's top-right to the right ring's top-left)
    const P0 = [L.x + 130, L.y - 120], P1 = [880, arcY - 60], P2 = [R.x - 130, R.y - 120];
    const q = (s) => [0, 1].map((k) => Math.round((1 - s) ** 2 * P0[k] + 2 * (1 - s) * s * P1[k] + s * s * P2[k]));
    const midPos = mid.map((_, j) => q((j + 1) / (mid.length + 1)));
    // arrow head at P2 along the arc's end tangent
    const len = Math.hypot(P2[0] - P1[0], P2[1] - P1[1]);
    const u = [(P2[0] - P1[0]) / len, (P2[1] - P1[1]) / len];
    const barb = (sgn) => [Math.round(P2[0] - 30 * u[0] - sgn * 16 * u[1]), Math.round(P2[1] - 30 * u[1] + sgn * 16 * u[0])];
    const [b1, b2] = [barb(1), barb(-1)];
    const bw = slots.badge ? Math.round([...slots.badge].length * 32 * 0.6) + 120 : 0;
    const ringCss = (id, c) => `#${S}-${id} { left: ${c.x - D / 2}px; top: ${c.y - D / 2}px; }`;
    const css = `${badgeCss}
#${S}-root { position: absolute; inset: 0; }
.${S}-ring { position: absolute; width: ${D}px; height: ${D}px; }
.${S}-ring svg.${S}-rs { position: absolute; left: 0; top: 0; width: ${D}px; height: ${D}px; overflow: visible; }
.${S}-ring circle { fill: none; stroke-width: 5; stroke-dasharray: 1000; }
.${S}-ring .${S}-trk { stroke: color-mix(in srgb, var(--ink) 18%, transparent); }
.${S}-ring .${S}-gold { stroke: var(--gold); stroke-width: 8; stroke-linecap: round; }
.${S}-ic { position: absolute; left: ${D / 2 - 100}px; top: ${D / 2 - 100}px; width: 200px; height: 200px; color: var(--ink); }
.${S}-ic svg { width: 200px; height: 200px; display: block; }
#${S}-icR { color: var(--gold); }
.${S}-big { position: absolute; top: ${L.y + D / 2 + 20}px; width: 460px; text-align: center; font-size: 40px; font-weight: 800; color: var(--ink); }
.${S}-mid { position: absolute; width: 120px; height: 120px; border-radius: 50%; box-sizing: border-box; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--cyan) 60%, transparent); color: var(--cyan); display: flex; align-items: center; justify-content: center; }
.${S}-mid svg { width: 70px; height: 70px; }
.${S}-ml { position: absolute; width: 240px; line-height: 34px; text-align: center; font-family: ${mono}; font-size: 28px; color: var(--cyan); }
#${S}-arc { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-arc path { fill: none; stroke: color-mix(in srgb, var(--gold) 70%, transparent); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; }
#${S}-arcp { stroke-dasharray: 1000; }
#${S}-badge { left: ${880 - bw / 2}px; top: 700px; }
${ringCss("rL", L)}
${ringCss("rR", R)}
#${S}-bL { left: ${L.x - 230}px; }
#${S}-bR { left: ${R.x - 230}px; }
${midPos.map(([x, y], j) => `#${S}-m${j + 1} { left: ${x - 60}px; top: ${y - 60}px; }\n#${S}-ml${j + 1} { left: ${x - 120}px; top: ${j % 2 ? y - 110 : y + 72}px; }`).join("\n")}`;
    const ring = (id, icon, gold) => `  <div class="${S}-ring" id="${S}-${id}">
    <svg class="${S}-rs" viewBox="0 0 ${D} ${D}"><circle class="${S}-trk" id="${S}-${id}t" pathLength="1000" cx="${D / 2}" cy="${D / 2}" r="${D / 2 - 6}" transform="rotate(-90 ${D / 2} ${D / 2})"/>${gold ? `<circle class="${S}-gold" id="${S}-${id}g" pathLength="1000" cx="${D / 2}" cy="${D / 2}" r="${D / 2 - 6}" transform="rotate(-90 ${D / 2} ${D / 2})"/>` : ""}</svg>
    <div class="${S}-ic" id="${S}-ic${id.slice(1)}">${ctx.icon(icon)}</div>
  </div>`;
    const html = `<div id="${S}-root">
  <div id="${S}-grp">
${n > 1 ? `  <svg id="${S}-arc" viewBox="0 0 1760 820"><path id="${S}-arcp" pathLength="1000" d="M${P0[0]} ${P0[1]} Q${P1[0]} ${P1[1]} ${P2[0]} ${P2[1]}"/><path id="${S}-arch" d="M${b1[0]} ${b1[1]} L${P2[0]} ${P2[1]} L${b2[0]} ${b2[1]}"/></svg>` : ""}
${ring("rL", pictos[0], n === 1)}
${n > 1 ? ring("rR", pictos[n - 1], true) : ""}
${labels[0] ? `  <div class="${S}-big" id="${S}-bL">${esc(labels[0])}</div>` : ""}
${n > 1 && labels[n - 1] ? `  <div class="${S}-big" id="${S}-bR">${esc(labels[n - 1])}</div>` : ""}
${mid.map((p, j) => `  <div class="${S}-mid" id="${S}-m${j + 1}">${ctx.icon(p)}</div>${labels[j + 1] ? `<div class="${S}-ml" id="${S}-ml${j + 1}">${esc(labels[j + 1])}</div>` : ""}`).join("\n")}
  </div>
${badgeHtml}
</div>`;
    const lastRing = n > 1 ? "rR" : "rL";
    m.push(
      { prim: "reveal", target: `#${S}-rL`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0, scale: 0.85 }, ease: ctx.ease },
      { prim: "draw", target: `#${S}-rLt`, at: w.a + 0.1, dur: 0.8 },
    );
    if (n > 1) {
      const arcDur = Math.max(0.5, t[n - 1] - t[0] - 0.1);
      m.push(
        { prim: "reveal", target: `#${S}-rR`, at: w.a + 0.15, dur: 0.5, from: { opacity: 0, scale: 0.85 }, ease: ctx.ease },
        { prim: "draw", target: `#${S}-rRt`, at: w.a + 0.2, dur: 0.8 },
        { prim: "draw", target: `#${S}-arcp`, at: t[0] + 0.2, dur: arcDur },
        { prim: "reveal", target: `#${S}-arch`, at: t[0] + 0.2 + arcDur - 0.1, dur: 0.25, from: { opacity: 0 } },
        { prim: "reveal", target: `#${S}-icL`, at: t[0], dur: 0.5, from: { opacity: 0, scale: 0.6 }, ease: "back.out(2)" },
        { prim: "reveal", target: `#${S}-icR`, at: w.a + 0.3, dur: 0.4, from: { opacity: 0 }, to: { opacity: 0.18 } },
      );
      if (labels[0]) m.push({ prim: "reveal", target: `#${S}-bL`, at: t[0] + 0.15, dur: 0.45, from: { opacity: 0, y: 16 } });
      mid.forEach((_, j) => {
        m.push({ prim: "reveal", target: `#${S}-m${j + 1}`, at: t[j + 1], dur: 0.45, from: { opacity: 0, scale: 0.4 }, ease: "back.out(2)" });
        if (labels[j + 1]) m.push({ prim: "reveal", target: `#${S}-ml${j + 1}`, at: t[j + 1] + 0.15, dur: 0.4, from: { opacity: 0, y: 12 } });
      });
      const tl = t[n - 1];
      m.push({ prim: "reveal", target: `#${S}-icR`, at: Math.max(tl, w.a + 0.72), dur: 0.5, from: { opacity: 0.18, scale: 0.7 }, to: { opacity: 1, scale: 1 }, ease: "back.out(2)" });
      if (labels[n - 1]) m.push({ prim: "reveal", target: `#${S}-bR`, at: tl + 0.15, dur: 0.45, from: { opacity: 0, y: 16 } });
      if (tl > t[0] + 0.5 + ctx.gap) m.push({ prim: "dim", targets: [`#${S}-icL`], at: tl + 0.1, to: 0.4 });
    } else {
      m.push({ prim: "reveal", target: `#${S}-icL`, at: t[0], dur: 0.5, from: { opacity: 0, scale: 0.6 }, ease: "back.out(2)" });
      if (labels[0]) m.push({ prim: "reveal", target: `#${S}-bL`, at: t[0] + 0.15, dur: 0.45, from: { opacity: 0, y: 16 } });
    }
    m.push({ prim: "draw", target: `#${S}-${lastRing}g`, at: t[n - 1] + 0.1, dur: 0.6 });
    if (slots.badge) m.push({ prim: "reveal", target: `#${S}-badge`, at: tB, dur: 0.5, from: { opacity: 0, y: 24 }, ease: ctx.ease });
    const d = ctx.drift(`#${S}-grp`, end + 0.75, 12);
    if (d) m.push(d);
    return { css, html, motions: keepInside(m, w.b) };
  }

  // triptych
  const gap = 60;
  const pw = Math.min(440, Math.floor((1600 - (n - 1) * gap) / n));
  const x0 = Math.round(880 - (n * pw + (n - 1) * gap) / 2);
  const px = pictos.map((_, i) => x0 + i * (pw + gap));
  const ic = n <= 3 ? 200 : n === 4 ? 170 : 140;
  const top = slots.badge ? 180 : 150, ph = 470;
  const lbFs = pw >= 360 ? 38 : 30;
  const bw = slots.badge ? Math.round([...slots.badge].length * 32 * 0.6) + 120 : 0;
  const css = `${badgeCss}
#${S}-root { position: absolute; inset: 0; }
.${S}-pn { position: absolute; top: ${top}px; width: ${pw}px; height: ${ph}px; box-sizing: border-box; border-radius: ${r}px;
  background: var(--surface); border-top: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); }
.${S}-lit { position: absolute; left: 0; top: -2px; width: 100%; height: 4px; background: var(--gold); transform-origin: 0 50%; }
.${S}-num { position: absolute; left: 24px; top: 20px; font-family: ${mono}; font-size: 32px; font-weight: 700; color: var(--cyan); }
.${S}-ic { position: absolute; left: ${(pw - ic) / 2}px; top: ${Math.round(ph * 0.16)}px; width: ${ic}px; height: ${ic}px; color: var(--ink); }
.${S}-ic svg { width: ${ic}px; height: ${ic}px; display: block; }
.${S}-lb { position: absolute; left: 16px; top: ${Math.round(ph * 0.16) + ic + 36}px; width: ${pw - 32}px; text-align: center;
  font-size: ${lbFs}px; font-weight: 800; line-height: 1.15; color: var(--ink); }
.${S}-arr { position: absolute; top: ${top + ph / 2 - 22}px; width: ${gap}px; height: 44px; overflow: visible; }
.${S}-arr path { fill: none; stroke: var(--gold); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
#${S}-badge { left: ${880 - bw / 2}px; top: 60px; }
${px.map((x, i) => `#${S}-c${i + 1} { left: ${x}px; }\n#${S}-a${i + 1} { left: ${x + pw}px; }`).join("\n")}`;
  const html = `<div id="${S}-root">
${badgeHtml}
  <div id="${S}-grp">
${pictos.map((p, i) => `  <div class="${S}-pn" id="${S}-c${i + 1}">
    <div class="${S}-lit" id="${S}-lt${i + 1}"></div>
    <div class="${S}-num">${String(i + 1).padStart(2, "0")}</div>
    <div class="${S}-ic" id="${S}-i${i + 1}">${ctx.icon(p)}</div>
    ${labels[i] ? `<div class="${S}-lb" id="${S}-l${i + 1}">${esc(labels[i])}</div>` : ""}
  </div>`).join("\n")}
${pictos.slice(0, -1).map((_, i) => `  <svg class="${S}-arr" id="${S}-a${i + 1}" viewBox="0 0 ${gap} 44"><path id="${S}-ap${i + 1}" pathLength="1000" d="M8 22 L${gap - 10} 22 M${gap - 24} 10 L${gap - 10} 22 L${gap - 24} 34"/></svg>`).join("\n")}
  </div>
</div>`;
  pictos.forEach((_, i) => {
    const enter = Math.min(t[i], w.a + 0.1 + i * 0.08);
    const ghost = t[i] - enter >= 0.7;
    m.push({ prim: "reveal", target: `#${S}-c${i + 1}`, at: enter, dur: 0.5, from: { opacity: 0, y: 50 }, ease: ctx.ease });
    if (ghost) m.push({ prim: "reveal", target: `#${S}-i${i + 1}`, at: enter + 0.15, dur: 0.35, from: { opacity: 0, scale: 0.8 }, to: { opacity: 0.3, scale: 0.8 } });
    m.push(
      { prim: "reveal", target: `#${S}-i${i + 1}`, at: t[i], dur: 0.5, from: ghost ? { opacity: 0.3, scale: 0.8 } : { opacity: 0, scale: 0.5 }, ease: "back.out(2)" },
      { prim: "reveal", target: `#${S}-lt${i + 1}`, at: t[i], dur: 0.4, from: { scaleX: 0 }, ease: "power2.out" },
    );
    if (labels[i]) m.push({ prim: "reveal", target: `#${S}-l${i + 1}`, at: t[i] + 0.12, dur: 0.45, from: ctx.motionFrom(), ease: ctx.ease });
    if (i > 0) m.push({ prim: "draw", target: `#${S}-ap${i}`, at: t[i], dur: 0.35 });
  });
  if (slots.badge) m.push({ prim: "reveal", target: `#${S}-badge`, at: tB, dur: 0.5, from: { opacity: 0, y: -20, scale: 0.9 }, ease: "back.out(1.7)" });
  const d = ctx.drift(`#${S}-grp`, last + 0.6, 14);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}
