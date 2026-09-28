// card-exercise — DNA card "BÀI TẬP NHANH · <minutes> PHÚT" (icon timer): a quick exercise the learner does with the
// video paused. The card lasts 8–10 s (never a real hold of `minutes`); a timer ring is drawn by strokeDashoffset over the
// WHOLE shot with a spark riding its head, and the ring pulses the whole time, so the frame never stands still.
// The line "Dừng video và làm ngay" lands after the task (and steps) as the call to act.
// timer-ring: a 380 px ring at the left counts up to the minutes; the task and up to 3 numbered steps at the right.
// steps: the task runs as a headline across the top beside a small ring; the steps are tiles in a row joined by drawn
//   arrows, each lit on its cue (no steps: the call to act takes the row).
// sticky-note (open, no card box): a tilted sticky note, taped over a second note, holds the task and steps; on each cue
//   a pen travels to the line and draws its checkbox, then hovers over the note; a ghost timer turns slowly at the right
//   and the note sways on its tape until the shot ends. "Tạm dừng video" is only a small line at the foot of the note.

import { dnaCard, fit, keepInside, lines, openLabel } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["label", "task", ...(slots.steps ?? []).map((_, i) => `steps.${i}`)];

export function render(ctx) {
  if (ctx.variant === "sticky-note") return stickyNote(ctx);
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
  // minY/unitY: offsets from the centre; a mono numeral renders a ~1.34 em text box, so unitY ≥ minY + 1.34·fs + 6 (two digits too)
  const ring = big ? { x: 60, y: 150, d: 390, sw: 16, fs: 170, minY: -115, unitY: 105, uf: 28 } : { x: 1150, y: 96, d: 230, sw: 12, fs: 84, minY: -58, unitY: 48, uf: 24 };
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
  font-size: ${ring.uf}px; letter-spacing: 0.18em; color: var(--muted); }
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


// the note's paper and the pencil-dark text on it (a physical object: its colours do not follow the dark ground)
const PAPER = "color-mix(in srgb, var(--gold) 45%, #FFF1A6)";
const PAPER_INK = "#2B2416";

