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

import { dnaCard, fit, lines } from "../_shared/dna-card.mjs";

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
    const css = `${baseCss}
#${S}-q { position: absolute; left: 170px; top: 130px; width: 1100px; text-align: center; font-size: ${qFs}px; font-weight: 800; line-height: 1.24; color: var(--ink); }
.${S}-tile { position: absolute; top: ${tileTop}px; width: ${tw}px; height: ${tileH}px; box-sizing: border-box; border-radius: ${r}px;
  border: 2px solid color-mix(in srgb, var(--ink) 14%, transparent); background: color-mix(in srgb, var(--ink) 4%, transparent); }
.${S}-L { position: absolute; left: 0; top: ${Math.max(10, tileH / 2 - 110)}px; width: ${tw}px; text-align: center; font-family: ${mono};
  font-size: ${n <= 2 ? 120 : 96}px; font-weight: 700; line-height: 1; color: var(--cyan); }
.${S}-ot { position: absolute; left: 24px; top: ${Math.max(10, tileH / 2 - 110) + (n <= 2 ? 136 : 112)}px; width: ${tw - 48}px; text-align: center;
  font-size: ${n <= 2 ? 36 : 30}px; font-weight: 700; line-height: 1.25; color: var(--ink); }
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
