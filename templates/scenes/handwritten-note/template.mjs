// handwritten-note — a hand-written note, after the HyperFrames registry block "hw-title" (Apache-2.0). The note
// stands faint (pencilled) from the window start; over the `text` range the registry block's highlight sweep inks it
// word by word, a wobbly marker underline is drawn as the sweep lands, and the whole drawing "boils" (a tiny jitter
// re-drawn 8 times a second) as hand-drawn animation does. The registry block's Caveat font has no Vietnamese, so
// the text uses the theme font with a slight hand tilt. The optional side note is written in character by character
// next to a doodled arrow.
// title (signature): a large tilted title across the stage, a gold squiggle under it, the side note below.
// sticky: a sticky note taped to the stage on the left, the side note on the right pointing at it.

import { keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["text", ...(slots.note ? ["note"] : [])];

const r1 = (x) => Math.round(x * 10) / 10;
const r2 = (x) => Math.round(x * 100) / 100;
const r3 = (x) => Math.round(x * 1000) / 1000;
/** deterministic hash in [-1, 1] (the registry block's hwHash) */
const hash = (n, seed) => { const x = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };
const FAINT = 0.28;

/** the registry block's squiggle underline, in a 1000 × 34 box */
function squiggle(seed, wobble = 6) {
  const segs = 11, uw = 1000;
  let d = `M2 ${r1(16 + hash(0, seed) * 4)}`;
  for (let i = 1; i <= segs; i++) {
    const x = (uw / segs) * i;
    const y = 16 + hash(i * 5 + 1, seed) * wobble;
    const cx = x - uw / segs / 2 + hash(i * 5 + 2, seed) * 10;
    const cy = 16 + (i % 2 ? -1 : 1) * (8 + hash(i * 5 + 3, seed) * 4);
    d += ` Q${r1(cx)} ${r1(cy)} ${r1(x)} ${r1(y)}`;
  }
  return d;
}

export function render(ctx) {
  const { S, slots, esc, window: w } = ctx;
  const text = slots.text.normalize("NFC").trim().replace(/\s+/g, " ");
  const words = text.split(" ");
  const n = words.length;
  const len = [...text].length;
  const note = slots.note ? [...slots.note.normalize("NFC").trim()] : null;
  const sticky = ctx.variant === "sticky";
  const seed = Math.floor(ctx.rng() * 1000) + 1;
  const m = [];

  // geometry
  const fs = sticky ? (len <= 16 ? 78 : len <= 28 ? 64 : 54) : (len <= 16 ? 132 : len <= 26 ? 106 : 86);
  const padW = 640, padH = 560;
  const padX = sticky ? (note ? 110 : Math.round((1760 - padW) / 2)) : 0, padY = 120;

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-tilt { position: absolute; ${sticky ? `left: ${padX}px; top: ${padY}px; width: ${padW}px; height: ${padH}px; transform: rotate(-3deg);`
    : `left: 110px; top: ${note ? 150 : 220}px; width: 1540px; height: 380px; transform: rotate(-2deg);`} }
#${S}-boil { position: absolute; inset: 0; }
#${S}-pad { position: absolute; inset: 0; border-radius: 6px; background: color-mix(in srgb, var(--gold) 88%, var(--ink));
  box-shadow: 0 30px 60px color-mix(in srgb, var(--canvas) 80%, transparent); }
#${S}-tape { position: absolute; left: ${padW / 2 - 90}px; top: -26px; width: 180px; height: 52px; background: color-mix(in srgb, var(--ink) 55%, transparent); }
#${S}-body { position: absolute; ${sticky ? "left: 56px; top: 70px; width: 528px; height: 420px; text-align: left;" : "left: 0; top: 0; width: 1540px; height: 380px; text-align: center;"}
  display: flex; flex-direction: column; justify-content: center; align-items: ${sticky ? "flex-start" : "center"}; }
#${S}-line { position: relative; display: inline-block; max-width: 100%; font-size: ${fs}px; font-weight: 800; line-height: 1.12;
  color: ${sticky ? "var(--canvas)" : "var(--ink)"}; }
