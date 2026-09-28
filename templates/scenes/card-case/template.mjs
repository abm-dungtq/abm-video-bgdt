// card-case — DNA card "TÌNH HUỐNG" (icon briefcase): a short situation with one striking detail and an optional question.
// story: a 340 px portrait ring (a person) is drawn at the left while placeholder lines wait at the right; the situation
//   rises on its cue, the striking detail lands in a gold callout that a drawn line ties to the portrait, and the
//   question closes in cyan.
// chat: the case plays as a message thread: a typing bubble pulses from the window start, the situation arrives as an
//   incoming bubble, the detail as a gold-edged bubble, and the question as the learner's own bubble at the right.

import { dnaCard, lines } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["label", "situation", "detail", ...(slots.question ? ["question"] : [])];

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const card = dnaCard(ctx, { label: "TÌNH HUỐNG", icon: ctx.icon("briefcase") });
  const tS = ctx.at("situation"), tD = ctx.at("detail");
  const tQ = slots.question ? ctx.at("question") : null;
  const last = tQ ?? tD;
  const r = theme.radius ?? 18;

  if (ctx.variant === "chat") {
    const fs = 38, lh = Math.round(fs * 1.32), bw = 960;
    const h = (text, width) => lines(text, fs, width - 60) * lh + 44;
    const hS = h(slots.situation, bw), hD = h(slots.detail, bw - 50), hQ = slots.question ? h(slots.question, 780 - 50) : 0;
    const gap = 26;
    const total = hS + gap + hD + (slots.question ? gap + hQ : 0);
    const y0 = Math.max(120, Math.round(120 + (540 - total) / 2));
    const yD = y0 + hS + gap, yQ = yD + hD + gap;
    const css = `
#${S}-av { position: absolute; left: 48px; top: ${y0}px; width: 110px; height: 110px; border-radius: 50%; box-sizing: border-box;
  border: 2px solid color-mix(in srgb, var(--gold) 50%, transparent); background: color-mix(in srgb, var(--gold) 10%, transparent);
  color: var(--gold); display: flex; align-items: center; justify-content: center; }
#${S}-av svg { width: 64px; height: 64px; }
.${S}-bub { position: absolute; box-sizing: border-box; padding: 22px 30px; font-size: ${fs}px; font-weight: 600; line-height: ${lh}px;
  color: var(--ink); border-radius: 30px; }
#${S}-typing { left: 190px; top: ${y0}px; width: 150px; height: 84px; border-radius: 6px 30px 30px 30px;
  background: color-mix(in srgb, var(--ink) 9%, transparent); }
.${S}-dot { position: absolute; top: 32px; width: 20px; height: 20px; border-radius: 50%; background: var(--muted); }
#${S}-sit { left: 190px; top: ${y0}px; max-width: ${bw}px; border-radius: 6px 30px 30px 30px; background: color-mix(in srgb, var(--ink) 9%, transparent); }
#${S}-det { left: 190px; top: ${yD}px; max-width: ${bw}px; display: flex; gap: 16px; align-items: flex-start; border-radius: 6px 30px 30px 30px;
  border: 2px solid var(--gold); background: color-mix(in srgb, var(--gold) 10%, transparent); }
#${S}-det svg { flex: none; width: 36px; height: 36px; margin-top: 4px; color: var(--gold); }
#${S}-q { right: 48px; top: ${yQ}px; max-width: 780px; display: flex; gap: 16px; align-items: flex-start; border-radius: 30px 6px 30px 30px;
  background: color-mix(in srgb, var(--cyan) 16%, transparent); }
#${S}-q svg { flex: none; width: 36px; height: 36px; margin-top: 4px; color: var(--cyan); }`;
    const html = `    <div id="${S}-av">${ctx.icon("person")}</div>
    <div class="${S}-bub" id="${S}-typing">${[0, 1, 2].map((k) => `<i class="${S}-dot" id="${S}-d${k + 1}" style="left: ${34 + k * 32}px"></i>`).join("")}</div>
    <div class="${S}-bub" id="${S}-sit">${esc(slots.situation)}</div>
    <div class="${S}-bub" id="${S}-det">${ctx.icon("spark")}<span>${esc(slots.detail)}</span></div>
${slots.question ? `    <div class="${S}-bub" id="${S}-q">${ctx.icon("question")}<span>${esc(slots.question)}</span></div>` : ""}`;
    const typeEnd = Math.max(tS, w.a + 0.45);
    const m = [
      { prim: "reveal", target: `#${S}-av`, at: w.a + 0.05, dur: 0.45, from: { opacity: 0, scale: 0.6 }, ease: "back.out(2)" },
      { prim: "reveal", target: `#${S}-typing`, at: w.a + 0.1, dur: 0.3, from: { opacity: 0, y: 16 } },
      { prim: "reveal", target: `#${S}-typing`, at: typeEnd, dur: 0.2, from: { opacity: 1 }, to: { opacity: 0 }, ease: "power1.in" },
      { prim: "reveal", target: `#${S}-sit`, at: tS, dur: 0.45, from: { opacity: 0, y: 24, scale: 0.96 }, ease: ctx.ease },
      { prim: "reveal", target: `#${S}-det`, at: tD, dur: 0.45, from: { opacity: 0, y: 24, scale: 0.96 }, ease: ctx.ease },
    ];
    // the three typing dots bob in turn until the first bubble arrives
    [0, 1, 2].forEach((k) => {
      const at = w.a + 0.2 + k * 0.12, dur = typeEnd - at - 0.02;
      if (dur > 0.3) m.push({ prim: "pulse", target: `#${S}-d${k + 1}`, at, dur });
    });
    if (tQ != null) m.push({ prim: "reveal", target: `#${S}-q`, at: tQ, dur: 0.45, from: { opacity: 0, x: 40 }, ease: ctx.ease });
    if (tD > tS + 0.5 + ctx.gap) m.push({ prim: "dim", targets: [`#${S}-sit`], at: tD, to: 0.7 });
    return card.wrap({ css, html, motions: m, driftFrom: last + 0.6 });
  }

  // story
  const fsS = 42, fsD = 34;
  const hS = lines(slots.situation, fsS, 900) * Math.round(fsS * 1.28);
  const hD = lines(slots.detail, fsD, 760) * Math.round(fsD * 1.3) + 48;
  const hQ = slots.question ? lines(slots.question, fsD, 830) * Math.round(fsD * 1.3) : 0;
  const total = hS + 40 + hD + (slots.question ? 40 + hQ : 0);
  const y0 = Math.max(120, Math.round(390 - total / 2));
  const yD = y0 + hS + 40, yQ = yD + hD + 40;
  const css = `
#${S}-pic { position: absolute; left: 50px; top: 190px; width: 340px; height: 340px; }
#${S}-ring { position: absolute; left: 0; top: 0; width: 340px; height: 340px; overflow: visible; }
#${S}-ring circle { fill: none; stroke-width: 6; stroke-dasharray: 1000; }
#${S}-ring .${S}-trk { stroke: color-mix(in srgb, var(--ink) 14%, transparent); stroke-width: 3; }
#${S}-ring .${S}-arc { stroke: var(--gold); stroke-linecap: round; }
#${S}-who { position: absolute; left: 70px; top: 60px; width: 200px; height: 200px; color: var(--ink); }
#${S}-who svg { width: 200px; height: 200px; display: block; }
#${S}-link { position: absolute; left: 380px; top: ${yD - 10}px; width: 100px; height: 100px; overflow: visible; }
#${S}-link path { fill: none; stroke: var(--gold); stroke-width: 4; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-ph { position: absolute; left: 480px; top: ${y0 + 12}px; width: 820px; }
#${S}-ph i { display: block; height: 18px; border-radius: 9px; margin-bottom: 36px; background: color-mix(in srgb, var(--ink) 10%, transparent); }
#${S}-ph i:last-child { width: 60%; }
#${S}-sit { position: absolute; left: 480px; top: ${y0}px; width: 900px; font-size: ${fsS}px; font-weight: 700; line-height: 1.28; color: var(--ink); }
#${S}-det { position: absolute; left: 480px; top: ${yD}px; width: 900px; box-sizing: border-box; padding: 24px 30px 24px 90px; border-radius: ${r}px;
  border-left: 6px solid var(--gold); background: color-mix(in srgb, var(--gold) 10%, transparent); font-size: ${fsD}px; font-weight: 700;
  line-height: 1.3; color: var(--gold); }
#${S}-det svg { position: absolute; left: 30px; top: 26px; width: 40px; height: 40px; }
#${S}-q { position: absolute; left: 480px; top: ${yQ}px; width: 900px; display: flex; gap: 18px; align-items: flex-start;
  font-size: ${fsD}px; font-weight: 600; font-style: italic; line-height: 1.3; color: var(--cyan); }
#${S}-q svg { flex: none; width: 40px; height: 40px; margin-top: 2px; }`;
  const html = `    <div id="${S}-pic">
      <svg id="${S}-ring" viewBox="0 0 340 340"><circle class="${S}-trk" cx="170" cy="170" r="160"/>
        <circle class="${S}-arc" id="${S}-arc" pathLength="1000" cx="170" cy="170" r="160" transform="rotate(-90 170 170)"/></svg>
      <div id="${S}-who">${ctx.icon("person")}</div>
    </div>
    <svg id="${S}-link" viewBox="0 0 100 100"><path id="${S}-linkp" pathLength="1000" d="M4 ${Math.max(4, Math.min(96, 360 - yD + 10))} C50 ${Math.max(4, Math.min(96, 360 - yD + 10))} 50 50 96 50"/></svg>
    <div id="${S}-ph"><i></i><i></i></div>
    <div id="${S}-sit">${esc(slots.situation)}</div>
    <div id="${S}-det">${ctx.icon("spark")}${esc(slots.detail)}</div>
${slots.question ? `    <div id="${S}-q">${ctx.icon("question")}<span>${esc(slots.question)}</span></div>` : ""}`;
  const m = [
    { prim: "reveal", target: `#${S}-pic`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0, scale: 0.85 }, ease: ctx.ease },
    { prim: "draw", target: `#${S}-arc`, at: w.a + 0.2, dur: Math.max(0.6, Math.min(1.6, tD - w.a)) },
    { prim: "reveal", target: `#${S}-who`, at: w.a + 0.15, dur: 0.4, from: { opacity: 0 }, to: { opacity: 0.3 } },
    { prim: "reveal", target: `#${S}-who`, at: Math.max(tS, w.a + 0.57), dur: 0.4, from: { opacity: 0.3, y: 10 }, to: { opacity: 1, y: 0 } },
    { prim: "reveal", target: `#${S}-ph`, at: w.a + 0.2, dur: 0.4, from: { opacity: 0, x: -20 } },
    { prim: "reveal", target: `#${S}-ph`, at: Math.max(tS, w.a + 0.62), dur: 0.25, from: { opacity: 1 }, to: { opacity: 0 } },
    { prim: "reveal", target: `#${S}-sit`, at: tS, dur: 0.55, from: ctx.motionFrom(), ease: ctx.ease },
    { prim: "draw", target: `#${S}-linkp`, at: tD, dur: 0.4 },
    { prim: "reveal", target: `#${S}-det`, at: tD + 0.15, dur: 0.5, from: { opacity: 0, x: -30 }, ease: ctx.ease },
  ];
  if (tQ != null) m.push({ prim: "reveal", target: `#${S}-q`, at: tQ, dur: 0.5, from: { opacity: 0, y: 20 } });
  return card.wrap({ css, html, motions: m, driftFrom: last + 0.65 });
}
