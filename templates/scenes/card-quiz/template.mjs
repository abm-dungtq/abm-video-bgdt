// card-quiz — DNA card "CÂU HỎI TÌNH HUỐNG" (icon question): a question, 2–4 options on their cues, and the right
// answer (`answer`, 0-based index into options) lit only after a hold of at least 2 s after the last option.
// Answer timing: the reveal key `answer` defaults to the next keyword after the last option (schema: answer.after =
// "options.1"), and the template lights the answer at max(at("answer"), last option + 2 s) — so the hold is always
// ≥ 2 s. The shot must leave 0.6 s after that: 3 options fit 8 s with default cues, 4 options need about 10 s; a shot
// too short for the hold fails to compile with a message instead of cutting the hold.
// While the learner thinks, a caret blinks in the answer box (explicit timeline opacity steps, no repeat) and a thin
// bar fills over the hold; then the caret gives way to the answer letter, the right option lights gold with a drawn
// check and the others dim. A ghost question mark swings behind the whole shot.
// abc: the question on top, options as a lettered vertical list, the ghost mark at the right.
// true-false: the question centred, options as big lettered tiles in one row (2 tiles for Đúng / Sai).
// spotlight-pick (open, no card box): the question runs across the top; the options stand in a row on a lit floor, each
//   letter disc and caption arriving on its cue. When the think hold starts the floor goes dark except for a spotlight
//   pool, which sweeps across the options and stops on the right one when the answer lights; it then breathes to the end.

import { dnaCard, fit, keepInside, lines, openLabel } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["label", "question", ...slots.options.map((_, i) => `options.${i}`), "answer"];