.${S}-w { display: inline-block; }
#${S}-und { position: absolute; left: -2%; bottom: -${Math.round(fs * 0.34)}px; width: 104%; height: ${Math.round(fs * 0.3)}px; overflow: visible; }
#${S}-und path { fill: none; stroke: ${sticky ? "var(--warn)" : "var(--gold)"}; stroke-width: ${sticky ? 5 : 7}; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-side { position: absolute; ${sticky ? "left: 860px; top: 330px; width: 800px;" : "left: 180px; top: 600px; width: 1400px; text-align: center;"} }
#${S}-sidet { font-size: ${sticky ? 50 : 44}px; font-weight: 600; line-height: 1.3; color: var(--muted); }
#${S}-arrow { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-arrow path { fill: none; stroke: var(--cyan); stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }`;

  const lineHtml = words.map((x, i) => `<span class="${S}-w" id="${S}-w${i}">${esc(x)}</span>`).join(" ");
  const und = `<svg id="${S}-und" viewBox="0 0 1000 34" preserveAspectRatio="none"><path id="${S}-undp" pathLength="1000" d="${squiggle(seed)}"/></svg>`;
  // the doodled arrow: from the side note towards the note (stage coordinates), a little overshooting curl at its tail
  const arrow = sticky
    ? { a: [840, 370], c1: [790, 320], c2: [790, 400], b: [padX + padW + 40, 420] }
    : (() => {
      // title: from the left end of the centred side note (≈ 0.55 em per character) up towards the title
      const nl = Math.max(200, Math.round(880 - Math.min(1400, (note?.length ?? 0) * 44 * 0.55) / 2));
      return { a: [nl - 30, 660], c1: [nl - 130, 660], c2: [nl - 140, 580], b: [nl - 70, 530] };
    })();
  const [bx, by] = arrow.b;
  const ang = Math.atan2(by - arrow.c2[1], bx - arrow.c2[0]) + Math.PI;
  const barb = (s) => `${r1(bx + 26 * Math.cos(ang + s))} ${r1(by + 26 * Math.sin(ang + s))}`;
  const arrowD = `M${arrow.a.join(" ")} C${arrow.c1.join(" ")} ${arrow.c2.join(" ")} ${bx} ${by} M${bx} ${by} L${barb(-0.5)} M${bx} ${by} L${barb(0.5)}`;
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
  <div id="${S}-tilt"><div id="${S}-boil">
    ${sticky ? `<div id="${S}-pad"></div><div id="${S}-tape"></div>` : ""}
    <div id="${S}-body"><div id="${S}-line">${lineHtml}${und}</div></div>
  </div></div>
  ${note ? `<svg id="${S}-arrow" viewBox="0 0 1760 820"><path id="${S}-arrowp" pathLength="1000" d="${arrowD}"/></svg>
  <div id="${S}-side"><div id="${S}-sidet">${note.map((c) => `<span class="${S}-nc">${esc(c)}</span>`).join("")}</div></div>` : ""}
 </div>
</div>`;

  // timing: pencilled note at the start, the sweep inks it over the `text` range
  const [s0, s1] = ctx.at("text");
  const t0 = Math.max(s0, w.a + 0.55);
  const D = Math.max(0.4, 0.75 * (Math.min(s1, w.b - 0.5) - t0));
  const step = D / n, wd = r3(Math.min(0.35, Math.max(0.12, 2 * step)));
  m.push({ prim: "reveal", target: `#${S}-boil`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0 }, ease: "power2.out" });
  words.forEach((_, i) => m.push({ prim: "reveal", target: `#${S}-w${i}`, at: r3(t0 + i * step), dur: wd, from: { opacity: FAINT }, to: { opacity: 1 }, ease: "power1.out" }));
  const tU = Math.min(t0 + D - 0.1, w.b - 0.8);
  m.push({ prim: "draw", target: `#${S}-undp`, at: r3(tU), dur: 0.7, ease: "power2.inOut" });
  if (note) {
    const at = Math.max(ctx.at("note"), Math.min(t0 + D * 0.7, w.b - 1));
    const nd = r3(Math.max(0.3, Math.min(note.length * 0.035, w.b - 0.2 - (at + 0.35))));
    m.push({ prim: "draw", target: `#${S}-arrowp`, at: r3(at), dur: 0.45, ease: "power2.out" },
      { prim: "type", target: `#${S}-sidet`, chars: `.${S}-nc`, count: note.length, at: r3(at + 0.35), dur: nd });
  }
  // boil, as in the registry block: the drawing and the arrow jitter on their own, 8 times a second
  const boil = [`#${S}-boil`, ...(note ? [`#${S}-arrow`] : [])];
  for (let k = 0, at = w.a + 0.1; at < w.b - 0.05; k++, at += 0.125) {
    boil.forEach((tg, j) => m.push({ prim: "swap", target: tg, at: r2(at), props: {
      x: r2(hash(k * 3 + j * 97, seed) * 1.4), y: r2(hash(k * 3 + 1 + j * 97, seed) * 1.4), rotation: r2(hash(k * 3 + 2 + j * 97, seed) * 0.3) } }));
  }
  return { css, html, motions: keepInside(m, w.b) };
}
