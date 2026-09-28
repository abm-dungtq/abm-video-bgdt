// question-hook — one hook question (ends with "?"), its key phrase `focus` lit on its cue, optional 2–3 answer options.
// `focus` must appear in the question (case-insensitive); when it does not, the last word before the "?" is the focus.
// big-question: a huge drawn question mark swaying at the right inside slow dashed rings; the question rises word by
//   word at the left, the focus is gold and gets a swept underline and a pop on its cue; options as chips underneath.
// blank-fill: a ruled worksheet card; the question fades in word by word with the focus left as a dashed blank and a
//   blinking caret; on its cue the focus drops into the blank, which turns solid gold; options sit below as a word bank
//   (the option equal to the focus lights when the blank fills).
// poll: a speech bubble with the question at the left (the focus gets a highlighter sweep); at the right the options
//   as lettered rows that slide in on their cues while a choosing cursor hops between them; without options a
//   thinking countdown ring and a row of learners lighting one by one.

import { keepInside } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["question", "focus", ...(slots.options ?? []).map((_, i) => `options.${i}`)];

const LETTERS = ["A", "B", "C"];
const len = (s) => [...String(s)].length;
/** estimated width of bold text at font size fs */
const wid = (s, fs) => len(s) * fs * 0.58;
/** first font size whose wrapped line count stays within its limit: steps = [[fs, maxLines], …] */
const pick = (text, width, steps) => {
  for (const [fs, max] of steps) {
    const n = Math.max(1, Math.ceil(wid(text, fs) / (width * 0.9)));
    if (n <= max) return { fs, n };
  }
  const [fs] = steps.at(-1);
  return { fs, n: Math.ceil(wid(text, fs) / (width * 0.9)) };
};

