// callout-sentence — one key sentence lit word by word as it is spoken, after the HyperFrames registry block
// "mk-callout-highlight" (Apache-2.0). The whole sentence stands faint from the window start; over the `text` range a
// highlight sweep brings each word to full ink in turn (the registry block's one-scalar sweep, cut into per-word
// tweens). The optional key phrase (words of the sentence) is set in gold and gets its own accent once the sweep has
// passed it; the optional source lands last.
// marker (signature): a large left-aligned sentence under a gold rule; a highlighter bar sweeps behind the key phrase.
// circle: a centred sentence; a hand-drawn loop circles the key phrase; the source sits under a short rule.

import { keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["text", ...(slots.source ? ["source"] : [])];

const r3 = (x) => Math.round(x * 1000) / 1000;
const FAINT = 0.3;

export function render(ctx) {
  const { S, slots, esc, window: w } = ctx;
  const text = slots.text.normalize("NFC").trim().replace(/\s+/g, " ");
  const key = slots.key ? slots.key.normalize("NFC").trim().replace(/\s+/g, " ") : null;
  const circle = ctx.variant === "circle";
  const m = [];

  // words with their character span; the key phrase is the run of words it overlaps
  const words = [];
  for (const mt of text.matchAll(/\S+/g)) words.push({ w: mt[0], a: mt.index, b: mt.index + mt[0].length });
  let k0 = -1, k1 = -1;
  if (key) {
    const at = text.toLocaleLowerCase("vi").indexOf(key.toLocaleLowerCase("vi"));
    if (at < 0) throw new Error(`key "${slots.key}" is not a part of text`);
    words.forEach((x, i) => { if (x.b > at && x.a < at + key.length) { if (k0 < 0) k0 = i; k1 = i; } });
  }
  const n = words.length;
  const len = [...text].length;
  const fs = circle ? (len <= 50 ? 76 : len <= 80 ? 66 : 56) : (len <= 50 ? 84 : len <= 80 ? 72 : 60);

  const wordHtml = (x, i) => `<span class="${S}-w${i >= k0 && i <= k1 ? ` ${S}-kw` : ""}" id="${S}-w${i}">${esc(x.w)}</span>`;
  const parts = [];
  for (let i = 0; i < n; i++) {
    if (i === k0) {
      const inner = words.slice(k0, k1 + 1).map((x, j) => wordHtml(x, k0 + j)).join(" ");
      // the loop is drawn in the key phrase's estimated pixel box (Be Vietnam Pro ExtraBold ≈ 0.6 em per character), so
      // stretching it onto the real box stays close to uniform and the stroke keeps its weight
      const W = Math.round(1.12 * [...words.slice(k0, k1 + 1).map((x) => x.w).join(" ")].length * fs * 0.6), H = Math.round(1.52 * fs * 1.3);
      const p = (fx, fy) => `${Math.round(fx * W)} ${Math.round(fy * H)}`;
      const loop = `M${p(0.56, 0.1)} C${p(0.84, 0.07)} ${p(0.985, 0.27)} ${p(0.98, 0.5)} C${p(0.975, 0.77)} ${p(0.75, 0.93)} ${p(0.5, 0.92)}`
        + ` C${p(0.23, 0.9)} ${p(0.025, 0.77)} ${p(0.02, 0.5)} C${p(0.015, 0.23)} ${p(0.22, 0.08)} ${p(0.48, 0.08)} C${p(0.62, 0.08)} ${p(0.75, 0.13)} ${p(0.83, 0.22)}`;
      const accent = circle
        ? `<svg class="${S}-ring" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"><path id="${S}-ringp" pathLength="1000" d="${loop}"/></svg>`
        : `<span class="${S}-mk" id="${S}-mk"></span>`;
      parts.push(`<span class="${S}-key">${accent}${inner}</span>`);
      i = k1;
    } else parts.push(wordHtml(words[i], i));
  }

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-box { position: absolute; ${circle ? "left: 160px; width: 1440px; text-align: center;" : "left: 120px; width: 1520px; text-align: left;"}
  top: 0; height: 820px; display: flex; flex-direction: column; justify-content: center; align-items: ${circle ? "center" : "flex-start"}; }
#${S}-rule { width: 140px; height: 10px; overflow: visible; margin-bottom: 40px; }
#${S}-rule path { fill: none; stroke: var(--gold); stroke-width: 8; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-txt { font-size: ${fs}px; font-weight: 800; line-height: 1.3; color: var(--ink); letter-spacing: -0.01em; }
.${S}-w { display: inline-block; }
.${S}-kw { color: var(--gold); }
.${S}-key { position: relative; display: inline-block; white-space: nowrap; }
.${S}-key .${S}-w { position: relative; z-index: 1; }
.${S}-mk { position: absolute; left: -10px; right: -10px; top: 18%; bottom: 6%; border-radius: 10px; z-index: 0;
  background: color-mix(in srgb, var(--gold) 26%, transparent); transform-origin: 0 50%; }
.${S}-ring { position: absolute; left: -6%; top: -26%; width: 112%; height: 152%; overflow: visible; z-index: 0; }
.${S}-ring path { fill: none; stroke: var(--cyan); stroke-width: 6; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-src { margin-top: 44px; display: flex; align-items: center; gap: 20px; font-size: 38px; font-weight: 600; color: var(--muted); white-space: nowrap; }
#${S}-srcl { width: 60px; height: 4px; border-radius: 2px; background: color-mix(in srgb, var(--gold) 70%, transparent); }`;
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
  <div id="${S}-box">
    ${circle ? "" : `<svg id="${S}-rule" viewBox="0 0 140 10"><path id="${S}-rulep" pathLength="1000" d="M4 5 L136 5"/></svg>`}
    <div id="${S}-txt">${parts.join(" ")}</div>
    ${slots.source ? `<div id="${S}-src"><span id="${S}-srcl"></span><span>${esc(slots.source)}</span></div>` : ""}
  </div>
 </div>
</div>`;

  // the faint sentence at the window start, then the sweep over the `text` range
  const [s0, s1] = ctx.at("text");
  const t0 = Math.max(s0, w.a + 0.55);
  // the sweep ends by 80 % of the range, so the lit sentence and its accent hold for a moment before the cut
  const D = Math.max(0.5, 0.8 * (Math.min(s1, w.b - 0.45) - t0));
  const step = D / n, wd = r3(Math.min(0.35, Math.max(0.12, 2 * step)));
  m.push({ prim: "reveal", target: `#${S}-txt`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0, y: 24 }, ease: ctx.ease });
  if (!circle) m.push({ prim: "draw", target: `#${S}-rulep`, at: w.a + 0.1, dur: 0.6 });
  // each word's first tween sets it faint from the start (the emitter's initial state is the earliest "from")
  words.forEach((_, i) => {
    m.push({ prim: "reveal", target: `#${S}-w${i}`, at: r3(t0 + i * step), dur: wd, from: { opacity: FAINT }, to: { opacity: 1 }, ease: "power1.out" });
  });
  let end = t0 + D;
  if (k0 >= 0) {
    const at = Math.min(t0 + (k1 + 1) * step + 0.05, w.b - 0.6);
    m.push(circle ? { prim: "draw", target: `#${S}-ringp`, at, dur: 0.55, ease: "power2.inOut" }
      : { prim: "reveal", target: `#${S}-mk`, at, dur: 0.45, from: { scaleX: 0 }, ease: "power2.out" });
    end = Math.max(end, at + 0.55);
  }
  if (slots.source) {
    const at = Math.max(ctx.at("source"), Math.min(t0 + D * 0.8, w.b - 0.6));
    m.push({ prim: "reveal", target: `#${S}-src`, at, dur: 0.45, from: { opacity: 0, y: 16 }, ease: ctx.ease });
    end = Math.max(end, at + 0.45);
  }
  const d = ctx.drift(`#${S}-grp`, Math.min(end + ctx.gap, w.b - 0.7), 8);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}
