// code-hero — introduces one important line of code or one command, after the HyperFrames registry block "code-slice-hero"
// (heygen-com/hyperframes, Apache-2.0). The registry block is WebGL (a tiled surface whose cells flip to reveal the rear
// headline); this port keeps the idea in the DOM. The title is on stage at the window start, the code is hidden and
// arrives on the code reveal key.
// flip (signature): the code sits in a terminal panel under a wall of tile strips; on the code key the strips turn over
//   one after another, left to right, and uncover it.
// slice: the code line is cut into horizontal slices that slide in from alternating sides and join into the line.
//   The slices are decorative copies (aria-hidden); the readable line is the single #code element.

import { fit, keepInside } from "../_shared/dna-card.mjs";
import { highlight, highlightCss } from "../_shared/code-line.mjs";

export const revealKeys = () => ["title", "code"];

const STRIPS = 20, BANDS = 5;

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const mono = `"${theme.mono}", monospace`;
  const flip = ctx.variant === "flip";
  const tT = ctx.at("title");
  const tC = ctx.at("code");
  const lang = slots.lang ? esc(slots.lang) : "";
  const m = [];
  const codeHtml = highlight(slots.code, esc, S) || " ";

  const fsT = fit(slots.title, [[16, 84], [26, 68], [40, 58]]);
  const fsC = flip ? fit(slots.code, [[14, 104], [20, 84], [28, 66], [40, 52]]) : fit(slots.code, [[14, 120], [20, 96], [28, 74], [40, 56]]);

  // panel geometry (stage px)
  const PX = 180, PW = 1400, PY = 300, BAR = 56, AH = 230;
  const LH = Math.round(fsC * 1.3), CY = slice_y();
  function slice_y() { return flip ? PY + BAR + Math.round((AH - Math.round(fsC * 1.3)) / 2) : 380; }

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-title { position: absolute; left: 100px; top: 110px; width: 1560px; text-align: center; font-size: ${fsT}px; font-weight: 800; line-height: 1.12; color: var(--ink); }
#${S}-glow { position: absolute; left: ${PX - 140}px; top: ${(flip ? PY : CY) - 150}px; width: ${PW + 280}px; height: ${(flip ? BAR + AH : LH) + 300}px; border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--cyan) 18%, transparent), transparent); }
.${S}-line { position: absolute; left: 0; width: 1760px; height: ${LH}px; display: flex; align-items: center; justify-content: center;
  font-family: ${mono}; font-size: ${fsC}px; line-height: ${LH}px; white-space: pre; color: var(--ink); }
