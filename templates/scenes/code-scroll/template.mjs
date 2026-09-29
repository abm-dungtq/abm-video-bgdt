// code-scroll — scroll through a long file and stop on the key line, after the HyperFrames registry block "code-scroll"
// (heygen-com/hyperframes, Apache-2.0). The top of the file is on stage at the window start; the view then scrolls
// (ease in, ease out) so the focus line lands in the middle as its keyword is spoken, a highlight sweeps across it,
// a caret marks its gutter and the rest of the file steps back; the optional note explains it.
// minimap: an editor window with a syntax-coloured minimap whose viewport box and the scrollbar thumb travel along.
// reel (signature): no chrome, large type straight on the ground with soft top and bottom fades, a motion blur while
//   it scrolls; the key line swells slightly under a gold bar.

import { keepInside } from "../_shared/dna-card.mjs";
import { highlight, highlightCss } from "../_shared/code-line.mjs";

export const revealKeys = (slots) => ["focus", ...(slots.note ? ["note"] : [])];

const CHAR = 0.6; // JetBrains Mono advance, em
const r2 = (x) => Math.round(x * 100) / 100;

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const mono = `"${theme.mono}", monospace`;
  const lines = slots.lines;
  const n = lines.length;
  const f = slots.focus;
  if (f >= n) throw new Error(`focus ${f} is past the last line (${n} lines, first is 0)`);
  const reel = ctx.variant === "reel";
  const fit = (t, dur) => Math.max(w.a, Math.min(t, w.b - dur - 0.05));
  const maxLen = Math.max(20, ...lines.map((l) => [...l].length));

  // geometry
  const VR = 9; // visible rows
  const LH = reel ? 60 : 50;
  const winX = reel ? 152 : 152, winW = 1456;
  const BAR = reel ? 0 : 60, PAD = reel ? 0 : 16, GUT = reel ? 90 : 78, MMW = reel ? 0 : 170;
  const codeW = winW - GUT - 40 - MMW - 30;
  const fs = Math.max(18, Math.min(reel ? 38 : 30, Math.round(LH * 0.62), Math.floor(codeW / (maxLen * CHAR))));
  const viewH = VR * LH;
  const winH = BAR + 2 * PAD + viewH;
  const noteH = slots.note ? 120 : 0;
  const winY = Math.max(10, Math.round((820 - winH - noteH) / 2));
  // rows scrolled so the focus sits mid-view; the reel may run past the last line (its edges fade out anyway), so a
  // focus near the end still lands in the clear middle band instead of under the bottom fade
  const off = Math.max(0, Math.min(f - Math.floor(VR / 2), reel ? n : n - VR));

  // minimap
  const MLH = Math.min(12, Math.floor((viewH - 20) / n));
  const mmBars = lines.map((l, i) => {
    const ind = l.length - l.trimStart().length, bw = Math.max(0, Math.min(l.trim().length, 48));
    return bw ? `<div class="${S}-mb${i === f ? ` ${S}-mbf` : ""}" style="top: ${i * MLH}px; left: ${Math.round(ind * 2.4)}px; width: ${Math.round(bw * 2.4)}px"></div>` : "";
  }).join("");

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-win { position: absolute; left: ${winX}px; top: ${winY}px; width: ${winW}px; height: ${winH}px; box-sizing: border-box;${reel ? "" : `
  border-radius: ${R}px; overflow: hidden; background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 14%, transparent);
  box-shadow: 0 28px 70px color-mix(in srgb, var(--canvas) 70%, transparent);`} }
#${S}-bar { position: absolute; left: 0; top: 0; right: 0; height: ${BAR}px; display: flex; align-items: center; gap: 14px; padding: 0 26px;
  background: color-mix(in srgb, var(--ink) 5%, var(--surface)); border-bottom: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); }
