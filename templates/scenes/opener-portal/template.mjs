// opener-portal — a chapter opener after the HyperFrames registry block "wireframe-portal-title" (Apache-2.0,
// heygen-com/hyperframes). A wireframe portal bursts open at the window start, the title comes through it, then its
// letters flip out one by one while the second phrase flips in. The registry block extrudes Geist letterforms in three.js;
// here the type is the theme font (Vietnamese diacritics) with a gold wire edge and three receding outline echoes for
// depth, and the portal is CSS: its frames grow from the centre and keep rushing forward while the shot holds.
// tunnel (signature): nested 16:9 wire frames, each a little tilted by the burst, settling square.
// rings: concentric wire rings with radial spokes drawn out from the centre.

import { fit, keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["title", ...(slots.subtitle ? ["subtitle"] : []), "phrase"];

const r3 = (x) => Math.round(x * 1000) / 1000;
const CX = 880, CY = 380;

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const rings = ctx.variant === "rings";
  const tTitle = ctx.at("title"), tPhrase = ctx.at("phrase"), tSub = slots.subtitle ? ctx.at("subtitle") : null;
  const tfs = fit(slots.title, [[8, 190], [14, 150], [20, 116]]);
  const pfs = fit(slots.phrase, [[12, 140], [20, 112], [28, 96]]);

  /** one letter span per character, words kept whole so a line only breaks between words */
  const letters = (text, cls, idp) => {
    let k = 0;
    const words = text.normalize("NFC").split(" ").map((wd) => `<span class="${S}-word">${[...wd].map((c) => `<span class="${S}-ch ${cls}" id="${S}-${idp}${k++}">${esc(c)}</span>`).join("")}</span>`);
    return { html: words.join(" "), n: k };
  };
  const T = letters(slots.title, `${S}-tc`, "t"), P = letters(slots.phrase, `${S}-pc`, "p");

  // portal geometry: frame k is the base shape at scale s[k]; the largest stays inside the stage (y ≤ 820)
  const N = rings ? 8 : 10;
  const base = rings ? { w: 600, h: 600 } : { w: 1000, h: 560 };
  const sMax = Math.min(1.5, (820 - CY) / (base.h / 2) / 1.07 - 0.02); // room for the forward rush
  const sc = Array.from({ length: N }, (_, k) => r3(0.1 * Math.pow(sMax / 0.1 / 1.1, k / (N - 1))));
  const tilt = sc.map(() => Math.round((ctx.rng() * 2 - 1) * 9));
  const frames = sc.map((_, k) => `<div class="${S}-fr" id="${S}-fr${k}" data-layout-allow-overlap></div>`).join("");
  const spokes = rings ? Array.from({ length: 16 }, (_, k) => {
    const a = (k / 16) * Math.PI * 2, r0 = 70, r1 = Math.min(430, (820 - CY - 4) / Math.max(0.01, Math.abs(Math.sin(a))), 860 / Math.max(0.01, Math.abs(Math.cos(a))));
    return `<path id="${S}-sp${k}" pathLength="1000" d="M${r3(CX + Math.cos(a) * r0)} ${r3(CY + Math.sin(a) * r0)} L${r3(CX + Math.cos(a) * r1)} ${r3(CY + Math.sin(a) * r1)}"/>`;
  }).join("") : "";

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-portal, #${S}-echoes { position: absolute; inset: 0; }
.${S}-fr { position: absolute; left: ${CX - base.w / 2}px; top: ${CY - base.h / 2}px; width: ${base.w}px; height: ${base.h}px; box-sizing: border-box;
  border: 3px solid color-mix(in srgb, var(--cyan) 75%, transparent); border-radius: ${rings ? "50%" : "10px"};
  box-shadow: 0 0 22px color-mix(in srgb, var(--cyan) 30%, transparent), inset 0 0 22px color-mix(in srgb, var(--cyan) 18%, transparent); }
.${S}-fr:nth-child(3n) { border-color: color-mix(in srgb, var(--gold) 70%, transparent); }
#${S}-spokes { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-spokes path { fill: none; stroke: color-mix(in srgb, var(--cyan) 45%, transparent); stroke-width: 2; stroke-dasharray: 1000; }
#${S}-core { position: absolute; left: ${CX - 260}px; top: ${CY - 260}px; width: 520px; height: 520px; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--canvas) 92%, transparent) 30%, transparent 70%); }
.${S}-txt { position: absolute; left: 80px; width: 1600px; top: ${CY - 220}px; height: 440px; display: flex; align-items: center; justify-content: center;
  text-align: center; font-weight: 800; line-height: 1.08; letter-spacing: -0.01em; }
#${S}-title { font-size: ${tfs}px; }
#${S}-phrase { font-size: ${pfs}px; }
.${S}-echo { color: color-mix(in srgb, var(--cyan) 14%, transparent); -webkit-text-stroke: 2px color-mix(in srgb, var(--cyan) 70%, transparent); }
.${S}-word { display: inline-block; white-space: nowrap; }
.${S}-ch { display: inline-block; color: var(--ink); -webkit-text-stroke: 1.5px var(--gold); transform-origin: 50% 60%; }
.${S}-pc { color: var(--gold); -webkit-text-stroke: 1.5px color-mix(in srgb, var(--ink) 60%, transparent); }
#${S}-sub { position: absolute; left: 0; width: 1760px; top: ${CY + 280}px; text-align: center; font-family: "${theme.mono}", monospace; font-size: 30px;
  letter-spacing: 0.2em; text-transform: uppercase; color: var(--muted); white-space: nowrap; }`;

  const echoes = [0.94, 0.88, 0.82].map((s, i) => `<div class="${S}-txt ${S}-echo" id="${S}-e${i}" style="font-size: ${tfs}px; transform: scale(${s}); opacity: ${0.55 - i * 0.15}" aria-hidden="true" data-layout-allow-overlap>${esc(slots.title)}</div>`).join("");
  const html = `<div id="${S}-root">
 <div id="${S}-portal">
  ${frames}
  ${rings ? `<svg id="${S}-spokes" viewBox="0 0 1760 820">${spokes}</svg>` : ""}
 </div>
 <div id="${S}-core"></div>
 <div id="${S}-echoes">${echoes}</div>
 <div class="${S}-txt" id="${S}-title" data-layout-allow-overlap><div>${T.html}</div></div>
 <div class="${S}-txt" id="${S}-phrase" data-layout-allow-overlap><div>${P.html}</div></div>
 ${slots.subtitle ? `<div id="${S}-sub">${esc(slots.subtitle)}</div>` : ""}
