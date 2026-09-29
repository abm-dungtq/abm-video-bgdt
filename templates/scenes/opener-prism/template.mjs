// opener-prism — a chapter opener after the HyperFrames registry block "yt-prism-title" (Apache-2.0, heygen-com/hyperframes).
// The title sits on a bowed plane (a static perspective tilt) and focuses in from a heavy blur while two colour copies
// behind it (warn and cyan, the prism fringe) close in from wide to a thin split; then the line breathes (a slow scale)
// and the fringe wobbles. The registry block keeps a resting blur on the type; here the type ends sharp so it reads.
// center (signature): the title centred and large, the kicker above it, a spectrum rule drawn at the window start.
// numeral: a giant prism chapter numeral on the left (a spark when there is no number), the title left-aligned beside it.

import { fit, keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => [...(slots.kicker ? ["kicker"] : []), "title"];

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const title = esc(slots.title);
  const tTitle = ctx.at("title"), tKick = slots.kicker ? ctx.at("kicker") : null;
  const num = ctx.variant === "numeral";
  const fs = num ? fit(slots.title, [[10, 150], [16, 128], [24, 108], [32, 92]]) : fit(slots.title, [[10, 210], [16, 168], [24, 136], [32, 118]]);
  const O = Math.max(4, Math.round(fs / 34)); // resting fringe offset, px
  const inDur = Math.min(1.0, Math.max(0.6, (w.b - tTitle) * 0.3));

  /** the prism stack: two tinted copies under the ink copy, all laid out the same way */
  const prism = (id, text, cls) => `<div id="${S}-${id}" class="${S}-line ${cls}">
      <div class="${S}-copy ${S}-r" id="${S}-${id}r" aria-hidden="true" data-layout-allow-overlap>${text}</div>
      <div class="${S}-copy ${S}-b" id="${S}-${id}b" aria-hidden="true" data-layout-allow-overlap>${text}</div>
      <div class="${S}-main" data-layout-allow-overlap>${text}</div>
    </div>`;

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
.${S}-bow { position: absolute; transform: perspective(950px) rotateX(6deg); }
.${S}-line { position: relative; font-weight: 800; line-height: 1.06; letter-spacing: -0.02em; }
.${S}-copy { position: absolute; left: 0; top: 0; width: 100%; filter: blur(1.5px); }
.${S}-r { color: var(--warn); }
.${S}-b { color: var(--cyan); }
.${S}-main { position: relative; color: var(--ink); }
#${S}-kick { position: absolute; font-family: "${theme.mono}", monospace; font-size: 32px; letter-spacing: 0.22em;
  text-transform: uppercase; color: var(--gold); white-space: nowrap; }