const HOLD = 2;
const LETTERS = ["A", "B", "C", "D"];
const CHECK = "M12 26 L22 36 L40 14";

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const card = dnaCard(ctx, { label: "CÂU HỎI TÌNH HUỐNG", icon: ctx.icon("question") });
  const opts = slots.options;
  const n = opts.length;
  const ans = slots.answer;
  if (ans >= n) throw new Error(`card-quiz: answer ${ans} is not an option index (0–${n - 1})`);
  const tQ = ctx.at("question");
  const tO = opts.map((_, i) => ctx.at(`options.${i}`));
  const tLast = Math.max(...tO);
  const lit = Math.max(ctx.at("answer"), tLast + HOLD);
  if (lit + 0.6 > w.b) {
    throw new Error(`card-quiz: the answer needs a ${HOLD} s hold after the last option (${tLast} s) and 0.6 s to light, but the shot ends at ${w.b} s: lengthen the shot or cue the options earlier`);
  }
  if (ctx.variant === "spotlight-pick") return spotlightPick(ctx, { tQ, tO, tLast, lit });
  const mono = `"${theme.mono}", monospace`;
  const r = theme.radius ?? 18;
  const tf = ctx.variant === "true-false";

  // shared: ghost question mark, answer box with caret, think bar
  const gq = tf ? 200 : 300;
  const box = tf ? { x: 720 - 250, y: 612 } : { x: 48, y: 612 };
  const baseCss = `
#${S}-gq { position: absolute; left: ${tf ? 1210 : 1070}px; top: ${tf ? 40 : 190}px; width: ${gq}px; height: ${gq}px; color: color-mix(in srgb, var(--gold) ${tf ? 10 : 14}%, transparent); }
#${S}-gq svg { width: ${gq}px; height: ${gq}px; display: block; }
#${S}-ab { position: absolute; left: ${box.x}px; top: ${box.y}px; height: 64px; display: flex; align-items: center; gap: 20px; }
#${S}-abl { font-family: ${mono}; font-size: 24px; letter-spacing: 0.12em; color: var(--muted); }
#${S}-abx { position: relative; width: 64px; height: 64px; box-sizing: border-box; border-radius: 14px; border: 2px solid color-mix(in srgb, var(--gold) 60%, transparent); }
#${S}-car { position: absolute; left: 29px; top: 14px; width: 4px; height: 34px; background: var(--gold); }
#${S}-abv { position: absolute; left: 0; top: 0; width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;
  font-family: ${mono}; font-size: 38px; font-weight: 700; color: var(--gold); }
#${S}-thk { position: relative; width: 320px; height: 8px; border-radius: 4px; background: color-mix(in srgb, var(--ink) 10%, transparent); }
#${S}-thf { position: absolute; left: 0; top: 0; width: 320px; height: 8px; border-radius: 4px; background: var(--cyan); transform-origin: 0 50%; }
.${S}-ck { position: absolute; width: 52px; height: 52px; overflow: visible; }
.${S}-ck path { fill: none; stroke: var(--gold); stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
.${S}-hl { position: absolute; left: -2px; top: -2px; right: -2px; bottom: -2px; border-radius: ${r}px; border: 3px solid var(--gold);
  background: color-mix(in srgb, var(--gold) 12%, transparent); }`;
  const baseHtml = `    <div id="${S}-gq">${ctx.icon("question")}</div>
    <div id="${S}-ab"><div id="${S}-abl">ĐÁP ÁN</div><div id="${S}-abx"><div id="${S}-car"></div><div id="${S}-abv">${LETTERS[ans]}</div></div>
      <div id="${S}-thk"><div id="${S}-thf"></div></div></div>`;
  const m = [
    { prim: "reveal", target: `#${S}-gq`, at: w.a + 0.1, dur: 0.7, from: { opacity: 0, rotation: -20 } },
    { prim: "slide", target: `#${S}-gq`, at: w.a + 0.85, dur: w.b - 0.05 - (w.a + 0.85), from: { rotation: 0 }, to: { rotation: 12 }, ease: "sine.inOut" },
    { prim: "reveal", target: `#${S}-ab`, at: Math.min(tLast + 0.1, lit - 0.9), dur: 0.4, from: { opacity: 0, y: 16 } },
    { prim: "reveal", target: `#${S}-thf`, at: tLast + 0.25, dur: lit - tLast - 0.3, from: { scaleX: 0 }, ease: "none" },
    { prim: "reveal", target: `#${S}-abv`, at: lit, dur: 0.4, from: { opacity: 0, scale: 0.4 }, ease: "back.out(2.5)" },
  ];
  // the caret blinks while the learner thinks: explicit on/off steps, then it gives way to the answer letter
  let on = true;
  for (let t = tLast + 0.55; t < lit - 0.12; t += 0.45) {
    m.push({ prim: "reveal", target: `#${S}-car`, at: t, dur: 0.06, from: { opacity: on ? 1 : 0 }, to: { opacity: on ? 0 : 1 }, ease: "none" });
    on = !on;
  }
  if (on) m.push({ prim: "reveal", target: `#${S}-car`, at: lit, dur: 0.06, from: { opacity: 1 }, to: { opacity: 0 }, ease: "none" });

  const optEnter = (i) => Math.min(tO[i], w.a + 0.2 + i * 0.08);
  const lightOptions = (sel) => {
    opts.forEach((_, i) => {
      const enter = optEnter(i);
      const ghost = tO[i] - enter >= 0.7;
      m.push({ prim: "reveal", target: `#${S}-o${i + 1}`, at: enter, dur: 0.45, from: { opacity: 0, [tf ? "y" : "x"]: 40 }, ease: ctx.ease });
      if (ghost) {
        m.push({ prim: "reveal", target: `#${S}-${sel}${i + 1}`, at: enter + 0.1, dur: 0.35, from: { opacity: 0 }, to: { opacity: 0.3 } });
        m.push({ prim: "reveal", target: `#${S}-${sel}${i + 1}`, at: tO[i], dur: 0.4, from: { opacity: 0.3, scale: 1.25 }, to: { opacity: 1, scale: 1 }, ease: "back.out(2)" });
      } else {
        m.push({ prim: "reveal", target: `#${S}-${sel}${i + 1}`, at: tO[i], dur: 0.4, from: { opacity: 0, scale: 1.25 }, ease: "back.out(2)" });
      }
      m.push({ prim: "reveal", target: `#${S}-t${i + 1}`, at: tO[i] + 0.08, dur: 0.45, from: ctx.motionFrom(), ease: ctx.ease });
    });
    m.push(
      { prim: "reveal", target: `#${S}-hl${ans + 1}`, at: lit, dur: 0.4, from: { opacity: 0 } },
      { prim: "draw", target: `#${S}-ckp`, at: lit + 0.15, dur: 0.4 },
    );
    const others = opts.map((_, i) => i).filter((i) => i !== ans && lit > optEnter(i) + 0.45 + ctx.gap).map((i) => `#${S}-o${i + 1}`);
    if (others.length) m.push({ prim: "dim", targets: others, at: lit + 0.2, to: 0.4 });
  };

  if (tf) {
    const qFs = fit(slots.question, [[50, 54], [70, 50], [90, 46]]);
    const hQ = lines(slots.question, qFs, 1100) * Math.round(qFs * 1.24);
    const gap = 40;
    const tw = Math.floor((1344 - (n - 1) * gap) / n);
    const tileTop = Math.max(150 + hQ + 40, 330);
    const tileH = 580 - tileTop;
    // long captions (up to 4 × 40 chars) take room from the letter, never overflow the tile
    const oFs = n <= 2 ? 36 : n === 3 ? 30 : 28;
    const oH = Math.max(...opts.map((o) => lines(o, oFs, tw - 48))) * Math.round(oFs * 1.25);
    const lTop = Math.max(10, tileH / 2 - 110);
    const LFs = Math.min(n <= 2 ? 120 : 96, tileH - lTop - 26 - oH);
    const css = `${baseCss}
#${S}-q { position: absolute; left: 170px; top: 130px; width: 1100px; text-align: center; font-size: ${qFs}px; font-weight: 800; line-height: 1.24; color: var(--ink); }
.${S}-tile { position: absolute; top: ${tileTop}px; width: ${tw}px; height: ${tileH}px; box-sizing: border-box; border-radius: ${r}px;
  border: 2px solid color-mix(in srgb, var(--ink) 14%, transparent); background: color-mix(in srgb, var(--ink) 4%, transparent); }
.${S}-L { position: absolute; left: 0; top: ${lTop}px; width: ${tw}px; text-align: center; font-family: ${mono};
  font-size: ${LFs}px; font-weight: 700; line-height: 1; color: var(--cyan); }
.${S}-ot { position: absolute; left: 24px; top: ${lTop + LFs + 16}px; width: ${tw - 48}px; text-align: center;
  font-size: ${oFs}px; font-weight: 700; line-height: 1.25; color: var(--ink); }
.${S}-tile .${S}-ck { right: 18px; top: 18px; }
${opts.map((_, i) => `#${S}-o${i + 1} { left: ${48 + i * (tw + gap)}px; }`).join("\n")}`;
    const html = `${baseHtml}
    <div id="${S}-q">${esc(slots.question)}</div>
${opts.map((o, i) => `    <div class="${S}-tile" id="${S}-o${i + 1}">${i === ans ? `<div class="${S}-hl" id="${S}-hl${i + 1}"></div>` : ""}
      <div class="${S}-L" id="${S}-L${i + 1}">${LETTERS[i]}</div><div class="${S}-ot" id="${S}-t${i + 1}">${esc(o)}</div>
      ${i === ans ? `<svg class="${S}-ck" viewBox="0 0 52 52"><path id="${S}-ckp" pathLength="1000" d="${CHECK}"/></svg>` : ""}
    </div>`).join("\n")}`;
    m.push({ prim: "reveal", target: `#${S}-q`, at: tQ, dur: 0.55, from: ctx.motionFrom(), ease: ctx.ease });
    lightOptions("L");
    return card.wrap({ css, html, motions: m, driftFrom: lit + 0.7 });
  }

  // abc
  const qFs = fit(slots.question, [[50, 50], [70, 46], [90, 42]]);
  const hQ = lines(slots.question, qFs, 960) * Math.round(qFs * 1.24);
  const oTop = Math.max(120 + hQ + 36, 280);
  const rowH = Math.min(96, Math.floor((590 - oTop) / n));
  const oFs = rowH >= 80 ? 32 : 28;
  const css = `${baseCss}
#${S}-q { position: absolute; left: 48px; top: 120px; width: 980px; font-size: ${qFs}px; font-weight: 800; line-height: 1.24; color: var(--ink); }
.${S}-row { position: absolute; left: 48px; width: 960px; height: ${rowH - 14}px; box-sizing: border-box; border-radius: ${r}px;
  border: 2px solid color-mix(in srgb, var(--ink) 14%, transparent); background: color-mix(in srgb, var(--ink) 4%, transparent); }
.${S}-L { position: absolute; left: 16px; top: ${(rowH - 14) / 2 - 26}px; width: 52px; height: 52px; border-radius: 50%; box-sizing: border-box;
  border: 2px solid var(--cyan); display: flex; align-items: center; justify-content: center; font-family: ${mono}; font-size: 28px; font-weight: 700; color: var(--cyan); }
.${S}-ot { position: absolute; left: 90px; top: 0; width: 780px; height: ${rowH - 18}px; display: flex; align-items: center;
  font-size: ${oFs}px; font-weight: 600; line-height: 1.2; color: var(--ink); }
.${S}-row .${S}-ck { right: 20px; top: ${(rowH - 14) / 2 - 26}px; }
${opts.map((_, i) => `#${S}-o${i + 1} { top: ${oTop + i * rowH}px; }`).join("\n")}`;
  const html = `${baseHtml}
    <div id="${S}-q">${esc(slots.question)}</div>
${opts.map((o, i) => `    <div class="${S}-row" id="${S}-o${i + 1}">${i === ans ? `<div class="${S}-hl" id="${S}-hl${i + 1}"></div>` : ""}
      <div class="${S}-L" id="${S}-L${i + 1}">${LETTERS[i]}</div><div class="${S}-ot" id="${S}-t${i + 1}">${esc(o)}</div>
      ${i === ans ? `<svg class="${S}-ck" viewBox="0 0 52 52"><path id="${S}-ckp" pathLength="1000" d="${CHECK}"/></svg>` : ""}
    </div>`).join("\n")}`;
  m.push({ prim: "reveal", target: `#${S}-q`, at: tQ, dur: 0.55, from: ctx.motionFrom(), ease: ctx.ease });
  lightOptions("L");
  return card.wrap({ css, html, motions: m, driftFrom: lit + 0.7 });
}


