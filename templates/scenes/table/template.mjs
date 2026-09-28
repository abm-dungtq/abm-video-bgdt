// table — a comparison of 2–3 columns (the things compared) over 2–5 rows (the criteria). A cell is a short text or a
// boolean, drawn as an SVG check (true, cyan) or cross (false, warn): the fonts lack those glyphs.
// The column heads enter on "columns"; each row enters on its keyword.
// rows-reveal: a classic grid on column bands; each row slides in on its keyword, its cells follow left → right and a
//   gold cursor jumps to the row being read.
// scorecard: each column is a tall card; criteria sit on a rail at the left; cells pop into the cards row by row, then
//   every card tallies its checks and the leader glows.
// checkmarks: an open checklist — faint mark slots from the start; on each row's keyword a pen runs along the row,
//   drawing the rule and each circle and mark as it passes.

import { fit as sizeFor, keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["columns", ...slots.rows.map((_, i) => `rows.${i}`)];

const r1 = (x) => Math.round(x * 10) / 10;
const longest = (list) => list.reduce((a, s) => ([...s].length > [...a].length ? s : a), "");
const CHECK = "M-13 1 L-4 11 L14 -11";
const CROSS = "M-10 -10 L10 10 M10 -10 L-10 10";

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const cols = slots.columns;
  const mC = cols.length;
  const rows = slots.rows.map((r) => ({ label: r.label, cells: cols.map((_, j) => r.cells[j] ?? "") }));
  const n = rows.length;
  const tC = ctx.at("columns");
  const t = rows.map((_, i) => ctx.at(`rows.${i}`));
  const last = Math.max(tC, ...t);
  const R = theme.radius ?? 18;
  const mono = `"${theme.mono}", monospace`;
  const clamp = (at, dur) => Math.max(w.a, Math.min(at, w.b - dur - 0.05));
  const m = [];
  const texts = rows.flatMap((r) => r.cells.filter((c) => typeof c === "string" && c));
  const cellFs = sizeFor(longest(texts), [[10, 34], [16, 30]]);
  const headFs = sizeFor(longest(cols), [[10, 40], [16, 34]]);
  const labFs = sizeFor(longest(rows.map((r) => r.label)), [[14, 38], [22, 34]]);
  /** an SVG mark (check or cross) with an optional circle; ids end in the row and column (1-based) */
  const mark = (v, id, size, ring) => `<svg class="${S}-mk ${v ? `${S}-yes` : `${S}-no`}" viewBox="-32 -32 64 64" style="width: ${size}px; height: ${size}px">${ring
    ? `<circle class="${S}-mc" id="${S}-mc${id}" cx="0" cy="0" r="27" pathLength="1000" transform="rotate(-90)"/>` : ""}<path class="${S}-mp" id="${S}-mp${id}" pathLength="1000" d="${v ? CHECK : CROSS}"/></svg>`;
  const cellHtml = (c, id, size, ring) => (typeof c === "boolean" ? mark(c, id, size, ring)
    : c ? `<span class="${S}-ct">${esc(c)}</span>` : "");
  const baseCss = `
#${S}-grp { position: absolute; inset: 0; }
#${S}-svg { position: absolute; left: 0; top: 0; width: 1760px; height: 820px; overflow: visible; }
.${S}-head { font-size: ${headFs}px; font-weight: 800; line-height: 1.15; color: var(--gold); text-align: center; white-space: nowrap; }
.${S}-lab { font-size: ${labFs}px; font-weight: 800; line-height: 1.15; color: var(--ink); white-space: nowrap; }
.${S}-ct { font-size: ${cellFs}px; font-weight: 600; line-height: 1.15; color: var(--ink); white-space: nowrap; }
.${S}-mk { display: block; overflow: visible; }
.${S}-mp { fill: none; stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-mc { stroke-width: 3; stroke-dasharray: 1000; }
.${S}-yes .${S}-mp { stroke: var(--cyan); }
.${S}-yes .${S}-mc { fill: color-mix(in srgb, var(--cyan) 14%, transparent); stroke: color-mix(in srgb, var(--cyan) 70%, transparent); }
.${S}-no .${S}-mp { stroke: var(--warn); }
.${S}-no .${S}-mc { fill: color-mix(in srgb, var(--warn) 10%, transparent); stroke: color-mix(in srgb, var(--warn) 60%, transparent); }`;
  // draw a mark's circle then its strokes
  const drawMark = (c, id, at, ring) => {
    if (typeof c !== "boolean") return;
    if (ring) m.push({ prim: "draw", target: `#${S}-mc${id}`, at: clamp(at, 0.35), dur: 0.35, ease: "power1.inOut" });
    m.push({ prim: "draw", target: `#${S}-mp${id}`, at: clamp(at + (ring ? 0.25 : 0), 0.35), dur: 0.35, ease: "power2.out" });
  };
  let css, html;

  if (ctx.variant === "scorecard") {
    // ── scorecard: one tall card per column, a criteria rail, tallies ─────────
    const X0 = 600, gap = 28, cw = (1720 - X0 - (mC - 1) * gap) / mC;
    const cx = cols.map((_, j) => r1(X0 + j * (cw + gap)));
    const bools = rows.filter((r) => r.cells.some((c) => typeof c === "boolean")).length;
    const score = cols.map((_, j) => rows.filter((r) => r.cells[j] === true).length);
    const top = Math.max(...score);
    const winner = bools && score.filter((s) => s === top).length === 1 ? score.indexOf(top) : -1;
    const y0 = 150, y1 = bools ? 690 : 780, rowH = (y1 - y0) / n;
    const ys = rows.map((_, i) => r1(y0 + rowH * (i + 0.5)));
    const mk = Math.min(64, rowH - 24);
    css = `${baseCss}
.${S}-card { position: absolute; top: 0; width: ${r1(cw)}px; height: 800px; box-sizing: border-box; border-radius: ${R}px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); }
.${S}-win { position: absolute; inset: -3px; border-radius: ${R + 2}px; border: 4px solid var(--gold);
  box-shadow: 0 0 34px color-mix(in srgb, var(--gold) 40%, transparent); }
.${S}-ch { position: absolute; left: 12px; right: 12px; top: 30px; }
.${S}-cell { position: absolute; left: 0; width: 100%; height: ${r1(rowH)}px; display: flex; align-items: center; justify-content: center; }
.${S}-tally { position: absolute; left: 0; width: 100%; top: 712px; text-align: center; font-size: 56px; font-weight: 800; line-height: 1.1;
  color: var(--ink); font-variant-numeric: tabular-nums; white-space: nowrap; }
.${S}-of { font-size: 32px; color: var(--muted); margin-left: 6px; }
.${S}-rl { position: absolute; left: 40px; width: 530px; height: ${r1(rowH)}px; display: flex; align-items: center; }
.${S}-guide { stroke: color-mix(in srgb, var(--ink) 16%, transparent); stroke-width: 2; stroke-dasharray: 1000; fill: none; }
#${S}-sep { stroke: color-mix(in srgb, var(--gold) 50%, transparent); stroke-width: 2; fill: none; stroke-dasharray: 1000; }
${cx.map((x, j) => `#${S}-c${j + 1} { left: ${x}px; }`).join("\n")}
${ys.map((y, i) => `#${S}-rl${i + 1} { top: ${r1(y - rowH / 2)}px; }\n.${S}-cell.${S}-y${i + 1} { top: ${r1(y - rowH / 2)}px; }`).join("\n")}`;
    html = `<div id="${S}-grp">
  <svg id="${S}-svg" viewBox="0 0 1760 820">
    <path id="${S}-sep" pathLength="1000" d="M40 ${y0 - 20} L${X0 - 30} ${y0 - 20}"/>
${ys.map((y, i) => `    <path class="${S}-guide" id="${S}-gl${i + 1}" pathLength="1000" d="M40 ${r1(y + rowH / 2)} L1720 ${r1(y + rowH / 2)}"/>`).join("\n")}
  </svg>
${cols.map((c, j) => `  <div class="${S}-card" id="${S}-c${j + 1}">${j === winner ? `<div class="${S}-win" id="${S}-win"></div>` : ""}
    <div class="${S}-ch ${S}-head" id="${S}-h${j + 1}">${esc(c)}</div>
${rows.map((r, i) => `    <div class="${S}-cell ${S}-y${i + 1}" id="${S}-x${i + 1}-${j + 1}">${cellHtml(r.cells[j], `${i + 1}-${j + 1}`, mk, true)}</div>`).join("\n")}
${bools ? `    <div class="${S}-tally" id="${S}-t${j + 1}"><span id="${S}-n${j + 1}">0</span><span class="${S}-of">/${bools}</span></div>` : ""}
  </div>`).join("\n")}
${rows.map((r, i) => `  <div class="${S}-rl ${S}-lab" id="${S}-rl${i + 1}">${esc(r.label)}</div>`).join("\n")}
</div>`;
    cols.forEach((_, j) => {
      m.push({ prim: "reveal", target: `#${S}-c${j + 1}`, at: w.a + 0.05 + j * 0.08, dur: 0.5, from: { opacity: 0, y: 50 }, ease: ctx.ease });
      m.push({ prim: "reveal", target: `#${S}-h${j + 1}`, at: clamp(tC + j * 0.1, 0.4), dur: 0.4, from: { opacity: 0, y: -14 } });
    });
    m.push({ prim: "draw", target: `#${S}-sep`, at: w.a + 0.2, dur: 0.6 });
    rows.forEach((r, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-rl${k}`, at: clamp(t[i], 0.45), dur: 0.45, from: { opacity: 0, x: -30 }, ease: ctx.ease });
      m.push({ prim: "draw", target: `#${S}-gl${k}`, at: clamp(t[i], 0.6), dur: 0.6 });
      r.cells.forEach((c, j) => {
        const at = t[i] + 0.15 + j * 0.12;
        m.push({ prim: "reveal", target: `#${S}-x${k}-${j + 1}`, at: clamp(at, 0.4), dur: 0.4, from: { opacity: 0, scale: 0.5 }, ease: "back.out(2)" });
        drawMark(c, `${k}-${j + 1}`, at + 0.05, true);
      });
    });
    if (bools) {
      const d = Math.max(0.3, Math.min(0.8, w.b - last - 0.6));
      const tS = clamp(last + 0.5, d);
      cols.forEach((_, j) => {
        m.push({ prim: "reveal", target: `#${S}-t${j + 1}`, at: clamp(w.a + 0.3 + j * 0.08, 0.4), dur: 0.4, from: { opacity: 0 } });
        m.push({ prim: "count", target: `#${S}-n${j + 1}`, at: tS, dur: d, to: score[j] });
      });
      if (winner >= 0) {
        const tw = clamp(tS + d, 0.45);
        m.push({ prim: "reveal", target: `#${S}-win`, at: tw, dur: 0.45, from: { opacity: 0, scale: 1.06 }, ease: "power2.out" });
        const pa = tw + 0.5;
        if (w.b - 0.05 - pa >= 1.2) m.push({ prim: "pulse", target: `#${S}-win`, at: pa, dur: r1(w.b - 0.1 - pa) });
      }
    }
  } else if (ctx.variant === "checkmarks") {
    // ── checkmarks: an open checklist drawn by a pen ─────────────────────────
    const LX = 40, X0 = 700, X1 = 1720, colW = (X1 - X0) / mC;
    const cx = cols.map((_, j) => r1(X0 + colW * (j + 0.5)));
    const y0 = 150, rowH = Math.min(128, 640 / n);
    const ys = rows.map((_, i) => r1(y0 + rowH * (i + 0.5)));
    const mk = Math.min(72, rowH - 30);
    const penX0 = X0 - 30, penX1 = X1 + 12;
    css = `${baseCss}
.${S}-hd { position: absolute; top: 34px; width: ${r1(colW - 20)}px; }
.${S}-ul { fill: none; stroke: var(--gold); stroke-width: 4; stroke-linecap: round; stroke-dasharray: 1000; }
.${S}-rule { fill: none; stroke: color-mix(in srgb, var(--ink) 30%, transparent); stroke-width: 2; stroke-dasharray: 1000; }
.${S}-slot { fill: none; stroke: color-mix(in srgb, var(--ink) 18%, transparent); stroke-width: 2; stroke-dasharray: 5 8; }
.${S}-rl { position: absolute; left: ${LX}px; width: ${X0 - LX - 40}px; height: ${r1(rowH)}px; display: flex; align-items: center; gap: 16px; }
.${S}-rn { font-family: ${mono}; font-size: 24px; font-weight: 700; color: var(--cyan); flex: none; }
.${S}-cell { position: absolute; width: ${r1(colW - 20)}px; height: ${r1(rowH)}px; display: flex; align-items: center; justify-content: center; }
#${S}-pen { position: absolute; left: -14px; top: -14px; width: 28px; height: 28px; }
#${S}-pc { position: absolute; inset: 0; border-radius: 50%; background: var(--gold); box-shadow: 0 0 20px 6px color-mix(in srgb, var(--gold) 50%, transparent); }
${cx.map((x, j) => `#${S}-h${j + 1} { left: ${r1(x - (colW - 20) / 2)}px; }`).join("\n")}
${ys.map((y, i) => `#${S}-rl${i + 1} { top: ${r1(y - rowH / 2)}px; }\n${cx.map((x, j) => `#${S}-x${i + 1}-${j + 1} { left: ${r1(x - (colW - 20) / 2)}px; top: ${r1(y - rowH / 2)}px; }`).join("\n")}`).join("\n")}`;
    html = `<div id="${S}-grp">
  <svg id="${S}-svg" viewBox="0 0 1760 820">
${cx.map((x, j) => `    <path class="${S}-ul" id="${S}-u${j + 1}" pathLength="1000" d="M${r1(x - colW * 0.3)} 112 L${r1(x + colW * 0.3)} 112"/>`).join("\n")}
${ys.map((y, i) => `    <path class="${S}-rule" id="${S}-ru${i + 1}" pathLength="1000" d="M${LX} ${r1(y + rowH / 2 - 4)} L${X1} ${r1(y + rowH / 2 - 4)}"/>`).join("\n")}
    <g id="${S}-slots">
${ys.map((y, i) => cx.map((x) => `      <circle class="${S}-slot" cx="${x}" cy="${y}" r="${r1(mk * 0.42)}"/>`).join("\n")).join("\n")}
    </g>
  </svg>
${cols.map((c, j) => `  <div class="${S}-hd ${S}-head" id="${S}-h${j + 1}">${esc(c)}</div>`).join("\n")}
${rows.map((r, i) => `  <div class="${S}-rl" id="${S}-rl${i + 1}"><span class="${S}-rn">${String(i + 1).padStart(2, "0")}</span><span class="${S}-lab">${esc(r.label)}</span></div>
${r.cells.map((c, j) => `  <div class="${S}-cell" id="${S}-x${i + 1}-${j + 1}">${cellHtml(c, `${i + 1}-${j + 1}`, mk, true)}</div>`).join("\n")}`).join("\n")}
  <div id="${S}-pen"><div id="${S}-pc"></div></div>
</div>`;
    m.push({ prim: "reveal", target: `#${S}-slots`, at: w.a + 0.05, dur: 0.6, from: { opacity: 0 } });
    cols.forEach((_, j) => {
      m.push({ prim: "reveal", target: `#${S}-h${j + 1}`, at: clamp(tC + j * 0.1, 0.45), dur: 0.45, from: { opacity: 0, y: 16 }, ease: ctx.ease });
      m.push({ prim: "draw", target: `#${S}-u${j + 1}`, at: clamp(tC + 0.2 + j * 0.1, 0.5), dur: 0.5 });
    });
    let penEnd = -1, penOn = false;
    rows.forEach((r, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-rl${k}`, at: clamp(t[i], 0.45), dur: 0.45, from: { opacity: 0, x: -24 }, ease: ctx.ease });
      m.push({ prim: "draw", target: `#${S}-ru${k}`, at: clamp(t[i], 0.7), dur: 0.7, ease: "power1.inOut" });
      // the pen runs the row; the next row waits for it, and it never runs past the shot
      const at = Math.max(clamp(t[i], 0.3), penEnd + 0.03);
      const d = Math.min(0.7, w.b - 0.05 - at);
      const run = d >= 0.2;
      if (run) {
        if (!penOn) { m.push({ prim: "reveal", target: `#${S}-pen`, at, dur: 0.2, from: { opacity: 0 } }); penOn = true; }
        m.push({ prim: "slide", target: `#${S}-pen`, at, dur: d, from: { x: penX0, y: ys[i] }, to: { x: penX1, y: ys[i] }, ease: "power1.inOut" });
        penEnd = at + d;
      }
      r.cells.forEach((c, j) => {
        const pass = run ? at + (d * (cx[j] - penX0)) / (penX1 - penX0) - 0.1 : t[i] + 0.1 + j * 0.12;
        m.push({ prim: "reveal", target: `#${S}-x${k}-${j + 1}`, at: clamp(pass, 0.3), dur: 0.3, from: { opacity: 0 } });
        drawMark(c, `${k}-${j + 1}`, pass, true);
      });
    });
    const pa = Math.max(penEnd + 0.1, last + 0.8);
    if (penOn && w.b - 0.05 - pa >= 1.2) m.push({ prim: "pulse", target: `#${S}-pc`, at: pa, dur: r1(w.b - 0.1 - pa) });
  } else {
    // ── rows-reveal (signature): a grid on column bands, a jumping cursor ─────
    const X = 40, W = 1680, LW = 560, colW = (W - LW) / mC;
    const cx = cols.map((_, j) => r1(X + LW + colW * (j + 0.5)));
    const y0 = 140, rowH = Math.min(128, (790 - y0) / n), bh = rowH - 16;
    const ys = rows.map((_, i) => r1(y0 + rowH * i));
    const mk = Math.min(60, bh - 16);
    css = `${baseCss}
.${S}-band { position: absolute; top: 16px; width: ${r1(colW - 16)}px; height: ${r1(y0 + rowH * n - 16)}px; border-radius: ${R}px;
  background: color-mix(in srgb, var(--ink) 4%, transparent); border: 1px solid color-mix(in srgb, var(--ink) 8%, transparent); }
.${S}-hd { position: absolute; top: 40px; width: ${r1(colW - 16)}px; }
.${S}-shell { position: absolute; left: ${X}px; width: ${W}px; height: ${r1(bh)}px; box-sizing: border-box; border-radius: ${R}px;
  border: 2px dashed color-mix(in srgb, var(--ink) 14%, transparent); }
.${S}-row { position: absolute; left: ${X}px; width: ${W}px; height: ${r1(bh)}px; box-sizing: border-box; border-radius: ${R}px;
  background: color-mix(in srgb, var(--surface) 88%, transparent); border: 2px solid color-mix(in srgb, var(--cyan) 22%, transparent); }
.${S}-rl { position: absolute; left: 36px; top: 0; height: 100%; display: flex; align-items: center; }
.${S}-cell { position: absolute; top: 0; width: ${r1(colW - 16)}px; height: 100%; display: flex; align-items: center; justify-content: center; }
#${S}-cur { position: absolute; left: ${X - 4}px; top: ${y0}px; width: 10px; height: ${r1(bh)}px; border-radius: 5px; background: var(--gold);
  box-shadow: 0 0 18px color-mix(in srgb, var(--gold) 60%, transparent); }
${cx.map((x, j) => `#${S}-bd${j + 1}, #${S}-h${j + 1} { left: ${r1(x - (colW - 16) / 2)}px; }`).join("\n")}
${ys.map((y, i) => `#${S}-sh${i + 1}, #${S}-r${i + 1} { top: ${y}px; }`).join("\n")}
${cx.map((x, j) => `.${S}-c${j + 1} { left: ${r1(x - X - (colW - 16) / 2)}px; }`).join("\n")}`;
    html = `<div id="${S}-grp">
${cols.map((c, j) => `  <div class="${S}-band" id="${S}-bd${j + 1}"></div>
  <div class="${S}-hd ${S}-head" id="${S}-h${j + 1}">${esc(c)}</div>`).join("\n")}
${rows.map((r, i) => `  <div class="${S}-shell" id="${S}-sh${i + 1}"></div>
  <div class="${S}-row" id="${S}-r${i + 1}"><div class="${S}-rl ${S}-lab">${esc(r.label)}</div>
${r.cells.map((c, j) => `    <div class="${S}-cell ${S}-c${j + 1}" id="${S}-x${i + 1}-${j + 1}">${cellHtml(c, `${i + 1}-${j + 1}`, mk, false)}</div>`).join("\n")}
  </div>`).join("\n")}
  <div id="${S}-cur"></div>
</div>`;
    cols.forEach((_, j) => {
      m.push({ prim: "reveal", target: `#${S}-bd${j + 1}`, at: w.a + 0.05 + j * 0.08, dur: 0.5, from: { opacity: 0, y: 30 }, ease: ctx.ease });
      m.push({ prim: "reveal", target: `#${S}-h${j + 1}`, at: clamp(tC + j * 0.1, 0.45), dur: 0.45, from: { opacity: 0, y: -16 }, ease: ctx.ease });
    });
    let curEnd = -1, curY = 0;
    rows.forEach((r, i) => {
      const k = i + 1;
      m.push({ prim: "reveal", target: `#${S}-sh${k}`, at: w.a + 0.1 + i * 0.06, dur: 0.4, from: { opacity: 0 } });
      m.push({ prim: "reveal", target: `#${S}-r${k}`, at: clamp(t[i], 0.5), dur: 0.5, from: { opacity: 0, x: -60 }, ease: ctx.ease });
      r.cells.forEach((c, j) => {
        const at = t[i] + 0.25 + j * 0.12;
        m.push({ prim: "reveal", target: `#${S}-x${k}-${j + 1}`, at: clamp(at, 0.35), dur: 0.35, from: { opacity: 0, y: 12 } });
        drawMark(c, `${k}-${j + 1}`, at + 0.1, false);
      });
      // the cursor jumps to the row being read
      if (i === 0) {
        m.push({ prim: "reveal", target: `#${S}-cur`, at: clamp(t[0], 0.3), dur: 0.3, from: { opacity: 0, scaleY: 0.3 } });
        curEnd = clamp(t[0], 0.3) + 0.3;
      } else {
        const at = Math.max(clamp(t[i], 0.3), curEnd + 0.03);
        const d = Math.min(0.3, w.b - 0.05 - at);
        if (d >= 0.12) {
          const y = r1(ys[i] - y0);
          m.push({ prim: "slide", target: `#${S}-cur`, at, dur: d, from: { y: curY }, to: { y }, ease: "power2.inOut" });
          curY = y;
          curEnd = at + d;
        }
      }
    });
  }
  const d = ctx.drift(`#${S}-grp`, clamp(last + 1.2, 0.7), 10);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}
