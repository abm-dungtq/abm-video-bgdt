// code-focus — spotlight one line of real code, after the HyperFrames registry block "code-highlight" (Apache-2.0).
// The editor and all its lines are on stage at the window start. On "focus" a gold highlight sweeps across the chosen
// line, a caret marks its gutter and the other lines dim; the optional note explains it.
// sweep: one wide editor; the note lands as a pill under it, tagged with the line number.
// lens (signature): the editor on the left; the focused line lifts out into a large card on the right, tied to its row
//   by a drawn connector, with the note beneath the enlarged code.

import { keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["focus", ...(slots.note ? ["note"] : [])];

const CHAR = 0.6; // JetBrains Mono advance, em

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const mono = `"${theme.mono}", monospace`;
  const lines = slots.lines;
  const n = lines.length;
  const f = slots.focus;
  if (f >= n) throw new Error(`focus ${f} is past the last line (${n} lines, first is 0)`);
  const tF = ctx.at("focus");
  const tN = slots.note ? ctx.at("note") : null;
  const lens = ctx.variant === "lens";
  const maxLen = Math.max(8, ...lines.map((l) => [...l].length));
  const m = [];

  const winX = lens ? 0 : 80, winW = lens ? 1040 : 1600;
  const LH = n > 8 ? 48 : 54, BAR = 64, PAD = 22, GUT = 64;
  const textW = winW - 40 - GUT - 40;
  const fs = Math.max(18, Math.min(lens ? 28 : 32, Math.floor(textW / (maxLen * CHAR))));
  const winH = BAR + 2 * PAD + n * LH;
  const noteH = slots.note && !lens ? 110 : 0;
  const winY = Math.max(10, Math.round((820 - winH - noteH) / 2));
  const rowY = winY + BAR + PAD + f * LH; // stage y of the focused row
  const hlW = Math.round(Math.min(textW + 20, [...lines[f]].length * fs * CHAR + 36));

  // lens card: the focused line enlarged
  const cardX = 1100, cardW = 660;
  const big = lines[f].trim();
  const bigFs = [...big].length <= 22 ? 40 : 34;
  const bigRows = Math.max(1, Math.ceil(([...big].length * bigFs * CHAR) / (cardW - 80)));
  const cardH = 90 + bigRows * Math.round(bigFs * 1.4) + (slots.note ? 150 : 40);
  const cardY = Math.max(10, Math.min(820 - cardH - 10, Math.round(rowY + LH / 2 - cardH / 2)));

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-win { position: absolute; left: ${winX}px; top: ${winY}px; width: ${winW}px; height: ${winH}px; box-sizing: border-box; border-radius: ${R}px;
  overflow: hidden; background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 14%, transparent);
  box-shadow: 0 28px 70px color-mix(in srgb, var(--canvas) 70%, transparent); }
#${S}-bar { position: absolute; left: 0; top: 0; right: 0; height: ${BAR}px; display: flex; align-items: center; gap: 14px; padding: 0 26px;
  background: color-mix(in srgb, var(--ink) 5%, var(--surface)); border-bottom: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-tl { width: 16px; height: 16px; border-radius: 50%; background: color-mix(in srgb, var(--muted) 55%, transparent); flex: none; }
#${S}-ttl { margin-left: 18px; font-family: ${mono}; font-size: 26px; color: var(--muted); white-space: nowrap; overflow: hidden; }
#${S}-code { position: absolute; left: 0; right: 0; top: ${BAR}px; bottom: 0; }
#${S}-hl { position: absolute; left: ${GUT + 14}px; top: ${PAD + f * LH + 3}px; width: ${hlW}px; height: ${LH - 6}px; border-radius: 8px;
  background: color-mix(in srgb, var(--gold) 20%, transparent); border-left: 5px solid var(--gold); transform-origin: 0 50%; }
#${S}-car { position: absolute; left: 8px; top: ${PAD + f * LH + 11}px; width: 0; height: 0; border-top: ${(LH - 22) / 2}px solid transparent;
  border-bottom: ${(LH - 22) / 2}px solid transparent; border-left: 16px solid var(--gold); }
.${S}-row { position: absolute; left: 0; right: 0; height: ${LH}px; line-height: ${LH}px; font-family: ${mono}; font-size: ${fs}px; }
.${S}-ln { position: absolute; top: 0; left: 0; width: ${GUT}px; text-align: right; color: var(--muted); }
.${S}-tx { position: absolute; top: 0; left: ${GUT + 28}px; right: 20px; overflow: hidden; white-space: pre; color: var(--ink); }
#${S}-note { position: absolute; left: 80px; top: ${winY + winH + 34}px; width: 1600px; text-align: center; }
#${S}-notei { display: inline-flex; align-items: center; gap: 18px; padding: 14px 34px; border-radius: 40px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--gold) 55%, transparent); font-size: 36px; font-weight: 700; color: var(--ink); white-space: nowrap; }
.${S}-tag { font-family: ${mono}; font-size: 28px; color: var(--gold); }
#${S}-link { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
#${S}-linkp { fill: none; stroke: var(--gold); stroke-width: 4; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-card { position: absolute; left: ${cardX}px; top: ${cardY}px; width: ${cardW}px; height: ${cardH}px; box-sizing: border-box; padding: 34px 40px;
  border-radius: ${R}px; background: var(--surface); border: 2px solid color-mix(in srgb, var(--gold) 60%, transparent);
  box-shadow: 0 24px 60px color-mix(in srgb, var(--canvas) 70%, transparent); }
