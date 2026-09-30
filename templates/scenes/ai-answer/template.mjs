// ai-answer — an AI answer that builds up paragraph by paragraph, each one citing its source, after the HyperFrames
// registry block "ai-chat-reveal" (heygen-com/hyperframes, Apache-2.0). Only the answer-panel layout is kept: no logo
// or brand mark of any product; every colour comes from the theme.
// The window rises in with the question in its search bar; each paragraph starts as two grey "still writing" bars and,
// on its keyword, the bars give way to the paragraph while an accent rule draws down its left edge and its source chip
// (numbered, with the site name from the slot) pops in.
// inline: the source chip sits at the end of the paragraph's last line, like a footnote.
// sources-side (signature): paragraphs in a left column, each source as a card in a right column on the paragraph's row.

import { keepInside, lines } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["question", ...slots.turns.map((_, i) => `turns.${i}`)];

const r2 = (x) => Math.round(x * 100) / 100;

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const side = ctx.variant === "sources-side";
  const turns = slots.turns;
  const t = turns.map((_, i) => ctx.at(`turns.${i}`));
  const tq = ctx.at("question");

  // geometry (stage px)
  const WX = 152, WY = 8, WW = 1456, WH = 804, PAD = 44;
  const innerW = WW - PAD * 2 - 4;
  const textW = side ? 940 : innerW - 40;
  const qLines = lines(slots.question, 32, innerW - 110);
  const qH = qLines * 44 + 36;
  const bodyH = WH - PAD * 2 - qH - 30;
  const GAP = 22;
  const est = (f) => turns.reduce((h, x) => h + lines(x.text, f, textW - 30) * Math.round(f * 1.42) + 10 + GAP, 0);
  const fs = [40, 36, 32, 29, 26].find((f) => est(f) <= bodyH) ?? 26;
  const lh = Math.round(fs * 1.42);

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-win { position: absolute; left: ${WX}px; top: ${WY}px; width: ${WW}px; height: ${WH}px; box-sizing: border-box; padding: ${PAD}px; overflow: hidden;
  border-radius: ${R + 6}px; background: color-mix(in srgb, var(--canvas) 55%, var(--surface));
  border: 2px solid color-mix(in srgb, var(--ink) 14%, transparent); box-shadow: 0 30px 70px color-mix(in srgb, black 50%, transparent); }
#${S}-q { box-sizing: border-box; min-height: ${qH}px; display: flex; align-items: center; gap: 20px; padding: 12px 30px; border-radius: ${Math.round(R * 1.6)}px;
  background: color-mix(in srgb, var(--ink) 7%, var(--surface)); border: 2px solid color-mix(in srgb, var(--ink) 14%, transparent); }
#${S}-qi { flex: none; width: 40px; height: 40px; color: var(--cyan); }
#${S}-qi svg { width: 40px; height: 40px; display: block; }
#${S}-qt { font-size: 32px; line-height: 44px; font-weight: 700; color: var(--ink); overflow-wrap: anywhere; }
#${S}-body { margin-top: 30px; display: flex; flex-direction: column; gap: ${GAP}px; }
.${S}-p { position: relative; box-sizing: border-box; padding-left: 30px; display: flex; align-items: flex-start; gap: 36px; }
.${S}-rule { position: absolute; left: 0; top: 6px; bottom: 6px; width: 5px; border-radius: 3px; background: var(--gold); transform-origin: 50% 0; }
.${S}-txt { width: ${textW}px; font-size: ${fs}px; line-height: ${lh}px; font-weight: 500; color: var(--ink); overflow-wrap: anywhere; }
.${S}-chip { display: inline-flex; align-items: center; gap: 10px; box-sizing: border-box; height: ${side ? 56 : 44}px; padding: 0 16px 0 8px; margin-left: 14px;
  border-radius: 999px; vertical-align: middle; background: color-mix(in srgb, var(--cyan) 14%, transparent); border: 2px solid color-mix(in srgb, var(--cyan) 40%, transparent);
  font-size: ${side ? 26 : 24}px; line-height: 1; font-weight: 700; color: var(--cyan); white-space: nowrap; }
.${S}-chip b { flex: none; width: ${side ? 38 : 30}px; height: ${side ? 38 : 30}px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  background: var(--cyan); color: var(--canvas); font-size: ${side ? 22 : 18}px; font-weight: 800; }
.${S}-src { flex: none; margin-top: 4px; }
.${S}-src .${S}-chip { margin-left: 0; }
.${S}-sk { position: absolute; left: 30px; top: 8px; width: ${textW}px; display: flex; flex-direction: column; gap: 16px; opacity: 0; }
.${S}-sk i { display: block; height: ${Math.round(fs * 0.5)}px; border-radius: 999px; background: color-mix(in srgb, var(--ink) 12%, transparent); }`;

  const rows = turns.map((x, i) => {
    const chip = `<span class="${S}-chip" id="${S}-h${i}"><b aria-hidden="true">${i + 1}</b>${esc(x.who)}</span>`;
    return `    <div class="${S}-p" id="${S}-p${i}">
      <div class="${S}-rule" id="${S}-u${i}"></div>
      <div class="${S}-sk" id="${S}-k${i}"><i style="width: 96%"></i><i style="width: 58%"></i></div>
      <div class="${S}-txt" id="${S}-t${i}">${esc(x.text)}${side ? "" : chip}</div>${side ? `\n      <div class="${S}-src">${chip}</div>` : ""}
    </div>`;
  }).join("\n");

  const html = `<div id="${S}-root">
  <div id="${S}-win">
    <div id="${S}-q"><div id="${S}-qi">${ctx.icon("question")}</div><div id="${S}-qt">${esc(slots.question)}</div></div>
    <div id="${S}-body">
${rows}
    </div>
  </div>
</div>`;

  const m = [
    { prim: "reveal", target: `#${S}-win`, at: w.a + 0.05, dur: 0.6, from: { opacity: 0, y: 50, scale: 0.96 }, ease: "power3.out" },
    { prim: "reveal", target: `#${S}-qt`, at: r2(tq), dur: 0.5, from: { opacity: 0, y: 12 }, ease: ctx.ease },
  ];
  let end = w.a + 0.9;
  turns.forEach((_, i) => {
    const at = r2(t[i]);
    // the "still writing" bars appear early and wait, unless the paragraph is due almost at once
    const sk = r2(w.a + 0.45 + i * 0.1);
    const waits = at - sk >= 0.55;
    if (waits) {
      m.push({ prim: "reveal", target: `#${S}-k${i}`, at: sk, dur: 0.35, from: { opacity: 0, y: 8 } },
        { prim: "reveal", target: `#${S}-k${i}`, at: r2(at - 0.05), dur: 0.25, from: { opacity: 1 }, to: { opacity: 0 } });
    }
    m.push({ prim: "reveal", target: `#${S}-t${i}`, at, dur: 0.5, from: { opacity: 0, y: 14 }, ease: ctx.ease },
      { prim: "reveal", target: `#${S}-u${i}`, at, dur: 0.45, from: { scaleY: 0 }, ease: "power2.out" },
      { prim: "reveal", target: `#${S}-h${i}`, at: r2(at + 0.2), dur: 0.4, from: { opacity: 0, scale: 0.85 }, ease: "back.out(2)" });
    end = Math.max(end, at + 0.65);
  });
  const d = ctx.drift(`#${S}-body`, Math.min(end + 0.1, w.b - 0.7), 6);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}