${highlightCss(S)}
${flip ? `
#${S}-panel { position: absolute; left: ${PX}px; top: ${PY}px; width: ${PW}px; height: ${BAR + AH}px; box-sizing: border-box; border-radius: ${R}px; overflow: hidden;
  background: color-mix(in srgb, var(--canvas) 55%, var(--surface)); border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent);
  box-shadow: 0 34px 90px color-mix(in srgb, var(--canvas) 80%, transparent); }
#${S}-bar { position: absolute; left: 0; top: 0; right: 0; height: ${BAR}px; display: flex; align-items: center; gap: 12px; padding: 0 24px;
  background: color-mix(in srgb, var(--canvas) 70%, var(--surface)); border-bottom: 2px solid color-mix(in srgb, var(--ink) 8%, transparent); }
.${S}-tl { width: 16px; height: 16px; border-radius: 50%; flex: none; }
#${S}-lang { margin-left: auto; font-family: ${mono}; font-size: 24px; color: var(--cyan); white-space: nowrap; }
#${S}-code { left: ${-PX}px; top: ${BAR + Math.round((AH - LH) / 2)}px; }
#${S}-wall { position: absolute; left: 0; top: ${BAR}px; width: ${PW}px; height: ${AH}px; display: flex; }
.${S}-strip { flex: none; width: ${PW / STRIPS}px; height: ${AH}px; box-sizing: border-box; border-right: 2px solid color-mix(in srgb, var(--ink) 10%, transparent);
  background: repeating-linear-gradient(180deg, color-mix(in srgb, var(--cyan) 16%, var(--surface)) 0 ${AH / 3 - 2}px, color-mix(in srgb, var(--ink) 14%, transparent) ${AH / 3 - 2}px ${AH / 3}px); }`
    : `
#${S}-lang { position: absolute; left: 0; width: 1760px; top: ${CY - 90}px; text-align: center; font-family: ${mono}; font-size: 28px; letter-spacing: 0.2em;
  text-transform: uppercase; color: var(--cyan); }
.${S}-band { top: ${CY}px; }
#${S}-code { top: ${CY}px; }
#${S}-rule { position: absolute; left: 380px; top: ${CY + LH + 40}px; width: 1000px; height: 8px; overflow: visible; }
#${S}-rule path { fill: none; stroke: var(--gold); stroke-width: 5; stroke-linecap: round; stroke-dasharray: 1000; }`}`;

  const codeEl = `<div class="${S}-line" id="${S}-code">${codeHtml}</div>`;
  let body;
  if (flip) {
    body = `<div id="${S}-glow"></div>
  <div id="${S}-panel">
    <div id="${S}-bar"><span class="${S}-tl" style="background: var(--warn)"></span><span class="${S}-tl" style="background: var(--gold)"></span><span class="${S}-tl" style="background: var(--cyan)"></span>${lang ? `<span id="${S}-lang">${lang}</span>` : ""}</div>
    ${codeEl}
    <div id="${S}-wall" aria-hidden="true" data-layout-allow-overlap>${Array.from({ length: STRIPS }, (_, i) => `<div class="${S}-strip" id="${S}-p${i + 1}"></div>`).join("")}</div>
  </div>`;
  } else {
    const bands = Array.from({ length: BANDS }, (_, i) => `<div class="${S}-line ${S}-band" id="${S}-b${i + 1}" aria-hidden="true" data-layout-allow-overlap
      style="clip-path: inset(${(i * 100) / BANDS}% 0 ${100 - ((i + 1) * 100) / BANDS}% 0)">${codeHtml}</div>`).join("\n  ");
    body = `<div id="${S}-glow"></div>
  ${lang ? `<div id="${S}-lang">${lang}</div>` : ""}
  <div id="${S}-bands" aria-hidden="true" data-layout-allow-overlap>
  ${bands}
  </div>
  ${codeEl}
  <svg id="${S}-rule" viewBox="0 0 1000 8"><path id="${S}-rulep" pathLength="1000" d="M0 4 L1000 4"/></svg>`;
  }
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
  ${body}
  <div id="${S}-title">${esc(slots.title)}</div>
 </div>
</div>`;

  m.push({ prim: "reveal", target: `#${S}-glow`, at: w.a + 0.1, dur: 0.8, from: { opacity: 0, scale: 0.8 } });
  m.push({ prim: "reveal", target: `#${S}-title`, at: Math.max(w.a + 0.1, tT), dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease });
  if (flip) {
    m.push({ prim: "reveal", target: `#${S}-panel`, at: w.a + 0.05, dur: 0.55, from: { opacity: 0, y: 40, scale: 0.94 }, ease: ctx.ease });
    const at0 = Math.max(w.a + 0.7, tC - 0.2);
    const step = Math.min(0.03, Math.max(0.01, (w.b - at0 - 0.9) / STRIPS));
    for (let i = 0; i < STRIPS; i++) {
      m.push({ prim: "reveal", target: `#${S}-p${i + 1}`, at: at0 + i * step, dur: 0.3, from: { opacity: 1, scaleX: 1 }, to: { opacity: 0, scaleX: 0 }, ease: "power2.in" });
    }
    m.push({ prim: "reveal", target: `#${S}-code`, at: at0, dur: 0.3, from: { opacity: 0.4 } });
  } else {
    m.push({ prim: "draw", target: `#${S}-rulep`, at: w.a + 0.05, dur: 0.9, ease: "power2.inOut" });
    if (lang) m.push({ prim: "reveal", target: `#${S}-lang`, at: w.a + 0.1, dur: 0.5, from: { opacity: 0, y: -14 } });
    const landBy = Math.max(tC, w.a + 1.25);
    const dur = 0.7, spread = 0.35;
    const t0 = landBy - 0.05 - spread - dur;
    for (let i = 0; i < BANDS; i++) {
      const dir = i % 2 ? 1 : -1;
      m.push({ prim: "reveal", target: `#${S}-b${i + 1}`, at: t0 + (i * spread) / (BANDS - 1), dur, from: { opacity: 0, x: dir * (700 + i * 90) }, ease: "power3.out" });
    }
    m.push({ prim: "reveal", target: `#${S}-code`, at: landBy, dur: 0.3, from: { opacity: 0 }, ease: "power1.out" });
    m.push({ prim: "reveal", target: `#${S}-bands`, at: landBy + 0.1, dur: 0.3, from: { opacity: 1 }, to: { opacity: 0 }, ease: "power1.in" });
  }
  const d = ctx.drift(`#${S}-grp`, Math.min(Math.max(tC, w.a + 1.25) + 1.2, w.b - 0.7), 8);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}