/** question → { pre, foc, post } with foc the focus phrase as written in the question */
function splitFocus(q, focus) {
  const lower = q.toLowerCase();
  const f = String(focus ?? "").trim();
  const i = f ? lower.indexOf(f.toLowerCase()) : -1;
  if (i >= 0 && [...q.slice(i, i + f.length)].length === len(f)) return { pre: q.slice(0, i), foc: q.slice(i, i + f.length), post: q.slice(i + f.length) };
  const m = q.match(/^(.*?)(\S+?)(\s*[?？]+\s*)$/u);
  return m ? { pre: m[1], foc: m[2], post: m[3] } : { pre: "", foc: q, post: "" };
}

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const mono = `"${theme.mono}", monospace`;
  const R = theme.radius ?? 18;
  const opts = slots.options ?? [];
  const tq = ctx.at("question");
  const tf = ctx.at("focus");
  const to = opts.map((_, i) => ctx.at(`options.${i}`));
  const clamp = (at, dur) => Math.max(w.a, Math.min(at, w.b - dur - 0.05));
  const { pre, foc, post } = splitFocus(slots.question, slots.focus);
  const m = [];

  /** the question as word spans: pre words, then the focus (+ glued tail) kept on one line, then the rest */
  const words = (s) => s.split(/\s+/).filter(Boolean);
  const glued = post.match(/^\S*/)[0];
  const rest = words(post.slice(glued.length));
  const units = [...words(pre).map((t) => ({ t })), { t: foc, focus: true, glued }, ...rest.map((t) => ({ t }))];
  const step = Math.min(0.08, 0.9 / units.length);
  const unitAt = (k) => clamp(tq + k * step, 0.45);
  const fk = units.findIndex((u) => u.focus);

  let css, html, driftFrom;

  if (ctx.variant === "blank-fill") {
    const CX = 140, CW = 1480, CY = 90, CH = 560;
    const TW = 1220;
    const { fs, n } = pick(slots.question, TW, [[72, 2], [62, 3], [54, 3], [48, 4]]);
    const bw = Math.round(wid(foc, fs) + 36);
    const lh = Math.round(fs * 1.5);
    const tTop = Math.round(140 + (CH - 170 - n * lh) / 2);
    const fill = clamp(Math.max(tf, unitAt(fk) + 0.5), 1.0);
    const bank = opts.length ? opts.findIndex((o) => o.trim().toLowerCase() === foc.trim().toLowerCase()) : -1;
    css = `
#${S}-grp { position: absolute; inset: 0; }
#${S}-card { position: absolute; left: ${CX}px; top: ${CY}px; width: ${CW}px; height: ${CH}px; box-sizing: border-box; border-radius: ${R}px;
  background: var(--surface); border: 2px solid color-mix(in srgb, var(--ink) 10%, transparent); overflow: hidden; }
#${S}-rules { position: absolute; left: 0; top: 0; width: ${CW}px; height: ${CH}px; }
#${S}-rules line { stroke: color-mix(in srgb, var(--cyan) 14%, transparent); stroke-width: 2; }
#${S}-marg { position: absolute; left: 110px; top: 0; width: 3px; height: ${CH}px; background: color-mix(in srgb, var(--warn) 55%, transparent); transform-origin: 50% 0; }
#${S}-hd { position: absolute; left: 150px; top: 36px; font-family: ${mono}; font-size: 24px; letter-spacing: 0.14em; color: var(--cyan); white-space: nowrap; }
#${S}-no { position: absolute; left: 22px; top: ${tTop + Math.round((lh - 40) / 2)}px; width: 70px; text-align: center; font-family: ${mono}; font-size: 30px; font-weight: 700; color: var(--gold); }
#${S}-badge { position: absolute; left: ${CX + CW - 150}px; top: ${CY + 26}px; width: 100px; height: 100px; color: var(--gold); }
#${S}-badge svg { width: 100px; height: 100px; display: block; }
#${S}-q { position: absolute; left: 160px; top: ${tTop}px; width: ${TW}px; font-size: ${fs}px; font-weight: 800; line-height: ${lh}px; color: var(--ink); }
.${S}-w { display: inline-block; }
.${S}-nw { white-space: nowrap; }
#${S}-blank { display: inline-block; position: relative; margin: 0 14px 0 6px; width: ${bw}px; height: ${Math.round(fs * 1.15)}px; vertical-align: bottom; }
#${S}-dash { position: absolute; left: 0; right: 0; bottom: 0; height: 0; border-bottom: 5px dashed color-mix(in srgb, var(--gold) 70%, transparent); }
#${S}-solid { position: absolute; left: 0; right: 0; bottom: -1px; height: 7px; border-radius: 4px; background: var(--gold); transform-origin: 0 50%; }
#${S}-glow { position: absolute; left: -8px; right: -8px; top: -6px; bottom: -4px; border-radius: 12px; background: color-mix(in srgb, var(--gold) 16%, transparent); }
#${S}-car { position: absolute; left: 14px; top: 10%; width: 5px; height: 78%; background: var(--gold); }
#${S}-ans { position: absolute; left: 0; right: 0; bottom: 4px; text-align: center; color: var(--gold); white-space: nowrap; line-height: 1.1; }
#${S}-bank { position: absolute; left: ${CX}px; top: ${CY + CH + 36}px; width: ${CW}px; display: flex; gap: 26px; align-items: center; }
#${S}-bl { font-family: ${mono}; font-size: 22px; letter-spacing: 0.14em; color: var(--muted); white-space: nowrap; }
.${S}-tile { position: relative; padding: 14px 28px; border-radius: 14px; border: 2px dashed color-mix(in srgb, var(--cyan) 55%, transparent);
  font-size: 34px; font-weight: 700; color: var(--ink); white-space: nowrap; background: color-mix(in srgb, var(--surface) 80%, transparent); }
.${S}-tlit { position: absolute; inset: -2px; border-radius: 14px; border: 3px solid var(--gold); background: color-mix(in srgb, var(--gold) 14%, transparent); }`;
    const qHtml = units.map((u, k) => (u.focus
      ? `<span class="${S}-nw"><span id="${S}-blank"><span id="${S}-glow"></span><span id="${S}-dash"></span><span id="${S}-solid"></span><span id="${S}-car"></span><span id="${S}-ans">${esc(u.t)}</span></span>${u.glued ? `<span class="${S}-w" id="${S}-u${k}">${esc(u.glued)}</span>` : ""}</span>`
      : `<span class="${S}-w" id="${S}-u${k}">${esc(u.t)}</span>`)).join(" ");
    const lines_ = Array.from({ length: 7 }, (_, k) => `<line x1="0" y1="${140 + k * 70}" x2="${CW}" y2="${140 + k * 70}"/>`).join("");
    html = `<div id="${S}-grp">
  <div id="${S}-card">
    <svg id="${S}-rules" viewBox="0 0 ${CW} ${CH}">${lines_}</svg>
    <div id="${S}-marg"></div>
    <div id="${S}-hd">ĐIỀN VÀO CHỖ TRỐNG</div>
    <div id="${S}-no">01</div>
    <div id="${S}-q">${qHtml}</div>
  </div>
  <div id="${S}-badge">${ctx.icon("question")}</div>
  ${opts.length ? `<div id="${S}-bank"><span id="${S}-bl">GỢI Ý</span>${opts.map((o, i) => `<span class="${S}-tile" id="${S}-o${i}">${i === bank ? `<span class="${S}-tlit" id="${S}-ol"></span>` : ""}${esc(o)}</span>`).join("")}</div>` : ""}
</div>`;
    m.push(
      { prim: "reveal", target: `#${S}-card`, at: w.a, dur: 0.55, from: { opacity: 0, y: 30 }, ease: ctx.ease },
      { prim: "reveal", target: `#${S}-marg`, at: w.a + 0.2, dur: 0.6, from: { scaleY: 0 }, ease: "power2.out" },
      { prim: "reveal", target: `#${S}-hd`, at: w.a + 0.25, dur: 0.45, from: { opacity: 0, x: -20 } },
      { prim: "reveal", target: `#${S}-no`, at: w.a + 0.3, dur: 0.4, from: { opacity: 0 } },
      { prim: "reveal", target: `#${S}-badge`, at: w.a + 0.15, dur: 0.7, from: { opacity: 0, rotation: -40, scale: 0.5 }, ease: "back.out(2)" },
      { prim: "reveal", target: `#${S}-dash`, at: unitAt(fk), dur: 0.4, from: { opacity: 0 } },
    );
    // the badge keeps swinging until the shot ends
    if (w.b - (w.a + 0.9) > 0.8) m.push({ prim: "slide", target: `#${S}-badge`, at: w.a + 0.9, dur: w.b - 0.05 - (w.a + 0.9), from: { rotation: 0 }, to: { rotation: 16 }, ease: "sine.inOut" });
    units.forEach((u, k) => {
      if (!u.focus) m.push({ prim: "reveal", target: `#${S}-u${k}`, at: unitAt(k), dur: 0.35, from: { opacity: 0 }, ease: "none" });
      else if (u.glued) m.push({ prim: "reveal", target: `#${S}-u${k}`, at: unitAt(k), dur: 0.35, from: { opacity: 0 }, ease: "none" });
    });
    // the caret blinks in the blank until the focus drops in
    let on = true;
    for (let t = unitAt(fk) + 0.45; t < fill - 0.12; t += 0.42) {
      m.push({ prim: "reveal", target: `#${S}-car`, at: t, dur: 0.06, from: { opacity: on ? 1 : 0 }, to: { opacity: on ? 0 : 1 }, ease: "none" });
      on = !on;
    }
    if (on) m.push({ prim: "reveal", target: `#${S}-car`, at: fill, dur: 0.06, from: { opacity: 1 }, to: { opacity: 0 }, ease: "none" });
    m.push(
      { prim: "reveal", target: `#${S}-ans`, at: fill, dur: 0.45, from: { opacity: 0, y: -56 }, ease: "back.out(1.8)" },
      { prim: "reveal", target: `#${S}-solid`, at: fill + 0.2, dur: 0.4, from: { scaleX: 0 }, ease: "power2.out" },
      { prim: "reveal", target: `#${S}-glow`, at: fill + 0.2, dur: 0.4, from: { opacity: 0 } },
    );
    if (opts.length) m.push({ prim: "reveal", target: `#${S}-bl`, at: clamp(to[0] - 0.1, 0.4), dur: 0.4, from: { opacity: 0 } });
    opts.forEach((_, i) => m.push({ prim: "reveal", target: `#${S}-o${i}`, at: clamp(to[i], 0.45), dur: 0.45, from: { opacity: 0, y: 24, scale: 0.9 }, ease: "back.out(1.6)" }));
    if (bank >= 0) m.push({ prim: "reveal", target: `#${S}-ol`, at: clamp(Math.max(fill + 0.25, to[bank] + 0.5), 0.4), dur: 0.4, from: { opacity: 0 } });
    driftFrom = Math.max(fill + 0.7, ...to.map((t) => t + 0.5));
  } else if (ctx.variant === "poll") {
    const BX = 40, BW = 680, BY = 90, BH = 560;
    const TW = BW - 110;
    const { fs, n } = pick(slots.question, TW, [[60, 3], [52, 4], [46, 5], [42, 6]]);
    const lh = Math.round(fs * 1.22);
    const qTop = Math.round(190 + (BH - 190 - n * lh) / 2);
    const lastOpt = opts.length ? Math.max(...to) : tq;
    css = `
#${S}-grp { position: absolute; inset: 0; }
#${S}-bub { position: absolute; left: ${BX}px; top: ${BY}px; width: ${BW}px; height: ${BH + 90}px; }
#${S}-bsv { position: absolute; left: 0; top: 0; width: ${BW}px; height: ${BH + 90}px; overflow: visible; }
#${S}-bsv path { fill: var(--surface); stroke: color-mix(in srgb, var(--cyan) 45%, transparent); stroke-width: 3; }
#${S}-bi { position: absolute; left: 56px; top: 50px; width: 88px; height: 88px; color: var(--gold); }
#${S}-bi svg { width: 88px; height: 88px; display: block; }
#${S}-bk { position: absolute; left: 166px; top: 78px; font-family: ${mono}; font-size: 24px; letter-spacing: 0.14em; color: var(--cyan); white-space: nowrap; }
#${S}-q { position: absolute; left: 56px; top: ${qTop}px; width: ${TW}px; font-size: ${fs}px; font-weight: 800; line-height: ${lh}px; color: var(--ink); }
.${S}-w { display: inline-block; }
.${S}-nw { white-space: nowrap; }
#${S}-fw { position: relative; display: inline-block; color: var(--gold); }
#${S}-hl { position: absolute; left: -6px; right: -2px; top: 18%; bottom: 4%; border-radius: 8px; background: color-mix(in srgb, var(--gold) 22%, transparent); transform-origin: 0 50%; }
#${S}-ft { position: relative; }
#${S}-col { position: absolute; left: 800px; top: ${opts.length ? 150 : 90}px; width: 920px; }
#${S}-ck { font-family: ${mono}; font-size: 26px; letter-spacing: 0.14em; color: var(--muted); white-space: nowrap; }
#${S}-rule { margin-top: 16px; width: 920px; height: 3px; background: color-mix(in srgb, var(--gold) 50%, transparent); transform-origin: 0 50%; }
.${S}-row { position: absolute; left: 0; width: 920px; height: 118px; box-sizing: border-box; border-radius: ${R}px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--ink) 12%, transparent); display: flex; align-items: center; gap: 28px; padding: 0 30px; }
.${S}-let { width: 64px; height: 64px; flex: none; border-radius: 50%; border: 3px solid var(--cyan); display: flex; align-items: center; justify-content: center;
  font-family: ${mono}; font-size: 32px; font-weight: 700; color: var(--cyan); box-sizing: border-box; }
.${S}-ol { font-size: 42px; font-weight: 800; color: var(--ink); white-space: nowrap; flex: 1; }
.${S}-rad { width: 40px; height: 40px; flex: none; border-radius: 50%; border: 3px solid color-mix(in srgb, var(--ink) 35%, transparent); box-sizing: border-box; }
#${S}-cur { position: absolute; left: -14px; top: ${opts.length ? 90 : 0}px; width: 948px; height: 118px; box-sizing: border-box; border-radius: ${R + 4}px;
  border: 4px solid var(--gold); box-shadow: 0 0 22px color-mix(in srgb, var(--gold) 35%, transparent); }
#${S}-ring { position: absolute; left: 1070px; top: 150px; width: 380px; height: 380px; overflow: visible; }
#${S}-ring .${S}-trk { fill: none; stroke: color-mix(in srgb, var(--ink) 10%, transparent); stroke-width: 18; }
#${S}-rp { fill: none; stroke: var(--cyan); stroke-width: 18; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-ti { position: absolute; left: 1200px; top: 280px; width: 120px; height: 120px; color: var(--gold); }
#${S}-ti svg { width: 120px; height: 120px; display: block; }
#${S}-cap { position: absolute; left: 800px; top: 580px; width: 920px; text-align: center; font-family: ${mono}; font-size: 30px; letter-spacing: 0.16em; color: var(--gold); white-space: nowrap; }
#${S}-ppl { position: absolute; left: 930px; top: 650px; width: 660px; display: flex; justify-content: space-between; }
.${S}-pp { position: relative; width: 84px; height: 84px; color: color-mix(in srgb, var(--ink) 30%, transparent); }
.${S}-pp svg { position: absolute; inset: 0; width: 84px; height: 84px; display: block; }
.${S}-pl { position: absolute; inset: 0; color: var(--cyan); }`;
    const tail = `M${R} 0 H${BW - R} Q${BW} 0 ${BW} ${R} V${BH - R} Q${BW} ${BH} ${BW - R} ${BH} H210 L96 ${BH + 80} L120 ${BH} H${R} Q0 ${BH} 0 ${BH - R} V${R} Q0 0 ${R} 0 Z`;
    const qHtml = units.map((u, k) => (u.focus
      ? `<span class="${S}-nw"><span id="${S}-fw"><span id="${S}-hl"></span><span id="${S}-ft">${esc(u.t)}</span></span>${u.glued ? `<span class="${S}-w" id="${S}-u${k}">${esc(u.glued)}</span>` : ""}</span>`
      : `<span class="${S}-w" id="${S}-u${k}">${esc(u.t)}</span>`)).join(" ");
    const gap = opts.length === 2 ? 170 : 140;
    const ys = opts.map((_, i) => 90 + i * gap);
    const right = opts.length ? `<div id="${S}-col">
    <div id="${S}-ck">BẠN CHỌN ĐÁP ÁN NÀO?</div>
    <div id="${S}-rule"></div>
${opts.map((o, i) => `    <div class="${S}-row" id="${S}-o${i}" style="top: ${ys[i]}px"><span class="${S}-let">${LETTERS[i]}</span><span class="${S}-ol" id="${S}-ot${i}">${esc(o)}</span><span class="${S}-rad"></span></div>`).join("\n")}
    <div id="${S}-cur"></div>
  </div>` : `<svg id="${S}-ring" viewBox="0 0 380 380"><circle class="${S}-trk" cx="190" cy="190" r="170"/>
    <path id="${S}-rp" pathLength="1000" d="M190 20 A170 170 0 1 1 190 360 A170 170 0 1 1 190 20"/></svg>
  <div id="${S}-ti">${ctx.icon("timer")}</div>
  <div id="${S}-cap">BẠN NGHĨ SAO?</div>
  <div id="${S}-ppl">${Array.from({ length: 5 }, (_, i) => `<div class="${S}-pp">${ctx.icon("person")}<div class="${S}-pl" id="${S}-p${i}">${ctx.icon("person")}</div></div>`).join("")}</div>`;
    html = `<div id="${S}-grp">
  <div id="${S}-bub"><svg id="${S}-bsv" viewBox="0 0 ${BW} ${BH + 90}"><path d="${tail}"/></svg>
    <div id="${S}-bi">${ctx.icon("question")}</div>
    <div id="${S}-bk">CÂU HỎI</div>
    <div id="${S}-q">${qHtml}</div>
  </div>
  ${right}
</div>`;
    m.push(
      { prim: "reveal", target: `#${S}-bub`, at: w.a, dur: 0.55, from: { opacity: 0, scale: 0.85, x: -40 }, ease: "back.out(1.4)" },
      { prim: "reveal", target: `#${S}-bi`, at: w.a + 0.2, dur: 0.6, from: { opacity: 0, rotation: -30 }, ease: "back.out(2)" },
      { prim: "reveal", target: `#${S}-bk`, at: w.a + 0.3, dur: 0.4, from: { opacity: 0, x: -16 } },
    );
    if (w.b - (w.a + 0.85) > 0.8) m.push({ prim: "slide", target: `#${S}-bi`, at: w.a + 0.85, dur: w.b - 0.05 - (w.a + 0.85), from: { rotation: 0 }, to: { rotation: 14 }, ease: "sine.inOut" });
    units.forEach((u, k) => {
      if (u.focus) {
        m.push({ prim: "reveal", target: `#${S}-fw`, at: unitAt(k), dur: 0.4, from: { opacity: 0, y: 20 }, ease: ctx.ease });
        if (u.glued) m.push({ prim: "reveal", target: `#${S}-u${k}`, at: unitAt(k), dur: 0.4, from: { opacity: 0, y: 20 }, ease: ctx.ease });
      } else m.push({ prim: "reveal", target: `#${S}-u${k}`, at: unitAt(k), dur: 0.4, from: { opacity: 0, y: 20 }, ease: ctx.ease });
    });
    const tHl = clamp(Math.max(tf, unitAt(fk) + 0.45), 0.5);
    m.push({ prim: "reveal", target: `#${S}-hl`, at: tHl, dur: 0.5, from: { scaleX: 0 }, ease: "power2.out" });
    if (opts.length) {
      m.push(
        { prim: "reveal", target: `#${S}-ck`, at: w.a + 0.2, dur: 0.45, from: { opacity: 0, y: -14 } },
        { prim: "reveal", target: `#${S}-rule`, at: w.a + 0.3, dur: 0.6, from: { scaleX: 0 }, ease: "power2.out" },
      );
      opts.forEach((_, i) => m.push(
        { prim: "reveal", target: `#${S}-o${i}`, at: Math.min(to[i], w.a + 0.15 + i * 0.08), dur: 0.45, from: { opacity: 0, x: 70 }, ease: ctx.ease },
        { prim: "reveal", target: `#${S}-ot${i}`, at: clamp(to[i], 0.45), dur: 0.45, from: { opacity: 0, x: -24 }, ease: ctx.ease }));
      // the choosing cursor: appears on the first option, then hops between the options until the shot ends
      const c0 = clamp(Math.max(to[0] + 0.45, w.a + 0.4), 0.3);
      m.push({ prim: "reveal", target: `#${S}-cur`, at: c0, dur: 0.3, from: { opacity: 0 } });
      const hopFrom = clamp(lastOpt + 0.6, 0.6);
      const span = w.b - 0.08 - hopFrom;
      if (span >= 0.6) {
        const seq = [];
        const hops = Math.max(1, Math.floor(span / 1.1));
        // hold on a row, glide to the next: each row appears twice in a row
        for (let h = 0; h <= hops; h++) seq.push([0, ys[h % opts.length] - ys[0]], [0, ys[h % opts.length] - ys[0]]);
        m.push({ prim: "orbit", target: `#${S}-cur`, points: seq, at: hopFrom, dur: span });
      }
      driftFrom = null;
    } else {
      const d0 = w.a + 0.3;
      m.push(
        { prim: "draw", target: `#${S}-rp`, at: d0, dur: Math.max(0.4, w.b - 0.1 - d0), ease: "none" },
        { prim: "reveal", target: `#${S}-ring`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0, scale: 0.85 }, ease: ctx.ease },
        { prim: "reveal", target: `#${S}-ti`, at: w.a + 0.2, dur: 0.5, from: { opacity: 0, scale: 0.6 }, ease: "back.out(2)" },
        { prim: "reveal", target: `#${S}-cap`, at: clamp(tq + 0.3, 0.45), dur: 0.45, from: { opacity: 0, y: 16 } },
        { prim: "reveal", target: `#${S}-ppl`, at: w.a + 0.25, dur: 0.5, from: { opacity: 0, y: 20 } },
      );
      const p0 = Math.max(tHl + 0.2, w.a + 0.8);
      const pst = Math.max(0.2, Math.min(0.6, (w.b - 0.5 - p0) / 5));
      for (let i = 0; i < 5; i++) m.push({ prim: "reveal", target: `#${S}-p${i}`, at: clamp(p0 + i * pst, 0.35), dur: 0.35, from: { opacity: 0, y: -10 } });
      driftFrom = Math.min(w.b, p0 + 5 * pst + 0.3);
    }
    driftFrom = driftFrom ?? Math.max(tHl + 0.5, lastOpt + 0.5);
  } else {
    // big-question
    const TW = 1180, TX = 110;
    const { fs, n } = pick(slots.question, TW, [[96, 2], [84, 2], [72, 3], [62, 3], [54, 3], [48, 4]]);
    const lh = Math.round(fs * 1.2);
    const optH = opts.length ? 130 : 0;
    const top = Math.round(Math.max(20, 410 - (90 + n * lh + optH) / 2));
    const qx = 1440, qy = 400;
    css = `
#${S}-grp { position: absolute; inset: 0; }
#${S}-rings { position: absolute; left: ${qx - 300}px; top: ${qy - 300}px; width: 600px; height: 600px; }
#${S}-rings svg { width: 600px; height: 600px; display: block; overflow: visible; }
#${S}-rings circle { fill: none; stroke: color-mix(in srgb, var(--cyan) 22%, transparent); stroke-width: 2; stroke-dasharray: 8 16; }
#${S}-qm { position: absolute; left: ${qx - 210}px; top: ${qy - 284}px; width: 420px; height: 568px; }
#${S}-qr { position: absolute; inset: 0; }
#${S}-qr svg { width: 420px; height: 568px; display: block; overflow: visible; }
#${S}-qp { fill: none; stroke: var(--gold); stroke-width: 40; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-qd { fill: var(--gold); }
#${S}-qs { fill: none; stroke: color-mix(in srgb, var(--gold) 16%, transparent); stroke-width: 80; stroke-linecap: round; }
#${S}-kk { position: absolute; left: ${TX}px; top: ${top}px; display: flex; align-items: center; gap: 20px; }
#${S}-kb { width: 60px; height: 6px; border-radius: 3px; background: var(--cyan); transform-origin: 0 50%; }
#${S}-kt { font-family: ${mono}; font-size: 28px; letter-spacing: 0.16em; color: var(--cyan); white-space: nowrap; }
#${S}-q { position: absolute; left: ${TX}px; top: ${top + 90}px; width: ${TW}px; font-size: ${fs}px; font-weight: 800; line-height: ${lh}px; color: var(--ink); }
.${S}-w { display: inline-block; }
.${S}-nw { white-space: nowrap; }
#${S}-fw { position: relative; display: inline-block; color: var(--gold); }
#${S}-ul { position: absolute; left: 0; right: 0; bottom: ${Math.round(-fs * 0.02)}px; height: ${Math.max(6, Math.round(fs * 0.08))}px; border-radius: 6px; background: var(--gold); transform-origin: 0 50%; }
#${S}-ops { position: absolute; left: ${TX}px; top: ${top + 90 + n * lh + 44}px; display: flex; gap: 24px; }
.${S}-op { display: flex; align-items: center; gap: 16px; padding: 14px 30px 14px 16px; border-radius: 40px; background: var(--surface);
  border: 2px solid color-mix(in srgb, var(--cyan) 40%, transparent); white-space: nowrap; }
.${S}-ol { width: 48px; height: 48px; border-radius: 50%; background: color-mix(in srgb, var(--cyan) 20%, transparent); display: flex; align-items: center; justify-content: center;
  font-family: ${mono}; font-size: 26px; font-weight: 700; color: var(--cyan); }
.${S}-ot { font-size: 34px; font-weight: 700; color: var(--ink); }`;
    const qHtml = units.map((u, k) => (u.focus
      ? `<span class="${S}-nw"><span id="${S}-fw"><span id="${S}-ul"></span>${esc(u.t)}</span>${u.glued ? `<span class="${S}-w" id="${S}-u${k}">${esc(u.glued)}</span>` : ""}</span>`
      : `<span class="${S}-w" id="${S}-u${k}">${esc(u.t)}</span>`)).join(" ");
    html = `<div id="${S}-grp">
  <div id="${S}-rings"><svg viewBox="-300 -300 600 600"><circle r="150"/><circle r="220"/><circle r="292"/></svg></div>
  <div id="${S}-qm"><div id="${S}-qr"><svg viewBox="-170 -230 340 460">
    <path id="${S}-qs" d="M-80 -110 C-80 -200 80 -200 80 -110 C80 -40 0 -40 0 40"/>
    <path id="${S}-qp" pathLength="1000" d="M-80 -110 C-80 -200 80 -200 80 -110 C80 -40 0 -40 0 40"/>
    <circle id="${S}-qd" cx="0" cy="140" r="30"/></svg></div></div>
  <div id="${S}-kk"><div id="${S}-kb"></div><div id="${S}-kt">CÂU HỎI</div></div>
  <div id="${S}-q">${qHtml}</div>
  ${opts.length ? `<div id="${S}-ops">${opts.map((o, i) => `<div class="${S}-op" id="${S}-o${i}"><span class="${S}-ol">${LETTERS[i]}</span><span class="${S}-ot">${esc(o)}</span></div>`).join("")}</div>` : ""}
</div>`;
    const pop = clamp(Math.max(tf, unitAt(fk) + 0.45), 0.6);
    m.push(
      { prim: "reveal", target: `#${S}-rings`, at: w.a, dur: 0.6, from: { opacity: 0, scale: 0.8 }, ease: ctx.ease },
      { prim: "reveal", target: `#${S}-qs`, at: w.a + 0.05, dur: 0.5, from: { opacity: 0 } },
      { prim: "draw", target: `#${S}-qp`, at: w.a + 0.1, dur: 0.8, ease: "power2.inOut" },
      { prim: "reveal", target: `#${S}-qd`, at: w.a + 0.75, dur: 0.4, from: { opacity: 0, scale: 0.2 }, ease: "back.out(3)" },
      { prim: "reveal", target: `#${S}-kb`, at: w.a + 0.1, dur: 0.5, from: { scaleX: 0 }, ease: "power2.out" },
      { prim: "reveal", target: `#${S}-kt`, at: w.a + 0.2, dur: 0.45, from: { opacity: 0, x: -16 } },
    );
    // rings turn slowly and the mark sways for the whole shot, so the frame never freezes
    if (w.b - (w.a + 0.65) > 0.8) m.push({ prim: "slide", target: `#${S}-rings`, at: w.a + 0.65, dur: w.b - 0.05 - (w.a + 0.65), from: { rotation: 0 }, to: { rotation: 40 }, ease: "none" });
    if (w.b - (w.a + 0.2) > 0.8) m.push({ prim: "slide", target: `#${S}-qr`, at: w.a + 0.2, dur: w.b - 0.05 - (w.a + 0.2), from: { rotation: -6 }, to: { rotation: 8 }, ease: "sine.inOut" });
    units.forEach((u, k) => {
      const tgt = u.focus ? `#${S}-fw` : `#${S}-u${k}`;
      m.push({ prim: "reveal", target: tgt, at: unitAt(k), dur: 0.45, from: { opacity: 0, y: 40 }, ease: ctx.ease });
      if (u.focus && u.glued) m.push({ prim: "reveal", target: `#${S}-u${k}`, at: unitAt(k), dur: 0.45, from: { opacity: 0, y: 40 }, ease: ctx.ease });
    });
    m.push(
      { prim: "reveal", target: `#${S}-ul`, at: pop, dur: 0.45, from: { scaleX: 0 }, ease: "power2.out" },
      { prim: "reveal", target: `#${S}-fw`, at: pop, dur: 0.22, from: { scale: 1 }, to: { scale: 1.05 }, ease: "power2.out" },
      { prim: "reveal", target: `#${S}-fw`, at: pop + 0.22 + ctx.gap + 0.01, dur: 0.3, from: { scale: 1.05 }, to: { scale: 1 }, ease: "power2.inOut" },
    );
    opts.forEach((_, i) => m.push({ prim: "reveal", target: `#${S}-o${i}`, at: clamp(to[i], 0.45), dur: 0.45, from: { opacity: 0, y: 30 }, ease: ctx.ease }));
    driftFrom = Math.max(pop + 0.6, ...to.map((t) => t + 0.5));
  }

  const d = ctx.drift(`#${S}-grp`, clamp(driftFrom + ctx.gap, 0.7), 12);
  if (d) m.push(d);
  return { css, html, motions: keepInside(m, w.b) };
}
