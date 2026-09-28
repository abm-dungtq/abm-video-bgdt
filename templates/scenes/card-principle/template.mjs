// card-principle — DNA card "NGUYÊN LÝ CỐT LÕI" (icon key): one principle sentence as the hero.
// quote: a 320 px pair of quote marks is drawn at the left while placeholder lines hold the text's place; the sentence
//   rises on its cue and the marks brighten; the keyword (when it is part of the sentence) gets a gold underline sweep,
//   otherwise it lands as a chip under the sentence.
// keyword: the keyword is the hero (up to 150 px, gold) in a dashed slot that waits for it above the sentence; a large
//   ghost key swings slowly behind. Without a keyword the sentence itself is set large in the centre.

import { dnaCard, fit, lines } from "../_shared/dna-card.mjs";

export const revealKeys = (slots) => ["label", "text", ...(slots.keyword ? ["keyword"] : [])];

/** split text around the first case-insensitive match of kw: [before, match, after] or null */
function around(text, kw) {
  if (!kw) return null;
  const i = text.toLocaleLowerCase("vi").indexOf(kw.toLocaleLowerCase("vi"));
  return i < 0 ? null : [text.slice(0, i), text.slice(i, i + kw.length), text.slice(i + kw.length)];
}

export function render(ctx) {
  const { S, slots, esc, theme, window: w } = ctx;
  const card = dnaCard(ctx, { label: "NGUYÊN LÝ CỐT LÕI", icon: ctx.icon("key") });
  const tText = ctx.at("text");
  const tKw = slots.keyword ? ctx.at("keyword") : null;
  const mono = `"${theme.mono}", monospace`;

  if (ctx.variant === "keyword") {
    const kw = slots.keyword;
    const kwFs = kw ? fit(kw, [[8, 150], [12, 124], [18, 92]]) : 0;
    const kwW = kw ? Math.min(1300, Math.round([...kw].length * kwFs * 0.62) + 100) : 0;
    const txtFs = kw ? 42 : fit(slots.text, [[50, 68], [70, 60], [90, 54]]);
    const txtTop = kw ? 470 : 350 - Math.round((lines(slots.text, txtFs, 1000) * txtFs * 1.25) / 2);
    const css = `
#${S}-keyw { position: absolute; left: 1110px; top: 390px; width: 300px; height: 300px; }
#${S}-keyi { width: 300px; height: 300px; color: color-mix(in srgb, var(--gold) 16%, transparent); }
#${S}-keyi svg { width: 300px; height: 300px; display: block; }
#${S}-slot { position: absolute; left: ${720 - kwW / 2}px; top: 170px; width: ${kwW}px; height: ${kwFs + 70}px; box-sizing: border-box;
  border: 3px dashed color-mix(in srgb, var(--gold) 40%, transparent); border-radius: ${theme.radius ?? 18}px; }
#${S}-kw { position: absolute; left: 0; top: 170px; width: 1440px; height: ${kwFs + 70}px; display: flex; align-items: center;
  justify-content: center; font-size: ${kwFs}px; font-weight: 800; line-height: 1; color: var(--gold); white-space: nowrap; }
#${S}-rule { position: absolute; left: 570px; top: ${txtTop - 44}px; width: 300px; height: 10px; overflow: visible; }
#${S}-rule path { stroke: var(--cyan); stroke-width: 5; stroke-linecap: round; fill: none; stroke-dasharray: 1000; }
#${S}-ph { position: absolute; left: 320px; top: ${txtTop + 8}px; width: 800px; }
#${S}-ph i { display: block; height: 16px; border-radius: 8px; margin: 0 auto 26px; background: color-mix(in srgb, var(--ink) 10%, transparent); }
#${S}-ph i:nth-child(2) { width: 64%; }
#${S}-txt { position: absolute; left: 220px; top: ${txtTop}px; width: 1000px; text-align: center; font-size: ${txtFs}px;
  font-weight: ${kw ? 600 : 800}; line-height: 1.25; color: ${kw ? "var(--ink)" : "var(--ink)"}; }`;
    const html = `    <div id="${S}-keyw"><div id="${S}-keyi">${ctx.icon("key")}</div></div>
${kw ? `    <div id="${S}-slot"></div>
    <div id="${S}-kw">${esc(kw)}</div>
    <svg id="${S}-rule" viewBox="0 0 300 10"><path id="${S}-rulep" pathLength="1000" d="M4 5 L296 5"/></svg>` : ""}
    <div id="${S}-ph"><i></i><i></i></div>
    <div id="${S}-txt">${esc(slots.text)}</div>`;
    const lastT = tKw ?? tText;
    const m = [
      { prim: "reveal", target: `#${S}-keyw`, at: w.a + 0.1, dur: 0.8, from: { opacity: 0, rotation: -18 } },
      { prim: "reveal", target: `#${S}-ph`, at: w.a + 0.2, dur: 0.4, from: { opacity: 0, y: 12 } },
      { prim: "reveal", target: `#${S}-ph`, at: Math.max(tText, w.a + 0.62), dur: 0.25, from: { opacity: 1 }, to: { opacity: 0 }, ease: "power1.out" },
      { prim: "reveal", target: `#${S}-txt`, at: tText, dur: 0.55, from: ctx.motionFrom(), ease: ctx.ease },
    ];
    const swingAt = w.a + 0.95;
    if (w.b - swingAt > 0.8) m.push({ prim: "slide", target: `#${S}-keyw`, at: swingAt, dur: w.b - swingAt - 0.05, from: { rotation: 0 }, to: { rotation: 14 }, ease: "sine.inOut" });
    if (kw) {
      m.push(
        { prim: "reveal", target: `#${S}-slot`, at: w.a + 0.15, dur: 0.5, from: { opacity: 0, scale: 0.9 } },
        { prim: "reveal", target: `#${S}-slot`, at: tKw, dur: 0.3, from: { opacity: 1 }, to: { opacity: 0.25 } },
        { prim: "reveal", target: `#${S}-kw`, at: tKw, dur: 0.5, from: { opacity: 0, scale: 1.3 }, ease: "back.out(1.7)" },
        { prim: "draw", target: `#${S}-rulep`, at: tKw + 0.25, dur: 0.5 },
      );
    }
    return card.wrap({ css, html, motions: m, driftFrom: lastT + 0.8 });
  }

  // quote
  const split = around(slots.text, slots.keyword);
  const txtFs = fit(slots.text, [[50, 66], [70, 60], [90, 54]]);
  const n = lines(slots.text, txtFs, 900);
  const txtH = Math.round(n * txtFs * 1.28);
  const chip = slots.keyword && !split;
  const txtTop = Math.round(390 - (txtH + (chip ? 110 : 0)) / 2);
  const css = `
#${S}-qw { position: absolute; left: 60px; top: 150px; width: 330px; height: 270px; }
#${S}-q { width: 330px; height: 270px; overflow: visible; }
#${S}-q path { fill: none; stroke: var(--gold); stroke-width: 24; stroke-linecap: round; stroke-dasharray: 1000; }
#${S}-q circle { fill: var(--gold); }
#${S}-bar { position: absolute; left: 410px; top: 150px; width: 6px; height: 470px; border-radius: 3px;
  background: color-mix(in srgb, var(--gold) 30%, transparent); transform-origin: 50% 0; }
#${S}-ph { position: absolute; left: 470px; top: ${txtTop + 14}px; width: 860px; }
#${S}-ph i { display: block; height: 18px; border-radius: 9px; margin-bottom: ${Math.round(txtFs * 1.28) - 18}px; background: color-mix(in srgb, var(--ink) 10%, transparent); }
#${S}-ph i:last-child { width: 58%; }
#${S}-txt { position: absolute; left: 470px; top: ${txtTop}px; width: 900px; font-size: ${txtFs}px; font-weight: 800; line-height: 1.28; color: var(--ink); }
.${S}-kw { position: relative; color: var(--gold); white-space: nowrap; }
#${S}-u { position: absolute; left: 0; right: 0; bottom: -4px; height: 8px; border-radius: 4px; background: var(--gold); transform-origin: 0 50%; }
#${S}-chip { position: absolute; left: 470px; top: ${txtTop + txtH + 40}px; height: 70px; display: flex; align-items: center; gap: 16px;
  padding: 0 28px; border-radius: 35px; border: 2px solid color-mix(in srgb, var(--gold) 60%, transparent);
  background: color-mix(in srgb, var(--gold) 12%, transparent); font-family: ${mono}; font-size: 32px; font-weight: 700; color: var(--gold); }
#${S}-chip svg { width: 36px; height: 36px; }`;
  const body = split
    ? `${esc(split[0])}<span class="${S}-kw">${esc(split[1])}<span id="${S}-u"></span></span>${esc(split[2])}`
    : esc(slots.text);
  const html = `    <div id="${S}-qw"><svg id="${S}-q" viewBox="0 0 330 270">
      <path id="${S}-q1" pathLength="1000" d="M150 50 C95 66 70 112 72 168"/>
      <path id="${S}-q2" pathLength="1000" d="M300 50 C245 66 220 112 222 168"/>
      <circle id="${S}-d1" cx="104" cy="186" r="38"/>
      <circle id="${S}-d2" cx="254" cy="186" r="38"/>
    </svg></div>
    <div id="${S}-bar"></div>
    <div id="${S}-ph">${Array.from({ length: n }, () => "<i></i>").join("")}</div>
    <div id="${S}-txt">${body}</div>
${chip ? `    <div id="${S}-chip">${ctx.icon("key")}${esc(slots.keyword)}</div>` : ""}`;
  const m = [
    { prim: "draw", target: `#${S}-q1`, at: w.a + 0.1, dur: 0.8 },
    { prim: "draw", target: `#${S}-q2`, at: w.a + 0.3, dur: 0.8 },
    { prim: "reveal", target: `#${S}-d1`, at: w.a + 0.5, dur: 0.4, from: { opacity: 0 } },
    { prim: "reveal", target: `#${S}-d2`, at: w.a + 0.7, dur: 0.4, from: { opacity: 0 } },
    { prim: "reveal", target: `#${S}-bar`, at: w.a + 0.2, dur: 0.7, from: { scaleY: 0 }, ease: "power2.out" },
    { prim: "reveal", target: `#${S}-ph`, at: w.a + 0.25, dur: 0.4, from: { opacity: 0, x: -20 } },
    { prim: "reveal", target: `#${S}-ph`, at: Math.max(tText, w.a + 0.67), dur: 0.25, from: { opacity: 1 }, to: { opacity: 0 }, ease: "power1.out" },
    { prim: "reveal", target: `#${S}-txt`, at: tText, dur: 0.6, from: ctx.motionFrom(), ease: ctx.ease },
    { prim: "reveal", target: `#${S}-qw`, at: tText, dur: 0.5, from: { opacity: 0.4, scale: 0.94 }, ease: "back.out(2)" },
  ];
  if (split) m.push({ prim: "reveal", target: `#${S}-u`, at: Math.max(tKw, tText + 0.4), dur: 0.5, from: { scaleX: 0 }, ease: "power2.out" });
  if (chip) m.push({ prim: "reveal", target: `#${S}-chip`, at: tKw, dur: 0.5, from: { opacity: 0, y: 20, scale: 0.9 }, ease: "back.out(1.7)" });
  return card.wrap({ css, html, motions: m, driftFrom: (tKw ?? tText) + 0.8 });
}
