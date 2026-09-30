// weight-wave — a keyword whose letters change weight, after the HyperFrames registry block "weight-wave"
// (Apache-2.0). The registry block drives a variable font's wght axis per character; a compiled frame may only tween
// transform / opacity, and the theme font ships as static weights, so each character here is two stacked glyphs,
// medium (500) and extra-bold (800), cross-faded per character while the character lifts a little. The weight change
// is real letterforms, not a fake stroke, and keeps full Vietnamese diacritics.
// The phrase stands at 500 from the window start; on the `text` keyword the change plays.
// wave (signature): one huge line; a crest of weight runs left to right through it (twice when the shot is long),
//   and the last pass leaves the focus word (or, without one, the whole phrase) extra-bold.
// specimen: a type-specimen card ("Aa" and a 500 → 800 weight slider) beside the phrase; the weight ripples out from
//   the middle of the phrase and stays, while the slider knob travels to 800.

import { keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["text", ...(slots.caption ? ["caption"] : [])];

const r3 = (x) => Math.round(x * 1000) / 1000;
const UP = 0.18, HOLD = 0.12, DOWN = 0.3;

export function render(ctx) {
  const { S, slots, esc, window: w } = ctx;
  const text = slots.text.normalize("NFC").trim().replace(/\s+/g, " ");
  const chars = [...text];
  const n = chars.length;
  const spec = ctx.variant === "specimen";
  // the focus word: its characters end extra-bold in gold
  const focusSet = new Set();
  if (slots.focus) {
    const f = slots.focus.normalize("NFC").trim();
    const at = text.toLocaleLowerCase("vi").indexOf(f.toLocaleLowerCase("vi"));
    if (at < 0) throw new Error(`focus "${slots.focus}" is not a part of text`);
    const pre = [...text.slice(0, at)].length;
    for (let i = pre; i < pre + [...f].length; i++) focusSet.add(i);
  }
  const m = [];

  // geometry: sized at the heavy weight so the line never overflows (Be Vietnam Pro ExtraBold ≈ 0.64 em per character)
  // specimen: one line when it stays large, else two lines (never breaking a word)
  const one = Math.floor(960 / (n * 0.64));
  const fs = spec ? (one >= 72 ? Math.min(124, one)
    : Math.max(56, Math.min(124, Math.floor((2 * 960) / (n * 0.64)), Math.floor(960 / (Math.max(...text.split(" ").map((x) => [...x].length)) * 0.64)))))
    : Math.max(60, Math.min(176, Math.floor(1640 / (n * 0.64))));
  const lift = Math.round(fs * 0.08);

  // one inline-block per character (spaces too, so the crest moves at a constant rate), words kept unbroken
  let idx = 0;
  const wordsHtml = text.split(" ").map((word, wi, all) => {
    const cs = [...word].map((c) => {
      const i = idx++;
      return `<span class="${S}-ch" id="${S}-c${i}"><span class="${S}-lt" id="${S}-l${i}">${esc(c)}</span><span class="${S}-bd${focusSet.has(i) ? ` ${S}-fo` : ""}" id="${S}-b${i}" aria-hidden="true" data-layout-allow-overlap data-layout-allow-occlusion data-layout-allow-overflow>${esc(c)}</span></span>`;
    }).join("");
    const sp = wi < all.length - 1 ? (() => { const i = idx++; return `<span class="${S}-ch ${S}-sp" id="${S}-c${i}"> </span>`; })() : "";
    return `<span class="${S}-wd">${cs}</span>${sp}`;
  }).join("");
  const isSpace = chars.map((c) => c === " ");

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-main { position: absolute; ${spec ? "left: 740px; width: 1000px; text-align: left;" : "left: 60px; width: 1640px; text-align: center;"} top: 0; height: 820px;
  display: flex; flex-direction: column; justify-content: center; align-items: ${spec ? "flex-start" : "center"}; }
#${S}-line { font-size: ${fs}px; line-height: 1.2; color: var(--ink); ${spec ? "" : "white-space: nowrap;"} }
.${S}-wd { white-space: nowrap; }
.${S}-ch { position: relative; display: inline-block; white-space: pre; }
.${S}-lt { font-weight: 500; }
.${S}-bd { position: absolute; left: 50%; top: 0; transform: translateX(-50%); font-weight: 800; white-space: pre; }
.${S}-fo { color: var(--gold); }
#${S}-cap { margin-top: ${spec ? 40 : 56}px; font-size: 40px; font-weight: 600; line-height: 1.3; color: var(--muted); max-width: ${spec ? 1000 : 1400}px; }
#${S}-card { position: absolute; left: 40px; top: 130px; width: 600px; height: 560px; box-sizing: border-box; border-radius: 22px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); }
#${S}-aa { position: absolute; left: 0; top: 50px; width: 600px; height: 260px; text-align: center; font-size: 230px; line-height: 260px; color: var(--ink); }
#${S}-aal { position: absolute; left: 0; top: 0; width: 600px; font-weight: 500; }
#${S}-aab { position: absolute; left: 0; top: 0; width: 600px; font-weight: 800; color: var(--gold); }
#${S}-trk { position: absolute; left: 70px; top: 380px; width: 460px; height: 8px; border-radius: 4px; background: color-mix(in srgb, var(--ink) 14%, transparent); }
#${S}-knob { position: absolute; left: 52px; top: 366px; width: 36px; height: 36px; border-radius: 50%; background: var(--gold);
  box-shadow: 0 0 18px color-mix(in srgb, var(--gold) 60%, transparent); }
.${S}-tk { position: absolute; top: 420px; font-family: "${ctx.theme.mono}", monospace; font-size: 28px; color: var(--muted); }
#${S}-wv { position: absolute; left: 0; top: 470px; width: 600px; text-align: center; font-size: 34px; font-weight: 700; color: var(--ink); }`;

  const html = `<div id="${S}-root">
 <div id="${S}-grp">
  ${spec ? `<div id="${S}-card">
    <div id="${S}-aa"><span id="${S}-aal">Aa</span><span id="${S}-aab" data-layout-allow-overlap data-layout-allow-occlusion>Aa</span></div>
    <div id="${S}-trk"></div><div id="${S}-knob"></div>
    <span class="${S}-tk" style="left: 50px">500</span><span class="${S}-tk" style="left: 490px">800</span>
    <div id="${S}-wv">Độ đậm <span id="${S}-wn">500</span></div>
  </div>` : ""}
  <div id="${S}-main">
    <div id="${S}-line">${wordsHtml}</div>
    ${slots.caption ? `<div id="${S}-cap">${esc(slots.caption)}</div>` : ""}
  </div>
 </div>
</div>`;

  const tW = Math.max(ctx.at("text"), w.a + 0.7);
  const glyph = (i) => !isSpace[i];
  const up = (i, at) => [
    { prim: "reveal", target: `#${S}-b${i}`, at: r3(at), dur: UP, from: { opacity: 0 }, ease: "power1.out" },
    { prim: "reveal", target: `#${S}-l${i}`, at: r3(at), dur: UP, from: { opacity: 1 }, to: { opacity: 0 }, ease: "power1.in" },
  ];
  const down = (i, at) => [
    { prim: "reveal", target: `#${S}-b${i}`, at: r3(at), dur: DOWN, from: { opacity: 1 }, to: { opacity: 0 }, ease: "power1.in" },
    { prim: "reveal", target: `#${S}-l${i}`, at: r3(at), dur: DOWN, from: { opacity: 0 }, to: { opacity: 1 }, ease: "power1.out" },
  ];
  m.push({ prim: "reveal", target: `#${S}-line`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0, y: 24 }, ease: ctx.ease });
  let end;
  if (spec) {
    // ripple from the middle outwards; every character stays extra-bold
    const mid = (n - 1) / 2;
    const P = Math.max(0.5, Math.min(1.2, w.b - tW - 0.8));
    chars.forEach((_, i) => {
      if (!glyph(i)) return;
      const at = tW + (Math.abs(i - mid) / Math.max(1, mid)) * P;
      m.push(...up(i, at),
        { prim: "slide", target: `#${S}-c${i}`, at: r3(at), dur: UP, from: { y: 0 }, to: { y: -lift }, ease: "power2.out" },
        { prim: "slide", target: `#${S}-c${i}`, at: r3(at + UP + HOLD), dur: DOWN, from: { y: -lift }, to: { y: 0 }, ease: "power2.inOut" });
    });
    m.push({ prim: "reveal", target: `#${S}-card`, at: w.a + 0.1, dur: 0.5, from: { opacity: 0, x: -40 }, ease: ctx.ease },
      { prim: "slide", target: `#${S}-knob`, at: r3(tW), dur: r3(P + UP), from: { x: 0 }, to: { x: 440 }, ease: "power2.inOut" },
      { prim: "reveal", target: `#${S}-aal`, at: r3(tW), dur: r3(P + UP), from: { opacity: 1 }, to: { opacity: 0 } },
      { prim: "reveal", target: `#${S}-aab`, at: r3(tW), dur: r3(P + UP), from: { opacity: 0 } },
      { prim: "swap", target: `#${S}-wn`, at: r3(tW + (P + UP) / 2), props: { textContent: "650" } },
      { prim: "swap", target: `#${S}-wn`, at: r3(tW + P + UP), props: { textContent: "800" } });
    end = tW + P + UP + HOLD + DOWN;
  } else {
    // crest passes left to right; the last one leaves the focus word (or everything) heavy
    const P = Math.max(0.5, Math.min(0.6 + n * 0.035, 1.8, w.b - tW - 1));
    const passLen = P + UP + HOLD + DOWN + 0.1;
    const passes = w.b - tW - 0.4 >= 2 * passLen + 0.6 ? 2 : 1;
    for (let p = 0; p < passes; p++) {
      const last = p === passes - 1;
      chars.forEach((_, i) => {
        if (!glyph(i)) return;
        const peak = tW + p * passLen + (n > 1 ? (i / (n - 1)) * P : 0);
        const stay = last && (focusSet.size ? focusSet.has(i) : true);
        m.push(...up(i, peak), { prim: "slide", target: `#${S}-c${i}`, at: r3(peak), dur: UP, from: { y: 0 }, to: { y: -lift }, ease: "power2.out" },
          { prim: "slide", target: `#${S}-c${i}`, at: r3(peak + UP + HOLD), dur: DOWN, from: { y: -lift }, to: { y: 0 }, ease: "power2.inOut" });
        if (!stay) m.push(...down(i, peak + UP + HOLD));
      });
    }
    end = tW + passes * passLen;
  }
  if (slots.caption) {
    const at = Math.max(ctx.at("caption"), Math.min(end - 0.3, w.b - 0.6));
    m.push({ prim: "reveal", target: `#${S}-cap`, at, dur: 0.45, from: ctx.motionFrom(), ease: ctx.ease });
    end = Math.max(end, at + 0.45);
  }
  const d = ctx.drift(`#${S}-grp`, Math.min(end + ctx.gap, w.b - 0.7), 8);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}
