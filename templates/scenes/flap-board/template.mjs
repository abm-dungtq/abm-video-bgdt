// flap-board — a split-flap board that announces a name or a milestone, after the HyperFrames registry block
// "split-flap-board" (Apache-2.0). The board and its blank flaps are on stage at the window start. Each row cascades
// left to right: every cell walks its drum through a few letters before it settles, landing on the row's keyword.
// A flip is the real mechanism drawn with scaleY: the top half of the old character folds down onto the seam, then the
// bottom half of the new one drops over the old bottom. Text shows in capitals with full Vietnamese diacritics (the
// registry block's ui-monospace face has none, so the cells use the theme font).
// board (signature): rows centred in a dark housing, the kicker on a gold plate above, the note below.
// departures: an airport board: kicker as a header, left-aligned rows numbered in gold, a light that turns on per row.

import { keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => [...(slots.kicker ? ["kicker"] : []), ...slots.lines.map((_, i) => `lines.${i}`), ...(slots.note ? ["note"] : [])];

const DRUM = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const HALF = 0.07; // seconds per half flap
const r3 = (x) => Math.round(x * 1000) / 1000;

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const R = theme.radius ?? 18;
  const rows = slots.lines.map((l) => [...l.normalize("NFC").toUpperCase()]);
  const t = slots.lines.map((_, i) => ctx.at(`lines.${i}`));
  const tK = slots.kicker ? ctx.at("kicker") : null;
  const tN = slots.note ? ctx.at("note") : null;
  const dep = ctx.variant === "departures";
  const nr = rows.length;
  const C = Math.max(...rows.map((r) => r.length));
  const m = [];

  // geometry
  const GAP = 8, RG = 18;
  const kickH = slots.kicker ? (dep ? 120 : 84) : 0, noteH = slots.note ? 90 : 0;
  const lead = dep ? 150 : 0; // row number + light in front of the cells
  const availW = (dep ? 1600 : 1540) - lead;
  let cw = Math.min(dep ? 104 : 124, Math.floor((availW - (C - 1) * GAP) / C));
  const padV = dep ? 0 : 36;
  const fitH = 820 - kickH - noteH - 2 * padV - (dep ? 40 : 30);
  while (cw > 40 && nr * Math.round(cw * 1.4) + (nr - 1) * RG > fitH) cw -= 2;
  const ch = Math.round(cw * 1.4), hh = ch / 2;
  const fs = Math.round(cw * 0.66);
  const rowsW = C * cw + (C - 1) * GAP, rowsH = nr * ch + (nr - 1) * RG;
  const boxW = rowsW + (dep ? lead : 72), boxH = rowsH + 2 * padV;
  const totalH = kickH + boxH + noteH;
  const y0 = Math.max(10, Math.round((820 - totalH) / 2));
  const boxX = dep ? 80 : Math.round((1760 - boxW) / 2), boxY = dep ? kickH + 30 : y0 + kickH;

  // each cell's drum: blank, a few passing letters, then its character (a blank cell never turns)
  const cells = rows.map((row) => Array.from({ length: C }, (_, c) => {
    const ch0 = row[c] ?? " ";
    if (ch0 === " ") return [" "];
    const k = 2 + Math.floor(ctx.rng() * 2);
    return [" ", ...Array.from({ length: k }, () => DRUM[Math.floor(ctx.rng() * DRUM.length)]), ch0];
  }));

  const glyph = (g, top) => `<span class="${S}-g" style="top: ${top}px">${g === " " ? "" : esc(g)}</span>`;
  const cellHtml = (seq, r, c) => {
    const id = `${S}-c${r}x${c}`;
    const halves = seq.map((g, j) => `<div class="${S}-h ${S}-top" id="${id}t${j}" style="z-index: ${20 - j}">${glyph(g, 0)}</div>`
      + `<div class="${S}-h ${S}-bot" id="${id}b${j}" style="z-index: ${j + 1}">${glyph(g, -hh)}</div>`).join("");
    return `<div class="${S}-cell" style="left: ${c * (cw + GAP)}px" data-layout-allow-overlap data-layout-allow-occlusion data-layout-allow-overflow>${halves}<div class="${S}-seam"></div></div>`;
  };
  const rowHtml = (r) => `    <div class="${S}-row" id="${S}-r${r}" style="top: ${padV + r * (ch + RG)}px">
      ${dep ? `<div class="${S}-idx">${String(r + 1).padStart(2, "0")}</div><div class="${S}-led" id="${S}-led${r}"></div>` : ""}<div class="${S}-cells">${cells[r].map((seq, c) => cellHtml(seq, r, c)).join("")}</div>
    </div>`;

  const css = `
#${S}-root { position: absolute; inset: 0; }
#${S}-grp { position: absolute; inset: 0; }
#${S}-box { position: absolute; left: ${boxX}px; top: ${boxY}px; width: ${boxW}px; height: ${boxH}px; box-sizing: border-box; border-radius: ${R}px;${dep ? "" : `
  background: color-mix(in srgb, var(--canvas) 55%, #000); border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent);
  box-shadow: 0 30px 70px color-mix(in srgb, var(--canvas) 80%, transparent);`} }
.${S}-row { position: absolute; left: ${dep ? 0 : 36}px; height: ${ch}px; width: ${rowsW + lead}px; }
.${S}-idx { position: absolute; left: 0; top: 0; height: ${ch}px; line-height: ${ch}px; font-family: "${theme.mono}", monospace; font-size: ${Math.min(52, Math.round(ch * 0.4))}px;
  font-weight: 700; color: var(--gold); }
.${S}-led { position: absolute; left: ${lead - 50}px; top: ${Math.round(ch / 2 - 13)}px; width: 26px; height: 26px; border-radius: 50%; background: var(--cyan);
  box-shadow: 0 0 16px color-mix(in srgb, var(--cyan) 70%, transparent); }
.${S}-cells { position: absolute; left: ${lead}px; top: 0; }
.${S}-cell { position: absolute; top: 0; width: ${cw}px; height: ${ch}px; border-radius: 8px; background: color-mix(in srgb, var(--canvas) 40%, #000);
  box-shadow: 0 10px 22px color-mix(in srgb, #000 45%, transparent); }
.${S}-h { position: absolute; left: 0; width: ${cw}px; height: ${hh}px; overflow: hidden; }
.${S}-top { top: 0; border-radius: 8px 8px 0 0; transform-origin: 50% 100%; background: linear-gradient(180deg, color-mix(in srgb, var(--surface) 90%, #fff) 0%, var(--surface) 100%); }
.${S}-bot { top: ${hh}px; border-radius: 0 0 8px 8px; transform-origin: 50% 0%; background: linear-gradient(180deg, color-mix(in srgb, var(--surface) 80%, #000) 0%, var(--surface) 100%); }
.${S}-g { position: absolute; left: 0; width: ${cw}px; height: ${ch}px; line-height: ${ch}px; text-align: center; font-size: ${fs}px; font-weight: 800; color: var(--ink); white-space: pre; }
.${S}-seam { position: absolute; left: 0; top: ${hh - 1.5}px; width: ${cw}px; height: 3px; background: color-mix(in srgb, var(--canvas) 30%, #000); z-index: 40; }
#${S}-kick { position: absolute; ${dep ? `left: 80px; top: 20px; height: 100px; display: flex; align-items: center; gap: 24px;` : `left: 0; width: 1760px; top: ${y0}px; text-align: center;`} }
#${S}-kicki { ${dep ? `font-size: 60px; font-weight: 800; color: var(--ink);` : `display: inline-block; padding: 10px 30px; border-radius: 10px; background: var(--gold); color: var(--canvas);
  font-size: 34px; font-weight: 800; letter-spacing: 0.08em;`} text-transform: uppercase; white-space: nowrap; }
#${S}-kico { width: 84px; height: 84px; border-radius: 20px; background: color-mix(in srgb, var(--gold) 14%, transparent); color: var(--gold);
  display: flex; align-items: center; justify-content: center; }
#${S}-kico svg { width: 52px; height: 52px; }
#${S}-note { position: absolute; ${dep ? `left: ${80 + lead}px; text-align: left;` : `left: 80px; width: 1600px; text-align: center;`} top: ${boxY + boxH + 30}px;
  font-size: 38px; font-weight: 700; color: var(--muted); white-space: nowrap; }`;

  const kick = slots.kicker
    ? `  <div id="${S}-kick">${dep ? `<div id="${S}-kico">${ctx.icon("timer")}</div>` : ""}<span id="${S}-kicki">${esc(slots.kicker)}</span></div>` : "";
  const html = `<div id="${S}-root">
 <div id="${S}-grp">
${kick}
  <div id="${S}-box">
${rows.map((_, r) => rowHtml(r)).join("\n")}
  </div>
  ${slots.note ? `<div id="${S}-note">${esc(slots.note)}</div>` : ""}
 </div>
</div>`;

  m.push({ prim: "reveal", target: `#${S}-box`, at: w.a + 0.05, dur: 0.5, from: dep ? { opacity: 0, x: -40 } : { opacity: 0, scale: 0.96 }, ease: ctx.ease });
  if (slots.kicker) m.push({ prim: "reveal", target: `#${S}-kick`, at: Math.max(tK, w.a + 0.1), dur: 0.45, from: { opacity: 0, y: -18 }, ease: ctx.ease });
  // the cascade: a row starts turning shortly before its keyword so it settles on it
  let end = w.a + 0.6;
  rows.forEach((_, r) => {
    const start = Math.max(w.a + 0.3, t[r] - 0.5);
    const maxSteps = Math.max(...cells[r].map((s) => s.length - 1));
    const want = (C - 1) * 0.045 + maxSteps * (2 * HALF + 0.02);
    const k = Math.min(1, Math.max(0.35, (w.b - 0.1 - start) / want)); // squeeze a cascade that would run past the shot
    const stagger = 0.045 * k, step = (2 * HALF + 0.02) * k, half = HALF * Math.max(0.6, k);
    cells[r].forEach((seq, c) => {
      const id = `${S}-c${r}x${c}`;
      for (let j = 0; j + 1 < seq.length; j++) {
        const at = start + c * stagger + j * step;
        m.push({ prim: "reveal", target: `#${id}t${j}`, at: r3(at), dur: r3(half), from: { scaleY: 1 }, to: { scaleY: 0 }, ease: "power2.in" },
          { prim: "reveal", target: `#${id}b${j + 1}`, at: r3(at + half), dur: r3(half), from: { scaleY: 0 }, to: { scaleY: 1 }, ease: "power1.out" });
        end = Math.max(end, at + 2 * half);
      }
    });
    if (dep) m.push({ prim: "reveal", target: `#${S}-led${r}`, at: Math.min(start + want * k, w.b - 0.35), dur: 0.3, from: { opacity: 0, scale: 0.4 }, ease: "back.out(2)" });
  });
  if (slots.note) {
    const at = Math.max(tN, w.a + 0.3);
    m.push({ prim: "reveal", target: `#${S}-note`, at, dur: 0.5, from: ctx.motionFrom(), ease: ctx.ease });
    end = Math.max(end, at + 0.5);
  }
  const d = ctx.drift(`#${S}-grp`, Math.min(end + ctx.gap, w.b - 0.7), 8);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}
