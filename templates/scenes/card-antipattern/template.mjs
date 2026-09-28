// card-antipattern — DNA card "CÁCH SAI · CÁCH ĐÚNG" (a cross and a check drawn as SVG): the wrong way always shows
// first (schema: right.after = "wrong"), the right way follows on its cue.
// side-by-side: two framed panels wait at the window start with empty badge rings; on "wrong" a cross is drawn in the
//   left (warn) badge and its points rise; on "right" a check is drawn in the right (cyan) badge, an arrow is drawn
//   across the gap and the wrong panel steps back.
// flip: one wide panel shows the wrong way beside a 240 px cross; on "right" it flips (scaleX to 0) and comes back as
//   the right way beside a 240 px check, while a struck-through chip keeps the wrong label in the corner.
// strike (open, no card box): the wrong way is set large in the body on a warm glow; a red hand-drawn stroke crosses out
//   its label, then a second slashes the whole block; on "right" the struck block shrinks up into the top strip and dims,
//   and the right way slides up into its place beside a drawn check on a cool glow.

import { dnaCard, keepInside } from "../_shared/dna-card.mjs";

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

  if (ctx.variant === "strike") {
    const Z = ctx.zones["strip-top"];
    const BX = 120, BY = 300, BW = 1520, BH = 440; // the block in the body; the struck one shrinks into the strip
    const headFs = 92, itemFs = 50, rowH = Math.round(itemFs * 1.3) + 16;
    const len = (s) => [...String(s)].length;
    const headW = Math.min(BW, Math.round(len(slots.wrong.label) * headFs * 0.6));
    const itemW = Math.min(BW, Math.max(...slots.wrong.items.map((x) => Math.round(len(x) * itemFs * 0.56) + 36)));
    const maxW = Math.max(headW, itemW);
    const hy = Math.round(headFs * 0.62);
    const listBottom = 140 + slots.wrong.items.length * rowH;
    // hand-drawn strokes: a wobbly line through the label, then a slash across the whole block
    const s1 = `M-20 ${hy + 8} C${Math.round(headW * 0.3)} ${hy - 12}, ${Math.round(headW * 0.62)} ${hy + 18}, ${headW + 30} ${hy - 6}`;
    const s2 = `M-16 ${listBottom - 10} C${Math.round(maxW * 0.3)} ${Math.round(listBottom * 0.62)}, ${Math.round(maxW * 0.62)} ${Math.round(listBottom * 0.3)}, ${maxW + 30} 6 l-26 22`;
    const MINI = { x: 500 - BX, y: 34 - BY, scale: 0.45 };
    const tLabel = ctx.at("label");
    const css = `
#${S}-id { position: absolute; left: ${Z.strip.x}px; top: ${Z.strip.y + 8}px; height: 36px; display: flex; align-items: center; gap: 14px; }
#${S}-idi { width: 36px; height: 36px; color: var(--gold); }
#${S}-idi svg { width: 36px; height: 36px; display: block; }
#${S}-idl { font-family: "${theme.mono}", monospace; font-size: 24px; line-height: 36px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--gold); white-space: nowrap; }
.${S}-glow { position: absolute; left: 80px; top: 230px; width: 1600px; height: 590px; border-radius: 50%; }
#${S}-gw { background: radial-gradient(ellipse at 40% 45%, color-mix(in srgb, var(--warn) 15%, transparent), transparent 65%); }
#${S}-gr { background: radial-gradient(ellipse at 40% 45%, color-mix(in srgb, var(--cyan) 14%, transparent), transparent 65%); }
#${S}-open { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; }
.${S}-blk { position: absolute; left: ${BX}px; top: ${BY}px; width: ${BW}px; height: ${BH}px; }
.${S}-wrong { --c: ${MIX.wrong}; transform-origin: 0 0; }
.${S}-right { --c: ${MIX.right}; }
.${S}-head { position: absolute; left: var(--l); top: 0; width: ${BW}px; font-size: ${headFs}px; font-weight: 800; line-height: 1.1;
  color: var(--c); white-space: nowrap; }
.${S}-list { position: absolute; left: var(--l); top: 140px; width: ${BW - 40}px; margin: 0; padding: 0; list-style: none; }
.${S}-list li { display: flex; align-items: baseline; gap: 20px; font-size: ${itemFs}px; font-weight: 600; line-height: 1.3;
  color: var(--ink); margin-bottom: 16px; }
.${S}-list i { flex: none; width: 14px; height: 14px; border-radius: 50%; background: var(--c); }
.${S}-wrong .${S}-list li { color: color-mix(in srgb, var(--ink) 80%, transparent); }
#${S}-wrong { --l: 0px; }
#${S}-right { --l: 160px; }
.${S}-wm { position: absolute; left: 1250px; top: 300px; width: 420px; height: 420px; }
.${S}-wm svg { width: 420px; height: 420px; display: block; }
#${S}-xw { color: color-mix(in srgb, var(--warn) 13%, transparent); }
#${S}-vw { color: color-mix(in srgb, var(--cyan) 13%, transparent); }
#${S}-st { position: absolute; left: 0; top: 0; width: ${BW}px; height: ${BH}px; overflow: visible; }
#${S}-st path { fill: none; stroke: var(--warn); stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
#${S}-st1 { stroke-width: 10; }
#${S}-st2 { stroke-width: 13; }
#${S}-ck { position: absolute; left: 0; top: -8px; width: 120px; height: 120px; overflow: visible; }
#${S}-ck circle { fill: none; stroke: color-mix(in srgb, var(--cyan) 40%, transparent); stroke-width: 3; }
#${S}-ck path { fill: none; stroke: var(--cyan); stroke-width: 10; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
#${S}-ph { position: absolute; left: ${BX}px; top: ${BY + 14}px; width: 900px; }
#${S}-ph i { display: block; height: 56px; width: 60%; border-radius: 12px; margin-bottom: 60px; background: color-mix(in srgb, var(--ink) 8%, transparent); }
#${S}-ph i + i { height: 18px; width: 84%; border-radius: 9px; margin-bottom: 40px; }`;
    const block = (side) => `      <div class="${S}-blk ${S}-${side}" id="${S}-${side}">
        <div class="${S}-head" id="${S}-${side}h">${esc(slots[side].label)}</div>
        <ul class="${S}-list" id="${S}-${side}b">${items(side)}</ul>
${side === "wrong"
    ? `        <svg id="${S}-st" viewBox="0 0 ${BW} ${BH}"><path id="${S}-st1" pathLength="1000" d="${s1}"/><path id="${S}-st2" pathLength="1000" d="${s2}"/></svg>`
    : `        <svg id="${S}-ck" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46"/><path id="${S}-ckp" pathLength="1000" d="${CHECK}"/></svg>`}
      </div>`;
    const html = `    <div id="${S}-id"><div id="${S}-idi">${icon}</div><div id="${S}-idl">${esc("CÁCH SAI · CÁCH ĐÚNG")}</div></div>
    <div class="${S}-glow" id="${S}-gw"></div>
    <div class="${S}-glow" id="${S}-gr"></div>
    <div class="${S}-wm" id="${S}-xw">${ctx.icon("cross")}</div>
    <div class="${S}-wm" id="${S}-vw">${ctx.icon("check")}</div>
    <div id="${S}-open">
      <div id="${S}-ph"><i></i>${slots.wrong.items.map(() => "<i></i>").join("")}</div>
${block("wrong")}
${block("right")}
    </div>`;
    // the strikes fall between the two cues; the swap waits for them
    const x1 = tW + Math.min(0.6, Math.max(0.25, (tR - tW) * 0.4));
    const x2 = x1 + 0.3;
    const swapAt = Math.max(tR, x2 + 0.5);
    const m = [
      { prim: "reveal", target: `#${S}-idi`, at: tLabel, dur: 0.45, from: { opacity: 0, scale: 0.4 }, ease: "back.out(2)" },
      { prim: "reveal", target: `#${S}-idl`, at: tLabel + 0.08, dur: 0.45, from: { opacity: 0, x: -18 } },
      { prim: "reveal", target: `#${S}-ph`, at: w.a + 0.1, dur: 0.4, from: { opacity: 0, y: 16 } },
      { prim: "reveal", target: `#${S}-ph`, at: Math.max(tW, w.a + 0.52), dur: 0.25, from: { opacity: 1 }, to: { opacity: 0 }, ease: "power1.out" },
      { prim: "reveal", target: `#${S}-gw`, at: tW, dur: 0.6, from: { opacity: 0 } },
      { prim: "reveal", target: `#${S}-xw`, at: tW + 0.1, dur: 0.7, from: { opacity: 0, scale: 0.7, rotation: -12 }, ease: "back.out(1.6)" },
      { prim: "reveal", target: `#${S}-xw`, at: swapAt, dur: 0.4, from: { opacity: 1 }, to: { opacity: 0 } },
      { prim: "reveal", target: `#${S}-vw`, at: swapAt + 0.3, dur: 0.7, from: { opacity: 0, scale: 0.7 }, ease: "back.out(1.6)" },
      { prim: "reveal", target: `#${S}-wrongh`, at: tW, dur: 0.5, from: { opacity: 0, y: 40 }, ease: ctx.ease },
      { prim: "reveal", target: `#${S}-wrongb`, at: tW + 0.12, dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease },
      { prim: "draw", target: `#${S}-st1`, at: x1, dur: 0.35, ease: "power1.inOut" },
      { prim: "draw", target: `#${S}-st2`, at: x2, dur: 0.45, ease: "power1.inOut" },
      { prim: "slide", target: `#${S}-wrong`, at: swapAt, dur: 0.6, from: { x: 0, y: 0, scale: 1 }, to: MINI, ease: "power3.inOut" },
      { prim: "dim", targets: [`#${S}-wrong`], at: swapAt + 0.4, to: 0.5 },
      { prim: "reveal", target: `#${S}-gw`, at: swapAt, dur: 0.5, from: { opacity: 1 }, to: { opacity: 0 } },
      { prim: "reveal", target: `#${S}-gr`, at: swapAt + 0.1, dur: 0.7, from: { opacity: 0 } },
      { prim: "reveal", target: `#${S}-right`, at: swapAt + 0.15, dur: 0.65, from: { opacity: 0, y: 160 }, ease: "power3.out" },
      { prim: "draw", target: `#${S}-ckp`, at: swapAt + 0.5, dur: 0.5 },
    ];
    const swingAt = swapAt + 1.05;
    if (w.b - swingAt > 0.8) m.push({ prim: "slide", target: `#${S}-vw`, at: swingAt, dur: w.b - swingAt - 0.05, from: { rotation: 0 }, to: { rotation: 10 }, ease: "sine.inOut" });
    const d = ctx.drift(`#${S}-open`, swapAt + 1.05);
    if (d) m.push(d);
    return { css, html, motions: keepInside(m, w.b) };
  }

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
