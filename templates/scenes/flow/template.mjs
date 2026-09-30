// flow — 2–5 steps joined by drawn connectors; a spark runs the path once every step is lit.
// Every step enters at the window start as a numbered shell with a faint icon; on its keyword it lights (gold ring,
// icon, label) and the connector into it draws.
// linear: a row of discs left → right; with loop: true a return arc draws under the row and the spark rides it back.
// loop: steps as pills on a drawn ring (Hermes "vòng lặp"); the spark jumps node to node as steps light, then laps the
//   ring until the shot ends; a faint gear turns in the centre.
// branch: the first step is a large source disc on the left; the other steps fan out as cards on the right, each tied
//   to the source by a drawn curve; the spark flies the curve to the last card.

export const revealKeys = (slots) => [...slots.steps.map((_, i) => `steps.${i}`), "spark"];

const arc = (C, r, a0, a1, step = 10) => {
  const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) / step) + 1);
  return Array.from({ length: n }, (_, k) => {
    const a = ((a0 + ((a1 - a0) * k) / (n - 1)) * Math.PI) / 180;
    return [Math.round(C.x + r * Math.cos(a)), Math.round(C.y + r * Math.sin(a))];
  });
};
const bez = (p0, p1, p2, p3, n = 14) => Array.from({ length: n + 1 }, (_, k) => {
  const t = k / n, u = 1 - t;
  return [0, 1].map((j) => Math.round(u * u * u * p0[j] + 3 * u * u * t * p1[j] + 3 * u * t * t * p2[j] + t * t * t * p3[j]));
});

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const steps = slots.steps;
  const n = steps.length;
  const t = steps.map((_, i) => ctx.at(`steps.${i}`));
  const tSpark = ctx.at("spark");
  const last = Math.max(...t);
  const fit = (x, dur) => Math.max(w.a, Math.min(x, w.b - dur - 0.05));
  const m = [];
  const num = (i) => String(i + 1).padStart(2, "0");

  // shared step motions: shell in at the window start, faint icon, then lit on the keyword
  const stepMotions = (i, shellFrom) => {
    const enter = Math.min(t[i], w.a + 0.05 + i * 0.07);
    const ghost = t[i] - enter >= 0.7;
    return [
      { prim: "reveal", target: `#${S}-n${i + 1}`, at: enter, dur: 0.45, from: shellFrom, ease: ctx.ease },
      ...(ghost ? [{ prim: "reveal", target: `#${S}-i${i + 1}`, at: enter + 0.1, dur: 0.35, from: { opacity: 0 }, to: { opacity: 0.3 } }] : []),
      { prim: "reveal", target: `#${S}-i${i + 1}`, at: fit(ghost ? t[i] : Math.max(t[i], enter + 0.1), 0.45), dur: 0.45, from: { opacity: ghost ? 0.3 : 0, scale: 0.7 }, ease: "back.out(2)" },
      { prim: "reveal", target: `#${S}-k${i + 1}`, at: fit(t[i], 0.4), dur: 0.4, from: { opacity: 0, scale: 1.25 } },
      { prim: "reveal", target: `#${S}-l${i + 1}`, at: fit(t[i] + 0.1, 0.45), dur: 0.45, from: ctx.motionFrom(), ease: ctx.ease },
    ];
  };
  const spark = `<div id="${S}-spk"><div id="${S}-spkc"></div></div>`;
  const sparkCss = `
#${S}-spk { position: absolute; left: 0; top: 0; width: 0; height: 0; }
#${S}-spkc { position: absolute; left: -16px; top: -16px; width: 32px; height: 32px; border-radius: 50%; background: var(--gold);
  box-shadow: 0 0 24px 8px color-mix(in srgb, var(--gold) 55%, transparent); }`;
  // one orbit per path piece, never overlapping the previous piece; returns the end time
  let sparkEnd = -1;
  const ride = (pts, at, dur) => {
    const a = Math.max(at, sparkEnd + ctx.gap + 0.01);
    const d = Math.min(dur, w.b - a - 0.05);
    if (d < 0.25 || pts.length < 2) return;
    m.push({ prim: "orbit", target: `#${S}-spk`, points: pts, at: a, dur: d });
    sparkEnd = a + d;
  };

  if (ctx.variant === "loop") {
    const C = { x: 880, y: 410 }, r = 300;
    const ang = steps.map((_, i) => -90 + (360 / n) * i);
    const pos = ang.map((a) => [Math.round(C.x + r * Math.cos((a * Math.PI) / 180)), Math.round(C.y + r * Math.sin((a * Math.PI) / 180))]);
    const chev = ang.map((a) => {
      const mid = a + 180 / n;
      const [x, y] = [C.x + r * Math.cos((mid * Math.PI) / 180), C.y + r * Math.sin((mid * Math.PI) / 180)];
      return `<path class="${S}-chev" d="M-10 -14 L8 0 L-10 14" transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(mid + 90).toFixed(1)})"/>`;
    });
    const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-ring { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-ring .${S}-track { fill: none; stroke: color-mix(in srgb, var(--ink) 10%, transparent); stroke-width: 2; }
#${S}-ringp { fill: none; stroke: var(--gold); stroke-width: 6; stroke-linecap: round; stroke-dasharray: 1000; }
.${S}-chev { fill: none; stroke: var(--cyan); stroke-width: 4; stroke-linecap: round; stroke-linejoin: round; opacity: 0.8; }
#${S}-core { position: absolute; left: ${C.x - 90}px; top: ${C.y - 90}px; width: 180px; height: 180px; color: var(--muted); }
#${S}-core svg { width: 180px; height: 180px; }
.${S}-slot { position: absolute; width: 800px; height: 96px; margin: -48px 0 0 -400px; display: flex; justify-content: center; }
.${S}-node { position: relative; flex: none; height: 96px; display: flex; align-items: center; padding: 0 34px 0 22px; box-sizing: border-box;
  border-radius: 48px; background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 14%, transparent); }
.${S}-lit { position: absolute; inset: -2px; border-radius: 48px; border: 4px solid var(--gold);
  box-shadow: 0 0 22px color-mix(in srgb, var(--gold) 35%, transparent); }
.${S}-num { margin-right: 20px; font-family: "${theme.mono}", monospace; font-size: 28px; color: var(--cyan); }
.${S}-ico { flex: none; width: 52px; height: 52px; margin-right: 14px; color: var(--gold); }
.${S}-ico svg { width: 52px; height: 52px; }
.${S}-lab { font-size: ${n >= 5 ? 30 : 36}px; font-weight: 800; color: var(--ink); white-space: nowrap; }
${sparkCss}`;
    const html = `<div id="${S}-root">
  <div id="${S}-grp">
    <svg id="${S}-ring" viewBox="0 0 1760 820">
      <circle class="${S}-track" cx="${C.x}" cy="${C.y}" r="${r}"/>
      <path id="${S}-ringp" pathLength="1000" d="M${C.x} ${C.y - r} A${r} ${r} 0 1 1 ${C.x - 0.1} ${C.y - r}"/>
      <g id="${S}-chevs">${chev.join("")}</g>
    </svg>
    <div id="${S}-core">${ctx.icon("gear")}</div>
    ${spark}
    ${steps.map((s, i) => `<div class="${S}-slot" style="left: ${pos[i][0]}px; top: ${pos[i][1]}px"><div class="${S}-node" id="${S}-n${i + 1}">
      <div class="${S}-lit" id="${S}-k${i + 1}"></div><div class="${S}-num">${num(i)}</div>
      <div class="${S}-ico" id="${S}-i${i + 1}">${ctx.icon(s.icon)}</div><div class="${S}-lab" id="${S}-l${i + 1}">${esc(s.label)}</div></div></div>`).join("\n    ")}
  </div>
</div>`;
    m.push(
      { prim: "draw", target: `#${S}-ringp`, at: w.a + 0.05, dur: Math.max(0.6, Math.min(1.4, last - w.a)) },
      { prim: "reveal", target: `#${S}-chevs`, at: w.a + 0.3, dur: 0.5, from: { opacity: 0 } },
      { prim: "reveal", target: `#${S}-core`, at: w.a + 0.1, dur: 0.5, from: { opacity: 0 }, to: { opacity: 0.25 } },
      ...steps.flatMap((_, i) => stepMotions(i, { opacity: 0, scale: 0.7 })),
      { prim: "reveal", target: `#${S}-spkc`, at: fit(t[0], 0.35), dur: 0.35, from: { opacity: 0, scale: 0.3 } },
    );
    if (w.b - (w.a + 0.65) > 0.8) m.push({ prim: "slide", target: `#${S}-core`, at: w.a + 0.65, dur: w.b - w.a - 0.7, from: { rotation: 0 }, to: { rotation: 120 }, ease: "none" });
    // the spark sits on step 1, hops to each step as it lights, then laps the ring
    // it waits on the ring just before each pill, so it never covers a label (wide pills need more arc at top/bottom)
    const stop = ang.map((a) => a - (14 * Math.abs(Math.cos((a * Math.PI) / 180)) + 38 * Math.abs(Math.sin((a * Math.PI) / 180))));
    const p0 = arc(C, r, stop[0], stop[0], 1)[0];
    ride([p0, p0], fit(t[0], 0.3), 0.3);
    for (let i = 1; i < n; i++) ride(arc(C, r, stop[i - 1], stop[i]), t[i] - 0.25, Math.min(0.7, Math.max(0.3, t[i] - t[i - 1] - 0.1)));
    const lapAt = Math.max(tSpark, sparkEnd + 0.1);
    const lapDur = w.b - lapAt - 0.08;
    if (lapDur > 0.5) {
      const span = Math.max(90, Math.min(720, lapDur * 240));
      ride(arc(C, r, stop[n - 1], stop[n - 1] + span, 12), lapAt, lapDur);
    }
    const d = ctx.drift(`#${S}-grp`, fit(last + 0.6, 0.7), 10);
    if (d) m.push(d);
    return { css, html, motions: m };
  }

  if (ctx.variant === "branch") {
    const src = { x: 300, y: 380 };
    const br = steps.slice(1);
    const k = br.length;
    const gap = k <= 2 ? 220 : k === 3 ? 190 : 165;
    const ys = br.map((_, j) => Math.round(410 + (j - (k - 1) / 2) * gap));
    const curve = (j) => [[src.x + 150, src.y], [720, src.y], [800, ys[j]], [1000, ys[j]]];
    const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-web { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-trk { fill: none; stroke: color-mix(in srgb, var(--ink) 9%, transparent); stroke-width: 3; }
.${S}-cv { fill: none; stroke: var(--gold); stroke-width: 5; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-n1 { position: absolute; left: ${src.x - 150}px; top: ${src.y - 208}px; width: 300px; height: 358px; }
#${S}-d1 { position: absolute; left: 0; top: 58px; width: 300px; height: 300px; box-sizing: border-box; border-radius: 50%;
  background: var(--surface); border: 3px solid color-mix(in srgb, var(--ink) 14%, transparent); }
#${S}-k1 { position: absolute; inset: -3px; border-radius: 50%; border: 6px solid var(--gold); box-shadow: 0 0 30px color-mix(in srgb, var(--gold) 35%, transparent); }
#${S}-i1 { position: absolute; left: 75px; top: 75px; width: 150px; height: 150px; color: var(--gold); }
#${S}-i1 svg { width: 150px; height: 150px; }
#${S}-num1 { position: absolute; left: 0; top: 0; width: 300px; text-align: center; font-family: "${theme.mono}", monospace; font-size: 32px; color: var(--cyan); }
#${S}-l1 { position: absolute; left: ${src.x - 280}px; top: ${src.y + 175}px; width: 560px; text-align: center; font-size: 54px; font-weight: 800; color: var(--ink); }
.${S}-card { position: absolute; left: 1000px; width: 680px; height: 124px; margin-top: -62px; box-sizing: border-box; border-radius: ${R}px;
  background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-lit { position: absolute; left: 0; top: 0; width: 8px; height: 100%; border-radius: ${R}px 0 0 ${R}px; background: var(--gold); }
.${S}-ico { position: absolute; left: 36px; top: 26px; width: 72px; height: 72px; color: var(--gold); }
.${S}-ico svg { width: 72px; height: 72px; }
.${S}-lab { position: absolute; left: 136px; top: 34px; font-size: 44px; font-weight: 800; color: var(--ink); white-space: nowrap; }
.${S}-num { position: absolute; right: 30px; top: 40px; font-family: "${theme.mono}", monospace; font-size: 32px; color: var(--cyan); }
${sparkCss}`;
    const html = `<div id="${S}-root">
  <div id="${S}-grp">
    <svg id="${S}-web" viewBox="0 0 1760 820">
      ${br.map((_, j) => { const [a, b, c, d] = curve(j); return `<path class="${S}-trk" d="M${a} C${b} ${c} ${d}"/><path class="${S}-cv" id="${S}-cv${j + 2}" pathLength="1000" d="M${a} C${b} ${c} ${d}"/>`; }).join("")}
    </svg>
    <div id="${S}-n1"><div id="${S}-num1">${num(0)}</div><div id="${S}-d1"><div id="${S}-k1"></div><div id="${S}-i1">${ctx.icon(steps[0].icon)}</div></div></div>
    <div id="${S}-l1">${esc(steps[0].label)}</div>
    ${br.map((s, j) => `<div class="${S}-card" id="${S}-n${j + 2}" style="top: ${ys[j]}px"><div class="${S}-lit" id="${S}-k${j + 2}"></div>
      <div class="${S}-ico" id="${S}-i${j + 2}">${ctx.icon(s.icon)}</div><div class="${S}-lab" id="${S}-l${j + 2}">${esc(s.label)}</div><div class="${S}-num">${num(j + 1)}</div></div>`).join("\n    ")}
    ${spark}
  </div>
</div>`;
    m.push(
      ...stepMotions(0, { opacity: 0, scale: 0.8 }),
      ...br.flatMap((_, j) => stepMotions(j + 1, { opacity: 0, x: 60 })),
      ...br.map((_, j) => ({ prim: "draw", target: `#${S}-cv${j + 2}`, at: fit(t[j + 1] - 0.2, 0.5), dur: 0.5 })),
    );
    const sa = fit(Math.max(tSpark, last + 0.5), 0.6);
    m.push({ prim: "reveal", target: `#${S}-spkc`, at: sa, dur: 0.25, from: { opacity: 0, scale: 0.3 } });
    ride(bez(...curve(k - 1)), sa, Math.min(1.2, w.b - sa - 0.1));
    const d = ctx.drift(`#${S}-grp`, fit(Math.max(last + 0.6, sparkEnd + 0.1), 0.7), 10);
    if (d) m.push(d);
    return { css, html, motions: m };
  }

  // linear
  const loop = slots.loop === true;
  const cy = loop ? 320 : 380, disc = 190;
  const xs = steps.map((_, i) => Math.round(n === 1 ? 880 : 200 + (i * 1360) / (n - 1)));
  const back = `M${xs[n - 1]} ${cy + 230} C ${xs[n - 1]} ${cy + 360} ${xs[0]} ${cy + 360} ${xs[0]} ${cy + 230}`;
  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-web { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-trk { fill: none; stroke: color-mix(in srgb, var(--ink) 12%, transparent); stroke-width: 3; stroke-dasharray: 8 10; }
.${S}-cn { fill: none; stroke: var(--gold); stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
#${S}-back { stroke: var(--cyan); stroke-width: 4; }
.${S}-node { position: absolute; top: ${cy - disc / 2 - 62}px; width: ${disc}px; height: ${disc + 62}px; margin-left: -${disc / 2}px; }
.${S}-disc { position: absolute; left: 0; top: 62px; width: ${disc}px; height: ${disc}px; box-sizing: border-box;
  border-radius: 50%; background: var(--surface); border: 3px solid color-mix(in srgb, var(--ink) 14%, transparent); }
.${S}-lit { position: absolute; inset: -3px; border-radius: 50%; border: 6px solid var(--gold); box-shadow: 0 0 26px color-mix(in srgb, var(--gold) 35%, transparent); }
.${S}-ico { position: absolute; left: 47px; top: 47px; width: 90px; height: 90px; color: var(--gold); }
.${S}-ico svg { width: 90px; height: 90px; }
.${S}-num { position: absolute; left: 0; top: 0; width: ${disc}px; text-align: center; font-family: "${theme.mono}", monospace; font-size: 34px; color: var(--cyan); }
.${S}-lab { position: absolute; top: ${cy + disc / 2 + 28}px; width: 320px; margin-left: -160px; text-align: center; font-size: ${n >= 5 ? 34 : 40}px;
  font-weight: 800; line-height: 1.15; color: var(--ink); }
${sparkCss}`;
  const seg = (i) => `M${xs[i] + disc / 2 + 14} ${cy} L${xs[i + 1] - disc / 2 - 18} ${cy} M${xs[i + 1] - disc / 2 - 34} ${cy - 14} L${xs[i + 1] - disc / 2 - 18} ${cy} L${xs[i + 1] - disc / 2 - 34} ${cy + 14}`;
  const html = `<div id="${S}-root">
  <div id="${S}-grp">
    <svg id="${S}-web" viewBox="0 0 1760 820">
      <path class="${S}-trk" d="M${xs[0]} ${cy} L${xs[n - 1]} ${cy}"/>
      ${steps.slice(1).map((_, i) => `<path class="${S}-cn" id="${S}-c${i + 2}" pathLength="1000" d="${seg(i)}"/>`).join("")}
      ${loop ? `<path class="${S}-cn" id="${S}-back" pathLength="1000" d="${back}"/>` : ""}
    </svg>
    ${steps.map((s, i) => `<div class="${S}-node" id="${S}-n${i + 1}" style="left: ${xs[i]}px"><div class="${S}-num">${num(i)}</div>
      <div class="${S}-disc"><div class="${S}-lit" id="${S}-k${i + 1}"></div><div class="${S}-ico" id="${S}-i${i + 1}">${ctx.icon(s.icon)}</div></div></div>
    <div class="${S}-lab" id="${S}-l${i + 1}" style="left: ${xs[i]}px">${esc(s.label)}</div>`).join("\n    ")}
    ${spark}
  </div>
</div>`;
  m.push(
    ...steps.flatMap((_, i) => stepMotions(i, { opacity: 0, y: 40 })),
    ...steps.slice(1).map((_, i) => ({ prim: "draw", target: `#${S}-c${i + 2}`, at: fit(t[i + 1] - 0.25, 0.4), dur: 0.4 })),
  );
  const sa = fit(Math.max(tSpark, last + 0.5), 0.6);
  m.push({ prim: "reveal", target: `#${S}-spkc`, at: sa, dur: 0.25, from: { opacity: 0, scale: 0.3 } });
  const room = w.b - sa - 0.1;
  const runDur = Math.min(1.4, loop ? room * 0.5 : room);
  ride(xs.map((x) => [x, cy]), sa, runDur);
  if (loop) {
    m.push({ prim: "draw", target: `#${S}-back`, at: sa, dur: Math.max(0.4, Math.min(0.9, room)) });
    ride([[xs[n - 1], cy], ...bez([xs[n - 1], cy + 230], [xs[n - 1], cy + 360], [xs[0], cy + 360], [xs[0], cy + 230]), [xs[0], cy]], sparkEnd, Math.min(1.4, w.b - sparkEnd - 0.1));
  }
  const d = ctx.drift(`#${S}-grp`, fit(Math.max(last + 0.6, sparkEnd + 0.1), 0.7), 10);
  if (d) m.push(d);
  return { css, html, motions: m };
}