function stickyNote(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const minutes = slots.minutes ?? 5;
  const steps = slots.steps ?? [];
  const Z = ctx.zones["split-60-40"];
  const mono = `"${theme.mono}", monospace`;
  const id = openLabel(ctx, { label: `BÀI TẬP NHANH · ${minutes} PHÚT`, icon: ctx.icon("timer"), x: Z.a.x + 20, y: Z.a.y + 8 });
  const tT = ctx.at("task");
  const tS = steps.map((_, i) => ctx.at(`steps.${i}`));
  const last = Math.max(tT, ...tS);

  // the note (stage px), tilted about its tape
  const N = { x: 90, y: 84, w: 900, h: 690, tilt: -2 };
  const th = (N.tilt * Math.PI) / 180;
  const toStage = (px, py) => {
    const dx = px - N.w / 2;
    return [N.x + N.w / 2 + dx * Math.cos(th) - py * Math.sin(th), N.y + dx * Math.sin(th) + py * Math.cos(th)];
  };
  const txtFs = fit(slots.task, [[40, 50], [60, 44], [80, 40]]);
  const hT = lines(slots.task, txtFs, 700) * Math.round(txtFs * 1.24);
  const taskY = 90, rowH = 78, stFs = 32;
  const yS = taskY + hT + 60;
  // checkboxes (note px): the task's, then one per step
  const boxes = [
    { x: 44, y: taskY + Math.round((txtFs * 1.24 - 50) / 2), s: 50, at: tT },
    ...steps.map((_, i) => ({ x: 50, y: yS + i * rowH + (rowH - 42) / 2 - 6, s: 42, at: tS[i] })),
  ];

  // the pen: a 260 px svg whose nib sits at its top-left corner, the body leaning down-right like a writing hand
  const P = { x: 1290, y: 300, d: 260 };
  const penAt = ([sx, sy]) => [Math.round((sx - P.x) * 10) / 10, Math.round((sy - P.y) * 10) / 10];
  const css = `${id.css}
#${S}-gt { position: absolute; left: ${Z.b.x + 170}px; top: 90px; width: 400px; height: 400px; color: color-mix(in srgb, var(--gold) 13%, transparent); }
#${S}-gt svg { width: 400px; height: 400px; display: block; }
#${S}-bnw { position: absolute; left: ${N.x + 70}px; top: ${N.y + 26}px; width: ${N.w - 40}px; height: ${N.h - 30}px; transform: rotate(4deg); }
#${S}-bn { position: absolute; left: 0; top: 0; width: 100%; height: 100%; border-radius: 4px;
  background: color-mix(in srgb, var(--cyan) 30%, var(--surface)); box-shadow: 0 16px 30px color-mix(in srgb, var(--canvas) 55%, transparent); }
#${S}-nw { position: absolute; left: ${N.x}px; top: ${N.y}px; width: ${N.w}px; height: ${N.h}px; transform-origin: 50% 0; transform: rotate(${N.tilt}deg); }
#${S}-note { position: absolute; left: 0; top: 0; width: ${N.w}px; height: ${N.h}px; border-radius: 4px 4px 22px 4px; transform-origin: 50% 0;
  background-color: ${PAPER};
  background-image: repeating-linear-gradient(to bottom, transparent 0 ${rowH - 2}px, color-mix(in srgb, ${PAPER_INK} 9%, transparent) ${rowH - 2}px ${rowH}px);
  background-position: 0 ${yS - 4}px; box-shadow: 0 24px 40px color-mix(in srgb, var(--canvas) 65%, transparent); }
#${S}-tape { position: absolute; left: ${N.w / 2 - 110}px; top: -22px; width: 220px; height: 48px; border-radius: 3px;
  background: color-mix(in srgb, var(--ink) 38%, transparent); }
#${S}-task { position: absolute; left: 124px; top: ${taskY}px; width: 720px; font-size: ${txtFs}px; font-weight: 800; line-height: 1.24; color: ${PAPER_INK}; }
#${S}-ul { position: absolute; left: 124px; top: ${taskY + hT + 12}px; width: 520px; height: 24px; overflow: visible; }
#${S}-ul path { fill: none; stroke: color-mix(in srgb, var(--warn) 80%, ${PAPER_INK}); stroke-width: 5; stroke-linecap: round; stroke-dasharray: 1000; }
.${S}-st { position: absolute; left: 124px; width: 730px; height: ${rowH}px; display: flex; align-items: center; font-size: ${stFs}px;
  font-weight: 600; line-height: 1.2; color: ${PAPER_INK}; }
.${S}-bx { position: absolute; overflow: visible; }
.${S}-bx path { fill: none; stroke: ${PAPER_INK}; stroke-width: 4; stroke-linejoin: round; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-call { position: absolute; left: 124px; top: ${N.h - 70}px; height: 34px; display: flex; align-items: center; gap: 12px;
  font-family: ${mono}; font-size: 22px; letter-spacing: 0.08em; color: color-mix(in srgb, ${PAPER_INK} 70%, transparent); }
#${S}-call svg { width: 22px; height: 22px; }
#${S}-call rect { fill: color-mix(in srgb, ${PAPER_INK} 70%, transparent); }
#${S}-pen { position: absolute; left: ${P.x}px; top: ${P.y}px; width: ${P.d}px; height: ${P.d}px; overflow: visible; }
${steps.map((_, i) => `#${S}-s${i + 1} { top: ${yS + i * rowH - 6}px; }`).join("\n")}
${boxes.map((b, k) => `#${S}-b${k} { left: ${b.x}px; top: ${b.y}px; width: ${b.s}px; height: ${b.s}px; }`).join("\n")}`;
  const penSvg = `<svg id="${S}-pen" viewBox="0 0 ${P.d} ${P.d}"><g transform="rotate(45)">
      <polygon points="0,0 48,-16 48,16" style="fill: ${PAPER_INK}; stroke: var(--ink); stroke-width: 2"/>
      <rect x="48" y="-18" width="26" height="36" style="fill: color-mix(in srgb, var(--ink) 80%, var(--canvas))"/>
      <rect x="74" y="-18" width="230" height="36" rx="6" style="fill: var(--cyan)"/>
      <rect x="250" y="-20" width="70" height="40" rx="8" style="fill: var(--gold)"/>
      <rect x="150" y="-26" width="90" height="10" rx="4" style="fill: var(--gold)"/></g></svg>`;
  const html = `${id.html}
    <div id="${S}-gt">${ctx.icon("timer")}</div>
    <div id="${S}-bnw"><div id="${S}-bn"></div></div>
    <div id="${S}-nw"><div id="${S}-note"><div id="${S}-tape"></div>
      <div id="${S}-task">${esc(slots.task)}</div>
      <svg id="${S}-ul" viewBox="0 0 520 24"><path id="${S}-ulp" pathLength="1000" d="M4 14 C120 4 240 22 360 12 S480 8 516 14"/></svg>
${steps.map((s, i) => `      <div class="${S}-st" id="${S}-s${i + 1}">${esc(s)}</div>`).join("\n")}
${boxes.map((b, k) => `      <svg class="${S}-bx" id="${S}-b${k}" viewBox="0 0 ${b.s} ${b.s}"><path id="${S}-bp${k}" pathLength="1000" d="M2 2 H${b.s - 2} V${b.s - 2} H2 Z"/></svg>`).join("\n")}
      <div id="${S}-call"><svg viewBox="0 0 22 22"><rect x="4" y="3" width="5" height="16" rx="1"/><rect x="13" y="3" width="5" height="16" rx="1"/></svg>Tạm dừng video</div>
    </div></div>
    ${penSvg}`;

  const callAt = Math.min(w.b - 1.0, last + 0.75);
  const m = [
    ...id.motions,
    { prim: "reveal", target: `#${S}-gt`, at: w.a + 0.1, dur: 0.6, from: { opacity: 0, rotation: -25 } },
    { prim: "reveal", target: `#${S}-bn`, at: w.a, dur: 0.5, from: { opacity: 0, y: 30 }, ease: ctx.ease },
    { prim: "reveal", target: `#${S}-note`, at: w.a + 0.08, dur: 0.6, from: { opacity: 0, y: -50, rotation: 3 }, ease: "back.out(1.4)" },
    { prim: "reveal", target: `#${S}-pen`, at: w.a + 0.25, dur: 0.5, from: { opacity: 0, x: 140, y: 70 }, ease: ctx.ease },
    { prim: "reveal", target: `#${S}-task`, at: tT, dur: 0.55, from: ctx.motionFrom(), ease: ctx.ease },
    { prim: "draw", target: `#${S}-ulp`, at: tT + 0.45, dur: 0.5 },
    { prim: "reveal", target: `#${S}-call`, at: callAt, dur: 0.45, from: { opacity: 0, y: 10 } },
  ];
  // the ghost timer turns for the whole shot
  const gtAt = w.a + 0.72;
  if (w.b - 0.05 - gtAt > 0.5) m.push({ prim: "slide", target: `#${S}-gt`, at: gtAt, dur: w.b - 0.05 - gtAt, from: { rotation: 0 }, to: { rotation: 30 }, ease: "none" });
  steps.forEach((_, i) => m.push({ prim: "reveal", target: `#${S}-s${i + 1}`, at: tS[i], dur: 0.45, from: { opacity: 0, x: -16 }, ease: ctx.ease }));

  // the pen travels to each checkbox on its cue and traces it while the box draws; a box it cannot reach draws alone
  let pos = [0, 0], cur = w.a + 0.77;
  boxes.forEach((b, k) => {
    const corners = [[0, 0], [b.s, 0], [b.s, b.s], [0, b.s], [0, 0]].map(([u, v]) => penAt(toStage(b.x + u, b.y + v)));
    const start = Math.max(b.at, cur + 0.02);
    if (start + 0.95 <= w.b - 0.15) {
      m.push(
        { prim: "slide", target: `#${S}-pen`, at: start, dur: 0.3, from: { x: pos[0], y: pos[1] }, to: { x: corners[0][0], y: corners[0][1] }, ease: "power2.inOut" },
        { prim: "orbit", target: `#${S}-pen`, points: corners, at: start + 0.32, dur: 0.6 },
        { prim: "draw", target: `#${S}-bp${k}`, at: start + 0.32, dur: 0.58, ease: "none" },
      );
      pos = corners[0];
      cur = start + 0.92;
    } else {
      m.push({ prim: "draw", target: `#${S}-bp${k}`, at: Math.min(b.at, w.b - 0.5), dur: 0.45 });
    }
  });
  // then it lifts off to the note's right margin and hovers in small loops until the end
  const lastBox = boxes.at(-1);
  const lift = penAt(toStage(N.w - 70, lastBox.y - 30));
  const liftAt = cur + 0.02;
  if (w.b - 0.05 - liftAt > 0.5) {
    m.push({ prim: "slide", target: `#${S}-pen`, at: liftAt, dur: 0.4, from: { x: pos[0], y: pos[1] }, to: { x: lift[0], y: lift[1] }, ease: "power2.out" });
    const loopAt = liftAt + 0.42, loopDur = w.b - 0.05 - loopAt;
    if (loopDur > 0.6) {
      const loops = Math.max(1, Math.round(loopDur / 1.4)), k = loops * 12;
      const pts = Array.from({ length: k + 1 }, (_, j) => {
        const a = (j / 12) * 2 * Math.PI;
        return [Math.round((lift[0] + 14 * Math.sin(a)) * 10) / 10, Math.round((lift[1] - 10 + 10 * Math.cos(a)) * 10) / 10];
      });
      m.push({ prim: "orbit", target: `#${S}-pen`, points: pts, at: loopAt, dur: loopDur });
    }
  }
  // the note sways on its tape once the pen is done with it
  const swayAt = Math.max(w.a + 0.72, cur + 0.05);
  if (w.b - 0.05 - swayAt > 0.6) m.push({ prim: "slide", target: `#${S}-note`, at: swayAt, dur: w.b - 0.05 - swayAt, from: { rotation: 0 }, to: { rotation: -0.8 }, ease: "sine.inOut" });
  return { css, html, motions: keepInside(m, w.b) };
}
