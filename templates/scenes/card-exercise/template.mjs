// card-exercise — DNA card "BÀI TẬP NHANH · <minutes> PHÚT" (icon timer): a quick exercise the learner does with the
// video paused. The card lasts 8–10 s (never a real hold of `minutes`); a timer ring is drawn by strokeDashoffset over the
// WHOLE shot with a spark riding its head, and the ring pulses the whole time, so the frame never stands still.
// The line "Dừng video và làm ngay" lands after the task (and steps) as the call to act.
// timer-ring: a 380 px ring at the left counts up to the minutes; the task and up to 3 numbered steps at the right.
// steps: the task runs as a headline across the top beside a small ring; the steps are tiles in a row joined by drawn
//   arrows, each lit on its cue (no steps: the call to act takes the row).

import { dnaCard, fit, lines } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["label", "task", ...(slots.steps ?? []).map((_, i) => `steps.${i}`)];

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const minutes = slots.minutes ?? 5;
  const card = dnaCard(ctx, { label: `BÀI TẬP NHANH · ${minutes} PHÚT`, icon: ctx.icon("timer") });
  const steps = slots.steps ?? [];
  const tT = ctx.at("task");
  const tS = steps.map((_, i) => ctx.at(`steps.${i}`));
  const last = Math.max(tT, ...tS);
  const mono = `"${theme.mono}", monospace`;
  const r = theme.radius ?? 18;
  const big = ctx.variant !== "steps";

  // the ring: geometry (card-local) and the whole-shot draw + spark + pulse
  // minY/unitY: offsets from the centre; a big mono numeral renders a ~1.3 em text box, so the unit sits ≥ 0.2 em below it
  const ring = big ? { x: 60, y: 150, d: 390, sw: 16, fs: 170, minY: -115, unitY: 105 } : { x: 1150, y: 96, d: 230, sw: 12, fs: 96, minY: -60, unitY: 43 };
  const R = ring.d / 2 - ring.sw;
  const c = ring.d / 2;
  const runFrom = w.a + 0.1, runDur = Math.max(1, w.b - 0.1 - runFrom);
  const pts = Array.from({ length: 25 }, (_, k) => {
    const a = (k / 24) * 2 * Math.PI;
    return [Math.round(R * Math.sin(a) * 10) / 10, Math.round(R * (1 - Math.cos(a)) * 10) / 10];
  });
  const callAt = Math.min(w.b - 1.0, last + 0.75);

  const ringCss = `
#${S}-rw { position: absolute; left: ${ring.x}px; top: ${ring.y}px; width: ${ring.d}px; height: ${ring.d}px; }
#${S}-rp { position: absolute; left: 0; top: 0; width: ${ring.d}px; height: ${ring.d}px; }
#${S}-ring { position: absolute; left: 0; top: 0; width: ${ring.d}px; height: ${ring.d}px; overflow: visible; }
#${S}-ring circle { fill: none; stroke-width: ${ring.sw}; }
#${S}-ring .${S}-trk { stroke: color-mix(in srgb, var(--ink) 12%, transparent); }
#${S}-ring .${S}-run { stroke: var(--gold); stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-spark { position: absolute; left: ${c - 13}px; top: ${ring.sw - 13}px; width: 26px; height: 26px; border-radius: 50%;
  background: var(--ink); box-shadow: 0 0 18px var(--gold); }
#${S}-min { position: absolute; left: 0; top: ${c + ring.minY}px; width: ${ring.d}px; text-align: center; font-family: ${mono};
  font-size: ${ring.fs}px; font-weight: 700; line-height: 1; color: var(--gold); }
#${S}-unit { position: absolute; left: 0; top: ${c + ring.unitY}px; width: ${ring.d}px; text-align: center; font-family: ${mono};
  font-size: 28px; letter-spacing: 0.18em; color: var(--muted); }
#${S}-call { position: absolute; height: 76px; display: flex; align-items: center; gap: 18px; padding: 0 34px; border-radius: 38px;
  border: 2px solid var(--gold); background: color-mix(in srgb, var(--gold) 14%, transparent); font-size: 34px; font-weight: 800; color: var(--gold); white-space: nowrap; }
#${S}-call svg { width: 34px; height: 34px; }
#${S}-call rect { fill: var(--gold); }`;
  const ringHtml = `    <div id="${S}-rw"><div id="${S}-rp">
      <svg id="${S}-ring" viewBox="0 0 ${ring.d} ${ring.d}"><circle class="${S}-trk" cx="${c}" cy="${c}" r="${R}"/>
        <circle class="${S}-run" id="${S}-run" pathLength="1000" cx="${c}" cy="${c}" r="${R}" transform="rotate(-90 ${c} ${c})"/></svg>
      <div id="${S}-spark"></div>
      <div id="${S}-min">${minutes}</div>
      <div id="${S}-unit">PHÚT</div>
    </div></div>`;
  const callHtml = `    <div id="${S}-call"><svg viewBox="0 0 34 34"><rect x="7" y="5" width="7" height="24" rx="2"/><rect x="20" y="5" width="7" height="24" rx="2"/></svg>Dừng video và làm ngay</div>`;
  const ringMotions = [
    { prim: "reveal", target: `#${S}-rw`, at: w.a + 0.02, dur: 0.5, from: { opacity: 0, scale: 0.8 }, ease: "back.out(1.6)" },
    { prim: "draw", target: `#${S}-run`, at: runFrom, dur: runDur, ease: "none" },
    { prim: "orbit", target: `#${S}-spark`, points: pts, at: runFrom, dur: runDur },
    { prim: "count", target: `#${S}-min`, at: w.a + 0.2, dur: 0.8, to: minutes },
    { prim: "pulse", target: `#${S}-rp`, at: w.a + 0.6, dur: w.b - 0.05 - (w.a + 0.6) },
  ];

  if (!big) {
    // steps
    const n = steps.length;
    const txtFs = fit(slots.task, [[40, 56], [60, 50], [80, 44]]);
    const gap = 70;
    const tw = n ? Math.floor((1344 - (n - 1) * gap) / n) : 0;
    const tx = steps.map((_, i) => 48 + i * (tw + gap));
    const rowY = 380, rowH = 190;
    const css = `${ringCss}
#${S}-task { position: absolute; left: 48px; top: 130px; width: 1040px; font-size: ${txtFs}px; font-weight: 800; line-height: 1.22; color: var(--ink); }
#${S}-ph { position: absolute; left: 48px; top: 146px; width: 900px; }
#${S}-ph i { display: block; height: 18px; border-radius: 9px; margin-bottom: 40px; background: color-mix(in srgb, var(--ink) 10%, transparent); }
#${S}-ph i:last-child { width: 55%; }
.${S}-tile { position: absolute; top: ${rowY}px; width: ${tw}px; height: ${rowH}px; box-sizing: border-box; padding: 98px 26px 0 26px;
  border-radius: ${r}px; background: color-mix(in srgb, var(--ink) 5%, transparent); border: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-lit { position: absolute; left: -2px; right: -2px; top: -2px; bottom: -2px; border-radius: ${r}px; border: 2px solid var(--gold); }
.${S}-n { position: absolute; left: 26px; top: 22px; width: 58px; height: 58px; border-radius: 50%; box-sizing: border-box;
  border: 2px solid var(--cyan); display: flex; align-items: center; justify-content: center; font-family: ${mono}; font-size: 30px; font-weight: 700; color: var(--cyan); }
.${S}-st { font-size: ${n === 3 ? 30 : 34}px; font-weight: 700; line-height: 1.28; color: var(--ink); }
.${S}-arr { position: absolute; top: ${rowY + rowH / 2 - 24}px; width: ${gap}px; height: 48px; overflow: visible; }
.${S}-arr path { fill: none; stroke: var(--gold); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
#${S}-call { left: ${n ? 48 : 720 - 260}px; top: ${n ? 610 : 440}px; }
${tx.map((x, i) => `#${S}-s${i + 1} { left: ${x}px; }\n#${S}-a${i + 1} { left: ${x + tw}px; }`).join("\n")}`;
    const html = `${ringHtml}
    <div id="${S}-ph"><i></i><i></i></div>
    <div id="${S}-task">${esc(slots.task)}</div>
${steps.map((s, i) => `    <div class="${S}-tile" id="${S}-s${i + 1}"><div class="${S}-lit" id="${S}-l${i + 1}"></div><div class="${S}-n">${i + 1}</div><div class="${S}-st" id="${S}-t${i + 1}">${esc(s)}</div></div>`).join("\n")}
${steps.slice(0, -1).map((_, i) => `    <svg class="${S}-arr" id="${S}-a${i + 1}" viewBox="0 0 ${gap} 48"><path id="${S}-ap${i + 1}" pathLength="1000" d="M10 24 L${gap - 12} 24 M${gap - 28} 10 L${gap - 12} 24 L${gap - 28} 38"/></svg>`).join("\n")}
${callHtml}`;
    const m = [
      ...ringMotions,
      { prim: "reveal", target: `#${S}-ph`, at: w.a + 0.15, dur: 0.4, from: { opacity: 0, x: -20 } },
      { prim: "reveal", target: `#${S}-ph`, at: Math.max(tT, w.a + 0.57), dur: 0.25, from: { opacity: 1 }, to: { opacity: 0 } },
      { prim: "reveal", target: `#${S}-task`, at: tT, dur: 0.55, from: ctx.motionFrom(), ease: ctx.ease },
      { prim: "reveal", target: `#${S}-call`, at: callAt, dur: 0.5, from: { opacity: 0, y: 24, scale: 0.9 }, ease: "back.out(1.8)" },
    ];
    steps.forEach((_, i) => {
      const enter = Math.min(tS[i], w.a + 0.2 + i * 0.1);
      m.push(
        { prim: "reveal", target: `#${S}-s${i + 1}`, at: enter, dur: 0.5, from: { opacity: 0, y: 40 }, ease: ctx.ease },
        { prim: "reveal", target: `#${S}-l${i + 1}`, at: tS[i], dur: 0.4, from: { opacity: 0 } },
        { prim: "reveal", target: `#${S}-t${i + 1}`, at: tS[i] + 0.08, dur: 0.45, from: { opacity: 0, y: 16 } },
      );
      if (i > 0) m.push({ prim: "draw", target: `#${S}-ap${i}`, at: tS[i], dur: 0.35 });
    });
    return card.wrap({ css, html, motions: m, driftFrom: callAt + 0.6 });
  }

  // timer-ring
  const txtFs = fit(slots.task, [[40, 52], [60, 46], [80, 42]]);
  const hT = lines(slots.task, txtFs, 840) * Math.round(txtFs * 1.24);
  const stepH = 66;
  const total = hT + (steps.length ? 40 + steps.length * stepH : 0) + 40 + 76;
  const y0 = Math.max(120, Math.round(380 - total / 2));
  const yS = y0 + hT + 40;
  const yC = yS + (steps.length ? steps.length * stepH + 10 : -10);
  const css = `${ringCss}
#${S}-task { position: absolute; left: 520px; top: ${y0}px; width: 860px; font-size: ${txtFs}px; font-weight: 800; line-height: 1.24; color: var(--ink); }
#${S}-ph { position: absolute; left: 520px; top: ${y0 + 14}px; width: 800px; }
#${S}-ph i { display: block; height: 18px; border-radius: 9px; margin-bottom: 36px; background: color-mix(in srgb, var(--ink) 10%, transparent); }
#${S}-ph i:last-child { width: 55%; }
.${S}-step { position: absolute; left: 520px; width: 860px; height: ${stepH}px; display: flex; align-items: center; gap: 22px; font-size: 32px;
  font-weight: 600; color: var(--ink); }
.${S}-step b { flex: none; width: 48px; height: 48px; border-radius: 50%; box-sizing: border-box; border: 2px solid var(--cyan);
  display: flex; align-items: center; justify-content: center; font-family: ${mono}; font-size: 26px; color: var(--cyan); }
#${S}-call { left: 520px; top: ${yC}px; }
${steps.map((_, i) => `#${S}-s${i + 1} { top: ${yS + i * stepH}px; }`).join("\n")}`;
  const html = `${ringHtml}
    <div id="${S}-ph"><i></i><i></i></div>
    <div id="${S}-task">${esc(slots.task)}</div>
${steps.map((s, i) => `    <div class="${S}-step" id="${S}-s${i + 1}"><b>${i + 1}</b><span id="${S}-t${i + 1}">${esc(s)}</span></div>`).join("\n")}
${callHtml}`;
  const m = [
    ...ringMotions,
    { prim: "reveal", target: `#${S}-ph`, at: w.a + 0.15, dur: 0.4, from: { opacity: 0, x: -20 } },
    { prim: "reveal", target: `#${S}-ph`, at: Math.max(tT, w.a + 0.57), dur: 0.25, from: { opacity: 1 }, to: { opacity: 0 } },
    { prim: "reveal", target: `#${S}-task`, at: tT, dur: 0.55, from: ctx.motionFrom(), ease: ctx.ease },
    { prim: "reveal", target: `#${S}-call`, at: callAt, dur: 0.5, from: { opacity: 0, x: -30, scale: 0.9 }, ease: "back.out(1.8)" },
  ];
  steps.forEach((_, i) => {
    const enter = Math.min(tS[i], w.a + 0.25 + i * 0.1);
    m.push(
      { prim: "reveal", target: `#${S}-s${i + 1}`, at: enter, dur: 0.45, from: { opacity: 0, x: 30 }, ease: ctx.ease },
      ...(tS[i] - enter >= 0.7 ? [{ prim: "reveal", target: `#${S}-t${i + 1}`, at: tS[i], dur: 0.45, from: { opacity: 0, x: -12 } }] : []),
    );
  });
  return card.wrap({ css, html, motions: m, driftFrom: callAt + 0.6 });
}