</div>`;

  const m = [];
  // the burst: every frame grows out of the centre with a little tilt, then keeps rushing forward
  sc.forEach((s, k) => {
    const at = w.a + k * 0.045, dur = 0.9;
    const op = r3(Math.max(0.2, 0.95 - k * 0.075));
    m.push({ prim: "reveal", target: `#${S}-fr${k}`, at, dur, from: { opacity: 0, scale: 0.02, rotation: rings ? 0 : tilt[k] * 2 }, to: { opacity: op, scale: s, rotation: rings ? 0 : tilt[k] * 0.25 }, ease: "expo.out" });
    const hold = at + dur + ctx.gap;
    if (w.b - hold > 0.4) m.push({ prim: "slide", target: `#${S}-fr${k}`, at: hold, dur: w.b - hold - 0.05, from: { scale: s }, to: { scale: r3(s * 1.07) }, ease: "none" });
  });
  if (rings) Array.from({ length: 16 }).forEach((_, k) => m.push({ prim: "draw", target: `#${S}-sp${k}`, at: w.a + 0.1 + (k % 4) * 0.05, dur: 0.8, ease: "expo.out" }));
  m.push({ prim: "reveal", target: `#${S}-core`, at: w.a, dur: 0.6, from: { opacity: 0, scale: 0.3 }, ease: "power2.out" });

  // the title comes through the portal: from deep (small, blurred) to the front; its echoes trail behind it
  const tIn = Math.max(tTitle, w.a + 0.25);
  m.push({ prim: "reveal", target: `#${S}-title`, at: tIn, dur: 0.8, from: { opacity: 0, scale: 0.25, filter: "blur(14px)" }, ease: "expo.out" });
  m.push({ prim: "reveal", target: `#${S}-echoes`, at: tIn + 0.15, dur: 0.8, from: { opacity: 0, scale: 0.4 }, ease: "expo.out" });
  if (slots.subtitle) m.push({ prim: "reveal", target: `#${S}-sub`, at: Math.max(tSub, tIn + 0.3), dur: 0.5, from: { opacity: 0, y: 16 }, ease: ctx.ease });

  // the swap: title letters flip away left to right, the phrase letters flip in after them
  const swapAt = Math.max(tPhrase - 0.2, tIn + 0.8 + ctx.gap);
  const room = Math.max(0.6, w.b - swapAt - 0.55);
  const stT = Math.min(0.03, room * 0.4 / Math.max(1, T.n)), stP = Math.min(0.035, room * 0.6 / Math.max(1, P.n));
  for (let i = 0; i < T.n; i++) m.push({ prim: "reveal", target: `#${S}-t${i}`, at: r3(swapAt + i * stT), dur: 0.28, from: { opacity: 1, scaleY: 1, y: 0 }, to: { opacity: 0, scaleY: 0, y: -24 }, ease: "power2.in" });
  m.push({ prim: "reveal", target: `#${S}-echoes`, at: r3(swapAt + 0.8 + ctx.gap), dur: 0.3, from: { opacity: 1 }, to: { opacity: 0 }, ease: "power1.out" });
  for (let i = 0; i < P.n; i++) m.push({ prim: "reveal", target: `#${S}-p${i}`, at: r3(swapAt + 0.18 + i * stP), dur: 0.4, from: { opacity: 0, scaleY: 0, y: 30 }, ease: "back.out(2)" });
  return { css, html, motions: keepInside(m, w.b) };
}
