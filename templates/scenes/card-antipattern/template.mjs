// card-antipattern — DNA card "CÁCH SAI · CÁCH ĐÚNG" (a cross and a check drawn as SVG): the wrong way always shows
// first (schema: right.after = "wrong"), the right way follows on its cue.
// side-by-side: two framed panels wait at the window start with empty badge rings; on "wrong" a cross is drawn in the
//   left (warn) badge and its points rise; on "right" a check is drawn in the right (cyan) badge, an arrow is drawn
//   across the gap and the wrong panel steps back.
// flip: one wide panel shows the wrong way beside a 240 px cross; on "right" it flips (scaleX to 0) and comes back as
//   the right way beside a 240 px check, while a struck-through chip keeps the wrong label in the corner.

import { dnaCard } from "../_shared/dna-card.mjs";

export const revealKeys = () => ["label", "wrong", "right"];

const MIX = { wrong: "var(--warn)", right: "var(--cyan)" };
const CROSS = "M18 18 L82 82 M82 18 L18 82";
const CHECK = "M14 54 L40 80 L88 22";

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="4.5"
    stroke-linecap="round" stroke-linejoin="round"><path d="M6 20 L24 38 M24 20 L6 38"/><path d="M33 31 L42 40 L59 20"/></svg>`;
  const card = dnaCard(ctx, { label: "CÁCH SAI · CÁCH ĐÚNG", icon });
  const tW = ctx.at("wrong"), tR = ctx.at("right");
  const r = theme.radius ?? 18;
  const items = (side) => slots[side].items.map((x) => `<li><i></i><span>${esc(x)}</span></li>`).join("");

  if (ctx.variant === "flip") {
    const face = (side) => `    <div class="${S}-face ${S}-${side}" id="${S}-${side}">
      <svg class="${S}-glyph" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46"/><path id="${S}-${side}g" pathLength="1000" d="${side === "wrong" ? CROSS : CHECK}"/></svg>
      <div class="${S}-body" id="${S}-${side}b"><div class="${S}-head">${esc(slots[side].label)}</div><ul class="${S}-list">${items(side)}</ul></div>
    </div>`;
    const css = `
.${S}-face { position: absolute; left: 110px; top: 140px; width: 1220px; height: 500px; box-sizing: border-box; border-radius: ${r}px;
  border: 2px solid var(--c); background: color-mix(in srgb, var(--c) 7%, transparent); transform-origin: 50% 50%; }
.${S}-wrong { --c: ${MIX.wrong}; }
.${S}-right { --c: ${MIX.right}; }
.${S}-glyph { position: absolute; left: 60px; top: 130px; width: 240px; height: 240px; overflow: visible; }
.${S}-glyph circle { fill: none; stroke: color-mix(in srgb, var(--c) 35%, transparent); stroke-width: 3; }
.${S}-glyph path { fill: none; stroke: var(--c); stroke-width: 11; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-body { position: absolute; left: 370px; top: 0; width: 800px; height: 500px; display: flex; flex-direction: column; justify-content: center; }
.${S}-head { font-size: 56px; font-weight: 800; line-height: 1.1; color: var(--c); margin-bottom: 30px; }
.${S}-list { margin: 0; padding: 0; list-style: none; }
.${S}-list li { display: flex; align-items: baseline; gap: 20px; font-size: 34px; font-weight: 600; line-height: 1.3; color: var(--ink); margin-bottom: 16px; }
.${S}-list i { flex: none; width: 14px; height: 14px; border-radius: 50%; background: var(--c); }
#${S}-chip { position: absolute; right: 48px; top: 30px; height: 50px; display: flex; align-items: center; gap: 12px; padding: 0 22px;
  border-radius: 25px; border: 2px solid color-mix(in srgb, var(--warn) 50%, transparent); font-size: 28px; font-weight: 600; color: var(--muted); }