.${S}-tl { width: 16px; height: 16px; border-radius: 50%; background: color-mix(in srgb, var(--muted) 55%, transparent); flex: none; }
#${S}-ttl { margin-left: 18px; font-family: ${mono}; font-size: 26px; color: var(--muted); white-space: nowrap; }
#${S}-cnt { margin-left: auto; font-family: ${mono}; font-size: 22px; color: var(--muted); }
#${S}-view { position: absolute; left: 0; top: ${BAR + PAD}px; width: ${winW - MMW}px; height: ${viewH}px; overflow: hidden;${reel ? `
  -webkit-mask-image: linear-gradient(180deg, transparent 0, black 22%, black 78%, transparent 100%);
  mask-image: linear-gradient(180deg, transparent 0, black 22%, black 78%, transparent 100%);` : ""} }
#${S}-feed { position: absolute; left: 0; top: 0; right: 0; height: ${n * LH}px; }
#${S}-hl { position: absolute; left: ${GUT + 8}px; top: ${f * LH + 4}px; width: ${Math.round(Math.min(codeW + 24, [...lines[f]].length * fs * CHAR + 40))}px; height: ${LH - 8}px;
  border-radius: 8px; background: color-mix(in srgb, var(--gold) ${reel ? 16 : 20}%, transparent); border-left: 6px solid var(--gold); transform-origin: 0 50%; }
#${S}-car { position: absolute; left: 8px; top: ${f * LH + LH / 2 - 12}px; width: 0; height: 0; border-top: 12px solid transparent; border-bottom: 12px solid transparent;
  border-left: 18px solid var(--gold); }
.${S}-row { position: absolute; left: 0; right: 0; height: ${LH}px; line-height: ${LH}px; font-family: ${mono}; font-size: ${fs}px; }
.${S}-ln { position: absolute; top: 0; left: 0; width: ${GUT - 22}px; text-align: right; color: var(--muted); }
.${S}-tx { position: absolute; top: 0; left: ${GUT + 26}px; right: 20px; white-space: pre; overflow: hidden; color: var(--ink); transform-origin: 0 50%; }
#${S}-mm { position: absolute; right: 22px; top: ${BAR + PAD + 10}px; width: ${MMW - 34}px; height: ${viewH - 20}px; }
.${S}-mb { position: absolute; height: ${Math.max(3, MLH - 4)}px; border-radius: 2px; background: color-mix(in srgb, var(--ink) 30%, transparent); }
.${S}-mbf { background: var(--gold); }
#${S}-mv { position: absolute; left: -8px; right: -8px; top: 0; height: ${VR * MLH}px; border-radius: 4px; background: color-mix(in srgb, var(--cyan) 14%, transparent);
  border: 2px solid color-mix(in srgb, var(--cyan) 55%, transparent); }
#${S}-trk { position: absolute; right: 6px; top: ${BAR + PAD}px; width: 8px; height: ${viewH}px; border-radius: 4px; background: color-mix(in srgb, var(--ink) 8%, transparent); }
#${S}-thumb { position: absolute; right: 6px; top: ${BAR + PAD}px; width: 8px; height: ${Math.round((viewH * VR) / n)}px; border-radius: 4px;
  background: color-mix(in srgb, var(--cyan) 60%, transparent); }
#${S}-tag { position: absolute; left: ${winX}px; top: ${winY - 64}px; display: flex; align-items: center; gap: 16px; font-family: ${mono}; font-size: 28px; color: var(--muted); }
#${S}-tagd { width: 14px; height: 14px; border-radius: 50%; background: var(--cyan); }
#${S}-note { position: absolute; left: 80px; top: ${winY + winH + 36}px; width: 1600px; text-align: center; }
#${S}-notei { display: inline-flex; align-items: center; gap: 18px; padding: 14px 34px; border-radius: 40px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--gold) 55%, transparent); font-size: 36px; font-weight: 700; color: var(--ink); white-space: nowrap; }
.${S}-lt { font-family: ${mono}; font-size: 28px; color: var(--gold); }
${highlightCss(S)}`;

  // rows scroll through the clipped view on purpose: while they pass its edges the layout check sees them clipped
  // (occluded) or under the title bar, so every text box of a row carries the layering waivers
  const LAY = " data-layout-allow-occlusion data-layout-allow-overlap";
  const rows = lines.map((l, i) => `        <div class="${S}-row" id="${S}-r${i}" style="top: ${i * LH}px"><span class="${S}-ln"${LAY}>${i + 1}</span><span class="${S}-tx" id="${S}-t${i}"${LAY}>${highlight(l, esc, S, LAY) || " "}</span></div>`).join("\n");
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
  ${reel ? `<div id="${S}-tag"><span id="${S}-tagd"></span><span>${esc(slots.file)}</span></div>` : ""}
  <div id="${S}-win">
    ${reel ? "" : `<div id="${S}-bar"><span class="${S}-tl"></span><span class="${S}-tl"></span><span class="${S}-tl"></span><div id="${S}-ttl">${esc(slots.file)}</div><div id="${S}-cnt">${n} dòng</div></div>`}
    <div id="${S}-view">
      <div id="${S}-feed">
        <div id="${S}-hl"></div><div id="${S}-car"></div>