#${S}-rule { position: absolute; overflow: visible; }
#${S}-rule path { fill: none; stroke-width: 4; stroke-linecap: round; stroke-dasharray: 1000; }
${num ? `
#${S}-nbow { left: 40px; top: 150px; width: 640px; height: 520px; display: flex; align-items: center; justify-content: center; }
#${S}-num { font-family: "${theme.mono}", monospace; font-size: 400px; line-height: 1; letter-spacing: -0.04em; }
#${S}-num .${S}-main { color: var(--gold); }
#${S}-num svg { width: 300px; height: 300px; display: block; }
#${S}-tbow { left: 740px; top: 150px; width: 960px; height: 520px; display: flex; flex-direction: column; justify-content: center; }
#${S}-title { font-size: ${fs}px; }
#${S}-kick { left: 744px; top: 150px; }
#${S}-rule { left: 744px; top: 690px; width: 900px; height: 12px; }`
    : `
#${S}-tbow { left: 80px; top: 150px; width: 1600px; height: 520px; display: flex; align-items: center; justify-content: center; text-align: center; }
#${S}-title { font-size: ${fs}px; max-width: 1560px; }
#${S}-kick { left: 0; width: 1760px; top: 96px; text-align: center; }
#${S}-rule { left: 480px; top: 720px; width: 800px; height: 12px; }`}`;

  const numText = slots.chapterNo ? String(slots.chapterNo).padStart(2, "0") : ctx.icon("spark");
  const rule = (x0, x1) => ["warn", "ink", "cyan"].map((c, i) => `<path id="${S}-rule${i}" pathLength="1000" d="M${x0 + i * 6} ${2 + i * 4} L${x1 - (2 - i) * 6} ${2 + i * 4}" style="stroke: var(--${c}); opacity: ${i === 1 ? 0.9 : 0.7}"/>`).join("");
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
  ${slots.kicker ? `<div id="${S}-kick">${esc(slots.kicker)}</div>` : ""}
  ${num ? `<div class="${S}-bow" id="${S}-nbow">${prism("num", numText, "")}</div>` : ""}
  <div class="${S}-bow" id="${S}-tbow">${prism("title", title, "")}</div>
  <svg id="${S}-rule" viewBox="0 0 ${num ? 900 : 800} 12">${rule(0, num ? 900 : 800)}</svg>
 </div>
</div>`;

  const m = [];
  // the spectrum rule is drawn at the window start: the stage is never empty before the title arrives
  [0, 1, 2].forEach((i) => m.push({ prim: "draw", target: `#${S}-rule${i}`, at: w.a + 0.05 + i * 0.08, dur: 0.9, ease: "power2.inOut" }));
  if (num) {
    m.push({ prim: "reveal", target: `#${S}-nbow`, at: w.a + 0.1, dur: 1.1, from: { opacity: 0, filter: "blur(18px)" }, ease: "power2.out" });
    m.push({ prim: "reveal", target: `#${S}-numr`, at: w.a + 0.1, dur: 1.4, from: { x: -O * 5, opacity: 0.45 }, to: { x: -O * 2, opacity: 0.85 }, ease: "power2.out" });
    m.push({ prim: "reveal", target: `#${S}-numb`, at: w.a + 0.1, dur: 1.4, from: { x: O * 5, opacity: 0.45 }, to: { x: O * 2, opacity: 0.85 }, ease: "power2.out" });
    m.push({ prim: "slide", target: `#${S}-num`, at: w.a + 1.2, dur: Math.max(0.5, w.b - w.a - 1.25), from: { scale: 1 }, to: { scale: 1.05 }, ease: "sine.out" });
  }
  m.push({ prim: "reveal", target: `#${S}-tbow`, at: tTitle, dur: inDur, from: { opacity: 0, filter: "blur(18px)" }, ease: "power2.out" });
  m.push({ prim: "reveal", target: `#${S}-titler`, at: tTitle, dur: inDur * 1.6, from: { x: -O * 4.5, opacity: 0.45 }, to: { x: -O, opacity: 0.85 }, ease: "power2.out" });
  m.push({ prim: "reveal", target: `#${S}-titleb`, at: tTitle, dur: inDur * 1.6, from: { x: O * 4.5, opacity: 0.45 }, to: { x: O, opacity: 0.85 }, ease: "power2.out" });
  // ambient: a slow breath of the whole line and a small fringe wobble while it holds
  const hold = tTitle + inDur * 1.6 + ctx.gap;
  if (w.b - hold > 1.2) {
    const half = Math.min(1.9, (w.b - hold - 0.1) / 2);
    m.push({ prim: "slide", target: `#${S}-titler`, at: hold, dur: half - 0.02, from: { x: -O }, to: { x: -O - 2 }, ease: "sine.inOut" });
    m.push({ prim: "slide", target: `#${S}-titler`, at: hold + half, dur: half - 0.02, from: { x: -O - 2 }, to: { x: -O }, ease: "sine.inOut" });
    m.push({ prim: "slide", target: `#${S}-titleb`, at: hold, dur: half - 0.02, from: { x: O }, to: { x: O + 2 }, ease: "sine.inOut" });
    m.push({ prim: "slide", target: `#${S}-titleb`, at: hold + half, dur: half - 0.02, from: { x: O + 2 }, to: { x: O }, ease: "sine.inOut" });
  }
  m.push({ prim: "slide", target: `#${S}-title`, at: tTitle + 0.3, dur: Math.max(0.5, w.b - tTitle - 0.35), from: { scale: 1 }, to: { scale: 1.035 }, ease: "sine.out" });
  if (slots.kicker) m.push({ prim: "reveal", target: `#${S}-kick`, at: Math.max(w.a + 0.15, tKick), dur: 0.5, from: { opacity: 0, y: -16 }, ease: ctx.ease });
  return { css, html, motions: keepInside(m, w.b) };
}