function spotlightPick(ctx, { tQ, tO, tLast, lit }) {
  const { S, slots, esc, theme, window: w } = ctx;
  const opts = slots.options;
  const n = opts.length;
  const ans = slots.answer;
  const Z = ctx.zones["strip-top"];
  const mono = `"${theme.mono}", monospace`;
  const id = openLabel(ctx, { label: "CÂU HỎI TÌNH HUỐNG", icon: ctx.icon("question"), x: Z.strip.x + 20, y: Z.strip.y + 8 });
  const qFs = fit(slots.question, [[50, 52], [70, 48], [90, 44]]);
  // the row of options (stage px)
  const slotW = 1600 / n;
  const cx = opts.map((_, i) => Math.round(80 + (i + 0.5) * slotW));
  const capW = Math.min(slotW - 40, 480);
  const capFs = n === 4 ? 30 : 32;
  const disc = 120, discTop = 300, capTop = 446;
  const poolW = Math.min(slotW - 60, 360);
  // the dark floor (stage y 250–810) with the spotlight pool; the pool's x offsets are relative to option 1
  const D = { y: 250, h: 560 };
  const spW = Math.min(slotW - 10, 440), spH = 470;
  const X = cx.map((c) => c - cx[0]);
  const dark = "color-mix(in srgb, var(--canvas) 74%, transparent)";
  const css = `${id.css}
#${S}-q { position: absolute; left: ${Z.strip.x + 20}px; top: 62px; width: 1720px; font-size: ${qFs}px; font-weight: 800; line-height: 1.24; color: var(--ink); }
#${S}-fl { position: absolute; left: 40px; top: 600px; width: 1680px; height: 140px; overflow: visible; }
#${S}-fl path { fill: none; stroke: color-mix(in srgb, var(--ink) 16%, transparent); stroke-width: 3; stroke-linecap: round; stroke-dasharray: 1000; }
.${S}-o { position: absolute; top: ${discTop}px; width: ${capW}px; height: 420px; }
.${S}-pool { position: absolute; left: ${(capW - poolW) / 2}px; top: 330px; width: ${poolW}px; height: 66px; border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--cyan) 22%, transparent), transparent); }
.${S}-L { position: absolute; left: ${(capW - disc) / 2}px; top: 0; width: ${disc}px; height: ${disc}px; border-radius: 50%; box-sizing: border-box;
  border: 3px solid var(--cyan); background: color-mix(in srgb, var(--cyan) 10%, var(--canvas)); display: flex; align-items: center;
  justify-content: center; font-family: ${mono}; font-size: 58px; font-weight: 700; color: var(--cyan); }
.${S}-ot { position: absolute; left: 0; top: ${capTop - discTop}px; width: ${capW}px; text-align: center; font-size: ${capFs}px;
  font-weight: 700; line-height: 1.25; color: var(--ink); }
.${S}-hl { position: absolute; left: ${(capW - disc) / 2 - 10}px; top: -10px; width: ${disc + 20}px; height: ${disc + 20}px; border-radius: 50%;
  box-sizing: border-box; border: 5px solid var(--gold); background: var(--gold); display: flex; align-items: center; justify-content: center;
  font-family: ${mono}; font-size: 62px; font-weight: 700; color: var(--canvas); }
.${S}-ck { position: absolute; left: ${(capW + disc) / 2 + 6}px; top: -6px; width: 52px; height: 52px; overflow: visible; }
.${S}-ck path { fill: none; stroke: var(--gold); stroke-width: 6; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1000; }
#${S}-dk { position: absolute; left: 0; top: ${D.y}px; width: 1760px; height: ${D.h}px; overflow: hidden;
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 110px); mask-image: linear-gradient(to bottom, transparent 0, #000 110px); }
#${S}-dkh { position: absolute; left: 0; top: 0; width: 1760px; height: ${D.h}px;
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 140px, #000 1620px, transparent 1760px); mask-image: linear-gradient(to right, transparent 0, #000 140px, #000 1620px, transparent 1760px); }
#${S}-sp { position: absolute; left: ${cx[0] - spW / 2}px; top: 18px; width: ${spW}px; height: ${spH}px; border-radius: 50%;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--gold) 16%, transparent), transparent);
  box-shadow: 0 0 0 2400px ${dark}, inset 0 0 60px 26px ${dark}; }
${opts.map((_, i) => `#${S}-o${i + 1} { left: ${cx[i] - capW / 2}px; }`).join("\n")}`;
  const CHECK_D = "M12 26 L22 36 L40 14";
  const html = `${id.html}
    <div id="${S}-q">${esc(slots.question)}</div>
    <svg id="${S}-fl" viewBox="0 0 1680 140"><path id="${S}-flp" pathLength="1000" d="M0 70 C420 52 1260 52 1680 70"/></svg>
${opts.map((o, i) => `    <div class="${S}-o" id="${S}-o${i + 1}"><div class="${S}-pool"></div><div class="${S}-L" id="${S}-L${i + 1}">${LETTERS[i]}</div>
      ${i === ans ? `<div class="${S}-hl" id="${S}-hl">${LETTERS[i]}</div><svg class="${S}-ck" viewBox="0 0 52 52"><path id="${S}-ckp" pathLength="1000" d="${CHECK_D}"/></svg>` : ""}
      <div class="${S}-ot" id="${S}-t${i + 1}">${esc(o)}</div></div>`).join("\n")}
    <div id="${S}-dk"><div id="${S}-dkh"><div id="${S}-sp"></div></div></div>`;

  const m = [
    ...id.motions,
    { prim: "draw", target: `#${S}-flp`, at: w.a, dur: 0.8 },
    { prim: "reveal", target: `#${S}-q`, at: tQ, dur: 0.55, from: ctx.motionFrom(), ease: ctx.ease },
  ];
  opts.forEach((_, i) => {
    const enter = Math.min(tO[i], w.a + 0.15 + i * 0.1);
    m.push({ prim: "reveal", target: `#${S}-o${i + 1}`, at: enter, dur: 0.45, from: { opacity: 0, y: 30 }, ease: ctx.ease });
    if (tO[i] - enter >= 0.7) {
      m.push(
        { prim: "reveal", target: `#${S}-L${i + 1}`, at: enter + 0.1, dur: 0.35, from: { opacity: 0 }, to: { opacity: 0.3 } },
        { prim: "reveal", target: `#${S}-L${i + 1}`, at: tO[i], dur: 0.4, from: { opacity: 0.3, scale: 1.3 }, to: { opacity: 1, scale: 1 }, ease: "back.out(2)" },
      );
    } else {
      m.push({ prim: "reveal", target: `#${S}-L${i + 1}`, at: tO[i], dur: 0.4, from: { opacity: 0, scale: 1.3 }, ease: "back.out(2)" });
    }
    m.push({ prim: "reveal", target: `#${S}-t${i + 1}`, at: tO[i] + 0.08, dur: 0.45, from: { opacity: 0, y: 16 }, ease: ctx.ease });
  });

  // the think hold: the floor darkens around a spotlight that sweeps the options and stops on the answer when it lights
  const T0 = tLast + 0.3;
  m.push({ prim: "reveal", target: `#${S}-dk`, at: T0, dur: 0.4, from: { opacity: 0 } });
  const path = [n - 1, 0, ans === 0 ? n - 1 : ans, ...(ans === 0 ? [0] : [])].filter((v, k, a) => k === 0 || v !== a[k - 1]);
  const legs = path.slice(1).map((b, k) => ({ a: path[k], b, len: Math.max(1, Math.abs(b - path[k])) }));
  const sweepFrom = T0 + 0.3, sweepTo = lit - 0.02;
  const unit = (sweepTo - sweepFrom) / legs.reduce((s, l) => s + l.len, 0);
  let at = sweepFrom;
  legs.forEach((l) => {
    const dur = l.len * unit;
    m.push({ prim: "slide", target: `#${S}-sp`, at, dur: dur - 0.02, from: { x: X[l.a] }, to: { x: X[l.b] }, ease: "sine.inOut" });
    at += dur;
  });
  m.push(
    { prim: "reveal", target: `#${S}-sp`, at: lit, dur: 0.4, from: { scale: 0.86 }, to: { scale: 1 }, ease: "back.out(2.2)" },
    { prim: "reveal", target: `#${S}-hl`, at: lit, dur: 0.4, from: { opacity: 0, scale: 0.6 }, ease: "back.out(2.2)" },
    // the gold disc carries the letter from now on
    { prim: "reveal", target: `#${S}-L${ans + 1}`, at: lit + 0.1, dur: 0.25, from: { opacity: 1 }, to: { opacity: 0 }, ease: "power1.in" },
    { prim: "draw", target: `#${S}-ckp`, at: lit + 0.15, dur: 0.4 },
  );
  // the pool breathes on the answer until the shot ends
  const brAt = lit + 0.45;
  if (w.b - 0.05 - brAt > 0.3) m.push({ prim: "pulse", target: `#${S}-sp`, at: brAt, dur: w.b - 0.05 - brAt });
  return { css, html, motions: keepInside(m, w.b) };
}