${rows}
      </div>
    </div>
    ${reel ? "" : `<div id="${S}-mm">${mmBars}<div id="${S}-mv"></div></div><div id="${S}-trk"></div><div id="${S}-thumb"></div>`}
  </div>
  ${slots.note ? `<div id="${S}-note"><span id="${S}-notei"><span class="${S}-lt">Dòng ${f + 1}</span><span>${esc(slots.note)}</span></span></div>` : ""}
 </div>
</div>`;

  // ── motion ────────────────────────────────────────────────────────────────────
  const m = [];
  m.push({ prim: "reveal", target: `#${S}-win`, at: w.a + 0.05, dur: 0.5, from: reel ? { opacity: 0 } : { opacity: 0, y: 30 }, ease: ctx.ease });
  if (reel) m.push({ prim: "reveal", target: `#${S}-tag`, at: w.a + 0.1, dur: 0.45, from: { opacity: 0, x: -24 } });
  for (let i = 0; i < Math.min(n, VR); i++) m.push({ prim: "reveal", target: `#${S}-t${i}`, at: w.a + 0.1 + i * 0.04, dur: 0.3, from: { opacity: 0, x: -12 } });
  // the scroll: arrive just as the focus keyword is spoken
  const tF = fit(Math.max(ctx.at("focus"), w.a + 1.3), 0.7);
  const sA = w.a + 0.55, sDur = r2(Math.max(0.5, tF - 0.05 - sA));
  if (off > 0) {
    m.push({ prim: "slide", target: `#${S}-feed`, at: sA, dur: sDur, from: { y: 0 }, to: { y: -off * LH }, ease: "power3.inOut" });
    if (!reel) {
      m.push({ prim: "slide", target: `#${S}-mv`, at: sA, dur: sDur, from: { y: 0 }, to: { y: off * MLH }, ease: "power3.inOut" },
        { prim: "slide", target: `#${S}-thumb`, at: sA, dur: sDur, from: { y: 0 }, to: { y: r2(((viewH - (viewH * VR) / n) * off) / (n - VR)) }, ease: "power3.inOut" });
    } else {
      const half = r2(sDur / 2 - 0.02);
      m.push({ prim: "reveal", target: `#${S}-feed`, at: sA, dur: half, from: { filter: "blur(0px)" }, to: { filter: "blur(5px)" }, ease: "power2.in" },
        { prim: "reveal", target: `#${S}-feed`, at: r2(sA + half + 0.03), dur: half, from: { filter: "blur(5px)" }, to: { filter: "blur(0px)" }, ease: "power2.out" });
    }
  }
  // the key line: highlight sweep, gutter caret, the rest steps back
  m.push({ prim: "reveal", target: `#${S}-hl`, at: tF, dur: 0.6, from: { scaleX: 0, opacity: 0.4 }, ease: "power2.inOut" },
    { prim: "reveal", target: `#${S}-car`, at: tF, dur: 0.35, from: { opacity: 0, x: -14 }, ease: "back.out(2)" },
    { prim: "dim", targets: lines.map((_, i) => i).filter((i) => i !== f).map((i) => `#${S}-r${i}`), at: tF + 0.25, to: reel ? 0.35 : 0.45 });
  if (reel) m.push({ prim: "reveal", target: `#${S}-t${f}`, at: tF + 0.1, dur: 0.45, from: { scale: 1 }, to: { scale: 1.05 }, ease: "back.out(2)" });
  let end = tF + 0.7;
  if (slots.note) {
    const at = fit(Math.max(ctx.at("note"), tF + 0.4), 0.5);
    m.push({ prim: "reveal", target: `#${S}-note`, at, dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease });
    end = Math.max(end, at + 0.5);
  }
  const d = ctx.drift(`#${S}-grp`, Math.min(end + ctx.gap, w.b - 0.7), 8);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}