#${S}-chip svg { width: 28px; height: 28px; color: var(--warn); }
#${S}-chip b { position: relative; font-weight: 600; }
#${S}-strike { position: absolute; left: -4px; right: -4px; top: 52%; height: 3px; background: var(--warn); transform-origin: 0 50%; }`;
    const html = `${face("wrong")}
${face("right")}
    <div id="${S}-chip">${ctx.icon("cross")}<b>${esc(slots.wrong.label)}<span id="${S}-strike"></span></b></div>`;
    const flipAt = Math.max(tR, w.a + 0.6);
    const m = [
      { prim: "reveal", target: `#${S}-wrong`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0, y: 30 }, ease: ctx.ease },
      { prim: "draw", target: `#${S}-wrongg`, at: tW, dur: 0.5 },
      { prim: "reveal", target: `#${S}-wrongb`, at: tW + 0.1, dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease },
      { prim: "slide", target: `#${S}-wrong`, at: flipAt, dur: 0.28, from: { scaleX: 1 }, to: { scaleX: 0 }, ease: "power2.in" },
      { prim: "reveal", target: `#${S}-right`, at: flipAt + 0.3, dur: 0.32, from: { scaleX: 0 }, ease: "power2.out" },
      { prim: "draw", target: `#${S}-rightg`, at: flipAt + 0.5, dur: 0.5 },
      { prim: "reveal", target: `#${S}-rightb`, at: flipAt + 0.55, dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease },
      { prim: "reveal", target: `#${S}-chip`, at: flipAt + 0.7, dur: 0.45, from: { opacity: 0, x: 30 } },
      { prim: "reveal", target: `#${S}-strike`, at: flipAt + 1.0, dur: 0.35, from: { scaleX: 0 }, ease: "power2.out" },
    ];
    return card.wrap({ css, html, motions: m, driftFrom: flipAt + 1.4 });
  }

  // side-by-side
  const panel = (side, x) => `    <div class="${S}-panel ${S}-${side}" id="${S}-${side}" style="left: ${x}px">
      <svg class="${S}-badge" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46"/><path id="${S}-${side}g" pathLength="1000" d="${side === "wrong" ? CROSS : CHECK}"/></svg>
      <div class="${S}-head" id="${S}-${side}h">${esc(slots[side].label)}</div>
      <ul class="${S}-list" id="${S}-${side}b">${items(side)}</ul>
    </div>`;
  const css = `
.${S}-panel { position: absolute; top: 120px; width: 600px; height: 540px; box-sizing: border-box; border-radius: ${r}px;
  border: 2px solid color-mix(in srgb, var(--c) 45%, transparent); background: color-mix(in srgb, var(--c) 6%, transparent); }
.${S}-wrong { --c: ${MIX.wrong}; }
.${S}-right { --c: ${MIX.right}; }
.${S}-badge { position: absolute; left: 40px; top: 40px; width: 130px; height: 130px; overflow: visible; }
.${S}-badge circle { fill: none; stroke: color-mix(in srgb, var(--c) 40%, transparent); stroke-width: 3; }
.${S}-badge path { fill: none; stroke: var(--c); stroke-width: 10; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-head { position: absolute; left: 200px; top: 40px; width: 370px; height: 130px; display: flex; align-items: center;
  font-size: 46px; font-weight: 800; line-height: 1.1; color: var(--c); }
.${S}-list { position: absolute; left: 40px; top: 210px; width: 520px; margin: 0; padding: 0; list-style: none; }
.${S}-list li { display: flex; align-items: baseline; gap: 18px; font-size: 32px; font-weight: 600; line-height: 1.3; color: var(--ink); margin-bottom: 20px; }
.${S}-list i { flex: none; width: 12px; height: 12px; border-radius: 50%; background: var(--c); }
#${S}-arrow { position: absolute; left: 672px; top: 350px; width: 96px; height: 80px; overflow: visible; }
#${S}-arrow path { fill: none; stroke: var(--gold); stroke-width: 7; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }`;
  const html = `${panel("wrong", 60)}
${panel("right", 780)}
    <svg id="${S}-arrow" viewBox="0 0 96 80"><path id="${S}-arrowp" pathLength="1000" d="M6 40 L88 40 M64 16 L88 40 L64 64"/></svg>`;
  const m = [
    { prim: "reveal", target: `#${S}-wrong`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0, x: -50 }, ease: ctx.ease },
    { prim: "reveal", target: `#${S}-right`, at: w.a + 0.15, dur: 0.5, from: { opacity: 0, x: 50 }, ease: ctx.ease },
    { prim: "draw", target: `#${S}-wrongg`, at: tW, dur: 0.5 },
    { prim: "reveal", target: `#${S}-wrongh`, at: tW + 0.1, dur: 0.45, from: { opacity: 0, x: -20 } },
    { prim: "reveal", target: `#${S}-wrongb`, at: tW + 0.2, dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease },
    { prim: "draw", target: `#${S}-rightg`, at: tR, dur: 0.5 },
    { prim: "reveal", target: `#${S}-righth`, at: tR + 0.1, dur: 0.45, from: { opacity: 0, x: -20 } },
    { prim: "reveal", target: `#${S}-rightb`, at: tR + 0.2, dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease },
    { prim: "draw", target: `#${S}-arrowp`, at: tR, dur: 0.45 },
  ];
  if (tR > w.a + 0.55 + ctx.gap) m.push({ prim: "dim", targets: [`#${S}-wrong`], at: tR + 0.3, to: 0.55 });
  return card.wrap({ css, html, motions: m, driftFrom: tR + 0.8 });
}