#${S}-big { margin-top: 18px; font-family: ${mono}; font-size: ${bigFs}px; line-height: 1.4; color: var(--gold); white-space: pre-wrap; overflow-wrap: anywhere; }
#${S}-cnote { margin-top: 26px; padding-top: 22px; border-top: 2px solid color-mix(in srgb, var(--ink) 12%, transparent);
  font-size: 34px; font-weight: 700; line-height: 1.3; color: var(--ink); }`;

  const tag = `<span class="${S}-tag">Dòng ${f + 1}</span>`;
  const rows = lines.map((l, i) => `      <div class="${S}-row" id="${S}-r${i}" style="top: ${PAD + i * LH}px"><span class="${S}-ln">${i + 1}</span><span class="${S}-tx" id="${S}-t${i}">${esc(l) || " "}</span></div>`).join("\n");
  const lensHtml = lens ? `
  <svg id="${S}-link" viewBox="0 0 1760 820"><path id="${S}-linkp" pathLength="1000" d="M${winX + winW + 6} ${rowY + LH / 2} C${winX + winW + 40} ${rowY + LH / 2} ${cardX - 40} ${cardY + 60} ${cardX - 4} ${cardY + 60}"/></svg>
  <div id="${S}-card">${tag}<div id="${S}-big">${esc(big)}</div>${slots.note ? `<div id="${S}-cnote">${esc(slots.note)}</div>` : ""}</div>` : "";
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
  <div id="${S}-win">
    <div id="${S}-bar"><span class="${S}-tl"></span><span class="${S}-tl"></span><span class="${S}-tl"></span><div id="${S}-ttl">${esc(slots.file)}</div></div>
    <div id="${S}-code">
      <div id="${S}-hl"></div><div id="${S}-car"></div>
${rows}
    </div>
  </div>${lensHtml}
  ${slots.note && !lens ? `<div id="${S}-note"><span id="${S}-notei">${tag}<span>${esc(slots.note)}</span></span></div>` : ""}
 </div>
</div>`;

  // the editor and its code at the window start
  m.push({ prim: "reveal", target: `#${S}-win`, at: w.a + 0.05, dur: 0.5, from: lens ? { opacity: 0, x: -40 } : { opacity: 0, scale: 0.97 }, ease: ctx.ease });
  const intro = (i) => Math.min(w.a + 0.2 + i * 0.04, tF - 0.3);
  lines.forEach((_, i) => m.push({ prim: "reveal", target: `#${S}-t${i}`, at: Math.max(w.a + 0.05, intro(i)), dur: 0.28, from: { opacity: 0, x: -12 } }));
  // the spotlight
  const tS = Math.max(tF, w.a + 0.5);
  m.push({ prim: "reveal", target: `#${S}-hl`, at: tS, dur: 0.7, from: { scaleX: 0, opacity: 0.4 }, ease: "power2.inOut" },
    { prim: "reveal", target: `#${S}-car`, at: tS, dur: 0.35, from: { opacity: 0, x: -14 }, ease: "back.out(2)" },
    { prim: "dim", targets: lines.map((_, i) => i).filter((i) => i !== f).map((i) => `#${S}-r${i}`), at: tS + 0.2, to: 0.45 });
  let end = tS + 0.7;
  if (lens) {
    m.push({ prim: "draw", target: `#${S}-linkp`, at: tS + 0.3, dur: 0.5, ease: "power2.out" },
      { prim: "reveal", target: `#${S}-card`, at: tS + 0.55, dur: 0.5, from: { opacity: 0, x: 40, scale: 0.94 }, ease: ctx.ease });
    end = tS + 1.05;
    if (tN != null) {
      const at = Math.max(tN, tS + 0.9);
      m.push({ prim: "reveal", target: `#${S}-cnote`, at, dur: 0.45, from: { opacity: 0, y: 16 } });
      end = Math.max(end, at + 0.45);
    }
  } else if (tN != null) {
    const at = Math.max(tN, tS + 0.4);
    m.push({ prim: "reveal", target: `#${S}-note`, at, dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease });
    end = Math.max(end, at + 0.5);
  }
  const d = ctx.drift(`#${S}-grp`, Math.min(end + ctx.gap, w.b - 0.7), 10);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}
